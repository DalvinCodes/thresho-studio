/**
 * Provider Settings Component - Redesigned
 * Each content type has its own default provider selector
 * OpenRouter shows model selection per content type
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MessageSquare, Palette, Video, Eye, EyeOff, Key, Search, ChevronDown, X } from 'lucide-react';
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

// Searchable Dropdown Component
interface SearchableDropdownProps<T> {
  options: T[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  getOptionValue: (option: T) => string;
  getOptionLabel: (option: T) => string;
  disabled?: boolean;
  disabledMessage?: string;
  emptyMessage?: string;
  className?: string;
}

function SearchableDropdown<T>({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  getOptionValue,
  getOptionLabel,
  disabled = false,
  disabledMessage = 'Select an option first',
  emptyMessage = 'No options available',
  className = '',
}: SearchableDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(option => 
      getOptionLabel(option).toLowerCase().includes(term)
    );
  }, [options, searchTerm, getOptionLabel]);

  const selectedLabel = useMemo(() => {
    const selected = options.find(opt => getOptionValue(opt) === value);
    return selected ? getOptionLabel(selected) : '';
  }, [options, value, getOptionValue, getOptionLabel]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  const handleSelect = useCallback((optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  }, []);

  return (
    <div ref={dropdownRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-3 bg-surface border border-border rounded-2xl text-text-primary text-sm
          flex items-center justify-between gap-2
          focus:outline-none focus:ring-2 focus:ring-primary
          transition-colors
          ${disabled 
            ? 'opacity-50 cursor-not-allowed bg-surface' 
            : 'hover:border-primary cursor-pointer'
          }
        `}
      >
        <span className={selectedLabel ? 'text-text-primary font-medium' : 'text-text-secondary'}>
          {disabled ? disabledMessage : (selectedLabel || placeholder)}
        </span>
        <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="
          absolute z-50 w-full mt-2 
          bg-surface rounded-xl shadow-xl border border-border
          overflow-hidden
        ">
          {/* Search Input */}
          <div className="p-3 border-b border-border bg-surface">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="
                  w-full pl-10 pr-8 py-2.5 
                  bg-bg-subtle border border-border rounded-xl
                  text-sm text-text-primary placeholder:text-text-secondary
                  focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                "
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-4 text-sm text-text-secondary text-center">
                {searchTerm ? `No results for "${searchTerm}"` : emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const optionValue = getOptionValue(option);
                const isSelected = optionValue === value;
                return (
                  <button
                    key={optionValue}
                    type="button"
                    onClick={() => handleSelect(optionValue)}
                    className={`
                      w-full px-4 py-2.5 text-left text-sm
                      transition-colors
                      ${isSelected 
                        ? 'bg-primary-light text-primary font-medium' 
                        : 'text-text-primary hover:bg-bg-subtle'
                      }
                    `}
                  >
                    {getOptionLabel(option)}
                  </button>
                );
              })
            )}
          </div>

          {/* Results count */}
          {searchTerm && filteredOptions.length > 0 && (
            <div className="px-4 py-2 text-xs text-text-secondary border-t border-border bg-bg-subtle">
              {filteredOptions.length} result{filteredOptions.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
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
    <div className="space-y-10 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">AI Providers</h2>
          <p className="text-sm text-text-secondary mt-2">
            Configure default providers for each content type
          </p>
        </div>
      </div>

      {/* Content Type Sections */}
      <div className="space-y-8">
        {/* Text Generation */}
        <ContentTypeSection
          title="Text Generation"
          icon={<MessageSquare className="w-5 h-5 text-text-secondary" />}
          type="text"
          providers={providers}
          availableProviders={getProvidersForType('text')}
          openRouterModels={openRouterModels}
          isLoadingModels={isLoadingModels}
        />

        <hr className="border-border" />

        {/* Image Generation */}
        <ContentTypeSection
          title="Image Generation"
          icon={<Palette className="w-5 h-5 text-text-secondary" />}
          type="image"
          providers={providers}
          availableProviders={getProvidersForType('image')}
          openRouterModels={openRouterModels}
          isLoadingModels={isLoadingModels}
        />

        <hr className="border-border" />

        {/* Video Generation */}
        <ContentTypeSection
          title="Video Generation"
          icon={<Video className="w-5 h-5 text-text-secondary" />}
          type="video"
          providers={providers}
          availableProviders={getProvidersForType('video')}
          openRouterModels={openRouterModels}
          isLoadingModels={isLoadingModels}
        />
      </div>

      {/* Separator */}
      <div className="border-t border-border pt-10 mt-10">
        {/* Provider Credentials Section */}
        <div className="bg-surface rounded-2xl shadow-md border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Key className="w-5 h-5 text-text-secondary" />
            <h3 className="font-semibold text-text-primary text-lg">Provider Credentials</h3>
          </div>
          <p className="text-sm text-text-secondary mb-6">
            Add API keys for providers you want to use
          </p>

          <div className="space-y-4">
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
    </div>
  );
}

interface ContentTypeSectionProps {
  title: string;
  icon: React.ReactNode;
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
  const getAdapter = useProviderStore((s) => s.getAdapter);
  
  const selectedProvider = providers.find(p => p.config.id === defaultProviderId);
  const isOpenRouter = selectedProvider?.config.type === 'openrouter';
  
  // Get model selection for this content type from metadata
  const selectedModel = (selectedProvider?.config.metadata?.models as Record<ContentType, string>)?.[type] || '';

  // Selected OpenRouter model provider (e.g., "openai", "anthropic")
  const [selectedModelProvider, setSelectedModelProvider] = useState<string>(() => {
    if (selectedModel && isOpenRouter) {
      return getModelProvider(selectedModel);
    }
    return '';
  });

  // Get native provider models from adapter
  const nativeModels = useMemo(() => {
    if (!selectedProvider || isOpenRouter) return [];
    const adapter = getAdapter(selectedProvider.config.id);
    if (!adapter) return [];
    return adapter.getModelsForType(type);
  }, [selectedProvider, isOpenRouter, getAdapter, type]);

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
    if (selectedModel && isOpenRouter) {
      const provider = getModelProvider(selectedModel);
      if (provider !== selectedModelProvider) {
        setSelectedModelProvider(provider);
      }
    }
  }, [selectedModel, isOpenRouter]);

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
  const selectedModelDetails = selectedModel && isOpenRouter ? filteredModels.find(m => m.id === selectedModel) : null;

  // Get display name for native models
  const getModelDisplayName = (modelId: string): string => {
    const displayNames: Record<string, string> = {
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
    return displayNames[modelId] || modelId;
  };

  // Get display name for selected model in badge
  const selectedModelDisplayName = selectedModel 
    ? (selectedModelDetails?.name || getModelDisplayName(selectedModel))
    : null;

  return (
    <div className="bg-surface rounded-2xl shadow-md p-6 mb-8">
      {/* Header with Selected Provider Info */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="font-semibold text-text-primary text-lg">{title}</h3>
        </div>
        
        {/* Show selected provider badge */}
        {selectedProvider && (
          <div className="flex items-center gap-2 px-4 py-2 bg-primary-light border border-primary rounded-2xl">
            {(() => {
              const meta = providerMeta.find(m => m.type === selectedProvider.config.type);
              return (
                <>
                  <span className="text-lg">{meta?.icon}</span>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-text-primary">
                      {meta?.displayName || selectedProvider.config.displayName}
                    </p>
                    {selectedModelDisplayName && (
                      <p className="text-xs text-text-secondary">
                        {selectedModelDisplayName}
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
        <div className="space-y-6">
          {/* Default Provider Selector */}
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-3">
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
              className="w-full h-12 px-4 bg-bg-subtle border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
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

          {/* Native Provider Model Selector - for providers with multiple models */}
          {selectedProvider && !isOpenRouter && nativeModels.length > 1 && (
            <div className="p-5 bg-bg-subtle rounded-2xl space-y-4 border border-border">
              <p className="text-sm font-semibold text-text-primary">
                Select Model
              </p>
              <SearchableDropdown
                options={nativeModels.map(id => ({ id, name: getModelDisplayName(id) }))}
                value={selectedModel || ''}
                onChange={handleModelChange}
                placeholder="Select a model..."
                searchPlaceholder="Search models..."
                getOptionValue={(opt) => opt.id}
                getOptionLabel={(opt) => opt.name}
                emptyMessage="No models available"
              />
            </div>
          )}

          {/* OpenRouter Model Selector - Two-step: Provider then Model */}
          {isOpenRouter && (
            <div className="p-5 bg-bg-subtle rounded-2xl space-y-5 border border-border">
              <p className="text-sm font-semibold text-text-primary">
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
                    <label className="block text-sm font-semibold text-text-primary mb-2">
                      Model Provider
                    </label>
                    <SearchableDropdown
                      options={Array.from(groupedModels.entries()).map(([provider, models]) => ({ 
                        id: provider, 
                        name: `${getProviderDisplayName(provider)} (${models.length})` 
                      }))}
                      value={selectedModelProvider}
                      onChange={handleModelProviderChange}
                      placeholder="Select provider..."
                      searchPlaceholder="Search providers..."
                      getOptionValue={(opt) => opt.id}
                      getOptionLabel={(opt) => opt.name}
                      emptyMessage="No providers available"
                    />
                  </div>

                  {/* Model Selector */}
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-2">
                      Model
                    </label>
                    <SearchableDropdown
                      options={modelsForSelectedProvider.map(model => ({
                        id: model.id,
                        name: model.name.replace(getProviderDisplayName(selectedModelProvider), '').trim() || model.name
                      }))}
                      value={selectedModel || ''}
                      onChange={handleModelChange}
                      placeholder="Select model..."
                      searchPlaceholder="Search models..."
                      disabled={!selectedModelProvider}
                      disabledMessage="Select provider first"
                      getOptionValue={(opt) => opt.id}
                      getOptionLabel={(opt) => opt.name}
                      emptyMessage="No models available"
                    />
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
      <div className="p-4 bg-bg-subtle rounded-2xl flex items-center justify-between border border-border">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <p className="font-semibold text-text-primary">{meta.displayName}</p>
            <p className="text-sm text-text-secondary">{meta.description}</p>
          </div>
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-medium"
        >
          Add
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-bg-subtle rounded-2xl border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <p className="font-semibold text-text-primary">{meta.displayName}</p>
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
            <span className="text-sm text-green-600 font-medium">No API key needed</span>
          )}
          <button
            onClick={() => removeProvider(existingProvider.config.id)}
            className="p-2 text-text-secondary hover:text-red-500 transition-colors"
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
        <div className="mt-4 flex gap-3">
          <div className="flex-1 relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasCredential ? 'Change API key...' : 'Enter API key...'}
              className="w-full h-12 px-4 bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
            >
              {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          
          {hasCredential && (
            <button
              onClick={() => clearCredential(existingProvider.config.id)}
              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
            >
              Clear
            </button>
          )}
          
          <button
            onClick={handleSaveKey}
            disabled={!apiKey.trim() || isValidatingThis}
            className="px-5 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
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
          className="inline-block mt-3 text-sm text-primary hover:underline font-medium"
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
    <div className="mt-3 p-3 bg-surface rounded-xl text-xs space-y-2 border border-border">
      <div className="flex flex-wrap gap-2">
        <span className="px-2 py-1 bg-primary-light text-primary rounded-lg font-medium">
          {(model.context_length / 1000).toFixed(0)}K ctx
        </span>
        {promptPrice > 0 ? (
          <>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg font-medium">
              ${promptPrice.toFixed(2)}/M in
            </span>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg font-medium">
              ${completionPrice.toFixed(2)}/M out
            </span>
          </>
        ) : (
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg font-medium">
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
