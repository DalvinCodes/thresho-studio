/**
 * Provider Database Service
 * Handles persistence of provider configurations and credentials to SQLite
 */

import { getDatabase, isDatabaseInitialized } from '../../../core/db/adapter';
import type { UUID, Timestamp } from '../../../core/types/common';
import type {
  ProviderConfig,
  ProviderCredential,
  ProviderState,
  ProviderCapability,
} from '../../../core/types/provider';

// Database row types
interface ProviderRow {
  id: string;
  type: string;
  name: string;
  displayName: string;
  description: string | null;
  apiBaseUrl: string | null;
  capabilities: string; // JSON
  isActive: number;
  isDefault: number;
  metadata: string | null; // JSON
  createdAt: number;
  updatedAt: number;
}

interface CredentialRow {
  id: string;
  providerId: string;
  apiKey: string;
  organizationId: string | null;
  metadata: string | null; // JSON
  expiresAt: number | null;
  lastValidated: number | null;
  createdAt: number;
}

/**
 * Load all providers and their credentials from database
 */
export async function loadProvidersFromDb(): Promise<{
  providers: ProviderState[];
  defaultTextProviderId: UUID | null;
  defaultImageProviderId: UUID | null;
  defaultVideoProviderId: UUID | null;
}> {
  if (!isDatabaseInitialized()) {
    return {
      providers: [],
      defaultTextProviderId: null,
      defaultImageProviderId: null,
      defaultVideoProviderId: null,
    };
  }

  const db = getDatabase();

  // Load all providers
  const providerRows = await db.query<ProviderRow>(
    'SELECT * FROM providers ORDER BY createdAt ASC'
  );

  // Load all credentials
  const credentialRows = await db.query<CredentialRow>(
    'SELECT * FROM provider_credentials'
  );

  // Create credential lookup map
  const credentialsByProvider = new Map<string, CredentialRow>();
  for (const row of credentialRows) {
    credentialsByProvider.set(row.providerId, row);
  }

  // Track defaults by type
  let defaultTextProviderId: UUID | null = null;
  let defaultImageProviderId: UUID | null = null;
  let defaultVideoProviderId: UUID | null = null;

  // Convert rows to ProviderState objects
  const providers: ProviderState[] = providerRows.map((row) => {
    const capabilities: ProviderCapability[] = JSON.parse(row.capabilities || '[]');
    const credentialRow = credentialsByProvider.get(row.id);

    const config: ProviderConfig = {
      id: row.id as UUID,
      type: row.type as ProviderConfig['type'],
      name: row.name,
      displayName: row.displayName,
      description: row.description || '',
      apiBaseUrl: row.apiBaseUrl || undefined,
      capabilities,
      isActive: row.isActive === 1,
      isDefault: row.isDefault === 1,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.createdAt as Timestamp,
      updatedAt: row.updatedAt as Timestamp,
    };

    // Track which provider is default for each type
    if (row.isDefault === 1) {
      for (const cap of capabilities) {
        if (cap.type === 'text' && !defaultTextProviderId) {
          defaultTextProviderId = row.id as UUID;
        } else if (cap.type === 'image' && !defaultImageProviderId) {
          defaultImageProviderId = row.id as UUID;
        } else if (cap.type === 'video' && !defaultVideoProviderId) {
          defaultVideoProviderId = row.id as UUID;
        }
      }
    }

    let credential: ProviderCredential | undefined;
    if (credentialRow) {
      credential = {
        id: credentialRow.id as UUID,
        providerId: credentialRow.providerId as UUID,
        apiKey: credentialRow.apiKey,
        organizationId: credentialRow.organizationId || undefined,
        metadata: credentialRow.metadata ? JSON.parse(credentialRow.metadata) : undefined,
        expiresAt: credentialRow.expiresAt
          ? (credentialRow.expiresAt as Timestamp)
          : undefined,
        lastValidated: credentialRow.lastValidated
          ? (credentialRow.lastValidated as Timestamp)
          : undefined,
        createdAt: credentialRow.createdAt as Timestamp,
      };
    }

    return {
      config,
      credential,
      status: credential ? 'inactive' : 'inactive', // Will be validated after load
    } as ProviderState;
  });

  return {
    providers,
    defaultTextProviderId,
    defaultImageProviderId,
    defaultVideoProviderId,
  };
}

