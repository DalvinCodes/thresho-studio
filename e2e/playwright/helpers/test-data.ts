/**
 * Test Data Factories
 * Helper functions to create test data in the database
 */

import type { TestDatabase } from './database';
import type { 
  UUID, 
  Timestamp, 
  ContentType, 
  ProviderType 
} from '../../../src/core/types/common';
import type { 
  PromptTemplate, 
  PromptVersion,
  PromptVariable 
} from '../../../src/core/types/prompt';
import type { BrandProfile, BrandTokenSchema } from '../../../src/core/types/brand';
import type { Asset, AssetMetadata } from '../../../src/core/types/asset';
import type { ShotList, Shot, ShotType, ShotStatus, CameraMovement, LightingSetup, AspectRatio } from '../../../src/core/types/shotList';

// Helper to generate UUID
function generateUUID(): UUID {
  return crypto.randomUUID() as UUID;
}

// Helper to generate timestamp
function generateTimestamp(): Timestamp {
  return Date.now();
}

/**
 * Create a prompt template
 */
export async function createTemplate(
  db: TestDatabase,
  overrides: Partial<PromptTemplate> = {}
): Promise<PromptTemplate> {
  const now = generateTimestamp();
  const template: PromptTemplate = {
    id: generateUUID(),
    name: overrides.name ?? 'Test Template',
    description: overrides.description ?? 'A test prompt template',
    outputType: overrides.outputType ?? 'image',
    category: overrides.category ?? 'test',
    tags: overrides.tags ?? ['test'],
    currentVersionId: overrides.currentVersionId,
    isArchived: overrides.isArchived ?? false,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    ...overrides,
  };

  await db.exec(
    `INSERT INTO prompt_templates (id, name, description, outputType, category, tags, currentVersionId, isArchived, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      template.id,
      template.name,
      template.description,
      template.outputType,
      template.category,
      JSON.stringify(template.tags),
      template.currentVersionId ?? null,
      template.isArchived ? 1 : 0,
      template.createdAt,
      template.updatedAt,
    ]
  );

  return template;
}

/**
 * Create a prompt template version
 */
export async function createTemplateVersion(
  db: TestDatabase,
  templateId: UUID,
  content: { systemPrompt?: string; userPrompt: string; variables?: PromptVariable[] },
  version: string = '1.0.0'
): Promise<PromptVersion> {
  const now = generateTimestamp();
  const versionRecord: PromptVersion = {
    id: generateUUID(),
    templateId,
    version,
    contentHash: generateUUID(), // Simplified hash
    systemPrompt: content.systemPrompt,
    userPrompt: content.userPrompt,
    variables: content.variables ?? [],
    createdAt: now,
  };

  await db.exec(
    `INSERT INTO prompt_versions (id, templateId, version, contentHash, systemPrompt, userPrompt, variables, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      versionRecord.id,
      versionRecord.templateId,
      versionRecord.version,
      versionRecord.contentHash,
      versionRecord.systemPrompt ?? null,
      versionRecord.userPrompt,
      JSON.stringify(versionRecord.variables),
      versionRecord.createdAt,
    ]
  );

  return versionRecord;
}

/**
 * Create a brand profile
 */
