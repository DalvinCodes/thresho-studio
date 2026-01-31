# Feature Request: Talent & Asset Library

**Feature ID:** TS-FR-001  
**Created:** January 31, 2025  
**Author:** DJ (CEO/CTO)  
**Status:** Draft  
**Target Release:** Phase 2

---

## Summary

Thresho Studio needs a persistent Talent & Asset Library that maintains visual consistency across generations. Users define reusable assets (human talent, environments, props, lighting setups, camera/lens profiles) with reference materials, then invoke those assets in generation prompts with per-shot context instructions.

---

## Problem Statement

**Current Pain Points:**

1. **Inconsistent characters** - Generating the same person across multiple shots produces different faces, body types, clothing. No continuity for campaigns or narratives.

2. **Lost context** - Reference images used in one generation aren't systematically captured for reuse. Teams re-describe assets from scratch each time.

3. **No asset organization** - Environments, props, lighting setups exist only in prompt text. No structured library to browse, search, or reuse.

4. **Manual prompt engineering** - Achieving consistency requires copy-pasting detailed descriptions and reference URLs. Error-prone and time-consuming.

**Desired Outcome:**

Select "Talent: Marcus (Lead Barber)" from a dropdown, specify "standing in Environment: Downtown Shop, lighting: Golden Hour Soft, action: trimming client's fade" and generate consistent imagery every time.

---

## User Stories

### US-1: Create Talent Profile
**As a** creative director  
**I want to** create a talent profile with headshot and character reference sheet  
**So that** I can generate consistent images of the same person across my campaign

### US-2: Build Environment Asset
**As a** marketing manager  
**I want to** save environment references (photos, descriptions, mood boards)  
**So that** my generated images maintain consistent settings across shots

### US-3: Reference Talent in Shot
**As a** user generating from a shot list  
**I want to** select talent from my library and specify what they're doing  
**So that** the generated image features that specific person with my action/context

### US-4: Reuse Across Projects
**As a** creative director  
**I want to** access talent created in previous projects  
**So that** I can maintain character continuity across campaigns

### US-5: Import Reference on the Fly
**As a** user mid-generation  
**I want to** quickly add a new talent or asset without leaving the generate flow  
**So that** I don't lose my creative momentum

---

## Functional Requirements

### FR-1: Asset Taxonomy

#### FR-1.1: Asset Categories

System SHALL support the following top-level asset categories:

| Category | Description | Key Attributes |
|----------|-------------|----------------|
| **Talent** | Human characters | Headshot, character sheet, physical description, wardrobe, persona |
| **Environment** | Locations and settings | Reference images, description, lighting conditions, mood |
| **Props** | Objects and items | Reference images, description, scale, material |
| **Wardrobe** | Clothing and accessories | Reference images, style description, colors, fit |
| **Lighting** | Lighting setups | Reference images, technical description, mood, equipment |
| **Camera** | Camera and lens profiles | Specs, look description, example images |
| **Style** | Visual style references | Mood boards, color palettes, texture references |

#### FR-1.2: Custom Categories
- System SHALL allow users to create custom asset categories
- System SHALL support category hierarchy (e.g., Talent > Lead Cast > Supporting)
- System SHALL support category-specific attribute schemas

---

### FR-2: Talent Profiles

#### FR-2.1: Talent Data Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **Name** | Text | Yes | Character/talent name |
| **Slug** | Text | Auto | URL-safe identifier for prompt reference |
| **Headshot** | Image | Yes | Primary face reference (square crop recommended) |
| **Character Sheet** | Image[] | Yes | 6-8 reference images showing full body, multiple angles |
| **Physical Description** | Text | Yes | Detailed physical attributes for prompt injection |
| **Age Range** | Text | No | Apparent age (e.g., "mid-30s") |
| **Ethnicity** | Text | No | For accurate representation |
| **Build** | Enum | No | Slim, Athletic, Average, Muscular, Plus |
| **Hair** | Text | No | Style, color, length |
| **Distinguishing Features** | Text | No | Tattoos, scars, glasses, etc. |
| **Default Wardrobe** | Text | No | Typical clothing style |
| **Persona** | Text | No | Personality traits affecting expression/posture |
| **Voice Notes** | Text | No | For video/animation guidance |
| **Tags** | Text[] | No | Searchable tags |
| **Source** | Enum | No | AI Generated, Stock, Original Photography, Composite |

