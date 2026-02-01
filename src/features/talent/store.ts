/**
 * Talent Store
 * Manages talent profiles with persistence
 */

import { useMemo } from 'react';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { UUID } from '../../core/types/common';
import { createUUID, createTimestamp } from '../../core/types/common';
import {
  loadTalentsFromDb,
  saveTalentToDb,
  deleteTalentFromDb,
  saveReferenceImageToDb,
  deleteReferenceImageFromDb,
} from './services/talentDbService';
import type {
  TalentProfile,
  TalentType,
  TalentReferenceImage,
  TalentFilters,
  TalentAppearance,
  TalentPersonality,
  TalentPromptFragments,
  TalentValidationResult,
} from '../../core/types/talent';

interface TalentState {
  // Data
  talents: Map<UUID, TalentProfile>;
  selectedTalentId: UUID | null;

  // UI State
  searchQuery: string;
  filters: TalentFilters;
  isEditing: boolean;
  editDraft: Partial<TalentProfile> | null;
  isDirty: boolean;
}

interface TalentActions {
  // CRUD Operations
  createTalent: (name: string, type: TalentType) => UUID;
  updateTalent: (id: UUID, updates: Partial<TalentProfile>) => void;
  deleteTalent: (id: UUID) => void;
  duplicateTalent: (id: UUID, newName: string) => UUID;

  // Reference Images
  addReferenceImage: (talentId: UUID, url: string, caption?: string) => UUID;
  removeReferenceImage: (talentId: UUID, imageId: UUID) => void;
  setPrimaryImage: (talentId: UUID, imageId: UUID) => void;

  // Selection
  setSelectedTalent: (id: UUID | null) => void;

  // Search and Filter
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<TalentFilters>) => void;
  clearFilters: () => void;

  // Favorites and Archive
  toggleFavorite: (id: UUID) => void;
  toggleArchive: (id: UUID) => void;

  // Tags
  addTag: (id: UUID, tag: string) => void;
  removeTag: (id: UUID, tag: string) => void;
  getAllTags: () => string[];

  // Editor State
  startEditing: (id: UUID) => void;
  updateDraft: (updates: Partial<TalentProfile>) => void;
  saveDraft: () => void;
  discardDraft: () => void;

  // Validation
  validateTalent: (id: UUID) => TalentValidationResult;

  // Multi-select
  getTalentsByIds: (ids: UUID[]) => TalentProfile[];

  // Persistence
  loadFromDatabase: (talents: TalentProfile[]) => void;
  exportTalent: (id: UUID) => string;
  importTalent: (json: string) => UUID;
}

type TalentStore = TalentState & TalentActions;

// Create default appearance
function createDefaultAppearance(): TalentAppearance {
  return {
    hair: {},
    eyes: {},
    skin: {},
    distinguishingFeatures: [],
    accessories: [],
  };
}

// Create default prompt fragments
function createDefaultPromptFragments(): TalentPromptFragments {
  return {
    default: '',
  };
}

