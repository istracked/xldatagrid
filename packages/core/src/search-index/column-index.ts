/**
 * Column search index — builds per-column data structures used for filter
 * dropdown search (sorted distinct values, lookup map, prefix/substring trie)
 * and exposes a JSON-safe serialization pair for cache persistence.
 *
 * @module search-index/column-index
 */

import { Trie, SerializedTrie } from './trie';

/** Sentinel display value used for `null`/`undefined` cells. */
const BLANKS = '(blanks)';

/** Shared collator — numeric, case-insensitive ordering for display values. */
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** Fully-built index for a single column. */
export interface ColumnSearchIndex {
  field: string;
  /** Sorted, de-duplicated, original-case display values (one per distinct value). */
  distinctValues: string[];
  /** Map lower-cased value -> rowIds that carry that value. */
  valueToRowIds: Map<string, string[]>;
  /** Prefix/substring trie over distinct values; stored values are rowIds. */
  trie: Trie<string>;
  /** FNV-1a hash of (field, sorted distinct values) used for cache invalidation. */
  hash: string;
}

/** JSON-safe shape produced by {@link serializeColumnIndex}. */
export interface SerializedColumnIndex {
  field: string;
  distinctValues: string[];
  entries: [string, string[]][];
  trie: SerializedTrie;
  hash: string;
}

/** Coerces any cell value to its display-string form. */
function toDisplay(v: unknown): string {
  if (v === null || v === undefined) return BLANKS;
  return String(v);
}

/** FNV-1a 32-bit hash, hex-encoded. Pure function of its input string. */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // Equivalent to multiplying by the FNV prime (16777619) mod 2^32
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** Hash depends only on (field, sorted distinctValues) — same inputs -> same hash. */
function computeHash(field: string, sortedDistinct: string[]): string {
  // Use a separator that can't appear in the field name to avoid collisions
  return fnv1a(`${field}\u0000${sortedDistinct.join('\u0001')}`);
}

/**
 * Builds a {@link ColumnSearchIndex} from `rows` and their parallel `rowIds`
 * for a single `field`.
 *
 * @throws If `rows` and `rowIds` have differing lengths.
 */
export function buildColumnIndex(
  rows: ReadonlyArray<Record<string, unknown>>,
  rowIds: ReadonlyArray<string>,
  field: string,
): ColumnSearchIndex {
  if (rows.length !== rowIds.length) {
    throw new Error('buildColumnIndex: rows and rowIds must have the same length');
  }

  // Group rowIds per display value; remember one original-case form per distinct key
  const valueToRowIds = new Map<string, string[]>();
  const displayByKey = new Map<string, string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowId = rowIds[i];
    if (row === undefined || rowId === undefined) continue;
    const display = toDisplay(row[field]);
    const key = display.toLowerCase();
    const bucket = valueToRowIds.get(key);
    if (bucket) bucket.push(rowId);
    else valueToRowIds.set(key, [rowId]);
    // Keep the first-seen original-case form for display
    if (!displayByKey.has(key)) displayByKey.set(key, display);
  }

  // Sorted distinct values in original case, ordered with a numeric collator
  const distinctValues = [...displayByKey.values()].sort(collator.compare);

  // Populate a trie keyed by display value with rowIds as payload
  const trie = new Trie<string>();
  for (const display of distinctValues) {
    const key = display.toLowerCase();
    const ids = valueToRowIds.get(key) ?? [];
    for (const id of ids) trie.insert(display, id);
  }

  return {
    field,
    distinctValues,
    valueToRowIds,
    trie,
    hash: computeHash(field, distinctValues),
  };
}

/** Produces a JSON-safe snapshot of the index. */
export function serializeColumnIndex(idx: ColumnSearchIndex): SerializedColumnIndex {
  const entries: [string, string[]][] = [];
  for (const [key, ids] of idx.valueToRowIds) entries.push([key, [...ids]]);
  return {
    field: idx.field,
    distinctValues: [...idx.distinctValues],
    entries,
    trie: idx.trie.serialize(),
    hash: idx.hash,
  };
}

/** Rehydrates a {@link ColumnSearchIndex} from a serialized snapshot. */
export function deserializeColumnIndex(data: SerializedColumnIndex): ColumnSearchIndex {
  const valueToRowIds = new Map<string, string[]>();
  for (const [key, ids] of data.entries) valueToRowIds.set(key, [...ids]);
  return {
    field: data.field,
    distinctValues: [...data.distinctValues],
    valueToRowIds,
    trie: Trie.deserialize<string>(data.trie),
    hash: data.hash,
  };
}