#### FR-2.2: Character Sheet Requirements
- System SHALL accept 6-8 images for character reference sheet
- System SHALL display images in standardized grid layout
- Recommended views: Front face, Profile left, Profile right, Full body front, Full body back, 3/4 angle, Action pose, Expression variation
- System SHALL generate composite reference image for provider submission

#### FR-2.3: Talent Generation Helper
- System SHALL offer AI-assisted talent creation
- User provides: basic description, intended use, style preferences
- System generates: headshot options, then character sheet from selected headshot
- System SHALL use consistent seed/reference techniques per provider

---

### FR-3: Environment Assets

#### FR-3.1: Environment Data Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **Name** | Text | Yes | Environment name |
| **Slug** | Text | Auto | URL-safe identifier |
| **Primary Reference** | Image | Yes | Main reference image |
| **Reference Gallery** | Image[] | No | Additional angles, details, variations |
| **Description** | Text | Yes | Detailed environment description for prompts |
| **Location Type** | Enum | No | Interior, Exterior, Studio, Mixed |
| **Time of Day** | Enum | No | Dawn, Morning, Midday, Afternoon, Golden Hour, Dusk, Night |
| **Weather/Atmosphere** | Text | No | Sunny, Overcast, Rainy, Foggy, etc. |
| **Key Elements** | Text | No | Notable features (exposed brick, neon signs, etc.) |
| **Color Palette** | Color[] | No | Dominant colors extracted or specified |
| **Default Lighting** | Ref | No | Link to Lighting asset |
| **Tags** | Text[] | No | Searchable tags |

---

### FR-4: Lighting Assets

#### FR-4.1: Lighting Data Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **Name** | Text | Yes | Lighting setup name |
| **Slug** | Text | Auto | URL-safe identifier |
| **Reference Images** | Image[] | Yes | Example images showing this lighting |
| **Description** | Text | Yes | How to describe in prompts |
| **Technical Setup** | Text | No | Equipment and positioning (for reference) |
| **Mood** | Text | No | Emotional quality (dramatic, soft, harsh, etc.) |
| **Key Light** | Text | No | Primary light source description |
| **Fill/Ambient** | Text | No | Secondary lighting description |
| **Color Temperature** | Text | No | Warm, Cool, Neutral, Mixed |
| **Shadows** | Enum | No | Soft, Hard, Minimal, Dramatic |
| **Tags** | Text[] | No | Searchable tags |

**System Presets:**

| Preset | Description |
|--------|-------------|
| Golden Hour Soft | Warm backlight, soft shadows, lens flare potential |
| Studio High Key | Bright, minimal shadows, clean commercial look |
| Studio Low Key | Dramatic shadows, moody, single key light |
| Natural Window | Soft directional light, realistic interior |
| Overcast Flat | Even diffused light, no harsh shadows |
| Neon Night | Colored practical lights, urban night mood |
| Rembrandt | Classic portrait lighting, triangle shadow |
| Ring Light | Even frontal, catch lights, beauty/social style |

---

### FR-5: Asset Library Management

#### FR-5.1: Library Hierarchy

```
Global Asset Library (all projects)
└── Project Asset Library (project-specific)
    └── Shot List Asset References (per-shot usage)
```

- Assets created in a project live in Project Library by default
- User can promote assets to Global Library for cross-project use
- Global assets can be imported into any project
- Deleting project does not delete promoted global assets

#### FR-5.2: Library Views

**Grid View**
- Thumbnail cards with name, category badge
- Hover shows preview and key attributes
- Click opens detail panel
- Filter by category, tags, source, date
- Search by name, description, tags

**List View**
- Sortable columns: Name, Category, Created, Last Used, Usage Count
- Inline preview on row hover
- Bulk selection for operations

**Detail View**
- Full asset information
- Reference images in gallery
- Usage history (which shots/generations used this asset)
- Edit and delete actions
- Duplicate to new asset

#### FR-5.3: Quick Add Flow
- System SHALL support adding assets without leaving generation context
- Trigger: "Add New Talent" / "Add New Environment" from asset selector
- Modal collects minimum required fields
- Asset created and immediately selectable
- Full detail editing available later

---

### FR-6: Asset Usage in Generation

#### FR-6.1: Asset Selection UI

In generation flow (standalone or shot list), user can:
- Select Talent (multi-select for group shots)
- Select Environment
- Select Lighting
- Select Props (multi-select)
- Select Camera/Lens profile
- Select Style reference

Each selection shows thumbnail preview and allows quick-swap.

#### FR-6.2: Per-Generation Context

For each selected asset, user provides context:

