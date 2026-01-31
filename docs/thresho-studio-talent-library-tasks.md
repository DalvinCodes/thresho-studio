# Talent & Asset Library - Task Breakdown

**Feature ID:** TS-FR-001  
**Created:** January 31, 2025  
**Status:** Ready for Development  
**Estimated Total Effort:** 8-10 weeks

---

## Delivery Philosophy

This feature delivers incrementally with each milestone providing standalone value. Components come online progressively:

1. **Milestone 1**: Core data layer + basic CRUD (internal value)
2. **Milestone 2**: Library UI + browsing (usable by team)
3. **Milestone 3**: Asset selection in generation (integrated value)
4. **Milestone 4**: Talent wizard (accelerated creation)
5. **Milestone 5**: Versioning (production maturity)
6. **Milestone 6**: LoRA export (power user feature)

Each milestone is shippable. Later milestones enhance but don't block earlier functionality.

---

## Milestone 1: Data Foundation

**Goal:** Establish database schema, core models, and basic CRUD operations  
**Duration:** 1 week  
**Dependencies:** SQLite infrastructure from core PRD

---

### Task 1.1: Database Schema Implementation

**Description:** Create SQLite tables for asset library, categories, and type-specific profiles

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 1.1.1 | Create `asset_categories` table with system defaults | 2h |
| 1.1.2 | Create `assets_library` core table | 2h |
| 1.1.3 | Create `asset_images` table for reference images | 1h |
| 1.1.4 | Create `talent_profiles` extended data table | 1h |
| 1.1.5 | Create `environment_profiles` extended data table | 1h |
| 1.1.6 | Create `lighting_profiles` extended data table | 1h |
| 1.1.7 | Create `asset_usage` tracking table | 1h |
| 1.1.8 | Create `asset_prompt_fragments` table | 1h |
| 1.1.9 | Write migration scripts | 2h |
| 1.1.10 | Seed system categories and lighting presets | 2h |

**Acceptance Criteria:**
- [ ] All tables created with proper foreign key relationships
- [ ] Indexes exist on frequently queried columns (category_id, project_id, slug, tags)
- [ ] System categories seeded: Talent, Environment, Props, Wardrobe, Lighting, Camera, Style
- [ ] Lighting presets seeded: Golden Hour Soft, Studio High Key, Studio Low Key, Natural Window, Overcast Flat, Neon Night, Rembrandt, Ring Light
- [ ] Migration runs cleanly on fresh database
- [ ] Migration handles existing database without data loss

---

### Task 1.2: Asset Data Models

**Description:** Create TypeScript interfaces and Zustand stores for asset management

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 1.2.1 | Define `Asset` base interface and category-specific extensions | 2h |
| 1.2.2 | Define `TalentProfile` interface with all schema fields | 1h |
| 1.2.3 | Define `EnvironmentProfile` interface | 1h |
| 1.2.4 | Define `LightingProfile` interface | 1h |
| 1.2.5 | Create `useAssetStore` Zustand store | 3h |
| 1.2.6 | Create `useAssetCategoryStore` for category management | 1h |
| 1.2.7 | Write unit tests for store actions | 2h |

**Acceptance Criteria:**
- [ ] All interfaces match database schema
- [ ] Zustand store supports: list, get, create, update, delete operations
- [ ] Store handles optimistic updates with rollback on failure
- [ ] Store supports filtering by category, project, tags
- [ ] Unit tests cover all store actions with >80% coverage

---

### Task 1.3: Asset CRUD Repository

**Description:** Create data access layer for asset operations

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 1.3.1 | Create `AssetRepository` class with SQLite queries | 3h |
| 1.3.2 | Implement `createAsset` with type-specific profile insertion | 2h |
| 1.3.3 | Implement `updateAsset` with partial updates | 2h |
| 1.3.4 | Implement `deleteAsset` with cascade to images/profiles | 1h |
| 1.3.5 | Implement `listAssets` with filtering and pagination | 2h |
| 1.3.6 | Implement `searchAssets` with full-text search on name/description/tags | 2h |
| 1.3.7 | Implement `getAssetWithRelations` (images, profile, usage) | 2h |
| 1.3.8 | Write integration tests against test database | 3h |

