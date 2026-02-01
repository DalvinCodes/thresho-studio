/**
 * Shot List and Storyboard Types
 * For production planning and shot management
 */

import type { UUID, Timestamp, BaseEntity, ContentType } from './common';

// Shot type categories
export type ShotType =
  | 'wide'          // Wide/establishing shot
  | 'medium'        // Medium shot
  | 'close-up'      // Close-up shot
  | 'extreme-close' // Extreme close-up
  | 'over-shoulder' // Over-the-shoulder
  | 'pov'           // Point of view
  | 'aerial'        // Aerial/drone shot
  | 'low-angle'     // Low angle
  | 'high-angle'    // High angle
  | 'dutch-angle'   // Dutch/tilted angle
  | 'tracking'      // Tracking/following shot
  | 'pan'           // Pan shot
  | 'tilt'          // Tilt shot
  | 'zoom'          // Zoom shot
  | 'static'        // Static shot
  | 'handheld'      // Handheld shot
  | 'steadicam'     // Steadicam shot
  | 'crane'         // Crane shot
  | 'dolly'         // Dolly shot
  | 'custom';       // Custom shot type

// Camera movement types
export type CameraMovement =
  | 'static'
  | 'pan-left'
  | 'pan-right'
  | 'tilt-up'
  | 'tilt-down'
  | 'dolly-in'
  | 'dolly-out'
  | 'truck-left'
  | 'truck-right'
  | 'crane-up'
  | 'crane-down'
  | 'zoom-in'
  | 'zoom-out'
  | 'follow'
  | 'orbit'
  | 'push-in'
  | 'pull-out'
  | 'whip-pan'
  | 'rack-focus'
  | 'custom';

// Shot status in production workflow
export type ShotStatus =
  | 'planned'       // Initial planning
  | 'scripted'      // Script written
  | 'storyboarded'  // Visual reference created
  | 'approved'      // Approved for production
  | 'in-progress'   // Currently being generated
  | 'review'        // In review
  | 'completed'     // Generation complete
  | 'rejected';     // Rejected/needs revision

// Lighting setup types
export type LightingSetup =
  | 'natural'
  | 'golden-hour'
  | 'blue-hour'
  | 'overcast'
  | 'studio-three-point'
  | 'studio-rembrandt'
  | 'studio-split'
  | 'studio-butterfly'
  | 'studio-loop'
  | 'high-key'
  | 'low-key'
  | 'silhouette'
  | 'backlit'
  | 'side-lit'
  | 'neon'
  | 'practical'
  | 'mixed'
  | 'custom';

// Aspect ratio options
export type AspectRatio =
  | '16:9'      // Widescreen
  | '9:16'      // Vertical/mobile
  | '4:3'       // Standard
  | '1:1'       // Square
  | '21:9'      // Cinematic ultra-wide
  | '2.39:1'    // Anamorphic
  | '4:5'       // Instagram portrait
  | 'custom';

// Equipment preset for quick shot setup
export interface EquipmentPreset extends BaseEntity {
  name: string;
  description?: string;
  camera?: string;
  lens?: string;
  lighting: LightingSetup;
  movement: CameraMovement;
  shotType: ShotType;
  aspectRatio: AspectRatio;
  fps?: number;
  resolution?: string;
  isDefault: boolean;
  tags: string[];
}

// Individual shot definition
export interface Shot extends BaseEntity {
  // Core identification
  shotListId: UUID;
  shotNumber: string;        // e.g., "1", "1A", "2B"
  name: string;

  // Shot description
  description: string;       // What happens in the shot
  notes?: string;            // Production notes

  // Technical specs
  shotType: ShotType;
  cameraMovement: CameraMovement;
  lighting: LightingSetup;
  aspectRatio: AspectRatio;
  duration?: number;         // Seconds
  fps?: number;

  // Visual reference
  referenceImageUrl?: string;
  storyboardImageUrl?: string;
  generatedAssetId?: UUID;   // Link to generated asset

  // Location and subjects
  location?: string;
  subjects?: string[];       // People, objects, etc.
  props?: string[];

  // Audio
  dialogue?: string;
  soundEffects?: string[];
  musicCue?: string;

  // Production metadata
  status: ShotStatus;
  priority: number;          // 1-5 (1 = highest)
  orderIndex: number;        // Position in shot list

