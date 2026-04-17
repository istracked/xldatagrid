/**
 * Barrel for the search-index module.
 *
 * Re-exports the prefix trie and column-index builders. A future slice will
 * add an IDB adapter re-export alongside these.
 *
 * @module search-index
 */

export * from './trie';
export * from './column-index';
