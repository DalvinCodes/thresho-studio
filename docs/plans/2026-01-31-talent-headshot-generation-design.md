# Talent Headshot & Character Sheet Generation

**Date:** 2026-01-31  
**Status:** Ready for Implementation

## Overview

Add AI-powered headshot generation for person/character talents in Thresho Studio. Users can generate a headshot preview, regenerate until satisfied, then generate a 5-angle character sheet for reference images.

## User Flow

1. User creates or edits a talent with type `person` or `character`
2. In TalentEditor, a new "AI Generation" tab appears
3. User selects an image provider (Flux Pro, Imagen, DALL-E)
4. **Step 1 - Headshot:**
   - Click "Generate Headshot" to create initial preview
   - If appearance attributes exist → use them for prompt
   - If no attributes → generate random person
   - Click "Regenerate" for a new person (keeps user-set attributes, randomizes rest)
   - Click "Approve" when satisfied
5. **On Approval:**
   - Parse generation prompt for requested attributes
   - Use AI vision to analyze actual image
   - Merge and populate appearance fields
   - Show confirmation modal
6. **Step 2 - Character Sheet:**
   - Generate 5 full-body images: Front, Back, Left Profile, Right Profile, 3/4 View
   - Preview all 5 in a grid
   - Click "Save All to Reference Images" to persist

## Data Model

### New Types (`src/core/types/talent.ts`)

```typescript
interface TalentGeneratedImage {
  id: UUID;
  talentId: UUID;
  type: 'headshot' | 'character-sheet';
  angle?: 'front' | 'back' | 'left-profile' | 'right-profile' | 'three-quarter';
  url: string;
  thumbnailUrl?: string;
  generationPrompt: string;
  providerId: string;
  model: string;
  seed?: number;
  isApproved: boolean;
  createdAt: Timestamp;
}

interface TalentGenerationState {
  currentHeadshot: TalentGeneratedImage | null;
  characterSheet: TalentGeneratedImage[];
  isGenerating: boolean;
  generationStep: 'idle' | 'headshot' | 'analyzing' | 'character-sheet';
  error: string | null;
}
```

### Store Changes (`src/features/talent/store.ts`)

New state:
- `generationState: Record<UUID, TalentGenerationState>`

New actions:
- `generateHeadshot(talentId: UUID, providerId: string): Promise<void>`
- `regenerateHeadshot(talentId: UUID, providerId: string): Promise<void>`
- `approveHeadshot(talentId: UUID): Promise<void>`
- `generateCharacterSheet(talentId: UUID, providerId: string): Promise<void>`
- `saveGeneratedImages(talentId: UUID): Promise<void>`
- `clearGenerationState(talentId: UUID): void`

## Prompt Building

### Headshot Prompt Logic

```typescript
function buildHeadshotPrompt(talent: TalentProfile): { prompt: string; usedAttributes: Partial<TalentAppearance> } {
  const base = "Professional headshot portrait, neutral background, studio lighting, sharp focus, photorealistic";
  
  const attrs: string[] = [];
  const usedAttributes: Partial<TalentAppearance> = {};
  
  // Extract non-empty appearance values
  if (talent.appearance.gender) {
    attrs.push(talent.appearance.gender);
    usedAttributes.gender = talent.appearance.gender;
  }
  if (talent.appearance.age) {
    attrs.push(`${talent.appearance.age} years old`);
    usedAttributes.age = talent.appearance.age;
  }
  if (talent.appearance.ethnicity) {
    attrs.push(talent.appearance.ethnicity);
    usedAttributes.ethnicity = talent.appearance.ethnicity;
  }
  // ... hair, eyes, skin, etc.
  
  if (attrs.length === 0) {
    return { 
      prompt: `${base}, natural appearance`, 
      usedAttributes: {} 
    };
  }
  
  return { 
    prompt: `${base}, ${attrs.join(', ')}`, 
    usedAttributes 
  };
}
```

### Character Sheet Prompts

```typescript
const ANGLES = {
  'front': 'standing front view, T-pose or neutral stance, full body visible',
  'back': 'standing back view, full figure from behind, full body visible',
  'left-profile': 'left side profile view, standing, full body visible',
  'right-profile': 'right side profile view, standing, full body visible',
  'three-quarter': 'three-quarter view, slight angle, relaxed stance, full body visible',
} as const;

function buildCharacterSheetPrompts(baseDescription: string): Record<string, string> {
  const fullBodyBase = baseDescription
    .replace('headshot portrait', 'full body character reference')
    .replace('Professional headshot', 'Character reference sheet');
    
  return Object.fromEntries(
    Object.entries(ANGLES).map(([key, angleDesc]) => [
      key,
      `${fullBodyBase}, ${angleDesc}, white background, fashion photography style`
    ])
  );
}
```

