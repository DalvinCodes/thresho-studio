/**
 * ProviderModelSelector Component
 * Reusable component for selecting provider + model combination
 * Works with all providers (OpenRouter uses two-step provider->model, others show adapter models)
 */

import { useState, useEffect, useMemo } from 'react';
import type { ContentType, UUID } from '../../../core/types/common';
import type { ProviderState } from '../../../core/types/provider';
import { useProviderStore, useProvidersForType } from '../store';
import { providerMeta } from '../adapters';
import type { OpenRouterAPIModel } from '../adapters/openRouterAdapter';

// OpenRouter provider display names for grouping
const OPENROUTER_PROVIDER_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  'meta-llama': 'Meta Llama',
  mistralai: 'Mistral AI',
  cohere: 'Cohere',
  deepseek: 'DeepSeek',
  qwen: 'Qwen',
  perplexity: 'Perplexity',
  nvidia: 'NVIDIA',
  'x-ai': 'xAI',
  microsoft: 'Microsoft',
  amazon: 'Amazon',
  databricks: 'Databricks',
  ai21: 'AI21 Labs',
  inflection: 'Inflection',
  '01-ai': '01.AI',
  nous: 'Nous Research',
  openchat: 'OpenChat',
  teknium: 'Teknium',
  cognitivecomputations: 'Cognitive Computations',
  nousresearch: 'Nous Research',
  phind: 'Phind',
  togethercomputer: 'Together AI',
  'black-forest-labs': 'Black Forest Labs',
  stability: 'Stability AI',
};

// Extract provider name from OpenRouter model ID
function getOpenRouterModelProvider(modelId: string): string {
  const parts = modelId.split('/');
  return parts[0] || 'unknown';
}

// Get display name for OpenRouter provider
function getOpenRouterProviderDisplayName(providerId: string): string {
  return (
    OPENROUTER_PROVIDER_NAMES[providerId] ||
    providerId.charAt(0).toUpperCase() + providerId.slice(1)
  );
}

// Group OpenRouter models by provider
function groupOpenRouterModelsByProvider(
  models: OpenRouterAPIModel[]
): Map<string, OpenRouterAPIModel[]> {
  const groups = new Map<string, OpenRouterAPIModel[]>();

  for (const model of models) {
    const provider = getOpenRouterModelProvider(model.id);
    const existing = groups.get(provider) || [];
    existing.push(model);
    groups.set(provider, existing);
  }

  // Sort providers - priority providers first
  const priorityProviders = [
    'openai',
    'anthropic',
    'google',
    'meta-llama',
    'mistralai',
    'deepseek',
    'black-forest-labs',
    'stability',
  ];
  const sortedGroups = new Map<string, OpenRouterAPIModel[]>();

  for (const p of priorityProviders) {
    if (groups.has(p)) {
      sortedGroups.set(p, groups.get(p)!);
      groups.delete(p);
    }
  }

  // Add remaining alphabetically
  const remaining = Array.from(groups.keys()).sort();
  for (const p of remaining) {
    sortedGroups.set(p, groups.get(p)!);
  }

  return sortedGroups;
}

