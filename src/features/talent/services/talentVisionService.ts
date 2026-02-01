/**
 * Talent Vision Service
 * Analyzes generated headshots to extract appearance attributes
 */

import type { UUID } from '../../../core/types/common';
import type { TalentAppearance } from '../../../core/types/talent';
import { useProviderStore } from '../../providers/store';

export interface VisionAnalysisResult {
  success: boolean;
  attributes: Partial<TalentAppearance>;
  error?: string;
}

const VISION_SYSTEM_PROMPT = `You are an image analyst specializing in extracting appearance attributes from headshot photographs. Analyze images objectively and return structured JSON data.`;

const VISION_USER_PROMPT = `Analyze this headshot portrait and extract appearance attributes.
Return ONLY valid JSON with these fields. Use null for any attribute you cannot determine with confidence:

{
  "age": "estimated age range like '25-30' or 'mid 40s'",
  "gender": "male | female | non-binary",
  "ethnicity": "observed ethnicity or heritage",
  "hair": {
    "color": "hair color",
    "style": "hairstyle description (straight, wavy, curly, etc)",
    "length": "short | medium | long"
  },
  "eyes": {
    "color": "eye color",
    "shape": "round | almond | hooded | monolid | downturned | upturned"
  },
  "skin": {
    "tone": "fair | light | medium | olive | tan | brown | dark",
    "texture": "smooth | freckled | weathered | etc"
  },
  "distinguishingFeatures": ["array of notable features like glasses, beard, dimples, moles, scars, etc"]
}

Return ONLY the JSON object, no explanation or markdown formatting.`;

/** Preferred provider order for vision analysis */
const VISION_PROVIDER_PREFERENCE = ['openai', 'anthropic', 'gemini'];

/**
 * Find an active provider with vision capability
 * Prefers openai > anthropic > gemini
 */
export function findVisionProvider(): UUID | null {
  const state = useProviderStore.getState();
  const { providers } = state;

  // First pass: look for preferred providers in order
  for (const preferredType of VISION_PROVIDER_PREFERENCE) {
    for (const [id, provider] of providers) {
      if (
        provider.status === 'active' &&
        provider.config.type === preferredType &&
        provider.config.capabilities.some((c) => c.type === 'text')
      ) {
        return id;
      }
    }
  }

  // Second pass: any active text provider
  for (const [id, provider] of providers) {
    if (
      provider.status === 'active' &&
      provider.config.capabilities.some((c) => c.type === 'text')
    ) {
      return id;
    }
  }

  return null;
}

/**
 * Parsed vision response structure (matches VISION_USER_PROMPT output)
 */
interface VisionResponseData {
  age?: string | null;
  gender?: string | null;
  ethnicity?: string | null;
  hair?: {
    color?: string | null;
    style?: string | null;
    length?: string | null;
  } | null;
  eyes?: {
    color?: string | null;
    shape?: string | null;
  } | null;
  skin?: {
    tone?: string | null;
    texture?: string | null;
  } | null;
  distinguishingFeatures?: string[] | null;
}

/**
 * Convert vision response to TalentAppearance format
 */
function convertToTalentAppearance(data: VisionResponseData): Partial<TalentAppearance> {
  const result: Partial<TalentAppearance> = {};

  if (data.age) result.age = data.age;
  if (data.gender) result.gender = data.gender;
  if (data.ethnicity) result.ethnicity = data.ethnicity;

  if (data.hair) {
    result.hair = {};
    if (data.hair.color) result.hair.color = data.hair.color;
    if (data.hair.style) result.hair.style = data.hair.style;
    if (data.hair.length) result.hair.length = data.hair.length;
    // Remove empty object
    if (Object.keys(result.hair).length === 0) delete result.hair;
  }

  if (data.eyes) {
    result.eyes = {};
    if (data.eyes.color) result.eyes.color = data.eyes.color;
    if (data.eyes.shape) result.eyes.shape = data.eyes.shape;
    if (Object.keys(result.eyes).length === 0) delete result.eyes;
  }

  if (data.skin) {
    result.skin = {};
    if (data.skin.tone) result.skin.tone = data.skin.tone;
    if (data.skin.texture) result.skin.texture = data.skin.texture;
    if (Object.keys(result.skin).length === 0) delete result.skin;
  }

  if (data.distinguishingFeatures && data.distinguishingFeatures.length > 0) {
    result.distinguishingFeatures = data.distinguishingFeatures.filter(Boolean);
    if (result.distinguishingFeatures.length === 0) delete result.distinguishingFeatures;
  }

  return result;
}

