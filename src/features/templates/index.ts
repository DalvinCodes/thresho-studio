/**
 * Templates Feature Exports
 */

// Store
export {
  useTemplateStore,
  useTemplates,
  useSelectedTemplate,
  useSelectedVersion,
  useEditorDraft,
  useHasUnsavedChanges,
} from './store';

// Services
export {
  renderPrompt,
  renderFromContext,
  extractVariables,
  validateVariables,
  previewPrompt,
  compareVersions,
  getCategories,
  getAllTags,
} from './services/templateService';

// Components
export { TemplateLibrary } from './components/TemplateLibrary';
export { TemplateEditor } from './components/TemplateEditor';

// Types (re-export from core)
export type {
  PromptTemplate,
  PromptVersion,
  PromptVariable,
  PromptLabel,
  PromptExecutionContext,
  RenderedPrompt,
  TemplateWithVersion,
} from '../../core/types/prompt';
