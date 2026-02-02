# Shot Generation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add inline AI generation for shots with prompt builder, reference frames/assets selection, and concurrent batch generation capabilities.

**Architecture:** Extend the existing shot list feature with a ShotPromptService for prompt composition, add inline Generate buttons to the shot table rows, create a comprehensive GenerationPanel modal with reference frame/asset picker, and implement a batch generation queue using the existing generation store patterns.

**Tech Stack:** React 19, TypeScript, Zustand, existing generation infrastructure

---

## Task 1: Create ShotPromptService

**Files:**
- Create: `src/features/shotList/services/shotPromptService.ts`
- Modify: `src/features/shotList/index.ts`

**Step 1: Analyze existing TalentPromptService for patterns**

Read `src/features/talent/services/talentPromptService.ts` to understand:
- How prompts are composed
- How context is injected
- How the service integrates with generation

**Step 2: Create ShotPromptService**

```typescript
/**
 * Shot Prompt Service
 * Composes generation prompts for shots with reference frames and context
 */

import type { Shot, CreateShotInput } from '../../../core/types/shotList';
import type { Brand } from '../../../core/types/brand';
import type { TalentProfile } from '../../../core/types/talent';
import type { Asset } from '../../../core/types/asset';

export interface ShotGenerationContext {
  shot: Shot;
  brand?: Brand;
  talent?: TalentProfile[];
  referenceAssets?: Asset[];
  styleReference?: string;
  lightingReference?: string;
}

export interface ShotPromptResult {
  prompt: string;
  negativePrompt: string;
  systemPrompt?: string;
  metadata: {
    shotType: string;
    cameraMovement: string;
    lighting: string;
    aspectRatio: string;
    hasReferences: boolean;
  };
}

export function composeShotPrompt(context: ShotGenerationContext): ShotPromptResult {
  const { shot, brand, talent, referenceAssets } = context;
  
  // Build base prompt from shot details
  const parts: string[] = [];
  
  // Shot type and framing
  parts.push(formatShotType(shot.shotType));
  
  // Camera movement
  if (shot.cameraMovement && shot.cameraMovement !== 'static') {
    parts.push(`with ${formatCameraMovement(shot.cameraMovement)}`);
  }
  
  // Lighting
  if (shot.lighting) {
    parts.push(formatLighting(shot.lighting));
  }
  
  // Main subject/action from description
  parts.push(shot.description);
  
  // Location/context
  if (shot.location) {
    parts.push(`located in ${shot.location}`);
  }
  
  // Subjects
  if (shot.subjects && shot.subjects.length > 0) {
    parts.push(`featuring ${shot.subjects.join(', ')}`);
  }
  
  // Talent injection
  if (talent && talent.length > 0) {
    talent.forEach((t) => {
      if (t.visualPrompt) {
        parts.push(`talent: ${t.visualPrompt}`);
      }
    });
  }
  
  // Brand style injection
  if (brand?.visualIdentity?.stylePrompt) {
    parts.push(`style: ${brand.visualIdentity.stylePrompt}`);
  }
  
  // Compose final prompt
  const prompt = parts.filter(Boolean).join('. ') + '.';
  
  // Build negative prompt
  const negativeParts = [
    'blurry',
    'low quality',
    'distorted',
    'deformed',
    'extra limbs',
    'bad anatomy',
  ];
  
  if (shot.lighting === 'silhouette') {
    negativeParts.push('visible facial features');
  }
  
  return {
    prompt,
    negativePrompt: negativeParts.join(', '),
    metadata: {
      shotType: shot.shotType,
      cameraMovement: shot.cameraMovement || 'static',
      lighting: shot.lighting || 'natural',
      aspectRatio: shot.aspectRatio || '16:9',
      hasReferences: (referenceAssets?.length || 0) > 0,
    },
  };
}

function formatShotType(type: string): string {
  const typeMap: Record<string, string> = {
    'wide': 'wide establishing shot',
    'medium': 'medium shot',
    'close-up': 'close-up shot',
    'extreme-close': 'extreme close-up',
    'over-shoulder': 'over-the-shoulder shot',
    'pov': 'point-of-view shot',
    'aerial': 'aerial/drone shot',
    'low-angle': 'low angle shot',
    'high-angle': 'high angle shot',
    'dutch-angle': 'Dutch angle shot',
    'tracking': 'tracking shot',
    'static': 'static shot',
  };
  return typeMap[type] || type;
}

function formatCameraMovement(movement: string): string {
  return movement.replace(/-/g, ' ');
}

function formatLighting(lighting: string): string {
  const lightingMap: Record<string, string> = {
    'natural': 'natural lighting',
    'golden-hour': 'golden hour lighting',
    'blue-hour': 'blue hour lighting',
    'studio-three-point': 'studio three-point lighting',
    'high-key': 'high-key lighting',
    'low-key': 'low-key lighting',
    'silhouette': 'silhouette lighting',
  };
  return lightingMap[lighting] || lighting;
}

export function validateShotForGeneration(shot: Shot): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!shot.description || shot.description.length < 10) {
    errors.push('Shot description is too short (minimum 10 characters)');
  }
  
  if (!shot.shotType) {
    errors.push('Shot type is required');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
```

