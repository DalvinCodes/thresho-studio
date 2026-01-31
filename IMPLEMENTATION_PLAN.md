# Thresho Studio - Updated Implementation Plan

**Updated:** January 31, 2025
**Status:** Phase 2 Provider System Complete, Planning Shot List Feature

---

## Summary of PRD Changes

### New Features (Addendum A)
1. **Shot List & Storyboard System** - Professional production planning workflow
2. **AI Shot Suggestions** - Generate complete shot sequences from text brief
3. **Equipment Presets** - Camera/lens combinations with prompt fragments
4. **Storyboard Export** - PDF, image sequence, CSV exports

### Provider Updates
- **Kimi K2.5** added as P0 text provider (OpenAI-compatible API)
- **Google Gemini** confirmed for text generation
- Provider matrix now includes 4 text, 3 image, 2 video providers

---

## Completed Work

### ✅ Phase 1: Foundation
- Core types (common, provider, prompt, brand, generation, asset, project)
- SQLite database with wa-sqlite + OPFS
- Zustand app store with persistence
- TanStack Query setup
- Basic app shell with navigation

### ✅ Phase 2: Provider System
- BaseAdapter abstract class
- 8 provider adapters:
  - Text: OpenAI, Anthropic, Gemini, Gemini Nano
  - Image: Flux Pro, Imagen 3, (DALL-E via OpenAI)
  - Video: Runway Gen-4, Veo 3
- Provider store with credential management
- ProviderSettings UI component
- Generation service for orchestration

---

## Remaining Implementation

### Phase 3: Prompt Template System (Days 6-8)
**Status:** Not Started

| Task | Priority | Complexity |
|------|----------|------------|
| Template types and database operations | P0 | Medium |
| Template store (Zustand) | P0 | Medium |
| TemplateLibrary component | P0 | Medium |
| TemplateEditor with Monaco | P0 | High |
| Version control (immutable versions) | P0 | Medium |
| Deployment labels (draft/staging/prod) | P1 | Low |
| Variable schema builder | P1 | Medium |
| Template preview with sample data | P1 | Medium |

### Phase 4: Brand Token System (Days 9-10)
**Status:** Not Started

| Task | Priority | Complexity |
|------|----------|------------|
| Brand profile types | P0 | Low |
| Brand store and service | P0 | Medium |
| Token injection utility | P0 | Medium |
| BrandEditor component | P0 | Medium |
| TokenEditor with preview | P1 | Medium |
| Default Thresho brand profile | P0 | Low |

### Phase 5: Generation Workflows (Days 11-14)
**Status:** Not Started

| Task | Priority | Complexity |
|------|----------|------------|
| XState generation workflow machine | P0 | High |
| Streaming text generation UI | P0 | Medium |
| Image generation with progress | P0 | Medium |
| Video generation async flow | P1 | Medium |
| Generation history tracking | P0 | Medium |
| Cost estimation display | P1 | Low |
| Re-generation from history | P1 | Medium |

### Phase 6: Asset Management (Days 15-17)
**Status:** Not Started

| Task | Priority | Complexity |
|------|----------|------------|
| Asset store with virtual scrolling | P0 | Medium |
| AssetGallery with TanStack Virtual | P0 | High |
| Asset metadata extraction | P0 | Medium |
| Asset operations (download, delete, tag) | P0 | Medium |
| Search and filtering | P1 | Medium |
| Bulk operations | P1 | Medium |
| Export workflows | P1 | Medium |

---

## NEW: Phase 7: Shot List & Storyboard (Days 18-24)
**Status:** Planning

This is a major feature addition that bridges pre-production planning with AI generation.

### 7.1 Core Shot List Types

```typescript
// New types to add: src/core/types/shotList.ts

export type FrameSize = 'wide' | 'full' | 'medium' | 'close-up' | 'extreme-close-up' | 'detail';
export type CameraAngle = 'eye-level' | 'low' | 'high' | 'dutch' | 'birds-eye' | 'worms-eye';
export type ShotStatus = 'planned' | 'generated' | 'approved' | 'rejected';

export interface Shot {
  id: UUID;
  shotListId: UUID;
  sequenceOrder: number;
  shotNumber: string;
  name: string;
  subject: string;
  setting: string;
  frameSize: FrameSize;
  camera: string;
  lens: string;
  angle: CameraAngle;
  movement: string;
  action: string;
  moodLighting: string;
  durationSeconds: number;
  notes: string;
  status: ShotStatus;
  autoPrompt: string | null;    // System-generated
  customPrompt: string | null;  // User override
  assetId: UUID | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ShotList {
  id: UUID;
  projectId: UUID;
  name: string;
  description: string;
  aspectRatio: string;
  defaultCamera: string;
  defaultLens: string;
  shots: Shot[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface EquipmentPreset {
  id: UUID;
  name: string;
  category: 'camera' | 'lens' | 'combo';
  specs: Record<string, unknown>;
  promptFragment: string;
  isSystem: boolean;
}
```

