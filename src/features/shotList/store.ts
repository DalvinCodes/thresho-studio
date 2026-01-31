/**
 * Shot List Store
 * Manages shot lists and individual shots with persistence
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { UUID, ContentType } from '../../core/types/common';
import { createUUID, createTimestamp } from '../../core/types/common';
import type {
  Shot,
  ShotList,
  ShotWithDetails,
  CreateShotInput,
  BatchShotUpdate,
  EquipmentPreset,
  ShotStatus,
  ShotFilterOptions,
  ShotSortOptions,
  ShotListViewMode,
} from '../../core/types/shotList';

interface ShotListState {
  // Data
  shotLists: Map<UUID, ShotList>;
  shots: Map<UUID, Shot>;
  equipmentPresets: Map<UUID, EquipmentPreset>;

  // UI State
  selectedShotListId: UUID | null;
  selectedShotId: UUID | null;
  viewMode: ShotListViewMode;
  filterOptions: ShotFilterOptions;
  sortOptions: ShotSortOptions;

  // Editor State
  isEditing: boolean;
  editingShotId: UUID | null;
}

interface ShotListActions {
  // Shot List CRUD
  createShotList: (name: string, contentType: ContentType) => UUID;
  updateShotList: (id: UUID, updates: Partial<ShotList>) => void;
  deleteShotList: (id: UUID) => void;
  duplicateShotList: (id: UUID, newName: string) => UUID;

  // Shot CRUD
  createShot: (input: CreateShotInput) => UUID;
  updateShot: (id: UUID, updates: Partial<Shot>) => void;
  deleteShot: (id: UUID) => void;
  duplicateShot: (id: UUID) => UUID;
  batchUpdateShots: (update: BatchShotUpdate) => void;

  // Shot Ordering
  reorderShot: (shotId: UUID, newIndex: number) => void;
  moveShot: (shotId: UUID, targetShotListId: UUID) => void;

  // Shot Status
  updateShotStatus: (shotId: UUID, status: ShotStatus) => void;
  markShotsCompleted: (shotIds: UUID[]) => void;

  // Equipment Presets
  createEquipmentPreset: (preset: Omit<EquipmentPreset, 'id' | 'createdAt' | 'updatedAt'>) => UUID;
  updateEquipmentPreset: (id: UUID, updates: Partial<EquipmentPreset>) => void;
  deleteEquipmentPreset: (id: UUID) => void;
  applyPresetToShot: (shotId: UUID, presetId: UUID) => void;

  // Selection
  selectShotList: (id: UUID | null) => void;
  selectShot: (id: UUID | null) => void;

  // View State
  setViewMode: (mode: ShotListViewMode) => void;
  setFilterOptions: (options: Partial<ShotFilterOptions>) => void;
  setSortOptions: (options: ShotSortOptions) => void;
  clearFilters: () => void;

  // Editor
  startEditingShot: (id: UUID) => void;
  stopEditing: () => void;

  // Queries
  getShotsForList: (listId: UUID) => Shot[];
  getFilteredShots: (listId: UUID) => Shot[];
  getSortedShots: (listId: UUID) => Shot[];
  getShotWithDetails: (id: UUID) => ShotWithDetails | null;

  // Statistics
  getListStats: (listId: UUID) => {
    total: number;
    byStatus: Record<ShotStatus, number>;
    completed: number;
    averagePriority: number;
  };

  // Persistence
  loadFromDatabase: (data: {
    shotLists: ShotList[];
    shots: Shot[];
    presets: EquipmentPreset[];
  }) => void;
}

type ShotListStore = ShotListState & ShotListActions;

// Default filter options
const defaultFilterOptions: ShotFilterOptions = {};

// Default sort options
const defaultSortOptions: ShotSortOptions = {
  field: 'orderIndex',
  direction: 'asc',
};

export const useShotListStore = create<ShotListStore>()(
  immer((set, get) => ({
    // Initial state
    shotLists: new Map(),
    shots: new Map(),
    equipmentPresets: new Map(),
    selectedShotListId: null,
    selectedShotId: null,
    viewMode: 'table',
    filterOptions: defaultFilterOptions,
    sortOptions: defaultSortOptions,
    isEditing: false,
    editingShotId: null,

    // Shot List CRUD
    createShotList: (name, contentType) => {
      const id = createUUID();
      const now = createTimestamp();

      const shotList: ShotList = {
        id,
        name,
        contentType,
        createdAt: now,
        updatedAt: now,
        status: 'draft',
        totalShots: 0,
        completedShots: 0,
        defaultAspectRatio: contentType === 'video' ? '16:9' : '4:3',
        defaultLighting: 'natural',
        tags: [],
      };

      set((state) => {
        state.shotLists.set(id, shotList);
      });

      return id;
    },

    updateShotList: (id, updates) => {
      set((state) => {
        const list = state.shotLists.get(id);
        if (list) {
          Object.assign(list, updates, { updatedAt: createTimestamp() });
        }
      });
    },

    deleteShotList: (id) => {
      set((state) => {
        // Delete all shots in the list
        for (const shot of state.shots.values()) {
          if (shot.shotListId === id) {
            state.shots.delete(shot.id);
          }
        }
        state.shotLists.delete(id);

        if (state.selectedShotListId === id) {
          state.selectedShotListId = null;
          state.selectedShotId = null;
        }
      });
    },

    duplicateShotList: (id, newName) => {
      const original = get().shotLists.get(id);
      if (!original) throw new Error('Shot list not found');

      const newId = createUUID();
      const now = createTimestamp();

      // Create new shot list
      const duplicate: ShotList = {
        ...original,
        id: newId,
        name: newName,
        createdAt: now,
        updatedAt: now,
        status: 'draft',
        totalShots: 0,
        completedShots: 0,
      };

      set((state) => {
        state.shotLists.set(newId, duplicate);

        // Duplicate all shots
        for (const shot of state.shots.values()) {
          if (shot.shotListId === id) {
            const newShotId = createUUID();
            const newShot: Shot = {
              ...shot,
              id: newShotId,
              shotListId: newId,
              createdAt: now,
              updatedAt: now,
              status: 'planned',
              generatedAssetId: undefined,
            };
            state.shots.set(newShotId, newShot);
            duplicate.totalShots++;
          }
        }
      });

      return newId;
    },

    // Shot CRUD
    createShot: (input) => {
      const id = createUUID();
      const now = createTimestamp();

      // Get the shot list to use defaults
      const shotList = get().shotLists.get(input.shotListId);
      if (!shotList) throw new Error('Shot list not found');

      // Get the next order index
      const shotsInList = get().getShotsForList(input.shotListId);
      const maxIndex = shotsInList.reduce((max, s) => Math.max(max, s.orderIndex), -1);

      const shot: Shot = {
        id,
        shotListId: input.shotListId,
        shotNumber: String(shotsInList.length + 1),
        name: input.name,
        description: input.description,
        shotType: input.shotType || 'medium',
        cameraMovement: input.cameraMovement || 'static',
        lighting: input.lighting || shotList.defaultLighting,
        aspectRatio: input.aspectRatio || shotList.defaultAspectRatio,
        duration: input.duration,
        location: input.location,
        subjects: input.subjects || [],
        props: [],
        status: 'planned',
        priority: input.priority || 3,
        orderIndex: maxIndex + 1,
        tags: input.tags || [],
        createdAt: now,
        updatedAt: now,
      };

      set((state) => {
        state.shots.set(id, shot);

        // Update shot list count
        const list = state.shotLists.get(input.shotListId);
        if (list) {
          list.totalShots++;
          list.updatedAt = now;
        }
      });

      return id;
    },

    updateShot: (id, updates) => {
      set((state) => {
        const shot = state.shots.get(id);
        if (shot) {
          Object.assign(shot, updates, { updatedAt: createTimestamp() });
        }
      });
    },

    deleteShot: (id) => {
      set((state) => {
        const shot = state.shots.get(id);
        if (shot) {
          // Update shot list count
          const list = state.shotLists.get(shot.shotListId);
          if (list) {
            list.totalShots--;
            if (shot.status === 'completed') {
              list.completedShots--;
            }
            list.updatedAt = createTimestamp();
          }

          state.shots.delete(id);

          if (state.selectedShotId === id) {
            state.selectedShotId = null;
          }
        }
      });
    },

    duplicateShot: (id) => {
      const original = get().shots.get(id);
      if (!original) throw new Error('Shot not found');

      const newId = createUUID();
      const now = createTimestamp();

      const shotsInList = get().getShotsForList(original.shotListId);
      const maxIndex = shotsInList.reduce((max, s) => Math.max(max, s.orderIndex), -1);

      const duplicate: Shot = {
        ...original,
        id: newId,
        shotNumber: `${original.shotNumber}A`,
        name: `${original.name} (Copy)`,
        createdAt: now,
        updatedAt: now,
        status: 'planned',
        orderIndex: maxIndex + 1,
        generatedAssetId: undefined,
      };

      set((state) => {
        state.shots.set(newId, duplicate);

        const list = state.shotLists.get(original.shotListId);
        if (list) {
          list.totalShots++;
          list.updatedAt = now;
        }
      });

      return newId;
    },

    batchUpdateShots: (update) => {
      set((state) => {
        const now = createTimestamp();
        for (const shotId of update.shotIds) {
          const shot = state.shots.get(shotId);
          if (shot) {
            Object.assign(shot, update.updates, { updatedAt: now });
          }
        }
      });
    },

    // Shot Ordering
    reorderShot: (shotId, newIndex) => {
      set((state) => {
        const shot = state.shots.get(shotId);
        if (!shot) return;

        const shotsInList = Array.from(state.shots.values())
          .filter((s) => s.shotListId === shot.shotListId)
          .sort((a, b) => a.orderIndex - b.orderIndex);

        const currentIndex = shotsInList.findIndex((s) => s.id === shotId);
        if (currentIndex === -1) return;

        // Remove from current position and insert at new position
        shotsInList.splice(currentIndex, 1);
        shotsInList.splice(newIndex, 0, shot);

        // Update order indices
        shotsInList.forEach((s, i) => {
          const stateShot = state.shots.get(s.id);
          if (stateShot) {
            stateShot.orderIndex = i;
          }
        });
      });
    },

    moveShot: (shotId, targetShotListId) => {
      set((state) => {
        const shot = state.shots.get(shotId);
        if (!shot) return;

        const oldListId = shot.shotListId;

        // Update counts on old list
        const oldList = state.shotLists.get(oldListId);
        if (oldList) {
          oldList.totalShots--;
          if (shot.status === 'completed') {
            oldList.completedShots--;
          }
        }

        // Get new order index in target list
        const targetShots = Array.from(state.shots.values())
          .filter((s) => s.shotListId === targetShotListId);
        const maxIndex = targetShots.reduce((max, s) => Math.max(max, s.orderIndex), -1);

        // Update shot
        shot.shotListId = targetShotListId;
        shot.orderIndex = maxIndex + 1;
        shot.updatedAt = createTimestamp();

        // Update counts on new list
        const newList = state.shotLists.get(targetShotListId);
        if (newList) {
          newList.totalShots++;
          if (shot.status === 'completed') {
            newList.completedShots++;
          }
        }
      });
    },

    // Shot Status
    updateShotStatus: (shotId, status) => {
      set((state) => {
        const shot = state.shots.get(shotId);
        if (!shot) return;

        const wasCompleted = shot.status === 'completed';
        const isNowCompleted = status === 'completed';

        shot.status = status;
        shot.updatedAt = createTimestamp();

        // Update list counts
        const list = state.shotLists.get(shot.shotListId);
        if (list) {
          if (!wasCompleted && isNowCompleted) {
            list.completedShots++;
          } else if (wasCompleted && !isNowCompleted) {
            list.completedShots--;
          }
        }
      });
    },

    markShotsCompleted: (shotIds) => {
      for (const id of shotIds) {
        get().updateShotStatus(id, 'completed');
      }
    },

    // Equipment Presets
    createEquipmentPreset: (preset) => {
      const id = createUUID();
      const now = createTimestamp();

      const newPreset: EquipmentPreset = {
        ...preset,
        id,
        createdAt: now,
        updatedAt: now,
      };

      set((state) => {
        state.equipmentPresets.set(id, newPreset);
      });

      return id;
    },

    updateEquipmentPreset: (id, updates) => {
      set((state) => {
        const preset = state.equipmentPresets.get(id);
        if (preset) {
          Object.assign(preset, updates, { updatedAt: createTimestamp() });
        }
      });
    },

    deleteEquipmentPreset: (id) => {
      set((state) => {
        state.equipmentPresets.delete(id);
      });
    },

    applyPresetToShot: (shotId, presetId) => {
      const preset = get().equipmentPresets.get(presetId);
      if (!preset) return;

      get().updateShot(shotId, {
        shotType: preset.shotType,
        cameraMovement: preset.movement,
        lighting: preset.lighting,
        aspectRatio: preset.aspectRatio,
        fps: preset.fps,
      });
    },

    // Selection
    selectShotList: (id) => {
      set((state) => {
        state.selectedShotListId = id;
        state.selectedShotId = null;
      });
    },

    selectShot: (id) => {
      set((state) => {
        state.selectedShotId = id;
      });
    },

    // View State
    setViewMode: (mode) => {
      set((state) => {
        state.viewMode = mode;
      });
    },

    setFilterOptions: (options) => {
      set((state) => {
        state.filterOptions = { ...state.filterOptions, ...options };
      });
    },

    setSortOptions: (options) => {
      set((state) => {
        state.sortOptions = options;
      });
    },

    clearFilters: () => {
      set((state) => {
        state.filterOptions = defaultFilterOptions;
      });
    },

    // Editor
    startEditingShot: (id) => {
      set((state) => {
        state.isEditing = true;
        state.editingShotId = id;
        state.selectedShotId = id;
      });
    },

    stopEditing: () => {
      set((state) => {
        state.isEditing = false;
        state.editingShotId = null;
      });
    },

    // Queries
    getShotsForList: (listId) => {
      return Array.from(get().shots.values())
        .filter((s) => s.shotListId === listId)
        .sort((a, b) => a.orderIndex - b.orderIndex);
    },

    getFilteredShots: (listId) => {
      const { filterOptions } = get();
      let shots = get().getShotsForList(listId);

      if (filterOptions.status?.length) {
        shots = shots.filter((s) => filterOptions.status!.includes(s.status));
      }

      if (filterOptions.shotType?.length) {
        shots = shots.filter((s) => filterOptions.shotType!.includes(s.shotType));
      }

      if (filterOptions.priority?.length) {
        shots = shots.filter((s) => filterOptions.priority!.includes(s.priority));
      }

      if (filterOptions.tags?.length) {
        shots = shots.filter((s) =>
          filterOptions.tags!.some((tag) => s.tags.includes(tag))
        );
      }

      if (filterOptions.hasGeneratedAsset !== undefined) {
        shots = shots.filter((s) =>
          filterOptions.hasGeneratedAsset
            ? !!s.generatedAssetId
            : !s.generatedAssetId
        );
      }

      if (filterOptions.searchQuery) {
        const query = filterOptions.searchQuery.toLowerCase();
        shots = shots.filter(
          (s) =>
            s.name.toLowerCase().includes(query) ||
            s.description.toLowerCase().includes(query) ||
            s.shotNumber.toLowerCase().includes(query)
        );
      }

      return shots;
    },

    getSortedShots: (listId) => {
      const { sortOptions } = get();
      const shots = get().getFilteredShots(listId);

      return [...shots].sort((a, b) => {
        let comparison = 0;

        switch (sortOptions.field) {
          case 'orderIndex':
            comparison = a.orderIndex - b.orderIndex;
            break;
          case 'shotNumber':
            comparison = a.shotNumber.localeCompare(b.shotNumber);
            break;
          case 'priority':
            comparison = a.priority - b.priority;
            break;
          case 'status':
            comparison = a.status.localeCompare(b.status);
            break;
          case 'createdAt':
            comparison = a.createdAt - b.createdAt;
            break;
          case 'updatedAt':
            comparison = a.updatedAt - b.updatedAt;
            break;
        }

        return sortOptions.direction === 'asc' ? comparison : -comparison;
      });
    },

    getShotWithDetails: (id) => {
      const shot = get().shots.get(id);
      if (!shot) return null;

      const shotList = get().shotLists.get(shot.shotListId);

      return {
        ...shot,
        shotList,
      };
    },

    // Statistics
    getListStats: (listId) => {
      const shots = get().getShotsForList(listId);

      const byStatus: Record<ShotStatus, number> = {
        planned: 0,
        scripted: 0,
        storyboarded: 0,
        approved: 0,
        'in-progress': 0,
        review: 0,
        completed: 0,
        rejected: 0,
      };

      let totalPriority = 0;

      for (const shot of shots) {
        byStatus[shot.status]++;
        totalPriority += shot.priority;
      }

      return {
        total: shots.length,
        byStatus,
        completed: byStatus.completed,
        averagePriority: shots.length > 0 ? totalPriority / shots.length : 0,
      };
    },

    // Persistence
    loadFromDatabase: (data) => {
      set((state) => {
        state.shotLists.clear();
        state.shots.clear();
        state.equipmentPresets.clear();

        for (const list of data.shotLists) {
          state.shotLists.set(list.id, list);
        }

        for (const shot of data.shots) {
          state.shots.set(shot.id, shot);
        }

        for (const preset of data.presets) {
          state.equipmentPresets.set(preset.id, preset);
        }
      });
    },
  }))
);

// Selectors

export const useShotLists = () => {
  const store = useShotListStore();
  return Array.from(store.shotLists.values());
};

export const useShotList = (id: UUID | null) => {
  const store = useShotListStore();
  return id ? store.shotLists.get(id) : undefined;
};

export const useSelectedShotList = () => {
  const store = useShotListStore();
  return store.selectedShotListId ? store.shotLists.get(store.selectedShotListId) : undefined;
};

export const useSelectedShot = () => {
  const store = useShotListStore();
  return store.selectedShotId ? store.shots.get(store.selectedShotId) : undefined;
};

export const useShotsForList = (listId: UUID | null) => {
  const store = useShotListStore();
  return listId ? store.getShotsForList(listId) : [];
};

export const useFilteredShots = (listId: UUID | null) => {
  const store = useShotListStore();
  return listId ? store.getSortedShots(listId) : [];
};

export const useEquipmentPresets = () => {
  const store = useShotListStore();
  return Array.from(store.equipmentPresets.values());
};

export const useViewMode = () => {
  const store = useShotListStore();
  return store.viewMode;
};

export const useFilterOptions = () => {
  const store = useShotListStore();
  return store.filterOptions;
};

export const useSortOptions = () => {
  const store = useShotListStore();
  return store.sortOptions;
};

export const useListStats = (listId: UUID | null) => {
  const store = useShotListStore();
  return listId ? store.getListStats(listId) : null;
};
