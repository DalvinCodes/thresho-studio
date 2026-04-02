/**
 * ProviderModelSelector Component
 * Reusable component for selecting provider + model combination
 */

import { useMemo } from 'react';
import type { ContentType, UUID } from '../../../core/types/common';
import { useProvidersForType } from '../store';
import { providerMeta } from '../adapters';
import { useProviderStore } from '../store';

// Human-readable model names for Google ecosystem providers
const MODEL_DISPLAY_NAMES: Record<string, string> = {
  // Imagen
  'imagen-4.0-generate-001': 'Imagen 4 Standard',
  'imagen-4.0-fast-generate-001': 'Imagen 4 Fast',
  'imagen-4.0-ultra-generate-001': 'Imagen 4 Ultra',
  'imagen-3.0-generate-002': 'Imagen 3 v2',
  'imagen-3.0-generate-001': 'Imagen 3 v1',
  'imagen-3.0-fast-generate-001': 'Imagen 3 Fast',
  // Gemini image
  'gemini-3-flash-preview': 'Gemini 2.5 Flash (Image)',
  'gemini-3-pro-image-preview': 'Gemini 3 Pro (Image)',
  // Gemini text
  'gemini-3.0-pro-preview': 'Gemini 3.0 Pro',
  'gemini-3.0-flash-preview': 'Gemini 3.0 Flash',
  'gemini-2.5-pro-preview-06-05': 'Gemini 2.5 Pro',
  'gemini-2.0-flash': 'Gemini 2.0 Flash',
  'gemini-2.0-flash-lite': 'Gemini 2.0 Flash Lite',
  // Veo
  'veo-3.1-generate-001': 'Veo 3.1',
  'veo-3.0-generate-001': 'Veo 3.0',
  'veo-3.0-fast-generate-001': 'Veo 3.0 Fast',
  'veo-2.0-generate-001': 'Veo 2.0',
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

  const getAdapter = useProviderStore((s) => s.getAdapter);

  // Selected provider state
  const selectedProvider = providers.find((p) => p.config.id === selectedProviderId);

  // Get native provider models from adapter
  const nativeModels = useMemo(() => {
    if (!selectedProvider) return [];
    const adapter = getAdapter(selectedProvider.config.id);
    if (!adapter) return [];
    return adapter.getModelsForType(contentType);
  }, [selectedProvider, getAdapter, contentType]);

  // Handle provider change
  const handleProviderChange = (providerId: UUID) => {
    onProviderChange(providerId);
    onModelChange('');
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

      {/* Model Selector */}
      {selectedProvider && nativeModels.length > 0 ? (
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
      ) : selectedProvider && !compact ? (
        <div className="text-sm text-text-secondary">
          Using default model for{' '}
          {providerMeta.find((m) => m.type === selectedProvider.config.type)?.displayName}
        </div>
      ) : null}
    </div>
  );
}

export default ProviderModelSelector;
