/**
 * Global Setup for Playwright E2E Tests
 * Seeds system data before test suite runs
 */

import type { TestDatabase } from '../helpers/database';
import { createTestDatabase, deleteTestDatabase } from '../helpers/database';
import { createProviderConfig, createBrand } from '../helpers/test-data';
import type { BrandTokenSchema } from '../../../src/core/types/brand';

/**
 * Equipment preset definitions (from PRD)
 */
export const EQUIPMENT_PRESETS = [
  {
    id: 'preset-arri-alexa',
    name: 'ARRI Alexa',
    category: 'camera',
    description: 'Cinematic film quality with ARRI color science',
    promptFragment: 'cinematic film quality, ARRI color science, high dynamic range, natural skin tones',
  },
  {
    id: 'preset-red-komodo',
    name: 'RED Komodo',
    category: 'camera',
    description: 'Compact cinema camera with RED RAW',
    promptFragment: 'sharp digital cinema, high dynamic range, RED color science, professional cinematography',
  },
  {
    id: 'preset-sony-fx6',
    name: 'Sony FX6',
    category: 'camera',
    description: 'Full-frame cinema camera',
    promptFragment: 'Sony full-frame cinema look, shallow depth of field, cinematic quality',
  },
  {
    id: 'preset-canon-c70',
    name: 'Canon C70',
    category: 'camera',
    description: 'RF mount cinema camera',
    promptFragment: 'Canon cinema color science, professional video quality, cinematic look',
  },
  {
    id: 'preset-iphone-15-pro',
    name: 'iPhone 15 Pro',
    category: 'camera',
    description: 'ProRes LOG capable smartphone',
    promptFragment: 'iPhone ProRes quality, computational photography, modern smartphone aesthetic',
  },
  {
    id: 'preset-film-35mm',
    name: 'Film 35mm',
    category: 'camera',
    description: 'Classic 35mm film stock',
    promptFragment: '35mm film grain, analog photography, vintage film aesthetic, organic texture',
  },
  {
    id: 'preset-film-16mm',
    name: 'Film 16mm',
    category: 'camera',
    description: 'Vintage 16mm film stock',
    promptFragment: '16mm film grain, vintage analog look, indie film aesthetic, warm tones',
  },
];

/**
 * Default Thresho brand tokens (from PRD)
 */
export const DEFAULT_THRESHO_BRAND_TOKENS: BrandTokenSchema = {
  colors: {
    primary: '#FF714E',
    secondary: '#004466',
    neutralDark: '#111122',
    neutralLight: '#F0EEEE',
    paletteDescription: 'Warm coral orange primary with deep lush aqua secondary, anchored by near-black corbeau and soft paper white',
  },
  typography: {
    primaryFont: 'Inter',
    styleDescriptor: 'Clean, modern sans-serif with strong readability',
  },
  visualStyle: {
    aesthetic: 'Premium editorial, modern minimalist',
    photographyStyle: 'High-quality lifestyle, natural lighting, authentic not stock',
    mood: 'Professional yet approachable, energetic but not overwhelming',
  },
  voice: {
    tone: ['professional', 'empowering', 'straightforward'],
    forbiddenTerms: ['cheap', 'basic', 'simple', 'easy'],
    forbiddenElements: ['emojis'],
  },
};

/**
 * Seed system data into the database
 */
async function seedSystemData(db: TestDatabase): Promise<void> {
  console.log('Seeding system data...');

  // Create default Thresho brand profile
  await createBrand(db, {
    id: 'brand-thresho-default' as import('../../../src/core/types/common').UUID,
    name: 'Thresho Default',
    description: 'Default Thresho brand profile with official brand tokens',
    tokens: DEFAULT_THRESHO_BRAND_TOKENS,
    isDefault: true,
  });

  // Create mock provider configurations for testing
  await createProviderConfig(db, 'openai', 'sk-mock-openai-key', {
    name: 'OpenAI (Mock)',
    displayName: 'OpenAI',
    isActive: true,
  });

  await createProviderConfig(db, 'anthropic', 'sk-mock-anthropic-key', {
    name: 'Anthropic (Mock)',
    displayName: 'Anthropic',
    isActive: true,
  });

  await createProviderConfig(db, 'flux-pro', 'mock-flux-key', {
    name: 'Flux Pro (Mock)',
    displayName: 'Flux Pro',
    isActive: true,
  });

  console.log('System data seeded successfully');
}

/**
 * Global setup function for Playwright
 * This runs once before all tests
 */
async function globalSetup(): Promise<void> {
  console.log('Running global setup...');

  // Create a temporary database to validate migrations work
  const testId = `global-setup-${Date.now()}`;
  
  try {
    const { createTestDatabase } = await import('../helpers/database');
    const db = await createTestDatabase(testId);
    
    // Seed system data
    await seedSystemData(db);
    
    // Close and cleanup
    await db.close();
    await deleteTestDatabase(testId);
    
    console.log('Global setup complete');
  } catch (error) {
    console.error('Global setup failed:', error);
    // Don't throw - let tests run and fail individually if there's a real issue
  }
}

export default globalSetup;