**Talent Context Fields:**
| Field | Type | Description |
|-------|------|-------------|
| Action | Text | What are they doing? |
| Expression | Text | Emotional state, facial expression |
| Position | Text | Where in frame, body position |
| Wardrobe Override | Text | Different clothing than default |
| Interaction | Text | Interacting with props, other talent, environment |

**Environment Context Fields:**
| Field | Type | Description |
|-------|------|-------------|
| Area/Section | Text | Which part of environment (e.g., "near the window") |
| Time Override | Enum | Different time of day than default |
| Weather Override | Text | Different conditions |
| Modifications | Text | Temporary changes (e.g., "decorated for holiday") |

#### FR-6.3: Prompt Assembly with Assets

System assembles final prompt by combining:
1. Asset base descriptions (from library)
2. Per-generation context (user input)
3. Shot specifications (if from shot list)
4. Brand tokens (from profile)
5. Provider-specific formatting

**Example Assembly:**

Selected Assets:
- Talent: "Marcus" (Lead Barber)
- Environment: "Downtown Shop"
- Lighting: "Golden Hour Soft"

User Context:
- Action: "carefully fading a client's hairline"
- Expression: "focused, slight smile"
- Position: "medium shot, facing camera at 3/4 angle"

Assembled Prompt:
```
A medium shot of Marcus, a Black male barber in his mid-30s with a confident presence, short fade haircut, and well-groomed beard, wearing a black apron over a crisp white t-shirt. He is carefully fading a client's hairline, his expression focused with a slight smile, positioned facing the camera at a 3/4 angle. Set in Downtown Shop, a modern barbershop interior with exposed brick walls, vintage barber chairs, warm wood accents, and large storefront windows. Golden hour soft lighting with warm backlight streaming through windows, soft shadows, subtle lens flare. Cinematic quality, photorealistic, shallow depth of field. [Brand: Thresho - premium editorial, authentic not stock]
```

#### FR-6.4: Reference Image Handling

System SHALL submit reference images to providers that support them:

| Provider | Reference Method | Notes |
|----------|-----------------|-------|
| Flux Pro | Image prompt / Redux | Style and subject reference |
| Midjourney | --cref, --sref URLs | Character and style reference |
| DALL-E 3 | Text description only | No image reference support |
| Runway | Input image | For image-to-video |
| Kling | Input image | For image-to-video |

System SHALL adapt reference strategy per provider capability.

---

### FR-7: Asset Consistency Techniques

#### FR-7.1: Provider-Specific Consistency

**Flux Pro:**
- Use Flux Redux for style/subject transfer
- Store and reuse seed values
- Consider LoRA training for high-usage talent (future)

**Midjourney:**
- Store image URLs for --cref (character reference)
- Store image URLs for --sref (style reference)
- Document --cw (character weight) settings per talent

**DALL-E 3:**
- Detailed text descriptions only
- Maintain canonical description per asset
- No image reference capability

#### FR-7.2: Consistency Scoring (Future)
- System SHALL compare generated images against reference
- Flag significant deviations for review
- Track consistency metrics per talent over time

---

### FR-8: Asset Import/Export

#### FR-8.1: Import Sources
- Local file upload (images)
- URL import (with download)
- Clipboard paste
- Generated image promotion (from generation history)
- Bulk import from folder

#### FR-8.2: Export Options
- Single asset as ZIP (all references + metadata JSON)
- Category export
- Full library export
- Share link (future, for collaboration)

---

## Database Schema