// Human-readable model names for native providers
const MODEL_DISPLAY_NAMES: Record<string, string> = {
  // Imagen
  'imagen-4.0-generate-001': 'Imagen 4 Standard',
  'imagen-4.0-fast-generate-001': 'Imagen 4 Fast',
  'imagen-4.0-ultra-generate-001': 'Imagen 4 Ultra',
  'imagen-3.0-generate-002': 'Imagen 3 v2',
  'imagen-3.0-generate-001': 'Imagen 3 v1',
  'imagen-3.0-fast-generate-001': 'Imagen 3 Fast',
  // Gemini image (correct model names per API docs)
  'gemini-2.5-flash-image': 'Gemini 2.5 Flash (Image)',
  'gemini-3-pro-image-preview': 'Gemini 3 Pro (Image)',
  // Gemini text
  'gemini-3.0-pro-preview': 'Gemini 3.0 Pro',
  'gemini-3.0-flash-preview': 'Gemini 3.0 Flash',
  'gemini-2.5-pro-preview-06-05': 'Gemini 2.5 Pro',
  'gemini-2.5-flash-preview-05-20': 'Gemini 2.5 Flash',
  'gemini-2.5-flash-lite-preview-06-17': 'Gemini 2.5 Flash Lite',
  'gemini-2.0-flash': 'Gemini 2.0 Flash',
  'gemini-2.0-flash-lite': 'Gemini 2.0 Flash Lite',
  // Veo
  'veo-3.1-generate-001': 'Veo 3.1',
  'veo-3.0-generate-001': 'Veo 3.0',
  'veo-3.0-fast-generate-001': 'Veo 3.0 Fast',
  'veo-2.0-generate-001': 'Veo 2.0',
  // Flux Pro
  'flux-pro-1.1': 'Flux Pro 1.1',
  'flux-pro-1.1-ultra': 'Flux Pro 1.1 Ultra',
  'flux-pro': 'Flux Pro',
  'flux-dev': 'Flux Dev',
  // Runway
  'gen-4': 'Gen-4',
  'gen-3-alpha': 'Gen-3 Alpha',
  'gen-3-alpha-turbo': 'Gen-3 Alpha Turbo',
  // OpenAI
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o Mini',
  'gpt-4-turbo': 'GPT-4 Turbo',
  'dall-e-3': 'DALL-E 3',
  'dall-e-2': 'DALL-E 2',
  // Anthropic
  'claude-sonnet-4-20250514': 'Claude Sonnet 4',
  'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
  'claude-3-opus-20240229': 'Claude 3 Opus',
  'claude-3-haiku-20240307': 'Claude 3 Haiku',
  // Kimi
  'moonshot-v1-256k': 'Kimi K2 256K',
  'moonshot-v1-128k': 'Kimi K2 128K',
  'moonshot-v1-32k': 'Kimi K2 32K',
  'moonshot-v1-8k': 'Kimi K2 8K',
};

function getModelDisplayName(modelId: string): string {
  return MODEL_DISPLAY_NAMES[modelId] || modelId;
}

export interface ProviderModelSelectorProps {
  /** Content type to filter providers/models for */
  contentType: ContentType;
  /** Currently selected provider ID */
  selectedProviderId: UUID | null;
  /** Currently selected model ID */
  selectedModelId: string | null;
  /** Callback when provider changes */
  onProviderChange: (providerId: UUID) => void;
  /** Callback when model changes */
  onModelChange: (modelId: string) => void;
  /** Whether to only show active providers */
  activeOnly?: boolean;
  /** Custom class name */
  className?: string;
  /** Whether to show loading spinner */
  isLoading?: boolean;
  /** Compact mode - single line */
  compact?: boolean;
}

