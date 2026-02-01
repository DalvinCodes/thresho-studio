/**
 * Headshot Generation Service
 * Builds prompts for headshot and character sheet generation
 */

import type { TalentProfile, TalentAppearance, CharacterSheetAngle } from '../../../core/types/talent';

/**
 * Result from building a headshot prompt
 */
export interface HeadshotPromptResult {
  prompt: string;
  usedAttributes: Partial<TalentAppearance>;
  hasUserAttributes: boolean;
}

/**
 * Character sheet prompt for a specific angle
 */
export interface CharacterSheetPrompt {
  angle: CharacterSheetAngle;
  label: string;
  prompt: string;
}

/**
 * Configuration for each character sheet angle
 */
export const CHARACTER_SHEET_ANGLES: Record<CharacterSheetAngle, { label: string; promptSuffix: string }> = {
  'front': {
    label: 'Front',
    promptSuffix: 'standing front view, T-pose or neutral stance, full body visible, looking at camera',
  },
  'back': {
    label: 'Back',
    promptSuffix: 'standing back view, full figure from behind, full body visible',
  },
  'left-profile': {
    label: 'Left Profile',
    promptSuffix: 'left side profile view, standing, full body visible',
  },
  'right-profile': {
    label: 'Right Profile',
    promptSuffix: 'right side profile view, standing, full body visible',
  },
  'three-quarter': {
    label: '3/4 View',
    promptSuffix: 'three-quarter view, slight angle, relaxed natural stance, full body visible',
  },
};

/**
 * Random attribute options for generating variety
 */
const RANDOM_OPTIONS = {
  genders: ['male', 'female', 'non-binary'],
  ages: ['early 20s', 'mid 20s', 'late 20s', 'early 30s', 'mid 30s', 'late 30s', 'early 40s', 'mid 40s', 'late 40s', 'early 50s'],
  hairColors: ['black', 'brown', 'dark brown', 'light brown', 'blonde', 'dirty blonde', 'auburn', 'red', 'gray', 'white', 'silver'],
  hairLengths: ['short', 'medium', 'long', 'shoulder-length', 'cropped', 'buzzed'],
  hairStyles: ['straight', 'wavy', 'curly', 'coily', 'slicked back', 'messy', 'neat', 'layered'],
  eyeColors: ['brown', 'dark brown', 'hazel', 'green', 'blue', 'gray', 'amber'],
  skinTones: ['fair', 'light', 'medium', 'olive', 'tan', 'brown', 'dark brown', 'deep'],
};

/**
 * Get a random item from an array
 */
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Check if any appearance attributes are set
 */
export function hasAppearanceAttributes(appearance: TalentAppearance | undefined): boolean {
  if (!appearance) return false;

  // Check top-level string attributes
  if (appearance.gender) return true;
  if (appearance.age) return true;
  if (appearance.ethnicity) return true;
  if (appearance.bodyType) return true;
  if (appearance.height) return true;
  if (appearance.clothing) return true;

  // Check hair attributes
  if (appearance.hair) {
    if (appearance.hair.color || appearance.hair.style || appearance.hair.length) return true;
  }

  // Check eye attributes
  if (appearance.eyes) {
    if (appearance.eyes.color || appearance.eyes.shape) return true;
  }

  // Check skin attributes
  if (appearance.skin) {
    if (appearance.skin.tone || appearance.skin.texture) return true;
  }

  // Check distinguishing features
  if (appearance.distinguishingFeatures && appearance.distinguishingFeatures.length > 0) return true;

  // Check accessories
  if (appearance.accessories && appearance.accessories.length > 0) return true;

  return false;
}

/**
 * Build a description string from appearance attributes
 */
function buildAppearanceDescription(appearance: TalentAppearance): { description: string; usedAttributes: Partial<TalentAppearance> } {
  const parts: string[] = [];
  const usedAttributes: Partial<TalentAppearance> = {};

  // Gender
  if (appearance.gender) {
    parts.push(appearance.gender);
    usedAttributes.gender = appearance.gender;
  }

  // Age
  if (appearance.age) {
    parts.push(appearance.age);
    usedAttributes.age = appearance.age;
  }

  // Ethnicity
  if (appearance.ethnicity) {
    parts.push(appearance.ethnicity);
    usedAttributes.ethnicity = appearance.ethnicity;
  }

  // Body type
  if (appearance.bodyType) {
    parts.push(`${appearance.bodyType} build`);
    usedAttributes.bodyType = appearance.bodyType;
  }

  // Hair
  if (appearance.hair) {
    const hairParts: string[] = [];
    const usedHair: TalentAppearance['hair'] = {};

    if (appearance.hair.color) {
      hairParts.push(appearance.hair.color);
      usedHair.color = appearance.hair.color;
    }
    if (appearance.hair.length) {
      hairParts.push(appearance.hair.length);
      usedHair.length = appearance.hair.length;
    }
    if (appearance.hair.style) {
      hairParts.push(appearance.hair.style);
      usedHair.style = appearance.hair.style;
    }

    if (hairParts.length > 0) {
      parts.push(`${hairParts.join(' ')} hair`);
      usedAttributes.hair = usedHair;
    }
  }

  // Eyes
  if (appearance.eyes) {
    const eyeParts: string[] = [];
    const usedEyes: TalentAppearance['eyes'] = {};

    if (appearance.eyes.color) {
      eyeParts.push(appearance.eyes.color);
      usedEyes.color = appearance.eyes.color;
    }
    if (appearance.eyes.shape) {
      eyeParts.push(appearance.eyes.shape);
      usedEyes.shape = appearance.eyes.shape;
    }

    if (eyeParts.length > 0) {
      parts.push(`${eyeParts.join(' ')} eyes`);
      usedAttributes.eyes = usedEyes;
    }
  }

  // Skin
  if (appearance.skin) {
    const skinParts: string[] = [];
    const usedSkin: TalentAppearance['skin'] = {};

    if (appearance.skin.tone) {
      skinParts.push(appearance.skin.tone);
      usedSkin.tone = appearance.skin.tone;
    }
    if (appearance.skin.texture) {
      skinParts.push(appearance.skin.texture);
      usedSkin.texture = appearance.skin.texture;
    }

    if (skinParts.length > 0) {
      parts.push(`${skinParts.join(' ')} skin`);
      usedAttributes.skin = usedSkin;
    }
  }

  // Distinguishing features
  if (appearance.distinguishingFeatures && appearance.distinguishingFeatures.length > 0) {
    parts.push(appearance.distinguishingFeatures.join(', '));
    usedAttributes.distinguishingFeatures = [...appearance.distinguishingFeatures];
  }

  return { description: parts.join(', '), usedAttributes };
}

