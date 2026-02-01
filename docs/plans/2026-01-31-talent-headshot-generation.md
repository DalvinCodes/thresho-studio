# Talent Headshot & Character Sheet Generation - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add AI-powered headshot generation for person/character talents with character sheet generation (5 angles).

**Architecture:** New tab in TalentEditor with two-step generation flow. Uses existing generation service and provider adapters. Stores generated images via existing reference image system.

**Tech Stack:** React, Zustand, existing generation service, image provider adapters (Flux Pro, Imagen, DALL-E)

---

## Task 1: Add Generation Types

**Files:**
- Modify: `src/core/types/talent.ts`

**Step 1: Add TalentGeneratedImage type**

Add after line 87 (after TalentReferenceImage interface):

```typescript
/**
 * Character sheet angle types
 */
export type CharacterSheetAngle = 'front' | 'back' | 'left-profile' | 'right-profile' | 'three-quarter';

/**
 * AI-generated image for a talent (headshot or character sheet)
 */
export interface TalentGeneratedImage {
  id: UUID;
  talentId: UUID;
  type: 'headshot' | 'character-sheet';
  angle?: CharacterSheetAngle;
  url: string;
  thumbnailUrl?: string;
  generationPrompt: string;
  providerId: string;
  model: string;
  seed?: number;
  isApproved: boolean;
  createdAt: Timestamp;
}

/**
 * Generation state for talent AI generation UI
 */
export interface TalentGenerationState {
  currentHeadshot: TalentGeneratedImage | null;
  characterSheet: TalentGeneratedImage[];
  isGenerating: boolean;
  generationStep: 'idle' | 'headshot' | 'analyzing' | 'character-sheet';
  selectedProviderId: string | null;
  error: string | null;
}
```

**Step 2: Verify the file compiles**

Run: `npm run build 2>&1 | head -20`
Expected: No errors related to talent.ts

**Step 3: Commit**

```bash
git add src/core/types/talent.ts
git commit -m "feat(talent): add types for AI headshot generation"
```

---

## Task 2: Create Headshot Generation Service

**Files:**
- Create: `src/features/talent/services/headshotGenerationService.ts`

**Step 1: Create the service file**

```typescript
/**
 * Headshot Generation Service
 * Builds prompts for headshot and character sheet generation
 */

import type { TalentProfile, TalentAppearance, CharacterSheetAngle } from '../../../core/types/talent';

/**
 * Result of building a headshot prompt
 */
export interface HeadshotPromptResult {
  prompt: string;
  usedAttributes: Partial<TalentAppearance>;
  hasUserAttributes: boolean;
}

/**
 * Character sheet angle configurations
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
 * Check if a talent has any appearance attributes set
 */
export function hasAppearanceAttributes(appearance: TalentAppearance): boolean {
  return !!(
    appearance.age ||
    appearance.gender ||
    appearance.ethnicity ||
    appearance.bodyType ||
    appearance.height ||
    appearance.hair?.color ||
    appearance.hair?.style ||
    appearance.hair?.length ||
    appearance.eyes?.color ||
    appearance.eyes?.shape ||
    appearance.skin?.tone ||
    appearance.skin?.texture ||
    (appearance.distinguishingFeatures && appearance.distinguishingFeatures.length > 0)
  );
}

/**
 * Build a headshot generation prompt from talent appearance attributes
 */
export function buildHeadshotPrompt(talent: TalentProfile): HeadshotPromptResult {
  const base = 'Professional headshot portrait, neutral gray background, soft studio lighting, sharp focus, photorealistic, high quality';
  
  const attrs: string[] = [];
  const usedAttributes: Partial<TalentAppearance> = {};
  const appearance = talent.appearance;

  // Extract non-empty appearance values
  if (appearance.gender) {
    attrs.push(appearance.gender);
    usedAttributes.gender = appearance.gender;
  }
  if (appearance.age) {
    attrs.push(`${appearance.age} years old`);
    usedAttributes.age = appearance.age;
  }
  if (appearance.ethnicity) {
    attrs.push(appearance.ethnicity);
    usedAttributes.ethnicity = appearance.ethnicity;
  }
  if (appearance.hair?.color) {
    const hairDesc = [appearance.hair.color];
    if (appearance.hair.length) hairDesc.push(appearance.hair.length);
    if (appearance.hair.style) hairDesc.push(appearance.hair.style);
    attrs.push(`${hairDesc.join(' ')} hair`);
    usedAttributes.hair = { ...appearance.hair };
  }
  if (appearance.eyes?.color) {
    const eyeDesc = [appearance.eyes.color];
    if (appearance.eyes.shape) eyeDesc.push(appearance.eyes.shape);
    attrs.push(`${eyeDesc.join(' ')} eyes`);
    usedAttributes.eyes = { ...appearance.eyes };
  }
  if (appearance.skin?.tone) {
    const skinDesc = [appearance.skin.tone];
    if (appearance.skin.texture) skinDesc.push(appearance.skin.texture);
    attrs.push(`${skinDesc.join(' ')} skin`);
    usedAttributes.skin = { ...appearance.skin };
  }
  if (appearance.distinguishingFeatures && appearance.distinguishingFeatures.length > 0) {
    attrs.push(appearance.distinguishingFeatures.join(', '));
    usedAttributes.distinguishingFeatures = [...appearance.distinguishingFeatures];
  }

  const hasUserAttributes = attrs.length > 0;

  // If no attributes set, generate a random person description
  if (!hasUserAttributes) {
    return {
      prompt: `${base}, natural looking person, pleasant expression`,
      usedAttributes: {},
      hasUserAttributes: false,
    };
  }

  return {
    prompt: `${base}, ${attrs.join(', ')}`,
    usedAttributes,
    hasUserAttributes,
  };
}

/**
 * Build character sheet prompts for all 5 angles
 */
export function buildCharacterSheetPrompts(
  talent: TalentProfile,
  headshotPrompt: string
): Record<CharacterSheetAngle, string> {
  // Convert headshot prompt to full body description
  const fullBodyBase = headshotPrompt
    .replace('Professional headshot portrait', 'Character reference sheet, full body shot')
    .replace('neutral gray background', 'clean white background');

  // Add clothing if specified
  const clothingDesc = talent.appearance.clothing 
    ? `, wearing ${talent.appearance.clothing}` 
    : ', wearing casual clothing';

  const result: Record<CharacterSheetAngle, string> = {} as Record<CharacterSheetAngle, string>;
  
  for (const [angle, config] of Object.entries(CHARACTER_SHEET_ANGLES)) {
    result[angle as CharacterSheetAngle] = `${fullBodyBase}${clothingDesc}, ${config.promptSuffix}`;
  }

  return result;
}

/**
 * Generate random appearance attributes for variety when regenerating
 */
export function generateRandomAttributes(): Partial<TalentAppearance> {
  const genders = ['female', 'male'];
  const ages = ['early 20s', 'mid 20s', 'late 20s', 'early 30s', 'mid 30s', 'late 30s', '40s', '50s'];
  const hairColors = ['black', 'dark brown', 'brown', 'light brown', 'blonde', 'auburn', 'red', 'gray'];
  const hairLengths = ['short', 'medium length', 'long'];
  const hairStyles = ['straight', 'wavy', 'curly'];
  const eyeColors = ['brown', 'dark brown', 'hazel', 'green', 'blue', 'gray'];
  const skinTones = ['fair', 'light', 'medium', 'olive', 'tan', 'brown', 'dark'];

  const randomChoice = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  return {
    gender: randomChoice(genders),
    age: randomChoice(ages),
    hair: {
      color: randomChoice(hairColors),
      length: randomChoice(hairLengths),
      style: randomChoice(hairStyles),
    },
    eyes: {
      color: randomChoice(eyeColors),
    },
    skin: {
      tone: randomChoice(skinTones),
    },
  };
}

/**
 * Merge user-set attributes with random attributes for regeneration
 * User-set attributes take priority
 */
export function mergeWithRandomAttributes(
  userAttributes: TalentAppearance
): TalentAppearance {
  const random = generateRandomAttributes();
  
  return {
    ...random,
    ...userAttributes,
    // Handle nested objects carefully
    hair: {
      ...random.hair,
      ...(userAttributes.hair || {}),
    },
    eyes: {
      ...random.eyes,
      ...(userAttributes.eyes || {}),
    },
    skin: {
      ...random.skin,
      ...(userAttributes.skin || {}),
    },
    // Keep user arrays if set
    distinguishingFeatures: userAttributes.distinguishingFeatures?.length 
      ? userAttributes.distinguishingFeatures 
      : undefined,
    accessories: userAttributes.accessories?.length 
      ? userAttributes.accessories 
      : undefined,
  };
}
```

