/**
 * Brand Store
 * Manages brand profiles and tokens with persistence
 */

import { useMemo } from 'react';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { UUID } from '../../core/types/common';
import { createUUID, createTimestamp } from '../../core/types/common';
import {
  loadBrandsFromDb,
  saveBrandToDb,
  deleteBrandFromDb,
} from './services/brandDbService';
import type {
  BrandProfile,
  BrandTokenSchema,
  BrandToken,
  BrandValidationResult,
  ColorTokens,
  TypographyTokens,
  VisualStyleTokens,
  VoiceTokens,
  AssetTokens,
} from '../../core/types/brand';
import { flattenBrandTokens } from '../../core/utils/tokenInjection';

interface BrandState {
  // Data
  brands: Map<UUID, BrandProfile>;
  defaultBrandId: UUID | null;
  selectedBrandId: UUID | null;

  // UI State
  isEditing: boolean;
  editDraft: Partial<BrandProfile> | null;
  isDirty: boolean;
}

interface BrandActions {
  // CRUD Operations
  createBrand: (name: string, tokens?: BrandTokenSchema) => UUID;
  updateBrand: (id: UUID, updates: Partial<BrandProfile>) => void;
  deleteBrand: (id: UUID) => void;
  duplicateBrand: (id: UUID, newName: string) => UUID;

  // Token Operations
  updateTokens: (id: UUID, tokens: Partial<BrandTokenSchema>) => void;
  updateColorTokens: (id: UUID, colors: Partial<ColorTokens>) => void;
  updateTypographyTokens: (id: UUID, typography: Partial<TypographyTokens>) => void;
  updateVisualStyleTokens: (id: UUID, visualStyle: Partial<VisualStyleTokens>) => void;
  updateVoiceTokens: (id: UUID, voice: Partial<VoiceTokens>) => void;
  updateAssetTokens: (id: UUID, assets: Partial<AssetTokens>) => void;
  addCustomToken: (id: UUID, token: BrandToken) => void;
  removeCustomToken: (id: UUID, tokenKey: string) => void;
  updateCustomToken: (id: UUID, tokenKey: string, value: string) => void;

  // Default Brand
  setDefaultBrand: (id: UUID) => void;
  getDefaultBrand: () => BrandProfile | null;

  // Selection
  selectBrand: (id: UUID | null) => void;

  // Editor State
  startEditing: (id: UUID) => void;
  updateDraft: (updates: Partial<BrandProfile>) => void;
  saveDraft: () => void;
  discardDraft: () => void;

  // Validation
  validateBrand: (id: UUID) => BrandValidationResult;

  // Persistence
  loadFromDatabase: (brands: BrandProfile[]) => void;
  exportBrand: (id: UUID) => string;
  importBrand: (json: string) => UUID;
}

type BrandStore = BrandState & BrandActions;

// Create default brand token schema
function createDefaultTokens(): BrandTokenSchema {
  return {
    colors: {
      primary: '#000000',
      secondary: '#666666',
      neutralDark: '#1a1a1a',
      neutralLight: '#f5f5f5',
      paletteDescription: '',
    },
    typography: {
      primaryFont: 'Inter',
      styleDescriptor: 'Clean, modern sans-serif',
    },
    visualStyle: {
      aesthetic: '',
      photographyStyle: '',
      mood: '',
    },
    voice: {
      tone: [],
      forbiddenTerms: [],
      forbiddenElements: [],
    },
  };
}

