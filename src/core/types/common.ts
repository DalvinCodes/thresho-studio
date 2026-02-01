/**
 * Common types used throughout Thresho Studio
 */

// Branded types for type safety
export type UUID = string & { readonly __brand: 'UUID' };
export type Timestamp = number; // Unix milliseconds

// Provider and content types
export type ProviderType =
  | 'openai'      // GPT-4, DALL-E 3
  | 'anthropic'   // Claude
  | 'gemini'      // Google Gemini Pro/Ultra
  | 'gemini-nano' // Chrome built-in AI
  | 'kimi'        // Kimi K2.5 (Moonshot AI) - 256K context
  | 'flux-pro'    // Black Forest Labs
  | 'imagen'      // Google Imagen 3
  | 'runway'      // Runway Gen-4
  | 'veo'         // Google Veo 3
  | 'kling'       // Kling AI
  | 'openrouter'; // OpenRouter - unified API for multiple providers
export type ContentType = 'text' | 'image' | 'video';
export type AssetFormat = 'jpg' | 'jpeg' | 'png' | 'gif' | 'webp' | 'svg' | 'mp4' | 'webm' | 'mov' | 'txt' | 'md';

// Base entity interface for all database records
export interface BaseEntity {
  id: UUID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Pagination
export interface PaginationParams {
  offset: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

// Sorting
export type SortDirection = 'asc' | 'desc';

export interface SortParams {
  field: string;
  direction: SortDirection;
}

// Generic result types
export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// UUID generation utility
export function createUUID(): UUID {
  return crypto.randomUUID() as UUID;
}

// Timestamp utility
export function createTimestamp(): Timestamp {
  return Date.now();
}

// Type guard for UUID
export function isUUID(value: unknown): value is UUID {
  if (typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}
