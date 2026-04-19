/**
 * Barrel for the search-index module.
 *
 * Re-exports the three building blocks that together form the column-search
 * subsystem:
 *
 * - {@link ./trie} provides the case-insensitive prefix / substring trie
 *   used for incremental matching as the user types.
 * - {@link ./column-index} builds and (de)serializes per-column indexes
 *   that pair distinct display values with the row ids that carry them.
 * - {@link ./idb-adapter} persists those serialized payloads to IndexedDB
 *   with a safe no-op fallback for environments where IndexedDB is absent.
 *
 * Consumers should import from this barrel rather than deep-importing the
 * individual submodules so internal reshuffling stays behind a stable
 * public surface.
 *
 * @module search-index
 */

export * from './trie';
export * from './column-index';
export * from './idb-adapter';