**Step 3: Export from shotList index**

Add to `src/features/shotList/index.ts`:
```typescript
export { composeShotPrompt, validateShotForGeneration } from './services/shotPromptService';
export type { ShotGenerationContext, ShotPromptResult } from './services/shotPromptService';
```

**Step 4: Run lint and commit**

```bash
npm run lint
```

```bash
git add src/features/shotList/services/shotPromptService.ts
git add src/features/shotList/index.ts
git commit -m "feat: create ShotPromptService for AI generation prompt composition"
```

---

## Task 2: Create ShotGenerationPanel Component

**Files:**
- Create: `src/features/shotList/components/ShotGenerationPanel.tsx`
- Modify: `src/features/shotList/index.ts`

**Step 1: Create the GenerationPanel component**

```typescript
/**
 * Shot Generation Panel
 * Modal for configuring and triggering AI generation for a shot
 */

import { useState, useCallback } from 'react';
import { X, Sparkles, AlertCircle, Image as ImageIcon, Check } from 'lucide-react';
import type { UUID } from '../../../core/types/common';
import type { Shot } from '../../../core/types/shotList';
import type { Brand } from '../../../core/types/brand';
import type { TalentProfile } from '../../../core/types/talent';
import type { Asset } from '../../../core/types/asset';
import { composeShotPrompt, validateShotForGeneration } from '../services/shotPromptService';
import { useBrandStore } from '../../brands';
import { useTalentStore } from '../../talent';
import { useAssetStore } from '../../assets';

interface ShotGenerationPanelProps {
  shot: Shot;
  onClose: () => void;
  onGenerate: (shotId: UUID, config: GenerationConfig) => void;
}

interface GenerationConfig {
  prompt: string;
  negativePrompt: string;
  referenceAssetIds?: UUID[];
  brandId?: UUID;
  talentIds?: UUID[];
  aspectRatio: string;
}

export function ShotGenerationPanel({ shot, onClose, onGenerate }: ShotGenerationPanelProps) {
  const brands = useBrandStore((state) => state.brands);
  const talents = useTalentStore((state) => state.talents);
  const assets = useAssetStore((state) => state.assets);
  
  const [selectedBrandId, setSelectedBrandId] = useState<UUID | undefined>(undefined);
  const [selectedTalentIds, setSelectedTalentIds] = useState<UUID[]>([]);
  const [selectedReferenceIds, setSelectedReferenceIds] = useState<UUID[]>([]);
  const [activeTab, setActiveTab] = useState<'prompt' | 'references' | 'settings'>('prompt');
  
  // Get selected objects
  const selectedBrand = selectedBrandId ? brands.get(selectedBrandId) : undefined;
  const selectedTalents = selectedTalentIds
    .map((id) => talents.get(id))
    .filter((t): t is TalentProfile => t !== undefined);
  const selectedReferences = selectedReferenceIds
    .map((id) => assets.get(id))
    .filter((a): a is Asset => a !== undefined);
  
  // Compose preview prompt
  const promptResult = composeShotPrompt({
    shot,
    brand: selectedBrand,
    talent: selectedTalents,
    referenceAssets: selectedReferences,
  });
  
  const validation = validateShotForGeneration(shot);
  
  const handleGenerate = useCallback(() => {
    if (!validation.valid) return;
    
    onGenerate(shot.id, {
      prompt: promptResult.prompt,
      negativePrompt: promptResult.negativePrompt,
      referenceAssetIds: selectedReferenceIds.length > 0 ? selectedReferenceIds : undefined,
      brandId: selectedBrandId,
      talentIds: selectedTalentIds.length > 0 ? selectedTalentIds : undefined,
      aspectRatio: shot.aspectRatio || '16:9',
    });
    
    onClose();
  }, [shot, promptResult, selectedReferenceIds, selectedBrandId, selectedTalentIds, validation.valid, onGenerate, onClose]);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Generate Shot</h3>
              <p className="text-sm text-text-secondary">{shot.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 border-b border-border">
          {(['prompt', 'references', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {!validation.valid && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-400">
                {validation.errors.map((err, i) => (
                  <p key={i}>{err}</p>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'prompt' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Prompt
                </label>
                <textarea
                  value={promptResult.prompt}
                  readOnly
                  rows={4}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-text-primary text-sm resize-none focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Negative Prompt
                </label>
                <textarea
                  value={promptResult.negativePrompt}
                  readOnly
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-text-secondary text-sm resize-none focus:outline-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Shot Type
                  </label>
                  <p className="text-sm text-text-secondary capitalize">{shot.shotType.replace(/-/g, ' ')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Aspect Ratio
                  </label>
                  <p className="text-sm text-text-secondary">{shot.aspectRatio || '16:9'}</p>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'references' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-3">
                  Brand Style
                </label>
                <select
                  value={selectedBrandId || ''}
                  onChange={(e) => setSelectedBrandId(e.target.value || undefined)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-text-primary text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">No brand</option>
                  {Array.from(brands.values()).map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-primary mb-3">
                  Talent
                </label>
                <div className="space-y-2">
                  {Array.from(talents.values()).map((talent) => (
                    <label
                      key={talent.id}
                      className="flex items-center gap-3 p-3 bg-background border border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTalentIds.includes(talent.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTalentIds([...selectedTalentIds, talent.id]);
                          } else {
                            setSelectedTalentIds(selectedTalentIds.filter((id) => id !== talent.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-border"
                      />
                      <div>
                        <p className="text-sm font-medium text-text-primary">{talent.name}</p>
                        {talent.visualPrompt && (
                          <p className="text-xs text-text-secondary truncate max-w-md">{talent.visualPrompt}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-primary mb-3">
                  Reference Images
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {Array.from(assets.values())
                    .filter((a) => a.type === 'image')
                    .map((asset) => (
                      <button
                        key={asset.id}
                        onClick={() => {
                          if (selectedReferenceIds.includes(asset.id)) {
                            setSelectedReferenceIds(selectedReferenceIds.filter((id) => id !== asset.id));
                          } else {
                            setSelectedReferenceIds([...selectedReferenceIds, asset.id]);
                          }
                        }}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                          selectedReferenceIds.includes(asset.id)
                            ? 'border-primary ring-2 ring-primary/30'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <img
                          src={asset.thumbnailUrl || asset.url}
                          alt={asset.name}
                          className="w-full h-full object-cover"
                        />
                        {selectedReferenceIds.includes(asset.id) && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <Check className="w-6 h-6 text-primary" />
                          </div>
                        )}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="p-4 bg-background rounded-xl">
                <h4 className="text-sm font-medium text-text-primary mb-2">Shot Configuration</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">Camera Movement:</dt>
                    <dd className="text-text-primary capitalize">{shot.cameraMovement?.replace(/-/g, ' ') || 'Static'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">Lighting:</dt>
                    <dd className="text-text-primary capitalize">{shot.lighting?.replace(/-/g, ' ') || 'Natural'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">Location:</dt>
                    <dd className="text-text-primary">{shot.location || 'Not specified'}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <div className="text-sm text-text-secondary">
            {selectedReferences.length > 0 && (
              <span>{selectedReferences.length} reference(s) selected</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={!validation.valid}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Generate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShotGenerationPanel;
```