**Step 2: Verify the file compiles**

Run: `npm run build 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/talent/services/headshotGenerationService.ts
git commit -m "feat(talent): add headshot generation service with prompt building"
```

---

## Task 3: Create Vision Analysis Service

**Files:**
- Create: `src/features/talent/services/talentVisionService.ts`

**Step 1: Create the vision service**

```typescript
/**
 * Talent Vision Service
 * Analyzes generated headshots to extract appearance attributes
 */

import type { TalentAppearance } from '../../../core/types/talent';
import { useProviderStore } from '../../providers/store';

/**
 * Vision analysis result
 */
export interface VisionAnalysisResult {
  success: boolean;
  attributes: Partial<TalentAppearance>;
  error?: string;
}

/**
 * System prompt for vision analysis
 */
const VISION_SYSTEM_PROMPT = `You are an image analyst specializing in extracting appearance attributes from headshot photographs. Analyze images objectively and return structured JSON data.`;

/**
 * User prompt template for vision analysis
 */
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

/**
 * Find a vision-capable provider
 */
function findVisionProvider(): string | null {
  const providerStore = useProviderStore.getState();
  
  // Look for active providers with vision capability
  // Priority: OpenAI (GPT-4o) > Anthropic (Claude) > Google (Gemini)
  const preferredTypes = ['openai', 'anthropic', 'gemini'];
  
  for (const providerType of preferredTypes) {
    for (const [id, provider] of providerStore.providers) {
      if (
        provider.status === 'active' &&
        provider.config.type === providerType &&
        provider.config.capabilities.some(c => c.type === 'text')
      ) {
        return id;
      }
    }
  }
  
  // Fall back to any active text provider
  for (const [id, provider] of providerStore.providers) {
    if (
      provider.status === 'active' &&
      provider.config.capabilities.some(c => c.type === 'text')
    ) {
      return id;
    }
  }
  
  return null;
}

/**
 * Analyze a headshot image to extract appearance attributes
 */
export async function analyzeHeadshotImage(imageUrl: string): Promise<VisionAnalysisResult> {
  const providerId = findVisionProvider();
  
  if (!providerId) {
    return {
      success: false,
      attributes: {},
      error: 'No vision-capable provider available. Configure OpenAI, Anthropic, or Google provider.',
    };
  }
  
  const providerStore = useProviderStore.getState();
  const adapter = providerStore.getAdapter(providerId);
  
  if (!adapter) {
    return {
      success: false,
      attributes: {},
      error: 'Provider adapter not available',
    };
  }
  
  try {
    // Check if adapter supports vision
    if (!adapter.generateTextWithImage) {
      // Fall back to regular text generation without image analysis
      return {
        success: false,
        attributes: {},
        error: 'Selected provider does not support image analysis',
      };
    }
    
    const response = await adapter.generateTextWithImage({
      model: 'default',
      systemPrompt: VISION_SYSTEM_PROMPT,
      userPrompt: VISION_USER_PROMPT,
      imageUrl,
    });
    
    // Parse the JSON response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: false,
        attributes: {},
        error: 'Could not parse vision analysis response',
      };
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Convert parsed JSON to TalentAppearance format
    const attributes: Partial<TalentAppearance> = {};
    
    if (parsed.age) attributes.age = parsed.age;
    if (parsed.gender) attributes.gender = parsed.gender;
    if (parsed.ethnicity) attributes.ethnicity = parsed.ethnicity;
    
    if (parsed.hair) {
      attributes.hair = {};
      if (parsed.hair.color) attributes.hair.color = parsed.hair.color;
      if (parsed.hair.style) attributes.hair.style = parsed.hair.style;
      if (parsed.hair.length) attributes.hair.length = parsed.hair.length;
    }
    
    if (parsed.eyes) {
      attributes.eyes = {};
      if (parsed.eyes.color) attributes.eyes.color = parsed.eyes.color;
      if (parsed.eyes.shape) attributes.eyes.shape = parsed.eyes.shape;
    }
    
    if (parsed.skin) {
      attributes.skin = {};
      if (parsed.skin.tone) attributes.skin.tone = parsed.skin.tone;
      if (parsed.skin.texture) attributes.skin.texture = parsed.skin.texture;
    }
    
    if (parsed.distinguishingFeatures && Array.isArray(parsed.distinguishingFeatures)) {
      attributes.distinguishingFeatures = parsed.distinguishingFeatures.filter(
        (f: unknown) => typeof f === 'string' && f.trim()
      );
    }
    
    return {
      success: true,
      attributes,
    };
  } catch (error) {
    return {
      success: false,
      attributes: {},
      error: error instanceof Error ? error.message : 'Vision analysis failed',
    };
  }
}

/**
 * Merge attributes with priority: userSet > fromPrompt > fromVision
 */
export function mergeAnalyzedAttributes(
  userSet: Partial<TalentAppearance>,
  fromPrompt: Partial<TalentAppearance>,
  fromVision: Partial<TalentAppearance>
): Partial<TalentAppearance> {
  // Deep merge with priority
  const merged: Partial<TalentAppearance> = { ...fromVision };
  
  // Apply prompt attributes
  if (fromPrompt.age) merged.age = fromPrompt.age;
  if (fromPrompt.gender) merged.gender = fromPrompt.gender;
  if (fromPrompt.ethnicity) merged.ethnicity = fromPrompt.ethnicity;
  if (fromPrompt.bodyType) merged.bodyType = fromPrompt.bodyType;
  if (fromPrompt.height) merged.height = fromPrompt.height;
  if (fromPrompt.hair) merged.hair = { ...merged.hair, ...fromPrompt.hair };
  if (fromPrompt.eyes) merged.eyes = { ...merged.eyes, ...fromPrompt.eyes };
  if (fromPrompt.skin) merged.skin = { ...merged.skin, ...fromPrompt.skin };
  if (fromPrompt.distinguishingFeatures?.length) {
    merged.distinguishingFeatures = fromPrompt.distinguishingFeatures;
  }
  
  // Apply user-set attributes (highest priority)
  if (userSet.age) merged.age = userSet.age;
  if (userSet.gender) merged.gender = userSet.gender;
  if (userSet.ethnicity) merged.ethnicity = userSet.ethnicity;
  if (userSet.bodyType) merged.bodyType = userSet.bodyType;
  if (userSet.height) merged.height = userSet.height;
  if (userSet.hair) merged.hair = { ...merged.hair, ...userSet.hair };
  if (userSet.eyes) merged.eyes = { ...merged.eyes, ...userSet.eyes };
  if (userSet.skin) merged.skin = { ...merged.skin, ...userSet.skin };
  if (userSet.distinguishingFeatures?.length) {
    merged.distinguishingFeatures = userSet.distinguishingFeatures;
  }
  if (userSet.clothing) merged.clothing = userSet.clothing;
  if (userSet.accessories?.length) merged.accessories = userSet.accessories;
  
  return merged;
}
```

