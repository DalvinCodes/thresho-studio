/**
 * Shot List Store
 * Manages shot lists and individual shots with persistence
 */

import { useMemo } from 'react';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { UUID, ContentType } from '../../core/types/common';
import { createUUID, createTimestamp } from '../../core/types/common';
import { useGenerationStore } from '../generation/store';
import { useProviderStore } from '../providers/store';
import { useBrandStore } from '../brands/store';
import { useTalentStore } from '../talent/store';
import { composeShotPrompt } from './services/shotPromptService';
import {
  saveShotListToDb,
  saveShotToDb,
  deleteShotListFromDb,
  deleteShotFromDb,
  saveEquipmentPresetToDb,
  deleteEquipmentPresetFromDb,
} from './services/shotListDbService';
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

  // Create Shot Modal State
  isCreateShotModalOpen: boolean;
}

interface ShotListActions {
  // Shot List CRUD
  createShotList: (name: string, contentType: ContentType) => UUID;
  updateShotList: (id: UUID, updates: Partial<ShotList>) => void;
  deleteShotList: (id: UUID) => void;
  duplicateShotList: (id: UUID, newName: string) => UUID;

  // Shot CRUD
  createShot: (input: CreateShotInput) => UUID;
  createMultipleShots: (inputs: CreateShotInput[]) => UUID[];
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

  // Create Shot Modal
  openCreateShotModal: () => void;
  closeCreateShotModal: () => void;

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

  // Generation
  generateShot: (shotId: UUID) => Promise<UUID | null>;
  updateShotFromGeneration: (shotId: UUID, generationId: UUID, assetId?: UUID, error?: string) => void;
  generateSelectedShots: (shotIds: UUID[]) => Promise<Map<UUID, UUID | null>>;

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
    isCreateShotModalOpen: false,

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

      // Persist to database
      saveShotListToDb(shotList).catch((err) =>
        console.error('Failed to save shot list:', err)
      );