**Acceptance Criteria:**
- [ ] All CRUD operations work correctly
- [ ] Creating a Talent asset also creates linked `talent_profiles` record
- [ ] Deleting an asset cascades to images and type-specific profile
- [ ] List supports: category filter, project filter, tag filter, global/project scope
- [ ] Search finds assets by partial name, description keywords, and tags
- [ ] Pagination returns correct total count and page data
- [ ] Integration tests pass with isolated test database

---

### Task 1.4: Image Storage Service

**Description:** Handle asset reference image storage and retrieval

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 1.4.1 | Define image storage directory structure | 1h |
| 1.4.2 | Create `ImageStorageService` for save/load/delete | 2h |
| 1.4.3 | Implement thumbnail generation (200x200) | 2h |
| 1.4.4 | Implement image optimization (WebP conversion, max dimensions) | 2h |
| 1.4.5 | Create cleanup job for orphaned images | 1h |
| 1.4.6 | Write tests for image operations | 2h |

**Acceptance Criteria:**
- [ ] Images stored in `{app_data}/assets/{asset_id}/` directory
- [ ] Thumbnails generated automatically on save
- [ ] Images optimized to WebP format, max 2048px on longest edge
- [ ] Original preserved if user explicitly requests
- [ ] Orphaned image cleanup runs on app startup
- [ ] Storage service works in both browser (OPFS) and Electron (filesystem)

---

## Milestone 2: Library UI

**Goal:** Users can browse, view, and manage assets through the UI  
**Duration:** 1.5 weeks  
**Dependencies:** Milestone 1

---

### Task 2.1: Library Browser Component

**Description:** Main library view with grid/list toggle and filtering

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 2.1.1 | Create `AssetLibrary` page component with layout | 2h |
| 2.1.2 | Implement scope selector (Global / Project dropdown) | 2h |
| 2.1.3 | Implement category filter tabs | 2h |
| 2.1.4 | Implement search input with debounce | 1h |
| 2.1.5 | Implement tag filter dropdown | 2h |
| 2.1.6 | Create `AssetGrid` component with virtual scrolling | 4h |
| 2.1.7 | Create `AssetList` component with sortable columns | 3h |
| 2.1.8 | Implement view toggle (grid/list) with persistence | 1h |
| 2.1.9 | Create `AssetCard` component for grid view | 2h |
| 2.1.10 | Create `AssetRow` component for list view | 2h |
| 2.1.11 | Implement empty states for no assets / no results | 1h |

**Acceptance Criteria:**
- [ ] Library displays all assets in selected scope
- [ ] Grid view shows thumbnail, name, category badge, usage count
- [ ] List view shows sortable columns: Name, Category, Created, Last Used, Usage Count
- [ ] Virtual scrolling handles 10,000+ assets without performance degradation
- [ ] Filters combine correctly (category AND tags AND search)
- [ ] View preference persists across sessions
- [ ] Empty states guide user to create first asset

---

### Task 2.2: Asset Detail Panel

**Description:** Slide-out panel showing full asset information

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 2.2.1 | Create `AssetDetailPanel` slide-out component | 2h |
| 2.2.2 | Implement header with name, category, actions | 1h |
| 2.2.3 | Create `TalentDetailView` with headshot + character sheet grid | 3h |
| 2.2.4 | Create `EnvironmentDetailView` with gallery | 2h |
| 2.2.5 | Create `LightingDetailView` with examples | 2h |
| 2.2.6 | Create generic `AssetDetailView` for other categories | 2h |
| 2.2.7 | Implement attributes display (key-value grid) | 1h |
| 2.2.8 | Implement tags display with edit capability | 1h |
| 2.2.9 | Implement recent usage section with thumbnails | 2h |
| 2.2.10 | Add action buttons: Edit, Duplicate, Delete, Promote to Global | 2h |