**Step 2: Export from index**

Add to `src/features/shotList/index.ts`:
```typescript
export { ShotGenerationPanel } from './components/ShotGenerationPanel';
```

**Step 3: Run lint and commit**

```bash
npm run lint
```

```bash
git add src/features/shotList/components/ShotGenerationPanel.tsx
git add src/features/shotList/index.ts
git commit -m "feat: create ShotGenerationPanel with prompt preview and reference selection"
```

---

## Task 3: Add Generate Button to Shot Table Rows

**Files:**
- Modify: `src/features/shotList/components/EnhancedShotTable.tsx`

**Step 1: Add GenerationPanel import and state**

Add to imports:
```typescript
import { ShotGenerationPanel } from './ShotGenerationPanel';
```

Add state for generation panel:
```typescript
const [generationShotId, setGenerationShotId] = useState<UUID | null>(null);
```

**Step 2: Add Generate button to actions column**

In the Actions column (around line where other action buttons are):
```tsx
<button
  onClick={(e) => {
    e.stopPropagation();
    setGenerationShotId(shot.id);
  }}
  className="p-1.5 text-text-secondary hover:text-primary transition-colors"
  title="Generate with AI"
>
  <Sparkles className="w-4 h-4" />
</button>
```

Add Sparkles to imports from lucide-react.