      return id;
    },

    updateShotList: (id, updates) => {
      let updatedList: ShotList | undefined;

      set((state) => {
        const list = state.shotLists.get(id);
        if (list) {
          Object.assign(list, updates, { updatedAt: createTimestamp() });
          updatedList = list;
        }
      });

      // Persist to database
      if (updatedList) {
        saveShotListToDb(updatedList).catch((err) =>
          console.error('Failed to update shot list:', err)
        );
      }
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

      // Persist deletion to database
      deleteShotListFromDb(id).catch((err) =>
        console.error('Failed to delete shot list:', err)
      );
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

      const shotsToDuplicate: Shot[] = [];

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
            shotsToDuplicate.push(newShot);
          }
        }
      });

      // Persist duplicated shot list and shots to database
      saveShotListToDb(duplicate).catch((err) =>
        console.error('Failed to save duplicated shot list:', err)
      );
      for (const shot of shotsToDuplicate) {
        saveShotToDb(shot).catch((err) =>
          console.error('Failed to save duplicated shot:', err)
        );
      }

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

      // Persist shot to database
      saveShotToDb(shot).catch((err) =>
        console.error('Failed to save shot:', err)
      );

      // Persist updated shot list count
      const updatedList = get().shotLists.get(input.shotListId);
      if (updatedList) {
        saveShotListToDb(updatedList).catch((err) =>
          console.error('Failed to update shot list count:', err)
        );
      }

      return id;
    },

    createMultipleShots: (inputs) => {
      const now = createTimestamp();
      const createdIds: UUID[] = [];
      const createdShots: Shot[] = [];

      if (inputs.length === 0) return createdIds;

      const shotListId = inputs[0].shotListId;
      const shotList = get().shotLists.get(shotListId);
      if (!shotList) throw new Error('Shot list not found');

      const shotsInList = get().getShotsForList(shotListId);
      let maxIndex = shotsInList.reduce((max, s) => Math.max(max, s.orderIndex), -1);
      let currentShotNumber = shotsInList.length;

      for (const input of inputs) {
        const id = createUUID();
        currentShotNumber++;
        maxIndex++;

        const shot: Shot = {
          id,
          shotListId: input.shotListId,
          shotNumber: String(currentShotNumber),
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
          orderIndex: maxIndex,
          tags: input.tags || [],
          createdAt: now,
          updatedAt: now,
        };

        createdIds.push(id);
        createdShots.push(shot);
      }

      set((state) => {
        for (const shot of createdShots) {
          state.shots.set(shot.id, shot);
        }

        const list = state.shotLists.get(shotListId);
        if (list) {
          list.totalShots += createdShots.length;
          list.updatedAt = now;
        }
      });

      for (const shot of createdShots) {
        saveShotToDb(shot).catch((err) =>
          console.error('Failed to save shot:', err)
        );
      }

      const updatedList = get().shotLists.get(shotListId);
      if (updatedList) {
        saveShotListToDb(updatedList).catch((err) =>
          console.error('Failed to update shot list count:', err)
        );
      }

      return createdIds;
    },

    updateShot: (id, updates) => {
      let updatedShot: Shot | undefined;

      set((state) => {
        const shot = state.shots.get(id);
        if (shot) {
          Object.assign(shot, updates, { updatedAt: createTimestamp() });
          updatedShot = shot;
        }
      });

      // Persist to database
      if (updatedShot) {
        saveShotToDb(updatedShot).catch((err) =>
          console.error('Failed to update shot:', err)
        );
      }
    },

    deleteShot: (id) => {
      let shotListId: UUID | undefined;

      set((state) => {
        const shot = state.shots.get(id);
        if (shot) {
          shotListId = shot.shotListId;

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

      // Persist deletion to database
      deleteShotFromDb(id).catch((err) =>
        console.error('Failed to delete shot:', err)
      );

      // Persist updated shot list count
      if (shotListId) {
        const updatedList = get().shotLists.get(shotListId);
        if (updatedList) {
          saveShotListToDb(updatedList).catch((err) =>
            console.error('Failed to update shot list count:', err)
          );
        }
      }
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

      // Persist duplicated shot to database
      saveShotToDb(duplicate).catch((err) =>
        console.error('Failed to save duplicated shot:', err)
      );

      // Persist updated shot list count
      const updatedList = get().shotLists.get(original.shotListId);
      if (updatedList) {
        saveShotListToDb(updatedList).catch((err) =>
          console.error('Failed to update shot list count:', err)
        );
      }

      return newId;
    },

    batchUpdateShots: (update) => {
      const updatedShots: Shot[] = [];

      set((state) => {
        const now = createTimestamp();
        for (const shotId of update.shotIds) {
          const shot = state.shots.get(shotId);
          if (shot) {
            Object.assign(shot, update.updates, { updatedAt: now });
            updatedShots.push(shot);
          }
        }
      });

      // Persist all updated shots to database
      for (const shot of updatedShots) {
        saveShotToDb(shot).catch((err) =>
          console.error('Failed to update shot in batch:', err)
        );
      }
    },

    // Shot Ordering
    reorderShot: (shotId, newIndex) => {
      const reorderedShots: Shot[] = [];

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
            reorderedShots.push(stateShot);
          }
        });
      });

      // Persist reordered shots to database
      for (const shot of reorderedShots) {
        saveShotToDb(shot).catch((err) =>
          console.error('Failed to save reordered shot:', err)
        );
      }
    },

    moveShot: (shotId, targetShotListId) => {
      let movedShot: Shot | undefined;
      let oldListId: UUID | undefined;

      set((state) => {
        const shot = state.shots.get(shotId);
        if (!shot) return;

        oldListId = shot.shotListId;

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
        movedShot = shot;

        // Update counts on new list
        const newList = state.shotLists.get(targetShotListId);
        if (newList) {
          newList.totalShots++;
          if (shot.status === 'completed') {
            newList.completedShots++;
          }
        }
      });

      // Persist moved shot and updated lists to database
      if (movedShot) {
        saveShotToDb(movedShot).catch((err) =>
          console.error('Failed to save moved shot:', err)
        );
      }

      if (oldListId) {
        const oldList = get().shotLists.get(oldListId);
        if (oldList) {
          saveShotListToDb(oldList).catch((err) =>
            console.error('Failed to update old shot list:', err)
          );
        }
      }

      const newList = get().shotLists.get(targetShotListId);
      if (newList) {
        saveShotListToDb(newList).catch((err) =>
          console.error('Failed to update new shot list:', err)
        );
      }
    },

    // Shot Status
    updateShotStatus: (shotId, status) => {
      let updatedShot: Shot | undefined;
      let updatedList: ShotList | undefined;

      set((state) => {
        const shot = state.shots.get(shotId);
        if (!shot) return;

        const wasCompleted = shot.status === 'completed';
        const isNowCompleted = status === 'completed';

        shot.status = status;
        shot.updatedAt = createTimestamp();
        updatedShot = shot;

        // Update list counts
        const list = state.shotLists.get(shot.shotListId);
        if (list) {
          if (!wasCompleted && isNowCompleted) {
            list.completedShots++;
          } else if (wasCompleted && !isNowCompleted) {
            list.completedShots--;
          }
          updatedList = list;
        }
      });

      // Persist to database
      if (updatedShot) {
        saveShotToDb(updatedShot).catch((err) =>
          console.error('Failed to update shot status:', err)
        );
      }
      if (updatedList) {
        saveShotListToDb(updatedList).catch((err) =>
          console.error('Failed to update shot list counts:', err)
        );
      }
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

      // Persist to database
      saveEquipmentPresetToDb(newPreset).catch((err) =>
        console.error('Failed to save equipment preset:', err)
      );

      return id;
    },

    updateEquipmentPreset: (id, updates) => {
      let updatedPreset: EquipmentPreset | undefined;

      set((state) => {
        const preset = state.equipmentPresets.get(id);
        if (preset) {
          Object.assign(preset, updates, { updatedAt: createTimestamp() });
          updatedPreset = preset;
        }
      });

      // Persist to database
      if (updatedPreset) {
        saveEquipmentPresetToDb(updatedPreset).catch((err) =>
          console.error('Failed to update equipment preset:', err)
        );
      }
    },

    deleteEquipmentPreset: (id) => {
      set((state) => {
        state.equipmentPresets.delete(id);
      });

      // Persist deletion to database
      deleteEquipmentPresetFromDb(id).catch((err) =>
        console.error('Failed to delete equipment preset:', err)
      );
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

    // Create Shot Modal
    openCreateShotModal: () => {
      set((state) => {
        state.isCreateShotModalOpen = true;
      });
    },

    closeCreateShotModal: () => {
      set((state) => {
        state.isCreateShotModalOpen = false;
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

    // Generation
    generateShot: async (shotId) => {
      const state = get();
      const shot = state.shots.get(shotId);
      if (!shot) {
        console.error('Shot not found:', shotId);
        return null;
      }

      const shotList = state.shotLists.get(shot.shotListId);
      if (!shotList) {
        console.error('Shot list not found:', shot.shotListId);
        return null;
      }

      // Check if description is present
      if (!shot.description || shot.description.trim().length < 10) {
        console.error('Shot description is too short');
        return null;
      }

      // Get the content type from the shot list
      const contentType = shotList.contentType;

      // Check if a provider is configured for this content type
      const providerStore = useProviderStore.getState();
      const defaultProviderId = providerStore.getDefaultProvider(contentType);
      if (!defaultProviderId) {
        console.error(`No ${contentType} provider configured`);
        return null;
      }

      const provider = providerStore.providers.get(defaultProviderId);
      if (!provider || provider.status !== 'active') {
        console.error('Provider is not active');
        return null;
      }

      // Get brand if brandId is set on the shot list
      let brand: Parameters<typeof composeShotPrompt>[0]['brand'] | undefined;
      if (shotList.brandId) {
        const brandStore = useBrandStore.getState();
        const brandProfile = brandStore.brands.get(shotList.brandId);
        if (brandProfile) {
          brand = {
            aesthetic: brandProfile.tokens.visualStyle.aesthetic || '',
            photographyStyle: brandProfile.tokens.visualStyle.photographyStyle || '',
            mood: brandProfile.tokens.visualStyle.mood || '',
            colorPalette: brandProfile.tokens.colors.paletteDescription || '',
          };
        }
      }

      // Get talents if talentIds are set on the shot
      let talents: import('../../core/types/talent').TalentProfile[] | undefined;
      if (shot.talentIds && shot.talentIds.length > 0) {
        const talentStore = useTalentStore.getState();
        talents = talentStore.getTalentsByIds(shot.talentIds);
      }

      // Compose the prompt
      const composedPrompt = composeShotPrompt({
        shot,
        shotList,
        brand,
        talents,
      });

      // Update shot status to in-progress
      set((s) => {
        const shotToUpdate = s.shots.get(shotId);
        if (shotToUpdate) {
          shotToUpdate.status = 'in-progress';
          shotToUpdate.updatedAt = createTimestamp();
        }
      });

      // Start the generation
      const generationStore = useGenerationStore.getState();
      const requestId = generationStore.startGeneration({
        type: contentType,
        providerId: defaultProviderId,
        providerType: provider.config.type,
        brandId: shotList.brandId,
        talentIds: shot.talentIds,
        customPrompt: composedPrompt.userPrompt,
        parameters: {
          aspectRatio: shot.aspectRatio,
          duration: shot.duration,
          negativePrompt: composedPrompt.negativePrompt,
          style: composedPrompt.technicalParameters.style,
        },
        metadata: {
          shotId,
          shotListId: shot.shotListId,
          systemPrompt: composedPrompt.systemPrompt,
        },
      });

      // Store the generation request ID in shot metadata
      set((s) => {
        const shotToUpdate = s.shots.get(shotId);
        if (shotToUpdate) {
          shotToUpdate.metadata = {
            ...shotToUpdate.metadata,
            generationRequestId: requestId,
          };
        }
      });

      return requestId;
    },

    updateShotFromGeneration: (shotId, generationId, assetId, error) => {
      set((state) => {
        const shot = state.shots.get(shotId);
        if (!shot) return;

        const now = createTimestamp();

        if (error) {
          // Generation failed
          shot.status = 'rejected';
          shot.metadata = {
            ...shot.metadata,
            generationError: error,
            lastGenerationId: generationId,
          };
        } else if (assetId) {
          // Generation succeeded
          shot.status = 'completed';
          shot.generatedAssetId = assetId;
          shot.metadata = {
            ...shot.metadata,
            lastGenerationId: generationId,
            generationError: undefined,
          };

          // Update the shot list's completed shots count
          const shotList = state.shotLists.get(shot.shotListId);
          if (shotList) {
            shotList.completedShots++;
            shotList.updatedAt = now;
          }
        }

        shot.updatedAt = now;
      });
    },

    generateSelectedShots: async (shotIds) => {
      const results = new Map<UUID, UUID | null>();

      // Process shots sequentially to avoid overwhelming providers
      for (const shotId of shotIds) {
        const requestId = await get().generateShot(shotId);
        results.set(shotId, requestId);

        // Small delay between generations to be respectful to APIs
        if (shotIds.indexOf(shotId) < shotIds.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      return results;
    },
  }))
);

// Selectors - Using proper memoization to prevent infinite re-renders

/**
 * Returns all shot lists as an array.
 * Memoized to prevent new array creation on every render.
 */
export const useShotLists = () => {
  const shotLists = useShotListStore((state) => state.shotLists);
  return useMemo(() => Array.from(shotLists.values()), [shotLists]);
};

/**
 * Returns a specific shot list by ID.
 * Uses Zustand's built-in shallow comparison via selector.
 */
export const useShotList = (id: UUID | null) => {
  return useShotListStore((state) => (id ? state.shotLists.get(id) : undefined));
};

/**
 * Returns the currently selected shot list.
 * Memoized to prevent unnecessary re-renders.
 */
export const useSelectedShotList = () => {
  const shotLists = useShotListStore((state) => state.shotLists);
  const selectedShotListId = useShotListStore((state) => state.selectedShotListId);
  return useMemo(
    () => (selectedShotListId ? shotLists.get(selectedShotListId) : undefined),
    [shotLists, selectedShotListId]
  );
};

/**
 * Returns the currently selected shot.
 * Memoized to prevent unnecessary re-renders.
 */
export const useSelectedShot = () => {
  const shots = useShotListStore((state) => state.shots);
  const selectedShotId = useShotListStore((state) => state.selectedShotId);
  return useMemo(
    () => (selectedShotId ? shots.get(selectedShotId) : undefined),
    [shots, selectedShotId]
  );
};

/**
 * Returns all shots for a specific list, sorted by orderIndex.
 * Memoized to prevent new array creation on every render.
 */
export const useShotsForList = (listId: UUID | null) => {
  const shots = useShotListStore((state) => state.shots);
  return useMemo(
    () =>
      listId
        ? Array.from(shots.values())
            .filter((s) => s.shotListId === listId)
            .sort((a, b) => a.orderIndex - b.orderIndex)
        : [],
    [shots, listId]
  );
};

/**
 * Returns filtered and sorted shots for a specific list.
 * Applies current filter and sort options.
 * Memoized to prevent new array creation on every render.
 */
export const useFilteredShots = (listId: UUID | null) => {
  const shots = useShotListStore((state) => state.shots);
  const filterOptions = useShotListStore((state) => state.filterOptions);
  const sortOptions = useShotListStore((state) => state.sortOptions);

  return useMemo(() => {
    if (!listId) return [];

    // Get shots for this list
    let result = Array.from(shots.values())
      .filter((s) => s.shotListId === listId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    // Apply filters
    if (filterOptions.status?.length) {
      result = result.filter((s) => filterOptions.status!.includes(s.status));
    }

    if (filterOptions.shotType?.length) {
      result = result.filter((s) => filterOptions.shotType!.includes(s.shotType));
    }

    if (filterOptions.priority?.length) {
      result = result.filter((s) => filterOptions.priority!.includes(s.priority));
    }

    if (filterOptions.tags?.length) {
      result = result.filter((s) =>
        filterOptions.tags!.some((tag) => s.tags.includes(tag))
      );
    }

    if (filterOptions.hasGeneratedAsset !== undefined) {
      result = result.filter((s) =>
        filterOptions.hasGeneratedAsset ? !!s.generatedAssetId : !s.generatedAssetId
      );
    }

    if (filterOptions.searchQuery) {
      const query = filterOptions.searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.shotNumber.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    return [...result].sort((a, b) => {
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
  }, [shots, listId, filterOptions, sortOptions]);
};

/**
 * Returns all equipment presets as an array.
 * Memoized to prevent new array creation on every render.
 */
export const useEquipmentPresets = () => {
  const equipmentPresets = useShotListStore((state) => state.equipmentPresets);
  return useMemo(() => Array.from(equipmentPresets.values()), [equipmentPresets]);
};

/**
 * Returns the current view mode.
 * Uses direct selector - primitive values don't need memoization.
 */
export const useViewMode = () => {
  return useShotListStore((state) => state.viewMode);
};

/**
 * Returns the current filter options.
 * Uses direct selector - object reference is stable in Zustand.
 */
export const useFilterOptions = () => {
  return useShotListStore((state) => state.filterOptions);
};

/**
 * Returns the current sort options.
 * Uses direct selector - object reference is stable in Zustand.
 */
export const useSortOptions = () => {
  return useShotListStore((state) => state.sortOptions);
};

/**
 * Returns statistics for a specific shot list.
 * Memoized to prevent object recreation on every render.
 */
export const useListStats = (listId: UUID | null) => {
  const shots = useShotListStore((state) => state.shots);

  return useMemo(() => {
    if (!listId) return null;

    const listShots = Array.from(shots.values()).filter(
      (s) => s.shotListId === listId
    );

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

    for (const shot of listShots) {
      byStatus[shot.status]++;
      totalPriority += shot.priority;
    }

    return {
      total: listShots.length,
      byStatus,
      completed: byStatus.completed,
      averagePriority: listShots.length > 0 ? totalPriority / listShots.length : 0,
    };
  }, [shots, listId]);
};

/**
 * Returns whether a specific shot is currently being generated.
 * Based on shot status being 'in-progress'.
 */
export const useShotIsGenerating = (shotId: UUID | null) => {
  const shots = useShotListStore((state) => state.shots);
  return useMemo(() => {
    if (!shotId) return false;
    const shot = shots.get(shotId);
    return shot?.status === 'in-progress';
  }, [shots, shotId]);
};

/**
 * Returns all shots that are currently being generated.
 * Useful for displaying a global generation queue.
 */
export const useGeneratingShots = () => {
  const shots = useShotListStore((state) => state.shots);
  return useMemo(
    () => Array.from(shots.values()).filter((s) => s.status === 'in-progress'),
    [shots]
  );
};