**Acceptance Criteria:**
- [ ] Panel opens on asset selection (click in grid/list)
- [ ] Panel closes on outside click, escape key, or X button
- [ ] Talent view shows headshot prominently + 6-8 character sheet images in grid
- [ ] All type-specific fields display correctly
- [ ] Recent usage shows last 5 generations using this asset
- [ ] Edit navigates to edit form
- [ ] Duplicate creates copy with "(Copy)" suffix
- [ ] Delete shows confirmation dialog
- [ ] Promote to Global only shows for project-scoped assets

---

### Task 2.3: Asset Create/Edit Forms

**Description:** Forms for creating and editing assets by category

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 2.3.1 | Create `AssetForm` base component with common fields | 2h |
| 2.3.2 | Create `TalentForm` with all talent-specific fields | 3h |
| 2.3.3 | Create `EnvironmentForm` with environment-specific fields | 2h |
| 2.3.4 | Create `LightingForm` with lighting-specific fields | 2h |
| 2.3.5 | Create generic form for other categories | 2h |
| 2.3.6 | Implement image upload with drag-drop and preview | 3h |
| 2.3.7 | Implement character sheet multi-image upload (6-8 images) | 2h |
| 2.3.8 | Implement form validation with error display | 2h |
| 2.3.9 | Implement auto-save draft (localStorage) | 2h |
| 2.3.10 | Create success/error toast notifications | 1h |

**Acceptance Criteria:**
- [ ] Form dynamically renders fields based on selected category
- [ ] Required fields enforced: name, primary image, description (for talent: physical description)
- [ ] Image upload supports drag-drop, click-to-browse, clipboard paste
- [ ] Image preview shows before save
- [ ] Character sheet enforces 6-8 images with labeled slots
- [ ] Validation errors display inline next to fields
- [ ] Draft auto-saves every 30 seconds, restored on return
- [ ] Success toast confirms save with link to view asset

---

### Task 2.4: Quick Add Modal

**Description:** Streamlined modal for adding assets without leaving current context

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 2.4.1 | Create `QuickAddModal` component | 2h |
| 2.4.2 | Implement category selector as first step | 1h |
| 2.4.3 | Implement minimal form (name, primary image, description) | 2h |
| 2.4.4 | Implement "Save & Select" action for use in generation flow | 1h |
| 2.4.5 | Implement "Save & Edit Full" action to continue to full form | 1h |

**Acceptance Criteria:**
- [ ] Modal accessible from library header and asset selectors
- [ ] Category selection shows icons and descriptions
- [ ] Minimal form collects only required fields
- [ ] Save & Select creates asset and returns it to calling context
- [ ] Save & Edit Full creates asset and navigates to full edit form
- [ ] Modal closes on successful save or cancel

---

## Milestone 3: Generation Integration

**Goal:** Assets can be selected and used in generation workflows  
**Duration:** 1.5 weeks  
**Dependencies:** Milestone 2, Generation workflow from core PRD

---

### Task 3.1: Asset Selector Component

**Description:** Reusable component for selecting assets in generation flows

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 3.1.1 | Create `AssetSelector` component with category prop | 2h |
| 3.1.2 | Implement thumbnail grid of available assets | 2h |
| 3.1.3 | Implement search within selector | 1h |
| 3.1.4 | Implement scope toggle (Project / Global) | 1h |
| 3.1.5 | Implement single-select mode | 1h |
| 3.1.6 | Implement multi-select mode (for props, multiple talent) | 2h |
| 3.1.7 | Add "Quick Add" button triggering QuickAddModal | 1h |
| 3.1.8 | Show selected asset preview with clear button | 1h |

**Acceptance Criteria:**
- [ ] Selector filters to specified category
- [ ] Single-select returns one asset, multi-select returns array
- [ ] Search filters visible options in real-time
- [ ] Selected asset shows checkmark overlay in grid
- [ ] Quick Add creates asset and auto-selects it
- [ ] Clear button removes selection

