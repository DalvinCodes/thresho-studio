/**
 * Brand Store
 * Manages brand profiles and tokens with persistence
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { UUID } from '../../core/types/common';
import { createUUID, createTimestamp } from '../../core/types/common';
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
  DEFAULT_THRESHO_TOKENS,
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

      return id;
    },

    updateBrand: (id, updates) => {
      set((state) => {
        const brand = state.brands.get(id);
        if (brand) {
          Object.assign(brand, updates, { updatedAt: createTimestamp() });
        }
      });
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

      return newId;
    },

    // Token Operations
    updateTokens: (id, tokens) => {
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
        }
      });
    },

    updateColorTokens: (id, colors) => {
      set((state) => {
        const brand = state.brands.get(id);
        if (brand) {
          brand.tokens.colors = { ...brand.tokens.colors, ...colors };
          brand.updatedAt = createTimestamp();
        }
      });
    },

    updateTypographyTokens: (id, typography) => {
      set((state) => {
        const brand = state.brands.get(id);
        if (brand) {
          brand.tokens.typography = { ...brand.tokens.typography, ...typography };
          brand.updatedAt = createTimestamp();
        }
      });
    },

    updateVisualStyleTokens: (id, visualStyle) => {
      set((state) => {
        const brand = state.brands.get(id);
        if (brand) {
          brand.tokens.visualStyle = { ...brand.tokens.visualStyle, ...visualStyle };
          brand.updatedAt = createTimestamp();
        }
      });
    },

    updateVoiceTokens: (id, voice) => {
      set((state) => {
        const brand = state.brands.get(id);
        if (brand) {
          brand.tokens.voice = { ...brand.tokens.voice, ...voice };
          brand.updatedAt = createTimestamp();
        }
      });
    },

    updateAssetTokens: (id, assets) => {
      set((state) => {
        const brand = state.brands.get(id);
        if (brand) {
          brand.tokens.assets = { ...brand.tokens.assets, ...assets };
          brand.updatedAt = createTimestamp();
        }
      });
    },

    addCustomToken: (id, token) => {
      set((state) => {
        const brand = state.brands.get(id);
        if (brand) {
          if (!brand.tokens.customTokens) {
            brand.tokens.customTokens = [];
          }
          brand.tokens.customTokens.push(token);
          brand.updatedAt = createTimestamp();
        }
      });
    },

    removeCustomToken: (id, tokenKey) => {
      set((state) => {
        const brand = state.brands.get(id);
        if (brand && brand.tokens.customTokens) {
          brand.tokens.customTokens = brand.tokens.customTokens.filter(
            (t) => t.key !== tokenKey
          );
          brand.updatedAt = createTimestamp();
        }
      });
    },

    updateCustomToken: (id, tokenKey, value) => {
      set((state) => {
        const brand = state.brands.get(id);
        if (brand && brand.tokens.customTokens) {
          const token = brand.tokens.customTokens.find((t) => t.key === tokenKey);
          if (token) {
            token.value = value;
            brand.updatedAt = createTimestamp();
          }
        }
      });
    },

    // Default Brand
    setDefaultBrand: (id) => {
      set((state) => {
        // Clear previous default
        for (const brand of state.brands.values()) {
          brand.isDefault = false;
        }

        // Set new default
        const brand = state.brands.get(id);
        if (brand) {
          brand.isDefault = true;
          state.defaultBrandId = id;
        }
      });
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

      return newId;
    },
  }))
);

// Selectors - use subscribeWithSelector for arrays/objects
export const useBrands = () => {
  const store = useBrandStore();
  return Array.from(store.brands.values()).filter((b) => !b.isArchived);
};

export const useBrand = (id: UUID | null) =>
  useBrandStore((state) => (id ? state.brands.get(id) : undefined));

export const useSelectedBrand = () =>
  useBrandStore((state) =>
    state.selectedBrandId ? state.brands.get(state.selectedBrandId) : undefined
  );

export const useDefaultBrand = () =>
  useBrandStore((state) =>
    state.defaultBrandId ? state.brands.get(state.defaultBrandId) : undefined
  );

export const useBrandEditor = () => {
  const store = useBrandStore();
  return {
    isEditing: store.isEditing,
    draft: store.editDraft,
    isDirty: store.isDirty,
  };
};

export const useFlattenedTokens = (id: UUID | null) => {
  const brand = useBrand(id);
  if (!brand) return null;
  return flattenBrandTokens(brand.tokens);
};
