/**
 * Template Service
 * Prompt rendering, variable substitution, and template operations
 */

import type {
  PromptVersion,
  PromptVariable,
  PromptExecutionContext,
  RenderedPrompt,
} from '../../../core/types/prompt';
import type { BrandProfile, BrandTokenSchema } from '../../../core/types/brand';
import { useTemplateStore } from '../store';
import { getAvailableTalentTokenNames } from '../../../core/utils/talentInjection';

// Variable placeholder pattern: {{variableName}} or {{brand.tokenKey}}
const VARIABLE_PATTERN = /\{\{([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)\}\}/g;

/**
 * Render a simple prompt string with variable substitution
 * Overload for simple string content (used in editor preview)
 */
export function renderPrompt(
  content: string,
  variables?: Record<string, string | number | boolean>
): string;

/**
 * Render a prompt template with variable substitution
 * Full version with PromptVersion object
 */
export function renderPrompt(
  version: PromptVersion,
  variables: Record<string, string | number | boolean>,
  brand: BrandProfile
): RenderedPrompt;

export function renderPrompt(
  versionOrContent: PromptVersion | string,
  variables: Record<string, string | number | boolean> = {},
  brand?: BrandProfile
): RenderedPrompt | string {
  // Simple string overload
  if (typeof versionOrContent === 'string') {
    return substituteVariables(versionOrContent, variables);
  }

  const version = versionOrContent;
  // Build token map from brand profile
  const brandTokens = brand ? buildBrandTokenMap(brand.tokens) : {};

  // Combine all available values
  const allValues = {
    ...getDefaultValues(version.variables),
    ...brandTokens,
    ...variables,
  };

  // Render system prompt
  const systemPrompt = version.systemPrompt
    ? substituteVariables(version.systemPrompt, allValues)
    : undefined;

  // Render user prompt
  const userPrompt = substituteVariables(version.userPrompt, allValues);

  return {
    systemPrompt,
    userPrompt,
    modelConfig: version.modelConfig,
    metadata: {
      templateId: version.templateId,
      versionId: version.id,
      brandId: brand?.id,
      variablesUsed: variables,
      contentHash: version.contentHash,
    },
  };
}

/**
 * Render a prompt from execution context
 */
export function renderFromContext(
  context: PromptExecutionContext,
  brand?: BrandProfile
): RenderedPrompt | null {
  const store = useTemplateStore.getState();

  // Get the version to use
  let version: PromptVersion | undefined;

  if (context.versionId) {
    version = store.getVersion(context.versionId);
  } else if (context.label) {
    version = store.getVersionByLabel(context.templateId, context.label);
  } else {
    version = store.getLatestVersion(context.templateId);
  }

  if (!version) return null;

  return renderPrompt(version, context.variables || {}, brand!);
}

/**
 * Substitute variables in a string
 */
function substituteVariables(
  text: string,
  values: Record<string, string | number | boolean>
): string {
  return text.replace(VARIABLE_PATTERN, (match, path) => {
    // Handle nested paths like "brand.primary_color"
    const parts = path.split('.');
    let value: unknown = values;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        value = undefined;
        break;
      }
    }

    // If it's a simple key, try direct lookup
    if (value === undefined && parts.length === 1) {
      value = values[path];
    }

    // Return substituted value or original placeholder
    if (value !== undefined && value !== null) {
      return String(value);
    }
    return match; // Keep original placeholder if no value found
  });
}

/**
 * Build a flat token map from brand token schema for substitution
 */