/**
 * Build a headshot prompt from talent appearance attributes
 */
export function buildHeadshotPrompt(talent: TalentProfile): HeadshotPromptResult {
  const basePrompt = 'Professional headshot portrait, neutral gray background, soft studio lighting, sharp focus, photorealistic, high quality';

  const hasAttributes = hasAppearanceAttributes(talent.appearance);

  if (!hasAttributes) {
    return {
      prompt: `${basePrompt}, natural looking person, pleasant expression`,
      usedAttributes: {},
      hasUserAttributes: false,
    };
  }

  const { description, usedAttributes } = buildAppearanceDescription(talent.appearance);

  const prompt = description
    ? `${basePrompt}, ${description}`
    : `${basePrompt}, natural looking person, pleasant expression`;

  return {
    prompt,
    usedAttributes,
    hasUserAttributes: Object.keys(usedAttributes).length > 0,
  };
}

/**
 * Build character sheet prompts for all angles
 */
export function buildCharacterSheetPrompts(talent: TalentProfile, headshotPrompt: string): CharacterSheetPrompt[] {
  // Convert headshot prompt to full body character sheet base
  let characterSheetBase = headshotPrompt.replace(
    /headshot portrait/i,
    'Character reference sheet, full body shot'
  );

  // Remove headshot-specific terms
  characterSheetBase = characterSheetBase.replace(/neutral gray background,?\s*/i, '');

  // Add clothing if specified and not already in the prompt
  if (talent.appearance.clothing && !characterSheetBase.toLowerCase().includes('wearing')) {
    characterSheetBase = `${characterSheetBase}, wearing ${talent.appearance.clothing}`;
  }

  // Add white/neutral background for character sheet
  characterSheetBase = `${characterSheetBase}, clean white background, reference sheet style`;

  // Generate prompts for each angle
  const angles: CharacterSheetAngle[] = ['front', 'back', 'left-profile', 'right-profile', 'three-quarter'];

  return angles.map(angle => {
    const angleConfig = CHARACTER_SHEET_ANGLES[angle];
    return {
      angle,
      label: angleConfig.label,
      prompt: `${characterSheetBase}, ${angleConfig.promptSuffix}`,
    };
  });
}

/**
 * Generate random appearance attributes for variety
 */
export function generateRandomAttributes(): TalentAppearance {
  return {
    gender: randomChoice(RANDOM_OPTIONS.genders),
    age: randomChoice(RANDOM_OPTIONS.ages),
    hair: {
      color: randomChoice(RANDOM_OPTIONS.hairColors),
      length: randomChoice(RANDOM_OPTIONS.hairLengths),
      style: randomChoice(RANDOM_OPTIONS.hairStyles),
    },
    eyes: {
      color: randomChoice(RANDOM_OPTIONS.eyeColors),
    },
    skin: {
      tone: randomChoice(RANDOM_OPTIONS.skinTones),
    },
  };
}

/**
 * Merge user-set attributes with random ones, user takes priority
 */
export function mergeWithRandomAttributes(userAttributes: TalentAppearance): TalentAppearance {
  const randomAttrs = generateRandomAttributes();

  return {
    // Top-level attributes: user overrides random
    gender: userAttributes.gender || randomAttrs.gender,
    age: userAttributes.age || randomAttrs.age,
    ethnicity: userAttributes.ethnicity, // No random ethnicity, only use if user specifies
    bodyType: userAttributes.bodyType,
    height: userAttributes.height,

    // Hair: merge individual properties
    hair: {
      color: userAttributes.hair?.color || randomAttrs.hair?.color,
      length: userAttributes.hair?.length || randomAttrs.hair?.length,
      style: userAttributes.hair?.style || randomAttrs.hair?.style,
    },

    // Eyes: merge individual properties
    eyes: {
      color: userAttributes.eyes?.color || randomAttrs.eyes?.color,
      shape: userAttributes.eyes?.shape,
    },

    // Skin: merge individual properties
    skin: {
      tone: userAttributes.skin?.tone || randomAttrs.skin?.tone,
      texture: userAttributes.skin?.texture,
    },

    // These are not randomized, only from user
    distinguishingFeatures: userAttributes.distinguishingFeatures,
    clothing: userAttributes.clothing,
    accessories: userAttributes.accessories,
  };
}
