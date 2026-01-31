/**
 * Database module exports
 */

export { initDatabase, getDatabase, closeDatabase, isDatabaseInitialized } from './adapter';
export type { Database } from './adapter';
export { initializeSchema, resetDatabase } from './schema';
