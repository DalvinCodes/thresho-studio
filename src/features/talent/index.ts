/**
 * Talent Feature Exports
 */

// Store
export {
  useTalentStore,
  useTalents,
  useTalent,
  useSelectedTalent,
  useFilteredTalents,
  useTalentEditor,
  useTalentsByType,
  useFavoriteTalents,
  useTalentTags,
  useTalentGenerationState,
  initTalentStore,
} from './store';

// Services
export {
  loadTalentsFromDb,
  saveTalentToDb,
  deleteTalentFromDb,
  saveReferenceImageToDb,
  deleteReferenceImageFromDb,
  getTalentFromDb,
} from './services/talentDbService';

export {
  composeTalentPrompt,
  composeTalentsPrompt,
  getTalentSummary,
} from './services/talentPromptService';

export {
  buildHeadshotPrompt,
  buildCharacterSheetPrompts,
  hasAppearanceAttributes,
  generateRandomAttributes,
  mergeWithRandomAttributes,
  CHARACTER_SHEET_ANGLES,
} from './services/headshotGenerationService';

export {
  analyzeHeadshotImage,
  mergeAnalyzedAttributes,
} from './services/talentVisionService';

// Components
export { TalentLibrary } from './components/TalentLibrary';
export { TalentEditor } from './components/TalentEditor';
export { TalentCard } from './components/TalentCard';
export { TalentSelector } from './components/TalentSelector';
export { TalentAIGenerationTab } from './components/TalentAIGenerationTab';
export { HeadshotGenerator } from './components/HeadshotGenerator';
export { CharacterSheetGenerator } from './components/CharacterSheetGenerator';

// Types (re-export from core)
export type {
  TalentProfile,
  TalentType,
  TalentReferenceImage,
  TalentAppearance,
  TalentPersonality,
  TalentPromptFragments,
  TalentFilters,
  TalentValidationResult,
  CharacterSheetAngle,
  TalentGeneratedImage,
  TalentGenerationState,
} from '../../core/types/talent';