```sql
-- Asset categories
CREATE TABLE asset_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id TEXT REFERENCES asset_categories(id),
  schema JSON,  -- Custom fields for this category
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_system INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Core assets table
CREATE TABLE assets_library (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES asset_categories(id),
  project_id TEXT REFERENCES projects(id),  -- NULL = global
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  primary_image_path TEXT,
  attributes JSON NOT NULL,  -- Category-specific attributes
  tags JSON,
  source TEXT CHECK(source IN ('ai_generated', 'stock', 'original', 'composite', 'reference')),
  is_global INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  last_used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, slug)
);

-- Asset reference images
CREATE TABLE asset_images (
  id TEXT PRIMARY KEY,
  asset_id TEXT REFERENCES assets_library(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  image_type TEXT CHECK(image_type IN ('headshot', 'character_sheet', 'reference', 'example', 'mood')),
  sort_order INTEGER DEFAULT 0,
  caption TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Talent-specific extended data
CREATE TABLE talent_profiles (
  asset_id TEXT PRIMARY KEY REFERENCES assets_library(id) ON DELETE CASCADE,
  physical_description TEXT NOT NULL,
  age_range TEXT,
  ethnicity TEXT,
  build TEXT,
  hair TEXT,
  distinguishing_features TEXT,
  default_wardrobe TEXT,
  persona TEXT,
  voice_notes TEXT
);

-- Environment-specific extended data
CREATE TABLE environment_profiles (
  asset_id TEXT PRIMARY KEY REFERENCES assets_library(id) ON DELETE CASCADE,
  location_type TEXT,
  time_of_day TEXT,
  weather_atmosphere TEXT,
  key_elements TEXT,
  color_palette JSON,
  default_lighting_id TEXT REFERENCES assets_library(id)
);

-- Lighting-specific extended data
CREATE TABLE lighting_profiles (
  asset_id TEXT PRIMARY KEY REFERENCES assets_library(id) ON DELETE CASCADE,
  technical_setup TEXT,
  mood TEXT,
  key_light TEXT,
  fill_ambient TEXT,
  color_temperature TEXT,
  shadow_type TEXT
);

-- Asset usage tracking
CREATE TABLE asset_usage (
  id TEXT PRIMARY KEY,
  asset_id TEXT REFERENCES assets_library(id),
  generation_record_id TEXT REFERENCES generation_records(id),
  shot_id TEXT REFERENCES shots(id),
  context_data JSON,  -- Per-use context (action, expression, etc.)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Prompt fragments per asset (provider-specific)
CREATE TABLE asset_prompt_fragments (
  id TEXT PRIMARY KEY,
  asset_id TEXT REFERENCES assets_library(id) ON DELETE CASCADE,
  provider_id TEXT,  -- NULL = universal
  fragment_type TEXT CHECK(fragment_type IN ('base', 'style', 'technical')),
  fragment_text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## UI Specifications

### Library Browser

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Asset Library                                    [+ New Asset ▼] [Import]   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Scope: [Global ▼] [Project: Q1 Campaign]                                    │
│ Category: [All ▼] [Talent] [Environment] [Lighting] [Props] [...]          │
│ Search: [________________________] [Tags ▼]                    [Grid][List] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │              │  │              │  │              │  │              │   │
│  │  [HEADSHOT]  │  │  [HEADSHOT]  │  │  [ENV IMG]   │  │  [LIGHT EX]  │   │
│  │              │  │              │  │              │  │              │   │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤   │
│  │ Marcus       │  │ Sofia        │  │ Downtown     │  │ Golden Hour  │   │
│  │ 👤 Talent    │  │ 👤 Talent    │  │ 🏠 Environment│  │ 💡 Lighting  │   │
│  │ Used: 24x    │  │ Used: 18x    │  │ Used: 31x    │  │ Used: 45x    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Talent Detail View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← Back to Library                                        [Edit] [Duplicate] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐   MARCUS                                                   │
│  │             │   Lead Barber Character                                    │
│  │  [HEADSHOT] │   ─────────────────────────────────────────────────────   │
│  │             │   Category: Talent                                         │
│  │             │   Source: AI Generated                                     │
│  └─────────────┘   Created: Jan 15, 2025                                    │
│                    Usage: 24 generations                                    │
│                                                                             │
│  Character Reference Sheet                                                  │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐         │
│  │Front│ │L Pro│ │R Pro│ │ Full│ │ Back│ │ 3/4 │ │Action│ │Expr │         │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘         │
│                                                                             │
│  Physical Description                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Black male, mid-30s, confident presence. Short fade haircut with    │   │
│  │ precise line-up, well-groomed full beard. Athletic build, 5'11".    │   │
│  │ Warm brown eyes, genuine smile. Small tattoo on right forearm.      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Attributes                                                                 │
│  ┌────────────────┬────────────────┬────────────────┬────────────────┐     │
│  │ Age: Mid-30s   │ Build: Athletic│ Hair: Short    │ Ethnicity:     │     │
│  │                │                │ Fade           │ Black          │     │
│  └────────────────┴────────────────┴────────────────┴────────────────┘     │
│                                                                             │
│  Default Wardrobe                                                           │
│  Black barber apron over crisp white t-shirt, dark jeans, clean sneakers   │
│                                                                             │
│  Persona                                                                    │
│  Professional but warm, puts clients at ease, confident without arrogance  │
│                                                                             │
│  Tags: #barber #lead-cast #male #professional                              │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────     │
│  Recent Usage                                           [View All →]        │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                                  │
│  │gen 1│ │gen 2│ │gen 3│ │gen 4│ │gen 5│                                  │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                                  │
│                                                                             │
│  [Use in Generation]                              [Promote to Global]       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Asset Selector (in Generation Flow)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Select Talent                                              [+ Add New]      │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Search talent...]                                [Project ▼] [Global ▼]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                        │
│  │[MARCUS] │  │ [SOFIA] │  │ [JAMES] │  │ [ELENA] │                        │
│  │ ○       │  │ ○       │  │ ○       │  │ ○       │                        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘                        │
│   Marcus       Sofia        James        Elena                              │
│                                                                             │
│  Selected: Marcus                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ What is Marcus doing?                                               │   │
│  │ [trimming a client's fade with precision_________________________]  │   │
│  │                                                                     │   │
│  │ Expression:        Position:              Wardrobe Override:        │   │
│  │ [focused, slight   [medium shot, 3/4     [_____________________]    │   │
│  │  concentration]     angle to camera]                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                            [Cancel]  [Confirm Selection]    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Assets created per project | Avg 5+ |
| Talent reuse rate | > 60% of generations reference library talent |
| Character consistency rating (user feedback) | > 4/5 |
| Time to add new talent | < 3 minutes |
| Library search success rate | > 80% find asset on first search |

---

## Dependencies

- **Shot List Feature** (Addendum A) - Asset selector integrates into shot list rows
- **Generation Workflow** (FR-4) - Asset context feeds into prompt assembly
- **Brand Tokens** (FR-3) - Brand profile applied alongside asset descriptions

---

## Decisions

1. **AI-assisted talent creation** - DECIDED: Yes. See FR-9 below.

2. **LoRA training integration** - DECIDED: Yes. See FR-10 below.

3. **Real person rights** - DECIDED: No. No consent/rights management features. Users are responsible for ensuring they have rights to any uploaded imagery.

4. **Asset versioning** - DECIDED: Yes. See FR-11 below.

---

## FR-9: AI Talent Creation Wizard

### FR-9.1: Wizard Flow

System SHALL provide a guided wizard to generate consistent talent from scratch:

**Step 1: Description Input**
- User provides text description of desired character
- Optional: Upload inspiration image (mood, not literal reference)
- Select intended use context (lead cast, background, specific industry)

**Step 2: Headshot Generation**
- System generates 4-6 headshot options
- User selects preferred option or requests regeneration
- System locks seed value for selected headshot

**Step 3: Character Sheet Generation**
- System generates 6-8 reference views using locked seed/reference
- Views: Front face, Profile left, Profile right, Full body front, Full body back, 3/4 angle, Action pose, Expression variation
- User can regenerate individual views while maintaining consistency
- System uses provider-specific consistency techniques (--cref, Redux, seed locking)

**Step 4: Profile Completion**
- System auto-generates physical description from images (via vision model)
- User reviews and edits description
- User adds metadata (name, persona, wardrobe, tags)

**Step 5: Confirmation**
- Preview complete talent profile
- Save to project or global library

### FR-9.2: Consistency Techniques by Provider

| Provider | Headshot → Sheet Method |
|----------|------------------------|
| Flux Pro | Use Flux Redux with headshot as style/subject reference + consistent seed |
| Midjourney | Upload headshot, use --cref with high --cw (character weight) |
| DALL-E 3 | Generate detailed description from headshot via GPT-4V, use description for all views |

### FR-9.3: Regeneration Controls
- System SHALL allow regenerating single views without affecting others
- System SHALL maintain reference linkage across regenerations
- System SHALL track generation lineage for all wizard outputs

---

## FR-10: LoRA Training Export

### FR-10.1: Export Package

For high-usage talent requiring maximum consistency, system SHALL export training-ready packages:

**Export Contents:**
- All reference images (headshot + character sheet)
- Recommended captions/tags per image
- Training configuration recommendations (steps, learning rate, etc.)
- Metadata JSON with talent attributes

**Export Formats:**
| Format | Target Platform |
|--------|-----------------|
| Standard ZIP | Generic (Kohya, EveryDream) |
| Replicate Format | Replicate SDXL LoRA training |
| Civitai Format | Civitai LoRA upload |

### FR-10.2: Training Guidance
- System SHALL provide documentation on training workflows
- System SHALL recommend minimum image count (10-20 for quality LoRA)
- System SHALL suggest augmentation if character sheet is insufficient
- System SHALL warn about overfitting risks with low image counts

### FR-10.3: LoRA Import (Future)
- System SHALL support importing trained LoRA files
- System SHALL link LoRA to talent profile
- System SHALL use LoRA automatically when talent is selected (provider permitting)

---

## FR-11: Asset Versioning

### FR-11.1: Version Model

Assets SHALL support semantic versioning:

```
Marcus v1.0 (Original)
Marcus v1.1 (Updated wardrobe)
Marcus v2.0 (New haircut - breaking change)
```

**Version Types:**
- **Patch (x.x.1)**: Metadata changes only (description, tags)
- **Minor (x.1.x)**: Non-breaking visual updates (wardrobe, accessories)
- **Major (x.0.0)**: Breaking visual changes (different hairstyle, aged, significant appearance change)

### FR-11.2: Version Data Schema

```sql
-- Add to assets_library table
ALTER TABLE assets_library ADD COLUMN version TEXT DEFAULT '1.0.0';
ALTER TABLE assets_library ADD COLUMN parent_version_id TEXT REFERENCES assets_library(id);
ALTER TABLE assets_library ADD COLUMN is_latest INTEGER DEFAULT 1;
ALTER TABLE assets_library ADD COLUMN version_notes TEXT;
```

### FR-11.3: Version Operations

| Operation | Behavior |
|-----------|----------|
| **Create New Version** | Duplicates asset with incremented version, links to parent |
| **View History** | Shows all versions in chronological order |
| **Compare Versions** | Side-by-side view of two versions |
| **Restore Version** | Creates new version from historical state |
| **Set Active** | Marks which version is used by default in new generations |

### FR-11.4: Version Selection in Generation

- By default, system uses latest active version
- User can explicitly select historical version from dropdown
- Shot lists can pin specific versions for continuity
- Generation records track exact version used

### FR-11.5: Version UI

**Version Badge:**
```
┌──────────────────┐
│ Marcus           │
│ v2.1.0 (latest)  │
│ [▼ 3 versions]   │
└──────────────────┘
```

**Version History Panel:**
```
┌─────────────────────────────────────────────────────┐
│ Version History: Marcus                             │
├─────────────────────────────────────────────────────┤
│ ● v2.1.0 (Active)    Jan 30, 2025                  │
│   "Added gold chain accessory"                      │
│                                                     │
│ ○ v2.0.0             Jan 22, 2025                  │
│   "New fade haircut for Q1 campaign"               │
│                                                     │
│ ○ v1.1.0             Jan 15, 2025                  │
│   "Updated default wardrobe to black apron"        │
│                                                     │
│ ○ v1.0.0             Jan 10, 2025                  │
│   "Initial creation"                                │
│                                                     │
│              [Compare Selected] [Restore]           │
└─────────────────────────────────────────────────────┘
```

---

## Updated Database Schema

```sql
-- Asset versioning additions
ALTER TABLE assets_library ADD COLUMN version TEXT DEFAULT '1.0.0';
ALTER TABLE assets_library ADD COLUMN parent_version_id TEXT REFERENCES assets_library(id);
ALTER TABLE assets_library ADD COLUMN is_latest INTEGER DEFAULT 1;
ALTER TABLE assets_library ADD COLUMN version_notes TEXT;

