/**
 * Provider Settings Component - Redesigned
 * Each content type has its own default provider selector
 * OpenRouter shows model selection per content type
 */

import { useState, useEffect, useMemo } from 'react';
import type { ContentType, UUID } from '../../../core/types/common';
import type { ProviderState } from '../../../core/types/provider';
import {
  useProviders,
  useProviderStore,
  useIsValidating,
  useDefaultProvider,
} from '../store';
import { providerMeta, getSupportedProviderTypes } from '../adapters';
import type { OpenRouterAPIModel } from '../adapters/openRouterAdapter';

// Provider display names for OpenRouter model grouping
const OPENROUTER_PROVIDER_NAMES: Record<string, string> = {
  'openai': 'OpenAI',
  'anthropic': 'Anthropic',
  'google': 'Google',
  'meta-llama': 'Meta Llama',
  'mistralai': 'Mistral AI',
  'cohere': 'Cohere',
  'deepseek': 'DeepSeek',
  'qwen': 'Qwen',
  'perplexity': 'Perplexity',
  'nvidia': 'NVIDIA',
  'x-ai': 'xAI',
  'microsoft': 'Microsoft',
  'amazon': 'Amazon',
  'databricks': 'Databricks',
  'ai21': 'AI21 Labs',
  'inflection': 'Inflection',
  '01-ai': '01.AI',
  'nous': 'Nous Research',
  'openchat': 'OpenChat',
  'teknium': 'Teknium',
  'cognitivecomputations': 'Cognitive Computations',
  'nousresearch': 'Nous Research',
  'phind': 'Phind',
  'togethercomputer': 'Together AI',
  'black-forest-labs': 'Black Forest Labs',
  'stability': 'Stability AI',
};

// Extract provider name from OpenRouter model ID (e.g., "openai/gpt-4o" -> "openai")
function getModelProvider(modelId: string): string {
  const parts = modelId.split('/');
  return parts[0] || 'unknown';
}

// Get display name for a provider
function getProviderDisplayName(providerId: string): string {
  return OPENROUTER_PROVIDER_NAMES[providerId] || providerId.charAt(0).toUpperCase() + providerId.slice(1);
}

// Group models by provider
function groupModelsByProvider(models: OpenRouterAPIModel[]): Map<string, OpenRouterAPIModel[]> {
  const groups = new Map<string, OpenRouterAPIModel[]>();
  
  for (const model of models) {
    const provider = getModelProvider(model.id);
    const existing = groups.get(provider) || [];
    existing.push(model);
    groups.set(provider, existing);
  }
  
  // Sort providers alphabetically, but put popular ones first
  const priorityProviders = ['openai', 'anthropic', 'google', 'meta-llama', 'mistralai', 'deepseek'];
  const sortedGroups = new Map<string, OpenRouterAPIModel[]>();
  
  // Add priority providers first
  for (const p of priorityProviders) {
    if (groups.has(p)) {
      sortedGroups.set(p, groups.get(p)!);
      groups.delete(p);
    }
  }
  
  // Add remaining providers alphabetically
  const remainingProviders = Array.from(groups.keys()).sort();
  for (const p of remainingProviders) {
    sortedGroups.set(p, groups.get(p)!);
  }
  
  return sortedGroups;
}

