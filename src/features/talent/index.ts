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

// Components
export { TalentLibrary } from './components/TalentLibrary';
export { TalentEditor } from './components/TalentEditor';
export { TalentCard } from './components/TalentCard';
export { TalentSelector } from './components/TalentSelector';

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
} from '../../core/types/talent';
