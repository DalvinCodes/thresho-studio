/**
 * Asset Database Service
 * Handles persistence of assets and collections to SQLite
 */

import { getDatabase, isDatabaseInitialized } from '../../../core/db/adapter';
import type { UUID } from '../../../core/types/common';
import type { Asset, AssetCollection, AssetMetadata } from '../../../core/types/asset';

// Database row types (SQLite stores arrays/objects as JSON strings)
interface AssetRow {
  id: string;
  name: string;
  description: string | null;
  type: string;
  format: string;
  url: string;
  thumbnailUrl: string | null;
  storageLocation: string;
  metadata: string; // JSON
  projectId: string | null;
  tags: string; // JSON array
  isFavorite: number; // SQLite boolean
  isArchived: number; // SQLite boolean
  generationRecordId: string | null;
  createdAt: number;
  updatedAt: number;
}

interface CollectionRow {
  id: string;
  name: string;
  description: string | null;
  projectId: string | null;
  assetIds: string; // JSON array
  coverAssetId: string | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * Load all assets and collections from the database
 */
export async function loadAssetsFromDb(): Promise<{
  assets: Asset[];
  collections: AssetCollection[];
}> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, returning empty assets');
    return { assets: [], collections: [] };
  }

  const db = getDatabase();

  try {
    // Load assets
    const assetRows = await db.query<AssetRow>('SELECT * FROM assets ORDER BY createdAt DESC');
    const assets: Asset[] = assetRows.map(rowToAsset);

    // Load collections
    const collectionRows = await db.query<CollectionRow>(
      'SELECT * FROM asset_collections ORDER BY createdAt DESC'
    );
    const collections: AssetCollection[] = collectionRows.map(rowToCollection);

    return { assets, collections };
  } catch (error) {
    console.error('Failed to load assets from database:', error);
    return { assets: [], collections: [] };
  }
}

/**
 * Save or update an asset in the database
 */
export async function saveAssetToDb(asset: Asset): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, skipping asset save');
    return;
  }

  const db = getDatabase();

  try {
    // Use INSERT OR REPLACE (upsert)
    await db.exec(
      `INSERT OR REPLACE INTO assets (
        id, name, description, type, format, url, thumbnailUrl,
        storageLocation, metadata, projectId, tags, isFavorite,
        isArchived, generationRecordId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        asset.id,
        asset.name,
        asset.description ?? null,
        asset.type,
        asset.format,
        asset.url,
        asset.thumbnailUrl ?? null,
        asset.storageLocation,
        JSON.stringify(asset.metadata),
        asset.projectId ?? null,
        JSON.stringify(asset.tags),
        asset.isFavorite ? 1 : 0,
        asset.isArchived ? 1 : 0,
        asset.generationRecordId ?? null,
        asset.createdAt,
        asset.updatedAt,
      ]
    );
  } catch (error) {
    console.error('Failed to save asset to database:', error);
    throw error;
  }
}

/**
 * Delete an asset from the database
 */
export async function deleteAssetFromDb(id: UUID): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, skipping asset delete');
    return;
  }

  const db = getDatabase();

  try {
    await db.exec('DELETE FROM assets WHERE id = ?', [id]);
  } catch (error) {
    console.error('Failed to delete asset from database:', error);
    throw error;
  }
}

/**
 * Delete multiple assets from the database
 */
export async function deleteAssetsFromDb(ids: UUID[]): Promise<void> {
  if (!isDatabaseInitialized() || ids.length === 0) {
    return;
  }

  const db = getDatabase();

  try {
    // SQLite doesn't support array parameters, so use IN with placeholders
    const placeholders = ids.map(() => '?').join(',');
    await db.exec(`DELETE FROM assets WHERE id IN (${placeholders})`, ids);
  } catch (error) {
    console.error('Failed to delete assets from database:', error);
    throw error;
  }
}

/**
 * Save or update a collection in the database
 */
export async function saveCollectionToDb(collection: AssetCollection): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, skipping collection save');
    return;
  }

  const db = getDatabase();

  try {
    await db.exec(
      `INSERT OR REPLACE INTO asset_collections (
        id, name, description, projectId, assetIds,
        coverAssetId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        collection.id,
        collection.name,
        collection.description ?? null,
        collection.projectId ?? null,
        JSON.stringify(collection.assetIds),
        collection.coverAssetId ?? null,
        collection.createdAt,
        collection.updatedAt,
      ]
    );
  } catch (error) {
    console.error('Failed to save collection to database:', error);
    throw error;
  }
}

/**
 * Delete a collection from the database
 */
export async function deleteCollectionFromDb(id: UUID): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.warn('Database not initialized, skipping collection delete');
    return;
  }

  const db = getDatabase();

  try {
    await db.exec('DELETE FROM asset_collections WHERE id = ?', [id]);
  } catch (error) {
    console.error('Failed to delete collection from database:', error);
    throw error;
  }
}

/**
 * Get a single asset by ID
 */
export async function getAssetFromDb(id: UUID): Promise<Asset | null> {
  if (!isDatabaseInitialized()) {
    return null;
  }

  const db = getDatabase();

  try {
    const row = await db.querySingle<AssetRow>('SELECT * FROM assets WHERE id = ?', [id]);
    return row ? rowToAsset(row) : null;
  } catch (error) {
    console.error('Failed to get asset from database:', error);
    return null;
  }
}

/**
 * Get a single collection by ID
 */
export async function getCollectionFromDb(id: UUID): Promise<AssetCollection | null> {
  if (!isDatabaseInitialized()) {
    return null;
  }

  const db = getDatabase();

  try {
    const row = await db.querySingle<CollectionRow>(
      'SELECT * FROM asset_collections WHERE id = ?',
      [id]
    );
    return row ? rowToCollection(row) : null;
  } catch (error) {
    console.error('Failed to get collection from database:', error);
    return null;
  }
}

// Helper: Convert database row to Asset
function rowToAsset(row: AssetRow): Asset {
  return {
    id: row.id as UUID,
    name: row.name,
    description: row.description ?? undefined,
    type: row.type as Asset['type'],
    format: row.format as Asset['format'],
    url: row.url,
    thumbnailUrl: row.thumbnailUrl ?? undefined,
    storageLocation: row.storageLocation as Asset['storageLocation'],
    metadata: parseJson<AssetMetadata>(row.metadata, {
      fileSize: 0,
      mimeType: 'application/octet-stream',
    }),
    projectId: (row.projectId as UUID) ?? undefined,
    tags: parseJson<string[]>(row.tags, []),
    isFavorite: row.isFavorite === 1,
    isArchived: row.isArchived === 1,
    generationRecordId: (row.generationRecordId as UUID) ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Helper: Convert database row to AssetCollection
function rowToCollection(row: CollectionRow): AssetCollection {
  return {
    id: row.id as UUID,
    name: row.name,
    description: row.description ?? undefined,
    projectId: (row.projectId as UUID) ?? undefined,
    assetIds: parseJson<UUID[]>(row.assetIds, []),
    coverAssetId: (row.coverAssetId as UUID) ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Helper: Safely parse JSON with fallback
function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