export function ProviderSettings() {
  const providers: ProviderState[] = useProviders();
  const isValidating = useIsValidating();
  const registerProvider = useProviderStore((s) => s.registerProvider);
  const fetchOpenRouterModels = useProviderStore((s) => s.fetchOpenRouterModels);
  const getOpenRouterModels = useProviderStore((s) => s.getOpenRouterModels);
  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterAPIModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Get available providers that are registered
  const getProvidersForType = (type: ContentType) => {
    return providers.filter((p) =>
      p.config.capabilities.some((c) => c.type === type)
    );
  };

  // Load OpenRouter models if needed
  // Fetch when provider is active OR has credentials (will become active after validation)
  useEffect(() => {
    const openRouterProvider = providers.find(p => p.config.type === 'openrouter');
    const hasCredential = !!openRouterProvider?.credential?.apiKey;
    const isActiveOrHasCredential = openRouterProvider?.status === 'active' || hasCredential;
    
    if (openRouterProvider && isActiveOrHasCredential) {
      const cached = getOpenRouterModels(openRouterProvider.config.id);
      if (cached.length > 0) {
        setOpenRouterModels(cached);
      } else if (!isLoadingModels) {
        setIsLoadingModels(true);
        fetchOpenRouterModels(openRouterProvider.config.id).then((models) => {
          setOpenRouterModels(models);
          setIsLoadingModels(false);
        }).catch(() => {
          setIsLoadingModels(false);
        });
      }
    }
  }, [providers, fetchOpenRouterModels, getOpenRouterModels, isLoadingModels]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">AI Providers</h2>
          <p className="text-sm text-text-secondary mt-1">
            Configure default providers for each content type
          </p>
        </div>
      </div>

      {/* Text Generation */}
      <ContentTypeSection
        title="Text Generation"
        icon="💬"
        type="text"
        providers={providers}
        availableProviders={getProvidersForType('text')}
        openRouterModels={openRouterModels}
        isLoadingModels={isLoadingModels}
      />

      {/* Image Generation */}
      <ContentTypeSection
        title="Image Generation"
        icon="🎨"
        type="image"
        providers={providers}
        availableProviders={getProvidersForType('image')}
        openRouterModels={openRouterModels}
        isLoadingModels={isLoadingModels}
      />

      {/* Video Generation */}
      <ContentTypeSection
        title="Video Generation"
        icon="🎬"
        type="video"
        providers={providers}
        availableProviders={getProvidersForType('video')}
        openRouterModels={openRouterModels}
        isLoadingModels={isLoadingModels}
      />

      {/* Provider Credentials Section */}
      <div className="bg-surface rounded-lg p-6 border border-border">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🔑</span>
          <h3 className="font-medium text-text-primary">Provider Credentials</h3>
        </div>
        <p className="text-sm text-text-secondary mb-4">
          Add API keys for providers you want to use
        </p>
        
        <div className="space-y-3">
          {getSupportedProviderTypes().map((type) => {
            const existingProvider = providers.find(p => p.config.type === type);
            const meta = providerMeta.find(m => m.type === type);
            if (!meta) return null;
            
            return (
              <ProviderCredentialCard
                key={type}
                providerType={type}
                meta={meta}
                existingProvider={existingProvider}
                isValidating={isValidating}
                onAdd={async () => {
                  await registerProvider(type);
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface ContentTypeSectionProps {
  title: string;
  icon: string;
  type: ContentType;
  providers: ProviderState[];
  availableProviders: ProviderState[];
  openRouterModels: OpenRouterAPIModel[];
  isLoadingModels: boolean;
}

function ContentTypeSection({
  title,
  icon,
  type,
  providers,
  availableProviders,
  openRouterModels,
  isLoadingModels,
}: ContentTypeSectionProps) {
  const defaultProviderId = useDefaultProvider(type);
  const setDefaultProvider = useProviderStore((s) => s.setDefaultProvider);
  const updateProvider = useProviderStore((s) => s.updateProvider);
  
  const selectedProvider = providers.find(p => p.config.id === defaultProviderId);
  const isOpenRouter = selectedProvider?.config.type === 'openrouter';
  
  // Get model selection for this content type from metadata
  const selectedModel = isOpenRouter 
    ? (selectedProvider?.config.metadata?.models as Record<ContentType, string>)?.[type]
    : null;

  // Selected OpenRouter model provider (e.g., "openai", "anthropic")
  const [selectedModelProvider, setSelectedModelProvider] = useState<string>(() => {
    if (selectedModel) {
      return getModelProvider(selectedModel);
    }
    return '';
  });

  // Filter models by content type using OpenRouter's output_modalities field
  const filteredModels = useMemo(() => {
    if (!openRouterModels.length) return [];
    
    switch (type) {
      case 'text':
        // Models that output text
        return openRouterModels.filter(m => 
          m.architecture?.output_modalities?.includes('text') ?? 
          // Fallback for models without modality info - assume text if modality string contains "text"
          m.architecture?.modality?.includes('text')
        );
      case 'image':
        // Models that output images
        return openRouterModels.filter(m => 
          m.architecture?.output_modalities?.includes('image')
        );
      case 'video':
        // Models that output video
        return openRouterModels.filter(m => 
          m.architecture?.output_modalities?.includes('video')
        );
      default:
        return [];
    }
  }, [openRouterModels, type]);

  // Group models by provider
  const groupedModels = useMemo(() => groupModelsByProvider(filteredModels), [filteredModels]);
  
  // Get models for selected provider
  const modelsForSelectedProvider = useMemo(() => {
    if (!selectedModelProvider) return [];
    return groupedModels.get(selectedModelProvider) || [];
  }, [groupedModels, selectedModelProvider]);

  // Update selected model provider when selected model changes
  useEffect(() => {
    if (selectedModel) {
      const provider = getModelProvider(selectedModel);
      if (provider !== selectedModelProvider) {
        setSelectedModelProvider(provider);
      }
    }
  }, [selectedModel]);

  const handleModelProviderChange = (provider: string) => {
    setSelectedModelProvider(provider);
    // Clear model selection when provider changes
    if (selectedProvider) {
      const currentModels = (selectedProvider.config.metadata?.models || {}) as Record<ContentType, string>;
      updateProvider(selectedProvider.config.id, {
        metadata: {
          ...selectedProvider.config.metadata,
          models: {
            ...currentModels,
            [type]: '',
          },
        },
      });
    }
  };

  const handleModelChange = (modelId: string) => {
    if (selectedProvider) {
      const currentModels = (selectedProvider.config.metadata?.models || {}) as Record<ContentType, string>;
      updateProvider(selectedProvider.config.id, {
        metadata: {
          ...selectedProvider.config.metadata,
          models: {
            ...currentModels,
            [type]: modelId,
          },
        },
      });
    }
  };

  // Get selected model details for badge display
  const selectedModelDetails = selectedModel ? filteredModels.find(m => m.id === selectedModel) : null;

  return (
    <div className="bg-surface rounded-lg p-6 border border-border">
      {/* Header with Selected Provider Info */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h3 className="font-medium text-text-primary">{title}</h3>
        </div>
        
        {/* Show selected provider badge */}
        {selectedProvider && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg">
            {(() => {
              const meta = providerMeta.find(m => m.type === selectedProvider.config.type);
              return (
                <>
                  <span className="text-lg">{meta?.icon}</span>
                  <div className="text-right">
                    <p className="text-sm font-medium text-text-primary">
                      {meta?.displayName || selectedProvider.config.displayName}
                    </p>
                    {isOpenRouter && selectedModelDetails && (
                      <p className="text-xs text-text-secondary">
                        {selectedModelDetails.name}
                      </p>
                    )}
                  </div>
                  <span 
                    className={`w-2 h-2 rounded-full ml-2 ${
                      selectedProvider.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                    }`} 
                    title={selectedProvider.status === 'active' ? 'Connected' : 'Error'}
                  />
                </>
              );
            })()}
          </div>
        )}
      </div>

      {availableProviders.length === 0 ? (
        <p className="text-sm text-text-secondary">
          No providers configured. Add provider credentials below.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Default Provider Selector */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Default Provider
            </label>
            <select
              value={defaultProviderId || ''}
              onChange={(e) => {
                const providerId = e.target.value as UUID;
                if (providerId) {
                  setDefaultProvider(type, providerId);
                }
              }}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="" disabled>Select a provider...</option>
              {availableProviders.map((provider) => {
                const meta = providerMeta.find(m => m.type === provider.config.type);
                return (
                  <option key={provider.config.id} value={provider.config.id}>
                    {meta?.displayName || provider.config.displayName}
                    {provider.status !== 'active' ? ' (not connected)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* OpenRouter Model Selector - Two-step: Provider then Model */}
          {isOpenRouter && (
            <div className="p-4 bg-background rounded-lg space-y-4">
              <p className="text-sm font-medium text-text-primary">
                Select Model via OpenRouter
              </p>
              
              {isLoadingModels ? (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading available models...
                </div>
              ) : groupedModels.size > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {/* Model Provider Selector */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Model Provider
                    </label>
                    <select
                      value={selectedModelProvider}
                      onChange={(e) => handleModelProviderChange(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select provider...</option>
                      {Array.from(groupedModels.entries()).map(([provider, models]) => (
                        <option key={provider} value={provider}>
                          {getProviderDisplayName(provider)} ({models.length})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Model Selector */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Model
                    </label>
                    <select
                      value={selectedModel || ''}
                      onChange={(e) => handleModelChange(e.target.value)}
                      disabled={!selectedModelProvider}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {selectedModelProvider ? 'Select model...' : 'Select provider first'}
                      </option>
                      {modelsForSelectedProvider.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name.replace(getProviderDisplayName(selectedModelProvider), '').trim() || model.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-secondary">
                  No {type} models available via OpenRouter.
                </p>
              )}
              
              {/* Selected Model Info */}
              {selectedModelDetails && (
                <ModelInfo model={selectedModelDetails} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ProviderCredentialCardProps {
  providerType: string;
  meta: { displayName: string; icon: string; description: string; requiresApiKey: boolean; docsUrl: string };
  existingProvider?: ProviderState;
  isValidating: string | null;
  onAdd: () => void;
}

function ProviderCredentialCard({
  providerType,
  meta,
  existingProvider,
  isValidating,
  onAdd,
}: ProviderCredentialCardProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const setCredential = useProviderStore((s) => s.setCredential);
  const clearCredential = useProviderStore((s) => s.clearCredential);
  const removeProvider = useProviderStore((s) => s.removeProvider);

  const isValidatingThis = isValidating === existingProvider?.config.id;
  const hasCredential = !!existingProvider?.credential?.apiKey;

  const handleSaveKey = async () => {
    if (apiKey.trim() && existingProvider) {
      await setCredential(existingProvider.config.id, apiKey.trim());
      setApiKey('');
    }
  };

  if (!existingProvider) {
    return (
      <div className="p-3 bg-background rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <p className="font-medium text-text-primary">{meta.displayName}</p>
            <p className="text-sm text-text-secondary">{meta.description}</p>
          </div>
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Add
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 bg-background rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <p className="font-medium text-text-primary">{meta.displayName}</p>
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`w-2 h-2 rounded-full ${
                  existingProvider.status === 'active'
                    ? 'bg-green-500'
                    : existingProvider.status === 'error'
                    ? 'bg-red-500'
                    : 'bg-gray-500'
                }`}
              />
              <span className="text-text-secondary">
                {isValidatingThis
                  ? 'Validating...'
                  : existingProvider.status === 'active'
                  ? 'Connected'
                  : existingProvider.status === 'error'
                  ? 'Error'
                  : 'Not configured'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!meta.requiresApiKey && (
            <span className="text-xs text-green-500">No API key needed</span>
          )}
          <button
            onClick={() => removeProvider(existingProvider.config.id)}
            className="p-1 text-text-secondary hover:text-red-500 transition-colors"
            title="Remove provider"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* API Key Input */}
      {meta.requiresApiKey && (
        <div className="mt-3 flex gap-2">
          <div className="flex-1 relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasCredential ? 'Change API key...' : 'Enter API key...'}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
            >
              {showKey ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          
          {hasCredential && (
            <button
              onClick={() => clearCredential(existingProvider.config.id)}
              className="px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
          
          <button
            onClick={handleSaveKey}
            disabled={!apiKey.trim() || isValidatingThis}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isValidatingThis ? 'Validating...' : hasCredential ? 'Update' : 'Save'}
          </button>
        </div>
      )}

      {meta.docsUrl && (
        <a
          href={meta.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 text-xs text-primary hover:underline"
        >
          View Documentation →
        </a>
      )}
    </div>
  );
}

// Helper component to display model information
function ModelInfo({ model }: { model: OpenRouterAPIModel | undefined }) {
  if (!model) return null;
  
  const promptPrice = parseFloat(model.pricing.prompt) * 1000000;
  const completionPrice = parseFloat(model.pricing.completion) * 1000000;
  
  return (
    <div className="mt-2 p-2 bg-surface/50 rounded text-xs space-y-1">
      <div className="flex flex-wrap gap-1">
        <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded">
          {(model.context_length / 1000).toFixed(0)}K ctx
        </span>
        {promptPrice > 0 ? (
          <>
            <span className="px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded">
              ${promptPrice.toFixed(2)}/M in
            </span>
            <span className="px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded">
              ${completionPrice.toFixed(2)}/M out
            </span>
          </>
        ) : (
          <span className="px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded">
            Free
          </span>
        )}
      </div>
      {model.description && (
        <p className="text-text-secondary line-clamp-2">{model.description}</p>
      )}
    </div>
  );
}

export default ProviderSettings;