## Vision Analysis

### Attribute Extraction

```typescript
async function analyzeHeadshotImage(
  imageUrl: string,
  providerId: string
): Promise<Partial<TalentAppearance>> {
  const systemPrompt = `You are an image analyst. Analyze the headshot and extract appearance attributes.`;
  
  const userPrompt = `Analyze this headshot and return a JSON object with these fields.
Use null for any attribute you cannot determine with confidence.

{
  "age": "estimated age range like '25-30' or 'mid 40s'",
  "gender": "male | female | non-binary",
  "ethnicity": "observed ethnicity",
  "hair": {
    "color": "hair color",
    "style": "hairstyle description",
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
  "distinguishingFeatures": ["array of notable features like glasses, beard, dimples, etc"]
}

Return ONLY valid JSON, no explanation.`;

  const response = await chatWithVision(providerId, systemPrompt, userPrompt, imageUrl);
  return JSON.parse(response);
}
```

### Attribute Merging

Priority order (highest to lowest):
1. User-explicitly-set attributes (before generation)
2. Attributes from generation prompt
3. Vision-detected attributes

```typescript
function mergeAttributes(
  userSet: Partial<TalentAppearance>,      // What user had set before generating
  fromPrompt: Partial<TalentAppearance>,   // What we included in prompt
  fromVision: Partial<TalentAppearance>    // What vision detected
): Partial<TalentAppearance> {
  return deepMerge(fromVision, fromPrompt, userSet);
}
```

## UI Components

### File Structure

```
src/features/talent/components/
├── TalentAIGenerationTab.tsx       # Main tab container
├── HeadshotGenerator.tsx           # Step 1 UI
├── CharacterSheetGenerator.tsx     # Step 2 UI  
└── AttributeConfirmationModal.tsx  # Detected attributes confirmation
```

### TalentAIGenerationTab

Main container managing:
- Provider selection dropdown (filtered to image-capable providers)
- Headshot generation step
- Character sheet generation step
- Loading/error states

### HeadshotGenerator

- Empty state with "Generate Headshot" button
- Preview state with image, "Regenerate" and "Approve" buttons
- Loading spinner during generation
- Error display with retry option

### CharacterSheetGenerator

- Disabled until headshot is approved
- "Generate Character Sheet" button
- 5-image grid with labels (Front, Back, L, R, 3/4)
- "Save All to Reference Images" button
- Individual image regenerate option (future enhancement)

### AttributeConfirmationModal

- Shows detected attributes in a readable format
- "Looks right" / "Adjust manually" options
- On confirm: updates talent appearance fields

## Integration Points

### TalentEditor Changes

Add "AI Generation" tab to tab list, conditionally rendered:

```typescript
const tabs = [
  { id: 'general', label: 'General' },
  { id: 'appearance', label: 'Appearance' },
  ...(talent.type === 'person' || talent.type === 'character' 
    ? [{ id: 'ai-generation', label: 'AI Generation' }] 
    : []),
  { id: 'personality', label: 'Personality' },
  { id: 'images', label: 'Reference Images' },
  { id: 'prompts', label: 'Prompts' },
];
```

### Provider Requirements

**For image generation:**
- Any adapter implementing `generateImage()`: Flux Pro, Imagen, DALL-E

**For vision analysis:**
- Any adapter implementing `chatWithVision()`: OpenAI (GPT-4o), Anthropic (Claude)
- Need to add `chatWithVision` method to adapters if not present

## Error Handling

- Provider not configured → Show setup instructions
- Generation failed → Show error with retry button
- Vision analysis failed → Skip auto-population, let user fill manually
- No vision-capable provider → Skip analysis, use prompt attributes only

## Future Enhancements (Not in Scope)

- Individual angle regeneration in character sheet
- Pose customization for character sheet
- LoRA training export from reference images
- Image-to-image variations using approved headshot
- Batch generation of multiple character options

## Implementation Order

1. Add types to `talent.ts`
2. Add generation state and actions to store
3. Create `headshotGenerationService.ts` with prompt building
4. Create `HeadshotGenerator.tsx` component
5. Create `TalentAIGenerationTab.tsx` and integrate into TalentEditor
6. Create `talentVisionService.ts` for attribute analysis
7. Create `AttributeConfirmationModal.tsx`
8. Create `CharacterSheetGenerator.tsx`
9. Add `saveGeneratedImages` action to persist to reference images
