/**
 * Brand Database Service
 * Handles persistence of brand profiles to SQLite
 */

import { getDatabase, isDatabaseInitialized } from '../../../core/db';
import type { UUID } from '../../../core/types/common';
import type { BrandProfile, BrandTokenSchema } from '../../../core/types/brand';

/**
 * Database row type for brand_profiles table
 */
interface BrandProfileRow {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  tokens: string; // JSON string
  isDefault: number; // SQLite boolean (0 or 1)
  isArchived: number; // SQLite boolean (0 or 1)
  metadata: string | null; // JSON string
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
}

/**
 * Convert database row to BrandProfile
 */
function rowToBrandProfile(row: BrandProfileRow): BrandProfile {
  return {
    id: row.id as UUID,
    name: row.name,
    description: row.description ?? undefined,
    logoUrl: row.logoUrl ?? undefined,
    tokens: JSON.parse(row.tokens) as BrandTokenSchema,
    isDefault: row.isDefault === 1,
    isArchived: row.isArchived === 1,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Load all brand profiles from the database
 */
export async function loadBrandsFromDb(): Promise<BrandProfile[]> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, returning empty brands list');
    return [];
  }

  const db = getDatabase();
  const rows = await db.query<BrandProfileRow>(
    'SELECT * FROM brand_profiles ORDER BY createdAt ASC'
  );

  return rows.map(rowToBrandProfile);
}

/**
 * Save or update a brand profile in the database
 */
export async function saveBrandToDb(brand: BrandProfile): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, skipping brand save');
    return;
  }

  const db = getDatabase();

  // Check if brand exists
  const existing = await db.querySingle<{ id: string }>(
    'SELECT id FROM brand_profiles WHERE id = ?',
    [brand.id]
  );

  const tokensJson = JSON.stringify(brand.tokens);
  const metadataJson = brand.metadata ? JSON.stringify(brand.metadata) : null;

  if (existing) {
    // Update existing brand
    await db.exec(
      `UPDATE brand_profiles SET
        name = ?,
        description = ?,
        logoUrl = ?,
        tokens = ?,
        isDefault = ?,
        isArchived = ?,
        metadata = ?,
        updatedAt = ?
      WHERE id = ?`,
      [
        brand.name,
        brand.description ?? null,
        brand.logoUrl ?? null,
        tokensJson,
        brand.isDefault ? 1 : 0,
        brand.isArchived ? 1 : 0,
        metadataJson,
        brand.updatedAt,
        brand.id,
      ]
    );
  } else {
    // Insert new brand
    await db.exec(
      `INSERT INTO brand_profiles (
        id, name, description, logoUrl, tokens,
        isDefault, isArchived, metadata, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        brand.id,
        brand.name,
        brand.description ?? null,
        brand.logoUrl ?? null,
        tokensJson,
        brand.isDefault ? 1 : 0,
        brand.isArchived ? 1 : 0,
        metadataJson,
        brand.createdAt,
        brand.updatedAt,
      ]
    );
  }
}

/**
 * Delete a brand profile from the database
 */
export async function deleteBrandFromDb(id: UUID): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, skipping brand delete');
    return;
  }

  const db = getDatabase();
  await db.exec('DELETE FROM brand_profiles WHERE id = ?', [id]);
}

/**
 * Get a single brand profile from the database
 */
export async function getBrandFromDb(id: UUID): Promise<BrandProfile | null> {
  if (!isDatabaseInitialized()) {
    return null;
  }

  const db = getDatabase();
  const row = await db.querySingle<BrandProfileRow>(
    'SELECT * FROM brand_profiles WHERE id = ?',
    [id]
  );

  return row ? rowToBrandProfile(row) : null;
}
