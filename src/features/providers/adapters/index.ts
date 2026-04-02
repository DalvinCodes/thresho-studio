/**
 * Provider Adapters Index
 * Export all adapter classes and factory functions
 */

// Base class
export { BaseAdapter } from './baseAdapter';
export type { AdapterConstructor } from './baseAdapter';

// Text providers
export { GeminiAdapter } from './geminiAdapter';
export { GeminiNanoAdapter } from './geminiNanoAdapter';

// Image providers
export { ImagenAdapter } from './imagenAdapter';

// Video providers
export { VeoAdapter } from './veoAdapter';

import type { ProviderType } from '../../../core/types/common';
import type { ProviderConfig, ProviderCredential } from '../../../core/types/provider';
import { BaseAdapter } from './baseAdapter';
import { GeminiAdapter } from './geminiAdapter';
import { GeminiNanoAdapter } from './geminiNanoAdapter';
import { ImagenAdapter } from './imagenAdapter';
import { VeoAdapter } from './veoAdapter';

/**
 * Adapter registry mapping provider types to adapter classes
 */
const adapterRegistry: Record<ProviderType, new (config: ProviderConfig, credential?: ProviderCredential) => BaseAdapter> = {
  gemini: GeminiAdapter,
  'gemini-nano': GeminiNanoAdapter,
  imagen: ImagenAdapter,
  veo: VeoAdapter,
};

/**
 * Create an adapter instance for a given provider type
 */
export function createAdapter(
  config: ProviderConfig,
  credential?: ProviderCredential
): BaseAdapter {
  const AdapterClass = adapterRegistry[config.type];

  if (!AdapterClass) {
    throw new Error(`No adapter found for provider type: ${config.type}`);
  }

  return new AdapterClass(config, credential);
}

/**
 * Get the adapter class for a provider type
 */
export function getAdapterClass(type: ProviderType): typeof BaseAdapter | undefined {
  return adapterRegistry[type] as typeof BaseAdapter | undefined;
}

/**
 * Check if an adapter exists for a provider type
 */
export function hasAdapter(type: ProviderType): boolean {
  return type in adapterRegistry;
}

/**
 * Get all supported provider types
 */
export function getSupportedProviderTypes(): ProviderType[] {
  return Object.keys(adapterRegistry) as ProviderType[];
}

/**
 * Provider metadata for UI display
 */
export interface ProviderMeta {
  type: ProviderType;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  requiresApiKey: boolean;
  docsUrl: string;
  contentTypes: ('text' | 'image' | 'video')[];
}

export const providerMeta: ProviderMeta[] = [
  {
    type: 'gemini',
    name: 'gemini',
    displayName: 'Google Gemini',
    description: 'Gemini 3/2.5 Pro & Flash for text, reasoning, and image generation',
    icon: '',
    requiresApiKey: true,
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    contentTypes: ['text', 'image'],
  },
  {
    type: 'gemini-nano',
    name: 'gemini-nano',
    displayName: 'Gemini Nano',
    description: 'Chrome built-in AI - runs locally, free',
    icon: '',
    requiresApiKey: false,
    docsUrl: 'https://developer.chrome.com/docs/ai/built-in',
    contentTypes: ['text'],
  },
  {
    type: 'imagen',
    name: 'imagen',
    displayName: 'Google Imagen',
    description: 'Imagen 4 - highest quality photorealistic image generation',
    icon: '',
    requiresApiKey: true,
    docsUrl: 'https://cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images',
    contentTypes: ['image'],
  },
  {
    type: 'veo',
    name: 'veo',
    displayName: 'Google Veo',
    description: 'Veo 3 - video generation with native audio and sound',
    icon: '',
    requiresApiKey: true,
    docsUrl: 'https://cloud.google.com/vertex-ai/generative-ai/docs/video/overview',
    contentTypes: ['video'],
  },
];