export async function createBrand(
  db: TestDatabase,
  overrides: Partial<BrandProfile> = {}
): Promise<BrandProfile> {
  const now = generateTimestamp();
  
  const defaultTokens: BrandTokenSchema = {
    colors: {
      primary: '#FF714E',
      secondary: '#004466',
      neutralDark: '#111122',
      neutralLight: '#F0EEEE',
      paletteDescription: 'Test brand colors',
    },
    typography: {
      primaryFont: 'Inter',
      styleDescriptor: 'Clean sans-serif',
    },
    visualStyle: {
      aesthetic: 'Modern minimalist',
      photographyStyle: 'High-quality lifestyle',
      mood: 'Professional',
    },
    voice: {
      tone: ['professional', 'friendly'],
      forbiddenTerms: ['cheap', 'basic'],
      forbiddenElements: [],
    },
  };

  const brand: BrandProfile = {
    id: generateUUID(),
    name: overrides.name ?? 'Test Brand',
    description: overrides.description ?? 'A test brand profile',
    logoUrl: overrides.logoUrl,
    tokens: overrides.tokens ?? defaultTokens,
    isDefault: overrides.isDefault ?? false,
    isArchived: overrides.isArchived ?? false,
    metadata: overrides.metadata,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    ...overrides,
  };

  await db.exec(
    `INSERT INTO brand_profiles (id, name, description, logoUrl, tokens, isDefault, isArchived, metadata, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      brand.id,
      brand.name,
      brand.description ?? null,
      brand.logoUrl ?? null,
      JSON.stringify(brand.tokens),
      brand.isDefault ? 1 : 0,
      brand.isArchived ? 1 : 0,
      brand.metadata ? JSON.stringify(brand.metadata) : null,
      brand.createdAt,
      brand.updatedAt,
    ]
  );

  return brand;
}

/**
 * Create a shot list
 */
export async function createShotList(
  db: TestDatabase,
  projectId?: UUID,
  overrides: Partial<ShotList> = {}
): Promise<ShotList> {
  const now = generateTimestamp();
  const shotList: ShotList = {
    id: generateUUID(),
    name: overrides.name ?? 'Test Shot List',
    description: overrides.description,
    projectId: projectId ?? overrides.projectId,
    director: overrides.director,
    cinematographer: overrides.cinematographer,
    productionDate: overrides.productionDate,
    contentType: overrides.contentType ?? 'image',
    brandId: overrides.brandId,
    status: overrides.status ?? 'draft',
    totalShots: overrides.totalShots ?? 0,
    completedShots: overrides.completedShots ?? 0,
    defaultAspectRatio: overrides.defaultAspectRatio ?? '16:9',
    defaultLighting: overrides.defaultLighting ?? 'natural',
    defaultEquipmentPresetId: overrides.defaultEquipmentPresetId,
    tags: overrides.tags ?? [],
    metadata: overrides.metadata,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    ...overrides,
  };

  // Note: Shot lists are stored in Zustand store, not SQLite
  // This factory creates the data structure but doesn't persist to DB
  // Tests should use the store directly for shot list operations
  return shotList;
}

/**
 * Create an individual shot
 */
export async function createShot(
  db: TestDatabase,
  shotListId: UUID,
  overrides: Partial<Shot> = {}
): Promise<Shot> {
  const now = generateTimestamp();
  const shot: Shot = {
    id: generateUUID(),
    shotListId,
    shotNumber: overrides.shotNumber ?? '1',
    name: overrides.name ?? 'Test Shot',
    description: overrides.description ?? 'A test shot',
    notes: overrides.notes,
    shotType: overrides.shotType ?? 'medium',
    cameraMovement: overrides.cameraMovement ?? 'static',
    lighting: overrides.lighting ?? 'natural',
    aspectRatio: overrides.aspectRatio ?? '16:9',
    duration: overrides.duration,
    fps: overrides.fps,
    referenceImageUrl: overrides.referenceImageUrl,
    storyboardImageUrl: overrides.storyboardImageUrl,
    generatedAssetId: overrides.generatedAssetId,
    location: overrides.location,
    subjects: overrides.subjects ?? [],
    props: overrides.props ?? [],
    dialogue: overrides.dialogue,
    soundEffects: overrides.soundEffects ?? [],
    musicCue: overrides.musicCue,
    status: overrides.status ?? 'planned',
    priority: overrides.priority ?? 3,
    orderIndex: overrides.orderIndex ?? 0,
    promptTemplateId: overrides.promptTemplateId,
    generatedPrompt: overrides.generatedPrompt,
    providerPreference: overrides.providerPreference,
    estimatedDuration: overrides.estimatedDuration,
    actualDuration: overrides.actualDuration,
    tags: overrides.tags ?? [],
    metadata: overrides.metadata,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    ...overrides,
  };

  // Note: Shots are stored in Zustand store, not SQLite
  // This factory creates the data structure but doesn't persist to DB
  return shot;
}

/**
 * Create an asset record
 */
export async function createAsset(
  db: TestDatabase,
  overrides: Partial<Asset> = {}
): Promise<Asset> {
  const now = generateTimestamp();
  
  const defaultMetadata: AssetMetadata = {
    fileSize: 1024,
    mimeType: 'image/png',
    width: 1024,
    height: 1024,
    ...overrides.metadata,
  };

  const asset: Asset = {
    id: generateUUID(),
    name: overrides.name ?? 'Test Asset',
    description: overrides.description,
    type: overrides.type ?? 'image',
    format: overrides.format ?? 'png',
    url: overrides.url ?? 'blob:test-url',
    thumbnailUrl: overrides.thumbnailUrl,
    storageLocation: overrides.storageLocation ?? 'local',
    metadata: { ...defaultMetadata, ...overrides.metadata },
    projectId: overrides.projectId,
    tags: overrides.tags ?? [],
    isFavorite: overrides.isFavorite ?? false,
    isArchived: overrides.isArchived ?? false,
    generationRecordId: overrides.generationRecordId,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    ...overrides,
  };

  await db.exec(
    `INSERT INTO assets (id, name, description, type, format, url, thumbnailUrl, storageLocation, metadata, projectId, tags, isFavorite, isArchived, generationRecordId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

  return asset;
}

/**
 * Seed multiple assets
 */
export async function seedAssets(
  db: TestDatabase,
  count: number,
  overrides: Partial<Asset>[] = []
): Promise<Asset[]> {
  const assets: Asset[] = [];
  
  for (let i = 0; i < count; i++) {
    const override = overrides[i] ?? {};
    const asset = await createAsset(db, {
      name: `Test Asset ${i + 1}`,
      ...override,
    });
    assets.push(asset);
  }
  
  return assets;
}

/**
 * Create a provider configuration
 */
export async function createProviderConfig(
  db: TestDatabase,
  provider: ProviderType,
  apiKey: string,
  overrides: Partial<{
    name: string;
    displayName: string;
    description: string;
    apiBaseUrl: string;
    isActive: boolean;
    isDefault: boolean;
  }> = {}
): Promise<{ providerId: UUID; credentialId: UUID }> {
  const now = generateTimestamp();
  const providerId = generateUUID();
  const credentialId = generateUUID();

  // Map provider type to capabilities
  const capabilitiesMap: Record<ProviderType, string[]> = {
    openai: ['text', 'image'],
    anthropic: ['text'],
    gemini: ['text', 'image'],
    'gemini-nano': ['text'],
    kimi: ['text'],
    'flux-pro': ['image'],
    imagen: ['image'],
    runway: ['video'],
    veo: ['video'],
    kling: ['video'],
    openrouter: ['text'],
  };

  const providerNames: Record<ProviderType, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    gemini: 'Google Gemini',
    'gemini-nano': 'Gemini Nano',
    kimi: 'Kimi',
    'flux-pro': 'Flux Pro',
    imagen: 'Imagen 3',
    runway: 'Runway',
    veo: 'Veo',
    kling: 'Kling',
    openrouter: 'OpenRouter',
  };

  // Insert provider
  await db.exec(
    `INSERT INTO providers (id, type, name, displayName, description, apiBaseUrl, capabilities, isActive, isDefault, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      providerId,
      provider,
      overrides.name ?? providerNames[provider],
      overrides.displayName ?? providerNames[provider],
      overrides.description ?? `${providerNames[provider]} API provider`,
      overrides.apiBaseUrl ?? null,
      JSON.stringify(capabilitiesMap[provider]),
      overrides.isActive ?? true ? 1 : 0,
      overrides.isDefault ?? false ? 1 : 0,
      now,
      now,
    ]
  );

  // Insert credentials
  await db.exec(
    `INSERT INTO provider_credentials (id, providerId, apiKey, createdAt)
     VALUES (?, ?, ?, ?)`,
    [
      credentialId,
      providerId,
      apiKey,
      now,
    ]
  );

  return { providerId, credentialId };
}

/**
 * Create a project
 */
export async function createProject(
  db: TestDatabase,
  overrides: Partial<{
    id: UUID;
    name: string;
    description: string;
    defaultProviderId: UUID;
    defaultBrandId: UUID;
    isArchived: boolean;
    settings: Record<string, unknown>;
    metadata: Record<string, unknown>;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  }> = {}
): Promise<{ id: UUID; name: string; createdAt: Timestamp; updatedAt: Timestamp }> {
  const now = generateTimestamp();
  const id = overrides.id ?? generateUUID();
  const name = overrides.name ?? 'Test Project';

  await db.exec(
    `INSERT INTO projects (id, name, description, defaultProviderId, defaultBrandId, isArchived, settings, metadata, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      name,
      overrides.description ?? null,
      overrides.defaultProviderId ?? null,
      overrides.defaultBrandId ?? null,
      overrides.isArchived ?? false ? 1 : 0,
      overrides.settings ? JSON.stringify(overrides.settings) : null,
      overrides.metadata ? JSON.stringify(overrides.metadata) : null,
      overrides.createdAt ?? now,
      overrides.updatedAt ?? now,
    ]
  );

  return { id, name, createdAt: overrides.createdAt ?? now, updatedAt: overrides.updatedAt ?? now };
}
