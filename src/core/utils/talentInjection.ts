/**
 * Talent Injection Utilities
 * Build prompt fragments from talent profiles for generation
 */

import type { TalentProfile, TalentAppearance } from '../types/talent';

/**
 * Build a human-readable appearance description from talent appearance attributes
 */
function buildAppearanceDescription(appearance: TalentAppearance): string {
  const parts: string[] = [];

  // Age and gender
  if (appearance.age) {
    parts.push(appearance.age);
  }
  if (appearance.gender) {
    parts.push(appearance.gender);
  }

  // Ethnicity
  if (appearance.ethnicity) {
    parts.push(appearance.ethnicity);
  }

  // Body type and height
  if (appearance.bodyType) {
    parts.push(appearance.bodyType + ' build');
  }
  if (appearance.height) {
    parts.push(appearance.height);
  }

  // Hair
  if (appearance.hair) {
    const hairParts: string[] = [];
    if (appearance.hair.color) hairParts.push(appearance.hair.color);
    if (appearance.hair.length) hairParts.push(appearance.hair.length);
    if (appearance.hair.style) hairParts.push(appearance.hair.style);
    if (hairParts.length > 0) {
      parts.push(hairParts.join(' ') + ' hair');
    }
  }

  // Eyes
  if (appearance.eyes) {
    const eyeParts: string[] = [];
    if (appearance.eyes.color) eyeParts.push(appearance.eyes.color);
    if (appearance.eyes.shape) eyeParts.push(appearance.eyes.shape);
    if (eyeParts.length > 0) {
      parts.push(eyeParts.join(' ') + ' eyes');
    }
  }

  // Skin
  if (appearance.skin) {
    if (appearance.skin.tone) {
      parts.push(appearance.skin.tone + ' skin');
    }
  }

  // Distinguishing features
  if (appearance.distinguishingFeatures && appearance.distinguishingFeatures.length > 0) {
    parts.push(appearance.distinguishingFeatures.join(', '));
  }

  // Clothing and accessories
  if (appearance.clothing) {
    parts.push('wearing ' + appearance.clothing);
  }
  if (appearance.accessories && appearance.accessories.length > 0) {
    parts.push('with ' + appearance.accessories.join(', '));
  }

  return parts.join(', ');
}

/**
 * Build a personality/mood description from talent personality attributes
 */
function buildPersonalityDescription(personality: TalentProfile['personality']): string {
  if (!personality) return '';

  const parts: string[] = [];

  if (personality.mood) {
    parts.push(personality.mood + ' mood');
  }
  if (personality.expression) {
    parts.push(personality.expression + ' expression');
  }
  if (personality.posture) {
    parts.push(personality.posture + ' posture');
  }
  if (personality.traits && personality.traits.length > 0) {
    parts.push(personality.traits.join(', '));
  }

  return parts.join(', ');
}

/**
 * Build a complete prompt fragment describing a single talent
 */
function buildSingleTalentDescription(talent: TalentProfile, provider?: string): string {
  // Check for provider-specific prompt fragment first
  if (provider && talent.promptFragments) {
    const providerKey = provider.toLowerCase().replace('-', '') as keyof typeof talent.promptFragments;
    if (talent.promptFragments[providerKey]) {
      return talent.promptFragments[providerKey]!;
    }
  }

  // Use default prompt fragment if available
  if (talent.promptFragments?.default) {
    return talent.promptFragments.default;
  }

  // Build description from attributes
  const parts: string[] = [];

  // Name and type
  parts.push(`${talent.name}`);
  if (talent.type !== 'person' && talent.type !== 'character') {
    parts.push(`(${talent.type})`);
  }

  // Main description
  if (talent.description) {
    parts.push(talent.description);
  }

  // Appearance
  const appearanceDesc = buildAppearanceDescription(talent.appearance);
  if (appearanceDesc) {
    parts.push(appearanceDesc);
  }

  // Personality (for characters/persons)
  if (talent.personality && (talent.type === 'character' || talent.type === 'person')) {
    const personalityDesc = buildPersonalityDescription(talent.personality);
    if (personalityDesc) {
      parts.push(personalityDesc);
    }
  }

  return parts.join('. ');
}

