/**
 * Shot Prompt Service
 * Composes AI generation prompts for shots, incorporating brand style,
 * talent details, and reference frames
 */

import type {
  Shot,
  ShotPromptContext,
  ComposedShotPrompt,
  ShotType,
  CameraMovement,
  LightingSetup,
  AspectRatio,
} from '../../../core/types/shotList';
import type { BrandProfile } from '../../../core/types/brand';
import type { TalentProfile } from '../../../core/types/talent';
import type { Asset } from '../../../core/types/asset';
import { buildTalentDescription, matchTalentsToSubjects } from '../../../core/utils/talentInjection';

/**
 * Context for shot generation prompt composition (simplified interface)
 */
export interface ShotGenerationContext {
  shot: Shot;
  brand?: BrandProfile;
  talent?: TalentProfile;
  referenceAssets?: Asset[];
}

/**
 * Result of composed shot prompt (simplified interface)
 */
export interface ShotPromptResult {
  prompt: string;
  negativePrompt: string;
  systemPrompt?: string;
  metadata: {
    shotType: ShotType;
    cameraMovement: CameraMovement;
    lighting: LightingSetup;
    hasBrand: boolean;
    hasTalent: boolean;
    referenceAssetCount: number;
  };
}

// Shot type descriptions for prompt composition
const SHOT_TYPE_DESCRIPTIONS: Record<ShotType, string> = {
  wide: 'wide establishing shot showing the full scene and environment',
  medium: 'medium shot framing the subject from waist up',
  'close-up': 'close-up shot focusing on facial details and expressions',
  'extreme-close': 'extreme close-up highlighting specific details',
  'over-shoulder': 'over-the-shoulder shot creating depth and perspective',
  pov: 'point-of-view shot from the character\'s perspective',
  aerial: 'aerial drone shot capturing a bird\'s eye view',
  'low-angle': 'low-angle shot looking up at the subject',
  'high-angle': 'high-angle shot looking down at the subject',
  'dutch-angle': 'Dutch angle tilted shot creating visual tension',
  tracking: 'tracking shot following the subject\'s movement',
  pan: 'panning shot sweeping horizontally across the scene',
  tilt: 'tilting shot moving vertically through the scene',
  zoom: 'zoom shot transitioning focal length',
  static: 'static locked-off shot with stable framing',
  handheld: 'handheld shot with natural organic movement',
  steadicam: 'smooth Steadicam shot with fluid motion',
  crane: 'crane shot with sweeping vertical movement',
  dolly: 'dolly shot with smooth lateral movement',
  custom: 'custom shot type',
};

// Camera movement descriptions
const MOVEMENT_DESCRIPTIONS: Record<CameraMovement, string> = {
  static: 'static camera, locked off',
  'pan-left': 'camera panning left',
  'pan-right': 'camera panning right',
  'tilt-up': 'camera tilting upward',
  'tilt-down': 'camera tilting downward',
  'dolly-in': 'camera dollying in toward subject',
  'dolly-out': 'camera dollying out from subject',
  'truck-left': 'camera trucking left',
  'truck-right': 'camera trucking right',
  'crane-up': 'camera craning upward',
  'crane-down': 'camera craning downward',
  'zoom-in': 'zooming in on subject',
  'zoom-out': 'zooming out from subject',
  follow: 'camera following subject movement',
  orbit: 'camera orbiting around subject',
  'push-in': 'subtle push in toward subject',
  'pull-out': 'subtle pull out from subject',
  'whip-pan': 'fast whip pan',
  'rack-focus': 'rack focus between subjects',
  custom: 'custom camera movement',
};

// Lighting descriptions
const LIGHTING_DESCRIPTIONS: Record<LightingSetup, string> = {
  natural: 'natural ambient lighting',
  'golden-hour': 'warm golden hour sunlight',
  'blue-hour': 'cool blue hour twilight',
  overcast: 'soft overcast diffused lighting',
  'studio-three-point': 'classic three-point studio lighting',
  'studio-rembrandt': 'dramatic Rembrandt lighting with triangle shadow',
  'studio-split': 'high-contrast split lighting',
  'studio-butterfly': 'glamorous butterfly lighting from above',
  'studio-loop': 'flattering loop lighting',
  'high-key': 'bright high-key lighting with minimal shadows',
  'low-key': 'moody low-key lighting with deep shadows',
  silhouette: 'backlit silhouette',
  backlit: 'rim-lit backlighting',
  'side-lit': 'dramatic side lighting',
  neon: 'colorful neon lighting',
  practical: 'practical on-set lighting',
  mixed: 'mixed lighting sources',
  custom: 'custom lighting setup',
};

