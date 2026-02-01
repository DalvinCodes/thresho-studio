/**
 * Talent types for character/talent profiles
 * Used for managing reusable character descriptions in generation prompts
 */

import type { UUID, Timestamp } from './common';

/**
 * Type of talent profile
 */
export type TalentType = 'character' | 'person' | 'creature' | 'object' | 'environment' | 'style';

/**
 * Hair attributes for appearance
 */
export interface HairAttributes {
  color?: string;
  style?: string;
  length?: string;
}

/**
 * Eye attributes for appearance
 */
export interface EyeAttributes {
  color?: string;
  shape?: string;
}

/**
 * Skin attributes for appearance
 */
export interface SkinAttributes {
  tone?: string;
  texture?: string;
}

/**
 * Visual appearance attributes
 */
export interface TalentAppearance {
  age?: string;
  gender?: string;
  ethnicity?: string;
  bodyType?: string;
  height?: string;
  hair?: HairAttributes;
  eyes?: EyeAttributes;
  skin?: SkinAttributes;
  distinguishingFeatures?: string[];
  clothing?: string;
  accessories?: string[];
}

/**
 * Character personality traits
 */
export interface TalentPersonality {
  traits?: string[];
  mood?: string;
  expression?: string;
  posture?: string;
}

/**
 * Provider-specific prompt fragments
 */
export interface TalentPromptFragments {
  default: string;
  midjourney?: string;
  dalle?: string;
  flux?: string;
  runway?: string;
}

/**
 * Reference image for a talent
 */
export interface TalentReferenceImage {
  id: UUID;
  talentId: UUID;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  isPrimary: boolean;
  createdAt: Timestamp;
}

/**
 * Character sheet angle types
 */
export type CharacterSheetAngle = 'front' | 'back' | 'left-profile' | 'right-profile' | 'three-quarter';

/**
 * AI-generated image for a talent (headshot or character sheet)
 */
export interface TalentGeneratedImage {
  id: UUID;
  talentId: UUID;
  type: 'headshot' | 'character-sheet';
  angle?: CharacterSheetAngle;
  url: string;
  thumbnailUrl?: string;
  generationPrompt: string;
  providerId: string;
  model: string;
  seed?: number;
  isApproved: boolean;
  createdAt: Timestamp;
}

/**
 * Generation state for talent AI generation UI
 */
export interface TalentGenerationState {
  currentHeadshot: TalentGeneratedImage | null;
  characterSheet: TalentGeneratedImage[];
  isGenerating: boolean;
  generationStep: 'idle' | 'headshot' | 'analyzing' | 'character-sheet';
  selectedProviderId: string | null;
  selectedModelId: string | null;
  error: string | null;
}

/**
 * Full talent profile
 */
export interface TalentProfile {
  id: UUID;
  name: string;
  type: TalentType;
  description: string;
  
  // Visual attributes
  appearance: TalentAppearance;
  
  // Character attributes (for characters/persons)
  personality?: TalentPersonality;
  
  // Reference images
  referenceImages: TalentReferenceImage[];
  primaryImageId?: UUID;
  
  // Prompt fragments for different providers
  promptFragments: TalentPromptFragments;
  
  // Organization
  tags: string[];
  brandId?: UUID;
  projectId?: UUID;
  isFavorite: boolean;
  isArchived: boolean;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Filters for talent search/listing
 */
export interface TalentFilters {
  type?: TalentType | null;
  tags?: string[];
  brandId?: UUID | null;
  projectId?: UUID | null;
  isFavorite?: boolean;
  isArchived?: boolean;
}

/**
 * Validation result for talent profile
 */
export interface TalentValidationResult {
  isValid: boolean;
  errors: Array<{ field: string; message: string }>;
  warnings: Array<{ field: string; message: string }>;
}
