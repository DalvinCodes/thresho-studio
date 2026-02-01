/**
 * SQLite database adapter using @sqlite.org/sqlite-wasm
 * Uses in-memory SQLite with IndexedDB persistence (export/import database blob)
 * This approach works in the main thread without needing OPFS/Workers
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

// IndexedDB storage for database persistence
const IDB_NAME = 'thresho-studio-db';
const IDB_STORE = 'sqlite-data';
const IDB_KEY = 'database';

// Debounce timer for saving
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 1000; // Save 1 second after last write

/**
 * Open IndexedDB connection
 */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
  });
}

/**
 * Load database blob from IndexedDB
 */
async function loadDatabaseFromIDB(): Promise<ArrayBuffer | null> {
  try {
    const idb = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const request = store.get(IDB_KEY);
      
      request.onerror = () => {
        idb.close();
        reject(request.error);
      };
      request.onsuccess = () => {
        idb.close();
        resolve(request.result || null);
      };
    });
  } catch (error) {
    console.warn('Failed to load database from IndexedDB:', error);
    return null;
  }
}

/**
 * Save database blob to IndexedDB
 */
async function saveDatabaseToIDB(data: ArrayBuffer): Promise<void> {
  try {
    const idb = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const request = store.put(data, IDB_KEY);
      
      request.onerror = () => {
        idb.close();
        reject(request.error);
      };
      request.onsuccess = () => {
        idb.close();
        resolve();
      };
    });
  } catch (error) {
    console.error('Failed to save database to IndexedDB:', error);
  }
}

// Store reference to sqlite3 and sqliteDb for export operations
let sqlite3Instance: any = null;
let sqliteDbInstance: any = null;

/**
 * Schedule a debounced save of the database
 */
function scheduleSave(): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  saveTimeout = setTimeout(async () => {
    if (sqlite3Instance && sqliteDbInstance) {
      try {
        const data = sqlite3Instance.capi.sqlite3_js_db_export(sqliteDbInstance.pointer);
        await saveDatabaseToIDB(data.buffer);
        console.log('Database saved to IndexedDB');
      } catch (error) {
        console.error('Failed to export database:', error);
      }
    }
  }, SAVE_DEBOUNCE_MS);
}

/**
 * Initialize the SQLite database with IndexedDB persistence
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

      // Store sqlite3 reference for later export
      sqlite3Instance = sqlite3;

      // Try to load existing database from IndexedDB
      const existingData = await loadDatabaseFromIDB();
      
      let sqliteDb: any;
      
      if (existingData) {
        // Deserialize existing database
        console.log('Loading existing database from IndexedDB...');
        const p = sqlite3.wasm.allocFromTypedArray(new Uint8Array(existingData));
        sqliteDb = new sqlite3.oo1.DB();
        const rc = sqlite3.capi.sqlite3_deserialize(
          sqliteDb.pointer,
          'main',
          p,
          existingData.byteLength,
          existingData.byteLength,
          sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE | sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE
        );
        if (rc !== 0) {
          console.warn('Failed to deserialize database, creating new one');
          sqliteDb.close();
          sqliteDb = new sqlite3.oo1.DB(':memory:');
        } else {
          console.log('Database loaded from IndexedDB');
        }
      } else {
        // Create new in-memory database
        console.log('Creating new in-memory database');
        sqliteDb = new sqlite3.oo1.DB(':memory:');
      }

      // Store reference for export
      sqliteDbInstance = sqliteDb;

      // Create our wrapper with auto-save on writes
      db = createDatabaseWrapper(sqliteDb as SQLiteDB, true);

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
  pointer?: number;
}

/**
 * Create a wrapper around the SQLite database with async interface
 */
function createDatabaseWrapper(sqliteDb: SQLiteDB, enableAutoSave = false): Database {
  return {
    async exec(sql: string, params?: unknown[]): Promise<void> {
      try {
        if (params && params.length > 0) {
          sqliteDb.exec(sql, { bind: params });
        } else {
          sqliteDb.exec(sql);
        }
        // Schedule save after write operations
        if (enableAutoSave && !sql.trim().toUpperCase().startsWith('SELECT')) {
          scheduleSave();
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
      // Save before closing
      if (sqlite3Instance && sqliteDbInstance) {
        try {
          const data = sqlite3Instance.capi.sqlite3_js_db_export(sqliteDbInstance.pointer);
          await saveDatabaseToIDB(data.buffer);
          console.log('Database saved before closing');
        } catch (error) {
          console.error('Failed to save database before closing:', error);
        }
      }
      sqliteDb.close();
      db = null;
      sqlite3Instance = null;
      sqliteDbInstance = null;
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

/**
 * Force save the database to IndexedDB (useful before page unload)
 */
export async function forceSaveDatabase(): Promise<void> {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  
  if (sqlite3Instance && sqliteDbInstance) {
    try {
      const data = sqlite3Instance.capi.sqlite3_js_db_export(sqliteDbInstance.pointer);
      await saveDatabaseToIDB(data.buffer);
      console.log('Database force-saved to IndexedDB');
    } catch (error) {
      console.error('Failed to force-save database:', error);
    }
  }
}