/**
 * Analyze a headshot image and extract appearance attributes
 */
export async function analyzeHeadshotImage(imageUrl: string): Promise<VisionAnalysisResult> {
  // Find a provider with vision capability
  const providerId = findVisionProvider();
  if (!providerId) {
    return {
      success: false,
      attributes: {},
      error: 'No vision-capable provider available. Please configure OpenAI, Anthropic, or Gemini.',
    };
  }

  // Get the adapter
  const state = useProviderStore.getState();
  const adapter = state.getAdapter(providerId);
  if (!adapter) {
    return {
      success: false,
      attributes: {},
      error: 'Failed to get provider adapter.',
    };
  }

  // Check if adapter supports vision (generateTextWithImage method)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const visionAdapter = adapter as any;
  if (typeof visionAdapter.generateTextWithImage !== 'function') {
    return {
      success: false,
      attributes: {},
      error: `Provider ${adapter.displayName} does not support vision analysis.`,
    };
  }

  try {
    // Call the vision API
    const response = await visionAdapter.generateTextWithImage({
      systemPrompt: VISION_SYSTEM_PROMPT,
      userPrompt: VISION_USER_PROMPT,
      imageUrl,
      maxTokens: 1024,
      temperature: 0.3,
    });

    // Extract JSON from response
    const content = response.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: false,
        attributes: {},
        error: 'Failed to parse vision analysis response.',
      };
    }

    // Parse the JSON
    const parsedData: VisionResponseData = JSON.parse(jsonMatch[0]);
    const attributes = convertToTalentAppearance(parsedData);

    return {
      success: true,
      attributes,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during vision analysis';
    return {
      success: false,
      attributes: {},
      error: message,
    };
  }
}

/**
 * Deep merge helper for nested objects
 */
function deepMerge<T extends Record<string, unknown>>(base: T, overlay: Partial<T>): T {
  const result = { ...base };

  for (const key of Object.keys(overlay) as (keyof T)[]) {
    const overlayValue = overlay[key];
    if (overlayValue === undefined) continue;

    const baseValue = result[key];

    // If both are objects (but not arrays), merge recursively
    if (
      baseValue &&
      overlayValue &&
      typeof baseValue === 'object' &&
      typeof overlayValue === 'object' &&
      !Array.isArray(baseValue) &&
      !Array.isArray(overlayValue)
    ) {
      result[key] = deepMerge(
        baseValue as Record<string, unknown>,
        overlayValue as Record<string, unknown>
      ) as T[keyof T];
    } else {
      result[key] = overlayValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Merge appearance attributes with priority: userSet > fromPrompt > fromVision
 *
 * @param userSet Attributes explicitly set by the user (highest priority)
 * @param fromPrompt Attributes extracted from the prompt description
 * @param fromVision Attributes analyzed from the generated image (lowest priority)
 * @returns Merged appearance attributes
 */
export function mergeAnalyzedAttributes(
  userSet: Partial<TalentAppearance>,
  fromPrompt: Partial<TalentAppearance>,
  fromVision: Partial<TalentAppearance>
): Partial<TalentAppearance> {
  // Start with vision attributes as base (lowest priority)
  let result: Partial<TalentAppearance> = { ...fromVision };

  // Apply prompt attributes on top
  result = deepMerge(result as Record<string, unknown>, fromPrompt as Record<string, unknown>) as Partial<TalentAppearance>;

  // Apply user-set attributes on top (highest priority)
  result = deepMerge(result as Record<string, unknown>, userSet as Record<string, unknown>) as Partial<TalentAppearance>;

  return result;
}
