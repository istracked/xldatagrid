/**
 * IndexedDB persistence adapter for per-column search indexes.
 *
 * Stores serialized column index payloads keyed by a composite `${gridId}::${field}`
 * in a single object store. Provides granular clear operations (per-row, per-grid,
 * and global) and degrades gracefully to a no-op implementation when running in a
 * non-browser environment (SSR) where `indexedDB` is unavailable.
 *
 * @module search-index/idb-adapter
 */

import { openDB, IDBPDatabase } from 'idb';

/** Default IndexedDB database name. */
const DEFAULT_DB_NAME = 'xldatagrid-search-index';

/** Single object store holding every serialized column index row. */
const STORE = 'column-index';

/** Secondary index on `gridId` used to bulk-clear a grid's rows. */
const BY_GRID = 'by-grid';

/**
 * A persisted column-index row.
 *
 * @typeParam TPayload - The serialized column-index payload type.
 *                       Must expose a `hash` field for change detection.
 */
export interface IdbEntry<TPayload extends { hash: string }> {
  /** Composite primary key: `${gridId}::${field}`. */
  key: string;
  gridId: string;
  field: string;
  hash: string;
  payload: TPayload;
  /** Timestamp (ms since epoch) captured at write time. */
  savedAt: number;
}

/**
 * Persistence contract for column-index payloads.
 *
 * All methods are asynchronous. Implementations must tolerate missing rows
 * (e.g. `get` returns `null`) rather than throwing.
 */
export interface IdbAdapter<TPayload extends { hash: string }> {
  get(gridId: string, field: string): Promise<IdbEntry<TPayload> | null>;
  put(gridId: string, field: string, payload: TPayload): Promise<void>;
  clear(gridId: string, field: string): Promise<void>;
  clearGrid(gridId: string): Promise<void>;
  clearAll(): Promise<void>;
  close(): Promise<void>;
}

/** Build the composite primary key used by the `column-index` store. */
function makeKey(gridId: string, field: string): string {
  return `${gridId}::${field}`;
}

/**
 * Creates a no-op adapter for environments without IndexedDB (e.g. SSR).
 *
 * `get` resolves `null`, all mutating methods resolve void without side effects.
 * Exported so it can be covered by unit tests without monkey-patching the real
 * adapter.
 */
export function createNoopIdbAdapter<TPayload extends { hash: string }>(): IdbAdapter<TPayload> {
  return {
    async get() { return null; },
    async put() { /* no-op */ },
    async clear() { /* no-op */ },
    async clearGrid() { /* no-op */ },
    async clearAll() { /* no-op */ },
    async close() { /* no-op */ },
  };
}

/**
 * Opens (or creates) the IndexedDB database backing column-index persistence.
 *
 * When `indexedDB` is not available (SSR), returns a no-op adapter so callers
 * can invoke the API unconditionally.
 *
 * @param dbName - Override the database name (useful for test isolation).
 * @returns An adapter bound to a live `IDBPDatabase`, or a no-op stand-in.
 */
export async function openIdbAdapter<TPayload extends { hash: string }>(
  dbName: string = DEFAULT_DB_NAME,
): Promise<IdbAdapter<TPayload>> {
  // SSR / non-browser fallback: return an inert adapter so callers can stay
  // environment-agnostic.
  if (typeof indexedDB === 'undefined') {
    return createNoopIdbAdapter<TPayload>();
  }

  const db: IDBPDatabase = await openDB(dbName, 1, {
    upgrade(database) {
      // Single store keyed by the composite `${gridId}::${field}` key, plus a
      // secondary index for grid-scoped bulk deletes.
      if (!database.objectStoreNames.contains(STORE)) {
        const store = database.createObjectStore(STORE, { keyPath: 'key' });
        store.createIndex(BY_GRID, 'gridId', { unique: false });
      }
    },
  });

  return {
    async get(gridId, field) {
      const row = (await db.get(STORE, makeKey(gridId, field))) as
        | IdbEntry<TPayload>
        | undefined;
      return row ?? null;
    },

    async put(gridId, field, payload) {
      const entry: IdbEntry<TPayload> = {
        key: makeKey(gridId, field),
        gridId,
        field,
        hash: payload.hash,
        payload,
        savedAt: Date.now(),
      };
      await db.put(STORE, entry);
    },

    async clear(gridId, field) {
      await db.delete(STORE, makeKey(gridId, field));
    },

    async clearGrid(gridId) {
      // Walk the `by-grid` index and delete every matching primary key in a
      // single readwrite transaction.
      const tx = db.transaction(STORE, 'readwrite');
      const index = tx.store.index(BY_GRID);
      let cursor = await index.openCursor(IDBKeyRange.only(gridId));
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
      await tx.done;
    },

    async clearAll() {
      await db.clear(STORE);
    },

    async close() {
      db.close();
    },
  };
}
