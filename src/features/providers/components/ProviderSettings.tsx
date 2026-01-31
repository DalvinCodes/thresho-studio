/**
 * Provider Settings Component
 * UI for managing provider API keys and configurations
 */

import { useState } from 'react';
import type { ProviderType, ContentType } from '../../../core/types/common';
import type { ProviderState } from '../../../core/types/provider';
import {
  useProviders,
  useProviderStore,
  useIsValidating,
  useDefaultProvider,
} from '../store';
import { providerMeta } from '../adapters';

export function ProviderSettings() {
  const providers: ProviderState[] = useProviders();
  const isValidating = useIsValidating();
  const registerProvider = useProviderStore((s) => s.registerProvider);
  const [showAddProvider, setShowAddProvider] = useState(false);

  // Group providers by content type
  const textProviders = providers.filter((p) =>
    p.config.capabilities.some((c) => c.type === 'text')
  );
  const imageProviders = providers.filter((p) =>
    p.config.capabilities.some((c) => c.type === 'image')
  );
  const videoProviders = providers.filter((p) =>
    p.config.capabilities.some((c) => c.type === 'video')
  );

  // Get unregistered providers
  const registeredTypes = new Set(providers.map((p) => p.config.type));
  const availableProviders = providerMeta.filter((m) => !registeredTypes.has(m.type));

  const handleAddProvider = async (type: ProviderType) => {
    await registerProvider(type);
    setShowAddProvider(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">AI Providers</h2>
          <p className="text-sm text-text-secondary mt-1">
            Configure your AI provider API keys and preferences
          </p>
        </div>
        <button
          onClick={() => setShowAddProvider(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Add Provider
        </button>
      </div>

      {/* Text Providers */}
      <ProviderSection
        title="Text Generation"
        icon="💬"
        providers={textProviders}
        type="text"
        isValidating={isValidating}
      />

      {/* Image Providers */}
      <ProviderSection
        title="Image Generation"
        icon="🎨"
        providers={imageProviders}
        type="image"
        isValidating={isValidating}
      />

      {/* Video Providers */}
      <ProviderSection
        title="Video Generation"
        icon="🎬"
        providers={videoProviders}
        type="video"
        isValidating={isValidating}
      />

      {/* Add Provider Modal */}
      {showAddProvider && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Add Provider
            </h3>

            {availableProviders.length === 0 ? (
              <p className="text-text-secondary">All providers are already configured.</p>
            ) : (
              <div className="space-y-2">
                {availableProviders.map((meta) => (
                  <button
                    key={meta.type}
                    onClick={() => handleAddProvider(meta.type)}
                    className="w-full p-4 bg-background rounded-lg hover:bg-surface-hover transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{meta.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium text-text-primary">
                          {meta.displayName}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {meta.description}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {meta.contentTypes.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    {!meta.requiresApiKey && (
                      <p className="text-xs text-green-500 mt-2">
                        ✓ No API key required
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowAddProvider(false)}
              className="mt-4 w-full py-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ProviderSectionProps {
  title: string;
  icon: string;
  providers: ProviderState[];
  type: ContentType;
  isValidating: string | null;
}

function ProviderSection({
  title,
  icon,
  providers,
  type,
  isValidating,
}: ProviderSectionProps) {
  const defaultProviderId = useDefaultProvider(type);
  const setDefaultProvider = useProviderStore((s) => s.setDefaultProvider);

  if (providers.length === 0) {
    return (
      <div className="bg-surface rounded-lg p-6 border border-border">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">{icon}</span>
          <h3 className="font-medium text-text-primary">{title}</h3>
        </div>
        <p className="text-sm text-text-secondary">
          No providers configured for {title.toLowerCase()}.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-lg p-6 border border-border">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{icon}</span>
        <h3 className="font-medium text-text-primary">{title}</h3>
      </div>

      <div className="space-y-3">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.config.id}
            provider={provider}
            isDefault={defaultProviderId === provider.config.id}
            isValidating={isValidating === provider.config.id}
            onSetDefault={() => setDefaultProvider(type, provider.config.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface ProviderCardProps {
  provider: ProviderState;
  isDefault: boolean;
  isValidating: boolean;
  onSetDefault: () => void;
}

function ProviderCard({
  provider,
  isDefault,
  isValidating,
  onSetDefault,
}: ProviderCardProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const setCredential = useProviderStore((s) => s.setCredential);
  const clearCredential = useProviderStore((s) => s.clearCredential);
  const removeProvider = useProviderStore((s) => s.removeProvider);

  const meta = providerMeta.find((m) => m.type === provider.config.type);
  const hasCredential = !!provider.credential?.apiKey;

  const handleSaveKey = async () => {
    if (apiKey.trim()) {
      await setCredential(provider.config.id, apiKey.trim());
      setApiKey('');
      setIsEditing(false);
    }
  };

  const statusColors = {
    active: 'bg-green-500',
    inactive: 'bg-gray-500',
    error: 'bg-red-500',
    'rate-limited': 'bg-yellow-500',
    validating: 'bg-blue-500',
  };

  const statusLabels = {
    active: 'Connected',
    inactive: 'Not configured',
    error: 'Error',
    'rate-limited': 'Rate limited',
    validating: 'Validating...',
  };

  return (
    <div className="p-4 bg-background rounded-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{meta?.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-text-primary">
                {provider.config.displayName}
              </p>
              {isDefault && (
                <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded">
                  Default
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`w-2 h-2 rounded-full ${statusColors[provider.status]}`}
              />
              <span className="text-sm text-text-secondary">
                {isValidating ? 'Validating...' : statusLabels[provider.status]}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {provider.status === 'active' && !isDefault && (
            <button
              onClick={onSetDefault}
              className="px-3 py-1 text-sm text-primary hover:bg-primary/10 rounded transition-colors"
            >
              Set Default
            </button>
          )}
          <button
            onClick={() => removeProvider(provider.config.id)}
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

      {/* API Key Section */}
      {meta?.requiresApiKey && (
        <div className="mt-4">
          {isEditing || !hasCredential ? (
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API key..."
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                >
                  {showKey ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <button
                onClick={handleSaveKey}
                disabled={!apiKey.trim() || isValidating}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isValidating ? 'Validating...' : 'Save'}
              </button>
              {hasCredential && (
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                API Key: ••••••••{provider.credential?.apiKey?.slice(-4)}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Change
                </button>
                <button
                  onClick={() => clearCredential(provider.config.id)}
                  className="text-sm text-red-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {provider.lastError && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{provider.lastError.message}</p>
        </div>
      )}

      {/* Docs Link */}
      {meta?.docsUrl && (
        <a
          href={meta.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-3 text-sm text-primary hover:underline"
        >
          View Documentation →
        </a>
      )}
    </div>
  );
}

export default ProviderSettings;
