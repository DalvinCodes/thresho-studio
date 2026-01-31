/**
 * Brand profile and token types for brand consistency
 */

import type { UUID, Timestamp, BaseEntity } from './common';

// Token categories for organization
export type TokenCategory =
  | 'colors'
  | 'typography'
  | 'visual_style'
  | 'voice'
  | 'assets'
  | 'custom';

// Individual brand token
export interface BrandToken {
  key: string; // e.g., 'PRIMARY_COLOR', 'BRAND_VOICE'
  value: string;
  category: TokenCategory;
  description?: string;
  isRequired: boolean;
}

// Color tokens structure
export interface ColorTokens {
  primary: string;
  secondary: string;
  accent?: string;
  neutralDark: string;
  neutralLight: string;
  paletteDescription: string;
}

// Typography tokens structure
export interface TypographyTokens {
  primaryFont: string;
  secondaryFont?: string;
  styleDescriptor: string;
}

// Visual style tokens structure
export interface VisualStyleTokens {
  aesthetic: string;
  photographyStyle: string;
  mood: string;
  artDirection?: string;
}

// Voice tokens structure
export interface VoiceTokens {
  tone: string[];
  forbiddenTerms: string[];
  forbiddenElements: string[];
  writingStyle?: string;
}

// Asset tokens structure
export interface AssetTokens {
  logoUrl?: string;
  iconSetUrl?: string;
  watermarkUrl?: string;
}

// Complete brand token schema
export interface BrandTokenSchema {
  colors: ColorTokens;
  typography: TypographyTokens;
  visualStyle: VisualStyleTokens;
  voice: VoiceTokens;
  assets?: AssetTokens;
  customTokens?: BrandToken[];
}

// Brand profile stored in database
export interface BrandProfile extends BaseEntity {
  name: string;
  description?: string;
  logoUrl?: string;
  tokens: BrandTokenSchema;
  isDefault: boolean;
  isArchived: boolean;
  metadata?: Record<string, unknown>;
}

// Brand token injection result
export interface TokenInjectionResult {
  originalContent: string;
  injectedContent: string;
  tokensInjected: Array<{
    key: string;
    value: string;
    position: number;
  }>;
  unresolvedTokens: string[];
}

// Flattened tokens for easy lookup during injection
export interface FlattenedBrandTokens {
  [key: string]: string;
}

// Brand validation result
export interface BrandValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

// Default Thresho brand tokens (from PRD)
export const DEFAULT_THRESHO_TOKENS: BrandTokenSchema = {
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
