/**
 * Encryption utilities for credential storage
 * Note: Browser-based encryption has limitations. For production,
 * consider using Web Crypto API with user-derived keys or
 * delegating to Electron's safeStorage when available.
 */

// Simple obfuscation for browser storage (not cryptographically secure)
// In production with Electron, this would use safeStorage

const STORAGE_PREFIX = 'thresho_cred_';

/**
 * Encode a string using base64 with a simple transformation
 * This is NOT secure encryption - just obfuscation for casual inspection
 */
export function encodeCredential(value: string): string {
  // In a real app, use Web Crypto API with a user-derived key
  const encoded = btoa(
    value
      .split('')
      .map((c) => String.fromCharCode(c.charCodeAt(0) + 3))
      .join('')
  );
  return encoded;
}

/**
 * Decode a credential encoded with encodeCredential
 */
export function decodeCredential(encoded: string): string {
  const decoded = atob(encoded);
  return decoded
    .split('')
    .map((c) => String.fromCharCode(c.charCodeAt(0) - 3))
    .join('');
}

/**
 * Store a credential in localStorage with obfuscation
 */
export function storeCredential(key: string, value: string): void {
  const encoded = encodeCredential(value);
  localStorage.setItem(STORAGE_PREFIX + key, encoded);
}

/**
 * Retrieve a credential from localStorage
 */
export function retrieveCredential(key: string): string | null {
  const encoded = localStorage.getItem(STORAGE_PREFIX + key);
  if (!encoded) return null;

  try {
    return decodeCredential(encoded);
  } catch {
    console.error('Failed to decode credential');
    return null;
  }
}

/**
 * Delete a credential from localStorage
 */
export function deleteCredential(key: string): void {
  localStorage.removeItem(STORAGE_PREFIX + key);
}

/**
 * Check if running in Electron (for future safeStorage integration)
 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && 'electron' in window;
}

/**
 * Generate a content hash for prompt versioning
 */
export async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Mask an API key for display (show first 4 and last 4 characters)
 */
export function maskApiKey(key: string): string {
  if (key.length <= 12) {
    return '*'.repeat(key.length);
  }
  const first = key.slice(0, 4);
  const last = key.slice(-4);
  const middle = '*'.repeat(Math.min(key.length - 8, 20));
  return `${first}${middle}${last}`;
}
