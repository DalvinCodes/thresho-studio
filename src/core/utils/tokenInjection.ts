/**
 * Brand token injection utilities
 * Handles replacing token placeholders in prompts with brand values
 */

import type {
  BrandProfile,
  BrandTokenSchema,
  FlattenedBrandTokens,
  TokenInjectionResult,
} from '../types/brand';

// Token placeholder pattern: {{TOKEN_NAME}} or {{ TOKEN_NAME }}
const TOKEN_PATTERN = /\{\{\s*([A-Z_][A-Z0-9_]*)\s*\}\}/g;

/**
 * Flatten brand tokens into a simple key-value map
 */
export function flattenBrandTokens(tokens: BrandTokenSchema): FlattenedBrandTokens {
  const flattened: FlattenedBrandTokens = {};

  // Colors
  if (tokens.colors) {
    flattened['PRIMARY_COLOR'] = tokens.colors.primary;
    flattened['SECONDARY_COLOR'] = tokens.colors.secondary;
    if (tokens.colors.accent) flattened['ACCENT_COLOR'] = tokens.colors.accent;
    flattened['NEUTRAL_DARK'] = tokens.colors.neutralDark;
    flattened['NEUTRAL_LIGHT'] = tokens.colors.neutralLight;
    flattened['COLOR_PALETTE'] = tokens.colors.paletteDescription;
  }

  // Typography
  if (tokens.typography) {
    flattened['PRIMARY_FONT'] = tokens.typography.primaryFont;
    if (tokens.typography.secondaryFont) {
      flattened['SECONDARY_FONT'] = tokens.typography.secondaryFont;
    }
    flattened['TYPOGRAPHY_STYLE'] = tokens.typography.styleDescriptor;
  }

  // Visual style
  if (tokens.visualStyle) {
    flattened['AESTHETIC'] = tokens.visualStyle.aesthetic;
    flattened['PHOTOGRAPHY_STYLE'] = tokens.visualStyle.photographyStyle;
    flattened['MOOD'] = tokens.visualStyle.mood;
    if (tokens.visualStyle.artDirection) {
      flattened['ART_DIRECTION'] = tokens.visualStyle.artDirection;
    }
  }

  // Voice
  if (tokens.voice) {
    flattened['TONE'] = tokens.voice.tone.join(', ');
    flattened['FORBIDDEN_TERMS'] = tokens.voice.forbiddenTerms.join(', ');
    flattened['FORBIDDEN_ELEMENTS'] = tokens.voice.forbiddenElements.join(', ');
    if (tokens.voice.writingStyle) {
      flattened['WRITING_STYLE'] = tokens.voice.writingStyle;
    }
  }

  // Assets
  if (tokens.assets) {
    if (tokens.assets.logoUrl) flattened['LOGO_URL'] = tokens.assets.logoUrl;
    if (tokens.assets.iconSetUrl) flattened['ICON_SET_URL'] = tokens.assets.iconSetUrl;
    if (tokens.assets.watermarkUrl) flattened['WATERMARK_URL'] = tokens.assets.watermarkUrl;
  }

  // Custom tokens
  if (tokens.customTokens) {
    for (const token of tokens.customTokens) {
      flattened[token.key] = token.value;
    }
  }

  return flattened;
}

/**
 * Find all token placeholders in a string
 */
export function findTokenPlaceholders(content: string): string[] {
  const matches = content.matchAll(TOKEN_PATTERN);
  const tokens = new Set<string>();

  for (const match of matches) {
    tokens.add(match[1]);
  }

  return Array.from(tokens);
}

/**
 * Inject brand tokens into content
 */
export function injectBrandTokens(
  content: string,
  brandProfile: BrandProfile
): TokenInjectionResult {
  const flatTokens = flattenBrandTokens(brandProfile.tokens);
  const tokensInjected: TokenInjectionResult['tokensInjected'] = [];
  const unresolvedTokens: string[] = [];

  // Track which tokens were found
  const foundTokens = findTokenPlaceholders(content);

  // Check for unresolved tokens
  for (const tokenName of foundTokens) {
    if (!(tokenName in flatTokens)) {
      unresolvedTokens.push(tokenName);
    }
  }

  // Replace tokens
  let injectedContent = content;
  let offset = 0;

  const matches = [...content.matchAll(TOKEN_PATTERN)];

  for (const match of matches) {
    const tokenName = match[1];
    const value = flatTokens[tokenName];

    if (value !== undefined) {
      const originalPosition = match.index!;
      const adjustedPosition = originalPosition + offset;

      injectedContent =
        injectedContent.slice(0, adjustedPosition) +
        value +
        injectedContent.slice(adjustedPosition + match[0].length);

      tokensInjected.push({
        key: tokenName,
        value,
        position: originalPosition,
      });

      // Adjust offset for length difference
      offset += value.length - match[0].length;
    }
  }

  return {
    originalContent: content,
    injectedContent,
    tokensInjected,
    unresolvedTokens,
  };
}

/**
 * Validate that all required tokens are present in content
 */
export function validateTokens(
  content: string,
  requiredTokens: string[]
): { valid: boolean; missing: string[] } {
  const foundTokens = new Set(findTokenPlaceholders(content));
  const missing = requiredTokens.filter((t) => !foundTokens.has(t));

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get a preview of content with tokens highlighted (for editor UI)
 */
export function highlightTokens(content: string): string {
  return content.replace(TOKEN_PATTERN, '<mark>{{$1}}</mark>');
}

/**
 * Get list of all available token names for autocomplete
 */
export function getAvailableTokenNames(): string[] {
  return [
    // Colors
    'PRIMARY_COLOR',
    'SECONDARY_COLOR',
    'ACCENT_COLOR',
    'NEUTRAL_DARK',
    'NEUTRAL_LIGHT',
    'COLOR_PALETTE',
    // Typography
    'PRIMARY_FONT',
    'SECONDARY_FONT',
    'TYPOGRAPHY_STYLE',
    // Visual
    'AESTHETIC',
    'PHOTOGRAPHY_STYLE',
    'MOOD',
    'ART_DIRECTION',
    // Voice
    'TONE',
    'FORBIDDEN_TERMS',
    'FORBIDDEN_ELEMENTS',
    'WRITING_STYLE',
    // Assets
    'LOGO_URL',
    'ICON_SET_URL',
    'WATERMARK_URL',
  ];
}