function buildBrandTokenMap(
  tokens: BrandTokenSchema
): Record<string, string> {
  const map: Record<string, string> = {};

  // Flatten color tokens
  if (tokens.colors) {
    map['primary_color'] = tokens.colors.primary;
    map['brand.primary_color'] = tokens.colors.primary;
    map['secondary_color'] = tokens.colors.secondary;
    map['brand.secondary_color'] = tokens.colors.secondary;
    if (tokens.colors.accent) {
      map['accent_color'] = tokens.colors.accent;
      map['brand.accent_color'] = tokens.colors.accent;
    }
    map['neutral_dark'] = tokens.colors.neutralDark;
    map['brand.neutral_dark'] = tokens.colors.neutralDark;
    map['neutral_light'] = tokens.colors.neutralLight;
    map['brand.neutral_light'] = tokens.colors.neutralLight;
    map['palette_description'] = tokens.colors.paletteDescription;
    map['brand.palette_description'] = tokens.colors.paletteDescription;
  }

  // Flatten typography tokens
  if (tokens.typography) {
    map['primary_font'] = tokens.typography.primaryFont;
    map['brand.primary_font'] = tokens.typography.primaryFont;
    if (tokens.typography.secondaryFont) {
      map['secondary_font'] = tokens.typography.secondaryFont;
      map['brand.secondary_font'] = tokens.typography.secondaryFont;
    }
    map['typography_style'] = tokens.typography.styleDescriptor;
    map['brand.typography_style'] = tokens.typography.styleDescriptor;
  }

  // Flatten visual style tokens
  if (tokens.visualStyle) {
    map['aesthetic'] = tokens.visualStyle.aesthetic;
    map['brand.aesthetic'] = tokens.visualStyle.aesthetic;
    map['photography_style'] = tokens.visualStyle.photographyStyle;
    map['brand.photography_style'] = tokens.visualStyle.photographyStyle;
    map['mood'] = tokens.visualStyle.mood;
    map['brand.mood'] = tokens.visualStyle.mood;
    if (tokens.visualStyle.artDirection) {
      map['art_direction'] = tokens.visualStyle.artDirection;
      map['brand.art_direction'] = tokens.visualStyle.artDirection;
    }
  }

  // Flatten voice tokens
  if (tokens.voice) {
    map['tone'] = tokens.voice.tone.join(', ');
    map['brand.tone'] = tokens.voice.tone.join(', ');
    map['forbidden_terms'] = tokens.voice.forbiddenTerms.join(', ');
    map['brand.forbidden_terms'] = tokens.voice.forbiddenTerms.join(', ');
    map['forbidden_elements'] = tokens.voice.forbiddenElements.join(', ');
    map['brand.forbidden_elements'] = tokens.voice.forbiddenElements.join(', ');
    if (tokens.voice.writingStyle) {
      map['writing_style'] = tokens.voice.writingStyle;
      map['brand.writing_style'] = tokens.voice.writingStyle;
    }
  }

  // Flatten asset tokens
  if (tokens.assets) {
    if (tokens.assets.logoUrl) {
      map['logo_url'] = tokens.assets.logoUrl;
      map['brand.logo_url'] = tokens.assets.logoUrl;
    }
    if (tokens.assets.iconSetUrl) {
      map['icon_set_url'] = tokens.assets.iconSetUrl;
      map['brand.icon_set_url'] = tokens.assets.iconSetUrl;
    }
    if (tokens.assets.watermarkUrl) {
      map['watermark_url'] = tokens.assets.watermarkUrl;
      map['brand.watermark_url'] = tokens.assets.watermarkUrl;
    }
  }

  // Add custom tokens
  if (tokens.customTokens) {
    for (const token of tokens.customTokens) {
      map[token.key] = token.value;
      map[`brand.${token.key}`] = token.value;
    }
  }

  return map;
}

/**
 * Get default values from variable definitions
 */
function getDefaultValues(
  variables: PromptVariable[]
): Record<string, string | number | boolean> {
  const defaults: Record<string, string | number | boolean> = {};

  for (const variable of variables) {
    if (variable.defaultValue !== undefined) {
      defaults[variable.name] = variable.defaultValue;
    }
  }

  return defaults;
}

/**
 * Extract variables from prompt text
 */
export function extractVariables(text: string): string[] {
  const matches = text.matchAll(VARIABLE_PATTERN);
  const variables = new Set<string>();

  for (const match of matches) {
    const path = match[1];
    // Don't include brand.* variables as they come from brand profile
    if (!path.startsWith('brand.')) {
      variables.add(path);
    }
  }

  return Array.from(variables);
}

/**
 * Validate variables against content (simple version for editor)
 */
export function validateVariables(
  content: string,
  variables: PromptVariable[]
): string[];

/**
 * Validate that all required variables have values (full version)
 */
export function validateVariables(
  version: PromptVersion,
  values: Record<string, string | number | boolean>,
  brand: BrandProfile
): { isValid: boolean; missing: string[] };

