/**
 * SQLite database schema definitions
 * All tables for Thresho Studio
 */

import { getDatabase } from './adapter';

/**
 * Initialize all database tables
 */
export async function initializeSchema(): Promise<void> {
  const db = getDatabase();

  // Enable foreign keys
  await db.exec('PRAGMA foreign_keys = ON');

  // Create all tables
  await createProvidersTable(db);
  await createProviderCredentialsTable(db);
  await createPromptTemplatesTable(db);
  await createPromptVersionsTable(db);
  await createPromptLabelsTable(db);
  await createBrandProfilesTable(db);
  await createAssetsTable(db);
  await createAssetCollectionsTable(db);
  await createGenerationRecordsTable(db);
  await createProjectsTable(db);
  await createShotListsTable(db);
  await createShotsTable(db);
  await createEquipmentPresetsTable(db);
  await createTalentProfilesTable(db);
  await createTalentReferenceImagesTable(db);

  // Create indexes
  await createIndexes(db);

  console.log('Database schema initialized');
}

// Database interface for typing
interface DB {
  exec(sql: string): Promise<void>;
}

async function createProvidersTable(db: DB): Promise<void> {
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
}

async function createProviderCredentialsTable(db: DB): Promise<void> {
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
}

async function createPromptTemplatesTable(db: DB): Promise<void> {
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
}

async function createPromptVersionsTable(db: DB): Promise<void> {
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
}

async function createPromptLabelsTable(db: DB): Promise<void> {
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
}

async function createBrandProfilesTable(db: DB): Promise<void> {
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
}

async function createAssetsTable(db: DB): Promise<void> {
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
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (generationRecordId) REFERENCES generation_records(id) ON DELETE SET NULL
    )
  `);
}

async function createAssetCollectionsTable(db: DB): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS asset_collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      projectId TEXT,
      assetIds TEXT DEFAULT '[]',
      coverAssetId TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE SET NULL
    )
  `);
}

async function createGenerationRecordsTable(db: DB): Promise<void> {
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
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (providerId) REFERENCES providers(id),
      FOREIGN KEY (promptTemplateId) REFERENCES prompt_templates(id),
      FOREIGN KEY (promptVersionId) REFERENCES prompt_versions(id),
      FOREIGN KEY (brandId) REFERENCES brand_profiles(id)
    )
  `);
}

async function createProjectsTable(db: DB): Promise<void> {
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
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (defaultProviderId) REFERENCES providers(id) ON DELETE SET NULL,
      FOREIGN KEY (defaultBrandId) REFERENCES brand_profiles(id) ON DELETE SET NULL
    )
  `);
}

async function createShotListsTable(db: DB): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS shot_lists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      projectId TEXT,
      director TEXT,
      cinematographer TEXT,
      productionDate INTEGER,
      contentType TEXT NOT NULL CHECK(contentType IN ('text', 'image', 'video')),
      brandId TEXT,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'in-production', 'completed', 'archived')),
      totalShots INTEGER DEFAULT 0,
      completedShots INTEGER DEFAULT 0,
      defaultAspectRatio TEXT DEFAULT '16:9',
      defaultLighting TEXT DEFAULT 'natural',
      defaultEquipmentPresetId TEXT,
      tags TEXT DEFAULT '[]',
      metadata TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (brandId) REFERENCES brand_profiles(id) ON DELETE SET NULL,
      FOREIGN KEY (defaultEquipmentPresetId) REFERENCES equipment_presets(id) ON DELETE SET NULL
    )
  `);
}

async function createShotsTable(db: DB): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS shots (
      id TEXT PRIMARY KEY,
      shotListId TEXT NOT NULL,
      shotNumber TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      notes TEXT,
      shotType TEXT NOT NULL,
      cameraMovement TEXT NOT NULL,
      lighting TEXT NOT NULL,
      aspectRatio TEXT NOT NULL,
      duration INTEGER,
      fps INTEGER,
      referenceImageUrl TEXT,
      storyboardImageUrl TEXT,
      generatedAssetId TEXT,
      location TEXT,
      subjects TEXT DEFAULT '[]',
      props TEXT DEFAULT '[]',
      dialogue TEXT,
      soundEffects TEXT DEFAULT '[]',
      musicCue TEXT,
      status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'scripted', 'storyboarded', 'approved', 'in-progress', 'review', 'completed', 'rejected')),
      priority INTEGER DEFAULT 3,
      orderIndex INTEGER NOT NULL,
      promptTemplateId TEXT,
      generatedPrompt TEXT,
      providerPreference TEXT,
      estimatedDuration INTEGER,
      actualDuration INTEGER,
      tags TEXT DEFAULT '[]',
      metadata TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (shotListId) REFERENCES shot_lists(id) ON DELETE CASCADE,
      FOREIGN KEY (generatedAssetId) REFERENCES assets(id) ON DELETE SET NULL,
      FOREIGN KEY (promptTemplateId) REFERENCES prompt_templates(id) ON DELETE SET NULL
    )
  `);
}