  // AI Generation
  promptTemplateId?: UUID;   // Template to use for generation
  generatedPrompt?: string;  // Auto-composed prompt
  providerPreference?: string;
  talentIds?: UUID[];        // Selected talents for this shot

  // Timing
  estimatedDuration?: number;
  actualDuration?: number;

  // Tags and metadata
  tags: string[];
  metadata?: Record<string, unknown>;
}

// Shot list container
export interface ShotList extends BaseEntity {
  // Core
  name: string;
  description?: string;
  projectId?: UUID;

  // Production info
  director?: string;
  cinematographer?: string;
  productionDate?: Timestamp;

  // Content type
  contentType: ContentType;  // 'image' or 'video'

  // Brand association
  brandId?: UUID;

  // Status
  status: 'draft' | 'in-production' | 'completed' | 'archived';

  // Shot statistics (computed)
  totalShots: number;
  completedShots: number;

  // Default settings
  defaultAspectRatio: AspectRatio;
  defaultLighting: LightingSetup;
  defaultEquipmentPresetId?: UUID;

  // Tags and metadata
  tags: string[];
  metadata?: Record<string, unknown>;
}

// Shot with computed fields for UI
export interface ShotWithDetails extends Shot {
  shotList?: ShotList;
  generatedAsset?: {
    id: UUID;
    url: string;
    thumbnailUrl?: string;
  };
  template?: {
    id: UUID;
    name: string;
  };
}

// Shot creation input
export interface CreateShotInput {
  shotListId: UUID;
  name: string;
  description: string;
  shotType?: ShotType;
  cameraMovement?: CameraMovement;
  lighting?: LightingSetup;
  aspectRatio?: AspectRatio;
  duration?: number;
  location?: string;
  subjects?: string[];
  priority?: number;
  tags?: string[];
}

// Batch shot operations
export interface BatchShotUpdate {
  shotIds: UUID[];
  updates: Partial<Pick<Shot,
    | 'status'
    | 'priority'
    | 'shotType'
    | 'cameraMovement'
    | 'lighting'
    | 'aspectRatio'
    | 'tags'
  >>;
}

// Storyboard export options
export interface StoryboardExportOptions {
  shotListId: UUID;
  format: 'pdf' | 'png' | 'zip';
  includeNotes: boolean;
  includePrompts: boolean;
  includeTechnicalSpecs: boolean;
  imagesPerPage: 1 | 2 | 4 | 6 | 9;
  pageSize: 'letter' | 'a4' | 'tabloid';
  orientation: 'portrait' | 'landscape';
}

// AI shot suggestion request
export interface ShotSuggestionRequest {
  shotListId: UUID;
  context: string;          // Scene description or script excerpt
  style?: string;           // Visual style preference
  count?: number;           // Number of suggestions
  existingShots?: UUID[];   // IDs of shots already in the list
}

// AI shot suggestion result
export interface ShotSuggestion {
  name: string;
  description: string;
  shotType: ShotType;
  cameraMovement: CameraMovement;
  lighting: LightingSetup;
  reasoning: string;        // Why this shot was suggested
  confidence: number;       // 0-1 confidence score
}

// Shot prompt composition context
export interface ShotPromptContext {
  shot: Shot;
  shotList: ShotList;
  brand?: {
    aesthetic: string;
    photographyStyle: string;
    mood: string;
    colorPalette: string;
  };
  equipmentPreset?: EquipmentPreset;
  talents?: import('./talent').TalentProfile[];
}

// Composed shot prompt result
export interface ComposedShotPrompt {
  systemPrompt?: string;
  userPrompt: string;
  negativePrompt?: string;
  technicalParameters: {
    aspectRatio: string;
    style?: string;
    lighting?: string;
    camera?: string;
  };
}

// Shot list view modes
export type ShotListViewMode = 'table' | 'storyboard' | 'timeline';

// Shot filter options
export interface ShotFilterOptions {
  status?: ShotStatus[];
  shotType?: ShotType[];
  priority?: number[];
  tags?: string[];
  hasGeneratedAsset?: boolean;
  searchQuery?: string;
}

// Shot sort options
export type ShotSortField =
  | 'orderIndex'
  | 'shotNumber'
  | 'priority'
  | 'status'
  | 'createdAt'
  | 'updatedAt';

export interface ShotSortOptions {
  field: ShotSortField;
  direction: 'asc' | 'desc';
}
