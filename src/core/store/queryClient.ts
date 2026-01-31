/**
 * TanStack Query client configuration
 * Handles caching, invalidation, and async state for API calls
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Default query client with optimized settings for Thresho Studio
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: 30 seconds - data is considered fresh
      staleTime: 30 * 1000,

      // Cache time: 5 minutes - keep unused data in cache
      gcTime: 5 * 60 * 1000,

      // Retry configuration
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof Error && 'status' in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500) return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },

      // Refetch settings
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      refetchOnReconnect: true, // Refetch when network reconnects
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});

/**
 * Query keys factory for consistent key management
 */
export const queryKeys = {
  // Providers
  providers: {
    all: ['providers'] as const,
    list: () => [...queryKeys.providers.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.providers.all, 'detail', id] as const,
    credentials: (id: string) => [...queryKeys.providers.all, 'credentials', id] as const,
  },

  // Templates
  templates: {
    all: ['templates'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.templates.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.templates.all, 'detail', id] as const,
    versions: (id: string) => [...queryKeys.templates.all, 'versions', id] as const,
    labels: (id: string) => [...queryKeys.templates.all, 'labels', id] as const,
  },

  // Brands
  brands: {
    all: ['brands'] as const,
    list: () => [...queryKeys.brands.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.brands.all, 'detail', id] as const,
    default: () => [...queryKeys.brands.all, 'default'] as const,
  },

  // Assets
  assets: {
    all: ['assets'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.assets.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.assets.all, 'detail', id] as const,
    infinite: (filters?: Record<string, unknown>) =>
      [...queryKeys.assets.all, 'infinite', filters] as const,
  },

  // Generation
  generations: {
    all: ['generations'] as const,
    history: (filters?: Record<string, unknown>) =>
      [...queryKeys.generations.all, 'history', filters] as const,
    detail: (id: string) => [...queryKeys.generations.all, 'detail', id] as const,
    active: () => [...queryKeys.generations.all, 'active'] as const,
    stats: () => [...queryKeys.generations.all, 'stats'] as const,
  },

  // Projects
  projects: {
    all: ['projects'] as const,
    list: () => [...queryKeys.projects.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.projects.all, 'detail', id] as const,
    stats: (id: string) => [...queryKeys.projects.all, 'stats', id] as const,
  },
} as const;

/**
 * Invalidate all queries for a given entity
 */
export async function invalidateEntity(entity: keyof typeof queryKeys): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: queryKeys[entity].all });
}

/**
 * Clear all cached data
 */
export function clearQueryCache(): void {
  queryClient.clear();
}
