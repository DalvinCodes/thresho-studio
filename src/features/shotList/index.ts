/**
 * Shot List Feature Exports
 */

// Store
export {
  useShotListStore,
  useShotLists,
  useShotList,
  useSelectedShotList,
  useSelectedShot,
  useShotsForList,
  useFilteredShots,
  useEquipmentPresets,
  useViewMode,
  useFilterOptions,
  useSortOptions,
  useListStats,
} from './store';

// Services
export {
  composeShotPrompt,
  generateStoryboardDescription,
  validateShotForGeneration,
  suggestShotType,
  suggestLighting,
  calculateShotComplexity,
} from './services/shotPromptService';

// Components
export { ShotListView } from './components/ShotListView';
export { ShotEditor } from './components/ShotEditor';

// Types (re-export from core)
export type {
  Shot,
  ShotList,
  ShotWithDetails,
  CreateShotInput,
  BatchShotUpdate,
  EquipmentPreset,
  ShotType,
  CameraMovement,
  LightingSetup,
  AspectRatio,
  ShotStatus,
  ShotListViewMode,
  ShotFilterOptions,
  ShotSortOptions,
  ShotSortField,
  StoryboardExportOptions,
  ShotSuggestionRequest,
  ShotSuggestion,
  ShotPromptContext,
  ComposedShotPrompt,
} from '../../core/types/shotList';