**Step 2: Verify the file compiles**

Run: `npm run build 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/talent/services/talentVisionService.ts
git commit -m "feat(talent): add vision service for headshot attribute analysis"
```

---

## Task 4: Add Generation State to Store

**Files:**
- Modify: `src/features/talent/store.ts`

**Step 1: Import new types**

Add to imports at the top (around line 18):

```typescript
import type {
  TalentProfile,
  TalentType,
  TalentReferenceImage,
  TalentFilters,
  TalentAppearance,
  TalentPersonality,
  TalentPromptFragments,
  TalentValidationResult,
  TalentGenerationState,
  TalentGeneratedImage,
  CharacterSheetAngle,
} from '../../core/types/talent';
```

**Step 2: Add generation state to TalentState interface**

Add after `isDirty: boolean;` (around line 39):

```typescript
  // AI Generation state per talent
  generationStates: Map<UUID, TalentGenerationState>;
```

**Step 3: Add generation actions to TalentActions interface**

Add after `importTalent` action (around line 86):

```typescript
  // AI Generation actions
  initGenerationState: (talentId: UUID) => void;
  setGenerationProvider: (talentId: UUID, providerId: string) => void;
  setGenerationStep: (talentId: UUID, step: TalentGenerationState['generationStep']) => void;
  setCurrentHeadshot: (talentId: UUID, headshot: TalentGeneratedImage | null) => void;
  setCharacterSheet: (talentId: UUID, images: TalentGeneratedImage[]) => void;
  setGenerationError: (talentId: UUID, error: string | null) => void;
  setIsGenerating: (talentId: UUID, isGenerating: boolean) => void;
  clearGenerationState: (talentId: UUID) => void;
  getGenerationState: (talentId: UUID) => TalentGenerationState | undefined;
```