---

### Task 3.2: Asset Context Input Component

**Description:** Per-asset context fields for generation (action, expression, position, etc.)

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 3.2.1 | Create `TalentContextInput` component | 2h |
| 3.2.2 | Create `EnvironmentContextInput` component | 2h |
| 3.2.3 | Create `LightingContextInput` component (minimal, mostly preset) | 1h |
| 3.2.4 | Create generic `AssetContextInput` for other types | 1h |
| 3.2.5 | Implement context presets (common actions, expressions) | 2h |
| 3.2.6 | Implement context history (recently used contexts per asset) | 2h |

**Acceptance Criteria:**
- [ ] Talent context collects: Action, Expression, Position, Wardrobe Override, Interaction
- [ ] Environment context collects: Area/Section, Time Override, Weather Override, Modifications
- [ ] Context presets offer quick selection (e.g., "smiling", "serious", "walking", "sitting")
- [ ] Context history shows last 5 contexts used with this asset for quick reuse
- [ ] All context fields are optional

---

### Task 3.3: Generation Panel Asset Integration

**Description:** Integrate asset selectors into the main generation workflow

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 3.3.1 | Add asset selection section to image generation panel | 3h |
| 3.3.2 | Add asset selection section to video generation panel | 2h |
| 3.3.3 | Wire selected assets + context to generation request | 2h |
| 3.3.4 | Display selected assets summary before generation | 1h |
| 3.3.5 | Save asset selections as generation defaults (optional) | 2h |

**Acceptance Criteria:**
- [ ] Generation panel shows: Talent selector, Environment selector, Lighting selector, Props selector
- [ ] Each selector expands to show context inputs when asset selected
- [ ] Generation request includes all selected assets and their contexts
- [ ] Summary shows "Using: Marcus, Downtown Shop, Golden Hour" before generate
- [ ] User can save current asset selection as project default

---

### Task 3.4: Prompt Assembly Engine

**Description:** Combine asset descriptions, context, and brand tokens into final prompt

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 3.4.1 | Create `PromptAssembler` service | 2h |
| 3.4.2 | Implement asset description extraction from profiles | 2h |
| 3.4.3 | Implement context merging (asset + user context) | 2h |
| 3.4.4 | Implement assembly order logic (subject, setting, action, camera, mood, brand) | 2h |
| 3.4.5 | Implement provider-specific prompt formatting | 2h |
| 3.4.6 | Implement prompt preview display | 1h |
| 3.4.7 | Implement manual prompt override with diff highlight | 2h |
| 3.4.8 | Write unit tests for prompt assembly | 3h |

**Acceptance Criteria:**
- [ ] Assembler produces coherent prompt from asset descriptions + context
- [ ] Assembly order follows: Subject → Setting → Action → Frame → Camera/Lens → Mood → Brand
- [ ] Provider-specific formatting applies (e.g., Midjourney parameters at end)
- [ ] Prompt preview shows assembled prompt before generation
- [ ] User can edit assembled prompt; edits highlighted vs. auto-generated
- [ ] Unit tests cover various asset combinations

---

### Task 3.5: Reference Image Handling

**Description:** Submit reference images to providers that support them

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 3.5.1 | Create `ReferenceImageService` for provider-specific handling | 2h |
| 3.5.2 | Implement Flux Pro reference submission (Redux) | 2h |
| 3.5.3 | Implement Midjourney --cref URL generation | 2h |
| 3.5.4 | Implement DALL-E fallback (text description only) | 1h |
| 3.5.5 | Implement reference image caching for repeated use | 2h |
| 3.5.6 | Create provider capability check before reference submission | 1h |

**Acceptance Criteria:**
- [ ] Flux Pro receives reference images via Redux endpoint
- [ ] Midjourney receives --cref parameter with hosted image URL
- [ ] DALL-E gracefully degrades to text description only
- [ ] Reference images cached to avoid re-upload on regeneration
- [ ] Provider without reference support shows info message to user