export function ProviderModelSelector({
  contentType,
  selectedProviderId,
  selectedModelId,
  onProviderChange,
  onModelChange,
  activeOnly = true,
  className = '',
  isLoading = false,
  compact = false,
}: ProviderModelSelectorProps) {
  // Get providers that support this content type
  const allProviders = useProvidersForType(contentType);
  const providers = activeOnly
    ? allProviders.filter((p) => p.status === 'active')
    : allProviders;

  // OpenRouter models cache
  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterAPIModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const fetchOpenRouterModels = useProviderStore((s) => s.fetchOpenRouterModels);
  const getOpenRouterModels = useProviderStore((s) => s.getOpenRouterModels);
  const getAdapter = useProviderStore((s) => s.getAdapter);

  // Selected provider state
  const selectedProvider = providers.find((p) => p.config.id === selectedProviderId);
  const isOpenRouter = selectedProvider?.config.type === 'openrouter';

  // For OpenRouter two-step selection
  const [selectedOpenRouterProvider, setSelectedOpenRouterProvider] = useState<string>(() => {
    if (selectedModelId && isOpenRouter) {
      return getOpenRouterModelProvider(selectedModelId);
    }
    return '';
  });

  // Fetch OpenRouter models when needed
  useEffect(() => {
    if (!selectedProvider || !isOpenRouter) return;

    const cached = getOpenRouterModels(selectedProvider.config.id);
    if (cached.length > 0) {
      setOpenRouterModels(cached);
    } else if (!isLoadingModels) {
      setIsLoadingModels(true);
      fetchOpenRouterModels(selectedProvider.config.id)
        .then((models) => {
          setOpenRouterModels(models);
          setIsLoadingModels(false);
        })
        .catch(() => {
          setIsLoadingModels(false);
        });
    }
  }, [selectedProvider, isOpenRouter, fetchOpenRouterModels, getOpenRouterModels, isLoadingModels]);

  // Update OpenRouter provider when model changes
  useEffect(() => {
    if (selectedModelId && isOpenRouter) {
      const provider = getOpenRouterModelProvider(selectedModelId);
      if (provider !== selectedOpenRouterProvider) {
        setSelectedOpenRouterProvider(provider);
      }
    }
  }, [selectedModelId, isOpenRouter]);

  // Filter OpenRouter models by content type
  const filteredOpenRouterModels = useMemo(() => {
    if (!openRouterModels.length) return [];

    switch (contentType) {
      case 'text':
        return openRouterModels.filter(
          (m) =>
            m.architecture?.output_modalities?.includes('text') ??
            m.architecture?.modality?.includes('text')
        );
      case 'image':
        return openRouterModels.filter((m) =>
          m.architecture?.output_modalities?.includes('image')
        );
      case 'video':
        return openRouterModels.filter((m) =>
          m.architecture?.output_modalities?.includes('video')
        );
      default:
        return [];
    }
  }, [openRouterModels, contentType]);

  // Group OpenRouter models
  const groupedOpenRouterModels = useMemo(
    () => groupOpenRouterModelsByProvider(filteredOpenRouterModels),
    [filteredOpenRouterModels]
  );

  // Get models for selected OpenRouter provider
  const openRouterModelsForProvider = useMemo(() => {
    if (!selectedOpenRouterProvider) return [];
    return groupedOpenRouterModels.get(selectedOpenRouterProvider) || [];
  }, [groupedOpenRouterModels, selectedOpenRouterProvider]);

  // Get native provider models from adapter
  const nativeModels = useMemo(() => {
    if (!selectedProvider || isOpenRouter) return [];
    const adapter = getAdapter(selectedProvider.config.id);
    if (!adapter) return [];
    return adapter.getModelsForType(contentType);
  }, [selectedProvider, isOpenRouter, getAdapter, contentType]);

  // Handle provider change
  const handleProviderChange = (providerId: UUID) => {
    onProviderChange(providerId);
    // Reset model when provider changes
    onModelChange('');
    setSelectedOpenRouterProvider('');
  };

  // Handle OpenRouter provider change (two-step)
  const handleOpenRouterProviderChange = (orProvider: string) => {
    setSelectedOpenRouterProvider(orProvider);
    onModelChange(''); // Clear model when OR provider changes
  };

  if (providers.length === 0) {
    return (
      <div className={`text-sm text-text-secondary ${className}`}>
        No {contentType} providers configured.{' '}
        <a href="/providers" className="text-primary hover:underline">
          Add a provider
        </a>
      </div>
    );
  }

  const containerClass = compact
    ? 'flex items-center gap-3'
    : 'space-y-4';

  return (
    <div className={`${containerClass} ${className}`}>
      {/* Provider Selector */}
      <div className={compact ? 'flex-1' : ''}>
        {!compact && (
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Provider
          </label>
        )}
        <select
          value={selectedProviderId || ''}
          onChange={(e) => handleProviderChange(e.target.value as UUID)}
          disabled={isLoading}
          className="w-full px-3 py-2 bg-background border border-border rounded-3xl text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
        >
          <option value="" disabled>
            Select provider...
          </option>
          {providers.map((provider) => {
            const meta = providerMeta.find((m) => m.type === provider.config.type);
            return (
              <option key={provider.config.id} value={provider.config.id}>
                {meta?.icon} {meta?.displayName || provider.config.displayName}
                {provider.status !== 'active' ? ' (not connected)' : ''}
              </option>
            );
          })}
        </select>
      </div>

      {/* Model Selector - varies by provider type */}
      {selectedProvider && (
        <>
          {isOpenRouter ? (
            // OpenRouter: Two-step selection (Provider -> Model)
            <OpenRouterModelSelector
              groupedModels={groupedOpenRouterModels}
              modelsForProvider={openRouterModelsForProvider}
              selectedOpenRouterProvider={selectedOpenRouterProvider}
              selectedModelId={selectedModelId}
              isLoading={isLoadingModels}
              onProviderChange={handleOpenRouterProviderChange}
              onModelChange={onModelChange}
              compact={compact}
            />
          ) : nativeModels.length > 0 ? (
            // Native provider with multiple models
            <div className={compact ? 'flex-1' : ''}>
              {!compact && (
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Model
                </label>
              )}
              <select
                value={selectedModelId || ''}
                onChange={(e) => onModelChange(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-background border border-border rounded-3xl text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              >
                <option value="">Default model</option>
                {nativeModels.map((modelId) => (
                  <option key={modelId} value={modelId}>
                    {getModelDisplayName(modelId)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            // Single model provider - show info
            !compact && (
              <div className="text-sm text-text-secondary">
                Using default model for{' '}
                {providerMeta.find((m) => m.type === selectedProvider.config.type)?.displayName}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

/** OpenRouter specific two-step model selector */
interface OpenRouterModelSelectorProps {
  groupedModels: Map<string, OpenRouterAPIModel[]>;
  modelsForProvider: OpenRouterAPIModel[];
  selectedOpenRouterProvider: string;
  selectedModelId: string | null;
  isLoading: boolean;
  onProviderChange: (provider: string) => void;
  onModelChange: (modelId: string) => void;
  compact?: boolean;
}

function OpenRouterModelSelector({
  groupedModels,
  modelsForProvider,
  selectedOpenRouterProvider,
  selectedModelId,
  isLoading,
  onProviderChange,
  onModelChange,
  compact = false,
}: OpenRouterModelSelectorProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        Loading models...
      </div>
    );
  }

  if (groupedModels.size === 0) {
    return (
      <div className="text-sm text-text-secondary">
        No models available for this content type.
      </div>
    );
  }

  const containerClass = compact ? 'flex items-center gap-3 flex-1' : 'grid grid-cols-2 gap-4';

  return (
    <div className={containerClass}>
      {/* Model Provider Selector */}
      <div className={compact ? 'flex-1' : ''}>
        {!compact && (
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Model Provider
          </label>
        )}
        <select
          value={selectedOpenRouterProvider}
          onChange={(e) => onProviderChange(e.target.value)}
          className="w-full px-3 py-2 bg-surface border border-border rounded-3xl text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Select provider...</option>
          {Array.from(groupedModels.entries()).map(([provider, models]) => (
            <option key={provider} value={provider}>
              {getOpenRouterProviderDisplayName(provider)} ({models.length})
            </option>
          ))}
        </select>
      </div>

      {/* Model Selector */}
      <div className={compact ? 'flex-1' : ''}>
        {!compact && (
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Model
          </label>
        )}
        <select
          value={selectedModelId || ''}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={!selectedOpenRouterProvider}
          className="w-full px-3 py-2 bg-surface border border-border rounded-3xl text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">
            {selectedOpenRouterProvider ? 'Select model...' : 'Select provider first'}
          </option>
          {modelsForProvider.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name
                .replace(getOpenRouterProviderDisplayName(selectedOpenRouterProvider), '')
                .trim() || model.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default ProviderModelSelector;