export const useTalentStore = create<TalentStore>()(
  immer((set, get) => ({
    // Initial state
    talents: new Map(),
    selectedTalentId: null,
    searchQuery: '',
    filters: {},
    isEditing: false,
    editDraft: null,
    isDirty: false,

    // CRUD Operations
    createTalent: (name, type) => {
      const id = createUUID();
      const now = createTimestamp();

      const talent: TalentProfile = {
        id,
        name,
        type,
        description: '',
        appearance: createDefaultAppearance(),
        referenceImages: [],
        promptFragments: createDefaultPromptFragments(),
        tags: [],
        isFavorite: false,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      };

      set((state) => {
        state.talents.set(id, talent);
        state.selectedTalentId = id;
      });

      // Persist to database
      saveTalentToDb(talent).catch((err) =>
        console.error('Failed to save talent to database:', err)
      );

      return id;
    },

    updateTalent: (id, updates) => {
      set((state) => {
        const talent = state.talents.get(id);
        if (talent) {
          Object.assign(talent, updates, { updatedAt: createTimestamp() });
        }
      });

      // Get the updated talent AFTER set() completes to avoid Immer draft proxy issues
      const updatedTalent = get().talents.get(id);
      if (updatedTalent) {
        saveTalentToDb(updatedTalent).catch((err) =>
          console.error('Failed to update talent in database:', err)
        );
      }
    },

    deleteTalent: (id) => {
      set((state) => {
        state.talents.delete(id);
        if (state.selectedTalentId === id) {
          state.selectedTalentId = null;
        }
      });

      deleteTalentFromDb(id).catch((err) =>
        console.error('Failed to delete talent from database:', err)
      );
    },

    duplicateTalent: (id, newName) => {
      const original = get().talents.get(id);
      if (!original) throw new Error('Talent not found');

      const newId = createUUID();
      const now = createTimestamp();

      // Deep clone reference images with new IDs
      const newImages: TalentReferenceImage[] = original.referenceImages.map(img => ({
        ...img,
        id: createUUID(),
        talentId: newId,
        createdAt: now,
      }));

      const duplicate: TalentProfile = {
        ...original,
        id: newId,
        name: newName,
        createdAt: now,
        updatedAt: now,
        isFavorite: false,
        referenceImages: newImages,
        primaryImageId: undefined,
        appearance: JSON.parse(JSON.stringify(original.appearance)),
        personality: original.personality ? JSON.parse(JSON.stringify(original.personality)) : undefined,
        promptFragments: JSON.parse(JSON.stringify(original.promptFragments)),
        tags: [...original.tags],
      };

      set((state) => {
        state.talents.set(newId, duplicate);
        state.selectedTalentId = newId;
      });

      // Save to database
      saveTalentToDb(duplicate).catch((err) =>
        console.error('Failed to save duplicated talent to database:', err)
      );

      // Save reference images
      for (const image of newImages) {
        saveReferenceImageToDb(image).catch((err) =>
          console.error('Failed to save reference image to database:', err)
        );
      }

      return newId;
    },

    // Reference Images
    addReferenceImage: (talentId, url, caption) => {
      const imageId = createUUID();
      const now = createTimestamp();

      const talent = get().talents.get(talentId);
      if (!talent) throw new Error('Talent not found');

      const isPrimary = talent.referenceImages.length === 0;

      const image: TalentReferenceImage = {
        id: imageId,
        talentId,
        url,
        caption,
        isPrimary,
        createdAt: now,
      };

      set((state) => {
        const t = state.talents.get(talentId);
        if (t) {
          t.referenceImages.push(image);
          if (isPrimary) {
            t.primaryImageId = imageId;
          }
          t.updatedAt = createTimestamp();
        }
      });

      // Save to database
      saveReferenceImageToDb(image).catch((err) =>
        console.error('Failed to save reference image to database:', err)
      );

      const updatedTalent = get().talents.get(talentId);
      if (updatedTalent) {
        saveTalentToDb(updatedTalent).catch((err) =>
          console.error('Failed to update talent in database:', err)
        );
      }

      return imageId;
    },

    removeReferenceImage: (talentId, imageId) => {
      set((state) => {
        const talent = state.talents.get(talentId);
        if (talent) {
          talent.referenceImages = talent.referenceImages.filter(img => img.id !== imageId);
          if (talent.primaryImageId === imageId) {
            talent.primaryImageId = talent.referenceImages[0]?.id;
            // Update isPrimary flags
            for (const img of talent.referenceImages) {
              img.isPrimary = img.id === talent.primaryImageId;
            }
          }
          talent.updatedAt = createTimestamp();
        }
      });

      deleteReferenceImageFromDb(imageId).catch((err) =>
        console.error('Failed to delete reference image from database:', err)
      );

      const updatedTalent = get().talents.get(talentId);
      if (updatedTalent) {
        saveTalentToDb(updatedTalent).catch((err) =>
          console.error('Failed to update talent in database:', err)
        );
      }
    },

    setPrimaryImage: (talentId, imageId) => {
      set((state) => {
        const talent = state.talents.get(talentId);
        if (talent) {
          talent.primaryImageId = imageId;
          for (const img of talent.referenceImages) {
            img.isPrimary = img.id === imageId;
          }
          talent.updatedAt = createTimestamp();
        }
      });

      const updatedTalent = get().talents.get(talentId);
      if (updatedTalent) {
        saveTalentToDb(updatedTalent).catch((err) =>
          console.error('Failed to update talent in database:', err)
        );

        // Update reference images in database
        for (const image of updatedTalent.referenceImages) {
          saveReferenceImageToDb(image).catch((err) =>
            console.error('Failed to update reference image in database:', err)
          );
        }
      }
    },

    // Selection
    setSelectedTalent: (id) => {
      set((state) => {
        state.selectedTalentId = id;
      });
    },

    // Search and Filter
    setSearchQuery: (query) => {
      set((state) => {
        state.searchQuery = query;
      });
    },

    setFilters: (filters) => {
      set((state) => {
        state.filters = { ...state.filters, ...filters };
      });
    },

    clearFilters: () => {
      set((state) => {
        state.filters = {};
        state.searchQuery = '';
      });
    },

    // Favorites and Archive
    toggleFavorite: (id) => {
      set((state) => {
        const talent = state.talents.get(id);
        if (talent) {
          talent.isFavorite = !talent.isFavorite;
          talent.updatedAt = createTimestamp();
        }
      });

      // Get the updated talent AFTER set() completes to avoid Immer draft proxy issues
      const updatedTalent = get().talents.get(id);
      if (updatedTalent) {
        saveTalentToDb(updatedTalent).catch((err) =>
          console.error('Failed to update talent in database:', err)
        );
      }
    },

    toggleArchive: (id) => {
      set((state) => {
        const talent = state.talents.get(id);
        if (talent) {
          talent.isArchived = !talent.isArchived;
          talent.updatedAt = createTimestamp();
        }
      });

      // Get the updated talent AFTER set() completes to avoid Immer draft proxy issues
      const updatedTalent = get().talents.get(id);
      if (updatedTalent) {
        saveTalentToDb(updatedTalent).catch((err) =>
          console.error('Failed to update talent in database:', err)
        );
      }
    },

    // Tags
    addTag: (id, tag) => {
      set((state) => {
        const talent = state.talents.get(id);
        if (talent && !talent.tags.includes(tag)) {
          talent.tags.push(tag);
          talent.updatedAt = createTimestamp();
          
          // Also update the edit draft if we're editing this talent
          if (state.editDraft && state.selectedTalentId === id && !state.editDraft.tags.includes(tag)) {
            state.editDraft.tags.push(tag);
          }
        }
      });

      // Get the updated talent AFTER set() completes to avoid Immer draft proxy issues
      const updatedTalent = get().talents.get(id);
      if (updatedTalent) {
        saveTalentToDb(updatedTalent).catch((err) =>
          console.error('Failed to update talent in database:', err)
        );
      }
    },

    removeTag: (id, tag) => {
      set((state) => {
        const talent = state.talents.get(id);
        if (talent) {
          talent.tags = talent.tags.filter((t) => t !== tag);
          talent.updatedAt = createTimestamp();
          
          // Also update the edit draft if we're editing this talent
          if (state.editDraft && state.selectedTalentId === id) {
            state.editDraft.tags = state.editDraft.tags.filter((t) => t !== tag);
          }
        }
      });

      // Get the updated talent AFTER set() completes to avoid Immer draft proxy issues
      const updatedTalent = get().talents.get(id);
      if (updatedTalent) {
        saveTalentToDb(updatedTalent).catch((err) =>
          console.error('Failed to update talent in database:', err)
        );
      }
    },

    getAllTags: () => {
      const tags = new Set<string>();
      for (const talent of get().talents.values()) {
        for (const tag of talent.tags) {
          tags.add(tag);
        }
      }
      return Array.from(tags).sort();
    },

    // Editor State
    startEditing: (id) => {
      const talent = get().talents.get(id);
      if (talent) {
        set((state) => {
          state.isEditing = true;
          state.editDraft = JSON.parse(JSON.stringify(talent));
          state.isDirty = false;
          state.selectedTalentId = id;
        });
      }
    },

    updateDraft: (updates) => {
      set((state) => {
        if (state.editDraft) {
          Object.assign(state.editDraft, updates);
          state.isDirty = true;
        }
      });
    },

    saveDraft: () => {
      const state = get();
      if (state.editDraft && state.selectedTalentId) {
        get().updateTalent(state.selectedTalentId, state.editDraft as TalentProfile);
        set((s) => {
          s.isEditing = false;
          s.editDraft = null;
          s.isDirty = false;
        });
      }
    },

    discardDraft: () => {
      set((state) => {
        state.isEditing = false;
        state.editDraft = null;
        state.isDirty = false;
      });
    },

    // Validation
    validateTalent: (id) => {
      const talent = get().talents.get(id);
      if (!talent) {
        return {
          isValid: false,
          errors: [{ field: 'id', message: 'Talent not found' }],
          warnings: [],
        };
      }

      const errors: TalentValidationResult['errors'] = [];
      const warnings: TalentValidationResult['warnings'] = [];

      // Required fields
      if (!talent.name.trim()) {
        errors.push({ field: 'name', message: 'Talent name is required' });
      }

      if (!talent.type) {
        errors.push({ field: 'type', message: 'Talent type is required' });
      }

      // Warnings for incomplete profiles
      if (!talent.description) {
        warnings.push({ field: 'description', message: 'Consider adding a description' });
      }

      if (!talent.promptFragments.default) {
        warnings.push({ field: 'promptFragments.default', message: 'Consider adding a default prompt fragment' });
      }

      if (talent.referenceImages.length === 0) {
        warnings.push({ field: 'referenceImages', message: 'Consider adding reference images' });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    },

    // Multi-select
    getTalentsByIds: (ids) => {
      const talents: TalentProfile[] = [];
      for (const id of ids) {
        const talent = get().talents.get(id);
        if (talent) {
          talents.push(talent);
        }
      }
      return talents;
    },

    // Persistence
    loadFromDatabase: (talents) => {
      set((state) => {
        state.talents.clear();
        for (const talent of talents) {
          state.talents.set(talent.id, talent);
        }
      });
    },

    exportTalent: (id) => {
      const talent = get().talents.get(id);
      if (!talent) throw new Error('Talent not found');
      return JSON.stringify(talent, null, 2);
    },

    importTalent: (json) => {
      const imported = JSON.parse(json) as TalentProfile;
      const newId = createUUID();
      const now = createTimestamp();

      // Create new IDs for reference images
      const newImages: TalentReferenceImage[] = imported.referenceImages.map(img => ({
        ...img,
        id: createUUID(),
        talentId: newId,
        createdAt: now,
      }));

      const talent: TalentProfile = {
        ...imported,
        id: newId,
        createdAt: now,
        updatedAt: now,
        referenceImages: newImages,
        primaryImageId: newImages.find(img => img.isPrimary)?.id,
        name: `${imported.name} (Imported)`,
      };

      set((state) => {
        state.talents.set(newId, talent);
      });

      // Save to database
      saveTalentToDb(talent).catch((err) =>
        console.error('Failed to save imported talent to database:', err)
      );

      for (const image of newImages) {
        saveReferenceImageToDb(image).catch((err) =>
          console.error('Failed to save reference image to database:', err)
        );
      }

      return newId;
    },
  }))
);

// Selectors - memoized to prevent infinite re-renders
export const useTalents = () => {
  const talents = useTalentStore((state) => state.talents);
  return useMemo(
    () => Array.from(talents.values()).filter((t) => !t.isArchived),
    [talents]
  );
};

export const useTalent = (id: UUID | null) => {
  const talents = useTalentStore((state) => state.talents);
  return useMemo(() => (id ? talents.get(id) : undefined), [talents, id]);
};

export const useSelectedTalent = () => {
  const talents = useTalentStore((state) => state.talents);
  const selectedTalentId = useTalentStore((state) => state.selectedTalentId);
  return useMemo(
    () => (selectedTalentId ? talents.get(selectedTalentId) : undefined),
    [talents, selectedTalentId]
  );
};

export const useFilteredTalents = () => {
  const talents = useTalentStore((state) => state.talents);
  const searchQuery = useTalentStore((state) => state.searchQuery);
  const filters = useTalentStore((state) => state.filters);

  return useMemo(() => {
    let result = Array.from(talents.values());

    // Filter by archived status (default: show non-archived)
    if (filters.isArchived !== undefined) {
      result = result.filter((t) => t.isArchived === filters.isArchived);
    } else {
      result = result.filter((t) => !t.isArchived);
    }

    // Filter by type
    if (filters.type) {
      result = result.filter((t) => t.type === filters.type);
    }

    // Filter by favorite
    if (filters.isFavorite !== undefined) {
      result = result.filter((t) => t.isFavorite === filters.isFavorite);
    }

    // Filter by brand
    if (filters.brandId) {
      result = result.filter((t) => t.brandId === filters.brandId);
    }

    // Filter by project
    if (filters.projectId) {
      result = result.filter((t) => t.projectId === filters.projectId);
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      result = result.filter((t) =>
        filters.tags!.some((tag) => t.tags.includes(tag))
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Sort by creation date (newest first)
    result.sort((a, b) => b.createdAt - a.createdAt);

    return result;
  }, [talents, searchQuery, filters]);
};

export const useTalentEditor = () => {
  const isEditing = useTalentStore((state) => state.isEditing);
  const editDraft = useTalentStore((state) => state.editDraft);
  const isDirty = useTalentStore((state) => state.isDirty);
  return useMemo(
    () => ({ isEditing, draft: editDraft, isDirty }),
    [isEditing, editDraft, isDirty]
  );
};

export const useTalentsByType = (type: TalentType) => {
  const talents = useTalentStore((state) => state.talents);
  return useMemo(
    () => Array.from(talents.values()).filter((t) => t.type === type && !t.isArchived),
    [talents, type]
  );
};

export const useFavoriteTalents = () => {
  const talents = useTalentStore((state) => state.talents);
  return useMemo(
    () => Array.from(talents.values()).filter((t) => t.isFavorite && !t.isArchived),
    [talents]
  );
};

export const useTalentTags = () => {
  const talents = useTalentStore((state) => state.talents);
  return useMemo(() => {
    const tags = new Set<string>();
    for (const talent of talents.values()) {
      for (const tag of talent.tags) {
        tags.add(tag);
      }
    }
    return Array.from(tags).sort();
  }, [talents]);
};

/**
 * Initialize talent store from database
 * Call this on app startup
 */
export async function initTalentStore(): Promise<void> {
  try {
    const talents = await loadTalentsFromDb();
    useTalentStore.getState().loadFromDatabase(talents);
    console.log(`Loaded ${talents.length} talents from database`);
  } catch (error) {
    console.error('Failed to load talents from database:', error);
  }
}