---

### Task 3.6: Asset Usage Tracking

**Description:** Record which assets were used in each generation

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 3.6.1 | Create `AssetUsageService` | 1h |
| 3.6.2 | Record asset usage on generation complete | 2h |
| 3.6.3 | Update asset `usage_count` and `last_used_at` | 1h |
| 3.6.4 | Store context data used per generation | 1h |
| 3.6.5 | Create usage query for asset detail view | 1h |

**Acceptance Criteria:**
- [ ] Every generation records all assets used with their contexts
- [ ] Asset usage count increments on each use
- [ ] Last used timestamp updates on each use
- [ ] Asset detail view shows generations that used this asset
- [ ] Generation detail view shows assets that were used

---

## Milestone 4: Talent Wizard

**Goal:** Users can generate consistent talent from scratch via guided wizard  
**Duration:** 1.5 weeks  
**Dependencies:** Milestone 3, Provider adapters from core PRD

---

### Task 4.1: Wizard Framework

**Description:** Create multi-step wizard infrastructure

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 4.1.1 | Create `TalentWizard` page component | 2h |
| 4.1.2 | Implement step navigation (back, next, step indicators) | 2h |
| 4.1.3 | Implement wizard state machine (XState) | 3h |
| 4.1.4 | Implement session persistence for resumable wizard | 2h |
| 4.1.5 | Create wizard session recovery prompt on return | 1h |

**Acceptance Criteria:**
- [ ] Wizard shows 5 steps with progress indicator
- [ ] Back/Next navigation respects step validation
- [ ] Wizard state persists to database on each step completion
- [ ] Abandoned wizard prompts "Resume?" on next visit
- [ ] Session expires after 7 days

---

### Task 4.2: Step 1 - Description Input

**Description:** Collect character description and optional inspiration image

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 4.2.1 | Create description input form with guidance | 2h |
| 4.2.2 | Implement inspiration image upload (optional) | 1h |
| 4.2.3 | Implement use context selector (lead cast, background, industry) | 1h |
| 4.2.4 | Create description templates/examples | 1h |
| 4.2.5 | Validate minimum description length | 0.5h |

**Acceptance Criteria:**
- [ ] Description textarea with placeholder guidance
- [ ] Character count shows minimum (50 chars) requirement
- [ ] Inspiration image upload optional, shows preview
- [ ] Use context dropdown with options
- [ ] Example descriptions available as starting points

---

### Task 4.3: Step 2 - Headshot Generation

**Description:** Generate headshot options and allow selection

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 4.3.1 | Create headshot generation request builder | 2h |
| 4.3.2 | Implement batch generation (4-6 options) | 2h |
| 4.3.3 | Create headshot selection grid | 2h |
| 4.3.4 | Implement regenerate action | 1h |
| 4.3.5 | Capture and store seed value for selected headshot | 1h |
| 4.3.6 | Show generation progress with cancel option | 1h |

**Acceptance Criteria:**
- [ ] Generates 4-6 headshot variations from description
- [ ] Grid displays all options with selection state
- [ ] Regenerate button generates new batch
- [ ] Selected headshot's seed captured for consistency
- [ ] Progress indicator during generation
- [ ] Cancel stops generation and allows retry

---

### Task 4.4: Step 3 - Character Sheet Generation

**Description:** Generate consistent character sheet views from selected headshot

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 4.4.1 | Define 8 standard poses/views | 1h |
| 4.4.2 | Create character sheet generation request builder | 2h |
| 4.4.3 | Implement provider-specific consistency technique | 3h |
| 4.4.4 | Create character sheet grid display (8 slots) | 2h |
| 4.4.5 | Implement per-view regeneration | 2h |
| 4.4.6 | Show consistency quality indicator | 1h |

**Standard Views:**
1. Front face (close-up)
2. Profile left
3. Profile right
4. Full body front
5. Full body back
6. 3/4 angle
7. Action pose
8. Expression variation

