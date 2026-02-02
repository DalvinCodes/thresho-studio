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
  validateShotForGenerationDetailed,
  suggestShotType,
  suggestLighting,
  calculateShotComplexity,
  formatShotType,
  formatCameraMovement,
  formatLighting,
} from './services/shotPromptService';

export type {
  ShotGenerationContext,
  ShotPromptResult,
} from './services/shotPromptService';

export {
  parseShotCsv,
  generateShotCsvTemplate,
} from './services/csvImportService';

export type {
  ImportResult,
  CsvShotRow,
} from './services/csvImportService';

// Components
export { ShotListView } from './components/ShotListView';
export { ShotEditor } from './components/ShotEditor';
export { BatchCreateModal } from './components/BatchCreateModal';
export { EnhancedShotTable } from './components/EnhancedShotTable';
export { InlineBatchRow } from './components/InlineBatchRow';
export { CsvInstructionsModal } from './components/CsvInstructionsModal';
export { ShotGenerationPanel } from './components/ShotGenerationPanel';

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