// Aspect ratio for prompts
const ASPECT_RATIO_HINTS: Record<AspectRatio, string> = {
  '16:9': 'widescreen 16:9 aspect ratio',
  '9:16': 'vertical 9:16 aspect ratio',
  '4:3': 'classic 4:3 aspect ratio',
  '1:1': 'square 1:1 aspect ratio',
  '21:9': 'ultra-wide cinematic 21:9 aspect ratio',
  '2.39:1': 'anamorphic 2.39:1 aspect ratio',
  '4:5': 'portrait 4:5 aspect ratio',
  custom: 'custom aspect ratio',
};

/**
 * Format shot type for display in prompts
 */
export function formatShotType(shotType: ShotType): string {
  return SHOT_TYPE_DESCRIPTIONS[shotType] || shotType;
}

/**
 * Format camera movement for display in prompts
 */
export function formatCameraMovement(movement: CameraMovement): string {
  return MOVEMENT_DESCRIPTIONS[movement] || movement;
}

/**
 * Format lighting setup for display in prompts
 */
export function formatLighting(lighting: LightingSetup): string {
  return LIGHTING_DESCRIPTIONS[lighting] || lighting;
}

/**
 * Compose a professional prompt from shot metadata using the legacy ShotPromptContext interface
 * This is the primary implementation used by the shot list feature
 */
export function composeShotPrompt(context: ShotPromptContext): ComposedShotPrompt;
/**
 * Compose a professional prompt from shot metadata using the simplified ShotGenerationContext interface
 * This provides a simpler API for direct shot generation
 */
export function composeShotPrompt(context: ShotGenerationContext): ShotPromptResult;
/**
 * Implementation that handles both context types
 */
export function composeShotPrompt(
  context: ShotPromptContext | ShotGenerationContext
): ComposedShotPrompt | ShotPromptResult {
  // Check which context type we're dealing with
  const isLegacyContext = 'shotList' in context;

  if (isLegacyContext) {
    return composeShotPromptLegacy(context as ShotPromptContext);
  } else {
    return composeShotPromptSimple(context as ShotGenerationContext);
  }
}

/**
 * Legacy implementation using ShotPromptContext
 */
