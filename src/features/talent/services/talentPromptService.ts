/**
 * Talent Prompt Service
 * Builds prompt descriptions from talent profiles
 */

import type { TalentProfile, TalentAppearance, TalentPersonality } from '../../../core/types/talent';

/**
 * Compose a description string from talent appearance attributes
 */
function composeAppearanceDescription(appearance: TalentAppearance): string {
  const parts: string[] = [];

  // Basic attributes
  if (appearance.age) parts.push(appearance.age);
  if (appearance.gender) parts.push(appearance.gender);
  if (appearance.ethnicity) parts.push(appearance.ethnicity);
  if (appearance.bodyType) parts.push(`${appearance.bodyType} build`);
  if (appearance.height) parts.push(appearance.height);

  // Hair
  if (appearance.hair) {
    const hairParts: string[] = [];
    if (appearance.hair.color) hairParts.push(appearance.hair.color);
    if (appearance.hair.length) hairParts.push(appearance.hair.length);
    if (appearance.hair.style) hairParts.push(appearance.hair.style);
    if (hairParts.length > 0) {
      parts.push(`${hairParts.join(' ')} hair`);
    }
  }

  // Eyes
  if (appearance.eyes) {
    const eyeParts: string[] = [];
    if (appearance.eyes.color) eyeParts.push(appearance.eyes.color);
    if (appearance.eyes.shape) eyeParts.push(appearance.eyes.shape);
    if (eyeParts.length > 0) {
      parts.push(`${eyeParts.join(' ')} eyes`);
    }
  }

  // Skin
  if (appearance.skin) {
    const skinParts: string[] = [];
    if (appearance.skin.tone) skinParts.push(appearance.skin.tone);
    if (appearance.skin.texture) skinParts.push(appearance.skin.texture);
    if (skinParts.length > 0) {
      parts.push(`${skinParts.join(' ')} skin`);
    }
  }

  // Distinguishing features
  if (appearance.distinguishingFeatures && appearance.distinguishingFeatures.length > 0) {
    parts.push(appearance.distinguishingFeatures.join(', '));
  }

  // Clothing
  if (appearance.clothing) {
    parts.push(`wearing ${appearance.clothing}`);
  }

  // Accessories
  if (appearance.accessories && appearance.accessories.length > 0) {
    parts.push(`with ${appearance.accessories.join(', ')}`);
  }

  return parts.join(', ');
}

/**
 * Compose a description string from talent personality attributes
 */
function composePersonalityDescription(personality: TalentPersonality): string {
  const parts: string[] = [];

  if (personality.traits && personality.traits.length > 0) {
    parts.push(personality.traits.join(', '));
  }

  if (personality.mood) {
    parts.push(`${personality.mood} mood`);
  }

  if (personality.expression) {
    parts.push(`${personality.expression} expression`);
  }

  if (personality.posture) {
    parts.push(`${personality.posture} posture`);
  }

  return parts.join(', ');
}

/**
 * Get type-specific prefix for talent
 */
function getTalentTypePrefix(type: TalentProfile['type']): string {
  switch (type) {
    case 'character':
      return 'A character:';
    case 'person':
      return 'A person:';
    case 'creature':
      return 'A creature:';
    case 'object':
      return 'An object:';
    case 'environment':
      return 'An environment:';
    case 'style':
      return 'In the style of:';
    default:
      return '';
  }
}

/**
 * Compose a prompt fragment from a talent profile
 * 
 * @param talent The talent profile
 * @param provider Optional provider for provider-specific prompts
 * @returns A description string suitable for inclusion in prompts
 */
export function composeTalentPrompt(talent: TalentProfile, provider?: string): string {
  // Check for provider-specific fragment first
  if (provider) {
    const providerKey = provider.toLowerCase();
    const fragments = talent.promptFragments;
    
    if (providerKey === 'midjourney' && fragments.midjourney) {
      return fragments.midjourney;
    }
    if (providerKey === 'dalle' && fragments.dalle) {
      return fragments.dalle;
    }
    if (providerKey === 'flux' && fragments.flux) {
      return fragments.flux;
    }
    if (providerKey === 'runway' && fragments.runway) {
      return fragments.runway;
    }
  }

  // Use custom default fragment if provided
  if (talent.promptFragments.default) {
    return talent.promptFragments.default;
  }

  // Otherwise, compose from attributes
  const parts: string[] = [];

  // Add type prefix
  const prefix = getTalentTypePrefix(talent.type);
  if (prefix) {
    parts.push(prefix);
  }

  // Add name
  parts.push(talent.name);

  // Add description if provided
  if (talent.description) {
    parts.push(`- ${talent.description}`);
  }

  // Add appearance description
  const appearanceDesc = composeAppearanceDescription(talent.appearance);
  if (appearanceDesc) {
    parts.push(appearanceDesc);
  }

  // Add personality description for characters/persons
  if (talent.personality && (talent.type === 'character' || talent.type === 'person')) {
    const personalityDesc = composePersonalityDescription(talent.personality);
    if (personalityDesc) {
      parts.push(personalityDesc);
    }
  }

  return parts.join(' ');
}

/**
 * Compose prompts for multiple talents
 * 
 * @param talents Array of talent profiles
 * @param provider Optional provider for provider-specific prompts
 * @returns Combined description string
 */
export function composeTalentsPrompt(talents: TalentProfile[], provider?: string): string {
  if (talents.length === 0) return '';
  
  if (talents.length === 1) {
    return composeTalentPrompt(talents[0], provider);
  }

  // Multiple talents - join with line breaks
  return talents
    .map(talent => composeTalentPrompt(talent, provider))
    .join('\n\n');
}

/**
 * Generate a brief summary of a talent (for UI display)
 */
export function getTalentSummary(talent: TalentProfile): string {
  const parts: string[] = [];

  // Type
  parts.push(talent.type);

  // Key appearance features
  if (talent.appearance.age) parts.push(talent.appearance.age);
  if (talent.appearance.gender) parts.push(talent.appearance.gender);
  if (talent.appearance.hair?.color) parts.push(`${talent.appearance.hair.color} hair`);

  return parts.slice(0, 4).join(', ');
}
