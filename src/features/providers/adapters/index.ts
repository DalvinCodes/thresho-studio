/**
 * Provider Adapters Index
 * Export all adapter classes and factory functions
 */

// Base class
export { BaseAdapter } from './baseAdapter';
export type { AdapterConstructor } from './baseAdapter';

// Text providers
export { OpenAIAdapter } from './openaiAdapter';
export { AnthropicAdapter } from './anthropicAdapter';
export { GeminiAdapter } from './geminiAdapter';
export { GeminiNanoAdapter } from './geminiNanoAdapter';
export { KimiAdapter } from './kimiAdapter';

// Image providers
export { FluxProAdapter } from './fluxProAdapter';
export { ImagenAdapter } from './imagenAdapter';

// Video providers
export { RunwayAdapter } from './runwayAdapter';
export { VeoAdapter } from './veoAdapter';

// Unified providers
export { OpenRouterAdapter } from './openRouterAdapter';
export type { OpenRouterAPIModel } from './openRouterAdapter';

import type { ProviderType } from '../../../core/types/common';
import type { ProviderConfig, ProviderCredential } from '../../../core/types/provider';
import { BaseAdapter } from './baseAdapter';
import { OpenAIAdapter } from './openaiAdapter';
import { AnthropicAdapter } from './anthropicAdapter';
import { GeminiAdapter } from './geminiAdapter';
import { GeminiNanoAdapter } from './geminiNanoAdapter';
import { KimiAdapter } from './kimiAdapter';
import { FluxProAdapter } from './fluxProAdapter';
import { ImagenAdapter } from './imagenAdapter';
import { RunwayAdapter } from './runwayAdapter';
import { VeoAdapter } from './veoAdapter';
import { OpenRouterAdapter } from './openRouterAdapter';

/**
 * Adapter registry mapping provider types to adapter classes
 */
const adapterRegistry: Record<ProviderType, new (config: ProviderConfig, credential?: ProviderCredential) => BaseAdapter> = {
  openai: OpenAIAdapter,
  anthropic: AnthropicAdapter,
  gemini: GeminiAdapter,
  'gemini-nano': GeminiNanoAdapter,
  kimi: KimiAdapter,
  'flux-pro': FluxProAdapter,
  imagen: ImagenAdapter,
  runway: RunwayAdapter,
  veo: VeoAdapter,
  kling: OpenAIAdapter, // Placeholder - Kling uses similar API pattern
  openrouter: OpenRouterAdapter,
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
    type: 'openai',
    name: 'openai',
    displayName: 'OpenAI',
    description: 'GPT-4o for text, DALL-E 3 for images',
    icon: '',
    requiresApiKey: true,
    docsUrl: 'https://platform.openai.com/docs',
    contentTypes: ['text', 'image'],
  },
  {
    type: 'anthropic',
    name: 'anthropic',
    displayName: 'Anthropic',
    description: 'Claude 4 models for advanced reasoning',
    icon: '',
    requiresApiKey: true,
    docsUrl: 'https://docs.anthropic.com',
    contentTypes: ['text'],
  },
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
    type: 'kimi',
    name: 'kimi',
    displayName: 'Kimi K2',
    description: '256K context, excellent for long documents and reasoning',
    icon: '',
    requiresApiKey: true,
    docsUrl: 'https://platform.moonshot.cn/docs',
    contentTypes: ['text'],
  },
  {
    type: 'flux-pro',
    name: 'flux-pro',
    displayName: 'Flux Pro',
    description: 'High-quality images with great text rendering',
    icon: '',
    requiresApiKey: true,
    docsUrl: 'https://docs.bfl.ml',
    contentTypes: ['image'],
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
    type: 'runway',
    name: 'runway',
    displayName: 'Runway Gen-4',
    description: 'Professional video with motion control',
    icon: '',
    requiresApiKey: true,
    docsUrl: 'https://docs.runwayml.com',
    contentTypes: ['video'],
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
  {
    type: 'openrouter',
    name: 'openrouter',
    displayName: 'OpenRouter',
    description: 'Access 100+ AI models with one API key - OpenAI, Anthropic, Google, and more',
    icon: '',
    requiresApiKey: true,
    docsUrl: 'https://openrouter.ai/docs',
    contentTypes: ['text', 'image'],
  },
];
