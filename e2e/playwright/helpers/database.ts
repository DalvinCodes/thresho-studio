/**
 * Test Database Layer for E2E Tests
 * Provides isolated SQLite database instances per test using OPFS
 */

import { test as base, expect } from '@playwright/test';
import type { UUID } from '../../../src/core/types/common';

/**
 * Test database interface
 */
export interface TestDatabase {
  /** Execute SQL without returning results */
  exec(sql: string, params?: unknown[]): Promise<void>;
  /** Query returning multiple rows */
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  /** Query returning single row or null */
  querySingle<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
  /** Close database connection */
  close(): Promise<void>;
  /** Database name for cleanup */
  dbName: string;
  /** Test ID for isolation */
  testId: string;
}

/**
 * Generate a unique test ID
 */
export function generateTestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create an isolated test database
 */
export async function createTestDatabase(testId: string): Promise<TestDatabase> {
  const dbName = `thresho-test-${testId}.sqlite`;
  
  // Dynamic import sqlite-wasm
  const sqlite3InitModule = (await import('@sqlite.org/sqlite-wasm')).default;
  
  // @ts-expect-error - sqlite-wasm types don't include the options parameter
  const sqlite3 = await sqlite3InitModule({
    print: () => {}, // Silence logs in tests
    printErr: console.error,
  });

  // Use OPFS for persistent storage
  const sqliteDb = new sqlite3.oo1.OpfsDb(`/${dbName}`);

  // Create wrapper interface
  const db: TestDatabase = {
    async exec(sql: string, params?: unknown[]): Promise<void> {
      try {
        if (params && params.length > 0) {
          sqliteDb.exec(sql, { bind: params as (string | number | null)[] });
        } else {
          sqliteDb.exec(sql);
        }
      } catch (error) {
        console.error('SQL exec error:', sql, error);
        throw error;
      }
    },

    async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
      try {
        return sqliteDb.selectObjects(sql, params as (string | number | null)[] | undefined) as T[];
      } catch (error) {
        console.error('SQL query error:', sql, error);
        throw error;
      }
    },

    async querySingle<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null> {
      const results = await this.query(sql, params) as T[];
      return results[0] ?? null;
    },

    async close(): Promise<void> {
      sqliteDb.close();
    },

    dbName,
    testId,
  };

  // Run migrations
  await runMigrations(db);

  return db;
}

/**
 * Run database migrations to create schema
 */
