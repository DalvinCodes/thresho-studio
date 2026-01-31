# Thresho Studio - Product Requirements Document

**Version:** 1.0  
**Last Updated:** January 31, 2025  
**Author:** DJ (CEO/CTO)  
**Status:** Draft

---

## Executive Summary

Thresho Studio is a standalone creative operations platform that serves as the master prompt builder and asset generation system for Thresho's visual identity. It orchestrates multiple AI providers (LLM, image, video) through a unified interface, enabling consistent brand expression across ads, stock photography, tenant templates, and UI design.

The platform launches as an internal backoffice tool with architecture designed for eventual public release as a tenant-facing feature within the Thresho ecosystem.

---

## Problem Statement

### Internal Challenges
- Thresho requires consistent, premium visual assets across marketing campaigns, product UI, and tenant templates
- Managing multiple AI providers (OpenAI, Anthropic, Flux, Runway, etc.) requires context-switching between tools and interfaces
- No centralized system for prompt iteration, versioning, or asset-to-prompt traceability
- Brand consistency relies on tribal knowledge rather than systematic enforcement
- API credentials scattered across team members and tools

### Market Opportunity
- Service professionals (Thresho's target market) lack access to professional-grade creative tools
- Existing AI creative tools are either too complex (enterprise) or too limited (consumer)
- No solution combines multi-provider orchestration with brand management for SMBs

---

## Product Vision

**For** Thresho's internal creative team (Phase 1) and service professionals (Phase 2)  
**Who** need to produce consistent, high-quality visual content at scale  
**Thresho Studio is** a multi-provider AI creative platform  
**That** unifies prompt engineering, asset generation, and brand management  
**Unlike** single-provider tools or complex enterprise DAM systems  
**Our product** offers swappable AI backends, versioned prompt templates, and injectable brand tokens in a clean React interface

---

## User Personas

### Phase 1: Internal Users

**Creative Director (Primary)**
- Defines brand visual language and creative direction
- Creates and maintains prompt templates
- Reviews and approves generated assets
- Needs: Template authoring, version control, approval workflows

**Marketing Manager**
- Generates campaign-specific assets (ads, social, email)
- Iterates on creative concepts quickly
- Needs: Fast generation, A/B variant creation, export workflows

**Product Designer**
- Creates UI mockups and design system assets
- Generates placeholder imagery for templates
- Needs: Consistent style output, resolution control, batch generation

### Phase 2: Tenant Users (Future)

**Service Professional**
- Generates on-brand marketing materials
- Limited creative expertise but high aesthetic standards
- Needs: Guided workflows, brand guardrails, simple controls

---

## Functional Requirements

### FR-1: Provider Management

#### FR-1.1: Provider Registry
- System SHALL support registration of multiple AI providers
- System SHALL categorize providers by capability: text, image, video
- System SHALL display provider status (active, rate-limited, error)
- System SHALL support provider-specific configuration parameters

#### FR-1.2: Credential Management
- System SHALL persist API credentials in encrypted local storage
- System SHALL support multiple credential sets per provider (personal, team, organization)
- System SHALL validate credentials on entry and periodically
- System SHALL track credential usage and costs per provider
- System SHALL never transmit credentials to Thresho servers (local-only)

#### FR-1.3: Provider Abstraction
- System SHALL present unified interface regardless of underlying provider
- System SHALL handle provider-specific quirks (polling vs webhooks, rate limits)
- System SHALL support hot-swapping providers without workflow interruption
- System SHALL gracefully degrade when preferred provider unavailable

**Supported Providers (Launch):**

| Category | Providers | Priority |
|----------|-----------|----------|
| Text/LLM | OpenAI GPT-4, Anthropic Claude, Kimi K2.5, Google Gemini | P0 |
| Image | Flux Pro, DALL-E 3, Google Imagen | P0 |
| Video | Runway Gen-4, Kling AI | P1 |

### FR-2: Prompt Template System

#### FR-2.1: Template Authoring
- System SHALL support rich text editing for prompt templates
- System SHALL support variable placeholders with typed schema (string, number, enum, brand_token)
- System SHALL support template inheritance (base templates, overrides)
- System SHALL preview rendered prompts with sample data
- System SHALL validate template syntax before save

#### FR-2.2: Version Control
- System SHALL create immutable versions on each template save
- System SHALL support semantic versioning (major.minor.patch)
- System SHALL compute content hash for each version (reproducibility)
- System SHALL support diff view between versions
- System SHALL support rollback to any previous version

#### FR-2.3: Deployment Labels
- System SHALL support mutable labels pointing to immutable versions
- System SHALL provide default labels: draft, staging, production
- System SHALL support custom labels for A/B experiments
- System SHALL log all label movements for audit

#### FR-2.4: Template Categories
- System SHALL organize templates by output type: text, image, video
- System SHALL support user-defined categories and tags
- System SHALL provide search and filter across template library
- System SHALL support template duplication and forking

### FR-3: Brand Token System

#### FR-3.1: Brand Profile Management
- System SHALL support multiple brand profiles
- System SHALL define brand token schema:
  - Colors (primary, secondary, accent, palette description)
  - Typography (fonts, style descriptors)
  - Visual style (aesthetic, photography style, mood)
  - Voice (tone, forbidden terms)
  - Assets (logo URLs, icon sets)
- System SHALL validate brand profiles for completeness

#### FR-3.2: Token Injection
- System SHALL inject brand tokens into prompt templates at render time
- System SHALL support nested token references
- System SHALL preview brand-applied prompts before generation
- System SHALL track which brand profile produced each asset

#### FR-3.3: Asset Library
- System SHALL store brand assets (logos, icons) locally
- System SHALL support asset upload (PNG, SVG, JPG)
- System SHALL generate asset URLs for prompt inclusion
- System SHALL organize assets by brand and category

### FR-4: Generation Workflows

#### FR-4.1: Text Generation
- System SHALL stream LLM responses in real-time
- System SHALL support conversation context for iterative refinement
- System SHALL display token usage and cost estimate
- System SHALL support generation cancellation
- System SHALL save generation history with full context

#### FR-4.2: Image Generation
- System SHALL support text-to-image generation
- System SHALL support image-to-image (style transfer, variations)
- System SHALL display generation progress
- System SHALL support batch generation (multiple variants)
- System SHALL support resolution and aspect ratio selection
- System SHALL support seed locking for reproducibility

#### FR-4.3: Video Generation
- System SHALL support text-to-video generation
- System SHALL support image-to-video (animate still)
- System SHALL handle async job polling with progress updates
- System SHALL support duration and resolution selection
- System SHALL support generation cancellation where provider allows

#### FR-4.4: Generation History
- System SHALL log every generation with full lineage:
  - Prompt template version used
  - Rendered prompt text
  - Variables and brand tokens applied
  - Provider and model
  - Generation parameters (seed, temperature, etc.)
  - Provider request ID
  - Timestamp and cost
- System SHALL support re-generation from history entry
- System SHALL support export of generation records

### FR-5: Asset Management

#### FR-5.1: Asset Gallery
- System SHALL display generated assets in grid/list views
- System SHALL support filtering by type, date, template, brand
- System SHALL support search by prompt content
- System SHALL handle large galleries with virtual scrolling
- System SHALL display asset metadata on hover/selection

#### FR-5.2: Asset Operations
- System SHALL support asset download (original resolution)
- System SHALL support asset deletion with confirmation
- System SHALL support asset favoriting/starring
- System SHALL support asset tagging
- System SHALL support bulk operations (delete, tag, export)

#### FR-5.3: Asset Export
- System SHALL export assets in multiple formats (PNG, JPG, WebP)
- System SHALL support resolution scaling on export
- System SHALL support batch export with naming conventions
- System SHALL support export to clipboard

### FR-6: Workspace Management

#### FR-6.1: Projects
- System SHALL organize work into projects
- System SHALL support project-level settings (default provider, brand)
- System SHALL support project duplication
- System SHALL support project archival

#### FR-6.2: Local Persistence
- System SHALL persist all data locally in SQLite
- System SHALL support database backup/restore
- System SHALL support data export (JSON, CSV)
- System SHALL handle storage limits gracefully

---

## Non-Functional Requirements

### NFR-1: Performance

| Metric | Target |
|--------|--------|
| App launch to interactive | < 2 seconds |
| Template list render (1000 items) | < 500ms |
| Gallery render (10,000 assets) | < 1 second (virtualized) |
| Streaming response latency | < 100ms first token |
| SQLite query p95 | < 50ms |

### NFR-2: Security

- Credentials encrypted using OS-level encryption (Electron safeStorage)
- No credential transmission to external servers
- Local data encrypted at rest (optional, user-configurable)
- Audit log for all credential access

### NFR-3: Reliability

- Graceful handling of provider API failures
- Automatic retry with exponential backoff
- Offline mode for browsing existing assets and templates
- Data integrity checks on database operations

### NFR-4: Scalability

- Support 100,000+ assets per workspace
- Support 1,000+ prompt templates
- Support 10+ concurrent generation jobs

### NFR-5: Usability

- Keyboard shortcuts for common operations
- Undo/redo for all destructive actions
- Responsive layout (1024px minimum width)
- Dark mode support (aligned with Thresho color system)

---

## Technical Architecture

### Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | React 18+ | Team expertise, ecosystem |
| Build | Vite | Fast dev experience, ESM-native |
| State | Zustand + Jotai | Simple, performant, scalable |
| Workflows | XState | Explicit state machines for complex flows |
| Server State | TanStack Query | Caching, polling, mutations |
| Styling | Tailwind CSS | Thresho design system alignment |
| Database | SQLite (wa-sqlite browser, better-sqlite3 Electron) | Local-first, portable |
| Desktop | Electron | Cross-platform, native integrations |

### Provider Adapter Interface

```typescript
interface AIProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  
  // Lifecycle
  initialize(config: ProviderConfig): Promise<void>;
  validateCredentials(): Promise<boolean>;
  
  // Generation
  generateText?(request: TextRequest): AsyncGenerator<TextChunk>;
  generateImage?(request: ImageRequest): Promise<ImageResponse>;
  generateVideo?(request: VideoRequest): Promise<VideoJob>;
  
  // Video job management
  getJobStatus?(jobId: string): Promise<JobStatus>;
  cancelJob?(jobId: string): Promise<void>;
}
```

### Database Schema (Core Tables)

```sql
-- Provider credentials (references encrypted storage)
CREATE TABLE providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('text', 'image', 'video')),
  credential_ref TEXT,  -- Reference to safeStorage key
  config JSON,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Prompt templates
CREATE TABLE prompt_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  output_type TEXT CHECK(output_type IN ('text', 'image', 'video')),
  category TEXT,
  tags JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Immutable prompt versions
CREATE TABLE prompt_versions (
  id TEXT PRIMARY KEY,
  template_id TEXT REFERENCES prompt_templates(id),
  version TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  system_prompt TEXT,
  user_prompt TEXT NOT NULL,
  variables JSON,  -- [{name, type, default, required}]
  model_config JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(template_id, version)
);

-- Mutable deployment labels
CREATE TABLE prompt_labels (
  template_id TEXT REFERENCES prompt_templates(id),
  label TEXT NOT NULL,
  version_id TEXT REFERENCES prompt_versions(id),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(template_id, label)
);

-- Brand profiles
CREATE TABLE brand_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tokens JSON NOT NULL,  -- Full brand token schema
  is_default INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Generated assets
CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  type TEXT CHECK(type IN ('text', 'image', 'video')),
  file_path TEXT,  -- Local storage path
  thumbnail_path TEXT,
  metadata JSON,  -- Dimensions, duration, format
  is_favorite INTEGER DEFAULT 0,
  tags JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Generation lineage
CREATE TABLE generation_records (
  id TEXT PRIMARY KEY,
  asset_id TEXT REFERENCES assets(id),
  prompt_version_id TEXT REFERENCES prompt_versions(id),
  brand_profile_id TEXT REFERENCES brand_profiles(id),
  rendered_prompt TEXT NOT NULL,
  variables_used JSON,
  provider_id TEXT REFERENCES providers(id),
  model_name TEXT,
  generation_params JSON,
  provider_request_id TEXT,
  cost_usd REAL,
  duration_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_provider_id TEXT REFERENCES providers(id),
  default_brand_id TEXT REFERENCES brand_profiles(id),
  settings JSON,
  is_archived INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## User Interface

### Information Architecture

```
Thresho Studio
├── Dashboard
│   ├── Recent generations
│   ├── Quick actions
│   └── Usage stats
├── Generate
│   ├── Text
│   ├── Image
│   └── Video
├── Templates
│   ├── Library (browse/search)
│   ├── Editor
│   └── Version history
├── Assets
│   ├── Gallery
│   ├── Collections
│   └── Trash
├── Brands
│   ├── Profile list
│   └── Token editor
├── Settings
│   ├── Providers
│   ├── Credentials
│   ├── Preferences
│   └── Data management
```

### Key Screens

#### Generate Screen
- Left panel: Template selector, variable inputs
- Center: Generation preview/result
- Right panel: Provider selector, parameters, history
- Bottom: Action bar (generate, cancel, save, regenerate)

#### Template Editor
- Monaco-based editor with syntax highlighting
- Variable schema builder (visual)
- Preview pane with sample data
- Version selector and diff view

#### Asset Gallery
- Masonry grid with virtual scrolling
- Filter bar (type, date, template, brand, tags)
- Bulk selection mode
- Detail drawer on selection

---

## Rollout Plan

### Phase 1: Internal MVP (Weeks 1-4)

**Goals:**
- Functional provider abstraction for 2 LLMs, 2 image providers
- Basic prompt template CRUD with versioning
- Single brand profile support
- Image generation workflow
- Local SQLite persistence

**Success Criteria:**
- Internal team can generate brand-consistent images
- Full generation lineage tracking
- Credential management working securely

### Phase 2: Full Internal (Weeks 5-8)

**Goals:**
- Video generation support
- Multi-brand profiles
- Advanced template features (inheritance, A/B labels)
- Asset gallery with full operations
- Export workflows

**Success Criteria:**
- All internal creative workflows supported
- 1000+ assets managed without performance degradation
- Video generation integrated

### Phase 3: Public Beta Prep (Weeks 9-12)

**Goals:**
- Tenant isolation architecture
- Usage metering and limits
- Simplified UI for non-technical users
- Documentation and onboarding

**Success Criteria:**
- Multi-tenant ready
- Performance targets met
- Security audit passed

---

## Success Metrics

### Phase 1 Metrics

| Metric | Target |
|--------|--------|
| Time to first generation | < 5 minutes from install |
| Generations per week (internal) | 100+ |
| Template reuse rate | > 50% |
| Provider switch success rate | > 95% |

### Phase 2 Metrics

| Metric | Target |
|--------|--------|
| Assets under management | 10,000+ |
| Video generations per week | 20+ |
| Brand profile utilization | 3+ profiles active |

### Phase 3 Metrics

| Metric | Target |
|--------|--------|
| Beta tenant onboarding success | > 80% |
| Generation error rate | < 5% |
| User satisfaction (NPS) | > 40 |

---

## Open Questions

1. **Midjourney integration** - No official API exists. Do we support manual Discord workflow with paste-back, or wait for official API?

2. **Cost allocation** - For future tenant use, how do we handle API costs? Pass-through with markup? Bundled credits? BYOK only?

3. **Collaboration** - Is real-time collaboration on templates needed for internal use, or can we defer to Phase 3?

4. **Mobile** - Should the React app be responsive for tablet use, or desktop-only for now?

5. **Offline generation** - Should we explore local models (Stable Diffusion, Ollama) for offline/cost-sensitive scenarios?

---

## Appendix

### A: Thresho Brand Tokens (Default Profile)

```json
{
  "brand_id": "thresho-core",
  "tokens": {
    "colors": {
      "primary": "#FF714E",
      "secondary": "#004466",
      "neutral_dark": "#111122",
      "neutral_light": "#F0EEEE",
      "palette_description": "Warm coral orange primary with deep lush aqua secondary, anchored by near-black corbeau and soft paper white"
    },
    "typography": {
      "primary_font": "Inter",
      "style_descriptor": "Clean, modern sans-serif with strong readability"
    },
    "visual_style": {
      "aesthetic": "Premium editorial, modern minimalist",
      "photography_style": "High-quality lifestyle, natural lighting, authentic not stock",
      "mood": "Professional yet approachable, energetic but not overwhelming"
    },
    "voice": {
      "tone": ["professional", "empowering", "straightforward"],
      "forbidden_terms": ["cheap", "basic", "simple", "easy"],
      "forbidden_elements": ["emojis"]
    }
  }
}
```

### B: Provider Capability Matrix

| Provider | Text | Image | Video | Streaming | Async Jobs | API Maturity |
|----------|------|-------|-------|-----------|------------|--------------|
| OpenAI GPT-4 | Yes | - | - | Yes | No | Production |
| Anthropic Claude | Yes | - | - | Yes | No | Production |
| Kimi K2.5 | Yes | - | - | Yes | No | Production |
| DALL-E 3 | - | Yes | - | No | No | Production |
| Flux Pro | - | Yes | - | No | No | Production |
| Runway Gen-4 | - | - | Yes | No | Yes | Production |
| Kling AI | - | - | Yes | No | Yes | Production |

### C: Related Documents

- [Thresho Architecture](./thresho-architecture.md)
- [Thresho Product Roadmap](./thresho_product_roadmap.md)
- [Building Thresho Studio: Architecture Guide](./Building_Thresho_Studio.md)
- [Thresho Color System](./new-color-prompt.json)

---

## Addendum A: Shot List & Storyboard Feature

**Added:** January 31, 2025  
**Status:** Approved for Phase 2

### Overview

The Shot List feature introduces a professional production planning workflow into Thresho Studio. Users create sequenced shot lists in tabular format that automatically generate structured prompts for AI image/video generation. The same data can be viewed as a visual storyboard, bridging pre-production planning with AI asset generation.

### User Story

As a creative director, I want to plan my visual sequence as a shot list with professional camera/lens specifications, then generate AI images for each shot with one click, so I can rapidly prototype commercials, social content, and marketing campaigns without manual prompt engineering.

---

### FR-7: Shot List Management

#### FR-7.1: Shot List Creation
- System SHALL support creating named shot lists within projects
- System SHALL organize shots as ordered sequences (drag-to-reorder)
- System SHALL support shot numbering with auto-increment (1, 2, 3... or 1A, 1B, 2A...)
- System SHALL support shot duplication and insertion
- System SHALL support bulk import from CSV/spreadsheet

#### FR-7.2: Shot Data Schema

Each shot SHALL capture the following fields:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| **Shot Number** | Auto/Manual | Sequence identifier | "1A", "2", "3B" |
| **Shot Name** | Text | Brief descriptive name | "Hero entrance", "Product reveal" |
| **Subject** | Text | Who/what is in frame | "Female barber, mid-30s, confident stance" |
| **Setting** | Text | Environment/location | "Modern barbershop, warm lighting, exposed brick" |
| **Frame** | Enum | Shot size | Wide, Full, Medium, Close-up, Extreme Close-up, Detail |
| **Camera** | Enum + Custom | Camera system | ARRI Alexa, RED Komodo, Sony FX6, iPhone Pro, Custom |
| **Lens** | Text | Focal length and type | "85mm f/1.4", "24-70mm zoom", "Anamorphic 40mm" |
| **Angle** | Enum | Camera position | Eye level, Low angle, High angle, Dutch, Bird's eye, Worm's eye |
| **Movement** | Enum + Text | Camera motion | Static, Pan, Tilt, Dolly, Tracking, Handheld, Crane, Drone |
| **Action** | Text | What happens in shot | "Subject turns to camera, smiles, begins cutting hair" |
| **Mood/Lighting** | Text | Atmosphere description | "Golden hour, backlit, lens flare" |
| **Duration** | Number | Estimated seconds | 3 |
| **Notes** | Text | Production notes | "Match color grade to shot 1A" |
| **Generated Asset** | Reference | Link to generated image/video | Asset ID |
| **Status** | Enum | Production status | Planned, Generated, Approved, Rejected |

#### FR-7.3: Quick Generate
- System SHALL provide one-click generate button per shot row
- System SHALL auto-compose prompt from shot fields (see FR-7.5)
- System SHALL use project's default provider and brand profile
- System SHALL display generation progress inline
- System SHALL link generated asset to shot record
- System SHALL support batch generate (selected shots or all)

#### FR-7.4: View Modes

**Table View (Default)**
- Spreadsheet-style with sortable/resizable columns
- Inline editing for all fields
- Row selection for bulk operations
- Sticky header with column filters
- Generate button visible per row

**Storyboard View**
- Card-based grid layout (2-4 columns, responsive)
- Each card shows: thumbnail (or placeholder), shot number, name, key specs
- Cards in sequence order (left-to-right, top-to-bottom)
- Click card to expand detail panel
- Drag cards to reorder sequence
- Visual status indicators (planned/generated/approved)

**Timeline View (Future)**
- Horizontal timeline with duration-based widths
- Scrubber for sequence preview
- Export to video editing timeline formats

#### FR-7.5: Automatic Prompt Composition

System SHALL generate structured prompts by combining shot fields into a professional prompt template:

**Prompt Assembly Order:**
1. Subject description
2. Setting/environment
3. Action/motion
4. Frame size and composition
5. Camera and lens characteristics
6. Angle and movement
7. Mood and lighting
8. Brand tokens (injected from profile)

**Example Prompt Generation:**

Shot Data:
```
Subject: Female barber, mid-30s, confident stance, wearing black apron
Setting: Modern barbershop, warm lighting, exposed brick walls, vintage mirrors
Frame: Medium shot
Camera: ARRI Alexa
Lens: 50mm f/1.4
Angle: Eye level
Movement: Static
Action: Subject holds scissors, looking at camera with slight smile
Mood: Golden hour warmth, soft backlight, shallow depth of field
```

Generated Prompt:
```
A medium shot of a female barber in her mid-30s with a confident stance, wearing a black apron. She holds scissors and looks at the camera with a slight smile. Set in a modern barbershop with warm lighting, exposed brick walls, and vintage mirrors. Shot at eye level on an ARRI Alexa with a 50mm f/1.4 lens creating shallow depth of field. Golden hour warmth with soft backlight. Cinematic quality, photorealistic. [Brand: Thresho visual style - premium editorial, authentic not stock]
```

#### FR-7.6: Prompt Override
- System SHALL allow manual prompt editing after auto-generation
- System SHALL preserve original auto-generated prompt for reference
- System SHALL highlight manual edits vs auto-generated content
- System SHALL support reverting to auto-generated prompt

---

### FR-8: Storyboard Export

#### FR-8.1: Export Formats
- System SHALL export storyboard as PDF (print-ready)
- System SHALL export as image sequence (PNG/JPG)
- System SHALL export shot list as CSV/Excel
- System SHALL export as HTML (shareable link - future)

#### FR-8.2: PDF Layout Options
- Shots per page: 1, 2, 4, 6, 9
- Include/exclude fields (checkboxes)
- Header with project name, date, version
- Frame border styles (none, thin, theatrical)
- Aspect ratio guides overlay

---

### Database Schema Additions

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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
  frame_size TEXT CHECK(frame_size IN ('wide', 'full', 'medium', 'close-up', 'extreme-close-up', 'detail')),
  camera TEXT,
  lens TEXT,
  angle TEXT CHECK(angle IN ('eye-level', 'low', 'high', 'dutch', 'birds-eye', 'worms-eye')),
  movement TEXT,
  action TEXT,
  mood_lighting TEXT,
  duration_seconds REAL,
  notes TEXT,
  status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'generated', 'approved', 'rejected')),
  auto_prompt TEXT,           -- System-generated prompt
  custom_prompt TEXT,         -- User overrides (NULL = use auto)
  asset_id TEXT REFERENCES assets(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Shot list presets (camera/lens combinations)
CREATE TABLE equipment_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT CHECK(category IN ('camera', 'lens', 'combo')),
  specs JSON,                 -- {camera, lens, sensor_size, look_description}
  prompt_fragment TEXT,       -- How to describe in prompts
  is_system INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### UI Specifications

#### Table View Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Shot List: "Q1 Campaign - Barber Series"                    [+ Add Shot] [⋮]│
├─────────────────────────────────────────────────────────────────────────────┤
│ View: [Table ▼] [Storyboard] [Timeline]          Filter: [All ▼] [Search...]│
├────┬──────────┬─────────┬────────┬───────┬───────┬────────┬────────┬────────┤
│ #  │ Name     │ Subject │ Frame  │Camera │ Lens  │ Action │ Status │ Gen    │
├────┼──────────┼─────────┼────────┼───────┼───────┼────────┼────────┼────────┤
│ 1  │ Hero... │ Female..│ Medium │ ARRI  │ 50mm  │ Turns..│ ●Ready │ [▶Gen] │
│ 2  │ Detail..│ Hands...│ Close  │ ARRI  │ 85mm  │ Cuts...│ ●Done  │ [↺]    │
│ 3  │ Wide... │ Full ...│ Wide   │ ARRI  │ 24mm  │ Walks..│ ●Ready │ [▶Gen] │
└────┴──────────┴─────────┴────────┴───────┴───────┴────────┴────────┴────────┘
                                              [Generate Selected] [Generate All]
```

#### Storyboard View Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Shot List: "Q1 Campaign - Barber Series"                    [+ Add Shot] [⋮]│
├─────────────────────────────────────────────────────────────────────────────┤
│ View: [Table] [Storyboard ▼] [Timeline]          Filter: [All ▼] [Search...]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │             │
│  │ │             │ │  │ │   [IMAGE]   │ │  │ │             │ │             │
│  │ │ [GENERATE]  │ │  │ │             │ │  │ │ [GENERATE]  │ │             │
│  │ │             │ │  │ │             │ │  │ │             │ │             │
│  │ └─────────────┘ │  │ └─────────────┘ │  │ └─────────────┘ │             │
│  │ 1 - Hero Open   │  │ 2 - Detail Cut │  │ 3 - Wide Est.  │             │
│  │ Medium | 50mm   │  │ Close | 85mm   │  │ Wide | 24mm    │             │
│  │ ○ Planned       │  │ ● Generated    │  │ ○ Planned      │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Equipment Presets (System Defaults)

**Cameras:**
| Preset | Prompt Fragment |
|--------|-----------------|
| ARRI Alexa | "cinematic film quality, ARRI color science, natural skin tones" |
| RED Komodo | "sharp digital cinema, high dynamic range, detailed shadows" |
| Sony FX6 | "broadcast quality, accurate colors, clean highlights" |
| Canon C70 | "warm cinematic tones, organic texture, Canon color" |
| iPhone 15 Pro | "smartphone photography, computational imaging, ProRes quality" |
| Film 35mm | "35mm film grain, analog warmth, Kodak color palette" |
| Film 16mm | "16mm film texture, documentary feel, organic grain" |

**Lenses:**
| Preset | Prompt Fragment |
|--------|-----------------|
| 24mm wide | "wide angle perspective, environmental context, slight distortion" |
| 35mm standard | "natural field of view, documentary perspective, minimal distortion" |
| 50mm normal | "human eye perspective, classic framing, natural compression" |
| 85mm portrait | "portrait compression, shallow depth of field, subject isolation, creamy bokeh" |
| 135mm telephoto | "compressed perspective, extreme background blur, intimate framing" |
| Anamorphic | "anamorphic lens flares, oval bokeh, 2.39:1 cinematic aspect, horizontal stretch" |
| Vintage | "vintage lens character, soft glow, chromatic aberration, dreamy quality" |

---

### Success Metrics (Addendum)

| Metric | Target |
|--------|--------|
| Shots created per project | Avg 10+ |
| Auto-prompt acceptance rate | > 70% (no manual override needed) |
| Table-to-Storyboard toggle usage | > 50% of users use both views |
| Batch generate usage | > 30% of generations |
| Shot list export usage | > 20% of completed lists |

---

### Decisions (Addendum)

1. **Video generation from shot list** - DECIDED: Still image by default. Video generation available as explicit secondary action per shot.

2. **Collaborative shot lists** - DECIDED: Check-in/check-out model for Phase 3 multi-user. User locks shot list for editing, others see read-only until released.

3. **Import from industry tools** - DECIDED: No. Not supporting Final Draft, Movie Magic, or other pre-production software imports.

4. **AI shot suggestions** - DECIDED: Yes. See FR-7.7 below.

---

### FR-7.7: AI Shot Suggestions

#### FR-7.7.1: Project Type Templates
- System SHALL offer pre-built shot sequence templates based on project type
- System SHALL allow customization of suggested sequences before creation
- System SHALL learn from user modifications to improve suggestions over time

**Supported Project Types (Launch):**

| Project Type | Duration | Typical Shots | Sequence Pattern |
|--------------|----------|---------------|------------------|
| Social Ad (15s) | 15 sec | 4-6 shots | Hook, Problem, Solution, CTA |
| Commercial (30s) | 30 sec | 8-12 shots | Establish, Intro, Demo, Benefit, Benefit, CTA |
| Commercial (60s) | 60 sec | 15-20 shots | Full narrative arc with multiple beats |
| Product Showcase | 30-60 sec | 6-10 shots | Wide, Medium, Details, Action, Hero |
| Testimonial | 60-90 sec | 8-12 shots | Intro, Story beats, Transformation, CTA |
| Brand Story | 90-120 sec | 15-25 shots | Three-act structure with B-roll |
| Social Reel | 15-30 sec | 5-8 shots | Fast cuts, trending transitions |
| Before/After | 30 sec | 6-8 shots | Before state, Transformation, After reveal |

#### FR-7.7.2: AI Sequence Generation
- System SHALL generate shot suggestions from text brief
- User inputs: project type, subject, setting, key message, duration
- System outputs: complete shot list with all fields populated
- System SHALL use selected LLM provider for generation
- System SHALL apply brand profile to suggested shots

**Example Flow:**

User Input:
```
Project Type: Commercial (30s)
Subject: Mobile barber service
Setting: Urban locations - apartment, office, park
Key Message: Professional cuts wherever you are
Brand: Thresho default
```

AI-Generated Shot List:
```
1. Wide - City skyline at dawn, establishing urban setting
2. Medium - Business professional checking phone, looks frustrated (problem)
3. Close-up - Phone screen showing Thresho booking interface
4. Wide - Barber van arriving at apartment building
5. Medium - Barber greeting client at door, warm handshake
6. Detail - Barber tools laid out professionally
7. Medium - Haircut in progress, natural light from window
8. Close-up - Client's satisfied expression in mirror
9. Wide - Same client now in office meeting, confident
10. Medium - Different client getting cut in park, lifestyle
11. Detail - Fresh hairline, crisp edges
12. Medium - Barber and client fist bump, authentic moment
13. Wide - Van driving to next location, city backdrop
14. End Card - Logo, tagline, CTA
```

#### FR-7.7.3: Shot Enhancement Suggestions
- System SHALL offer per-shot enhancement suggestions on hover/request
- Suggestions include: alternative angles, complementary B-roll, transition recommendations
- System SHALL suggest camera/lens pairings based on shot intent

#### FR-7.7.4: Sequence Analysis
- System SHALL analyze existing shot lists for gaps or improvements
- Feedback includes: pacing issues, missing coverage, repetitive framing
- System SHALL suggest additional shots to strengthen sequence