**Step 4: Add initial state**

Add to initial state (around line 118):

```typescript
    generationStates: new Map(),
```

**Step 5: Add generation action implementations**

Add before the closing of the immer callback (before line 607):

```typescript
    // AI Generation actions
    initGenerationState: (talentId) => {
      set((state) => {
        if (!state.generationStates.has(talentId)) {
          state.generationStates.set(talentId, {
            currentHeadshot: null,
            characterSheet: [],
            isGenerating: false,
            generationStep: 'idle',
            selectedProviderId: null,
            error: null,
          });
        }
      });
    },

    setGenerationProvider: (talentId, providerId) => {
      set((state) => {
        const genState = state.generationStates.get(talentId);
        if (genState) {
          genState.selectedProviderId = providerId;
        }
      });
    },

    setGenerationStep: (talentId, step) => {
      set((state) => {
        const genState = state.generationStates.get(talentId);
        if (genState) {
          genState.generationStep = step;
        }
      });
    },

    setCurrentHeadshot: (talentId, headshot) => {
      set((state) => {
        const genState = state.generationStates.get(talentId);
        if (genState) {
          genState.currentHeadshot = headshot;
        }
      });
    },

    setCharacterSheet: (talentId, images) => {
      set((state) => {
        const genState = state.generationStates.get(talentId);
        if (genState) {
          genState.characterSheet = images;
        }
      });
    },

    setGenerationError: (talentId, error) => {
      set((state) => {
        const genState = state.generationStates.get(talentId);
        if (genState) {
          genState.error = error;
          genState.isGenerating = false;
        }
      });
    },

    setIsGenerating: (talentId, isGenerating) => {
      set((state) => {
        const genState = state.generationStates.get(talentId);
        if (genState) {
          genState.isGenerating = isGenerating;
          if (isGenerating) {
            genState.error = null;
          }
        }
      });
    },

    clearGenerationState: (talentId) => {
      set((state) => {
        state.generationStates.delete(talentId);
      });
    },

    getGenerationState: (talentId) => {
      return get().generationStates.get(talentId);
    },
```

**Step 6: Add selector hook for generation state**

Add at the end of the file (after useTalentTags):

```typescript
export const useTalentGenerationState = (talentId: UUID | null) => {
  const generationStates = useTalentStore((state) => state.generationStates);
  return useMemo(
    () => (talentId ? generationStates.get(talentId) : undefined),
    [generationStates, talentId]
  );
};
```

**Step 7: Verify the file compiles**

Run: `npm run build 2>&1 | head -30`
Expected: No errors

**Step 8: Commit**

```bash
git add src/features/talent/store.ts
git commit -m "feat(talent): add generation state management to store"
```

---

## Task 5: Create HeadshotGenerator Component

**Files:**
- Create: `src/features/talent/components/HeadshotGenerator.tsx`

**Step 1: Create the component**

