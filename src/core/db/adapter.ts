/**
 * SQLite database adapter using @sqlite.org/sqlite-wasm with OPFS
 * Provides persistent storage in the browser
 */

import type { UUID } from '../types/common';

// Database instance type (simplified for our use case)
export interface Database {
  exec(sql: string, params?: unknown[]): Promise<void>;
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  querySingle<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
  close(): Promise<void>;
}

// Database connection state
let db: Database | null = null;
let isInitializing = false;
let initPromise: Promise<Database> | null = null;

/**
 * Initialize the SQLite database with OPFS persistence
 * Uses a worker for better performance
 */
export async function initDatabase(): Promise<Database> {
  // Return existing connection
  if (db) return db;

  // Return pending initialization
  if (initPromise) return initPromise;

  isInitializing = true;

  initPromise = (async () => {
    try {
      // Dynamic import to avoid SSR issues
      const sqlite3InitModule = (await import('@sqlite.org/sqlite-wasm')).default;

      // @ts-expect-error - sqlite-wasm types don't include the options parameter
      const sqlite3 = await sqlite3InitModule({
        print: console.log,
        printErr: console.error,
      });

      console.log('SQLite WASM initialized, version:', sqlite3.version.libVersion);

      // Check for OPFS support
      const hasOPFS = 'opfs' in sqlite3;

      let sqliteDb: unknown;

      if (hasOPFS) {
        // Use OPFS for persistent storage
        console.log('Using OPFS for persistent storage');
        sqliteDb = new sqlite3.oo1.OpfsDb('/thresho-studio.db');
      } else {
        // Fallback to in-memory (data won't persist across sessions)
        console.warn('OPFS not available, using in-memory database');
        sqliteDb = new sqlite3.oo1.DB(':memory:');
      }

      // Create our wrapper
      db = createDatabaseWrapper(sqliteDb as SQLiteDB);

      console.log('Database initialized successfully');
      return db;
    } catch (error) {
      console.error('Failed to initialize SQLite:', error);
      // Create fallback in-memory database using simple storage
      db = createFallbackDatabase();
      return db;
    } finally {
      isInitializing = false;
    }
  })();

  return initPromise;
}

// SQLite DB interface (internal)
interface SQLiteDB {
  exec(sql: string, options?: { bind?: unknown[] }): void;
  selectObjects<T>(sql: string, params?: unknown[]): T[];
  close(): void;
}

/**
 * Create a wrapper around the SQLite database with async interface
 */
function createDatabaseWrapper(sqliteDb: SQLiteDB): Database {
  return {
    async exec(sql: string, params?: unknown[]): Promise<void> {
      try {
        if (params && params.length > 0) {
          sqliteDb.exec(sql, { bind: params });
        } else {
          sqliteDb.exec(sql);
        }
      } catch (error) {
        console.error('SQL exec error:', sql, error);
        throw error;
      }
    },

    async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
      try {
        const results = (sqliteDb.selectObjects as Function)(sql, params) as T[];
        return results;
      } catch (error) {
        console.error('SQL query error:', sql, error);
        throw error;
      }
    },

    async querySingle<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null> {
      const results = await this.query(sql, params) as T[];
      return results[0] ?? null;
    },

    async close(): Promise<void> {
      sqliteDb.close();
      db = null;
    },
  };
}

/**
 * Fallback in-memory database using localStorage
 * Used when SQLite WASM fails to load
 */
function createFallbackDatabase(): Database {
  console.warn('Using fallback localStorage-based database');

  // Simple key-value store simulating tables
  const tables = new Map<string, Map<UUID, Record<string, unknown>>>();

  const getStorageKey = (table: string) => `thresho_${table}`;

  const loadTable = (table: string): Map<UUID, Record<string, unknown>> => {
    if (tables.has(table)) return tables.get(table)!;

    const stored = localStorage.getItem(getStorageKey(table));
    const data = stored ? new Map(JSON.parse(stored)) : new Map();
    tables.set(table, data);
    return data;
  };

  const saveTable = (table: string) => {
    const data = tables.get(table);
    if (data) {
      localStorage.setItem(getStorageKey(table), JSON.stringify([...data]));
    }
  };

  return {
    async exec(sql: string, _params?: unknown[]): Promise<void> {
      // Parse CREATE TABLE statements to initialize tables
      const createMatch = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
      if (createMatch) {
        const tableName = createMatch[1];
        loadTable(tableName);
      }
      // Note: This is a simplified fallback, real SQL parsing would be more complex
    },

    async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
      // Very simplified query parsing for SELECT
      const selectMatch = sql.match(/SELECT .+ FROM (\w+)/i);
      if (selectMatch) {
        const tableName = selectMatch[1];
        const table = loadTable(tableName);

        // If there's a WHERE id = ? clause
        if (sql.includes('WHERE id = ?') && params?.[0]) {
          const item = table.get(params[0] as UUID);
          return item ? [item as T] : [];
        }

        return [...table.values()] as T[];
      }
      return [];
    },

    async querySingle<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null> {
      const results = await this.query(sql, params) as T[];
      return results[0] ?? null;
    },

    async close(): Promise<void> {
      // Save all tables
      for (const [tableName] of tables) {
        saveTable(tableName);
      }
      tables.clear();
    },
  };
}

/**
 * Get the current database instance
 */
export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Check if database is initialized
 */
export function isDatabaseInitialized(): boolean {
  return db !== null;
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    initPromise = null;
  }
}