/**
 * Save a provider configuration to the database
 */
export async function saveProviderToDb(config: ProviderConfig): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, skipping provider save');
    return;
  }

  const db = getDatabase();

  // Check if provider exists
  const existing = await db.querySingle<{ id: string }>(
    'SELECT id FROM providers WHERE id = ?',
    [config.id]
  );

  if (existing) {
    // Update existing provider
    await db.exec(
      `UPDATE providers SET
        type = ?,
        name = ?,
        displayName = ?,
        description = ?,
        apiBaseUrl = ?,
        capabilities = ?,
        isActive = ?,
        isDefault = ?,
        metadata = ?,
        updatedAt = ?
      WHERE id = ?`,
      [
        config.type,
        config.name,
        config.displayName,
        config.description || null,
        config.apiBaseUrl || null,
        JSON.stringify(config.capabilities),
        config.isActive ? 1 : 0,
        config.isDefault ? 1 : 0,
        config.metadata ? JSON.stringify(config.metadata) : null,
        config.updatedAt,
        config.id,
      ]
    );
  } else {
    // Insert new provider
    await db.exec(
      `INSERT INTO providers (
        id, type, name, displayName, description, apiBaseUrl,
        capabilities, isActive, isDefault, metadata, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        config.id,
        config.type,
        config.name,
        config.displayName,
        config.description || null,
        config.apiBaseUrl || null,
        JSON.stringify(config.capabilities),
        config.isActive ? 1 : 0,
        config.isDefault ? 1 : 0,
        config.metadata ? JSON.stringify(config.metadata) : null,
        config.createdAt,
        config.updatedAt,
      ]
    );
  }
}

/**
 * Save a provider credential to the database
 */
export async function saveCredentialToDb(credential: ProviderCredential): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, skipping credential save');
    return;
  }

  const db = getDatabase();

  // Delete existing credential for this provider (one credential per provider)
  await db.exec('DELETE FROM provider_credentials WHERE providerId = ?', [
    credential.providerId,
  ]);

  // Insert new credential
  await db.exec(
    `INSERT INTO provider_credentials (
      id, providerId, apiKey, organizationId, metadata,
      expiresAt, lastValidated, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      credential.id,
      credential.providerId,
      credential.apiKey,
      credential.organizationId || null,
      credential.metadata ? JSON.stringify(credential.metadata) : null,
      credential.expiresAt || null,
      credential.lastValidated || null,
      credential.createdAt,
    ]
  );
}

/**
 * Delete a provider and its credentials from the database
 */
export async function deleteProviderFromDb(providerId: UUID): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, skipping provider delete');
    return;
  }

  const db = getDatabase();

  // Delete credential first (foreign key constraint)
  await db.exec('DELETE FROM provider_credentials WHERE providerId = ?', [providerId]);

  // Delete provider
  await db.exec('DELETE FROM providers WHERE id = ?', [providerId]);
}

/**
 * Delete a credential from the database
 */
export async function deleteCredentialFromDb(providerId: UUID): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, skipping credential delete');
    return;
  }

  const db = getDatabase();
  await db.exec('DELETE FROM provider_credentials WHERE providerId = ?', [providerId]);
}

/**
 * Update credential validation timestamp
 */
export async function updateCredentialValidation(
  providerId: UUID,
  lastValidated: Timestamp
): Promise<void> {
  if (!isDatabaseInitialized()) {
    return;
  }

  const db = getDatabase();
  await db.exec(
    'UPDATE provider_credentials SET lastValidated = ? WHERE providerId = ?',
    [lastValidated, providerId]
  );
}

/**
 * Set a provider as default for its content type(s)
 */
export async function setProviderDefaultInDb(
  providerId: UUID,
  isDefault: boolean
): Promise<void> {
  if (!isDatabaseInitialized()) {
    return;
  }

  const db = getDatabase();
  await db.exec('UPDATE providers SET isDefault = ?, updatedAt = ? WHERE id = ?', [
    isDefault ? 1 : 0,
    Date.now(),
    providerId,
  ]);
}