async function runMigrations(db: TestDatabase): Promise<void> {
  // Enable foreign keys
  await db.exec('PRAGMA foreign_keys = ON');

  // Create providers table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      displayName TEXT NOT NULL,
      description TEXT,
      apiBaseUrl TEXT,
      capabilities TEXT NOT NULL,
      isActive INTEGER DEFAULT 1,
      isDefault INTEGER DEFAULT 0,
      metadata TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);

  // Create provider_credentials table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS provider_credentials (
      id TEXT PRIMARY KEY,
      providerId TEXT NOT NULL,
      apiKey TEXT NOT NULL,
      organizationId TEXT,
      metadata TEXT,
      expiresAt INTEGER,
      lastValidated INTEGER,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (providerId) REFERENCES providers(id) ON DELETE CASCADE
    )
  `);

  // Create prompt_templates table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS prompt_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      outputType TEXT NOT NULL CHECK(outputType IN ('text', 'image', 'video')),
      category TEXT,
      tags TEXT DEFAULT '[]',
      currentVersionId TEXT,
      isArchived INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);

  // Create prompt_versions table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS prompt_versions (
      id TEXT PRIMARY KEY,
      templateId TEXT NOT NULL,
      version TEXT NOT NULL,
      contentHash TEXT NOT NULL,
      systemPrompt TEXT,
      userPrompt TEXT NOT NULL,
      variables TEXT DEFAULT '[]',
      modelConfig TEXT,
      changeLog TEXT,
      createdBy TEXT,
      createdAt INTEGER NOT NULL,
      UNIQUE(templateId, version),
      FOREIGN KEY (templateId) REFERENCES prompt_templates(id) ON DELETE CASCADE
    )
  `);

  // Create prompt_labels table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS prompt_labels (
      id TEXT PRIMARY KEY,
      templateId TEXT NOT NULL,
      versionId TEXT NOT NULL,
      label TEXT NOT NULL,
      labelType TEXT NOT NULL CHECK(labelType IN ('draft', 'staging', 'production', 'experiment')),
      description TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      UNIQUE(templateId, label),
      FOREIGN KEY (templateId) REFERENCES prompt_templates(id) ON DELETE CASCADE,
      FOREIGN KEY (versionId) REFERENCES prompt_versions(id) ON DELETE CASCADE
    )
  `);

  // Create brand_profiles table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS brand_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      logoUrl TEXT,
      tokens TEXT NOT NULL,
      isDefault INTEGER DEFAULT 0,
      isArchived INTEGER DEFAULT 0,
      metadata TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);

  // Create assets table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL CHECK(type IN ('text', 'image', 'video')),
      format TEXT NOT NULL,
      url TEXT NOT NULL,
      thumbnailUrl TEXT,
      storageLocation TEXT DEFAULT 'local',
      metadata TEXT NOT NULL,
      projectId TEXT,
      tags TEXT DEFAULT '[]',
      isFavorite INTEGER DEFAULT 0,
      isArchived INTEGER DEFAULT 0,
      generationRecordId TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);

  // Create asset_collections table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS asset_collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      projectId TEXT,
      assetIds TEXT DEFAULT '[]',
      coverAssetId TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);

  // Create generation_records table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS generation_records (
      id TEXT PRIMARY KEY,
      requestId TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      providerId TEXT NOT NULL,
      providerType TEXT NOT NULL,
      model TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('text', 'image', 'video')),
      promptTemplateId TEXT,
      promptVersionId TEXT,
      brandId TEXT,
      renderedPrompt TEXT NOT NULL,
      variablesUsed TEXT,
      parametersUsed TEXT NOT NULL,
      inputTokens INTEGER,
      outputTokens INTEGER,
      costEstimateUsd REAL,
      result TEXT,
      error TEXT,
      startedAt INTEGER,
      completedAt INTEGER,
      durationMs INTEGER,
      providerRequestId TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);

  // Create projects table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      defaultProviderId TEXT,
      defaultBrandId TEXT,
      isArchived INTEGER DEFAULT 0,
      settings TEXT,
      metadata TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);

  // Create shot_lists table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS shot_lists (
      id TEXT PRIMARY KEY,
      projectId TEXT,
      name TEXT NOT NULL,
      description TEXT,
      projectType TEXT,
      status TEXT DEFAULT 'draft',
      settings TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE SET NULL
    )
  `);

  // Create shots table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS shots (
      id TEXT PRIMARY KEY,
      shotListId TEXT NOT NULL,
      sequenceOrder INTEGER DEFAULT 0,
      name TEXT NOT NULL,
      description TEXT,
      subject TEXT,
      setting TEXT,
      frame TEXT,
      camera TEXT,
      lens TEXT,
      lighting TEXT,
      motion TEXT,
      notes TEXT,
      status TEXT DEFAULT 'planned',
      assetId TEXT,
      prompt TEXT,
      customPrompt TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (shotListId) REFERENCES shot_lists(id) ON DELETE CASCADE,
      FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE SET NULL
    )
  `);

  // Create indexes
  await db.exec('CREATE INDEX IF NOT EXISTS idx_providers_active ON providers(isActive)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_providers_type ON providers(type)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_credentials_provider ON provider_credentials(providerId)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_templates_category ON prompt_templates(category)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_templates_outputType ON prompt_templates(outputType)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_versions_template ON prompt_versions(templateId)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(projectId)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_assets_favorite ON assets(isFavorite)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_generation_status ON generation_records(status)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_generation_type ON generation_records(type)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_shot_lists_project ON shot_lists(projectId)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_shots_list ON shots(shotListId)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_shots_order ON shots(sequenceOrder)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_shots_status ON shots(status)');
}

/**
 * Delete a test database file from OPFS
 */
export async function deleteTestDatabase(testId: string): Promise<void> {
  try {
    const dbName = `thresho-test-${testId}.sqlite`;
    // Remove file from OPFS
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(dbName).catch(() => {
      // File may not exist, that's ok
    });
  } catch (error) {
    console.warn('Failed to cleanup test database:', error);
  }
}

/**
 * Extended test fixture with test database
 */
export const test = base.extend<{
  testDb: TestDatabase;
  testId: string;
}>({
  testId: async ({}, use) => {
    const testId = generateTestId();
    await use(testId);
  },
  
  testDb: async ({ testId }, use) => {
    const db = await createTestDatabase(testId);
    
    await use(db);
    
    // Cleanup after test
    await db.close();
    await deleteTestDatabase(testId);
  },
});

export { expect };