### 7.2 Database Schema Additions

```sql
-- Shot lists
CREATE TABLE shot_lists (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  name TEXT NOT NULL,
  description TEXT,
  aspect_ratio TEXT DEFAULT '16:9',
  default_camera TEXT,
  default_lens TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Individual shots
CREATE TABLE shots (
  id TEXT PRIMARY KEY,
  shot_list_id TEXT REFERENCES shot_lists(id),
  sequence_order INTEGER NOT NULL,
  shot_number TEXT,
  name TEXT,
  subject TEXT,
  setting TEXT,
  frame_size TEXT,
  camera TEXT,
  lens TEXT,
  angle TEXT,
  movement TEXT,
  action TEXT,
  mood_lighting TEXT,
  duration_seconds REAL,
  notes TEXT,
  status TEXT DEFAULT 'planned',
  auto_prompt TEXT,
  custom_prompt TEXT,
  asset_id TEXT REFERENCES assets(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Equipment presets
CREATE TABLE equipment_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  specs JSON,
  prompt_fragment TEXT,
  is_system INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);
```

### 7.3 Implementation Tasks

| Task | Priority | Complexity | Est. Hours |
|------|----------|------------|------------|
| Shot list types (`src/core/types/shotList.ts`) | P0 | Low | 2 |
| Database schema migration | P0 | Low | 1 |
| Shot list store (Zustand) | P0 | Medium | 4 |
| Shot list service (CRUD) | P0 | Medium | 3 |
| **Table View component** | P0 | High | 8 |
| - Sortable/resizable columns | | | |
| - Inline editing | | | |
| - Drag-to-reorder rows | | | |
| - Generate button per row | | | |
| **Storyboard View component** | P0 | High | 6 |
| - Card grid layout | | | |
| - Drag-to-reorder cards | | | |
| - Status indicators | | | |
| **Automatic prompt composition** | P0 | Medium | 4 |
| - Field-to-prompt assembly | | | |
| - Brand token injection | | | |
| - Equipment preset integration | | | |
| Equipment presets system | P1 | Low | 2 |
| Quick Generate per shot | P0 | Medium | 3 |
| Batch Generate (selected/all) | P1 | Medium | 2 |
| **AI Shot Suggestions (FR-7.7)** | P1 | High | 8 |
| - Project type templates | | | |
| - AI sequence generation | | | |
| - Shot enhancement suggestions | | | |
| CSV import for shots | P2 | Medium | 3 |
| **Storyboard Export (FR-8)** | P1 | Medium | 4 |
| - PDF generation | | | |
| - Image sequence export | | | |
| - CSV export | | | |

**Total Estimated: ~50 hours (6-7 days)**

### 7.4 UI Components to Build

```
src/features/shotList/
├── types.ts
├── store.ts
├── services/
│   ├── shotListService.ts
│   └── promptComposer.ts
├── hooks/
│   ├── useShotList.ts
│   ├── useShots.ts
│   └── usePromptComposer.ts
├── components/
│   ├── ShotListPage.tsx
│   ├── TableView/
│   │   ├── ShotTable.tsx
│   │   ├── ShotRow.tsx
│   │   ├── InlineEditor.tsx
│   │   └── ColumnHeader.tsx
│   ├── StoryboardView/
│   │   ├── StoryboardGrid.tsx
│   │   ├── ShotCard.tsx
│   │   └── CardDragLayer.tsx
│   ├── ShotEditor/
│   │   ├── ShotDetailPanel.tsx
│   │   ├── EquipmentSelector.tsx
│   │   └── PromptPreview.tsx
│   ├── GenerateActions/
│   │   ├── QuickGenerateButton.tsx
│   │   ├── BatchGenerateModal.tsx
│   │   └── GenerationProgress.tsx
│   └── Export/
│       ├── ExportModal.tsx
│       └── PDFGenerator.tsx
├── presets/
│   ├── cameras.ts
│   └── lenses.ts
└── index.ts
```

