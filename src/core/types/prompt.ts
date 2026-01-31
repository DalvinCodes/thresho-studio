/**
 * Prompt template types for versioned prompt management
 */

import type { UUID, Timestamp, ProviderType, ContentType, BaseEntity } from './common';

// Variable types supported in prompt templates
export type VariableType = 'string' | 'number' | 'boolean' | 'enum' | 'brand_token';

// Variable definition for prompt templates
export interface PromptVariable {
  name: string;
  type: VariableType;
  description?: string;
  required: boolean;
  defaultValue?: string | number | boolean;
  enumValues?: string[]; // For enum type
  brandTokenKey?: string; // For brand_token type
}

// Prompt template stored in database
export interface PromptTemplate extends BaseEntity {
  name: string;
  description: string;
  outputType: ContentType;
  category: string;
  tags: string[];
  currentVersionId?: UUID;
  isArchived: boolean;
}

// Immutable prompt version
export interface PromptVersion {
  id: UUID;
  templateId: UUID;
  version: string; // Semantic versioning: "1.0.0"
  contentHash: string; // SHA-256 for reproducibility
  systemPrompt?: string;
  userPrompt: string;
  variables: PromptVariable[];
  modelConfig?: PromptModelConfig;
  changeLog?: string;
  createdBy?: string;
  createdAt: Timestamp;
}

// Model configuration for a prompt version
export interface PromptModelConfig {
  preferredProvider?: ProviderType;
  preferredModel?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

// Deployment labels (mutable pointers to immutable versions)
export type LabelType = 'draft' | 'staging' | 'production' | 'experiment';

export interface PromptLabel {
  id: UUID;
  templateId: UUID;
  versionId: UUID;
  label: string;
  labelType: LabelType;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Prompt execution context
export interface PromptExecutionContext {
  templateId: UUID;
  versionId?: UUID; // If not specified, uses current version or label
  label?: string; // 'production', 'staging', etc.
  brandId?: UUID;
  variables?: Record<string, string | number | boolean>;
}

// Rendered prompt ready for generation
export interface RenderedPrompt {
  systemPrompt?: string;
  userPrompt: string;
  modelConfig?: PromptModelConfig;
  metadata: {
    templateId: UUID;
    versionId: UUID;
    brandId?: UUID;
    variablesUsed: Record<string, string | number | boolean>;
    contentHash: string;
  };
}

// Template search/filter options
export interface TemplateSearchParams {
  query?: string;
  outputType?: ContentType;
  category?: string;
  tags?: string[];
  includeArchived?: boolean;
}

// Template with its current version for display
export interface TemplateWithVersion {
  template: PromptTemplate;
  currentVersion?: PromptVersion;
  labels: PromptLabel[];
  versionCount: number;
}