-- LoRA training exports
CREATE TABLE lora_exports (
  id TEXT PRIMARY KEY,
  asset_id TEXT REFERENCES assets_library(id),
  export_format TEXT CHECK(export_format IN ('standard', 'replicate', 'civitai')),
  export_path TEXT,
  image_count INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- LoRA imports (future)
CREATE TABLE lora_models (
  id TEXT PRIMARY KEY,
  asset_id TEXT REFERENCES assets_library(id),
  model_path TEXT,
  provider TEXT,
  trigger_word TEXT,
  training_config JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Talent wizard sessions (for resumable wizard)
CREATE TABLE talent_wizard_sessions (
  id TEXT PRIMARY KEY,
  status TEXT CHECK(status IN ('step1', 'step2', 'step3', 'step4', 'completed', 'abandoned')),
  description_input TEXT,
  inspiration_image_path TEXT,
  selected_headshot_path TEXT,
  headshot_seed TEXT,
  character_sheet_paths JSON,
  auto_description TEXT,
  user_edits JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Related Documents

- [Thresho Studio PRD](./thresho-studio-prd.md)
- [Building Thresho Studio: Architecture Guide](./Building_Thresho_Studio.md)
- [Shot List & Storyboard Feature](./thresho-studio-prd.md#addendum-a)
