/**
 * Provider Store (Zustand)
 * Manages provider configurations, credentials, and active adapters
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { UUID, ProviderType, ContentType } from '../../core/types/common';
import { createUUID, createTimestamp } from '../../core/types/common';
import type {
  ProviderConfig,
  ProviderCredential,
  ProviderState,
  ProviderStatus,
  ProviderError,
} from '../../core/types/provider';
import { createAdapter, providerMeta } from './adapters';
import type { BaseAdapter } from './adapters';

interface ProviderStoreState {
  // Provider registry
  providers: Map<UUID, ProviderState>;
  activeAdapters: Map<UUID, BaseAdapter>;

  // Selection
  defaultTextProvider: UUID | null;
  defaultImageProvider: UUID | null;
  defaultVideoProvider: UUID | null;

  // Loading states
  isLoading: boolean;
  isValidating: UUID | null;
}

interface ProviderStoreActions {
  // Provider CRUD
  registerProvider: (type: ProviderType, credential?: ProviderCredential) => Promise<UUID>;
  updateProvider: (id: UUID, updates: Partial<ProviderConfig>) => void;
  removeProvider: (id: UUID) => void;

  // Credential management
  setCredential: (providerId: UUID, apiKey: string) => Promise<boolean>;
  validateCredential: (providerId: UUID) => Promise<boolean>;
  clearCredential: (providerId: UUID) => void;

  // Adapter access
  getAdapter: (providerId: UUID) => BaseAdapter | undefined;
  getAdapterForType: (type: ContentType) => BaseAdapter | undefined;

  // Selection
  setDefaultProvider: (type: ContentType, providerId: UUID) => void;
  getDefaultProvider: (type: ContentType) => UUID | null;

  // Status
  setProviderStatus: (providerId: UUID, status: ProviderStatus, error?: ProviderError) => void;

  // Bulk operations
  loadFromDatabase: () => Promise<void>;
  initializeDefaults: () => Promise<void>;
}

type ProviderStore = ProviderStoreState & ProviderStoreActions;

export const useProviderStore = create<ProviderStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        providers: new Map(),
        activeAdapters: new Map(),
        defaultTextProvider: null,
        defaultImageProvider: null,
        defaultVideoProvider: null,
        isLoading: false,
        isValidating: null,

        // Register a new provider
        registerProvider: async (type, credential) => {
          const meta = providerMeta.find((m) => m.type === type);
          if (!meta) {
            throw new Error(`Unknown provider type: ${type}`);
          }

          const id = createUUID();
          const now = createTimestamp();

          const config: ProviderConfig = {
            id,
            type,
            name: meta.name,
            displayName: meta.displayName,
            description: meta.description,
            capabilities: [], // Will be populated by adapter
            isActive: true,
            isDefault: false,
            createdAt: now,
            updatedAt: now,
          };

          const state: ProviderState = {
            config,
            credential,
            status: credential ? 'validating' : 'inactive',
          };

          // Create adapter
          const adapter = createAdapter(config, credential);
          config.capabilities = adapter.getCapabilities();

          set((s) => {
            s.providers.set(id, state);
            s.activeAdapters.set(id, adapter);
          });

          // Validate credentials if provided
          if (credential) {
            await get().validateCredential(id);
          }

          return id;
        },

        // Update provider config
        updateProvider: (id, updates) => {
          set((s) => {
            const provider = s.providers.get(id);
            if (provider) {
              Object.assign(provider.config, updates);
              provider.config.updatedAt = createTimestamp();
            }
          });
        },

        // Remove provider
        removeProvider: (id) => {
          set((s) => {
            s.providers.delete(id);
            s.activeAdapters.delete(id);

            // Clear defaults if this was default
            if (s.defaultTextProvider === id) s.defaultTextProvider = null;
            if (s.defaultImageProvider === id) s.defaultImageProvider = null;
            if (s.defaultVideoProvider === id) s.defaultVideoProvider = null;
          });
        },

        // Set credential
        setCredential: async (providerId, apiKey) => {
          const state = get();
          const provider = state.providers.get(providerId);
          if (!provider) return false;

          const credential: ProviderCredential = {
            id: createUUID(),
            providerId,
            apiKey,
            createdAt: createTimestamp(),
          };

          set((s) => {
            const p = s.providers.get(providerId);
            if (p) {
              p.credential = credential;
              p.status = 'validating';
            }
          });

          // Update adapter with new credential
          const adapter = state.activeAdapters.get(providerId);
          if (adapter) {
            adapter.setCredential(credential);
          }

          // Validate
          return get().validateCredential(providerId);
        },

        // Validate credential
        validateCredential: async (providerId) => {
          set((s) => {
            s.isValidating = providerId;
          });

          try {
            const adapter = get().activeAdapters.get(providerId);
            if (!adapter) {
              set((s) => {
                const p = s.providers.get(providerId);
                if (p) p.status = 'error';
                s.isValidating = null;
              });
              return false;
            }

            const isValid = await adapter.validateCredentials();

            set((s) => {
              const p = s.providers.get(providerId);
              if (p) {
                p.status = isValid ? 'active' : 'error';
                if (isValid) {
                  p.lastError = undefined;
                  if (p.credential) {
                    p.credential.lastValidated = createTimestamp();
                  }
                } else {
                  p.lastError = {
                    code: 'INVALID_CREDENTIALS',
                    message: 'API key validation failed',
                    retryable: false,
                  };
                }
              }
              s.isValidating = null;
            });

            return isValid;
          } catch (error) {
            set((s) => {
              const p = s.providers.get(providerId);
              if (p) {
                p.status = 'error';
                p.lastError = {
                  code: 'VALIDATION_ERROR',
                  message: error instanceof Error ? error.message : 'Unknown error',
                  retryable: true,
                };
              }
              s.isValidating = null;
            });
            return false;
          }
        },

        // Clear credential
        clearCredential: (providerId) => {
          set((s) => {
            const p = s.providers.get(providerId);
            if (p) {
              p.credential = undefined;
              p.status = 'inactive';
            }
          });
        },

        // Get adapter
        getAdapter: (providerId) => {
          return get().activeAdapters.get(providerId);
        },

        // Get adapter for content type
        getAdapterForType: (type) => {
          const state = get();
          let defaultId: UUID | null = null;

          switch (type) {
            case 'text':
              defaultId = state.defaultTextProvider;
              break;
            case 'image':
              defaultId = state.defaultImageProvider;
              break;
            case 'video':
              defaultId = state.defaultVideoProvider;
              break;
          }

          if (defaultId) {
            return state.activeAdapters.get(defaultId);
          }

          // Find first active provider that supports this type
          for (const [id, provider] of state.providers) {
            if (
              provider.status === 'active' &&
              provider.config.capabilities.some((c) => c.type === type)
            ) {
              return state.activeAdapters.get(id);
            }
          }

          return undefined;
        },

        // Set default provider
        setDefaultProvider: (type, providerId) => {
          set((s) => {
            switch (type) {
              case 'text':
                s.defaultTextProvider = providerId;
                break;
              case 'image':
                s.defaultImageProvider = providerId;
                break;
              case 'video':
                s.defaultVideoProvider = providerId;
                break;
            }
          });
        },

        // Get default provider
        getDefaultProvider: (type) => {
          const state = get();
          switch (type) {
            case 'text':
              return state.defaultTextProvider;
            case 'image':
              return state.defaultImageProvider;
            case 'video':
              return state.defaultVideoProvider;
            default:
              return null;
          }
        },

        // Set provider status
        setProviderStatus: (providerId, status, error) => {
          set((s) => {
            const p = s.providers.get(providerId);
            if (p) {
              p.status = status;
              if (error) p.lastError = error;
            }
          });
        },

        // Load from database
        loadFromDatabase: async () => {
          set((s) => {
            s.isLoading = true;
          });

          try {
            // TODO: Load providers and credentials from SQLite
            // For now, just mark as loaded
          } finally {
            set((s) => {
              s.isLoading = false;
            });
          }
        },

        // Initialize with default providers
        initializeDefaults: async () => {
          const state = get();

          // Check if Gemini Nano is available (free, no API key)
          const { GeminiNanoAdapter } = await import('./adapters/geminiNanoAdapter');
          if (await GeminiNanoAdapter.isAvailable()) {
            const id = await state.registerProvider('gemini-nano');
            state.setDefaultProvider('text', id);
          }

          // TODO: Load saved providers from database
        },
      }))
    ),
    { name: 'provider-store' }
  )
);

// Selector hooks for common patterns - use subscribeWithSelector for arrays
export const useProviders = () => {
  const store = useProviderStore();
  return Array.from(store.providers.values());
};

export const useProvider = (id: UUID) =>
  useProviderStore((state) => state.providers.get(id));

export const useActiveProviders = () => {
  const store = useProviderStore();
  return Array.from(store.providers.values()).filter((p) => p.status === 'active');
};

export const useProvidersForType = (type: ContentType) => {
  const store = useProviderStore();
  return Array.from(store.providers.values()).filter((p) =>
    p.config.capabilities.some((c) => c.type === type)
  );
};

export const useDefaultProvider = (type: ContentType) =>
  useProviderStore((state) => state.getDefaultProvider(type));

export const useIsValidating = () =>
  useProviderStore((state) => state.isValidating);