/**
 * Build a prompt fragment describing multiple talents
 */
export function buildTalentDescription(talents: TalentProfile[], provider?: string): string {
  if (!talents || talents.length === 0) {
    return '';
  }

  if (talents.length === 1) {
    return buildSingleTalentDescription(talents[0], provider);
  }

  // Multiple talents - structure as a list
  const descriptions = talents.map((talent, index) => {
    const desc = buildSingleTalentDescription(talent, provider);
    return `[Talent ${index + 1}: ${talent.name}] ${desc}`;
  });

  return descriptions.join('\n\n');
}

// Token pattern for talent placeholder: {{TALENTS}}
const TALENT_TOKEN_PATTERN = /\{\{\s*TALENTS\s*\}\}/gi;

/**
 * Inject talent descriptions into a prompt
 * Replaces {{TALENTS}} token or appends to prompt if token not found
 */
export function injectTalents(
  prompt: string,
  talents: TalentProfile[],
  provider?: string
): string {
  if (!talents || talents.length === 0) {
    // Remove the TALENTS placeholder if no talents
    return prompt.replace(TALENT_TOKEN_PATTERN, '').trim();
  }

  const talentDescription = buildTalentDescription(talents, provider);

  // Check if prompt contains the TALENTS placeholder
  if (TALENT_TOKEN_PATTERN.test(prompt)) {
    // Replace the placeholder
    return prompt.replace(TALENT_TOKEN_PATTERN, talentDescription);
  }

  // No placeholder found - append talent description
  // Add a separator line if there's content
  if (prompt.trim()) {
    return `${prompt.trim()}\n\n--- Talent/Character Description ---\n${talentDescription}`;
  }

  return talentDescription;
}

/**
 * Get talent tokens for template variable substitution
 * Returns map like { TALENT_1_NAME: "John", TALENT_1_APPEARANCE: "tall man with..." }
 */
export function buildTalentTokenMap(talents: TalentProfile[]): Record<string, string> {
  const tokenMap: Record<string, string> = {};

  if (!talents || talents.length === 0) {
    return tokenMap;
  }

  // Add combined talent description
  tokenMap['TALENTS'] = buildTalentDescription(talents);
  tokenMap['TALENT_COUNT'] = String(talents.length);

  // Add individual talent tokens
  talents.forEach((talent, index) => {
    const prefix = `TALENT_${index + 1}`;

    // Basic info
    tokenMap[`${prefix}_NAME`] = talent.name;
    tokenMap[`${prefix}_TYPE`] = talent.type;
    tokenMap[`${prefix}_DESCRIPTION`] = talent.description;

    // Full composed description
    tokenMap[`${prefix}_FULL`] = buildSingleTalentDescription(talent);

    // Appearance tokens
    const appearance = talent.appearance;
    if (appearance) {
      tokenMap[`${prefix}_APPEARANCE`] = buildAppearanceDescription(appearance);
      if (appearance.age) tokenMap[`${prefix}_AGE`] = appearance.age;
      if (appearance.gender) tokenMap[`${prefix}_GENDER`] = appearance.gender;
      if (appearance.ethnicity) tokenMap[`${prefix}_ETHNICITY`] = appearance.ethnicity;
      if (appearance.bodyType) tokenMap[`${prefix}_BODY_TYPE`] = appearance.bodyType;
      if (appearance.height) tokenMap[`${prefix}_HEIGHT`] = appearance.height;
      if (appearance.hair?.color) tokenMap[`${prefix}_HAIR_COLOR`] = appearance.hair.color;
      if (appearance.hair?.style) tokenMap[`${prefix}_HAIR_STYLE`] = appearance.hair.style;
      if (appearance.hair?.length) tokenMap[`${prefix}_HAIR_LENGTH`] = appearance.hair.length;
      if (appearance.eyes?.color) tokenMap[`${prefix}_EYE_COLOR`] = appearance.eyes.color;
      if (appearance.eyes?.shape) tokenMap[`${prefix}_EYE_SHAPE`] = appearance.eyes.shape;
      if (appearance.skin?.tone) tokenMap[`${prefix}_SKIN_TONE`] = appearance.skin.tone;
      if (appearance.clothing) tokenMap[`${prefix}_CLOTHING`] = appearance.clothing;
      if (appearance.distinguishingFeatures?.length) {
        tokenMap[`${prefix}_FEATURES`] = appearance.distinguishingFeatures.join(', ');
      }
      if (appearance.accessories?.length) {
        tokenMap[`${prefix}_ACCESSORIES`] = appearance.accessories.join(', ');
      }
    }

    // Personality tokens
    const personality = talent.personality;
    if (personality) {
      tokenMap[`${prefix}_PERSONALITY`] = buildPersonalityDescription(personality);
      if (personality.mood) tokenMap[`${prefix}_MOOD`] = personality.mood;
      if (personality.expression) tokenMap[`${prefix}_EXPRESSION`] = personality.expression;
      if (personality.posture) tokenMap[`${prefix}_POSTURE`] = personality.posture;
      if (personality.traits?.length) {
        tokenMap[`${prefix}_TRAITS`] = personality.traits.join(', ');
      }
    }

    // Tags
    if (talent.tags.length > 0) {
      tokenMap[`${prefix}_TAGS`] = talent.tags.join(', ');
    }
  });

  // Also create simple aliases for single-talent cases
  if (talents.length === 1) {
    const talent = talents[0];
    tokenMap['TALENT_NAME'] = talent.name;
    tokenMap['TALENT_DESCRIPTION'] = talent.description;
    tokenMap['TALENT_APPEARANCE'] = buildAppearanceDescription(talent.appearance);
    tokenMap['TALENT_FULL'] = buildSingleTalentDescription(talent);

    if (talent.personality) {
      tokenMap['TALENT_PERSONALITY'] = buildPersonalityDescription(talent.personality);
    }
  }

  return tokenMap;
}