async function createEquipmentPresetsTable(db: DB): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS equipment_presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      camera TEXT,
      lens TEXT,
      lighting TEXT NOT NULL,
      movement TEXT NOT NULL,
      shotType TEXT NOT NULL,
      aspectRatio TEXT NOT NULL,
      fps INTEGER,
      resolution TEXT,
      isDefault INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);
}

async function createTalentProfilesTable(db: DB): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS talent_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('character', 'person', 'creature', 'object', 'environment', 'style')),
      description TEXT NOT NULL,
      appearance TEXT NOT NULL,
      personality TEXT,
      primaryImageId TEXT,
      promptFragments TEXT NOT NULL,
      tags TEXT DEFAULT '[]',
      brandId TEXT,
      projectId TEXT,
      isFavorite INTEGER DEFAULT 0,
      isArchived INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (brandId) REFERENCES brand_profiles(id) ON DELETE SET NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE SET NULL
    )
  `);
}

async function createTalentReferenceImagesTable(db: DB): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS talent_reference_images (
      id TEXT PRIMARY KEY,
      talentId TEXT NOT NULL,
      url TEXT NOT NULL,
      thumbnailUrl TEXT,
      caption TEXT,
      isPrimary INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (talentId) REFERENCES talent_profiles(id) ON DELETE CASCADE
    )
  `);
}

async function createIndexes(db: DB): Promise<void> {
  // Provider indexes
  await db.exec('CREATE INDEX IF NOT EXISTS idx_providers_active ON providers(isActive)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_providers_type ON providers(type)');

  // Credential indexes
  await db.exec('CREATE INDEX IF NOT EXISTS idx_credentials_provider ON provider_credentials(providerId)');

  // Template indexes
  await db.exec('CREATE INDEX IF NOT EXISTS idx_templates_category ON prompt_templates(category)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_templates_outputType ON prompt_templates(outputType)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_templates_archived ON prompt_templates(isArchived)');

  // Version indexes
  await db.exec('CREATE INDEX IF NOT EXISTS idx_versions_template ON prompt_versions(templateId)');

  // Label indexes
  await db.exec('CREATE INDEX IF NOT EXISTS idx_labels_template ON prompt_labels(templateId)');

  // Asset indexes
  await db.exec('CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(projectId)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_assets_favorite ON assets(isFavorite)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_assets_archived ON assets(isArchived)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_assets_created ON assets(createdAt DESC)');

  // Generation record indexes
  await db.exec('CREATE INDEX IF NOT EXISTS idx_generation_status ON generation_records(status)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_generation_type ON generation_records(type)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_generation_provider ON generation_records(providerId)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_generation_created ON generation_records(createdAt DESC)');

  // Project indexes
  await db.exec('CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects(isArchived)');

  // Shot list indexes
  await db.exec('CREATE INDEX IF NOT EXISTS idx_shot_lists_project ON shot_lists(projectId)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_shot_lists_status ON shot_lists(status)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_shot_lists_content_type ON shot_lists(contentType)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_shot_lists_created ON shot_lists(createdAt DESC)');

  // Shot indexes
  await db.exec('CREATE INDEX IF NOT EXISTS idx_shots_shot_list ON shots(shotListId)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_shots_status ON shots(status)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_shots_order ON shots(shotListId, orderIndex)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_shots_created ON shots(createdAt DESC)');

  // Equipment preset indexes
  await db.exec('CREATE INDEX IF NOT EXISTS idx_equipment_presets_default ON equipment_presets(isDefault)');

  // Talent profile indexes
  await db.exec('CREATE INDEX IF NOT EXISTS idx_talent_profiles_type ON talent_profiles(type)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_talent_profiles_brand ON talent_profiles(brandId)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_talent_profiles_project ON talent_profiles(projectId)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_talent_profiles_favorite ON talent_profiles(isFavorite)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_talent_profiles_archived ON talent_profiles(isArchived)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_talent_profiles_created ON talent_profiles(createdAt DESC)');

  // Talent reference images indexes
  await db.exec('CREATE INDEX IF NOT EXISTS idx_talent_reference_images_talent ON talent_reference_images(talentId)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_talent_reference_images_primary ON talent_reference_images(isPrimary)');
}

/**
 * Reset database (drop all tables and recreate)
 * Use with caution - destroys all data
 */
export async function resetDatabase(): Promise<void> {
  const db = getDatabase();

  const tables = [
    'talent_reference_images',
    'talent_profiles',
    'shots',
    'shot_lists',
    'equipment_presets',
    'generation_records',
    'assets',
    'asset_collections',
    'prompt_labels',
    'prompt_versions',
    'prompt_templates',
    'provider_credentials',
    'providers',
    'brand_profiles',
    'projects',
  ];

  for (const table of tables) {
    await db.exec(`DROP TABLE IF EXISTS ${table}`);
  }

  await initializeSchema();
  console.log('Database reset complete');
}
