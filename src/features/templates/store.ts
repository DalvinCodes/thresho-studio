/**
 * Template Store (Zustand)
 * Manages prompt templates, versions, and labels
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { UUID, ContentType } from '../../core/types/common';
import { createUUID, createTimestamp } from '../../core/types/common';
import type {
  PromptTemplate,
  PromptVersion,
  PromptLabel,
  PromptVariable,
  PromptModelConfig,
  TemplateWithVersion,
  TemplateSearchParams,
} from '../../core/types/prompt';

interface TemplateStoreState {
  // Template data
  templates: Map<UUID, PromptTemplate>;
  versions: Map<UUID, PromptVersion[]>; // templateId -> versions
  labels: Map<UUID, PromptLabel[]>; // templateId -> labels

  // UI state
  selectedTemplateId: UUID | null;
  selectedVersionId: UUID | null;
  searchParams: TemplateSearchParams;
  isLoading: boolean;
  isSaving: boolean;

  // Editor state
  editorDraft: {
    systemPrompt: string;
    userPrompt: string;
    variables: PromptVariable[];
    modelConfig: PromptModelConfig;
  } | null;
  hasUnsavedChanges: boolean;
}

interface TemplateStoreActions {
  // Template CRUD
  createTemplate: (
    name: string,
    outputType: ContentType,
    options?: {
      description?: string;
      category?: string;
      tags?: string[];
    }
  ) => Promise<UUID>;
  updateTemplate: (id: UUID, updates: Partial<PromptTemplate>) => void;
  archiveTemplate: (id: UUID) => void;
  duplicateTemplate: (id: UUID, newName: string) => Promise<UUID>;

  // Version management
  createVersion: (
    templateId: UUID,
    content: {
      systemPrompt?: string;
      userPrompt: string;
      variables?: PromptVariable[];
      modelConfig?: PromptModelConfig;
      changeLog?: string;
    }
  ) => Promise<UUID>;
  getVersion: (versionId: UUID) => PromptVersion | undefined;
  getVersionsForTemplate: (templateId: UUID) => PromptVersion[];
  getLatestVersion: (templateId: UUID) => PromptVersion | undefined;

  // Label management
  setLabel: (templateId: UUID, label: string, versionId: UUID) => void;
  removeLabel: (templateId: UUID, label: string) => void;
  getVersionByLabel: (templateId: UUID, label: string) => PromptVersion | undefined;

  // Selection
  selectTemplate: (id: UUID | null) => void;
  selectVersion: (id: UUID | null) => void;

  // Search/filter
  setSearchParams: (params: Partial<TemplateSearchParams>) => void;
  getFilteredTemplates: () => TemplateWithVersion[];

  // Editor
  startEditing: (templateId: UUID, versionId?: UUID) => void;
  updateEditorDraft: (updates: Partial<TemplateStoreState['editorDraft']>) => void;
  saveEditorDraft: (changeLog?: string) => Promise<UUID | null>;
  discardEditorDraft: () => void;

  // Bulk operations
  loadFromDatabase: () => Promise<void>;
  exportTemplate: (id: UUID) => Promise<string>; // JSON export
  importTemplate: (json: string) => Promise<UUID>;
}

type TemplateStore = TemplateStoreState & TemplateStoreActions;

// Helper to compute content hash
async function computeContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Helper to compute next version number
function getNextVersion(versions: PromptVersion[]): string {
  if (versions.length === 0) return '1.0.0';

  const latest = versions
    .map((v) => v.version.split('.').map(Number))
    .sort((a, b) => {
      for (let i = 0; i < 3; i++) {
        if (a[i] !== b[i]) return b[i] - a[i];
      }
      return 0;
    })[0];

  return `${latest[0]}.${latest[1]}.${latest[2] + 1}`;
}

export const useTemplateStore = create<TemplateStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        templates: new Map(),
        versions: new Map(),
        labels: new Map(),
        selectedTemplateId: null,
        selectedVersionId: null,
        searchParams: {},
        isLoading: false,
        isSaving: false,
        editorDraft: null,
        hasUnsavedChanges: false,

        // Create template
        createTemplate: async (name, outputType, options = {}) => {
          const id = createUUID();
          const now = createTimestamp();

          const template: PromptTemplate = {
            id,
            name,
            description: options.description || '',
            outputType,
            category: options.category || 'general',
            tags: options.tags || [],
            isArchived: false,
            createdAt: now,
            updatedAt: now,
          };

          set((s) => {
            s.templates.set(id, template);
            s.versions.set(id, []);
            s.labels.set(id, []);
          });

          return id;
        },

        // Update template
        updateTemplate: (id, updates) => {
          set((s) => {
            const template = s.templates.get(id);
            if (template) {
              Object.assign(template, updates);
              template.updatedAt = createTimestamp();
            }
          });
        },

        // Archive template
        archiveTemplate: (id) => {
          set((s) => {
            const template = s.templates.get(id);
            if (template) {
              template.isArchived = true;
              template.updatedAt = createTimestamp();
            }
          });
        },

        // Duplicate template
        duplicateTemplate: async (id, newName) => {
          const original = get().templates.get(id);
          if (!original) throw new Error('Template not found');

          const newId = await get().createTemplate(newName, original.outputType, {
            description: `Copy of ${original.name}`,
            category: original.category,
            tags: [...original.tags],
          });

          // Copy latest version if exists
          const latestVersion = get().getLatestVersion(id);
          if (latestVersion) {
            await get().createVersion(newId, {
              systemPrompt: latestVersion.systemPrompt,
              userPrompt: latestVersion.userPrompt,
              variables: [...latestVersion.variables],
              modelConfig: latestVersion.modelConfig
                ? { ...latestVersion.modelConfig }
                : undefined,
              changeLog: `Copied from ${original.name}`,
            });
          }

          return newId;
        },

        // Create version
        createVersion: async (templateId, content) => {
          const template = get().templates.get(templateId);
          if (!template) throw new Error('Template not found');

          const existingVersions = get().versions.get(templateId) || [];
          const version = getNextVersion(existingVersions);

          const contentForHash = JSON.stringify({
            systemPrompt: content.systemPrompt,
            userPrompt: content.userPrompt,
            variables: content.variables,
          });
          const contentHash = await computeContentHash(contentForHash);

          const id = createUUID();
          const promptVersion: PromptVersion = {
            id,
            templateId,
            version,
            contentHash,
            systemPrompt: content.systemPrompt,
            userPrompt: content.userPrompt,
            variables: content.variables || [],
            modelConfig: content.modelConfig,
            changeLog: content.changeLog,
            createdAt: createTimestamp(),
          };

          set((s) => {
            const versions = s.versions.get(templateId) || [];
            versions.push(promptVersion);
            s.versions.set(templateId, versions);

            // Update template's current version
            const t = s.templates.get(templateId);
            if (t) {
              t.currentVersionId = id;
              t.updatedAt = createTimestamp();
            }
          });

          return id;
        },

        // Get version
        getVersion: (versionId) => {
          for (const versions of get().versions.values()) {
            const found = versions.find((v) => v.id === versionId);
            if (found) return found;
          }
          return undefined;
        },

        // Get versions for template
        getVersionsForTemplate: (templateId) => {
          return get().versions.get(templateId) || [];
        },

        // Get latest version
        getLatestVersion: (templateId) => {
          const versions = get().versions.get(templateId) || [];
          if (versions.length === 0) return undefined;

          return versions
            .slice()
            .sort((a, b) => b.createdAt - a.createdAt)[0];
        },

        // Set label
        setLabel: (templateId, label, versionId) => {
          set((s) => {
            const labels = s.labels.get(templateId) || [];
            const existing = labels.find((l) => l.label === label);

            if (existing) {
              existing.versionId = versionId;
              existing.updatedAt = createTimestamp();
            } else {
              labels.push({
                id: createUUID(),
                templateId,
                versionId,
                label,
                labelType: label === 'production' ? 'production' :
                           label === 'staging' ? 'staging' :
                           label === 'draft' ? 'draft' : 'experiment',
                createdAt: createTimestamp(),
                updatedAt: createTimestamp(),
              });
              s.labels.set(templateId, labels);
            }
          });
        },

        // Remove label
        removeLabel: (templateId, label) => {
          set((s) => {
            const labels = s.labels.get(templateId) || [];
            const filtered = labels.filter((l) => l.label !== label);
            s.labels.set(templateId, filtered);
          });
        },

        // Get version by label
        getVersionByLabel: (templateId, label) => {
          const labels = get().labels.get(templateId) || [];
          const labelEntry = labels.find((l) => l.label === label);
          if (!labelEntry) return undefined;

          return get().getVersion(labelEntry.versionId);
        },

        // Selection
        selectTemplate: (id) => {
          set((s) => {
            s.selectedTemplateId = id;
            s.selectedVersionId = null;
          });
        },

        selectVersion: (id) => {
          set((s) => {
            s.selectedVersionId = id;
          });
        },

        // Search/filter
        setSearchParams: (params) => {
          set((s) => {
            Object.assign(s.searchParams, params);
          });
        },

        getFilteredTemplates: () => {
          const { templates, versions, labels, searchParams } = get();
          const results: TemplateWithVersion[] = [];

          for (const template of templates.values()) {
            // Filter archived
            if (template.isArchived && !searchParams.includeArchived) continue;

            // Filter by output type
            if (searchParams.outputType && template.outputType !== searchParams.outputType) continue;

            // Filter by category
            if (searchParams.category && template.category !== searchParams.category) continue;

            // Filter by tags
            if (searchParams.tags?.length) {
              const hasAllTags = searchParams.tags.every((t) =>
                template.tags.includes(t)
              );
              if (!hasAllTags) continue;
            }

            // Filter by search query
            if (searchParams.query) {
              const query = searchParams.query.toLowerCase();
              const matches =
                template.name.toLowerCase().includes(query) ||
                template.description.toLowerCase().includes(query);
              if (!matches) continue;
            }

            const templateVersions = versions.get(template.id) || [];
            const currentVersion = template.currentVersionId
              ? templateVersions.find((v) => v.id === template.currentVersionId)
              : templateVersions[templateVersions.length - 1];

            results.push({
              template,
              currentVersion,
              labels: labels.get(template.id) || [],
              versionCount: templateVersions.length,
            });
          }

          // Sort by updated date
          results.sort((a, b) => b.template.updatedAt - a.template.updatedAt);

          return results;
        },

        // Editor
        startEditing: (templateId, versionId) => {
          const version = versionId
            ? get().getVersion(versionId)
            : get().getLatestVersion(templateId);

          set((s) => {
            s.selectedTemplateId = templateId;
            s.selectedVersionId = versionId || version?.id || null;
            s.editorDraft = {
              systemPrompt: version?.systemPrompt || '',
              userPrompt: version?.userPrompt || '',
              variables: version?.variables || [],
              modelConfig: version?.modelConfig || {},
            };
            s.hasUnsavedChanges = false;
          });
        },

        updateEditorDraft: (updates) => {
          set((s) => {
            if (s.editorDraft) {
              Object.assign(s.editorDraft, updates);
              s.hasUnsavedChanges = true;
            }
          });
        },

        saveEditorDraft: async (changeLog) => {
          const { selectedTemplateId, editorDraft } = get();
          if (!selectedTemplateId || !editorDraft) return null;

          set((s) => {
            s.isSaving = true;
          });

          try {
            const versionId = await get().createVersion(selectedTemplateId, {
              systemPrompt: editorDraft.systemPrompt || undefined,
              userPrompt: editorDraft.userPrompt,
              variables: editorDraft.variables,
              modelConfig: editorDraft.modelConfig,
              changeLog,
            });

            set((s) => {
              s.hasUnsavedChanges = false;
              s.selectedVersionId = versionId;
              s.isSaving = false;
            });

            return versionId;
          } catch (error) {
            set((s) => {
              s.isSaving = false;
            });
            throw error;
          }
        },

        discardEditorDraft: () => {
          set((s) => {
            s.editorDraft = null;
            s.hasUnsavedChanges = false;
          });
        },

        // Bulk operations
        loadFromDatabase: async () => {
          set((s) => {
            s.isLoading = true;
          });

          try {
            // TODO: Load from SQLite
          } finally {
            set((s) => {
              s.isLoading = false;
            });
          }
        },

        exportTemplate: async (id) => {
          const template = get().templates.get(id);
          if (!template) throw new Error('Template not found');

          const versions = get().versions.get(id) || [];
          const templateLabels = get().labels.get(id) || [];

          return JSON.stringify(
            {
              template,
              versions,
              labels: templateLabels,
              exportedAt: new Date().toISOString(),
              version: '1.0',
            },
            null,
            2
          );
        },

        importTemplate: async (json) => {
          const data = JSON.parse(json);
          const { template, versions, labels: importedLabels } = data;

          // Create new template with new ID
          const newId = await get().createTemplate(
            template.name,
            template.outputType,
            {
              description: template.description,
              category: template.category,
              tags: template.tags,
            }
          );

          // Import versions
          const versionIdMap = new Map<string, UUID>();
          for (const version of versions) {
            const newVersionId = await get().createVersion(newId, {
              systemPrompt: version.systemPrompt,
              userPrompt: version.userPrompt,
              variables: version.variables,
              modelConfig: version.modelConfig,
              changeLog: version.changeLog,
            });
            versionIdMap.set(version.id, newVersionId);
          }

          // Import labels
          for (const label of importedLabels) {
            const newVersionId = versionIdMap.get(label.versionId);
            if (newVersionId) {
              get().setLabel(newId, label.label, newVersionId);
            }
          }

          return newId;
        },
      }))
    ),
    { name: 'template-store' }
  )
);

// Selector hooks - use subscribeWithSelector for arrays/objects
export const useTemplates = () => {
  const store = useTemplateStore();
  return store.getFilteredTemplates();
};

export const useSelectedTemplate = () =>
  useTemplateStore((state) =>
    state.selectedTemplateId
      ? state.templates.get(state.selectedTemplateId)
      : null
  );

export const useSelectedVersion = () =>
  useTemplateStore((state) =>
    state.selectedVersionId
      ? state.getVersion(state.selectedVersionId)
      : null
  );

export const useEditorDraft = () => {
  const store = useTemplateStore();
  return store.editorDraft;
};

export const useHasUnsavedChanges = () =>
  useTemplateStore((state) => state.hasUnsavedChanges);