export const useBrandStore = create<BrandStore>()(
  immer((set, get) => ({
    // Initial state
    brands: new Map(),
    defaultBrandId: null,
    selectedBrandId: null,
    isEditing: false,
    editDraft: null,
    isDirty: false,

    // CRUD Operations
    createBrand: (name, tokens) => {
      const id = createUUID();
      const now = createTimestamp();

      const brand: BrandProfile = {
        id,
        name,
        createdAt: now,
        updatedAt: now,
        tokens: tokens || createDefaultTokens(),
        isDefault: get().brands.size === 0, // First brand is default
        isArchived: false,
      };

      set((state) => {
        state.brands.set(id, brand);
        if (brand.isDefault) {
          state.defaultBrandId = id;
        }
      });

      // Persist to database (fire and forget)
      saveBrandToDb(brand).catch((err) =>
        console.error('Failed to save brand to database:', err)
      );

      return id;
    },

    updateBrand: (id, updates) => {
      let updatedBrand: BrandProfile | undefined;

      set((state) => {
        const brand = state.brands.get(id);
        if (brand) {
          Object.assign(brand, updates, { updatedAt: createTimestamp() });
          updatedBrand = brand;
        }
      });

      // Persist to database (fire and forget)
      if (updatedBrand) {
        saveBrandToDb(updatedBrand).catch((err) =>
          console.error('Failed to update brand in database:', err)
        );
      }
    },

    deleteBrand: (id) => {
      set((state) => {
        const brand = state.brands.get(id);
        if (brand) {
          state.brands.delete(id);

          // If we deleted the default, set a new default
          if (state.defaultBrandId === id) {
            const remaining = Array.from(state.brands.values());
            if (remaining.length > 0) {
              state.defaultBrandId = remaining[0].id;
              remaining[0].isDefault = true;
              // Persist the new default
              saveBrandToDb(remaining[0]).catch((err) =>
                console.error('Failed to update new default brand:', err)
              );
            } else {
              state.defaultBrandId = null;
            }
          }

          // Clear selection if deleted
          if (state.selectedBrandId === id) {
            state.selectedBrandId = null;
          }
        }
      });

      // Delete from database (fire and forget)
      deleteBrandFromDb(id).catch((err) =>
        console.error('Failed to delete brand from database:', err)
      );
    },

    duplicateBrand: (id, newName) => {
      const original = get().brands.get(id);
      if (!original) throw new Error('Brand not found');

      const newId = createUUID();
      const now = createTimestamp();

      const duplicate: BrandProfile = {
        ...original,
        id: newId,
        name: newName,
        createdAt: now,
        updatedAt: now,
        isDefault: false,
        tokens: JSON.parse(JSON.stringify(original.tokens)), // Deep clone
      };

      set((state) => {
        state.brands.set(newId, duplicate);
      });

      // Persist to database (fire and forget)
      saveBrandToDb(duplicate).catch((err) =>
        console.error('Failed to save duplicated brand to database:', err)
      );

      return newId;
    },

    // Token Operations
    updateTokens: (id, tokens) => {
      let updatedBrand: BrandProfile | undefined;

      set((state) => {
        const brand = state.brands.get(id);
        if (brand) {
          brand.tokens = {
            ...brand.tokens,
            ...tokens,
            colors: { ...brand.tokens.colors, ...tokens.colors },
            typography: { ...brand.tokens.typography, ...tokens.typography },
            visualStyle: { ...brand.tokens.visualStyle, ...tokens.visualStyle },
            voice: { ...brand.tokens.voice, ...tokens.voice },
          };
          brand.updatedAt = createTimestamp();
          updatedBrand = brand;
        }
      });

      if (updatedBrand) {
        saveBrandToDb(updatedBrand).catch((err) =>
          console.error('Failed to save token updates to database:', err)
        );
      }
    },

    updateColorTokens: (id, colors) => {
      let updatedBrand: BrandProfile | undefined;

      set((state) => {
        const brand = state.brands.get(id);
        if (brand) {
          brand.tokens.colors = { ...brand.tokens.colors, ...colors };
          brand.updatedAt = createTimestamp();
          updatedBrand = brand;
        }
      });

      if (updatedBrand) {
        saveBrandToDb(updatedBrand).catch((err) =>
          console.error('Failed to save color token updates to database:', err)
        );
      }
    },

    updateTypographyTokens: (id, typography) => {
      let updatedBrand: BrandProfile | undefined;

      set((state) => {
        const brand = state.brands.get(id);
        if (brand) {
          brand.tokens.typography = { ...brand.tokens.typography, ...typography };
          brand.updatedAt = createTimestamp();
          updatedBrand = brand;
        }
      });

      if (updatedBrand) {
        saveBrandToDb(updatedBrand).catch((err) =>
          console.error('Failed to save typography token updates to database:', err)
        );
      }
    },

    updateVisualStyleTokens: (id, visualStyle) => {
      let updatedBrand: BrandProfile | undefined;

      set((state) => {
        const brand = state.brands.get(id);
        if (brand) {
          brand.tokens.visualStyle = { ...brand.tokens.visualStyle, ...visualStyle };
          brand.updatedAt = createTimestamp();
          updatedBrand = brand;
        }
      });

      if (updatedBrand) {
        saveBrandToDb(updatedBrand).catch((err) =>
          console.error('Failed to save visual style token updates to database:', err)
        );
      }
    },

    updateVoiceTokens: (id, voice) => {
      let updatedBrand: BrandProfile | undefined;

      set((state) => {
        const brand = state.brands.get(id);
        if (brand) {
          brand.tokens.voice = { ...brand.tokens.voice, ...voice };
          brand.updatedAt = createTimestamp();
          updatedBrand = brand;
        }
      });

      if (updatedBrand) {
        saveBrandToDb(updatedBrand).catch((err) =>
          console.error('Failed to save voice token updates to database:', err)
        );
      }
    },

    updateAssetTokens: (id, assets) => {
      let updatedBrand: BrandProfile | undefined;

      set((state) => {
        const brand = state.brands.get(id);
        if (brand) {
          brand.tokens.assets = { ...brand.tokens.assets, ...assets };
          brand.updatedAt = createTimestamp();
          updatedBrand = brand;
        }
      });

      if (updatedBrand) {
        saveBrandToDb(updatedBrand).catch((err) =>
          console.error('Failed to save asset token updates to database:', err)
        );
      }
    },

    addCustomToken: (id, token) => {
      let updatedBrand: BrandProfile | undefined;

      set((state) => {
        const brand = state.brands.get(id);
        if (brand) {
          if (!brand.tokens.customTokens) {
            brand.tokens.customTokens = [];
          }
          brand.tokens.customTokens.push(token);
          brand.updatedAt = createTimestamp();
          updatedBrand = brand;
        }
      });

      if (updatedBrand) {
        saveBrandToDb(updatedBrand).catch((err) =>
          console.error('Failed to save custom token to database:', err)
        );
      }
    },

    removeCustomToken: (id, tokenKey) => {
      let updatedBrand: BrandProfile | undefined;

      set((state) => {
        const brand = state.brands.get(id);
        if (brand && brand.tokens.customTokens) {
          brand.tokens.customTokens = brand.tokens.customTokens.filter(
            (t) => t.key !== tokenKey
          );
          brand.updatedAt = createTimestamp();
          updatedBrand = brand;
        }
      });

      if (updatedBrand) {
        saveBrandToDb(updatedBrand).catch((err) =>
          console.error('Failed to remove custom token from database:', err)
        );
      }
    },

    updateCustomToken: (id, tokenKey, value) => {
      let updatedBrand: BrandProfile | undefined;

      set((state) => {
        const brand = state.brands.get(id);
        if (brand && brand.tokens.customTokens) {
          const token = brand.tokens.customTokens.find((t) => t.key === tokenKey);
          if (token) {
            token.value = value;
            brand.updatedAt = createTimestamp();
            updatedBrand = brand;
          }
        }
      });

      if (updatedBrand) {
        saveBrandToDb(updatedBrand).catch((err) =>
          console.error('Failed to update custom token in database:', err)
        );
      }
    },

    // Default Brand
    setDefaultBrand: (id) => {
      const brandsToUpdate: BrandProfile[] = [];

      set((state) => {
        // Clear previous default
        for (const brand of state.brands.values()) {
          if (brand.isDefault) {
            brand.isDefault = false;
            brandsToUpdate.push(brand);
          }
        }

        // Set new default
        const brand = state.brands.get(id);
        if (brand) {
          brand.isDefault = true;
          state.defaultBrandId = id;
          brandsToUpdate.push(brand);
        }
      });

      // Persist all changed brands
      for (const brand of brandsToUpdate) {
        saveBrandToDb(brand).catch((err) =>
          console.error('Failed to update default brand in database:', err)
        );
      }
    },

    getDefaultBrand: () => {
      const state = get();
      if (!state.defaultBrandId) return null;
      return state.brands.get(state.defaultBrandId) || null;
    },

    // Selection
    selectBrand: (id) => {
      set((state) => {
        state.selectedBrandId = id;
      });
    },

    // Editor State
    startEditing: (id) => {
      const brand = get().brands.get(id);
      if (brand) {
        set((state) => {
          state.isEditing = true;
          state.editDraft = JSON.parse(JSON.stringify(brand));
          state.isDirty = false;
          state.selectedBrandId = id;
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
      if (state.editDraft && state.selectedBrandId) {
        get().updateBrand(state.selectedBrandId, state.editDraft as BrandProfile);
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
    validateBrand: (id) => {
      const brand = get().brands.get(id);
      if (!brand) {
        return {
          isValid: false,
          errors: [{ field: 'id', message: 'Brand not found' }],
          warnings: [],
        };
      }

      const errors: BrandValidationResult['errors'] = [];
      const warnings: BrandValidationResult['warnings'] = [];

      // Required fields
      if (!brand.name.trim()) {
        errors.push({ field: 'name', message: 'Brand name is required' });
      }

      // Colors validation
      const { colors } = brand.tokens;
      if (!colors.primary) {
        errors.push({ field: 'colors.primary', message: 'Primary color is required' });
      }
      if (!colors.secondary) {
        errors.push({ field: 'colors.secondary', message: 'Secondary color is required' });
      }

      // Typography validation
      if (!brand.tokens.typography.primaryFont) {
        errors.push({ field: 'typography.primaryFont', message: 'Primary font is required' });
      }

      // Visual style warnings (not errors)
      if (!brand.tokens.visualStyle.aesthetic) {
        warnings.push({ field: 'visualStyle.aesthetic', message: 'Consider adding an aesthetic description' });
      }
      if (!brand.tokens.visualStyle.mood) {
        warnings.push({ field: 'visualStyle.mood', message: 'Consider defining the brand mood' });
      }

      // Voice warnings
      if (brand.tokens.voice.tone.length === 0) {
        warnings.push({ field: 'voice.tone', message: 'Consider adding tone descriptors' });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    },

    // Persistence
    loadFromDatabase: (brands) => {
      set((state) => {
        state.brands.clear();
        for (const brand of brands) {
          state.brands.set(brand.id, brand);
          if (brand.isDefault) {
            state.defaultBrandId = brand.id;
          }
        }
      });
    },

    exportBrand: (id) => {
      const brand = get().brands.get(id);
      if (!brand) throw new Error('Brand not found');
      return JSON.stringify(brand, null, 2);
    },

    importBrand: (json) => {
      const imported = JSON.parse(json) as BrandProfile;
      const newId = createUUID();
      const now = createTimestamp();

      const brand: BrandProfile = {
        ...imported,
        id: newId,
        createdAt: now,
        updatedAt: now,
        isDefault: false,
        name: `${imported.name} (Imported)`,
      };

      set((state) => {
        state.brands.set(newId, brand);
      });

      // Persist to database (fire and forget)
      saveBrandToDb(brand).catch((err) =>
        console.error('Failed to save imported brand to database:', err)
      );

      return newId;
    },
  }))
);

// Selectors - memoized to prevent infinite re-renders
export const useBrands = () => {
  const brands = useBrandStore((state) => state.brands);
  return useMemo(
    () => Array.from(brands.values()).filter((b) => !b.isArchived),
    [brands]
  );
};

export const useBrand = (id: UUID | null) => {
  const brands = useBrandStore((state) => state.brands);
  return useMemo(() => (id ? brands.get(id) : undefined), [brands, id]);
};

export const useSelectedBrand = () => {
  const brands = useBrandStore((state) => state.brands);
  const selectedBrandId = useBrandStore((state) => state.selectedBrandId);
  return useMemo(
    () => (selectedBrandId ? brands.get(selectedBrandId) : undefined),
    [brands, selectedBrandId]
  );
};

export const useDefaultBrand = () => {
  const brands = useBrandStore((state) => state.brands);
  const defaultBrandId = useBrandStore((state) => state.defaultBrandId);
  return useMemo(
    () => (defaultBrandId ? brands.get(defaultBrandId) : undefined),
    [brands, defaultBrandId]
  );
};

export const useBrandEditor = () => {
  const isEditing = useBrandStore((state) => state.isEditing);
  const editDraft = useBrandStore((state) => state.editDraft);
  const isDirty = useBrandStore((state) => state.isDirty);
  return useMemo(
    () => ({ isEditing, draft: editDraft, isDirty }),
    [isEditing, editDraft, isDirty]
  );
};

export const useFlattenedTokens = (id: UUID | null) => {
  const brand = useBrand(id);
  return useMemo(
    () => (brand ? flattenBrandTokens(brand.tokens) : null),
    [brand]
  );
};

/**
 * Initialize brand store from database
 * Call this on app startup
 */
export async function initBrandStore(): Promise<void> {
  try {
    const brands = await loadBrandsFromDb();
    useBrandStore.getState().loadFromDatabase(brands);
    console.log(`Loaded ${brands.length} brands from database`);
  } catch (error) {
    console.error('Failed to load brands from database:', error);
  }
}