**Acceptance Criteria:**
- [ ] Generates all 8 views using selected headshot as reference
- [ ] Each view labeled with pose description
- [ ] Individual view can be regenerated while keeping others
- [ ] Consistency maintained across views (same person recognizable)
- [ ] Quality indicator warns if consistency appears low

---

### Task 4.5: Step 4 - Profile Completion

**Description:** Auto-generate description and allow user editing

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 4.5.1 | Implement vision model description generation | 2h |
| 4.5.2 | Create editable description form pre-filled with auto-description | 2h |
| 4.5.3 | Create metadata input fields (name, persona, wardrobe, tags) | 2h |
| 4.5.4 | Implement description diff view (auto vs. edited) | 1h |

**Acceptance Criteria:**
- [ ] Vision model analyzes headshot + character sheet
- [ ] Auto-generates: physical description, estimated age, build, hair, distinguishing features
- [ ] User can edit all auto-generated fields
- [ ] User adds: name (required), persona, default wardrobe, tags
- [ ] Diff highlights user edits vs. auto-generated content

---

### Task 4.6: Step 5 - Confirmation & Save

**Description:** Preview complete profile and save to library

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 4.6.1 | Create talent preview display (mirrors detail view) | 2h |
| 4.6.2 | Implement save to project library | 1h |
| 4.6.3 | Implement save to global library option | 1h |
| 4.6.4 | Create success state with next actions | 1h |
| 4.6.5 | Clean up wizard session on complete | 0.5h |

**Acceptance Criteria:**
- [ ] Preview shows complete talent profile as it will appear in library
- [ ] Save to project (default) or global library toggle
- [ ] Success screen shows: "Use in generation", "Create another", "View in library"
- [ ] Wizard session deleted on successful save
- [ ] New talent immediately available in asset selectors

---

## Milestone 5: Asset Versioning

**Goal:** Assets support semantic versioning with history and restore  
**Duration:** 1 week  
**Dependencies:** Milestone 2

---

### Task 5.1: Version Schema Migration

**Description:** Add versioning columns to database

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 5.1.1 | Create migration adding version columns | 1h |
| 5.1.2 | Backfill existing assets with v1.0.0 | 1h |
| 5.1.3 | Update TypeScript interfaces | 1h |
| 5.1.4 | Update repository methods for version handling | 2h |

**Acceptance Criteria:**
- [ ] All assets have version, parent_version_id, is_latest, version_notes columns
- [ ] Existing assets set to v1.0.0, is_latest=true
- [ ] Interfaces include version properties
- [ ] Repository supports version-aware queries

---

### Task 5.2: Create New Version Flow

**Description:** Create new version of existing asset

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 5.2.1 | Add "Create New Version" action to asset detail | 1h |
| 5.2.2 | Create version type selector (patch, minor, major) | 1h |
| 5.2.3 | Implement version duplication with increment | 2h |
| 5.2.4 | Implement version notes input | 1h |
| 5.2.5 | Update previous version is_latest to false | 1h |

**Acceptance Criteria:**
- [ ] "Create New Version" opens version dialog
- [ ] Version type selection with explanation of each
- [ ] Auto-increments version number based on type
- [ ] Version notes required for minor/major
- [ ] New version becomes is_latest, previous version remains accessible

---

### Task 5.3: Version History UI

**Description:** Display and manage version history

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 5.3.1 | Add version badge to asset cards/rows | 1h |
| 5.3.2 | Create version history panel in asset detail | 2h |
| 5.3.3 | Implement version comparison view (side-by-side) | 3h |
| 5.3.4 | Implement restore version action | 2h |
| 5.3.5 | Implement set active version action | 1h |

**Acceptance Criteria:**
- [ ] Asset cards show version badge (e.g., "v2.1.0")
- [ ] Version history shows all versions with dates and notes
- [ ] Compare allows selecting two versions for side-by-side view
- [ ] Restore creates new version from historical state
- [ ] Set active marks which version is default for new generations

