# AGENTS.md - Thresho Studio

This guide helps AI coding agents work effectively in this React/TypeScript codebase.

## Project Overview

Thresho Studio is an AI-powered creative platform built with React 19 + Vite 7 + TypeScript. It features a feature-based architecture with SQLite WASM for client-side persistence.

## Build Commands

```bash
# Development
npm run dev              # Start Vite dev server (port 5173)

# Build
npm run build            # Type check + production build (outputs to dist/)
npm run preview          # Preview production build locally

# Linting
npm run lint             # Run ESLint on all source files
```

## Code Style Guidelines

### TypeScript Configuration
- Target: ES2022
- Module: ESNext with bundler resolution
- JSX: react-jsx transform
- **Strict mode is disabled** for rapid development (`"strict": false`)
- Branded types for type safety: `export type UUID = string & { readonly __brand: 'UUID' }`

### File Organization (Feature-Based)
```
src/
  core/           # Shared core (types/, store/, db/, utils/)
  features/       # Feature modules (brands/, providers/, generation/, etc.)
  components/     # Shared UI components
  pages/          # Page components
  hooks/          # Custom React hooks
  shared/         # Shared utilities/components
```

### Naming Conventions
- **Files**: PascalCase for components (`BrandEditor.tsx`), camelCase for utilities
- **Types**: PascalCase with descriptive names (`ProviderConfig`, `ContentType`)
- **Interfaces**: PascalCase, no `I` prefix
- **Functions**: camelCase, verb-based names
- **Constants**: SCREAMING_SNAKE_CASE for true constants

### Import Order
1. React imports
2. Third-party libraries
3. Absolute imports from project (`@/` or relative `../`)
4. Type imports use `import type` syntax

Example:
```typescript
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { UUID } from '../../../core/types/common';
import { useBrandStore } from '../store';
```

### State Management Patterns
- **Zustand** for global state with Immer middleware
- **Jotai** for atomic state
- **TanStack Query** for server state
- Use selectors for performance: `useBrandStore(state => state.brands)`

### Component Patterns
- Functional components with explicit props interfaces
- Props interface named `{ComponentName}Props`
- Default exports only for page components
- Named exports for reusable components

### CSS/Tailwind
- Custom CSS variables in `@theme` block in `index.css`
- Semantic naming: `--color-background`, `--color-surface`, `--color-text-primary`
- Utility-first approach with Tailwind classes
- Custom Thresho brand colors defined in theme

### Error Handling
- Use ErrorBoundary component for React error boundaries
- Zustand stores handle validation via dedicated actions
- Return error states from async actions, don't throw

### Comments & Documentation
- JSDoc headers for files: `/** Feature description */`
- JSDoc for complex functions with parameters/returns
- Inline comments for complex logic only

## Key Technical Details

### SQLite WASM
- Requires COOP/COEP headers (configured in Vite)
- OPFS (Origin Private File System) for persistent storage
- See `src/core/db/` for database layer

### Provider Adapters
- Abstract `BaseAdapter` class in `src/features/providers/adapters/`
- Implementations for OpenAI, Anthropic, Gemini, Kimi, etc.

### UUID Generation
```typescript
import { generateUUID } from '../../core/utils/ids';
const id: UUID = generateUUID(); // Uses crypto.randomUUID()
```

## Testing

No test framework currently configured. Add tests using:
- Vitest (recommended with Vite)
- React Testing Library for component tests

## Linting Rules

ESLint 9.x with:
- `@eslint/js` recommended
- `typescript-eslint` recommended
- `react-hooks` recommended (rules of hooks)
- `react-refresh` (Vite-specific)

## Environment Requirements

- Node.js 18+
- Modern browser with OPFS support
- COOP/COEP headers for SQLite WASM

## Never Modify

- `src/core/db/migrations/` - Database schema migrations
- `dist/` - Build output
- Lock files (`package-lock.json`)