```typescript
/**
 * HeadshotGenerator Component
 * Step 1 of AI generation: generate and approve a headshot
 */

import { useState, useCallback } from 'react';
import type { UUID } from '../../../core/types/common';
import { createUUID, createTimestamp } from '../../../core/types/common';
import type { TalentProfile, TalentGeneratedImage } from '../../../core/types/talent';
import { useTalentStore, useTalentGenerationState } from '../store';
import { useProviderStore } from '../../providers/store';
import { generateImage } from '../../generation/services/generationService';
import {
  buildHeadshotPrompt,
  hasAppearanceAttributes,
  mergeWithRandomAttributes,
} from '../services/headshotGenerationService';

interface HeadshotGeneratorProps {
  talent: TalentProfile;
  providerId: string | null;
  onApprove: () => void;
}

export function HeadshotGenerator({ talent, providerId, onApprove }: HeadshotGeneratorProps) {
  const generationState = useTalentGenerationState(talent.id);
  const {
    setCurrentHeadshot,
    setIsGenerating,
    setGenerationError,
    setGenerationStep,
    updateTalent,
  } = useTalentStore();
  
  const [isRegenerating, setIsRegenerating] = useState(false);

  const headshot = generationState?.currentHeadshot;
  const isGenerating = generationState?.isGenerating || false;
  const error = generationState?.error;

  const handleGenerate = useCallback(async (forceRandom = false) => {
    if (!providerId) {
      setGenerationError(talent.id, 'Please select a provider first');
      return;
    }

    setIsGenerating(talent.id, true);
    setGenerationStep(talent.id, 'headshot');
    setGenerationError(talent.id, null);

    try {
      // Build the prompt
      let promptResult = buildHeadshotPrompt(talent);
      
      // If regenerating without attributes or forceRandom, use random attributes
      if (forceRandom || (!promptResult.hasUserAttributes && isRegenerating)) {
        const randomAppearance = mergeWithRandomAttributes(talent.appearance);
        const tempTalent = { ...talent, appearance: randomAppearance };
        promptResult = buildHeadshotPrompt(tempTalent);
      }

      // Generate the image
      const result = await generateImage(
        {
          id: createUUID(),
          type: 'image',
          customPrompt: promptResult.prompt,
          providerId: providerId as UUID,
          parameters: {
            width: 1024,
            height: 1024,
            numVariants: 1,
          },
        },
        { userPrompt: promptResult.prompt, renderedPrompt: promptResult.prompt }
      );

      if (result.urls.length > 0) {
        const generatedImage: TalentGeneratedImage = {
          id: createUUID(),
          talentId: talent.id,
          type: 'headshot',
          url: result.urls[0],
          generationPrompt: promptResult.prompt,
          providerId,
          model: 'default',
          isApproved: false,
          createdAt: createTimestamp(),
        };

        setCurrentHeadshot(talent.id, generatedImage);
        setGenerationStep(talent.id, 'idle');
      } else {
        setGenerationError(talent.id, 'No image was generated');
      }
    } catch (err) {
      setGenerationError(
        talent.id,
        err instanceof Error ? err.message : 'Failed to generate headshot'
      );
    } finally {
      setIsGenerating(talent.id, false);
      setIsRegenerating(false);
    }
  }, [talent, providerId, isRegenerating, setCurrentHeadshot, setIsGenerating, setGenerationError, setGenerationStep]);

  const handleRegenerate = useCallback(() => {
    setIsRegenerating(true);
    // Keep user-set attributes, but allow variation in unset ones
    handleGenerate(!hasAppearanceAttributes(talent.appearance));
  }, [handleGenerate, talent.appearance]);

  const handleApprove = useCallback(() => {
    if (headshot) {
      setCurrentHeadshot(talent.id, { ...headshot, isApproved: true });
      onApprove();
    }
  }, [headshot, talent.id, setCurrentHeadshot, onApprove]);

  return (
    <div className="p-4 bg-surface rounded-lg border border-border">
      <h4 className="text-sm font-medium text-text-primary mb-4">
        Step 1: Generate Headshot
      </h4>

      {/* Preview Area */}
      <div className="flex justify-center mb-4">
        <div className="w-64 h-64 bg-background rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
          {isGenerating ? (
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm text-text-secondary">Generating...</p>
            </div>
          ) : headshot ? (
            <img
              src={headshot.url}
              alt="Generated headshot"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-4">
              <div className="text-4xl mb-2 opacity-30">🎨</div>
              <p className="text-sm text-text-secondary">
                {hasAppearanceAttributes(talent.appearance)
                  ? 'Generate a headshot based on appearance attributes'
                  : 'Generate a random person headshot'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-3">
        {!headshot ? (
          <button
            onClick={() => handleGenerate(false)}
            disabled={isGenerating || !providerId}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span>🎲</span>
            Generate Headshot
          </button>
        ) : (
          <>
            <button
              onClick={handleRegenerate}
              disabled={isGenerating}
              className="px-4 py-2 bg-surface border border-border text-text-primary rounded-lg hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>🔄</span>
              Regenerate
            </button>
            <button
              onClick={handleApprove}
              disabled={isGenerating || headshot.isApproved}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>✓</span>
              {headshot.isApproved ? 'Approved' : 'Approve'}
            </button>
          </>
        )}
      </div>

      {/* Info text */}
      {!hasAppearanceAttributes(talent.appearance) && !headshot && (
        <p className="mt-3 text-xs text-text-secondary text-center">
          No appearance attributes set. A random person will be generated.
          <br />
          You can set attributes in the Appearance tab for more control.
        </p>
      )}
    </div>
  );
}
```

**Step 2: Verify the file compiles**

Run: `npm run build 2>&1 | head -30`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/talent/components/HeadshotGenerator.tsx
git commit -m "feat(talent): add HeadshotGenerator component"
```

---

## Task 6: Create CharacterSheetGenerator Component

**Files:**
- Create: `src/features/talent/components/CharacterSheetGenerator.tsx`

**Step 1: Create the component**

```typescript
/**
 * CharacterSheetGenerator Component
 * Step 2 of AI generation: generate 5-angle character sheet
 */

import { useCallback } from 'react';
import type { UUID } from '../../../core/types/common';
import { createUUID, createTimestamp } from '../../../core/types/common';
import type { TalentProfile, TalentGeneratedImage, CharacterSheetAngle } from '../../../core/types/talent';
import { useTalentStore, useTalentGenerationState } from '../store';
import { generateImage } from '../../generation/services/generationService';
import {
  buildCharacterSheetPrompts,
  CHARACTER_SHEET_ANGLES,
} from '../services/headshotGenerationService';

interface CharacterSheetGeneratorProps {
  talent: TalentProfile;
  providerId: string | null;
  headshotPrompt: string;
  onSaveAll: (images: TalentGeneratedImage[]) => void;
}

const ANGLE_ORDER: CharacterSheetAngle[] = ['front', 'back', 'left-profile', 'right-profile', 'three-quarter'];