### 7.5 Prompt Composition Algorithm

```typescript
// src/features/shotList/services/promptComposer.ts

export function composePrompt(shot: Shot, brand?: BrandProfile): string {
  const parts: string[] = [];

  // 1. Frame size and subject
  if (shot.subject) {
    parts.push(`A ${shot.frameSize} shot of ${shot.subject}.`);
  }

  // 2. Action
  if (shot.action) {
    parts.push(shot.action);
  }

  // 3. Setting
  if (shot.setting) {
    parts.push(`Set in ${shot.setting}.`);
  }

  // 4. Camera and lens characteristics
  const cameraPreset = getCameraPreset(shot.camera);
  const lensPreset = getLensPreset(shot.lens);

  if (cameraPreset || lensPreset) {
    parts.push(`Shot ${shot.angle ? `at ${shot.angle}` : ''} on ${shot.camera || 'cinema camera'} with ${shot.lens || '50mm lens'}.`);
    if (cameraPreset?.promptFragment) parts.push(cameraPreset.promptFragment);
    if (lensPreset?.promptFragment) parts.push(lensPreset.promptFragment);
  }

  // 5. Movement
  if (shot.movement && shot.movement !== 'static') {
    parts.push(`Camera movement: ${shot.movement}.`);
  }

  // 6. Mood and lighting
  if (shot.moodLighting) {
    parts.push(shot.moodLighting);
  }

  // 7. Brand tokens
  if (brand) {
    const brandContext = `[Brand: ${brand.name} - ${brand.tokens.visual_style?.aesthetic || 'professional quality'}]`;
    parts.push(brandContext);
  }

  return parts.join(' ');
}
```

---

## Phase 8: App Shell & Pages (Days 25-27)

| Task | Priority | Complexity |
|------|----------|------------|
| Layout with responsive sidebar | P0 | Medium |
| Dashboard with stats | P0 | Medium |
| Generate page (unified) | P0 | High |
| Templates page | P0 | Medium |
| Assets page (gallery) | P0 | Medium |
| Shot Lists page | P0 | Medium |
| Brands page | P1 | Medium |
| Settings page | P0 | Medium |
| Keyboard shortcuts | P1 | Low |

---

## Missing Provider: Kimi K2.5

The PRD lists **Kimi K2.5** as a P0 text provider. Need to add this adapter.

```typescript
// src/features/providers/adapters/kimiAdapter.ts

// Kimi K2.5 uses OpenAI-compatible API
// 256K context window
// Good for agent orchestration
```

---

## Updated Timeline

| Phase | Days | Status |
|-------|------|--------|
| 1. Foundation | 1-2 | ✅ Complete |
| 2. Provider System | 3-5 | ✅ Complete |
| 3. Prompt Templates | 6-8 | 🔲 Not Started |
| 4. Brand Tokens | 9-10 | 🔲 Not Started |
| 5. Generation Workflows | 11-14 | 🔲 Not Started |
| 6. Asset Management | 15-17 | 🔲 Not Started |
| **7. Shot List & Storyboard** | 18-24 | 🔲 New Feature |
| 8. App Shell & Pages | 25-27 | 🔲 Not Started |
| 9. Polish & Testing | 28-30 | 🔲 Not Started |

**Total Estimated: ~30 working days for full MVP**

---

## Recommended Next Steps

1. **Add Kimi K2.5 adapter** - Quick win, OpenAI-compatible API
2. **Phase 3: Prompt Templates** - Core feature, enables Shot List
3. **Phase 4: Brand Tokens** - Enables brand-aware prompt composition
4. **Phase 7: Shot List** - Major new feature, high value

Or we can prioritize Shot List earlier if that's the primary focus.

---

## Questions for DJ

1. **Shot List Priority** - Should we implement Shot List (Phase 7) before Asset Management (Phase 6)?

2. **AI Shot Suggestions** - This requires LLM integration. Should we use a fixed provider (e.g., Gemini Flash for cost) or let users choose?

3. **Timeline View** - PRD marks this as "Future" - confirm we skip for MVP?

4. **Equipment Presets** - Should users be able to create custom presets, or system-only for MVP?

5. **Export to PDF** - Any specific library preference? Options: jsPDF, react-pdf, or html2pdf?