---

### Task 5.4: Version Selection in Generation

**Description:** Allow selecting specific asset version for generation

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 5.4.1 | Add version dropdown to asset selector | 2h |
| 5.4.2 | Default to latest active version | 1h |
| 5.4.3 | Show version in generation summary | 1h |
| 5.4.4 | Record exact version in generation record | 1h |

**Acceptance Criteria:**
- [ ] Asset selector shows version dropdown when asset has multiple versions
- [ ] Default selection is latest active version
- [ ] Generation summary shows "Marcus v2.1.0"
- [ ] Generation record stores exact version_id used

---

## Milestone 6: LoRA Export

**Goal:** Export training-ready packages for custom model training  
**Duration:** 0.5 weeks  
**Dependencies:** Milestone 2

---

### Task 6.1: Export Package Builder

**Description:** Generate training-ready export packages

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 6.1.1 | Create `LoRAExportService` | 2h |
| 6.1.2 | Implement image collection and preparation | 2h |
| 6.1.3 | Implement caption/tag generation per image | 2h |
| 6.1.4 | Implement training config recommendations | 1h |
| 6.1.5 | Create metadata JSON export | 1h |
| 6.1.6 | Implement ZIP packaging | 1h |

**Acceptance Criteria:**
- [ ] Collects all reference images for asset
- [ ] Generates recommended captions for each image
- [ ] Includes training config (steps, learning rate, resolution)
- [ ] Metadata JSON includes all asset attributes
- [ ] ZIP contains images/, captions/, config.json, metadata.json

---

### Task 6.2: Export Format Variants

**Description:** Support multiple export formats for different platforms

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 6.2.1 | Implement standard format (Kohya/EveryDream) | 1h |
| 6.2.2 | Implement Replicate format | 1h |
| 6.2.3 | Implement Civitai format | 1h |
| 6.2.4 | Create format selector in export UI | 1h |

**Acceptance Criteria:**
- [ ] Each format matches platform requirements
- [ ] Replicate format ready for direct upload
- [ ] Civitai format includes required metadata
- [ ] Format selector explains differences

---

### Task 6.3: Export UI

**Description:** User interface for LoRA export

#### Subtasks:

| ID | Subtask | Estimate |
|----|---------|----------|
| 6.3.1 | Add "Export for Training" action to talent detail | 1h |
| 6.3.2 | Create export dialog with format selection | 1h |
| 6.3.3 | Show image count and training recommendations | 1h |
| 6.3.4 | Implement download trigger | 1h |
| 6.3.5 | Record export in database for history | 1h |

**Acceptance Criteria:**
- [ ] "Export for Training" visible on talent assets
- [ ] Dialog shows format options with descriptions
- [ ] Warning if image count < 10 (minimum recommended)
- [ ] Download starts automatically on confirm
- [ ] Export recorded in lora_exports table

---

## Summary

| Milestone | Duration | Key Deliverable |
|-----------|----------|-----------------|
| M1: Data Foundation | 1 week | Schema, models, CRUD, image storage |
| M2: Library UI | 1.5 weeks | Browse, view, create, edit assets |
| M3: Generation Integration | 1.5 weeks | Asset selection, prompt assembly, usage tracking |
| M4: Talent Wizard | 1.5 weeks | 5-step guided talent creation |
| M5: Asset Versioning | 1 week | Version history, compare, restore |
| M6: LoRA Export | 0.5 weeks | Training package export |

**Total Estimated Duration:** 7-8 weeks

---

## Definition of Done (Global)

All tasks must meet these criteria before marking complete:

- [ ] Code reviewed and approved
- [ ] Unit tests written and passing
- [ ] Integration tests passing (where applicable)
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Accessibility: keyboard navigable, screen reader compatible
- [ ] Responsive: works at 1024px minimum width
- [ ] Dark mode: styled correctly in both themes
- [ ] Documentation: JSDoc comments on public functions
- [ ] Changelog: entry added for user-facing changes