function composeShotPromptLegacy(context: ShotPromptContext): ComposedShotPrompt {
  const { shot, shotList, brand, equipmentPreset, talents } = context;

  // Build the main prompt components
  const components: string[] = [];

  // 1. Shot type and framing
  components.push(SHOT_TYPE_DESCRIPTIONS[shot.shotType]);

  // 2. Main description
  if (shot.description) {
    components.push(shot.description);
  }

  // 3. Subjects - with talent matching
  if (shot.subjects && shot.subjects.length > 0) {
    // Try to match talents to subjects
    const matchedTalents = talents 
      ? matchTalentsToSubjects(talents, shot.subjects)
      : [];

    if (matchedTalents.length > 0) {
      // Use detailed talent descriptions for matched subjects
      const talentDescriptions = matchedTalents.map(t => t.name);
      const unmatchedSubjects = shot.subjects.filter(
        s => !matchedTalents.some(t => 
          t.name.toLowerCase().includes(s.toLowerCase()) ||
          s.toLowerCase().includes(t.name.toLowerCase())
        )
      );
      
      const allSubjects = [...talentDescriptions, ...unmatchedSubjects];
      components.push(`featuring ${allSubjects.join(', ')}`);
    } else {
      components.push(`featuring ${shot.subjects.join(', ')}`);
    }
  }

  // 4. Location
  if (shot.location) {
    components.push(`set in ${shot.location}`);
  }

  // 5. Lighting
  components.push(LIGHTING_DESCRIPTIONS[shot.lighting]);

  // 6. Camera movement (for video)
  if (shotList.contentType === 'video' && shot.cameraMovement !== 'static') {
    components.push(MOVEMENT_DESCRIPTIONS[shot.cameraMovement]);
  }

  // 7. Props
  if (shot.props && shot.props.length > 0) {
    components.push(`with ${shot.props.join(', ')}`);
  }

  // 8. Brand aesthetic (if available)
  if (brand) {
    const visualStyle = brand.tokens?.visualStyle;
    if (visualStyle) {
      if (visualStyle.aesthetic) {
        components.push(visualStyle.aesthetic + ' aesthetic');
      }
      if (visualStyle.mood) {
        components.push(visualStyle.mood + ' mood');
      }
      if (visualStyle.photographyStyle) {
        components.push(visualStyle.photographyStyle);
      }
    }
  }

  // Compose the user prompt
  let userPrompt = components.join(', ') + '.';

  // 9. Add detailed talent descriptions if available
  if (talents && talents.length > 0) {
    // Match talents to shot subjects for focused descriptions
    const matchedTalents = shot.subjects && shot.subjects.length > 0
      ? matchTalentsToSubjects(talents, shot.subjects)
      : talents;

    if (matchedTalents.length > 0) {
      const talentDescription = buildTalentDescription(matchedTalents);
      userPrompt += `\n\n--- Character Details ---\n${talentDescription}`;
    }
  }

  // Build system prompt for context
  let systemPrompt: string | undefined;
  if (shotList.contentType === 'video') {
    systemPrompt = `Generate a ${shot.duration || 5} second video clip. ` +
      `Style: cinematic, professional production quality. ` +
      `Aspect ratio: ${ASPECT_RATIO_HINTS[shot.aspectRatio]}.`;
  } else {
    systemPrompt = `Generate a high-quality image. ` +
      `Style: professional photography. ` +
      `Aspect ratio: ${ASPECT_RATIO_HINTS[shot.aspectRatio]}.`;
  }

  // Build negative prompt (things to avoid)
  const negativePromptParts: string[] = [
    'low quality',
    'blurry',
    'distorted',
    'amateur',
    'overexposed',
    'underexposed',
  ];

  // Add brand forbidden elements
  if (brand) {
    // Add any forbidden visual elements from brand voice
  }

  const negativePrompt = negativePromptParts.join(', ');

  // Technical parameters
  const technicalParameters: ComposedShotPrompt['technicalParameters'] = {
    aspectRatio: shot.aspectRatio,
    style: brand?.tokens?.visualStyle?.aesthetic,
    lighting: shot.lighting,
    camera: equipmentPreset?.camera,
  };

  return {
    systemPrompt,
    userPrompt,
    negativePrompt,
    technicalParameters,
  };
}

/**
 * Simplified implementation using ShotGenerationContext
 */