/**
 * Get list of available talent token names for autocomplete
 */
export function getAvailableTalentTokenNames(): string[] {
  return [
    // Combined
    'TALENTS',
    'TALENT_COUNT',

    // Single talent shortcuts
    'TALENT_NAME',
    'TALENT_DESCRIPTION',
    'TALENT_APPEARANCE',
    'TALENT_PERSONALITY',
    'TALENT_FULL',

    // Per-talent tokens (N = talent number)
    'TALENT_N_NAME',
    'TALENT_N_TYPE',
    'TALENT_N_DESCRIPTION',
    'TALENT_N_FULL',
    'TALENT_N_APPEARANCE',
    'TALENT_N_AGE',
    'TALENT_N_GENDER',
    'TALENT_N_ETHNICITY',
    'TALENT_N_BODY_TYPE',
    'TALENT_N_HEIGHT',
    'TALENT_N_HAIR_COLOR',
    'TALENT_N_HAIR_STYLE',
    'TALENT_N_HAIR_LENGTH',
    'TALENT_N_EYE_COLOR',
    'TALENT_N_EYE_SHAPE',
    'TALENT_N_SKIN_TONE',
    'TALENT_N_CLOTHING',
    'TALENT_N_FEATURES',
    'TALENT_N_ACCESSORIES',
    'TALENT_N_PERSONALITY',
    'TALENT_N_MOOD',
    'TALENT_N_EXPRESSION',
    'TALENT_N_POSTURE',
    'TALENT_N_TRAITS',
    'TALENT_N_TAGS',
  ];
}

/**
 * Match talent names to shot subjects
 * Returns talents that match any of the shot's subjects by name
 */
export function matchTalentsToSubjects(
  talents: TalentProfile[],
  subjects: string[]
): TalentProfile[] {
  if (!talents || talents.length === 0 || !subjects || subjects.length === 0) {
    return [];
  }

  const normalizedSubjects = subjects.map((s) => s.toLowerCase().trim());

  return talents.filter((talent) => {
    const talentName = talent.name.toLowerCase().trim();
    return normalizedSubjects.some(
      (subject) =>
        subject.includes(talentName) ||
        talentName.includes(subject) ||
        // Also check if talent name words match subject
        talentName.split(/\s+/).some((word) => subject.includes(word))
    );
  });
}