**Step 3: Add GenerationPanel rendering**

After the table, render the panel when a shot is selected:
```tsx
{generationShotId && (
  <ShotGenerationPanel
    shot={shots.find((s) => s.id === generationShotId)!}
    onClose={() => setGenerationShotId(null)}
    onGenerate={(shotId, config) => {
      // Trigger generation via store
      // This will be implemented in Task 4
      console.log('Generate shot:', shotId, config);
    }}
  />
)}
```

**Step 4: Run lint and commit**

```bash
npm run lint
```

```bash
git add src/features/shotList/components/EnhancedShotTable.tsx
git commit -m "feat: add Generate button to shot table rows"
```

---

## Task 4: Create Batch Generation Feature

**Files:**
- Create: `src/features/shotList/components/BatchGenerationPanel.tsx`
- Modify: `src/features/shotList/components/ShotListView.tsx`
- Modify: `src/features/shotList/index.ts`

**Step 1: Create BatchGenerationPanel component**

```typescript
/**
 * Batch Generation Panel
 * Generate multiple shots concurrently
 */

import { useState, useCallback } from 'react';
import { X, Sparkles, Play, AlertCircle } from 'lucide-react';
import type { UUID } from '../../../core/types/common';
import type { Shot } from '../../../core/types/shotList';

interface BatchGenerationPanelProps {
  shots: Shot[];
  selectedShotIds: UUID[];
  onClose: () => void;
  onGenerateBatch: (shotIds: UUID[]) => void;
}

export function BatchGenerationPanel({ shots, selectedShotIds, onClose, onGenerateBatch }: BatchGenerationPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const selectedShots = shots.filter((s) => selectedShotIds.includes(s.id));
  const validShots = selectedShots.filter((s) => s.description && s.description.length >= 10);
  const invalidShots = selectedShots.filter((s) => !s.description || s.description.length < 10);
  
  const handleGenerate = useCallback(() => {
    if (validShots.length === 0) return;
    
    setIsGenerating(true);
    onGenerateBatch(validShots.map((s) => s.id));
    onClose();
  }, [validShots, onGenerateBatch, onClose]);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Batch Generate</h3>
              <p className="text-sm text-text-secondary">
                {selectedShots.length} shot{selectedShots.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {invalidShots.length > 0 && (
            <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-400">
                    {invalidShots.length} shot{invalidShots.length !== 1 ? 's' : ''} will be skipped
                  </p>
                  <p className="text-xs text-yellow-400/80 mt-1">
                    Shots need at least 10 characters in the description to generate.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            {selectedShots.map((shot) => {
              const isValid = shot.description && shot.description.length >= 10;
              return (
                <div
                  key={shot.id}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    isValid
                      ? 'bg-background border-border'
                      : 'bg-yellow-500/5 border-yellow-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-text-secondary w-8">{shot.shotNumber}</span>
                    <div>
                      <p className={`text-sm font-medium ${isValid ? 'text-text-primary' : 'text-yellow-400'}`}>
                        {shot.name}
                      </p>
                      {!isValid && (
                        <p className="text-xs text-yellow-400/80">Description too short</p>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-text-secondary capitalize">
                    {shot.shotType.replace(/-/g, ' ')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <div className="text-sm text-text-secondary">
            {validShots.length > 0 ? (
              <span>Ready to generate {validShots.length} shot{validShots.length !== 1 ? 's' : ''}</span>
            ) : (
              <span className="text-yellow-400">No valid shots to generate</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={validShots.length === 0 || isGenerating}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-4 h-4" />
              {isGenerating ? 'Generating...' : `Generate ${validShots.length}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BatchGenerationPanel;