export function validateVariables(
  contentOrVersion: string | PromptVersion,
  variablesOrValues: PromptVariable[] | Record<string, string | number | boolean>,
  brand?: BrandProfile
): string[] | { isValid: boolean; missing: string[] } {
  // Simple string overload - returns array of error strings
  if (typeof contentOrVersion === 'string') {
    const content = contentOrVersion;
    const variables = variablesOrValues as PromptVariable[];
    const errors: string[] = [];

    // Extract used variables from content
    const usedVariables = extractVariables(content);
    const definedNames = new Set(variables.map((v) => v.name));

    // Check for undefined variables
    for (const varName of usedVariables) {
      if (!definedNames.has(varName) && !varName.startsWith('brand.')) {
        errors.push(`Variable "${varName}" is used but not defined`);
      }
    }

    // Check for required variables without defaults
    for (const variable of variables) {
      if (variable.required && !variable.defaultValue) {
        if (!usedVariables.includes(variable.name)) {
          // Required variable defined but not used - just a warning, not an error
        }
      }
    }

    return errors;
  }

  // Full version with PromptVersion
  const version = contentOrVersion;
  const values = variablesOrValues as Record<string, string | number | boolean>;
  const missing: string[] = [];
  // Get custom token keys from brand
  const brandTokenKeys = brand?.tokens?.customTokens
    ? new Set(brand.tokens.customTokens.map((t) => t.key))
    : new Set<string>();

  for (const variable of version.variables) {
    if (!variable.required) continue;

    // Check if variable has a value
    const hasValue = variable.name in values && values[variable.name] !== '';

    // Check if it's a brand token that should come from brand
    const isBrandToken = variable.type === 'brand_token';
    const hasBrandValue =
      isBrandToken &&
      variable.brandTokenKey &&
      brandTokenKeys.has(variable.brandTokenKey);

    // Check if has default
    const hasDefault = variable.defaultValue !== undefined;

    if (!hasValue && !hasBrandValue && !hasDefault) {
      missing.push(variable.name);
    }
  }

  return { isValid: missing.length === 0, missing };
}

/**
 * Generate sample values for variables
 */
export function generateSampleValues(
  variables: PromptVariable[]
): Record<string, string | number | boolean> {
  const sampleValues: Record<string, string | number | boolean> = {};

  for (const variable of variables) {
    if (variable.defaultValue !== undefined) {
      sampleValues[variable.name] = variable.defaultValue;
    } else {
      switch (variable.type) {
        case 'string':
          sampleValues[variable.name] = `[${variable.name}]`;
          break;
        case 'number':
          sampleValues[variable.name] = 42;
          break;
        case 'boolean':
          sampleValues[variable.name] = true;
          break;
        case 'enum':
          sampleValues[variable.name] = variable.enumValues?.[0] || 'option1';
          break;
        case 'brand_token':
          // Will be filled from brand
          break;
      }
    }
  }

  return sampleValues;
}

/**
 * Preview a prompt with sample data
 */
export function previewPrompt(
  version: PromptVersion,
  brand?: BrandProfile
): RenderedPrompt {
  const sampleValues = generateSampleValues(version.variables);
  return renderPrompt(version, sampleValues, brand!);
}

/**
 * Compare two versions for changes
 */
export function compareVersions(
  oldVersion: PromptVersion,
  newVersion: PromptVersion
): {
  systemPromptChanged: boolean;
  userPromptChanged: boolean;
  variablesChanged: boolean;
  modelConfigChanged: boolean;
} {
  return {
    systemPromptChanged: oldVersion.systemPrompt !== newVersion.systemPrompt,
    userPromptChanged: oldVersion.userPrompt !== newVersion.userPrompt,
    variablesChanged:
      JSON.stringify(oldVersion.variables) !== JSON.stringify(newVersion.variables),
    modelConfigChanged:
      JSON.stringify(oldVersion.modelConfig) !== JSON.stringify(newVersion.modelConfig),
  };
}

/**
 * Get template categories from all templates
 */
export function getCategories(): string[] {
  const store = useTemplateStore.getState();
  const categories = new Set<string>();

  for (const template of store.templates.values()) {
    if (template.category) {
      categories.add(template.category);
    }
  }

  return Array.from(categories).sort();
}

/**
 * Get all tags from templates
 */
export function getAllTags(): string[] {
  const store = useTemplateStore.getState();
  const tags = new Set<string>();

  for (const template of store.templates.values()) {
    for (const tag of template.tags) {
      tags.add(tag);
    }
  }

  return Array.from(tags).sort();
}

/**
 * Get all available token names for autocomplete (brand + talent)
 */
export function getAllAvailableTokens(): { brand: string[]; talent: string[] } {
  // Brand tokens (existing)
  const brandTokens = [
    'primary_color',
    'secondary_color',
    'accent_color',
    'neutral_dark',
    'neutral_light',
    'palette_description',
    'primary_font',
    'secondary_font',
    'typography_style',
    'aesthetic',
    'photography_style',
    'mood',
    'art_direction',
    'tone',
    'forbidden_terms',
    'forbidden_elements',
    'writing_style',
    'logo_url',
    'icon_set_url',
    'watermark_url',
  ];

  // Talent tokens from utility
  const talentTokens = getAvailableTalentTokenNames();

  return {
    brand: brandTokens,
    talent: talentTokens,
  };
}