export function CharacterSheetGenerator({
  talent,
  providerId,
  headshotPrompt,
  onSaveAll,
}: CharacterSheetGeneratorProps) {
  const generationState = useTalentGenerationState(talent.id);
  const {
    setCharacterSheet,
    setIsGenerating,
    setGenerationError,
    setGenerationStep,
  } = useTalentStore();

  const characterSheet = generationState?.characterSheet || [];
  const isGenerating = generationState?.isGenerating || false;
  const generationStep = generationState?.generationStep;
  const error = generationState?.error;
  const headshot = generationState?.currentHeadshot;

  const isHeadshotApproved = headshot?.isApproved || false;

  const handleGenerate = useCallback(async () => {
    if (!providerId) {
      setGenerationError(talent.id, 'Please select a provider first');
      return;
    }

    if (!headshotPrompt) {
      setGenerationError(talent.id, 'Generate and approve a headshot first');
      return;
    }

    setIsGenerating(talent.id, true);
    setGenerationStep(talent.id, 'character-sheet');
    setGenerationError(talent.id, null);

    const prompts = buildCharacterSheetPrompts(talent, headshotPrompt);
    const generatedImages: TalentGeneratedImage[] = [];

    try {
      // Generate images sequentially to avoid rate limits
      for (const angle of ANGLE_ORDER) {
        const prompt = prompts[angle];

        const result = await generateImage(
          {
            id: createUUID(),
            type: 'image',
            customPrompt: prompt,
            providerId: providerId as UUID,
            parameters: {
              width: 1024,
              height: 1024,
              numVariants: 1,
            },
          },
          { userPrompt: prompt, renderedPrompt: prompt }
        );

        if (result.urls.length > 0) {
          const generatedImage: TalentGeneratedImage = {
            id: createUUID(),
            talentId: talent.id,
            type: 'character-sheet',
            angle,
            url: result.urls[0],
            generationPrompt: prompt,
            providerId,
            model: 'default',
            isApproved: false,
            createdAt: createTimestamp(),
          };
          generatedImages.push(generatedImage);
          
          // Update state progressively
          setCharacterSheet(talent.id, [...generatedImages]);
        }
      }

      setGenerationStep(talent.id, 'idle');
    } catch (err) {
      setGenerationError(
        talent.id,
        err instanceof Error ? err.message : 'Failed to generate character sheet'
      );
    } finally {
      setIsGenerating(talent.id, false);
    }
  }, [talent, providerId, headshotPrompt, setCharacterSheet, setIsGenerating, setGenerationError, setGenerationStep]);

  const handleSaveAll = useCallback(() => {
    if (characterSheet.length > 0) {
      onSaveAll(characterSheet);
    }
  }, [characterSheet, onSaveAll]);

  // Find image for each angle
  const getImageForAngle = (angle: CharacterSheetAngle) => {
    return characterSheet.find((img) => img.angle === angle);
  };

  return (
    <div className={`p-4 bg-surface rounded-lg border border-border ${!isHeadshotApproved ? 'opacity-50' : ''}`}>
      <h4 className="text-sm font-medium text-text-primary mb-4">
        Step 2: Generate Character Sheet
      </h4>

      {!isHeadshotApproved && (
        <p className="text-sm text-text-secondary mb-4">
          Approve a headshot first to unlock character sheet generation.
        </p>
      )}

      {/* Character Sheet Grid */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {ANGLE_ORDER.map((angle) => {
          const image = getImageForAngle(angle);
          const angleConfig = CHARACTER_SHEET_ANGLES[angle];
          const isCurrentlyGenerating =
            isGenerating &&
            generationStep === 'character-sheet' &&
            !image;

          return (
            <div key={angle} className="flex flex-col">
              <div className="w-full aspect-square bg-background rounded-lg border border-border flex items-center justify-center overflow-hidden">
                {isCurrentlyGenerating && characterSheet.length === ANGLE_ORDER.indexOf(angle) ? (
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                ) : image ? (
                  <img
                    src={image.url}
                    alt={`${angleConfig.label} view`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-2xl opacity-30">📷</div>
                )}
              </div>
              <p className="text-xs text-text-secondary text-center mt-1">
                {angleConfig.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Error Message */}
      {error && generationStep === 'character-sheet' && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-3">
        {characterSheet.length === 0 ? (
          <button
            onClick={handleGenerate}
            disabled={!isHeadshotApproved || isGenerating}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span>🎭</span>
            Generate 5-Angle Character Sheet
          </button>
        ) : (
          <>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-4 py-2 bg-surface border border-border text-text-primary rounded-lg hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>🔄</span>
              Regenerate All
            </button>
            <button
              onClick={handleSaveAll}
              disabled={isGenerating || characterSheet.length < 5}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>💾</span>
              Save All to Reference Images
            </button>
          </>
        )}
      </div>

      {/* Progress indicator */}
      {isGenerating && generationStep === 'character-sheet' && (
        <p className="mt-3 text-xs text-text-secondary text-center">
          Generating {characterSheet.length + 1} of 5 images...
        </p>
      )}
    </div>
  );
}
```

**Step 2: Verify the file compiles**

Run: `npm run build 2>&1 | head -30`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/talent/components/CharacterSheetGenerator.tsx
git commit -m "feat(talent): add CharacterSheetGenerator component"
```

---

## Task 7: Create TalentAIGenerationTab Component

**Files:**
- Create: `src/features/talent/components/TalentAIGenerationTab.tsx`

**Step 1: Create the main tab component**

```typescript
/**
 * TalentAIGenerationTab Component
 * Main tab for AI-powered headshot and character sheet generation
 */

import { useEffect, useCallback, useState } from 'react';
import type { UUID } from '../../../core/types/common';
import type { TalentProfile, TalentGeneratedImage, TalentAppearance } from '../../../core/types/talent';
import { useTalentStore, useTalentGenerationState } from '../store';
import { useProvidersForType } from '../../providers/store';
import { HeadshotGenerator } from './HeadshotGenerator';
import { CharacterSheetGenerator } from './CharacterSheetGenerator';
import { analyzeHeadshotImage, mergeAnalyzedAttributes } from '../services/talentVisionService';

interface TalentAIGenerationTabProps {
  talent: TalentProfile;
}

export function TalentAIGenerationTab({ talent }: TalentAIGenerationTabProps) {
  const imageProviders = useProvidersForType('image');
  const generationState = useTalentGenerationState(talent.id);
  const {
    initGenerationState,
    setGenerationProvider,
    setGenerationStep,
    setGenerationError,
    updateTalent,
    addReferenceImage,
  } = useTalentStore();

  const [showAttributeConfirm, setShowAttributeConfirm] = useState(false);
  const [detectedAttributes, setDetectedAttributes] = useState<Partial<TalentAppearance> | null>(null);

  // Initialize generation state when component mounts
  useEffect(() => {
    initGenerationState(talent.id);
  }, [talent.id, initGenerationState]);

  const selectedProviderId = generationState?.selectedProviderId || null;
  const headshot = generationState?.currentHeadshot;

  // Filter to only active providers
  const activeProviders = imageProviders.filter((p) => p.status === 'active');

  // Auto-select first provider if none selected
  useEffect(() => {
    if (!selectedProviderId && activeProviders.length > 0) {
      setGenerationProvider(talent.id, activeProviders[0].config.id);
    }
  }, [selectedProviderId, activeProviders, talent.id, setGenerationProvider]);

  const handleProviderChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setGenerationProvider(talent.id, e.target.value);
    },
    [talent.id, setGenerationProvider]
  );

  const handleHeadshotApprove = useCallback(async () => {
    if (!headshot) return;

    // Analyze the image to extract attributes
    setGenerationStep(talent.id, 'analyzing');
    
    try {
      const analysisResult = await analyzeHeadshotImage(headshot.url);
      
      if (analysisResult.success && Object.keys(analysisResult.attributes).length > 0) {
        // Get the attributes used in the prompt (from headshotGenerationService)
        // We'll approximate by using current appearance as "user set"
        const merged = mergeAnalyzedAttributes(
          talent.appearance, // user-set attributes
          {}, // We don't have prompt attributes separately stored, so empty
          analysisResult.attributes // vision-detected
        );
        
        setDetectedAttributes(merged);
        setShowAttributeConfirm(true);
      }
    } catch (err) {
      // Vision analysis is optional, don't block the flow
      console.warn('Vision analysis failed:', err);
    } finally {
      setGenerationStep(talent.id, 'idle');
    }
  }, [headshot, talent, setGenerationStep]);

  const handleConfirmAttributes = useCallback(
    (apply: boolean) => {
      if (apply && detectedAttributes) {
        // Update talent appearance with detected attributes
        updateTalent(talent.id, {
          appearance: {
            ...talent.appearance,
            ...detectedAttributes,
            hair: { ...talent.appearance.hair, ...detectedAttributes.hair },
            eyes: { ...talent.appearance.eyes, ...detectedAttributes.eyes },
            skin: { ...talent.appearance.skin, ...detectedAttributes.skin },
          },
        });
      }
      setShowAttributeConfirm(false);
      setDetectedAttributes(null);
    },
    [detectedAttributes, talent, updateTalent]
  );

  const handleSaveCharacterSheet = useCallback(
    (images: TalentGeneratedImage[]) => {
      // Add headshot as reference image first
      if (headshot) {
        addReferenceImage(talent.id, headshot.url, 'AI Generated Headshot');
      }

      // Add all character sheet images as reference images
      for (const image of images) {
        const caption = image.angle
          ? `Character Sheet - ${image.angle.replace('-', ' ')}`
          : 'Character Sheet';
        addReferenceImage(talent.id, image.url, caption);
      }
    },
    [talent.id, headshot, addReferenceImage]
  );

  if (activeProviders.length === 0) {
    return (
      <div className="space-y-4">
        <div className="p-6 bg-surface rounded-lg border border-border text-center">
          <div className="text-4xl mb-4">🔌</div>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            No Image Providers Configured
          </h3>
          <p className="text-sm text-text-secondary mb-4">
            To generate AI headshots, you need to configure an image generation provider
            like Flux Pro, Google Imagen, or OpenAI DALL-E.
          </p>
          <a
            href="/providers"
            className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Configure Providers
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <p className="text-sm text-text-secondary">
        Generate AI headshots and character sheets for this talent. The generated images
        will be saved as reference images.
      </p>

      {/* Provider Selection */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Image Provider
        </label>
        <select
          value={selectedProviderId || ''}
          onChange={handleProviderChange}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {activeProviders.map((provider) => (
            <option key={provider.config.id} value={provider.config.id}>
              {provider.config.displayName || provider.config.name}
            </option>
          ))}
        </select>
      </div>

      {/* Headshot Generator */}
      <HeadshotGenerator
        talent={talent}
        providerId={selectedProviderId}
        onApprove={handleHeadshotApprove}
      />

      {/* Character Sheet Generator */}
      <CharacterSheetGenerator
        talent={talent}
        providerId={selectedProviderId}
        headshotPrompt={headshot?.generationPrompt || ''}
        onSaveAll={handleSaveCharacterSheet}
      />

      {/* Attribute Confirmation Modal */}
      {showAttributeConfirm && detectedAttributes && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg border border-border p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-text-primary mb-4">
              Detected Appearance Attributes
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              We analyzed the generated headshot and detected these attributes.
              Would you like to apply them to the talent profile?
            </p>

            <div className="space-y-2 mb-6 p-4 bg-background rounded-lg">
              {detectedAttributes.gender && (
                <p className="text-sm">
                  <span className="text-text-secondary">Gender:</span>{' '}
                  <span className="text-text-primary">{detectedAttributes.gender}</span>
                </p>
              )}
              {detectedAttributes.age && (
                <p className="text-sm">
                  <span className="text-text-secondary">Age:</span>{' '}
                  <span className="text-text-primary">{detectedAttributes.age}</span>
                </p>
              )}
              {detectedAttributes.ethnicity && (
                <p className="text-sm">
                  <span className="text-text-secondary">Ethnicity:</span>{' '}
                  <span className="text-text-primary">{detectedAttributes.ethnicity}</span>
                </p>
              )}
              {detectedAttributes.hair?.color && (
                <p className="text-sm">
                  <span className="text-text-secondary">Hair:</span>{' '}
                  <span className="text-text-primary">
                    {[
                      detectedAttributes.hair.color,
                      detectedAttributes.hair.length,
                      detectedAttributes.hair.style,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </p>
              )}
              {detectedAttributes.eyes?.color && (
                <p className="text-sm">
                  <span className="text-text-secondary">Eyes:</span>{' '}
                  <span className="text-text-primary">
                    {[detectedAttributes.eyes.color, detectedAttributes.eyes.shape]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </p>
              )}
              {detectedAttributes.skin?.tone && (
                <p className="text-sm">
                  <span className="text-text-secondary">Skin:</span>{' '}
                  <span className="text-text-primary">
                    {[detectedAttributes.skin.tone, detectedAttributes.skin.texture]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </p>
              )}
              {detectedAttributes.distinguishingFeatures &&
                detectedAttributes.distinguishingFeatures.length > 0 && (
                  <p className="text-sm">
                    <span className="text-text-secondary">Features:</span>{' '}
                    <span className="text-text-primary">
                      {detectedAttributes.distinguishingFeatures.join(', ')}
                    </span>
                  </p>
                )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleConfirmAttributes(false)}
                className="flex-1 px-4 py-2 bg-surface border border-border text-text-primary rounded-lg hover:bg-background"
              >
                Skip
              </button>
              <button
                onClick={() => handleConfirmAttributes(true)}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Apply Attributes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify the file compiles**

Run: `npm run build 2>&1 | head -30`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/talent/components/TalentAIGenerationTab.tsx
git commit -m "feat(talent): add TalentAIGenerationTab component"
```

---

## Task 8: Integrate AI Generation Tab into TalentEditor

**Files:**
- Modify: `src/features/talent/components/TalentEditor.tsx`

**Step 1: Import the new tab component**

Add import after existing imports (around line 21):

```typescript
import { TalentAIGenerationTab } from './TalentAIGenerationTab';
```

**Step 2: Update activeTab type**

Change line 53-55 from:

```typescript
  const [activeTab, setActiveTab] = useState<
    'general' | 'appearance' | 'personality' | 'images' | 'prompts'
  >('general');
```

to:

```typescript
  const [activeTab, setActiveTab] = useState<
    'general' | 'appearance' | 'ai-generation' | 'personality' | 'images' | 'prompts'
  >('general');
```

**Step 3: Update tabs array**

Replace the tabs array in the JSX (lines 143-149) with:

```typescript
        {[
          { key: 'general', label: 'General', icon: '📋' },
          { key: 'appearance', label: 'Appearance', icon: '👁️' },
          ...(showPersonalityTab ? [{ key: 'ai-generation', label: 'AI Generation', icon: '🤖' }] : []),
          ...(showPersonalityTab ? [{ key: 'personality', label: 'Personality', icon: '🧠' }] : []),
          { key: 'images', label: 'Reference Images', icon: '🖼️' },
          { key: 'prompts', label: 'Prompt Fragments', icon: '✏️' },
        ].map((tab) => (
```

**Step 4: Add AI Generation tab content**

Add after the personality tab content block (after line 189):

```typescript
        {activeTab === 'ai-generation' && showPersonalityTab && (
          <TalentAIGenerationTab talent={talent} />
        )}
```

**Step 5: Verify the file compiles**

Run: `npm run build 2>&1 | head -30`
Expected: No errors

**Step 6: Commit**

```bash
git add src/features/talent/components/TalentEditor.tsx
git commit -m "feat(talent): integrate AI Generation tab into TalentEditor"
```

---

## Task 9: Export New Components

**Files:**
- Modify: `src/features/talent/index.ts`

**Step 1: Read current exports**

Check current contents and add exports for new components.

**Step 2: Add exports**

Add to the exports:

```typescript
export { TalentAIGenerationTab } from './components/TalentAIGenerationTab';
export { HeadshotGenerator } from './components/HeadshotGenerator';
export { CharacterSheetGenerator } from './components/CharacterSheetGenerator';
export * from './services/headshotGenerationService';
export * from './services/talentVisionService';
```

**Step 3: Verify exports compile**

Run: `npm run build 2>&1 | head -30`
Expected: No errors

**Step 4: Commit**

```bash
git add src/features/talent/index.ts
git commit -m "feat(talent): export AI generation components and services"
```

---

## Task 10: Final Verification

**Step 1: Run full build**

Run: `npm run build`
Expected: Build completes successfully

**Step 2: Run lint**

Run: `npm run lint`
Expected: No linting errors in new files

**Step 3: Manual test (if dev server available)**

Run: `npm run dev`
Then:
1. Navigate to Talent page
2. Create a new talent with type "person" or "character"
3. Open the talent editor
4. Verify "AI Generation" tab appears
5. Select a provider and test headshot generation

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(talent): complete AI headshot and character sheet generation feature"
```

---

## Summary

This implementation adds:
1. **Types** for generation state tracking
2. **Services** for prompt building and vision analysis
3. **Store actions** for managing generation state
4. **Components** for the two-step generation flow
5. **Integration** into the existing TalentEditor

The feature allows users to:
- Generate AI headshots from appearance attributes or randomly
- Regenerate with variation while keeping user-set attributes
- Analyze generated images to populate appearance fields
- Generate 5-angle character sheets after approving a headshot
- Save all generated images as reference images