```

**Step 2: Add batch generation button to ShotListView**

In ShotListView header (next to "+ Add Multiple"):
```tsx
<button
  onClick={() => setIsBatchGenerationOpen(true)}
  disabled={selectedShots.size === 0}
  className="px-4 py-2 border border-border text-text-primary rounded-3xl hover:bg-surface-raised transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
>
  Generate Selected ({selectedShots.size})
</button>
```

Add state and render BatchGenerationPanel:
```typescript
const [isBatchGenerationOpen, setIsBatchGenerationOpen] = useState(false);
```

**Step 3: Export and commit**

```bash
git add src/features/shotList/components/BatchGenerationPanel.tsx
git add src/features/shotList/components/ShotListView.tsx
git add src/features/shotList/index.ts
git commit -m "feat: add batch generation for multiple shots"
```

---

## Task 5: Integrate with Generation Store

**Files:**
- Modify: `src/features/shotList/store.ts`
- Modify: `src/features/shotList/components/ShotListView.tsx`
- Modify: `src/features/shotList/components/EnhancedShotTable.tsx`

**Step 1: Add generation actions to shot list store**

Add to store interface:
```typescript
// Generation
queueShotGeneration: (shotId: UUID, config: GenerationConfig) => void;
queueBatchGeneration: (shotIds: UUID[], baseConfig?: Partial<GenerationConfig>) => void;
updateShotGenerationStatus: (shotId: UUID, status: GenerationStatus) => void;
```

Implement the actions using the existing generation infrastructure.

**Step 2: Update ShotListView to handle generation**

Connect the Generate button and BatchGenerationPanel to the store actions.

**Step 3: Add generation status indicators to table**

Show loading spinner, progress, or completion status on each row during generation.

**Step 4: Commit**

```bash
git add src/features/shotList/store.ts
git add src/features/shotList/components/ShotListView.tsx
git add src/features/shotList/components/EnhancedShotTable.tsx
git commit -m "feat: integrate shot generation with generation store"
```

---

## Task 6: Run Final Verification

```bash
npm run lint
npm run build
```

Verify all features work:
- [ ] Click Generate button on shot row opens GenerationPanel
- [ ] Prompt preview shows composed prompt
- [ ] Can select brand, talent, and reference images
- [ ] Batch generation works with multiple selected shots
- [ ] Generation status shows in table

---

## Summary

This implementation adds:
1. **ShotPromptService** - Composes AI generation prompts from shot details + brand + talent
2. **ShotGenerationPanel** - Modal with prompt preview, brand/talent/reference selection
3. **Generate button** on each shot row
4. **BatchGenerationPanel** - Generate multiple shots concurrently
5. **Status indicators** - Show generation progress in table

The flow matches the Talent generation pattern but adds shot-specific context like camera movement, lighting, and reference frames.