function composeShotPromptSimple(context: ShotGenerationContext): ShotPromptResult {
  const { shot, brand, talent, referenceAssets } = context;

  // Build the main prompt components
  const components: string[] = [];

  // 1. Shot type and framing
  components.push(SHOT_TYPE_DESCRIPTIONS[shot.shotType]);

  // 2. Main description
  if (shot.description) {
    components.push(shot.description);
  }

  // 3. Camera movement (if not static)
  if (shot.cameraMovement !== 'static') {
    components.push(MOVEMENT_DESCRIPTIONS[shot.cameraMovement]);
  }

  // 4. Lighting
  components.push(LIGHTING_DESCRIPTIONS[shot.lighting]);

  // 5. Location
  if (shot.location) {
    components.push(`set in ${shot.location}`);
  }

  // 6. Subjects
  if (shot.subjects && shot.subjects.length > 0) {
    components.push(`featuring ${shot.subjects.join(', ')}`);
  }

  // 7. Props
  if (shot.props && shot.props.length > 0) {
    components.push(`with ${shot.props.join(', ')}`);
  }

  // 8. Brand aesthetic (if available)
  if (brand) {
    const visualStyle = brand.tokens?.visualStyle;
    if (visualStyle) {
      if (visualStyle.aesthetic) {
        components.push(visualStyle.aesthetic + ' aesthetic');
      }
      if (visualStyle.mood) {
        components.push(visualStyle.mood + ' mood');
      }
      if (visualStyle.photographyStyle) {
        components.push(visualStyle.photographyStyle);
      }
    }
  }

  // Compose the user prompt
  let prompt = components.join(', ') + '.';

  // Add detailed talent description if available
  if (talent) {
    const talentDescription = buildTalentDescription([talent]);
    prompt += `\n\n--- Character Details ---\n${talentDescription}`;
  }

  // Build system prompt for context
  const systemPrompt = `Generate a high-quality image. ` +
    `Style: professional photography. ` +
    `Aspect ratio: ${ASPECT_RATIO_HINTS[shot.aspectRatio]}.`;

  // Build negative prompt (things to avoid)
  const negativePromptParts: string[] = [
    'low quality',
    'blurry',
    'distorted',
    'amateur',
    'overexposed',
    'underexposed',
  ];

  // Add brand forbidden elements
  if (brand?.tokens?.voice?.forbiddenElements) {
    negativePromptParts.push(...brand.tokens.voice.forbiddenElements);
  }

  const negativePrompt = negativePromptParts.join(', ');

  return {
    prompt,
    negativePrompt,
    systemPrompt,
    metadata: {
      shotType: shot.shotType,
      cameraMovement: shot.cameraMovement,
      lighting: shot.lighting,
      hasBrand: !!brand,
      hasTalent: !!talent,
      referenceAssetCount: referenceAssets?.length || 0,
    },
  };
}

/**
 * Generate a storyboard description from shot metadata
 */
export function generateStoryboardDescription(shot: Shot): string {
  const parts: string[] = [];

  parts.push(`Shot ${shot.shotNumber}: ${shot.name}`);
  parts.push(`Type: ${shot.shotType.replace('-', ' ')}`);
  parts.push(`Description: ${shot.description}`);

  if (shot.duration) {
    parts.push(`Duration: ${shot.duration}s`);
  }

  if (shot.cameraMovement !== 'static') {
    parts.push(`Movement: ${shot.cameraMovement.replace('-', ' ')}`);
  }

  parts.push(`Lighting: ${shot.lighting.replace('-', ' ')}`);

  if (shot.dialogue) {
    parts.push(`Dialogue: "${shot.dialogue}"`);
  }

  if (shot.soundEffects && shot.soundEffects.length > 0) {
    parts.push(`SFX: ${shot.soundEffects.join(', ')}`);
  }

  if (shot.notes) {
    parts.push(`Notes: ${shot.notes}`);
  }

  return parts.join('\n');
}

/**
 * Validate a shot has sufficient information for generation
 * Checks that description length is at least 10 characters
 */
export function validateShotForGeneration(shot: Shot): { valid: boolean; error?: string } {
  if (!shot.description || shot.description.length < 10) {
    return {
      valid: false,
      error: 'Shot description must be at least 10 characters long',
    };
  }

  return { valid: true };
}

/**
 * Validate a shot for AI generation readiness with detailed feedback
 * Returns comprehensive issues and warnings
 */
export function validateShotForGenerationDetailed(shot: Shot): {
  isReady: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!shot.description || shot.description.trim().length < 10) {
    issues.push('Shot description is too short (minimum 10 characters)');
  }

  // Recommended fields
  if (!shot.location) {
    warnings.push('No location specified - may result in generic background');
  }

  if (!shot.subjects || shot.subjects.length === 0) {
    warnings.push('No subjects specified - consider adding main elements');
  }

  if (shot.lighting === 'custom') {
    warnings.push('Custom lighting selected - describe lighting in notes or description');
  }

  if (shot.shotType === 'custom') {
    warnings.push('Custom shot type selected - describe framing in notes or description');
  }

  return {
    isReady: issues.length === 0,
    issues,
    warnings,
  };
}

/**
 * Suggest shot types based on description
 */
