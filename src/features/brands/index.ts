/**
 * Brands Feature Exports
 */

// Store
export {
  useBrandStore,
  useBrands,
  useBrand,
  useSelectedBrand,
  useDefaultBrand,
  useBrandEditor,
  useFlattenedTokens,
} from './store';

// Components
export { BrandLibrary } from './components/BrandLibrary';
export { BrandEditor } from './components/BrandEditor';

// Core Utilities (re-export)
export {
  flattenBrandTokens,
  findTokenPlaceholders,
  injectBrandTokens,
  validateTokens,
  highlightTokens,
  getAvailableTokenNames,
} from '../../core/utils/tokenInjection';

// Types (re-export from core)
export type {
  BrandProfile,
  BrandToken,
  BrandTokenSchema,
  ColorTokens,
  TypographyTokens,
  VisualStyleTokens,
  VoiceTokens,
  AssetTokens,
  TokenCategory,
  TokenInjectionResult,
  FlattenedBrandTokens,
  BrandValidationResult,
} from '../../core/types/brand';
