/**
 * IndexedDB persistence adapter for per-column search indexes.
 *
 * The adapter stores serialized column-index payloads in a single object
 * store, keyed by a composite `${gridId}::${field}` primary key. A secondary
 * index on `gridId` supports bulk deletion of every row belonging to a grid
 * without scanning the whole store. Writes capture a `savedAt` timestamp
 * so callers can implement TTL-style eviction on top of the stored rows.
 *
 * The module is written to be safe in non-browser environments (tests that
 * don't stub IndexedDB, SSR builds, Node scripts). When the global
 * `indexedDB` is absent, {@link openIdbAdapter} returns a fully inert
 * adapter so call sites can stay environment-agnostic.
 *
 * The type parameter on the adapter is narrowed to `{ hash: string }` so
 * the adapter can record the payload's content fingerprint alongside the
 * row — the serialized column-index payload from {@link ./column-index}
 * satisfies this shape directly.
 *
 * @module search-index/idb-adapter
 */

import { openDB, IDBPDatabase } from 'idb';

/**
 * Default IndexedDB database name.
 *
 * Kept private because production callers always rely on the default;
 * tests override it via {@link openIdbAdapter}'s `dbName` argument to
 * avoid cross-test contamination.
 */
const DEFAULT_DB_NAME = 'xldatagrid-search-index';

/** Single object store holding every serialized column-index row. */
const STORE = 'column-index';

/** Secondary index on `gridId` used to bulk-clear a grid's rows. */
const BY_GRID = 'by-grid';

/**
 * A persisted column-index row.
 *
 * The shape is deliberately flat (no nested envelope) so IndexedDB can use
 * `key` as the `keyPath` and `gridId` as a secondary index without any
 * extra marshalling on read.
 *
 * @typeParam TPayload - The serialized column-index payload type. Must
 *                       expose a `hash` field so the adapter can mirror it
 *                       at the top level for cheap change detection.
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
 * All methods are asynchronous and must tolerate missing rows gracefully —
 * `get` resolves `null` rather than throwing, and the various `clear`
 * methods are idempotent. Implementations should not surface IndexedDB
 * transaction errors to callers in the common "no such row" case so the
 * calling code can always just `await` without defensive wrapping.
 */
export interface IdbAdapter<TPayload extends { hash: string }> {
  get(gridId: string, field: string): Promise<IdbEntry<TPayload> | null>;
  put(gridId: string, field: string, payload: TPayload): Promise<void>;
  clear(gridId: string, field: string): Promise<void>;
  clearGrid(gridId: string): Promise<void>;
  clearAll(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Build the composite primary key used by the `column-index` store.
 *
 * The `::` separator is unlikely to appear in either a grid id or a field
 * name in practice, and because `gridId` is usually a UUID or a caller-
 * controlled string, an accidental collision would still be localised to
 * a single application. Kept as a helper so both `put` and `get` agree on
 * the exact encoding.
 */
function makeKey(gridId: string, field: string): string {
  return `${gridId}::${field}`;
}

/**
 * Creates a no-op adapter for environments without IndexedDB (e.g. SSR).
 *
 * Every mutator resolves void with no side effects and `get` always resolves
 * `null`. Exporting this factory (rather than hiding it inside {@link openIdbAdapter})
 * lets tests assert the fallback behaviour directly without monkey-patching
 * the global `indexedDB` object.
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
 * The function is the single entry point callers should use. It handles both
 * the happy-path "browser with IndexedDB available" case and the degenerate
 * "no IndexedDB" case transparently, so call sites do not need to branch on
 * the environment themselves.
 *
 * @param dbName - Override the database name (useful for test isolation).
 * @returns An adapter bound to a live `IDBPDatabase`, or a no-op stand-in
 *          when IndexedDB is unavailable.
 */
export async function openIdbAdapter<TPayload extends { hash: string }>(
  dbName: string = DEFAULT_DB_NAME,
): Promise<IdbAdapter<TPayload>> {
  // Environments without `indexedDB` (Node without a shim, SSR at render
  // time) are handled by returning an inert adapter. Callers stay ignorant
  // of the environment because every method still resolves successfully.
  if (typeof indexedDB === 'undefined') {
    return createNoopIdbAdapter<TPayload>();
  }

  // Open the database at schema version 1. The `upgrade` callback only fires
  // on first open (or when the version bumps), so the store-creation block
  // is a one-shot initializer rather than something that runs every time.
  const db: IDBPDatabase = await openDB(dbName, 1, {
    upgrade(database) {
      // Guard the store creation so a re-entered upgrade (unlikely, but
      // possible with concurrent tabs) doesn't attempt to recreate an
      // existing store — an operation IndexedDB would reject.
      if (!database.objectStoreNames.contains(STORE)) {
        const store = database.createObjectStore(STORE, { keyPath: 'key' });
        // The secondary index is what makes `clearGrid` an O(matching rows)
        // operation instead of a full-store scan.
        store.createIndex(BY_GRID, 'gridId', { unique: false });
      }
    },
  });

  return {
    async get(gridId, field) {
      // `idb` returns `undefined` for missing keys; the adapter contract
      // normalises that to `null` so callers can use a single nullish check.
      const row = (await db.get(STORE, makeKey(gridId, field))) as
        | IdbEntry<TPayload>
        | undefined;
      return row ?? null;
    },

    async put(gridId, field, payload) {
      // Build the full entry up front so the write is atomic from the
      // caller's perspective — either every mirrored field lands together
      // or (on error) none of them do.
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
      // `delete` is a no-op when the row is absent, which matches the
      // interface contract of being safely idempotent.
      await db.delete(STORE, makeKey(gridId, field));
    },

    async clearGrid(gridId) {
      // Open a single readwrite transaction and cursor-walk the secondary
      // `by-grid` index. Deleting via the cursor keeps all writes inside
      // the same transaction so the operation is all-or-nothing.
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
      // Full store reset — used when the caller wants to evict everything,
      // for example on schema-breaking upgrades.
      await db.clear(STORE);
    },

    async close() {
      // Releasing the connection lets other tabs / the same tab reopen
      // without "blocked" events when the next upgrade arrives.
      db.close();
    },
  };
}