export function suggestShotType(description: string): ShotType[] {
  const desc = description.toLowerCase();
  const suggestions: ShotType[] = [];

  // Keyword matching for shot type suggestions
  if (desc.includes('face') || desc.includes('expression') || desc.includes('emotion')) {
    suggestions.push('close-up');
  }

  if (desc.includes('detail') || desc.includes('eye') || desc.includes('hand')) {
    suggestions.push('extreme-close');
  }

  if (desc.includes('establishing') || desc.includes('location') || desc.includes('setting')) {
    suggestions.push('wide');
  }

  if (desc.includes('conversation') || desc.includes('dialogue') || desc.includes('talking')) {
    suggestions.push('medium', 'over-shoulder');
  }

  if (desc.includes('walking') || desc.includes('running') || desc.includes('moving')) {
    suggestions.push('tracking', 'steadicam');
  }

  if (desc.includes('power') || desc.includes('heroic') || desc.includes('imposing')) {
    suggestions.push('low-angle');
  }

  if (desc.includes('vulnerable') || desc.includes('small') || desc.includes('overwhelmed')) {
    suggestions.push('high-angle');
  }

  if (desc.includes('aerial') || desc.includes('overhead') || desc.includes('bird')) {
    suggestions.push('aerial');
  }

  if (desc.includes('tension') || desc.includes('unease') || desc.includes('disorienting')) {
    suggestions.push('dutch-angle');
  }

  // Default suggestions if no matches
  if (suggestions.length === 0) {
    suggestions.push('medium', 'wide');
  }

  return [...new Set(suggestions)];
}

/**
 * Suggest lighting based on mood/description
 */
export function suggestLighting(description: string, mood?: string): LightingSetup[] {
  const text = (description + ' ' + (mood || '')).toLowerCase();
  const suggestions: LightingSetup[] = [];

  if (text.includes('dramatic') || text.includes('intense') || text.includes('noir')) {
    suggestions.push('low-key', 'studio-split', 'studio-rembrandt');
  }

  if (text.includes('happy') || text.includes('bright') || text.includes('cheerful')) {
    suggestions.push('high-key', 'natural');
  }

  if (text.includes('romantic') || text.includes('warm') || text.includes('sunset')) {
    suggestions.push('golden-hour', 'practical');
  }

  if (text.includes('mysterious') || text.includes('moody') || text.includes('twilight')) {
    suggestions.push('blue-hour', 'low-key');
  }

  if (text.includes('glamour') || text.includes('beauty') || text.includes('portrait')) {
    suggestions.push('studio-butterfly', 'studio-loop');
  }

  if (text.includes('outdoor') || text.includes('nature') || text.includes('natural')) {
    suggestions.push('natural', 'overcast', 'golden-hour');
  }

  if (text.includes('cyberpunk') || text.includes('neon') || text.includes('night')) {
    suggestions.push('neon', 'practical');
  }

  if (text.includes('silhouette') || text.includes('backlit')) {
    suggestions.push('silhouette', 'backlit');
  }

  // Default
  if (suggestions.length === 0) {
    suggestions.push('natural', 'studio-three-point');
  }

  return [...new Set(suggestions)];
}

/**
 * Calculate shot complexity score (1-10)
 */
export function calculateShotComplexity(shot: Shot): number {
  let score = 5; // Base score

  // Shot type complexity
  const complexShotTypes: ShotType[] = ['aerial', 'crane', 'steadicam', 'tracking'];
  if (complexShotTypes.includes(shot.shotType)) {
    score += 2;
  }

  // Movement complexity
  const complexMovements: CameraMovement[] = ['orbit', 'crane-up', 'crane-down', 'whip-pan'];
  if (complexMovements.includes(shot.cameraMovement)) {
    score += 1;
  }

  // Lighting complexity
  const complexLighting: LightingSetup[] = ['studio-rembrandt', 'studio-split', 'neon', 'mixed'];
  if (complexLighting.includes(shot.lighting)) {
    score += 1;
  }

  // Multiple subjects
  if (shot.subjects && shot.subjects.length > 2) {
    score += 1;
  }

  // Duration (for video)
  if (shot.duration && shot.duration > 10) {
    score += 1;
  }

  return Math.min(10, Math.max(1, score));
}
