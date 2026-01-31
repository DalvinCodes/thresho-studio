/**
 * Utilities barrel export
 */

export {
  encodeCredential,
  decodeCredential,
  storeCredential,
  retrieveCredential,
  deleteCredential,
  isElectron,
  generateContentHash,
  maskApiKey,
} from './encryption';

export {
  flattenBrandTokens,
  findTokenPlaceholders,
  injectBrandTokens,
  validateTokens,
  highlightTokens,
  getAvailableTokenNames,
} from './tokenInjection';
