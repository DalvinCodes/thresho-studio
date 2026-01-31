/**
 * Project types for workspace organization
 */

import type { UUID, Timestamp, BaseEntity } from './common';

// Project stored in database
export interface Project extends BaseEntity {
  name: string;
  description?: string;

  // Default settings
  defaultProviderId?: UUID;
  defaultBrandId?: UUID;

  // Organization
  isArchived: boolean;

  // Settings
  settings?: ProjectSettings;

  // Metadata
  metadata?: Record<string, unknown>;
}

// Project-level settings
export interface ProjectSettings {
  // Default generation parameters
  defaultTemperature?: number;
  defaultMaxTokens?: number;

  // UI preferences
  preferredViewMode?: 'grid' | 'list';

  // Workflow settings
  autoSaveEnabled?: boolean;
  autoSaveIntervalMs?: number;
}

// Project statistics
export interface ProjectStats {
  projectId: UUID;
  assetCount: number;
  generationCount: number;
  templateCount: number;
  totalStorageBytes: number;
  lastActivityAt: Timestamp;
}

// Project with stats for display
export interface ProjectWithStats {
  project: Project;
  stats: ProjectStats;
}

// Project search params
export interface ProjectSearchParams {
  query?: string;
  includeArchived?: boolean;
}
