/**
 * Barrel for the search-index module.
 *
 * Re-exports the prefix trie, column-index builders, and the IndexedDB
 * persistence adapter.
 *
 * @module search-index
 */

export * from './trie';
export * from './column-index';
export * from './idb-adapter';
