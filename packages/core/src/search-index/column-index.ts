/**
 * Column search index — per-column data structures used by the filter
 * dropdown.
 *
 * Given a set of rows and a field name, {@link buildColumnIndex} produces a
 * sorted list of distinct display values, a reverse lookup from value to the
 * row ids that carry it, and a prefix/substring trie for incremental search
 * as the user types in the filter panel. A stable content hash accompanies
 * the index so that persisted copies can be invalidated precisely when the
 * underlying data changes.
 *
 * Design choices worth calling out:
 *
 * - Nulls and undefineds collapse to a single sentinel display value so the
 *   UI can render a "(blanks)" option without the index caller having to
 *   special-case empty cells.
 * - Display values are sorted with a numeric, case-insensitive collator so
 *   string representations of numbers ("2" before "10") and mixed casing
 *   behave intuitively.
 * - The {@link computeHash} function uses FNV-1a over a canonicalised
 *   `(field, sortedDistinctValues)` tuple; it deliberately does not depend
 *   on row ids so unrelated reorderings do not bust the persisted cache.
 * - Serialization is a deep, JSON-safe snapshot — suitable for handing
 *   straight to the IDB adapter without further transformation.
 *
 * @module search-index/column-index
 */

import { Trie, SerializedTrie } from './trie';

/**
 * Sentinel display value used for `null` / `undefined` cells.
 *
 * Exposed as a module-level constant so the exact string can be referenced
 * by tests and the UI layer without duplicating the literal.
 */
const BLANKS = '(blanks)';

/**
 * Shared collator used to order display values.
 *
 * Configured with `numeric: true` so "10" follows "2", and `sensitivity: 'base'`
 * so casing is ignored when comparing equivalent strings. Kept module-scoped
 * because `Intl.Collator` construction is comparatively expensive and the
 * options are fixed.
 */
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/**
 * Fully-built search index for a single column.
 *
 * Consumers read {@link distinctValues} to populate the filter dropdown,
 * use {@link valueToRowIds} to translate a selected display value back into
 * row ids, and dispatch user typing into {@link trie} for live search.
 * The {@link hash} is an opaque fingerprint used by the persistence layer
 * to detect stale cache entries.
 */
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

/**
 * JSON-safe shape produced by {@link serializeColumnIndex} and consumed by
 * {@link deserializeColumnIndex}.
 *
 * Everything here is either a primitive, a plain array, or a plain object —
 * `Map` instances are flattened into entry tuples so the payload round-trips
 * through `JSON.stringify` / `JSON.parse` without loss.
 */
export interface SerializedColumnIndex {
  field: string;
  distinctValues: string[];
  entries: [string, string[]][];
  trie: SerializedTrie;
  hash: string;
}

/**
 * Coerces any cell value to its display-string form.
 *
 * Null and undefined collapse into the {@link BLANKS} sentinel so the UI
 * can show a single "(blanks)" row for empty cells. Everything else goes
 * through `String(value)` — numbers, booleans, and objects all get their
 * default stringification, which matches how the grid renders them.
 */
function toDisplay(v: unknown): string {
  if (v === null || v === undefined) return BLANKS;
  return String(v);
}

/**
 * FNV-1a 32-bit hash, hex-encoded.
 *
 * Chosen over a cryptographic hash because we only need fast, stable change
 * detection — not collision resistance against adversaries. The output is
 * left-padded to a fixed eight hex characters so string comparisons are
 * lexicographically predictable.
 *
 * @param input String to hash.
 * @returns Eight-character lower-case hex representation of the 32-bit hash.
 */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // The shift-add pattern here is an arithmetic expansion of `hash * 16777619`
    // (the FNV prime) folded into 32-bit unsigned space, which avoids the
    // precision loss that would occur with a plain JS multiplication.
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Computes a stable cache fingerprint for a given column.
 *
 * The hash is a pure function of the field name and the sorted distinct
 * values, so two indexes built over different row orderings (or with
 * different row ids) still share the same hash provided their distinct
 * contents are identical.
 *
 * Separators `\u0000` (between field and values) and `\u0001` (between
 * values) are used because they cannot appear in either field names or
 * rendered display values, which sidesteps ambiguity-induced collisions
 * like `("a", ["b|c"])` vs `("a|b", ["c"])` when a printable separator
 * would blur the boundary.
 */
function computeHash(field: string, sortedDistinct: string[]): string {
  return fnv1a(`${field}\u0000${sortedDistinct.join('\u0001')}`);
}

/**
 * Builds a {@link ColumnSearchIndex} from `rows` and their parallel `rowIds`
 * for a single `field`.
 *
 * The two input arrays must align 1:1 — index `i` in `rows` corresponds to
 * row id at index `i` in `rowIds`. Missing entries (sparse arrays) are
 * silently skipped so callers can feed in row slices without pre-filtering.
 *
 * @param rows   Row data objects. Each must expose the target `field` as a
 *               property; missing fields are treated as blanks.
 * @param rowIds Row identifiers that align positionally with `rows`.
 * @param field  Property name to index within each row.
 * @returns A ready-to-use {@link ColumnSearchIndex}.
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

  // Two parallel maps are maintained during the scan: one that groups row
  // ids under each lower-cased display key (the lookup used by the filter),
  // and one that remembers the first-seen original-case form so the UI can
  // render values exactly as they appear in the data.
  const valueToRowIds = new Map<string, string[]>();
  const displayByKey = new Map<string, string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowId = rowIds[i];
    // Skip sparse holes defensively; `ReadonlyArray` permits them in TS even
    // if runtime inputs rarely contain them.
    if (row === undefined || rowId === undefined) continue;
    const display = toDisplay(row[field]);
    const key = display.toLowerCase();
    const bucket = valueToRowIds.get(key);
    if (bucket) bucket.push(rowId);
    else valueToRowIds.set(key, [rowId]);
    // The first-seen form wins for display — this is deterministic given a
    // stable input order and matches how Excel's AutoFilter surfaces values.
    if (!displayByKey.has(key)) displayByKey.set(key, display);
  }

  // Sort the display-cased distinct values with the numeric collator so
  // both casing and numeric-string ordering behave the way users expect
  // from a spreadsheet filter dropdown.
  const distinctValues = [...displayByKey.values()].sort(collator.compare);

  // Build the trie by iterating in sorted order so traversal results come
  // out in a stable sequence. Each display value's row ids are attached as
  // payload so a single search call returns match row ids directly.
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

/**
 * Produces a JSON-safe snapshot of a column index.
 *
 * Mutable collections are shallow-copied into plain arrays so the returned
 * payload cannot observe later mutations of the live index (and vice versa).
 * The result is consumed by the IDB adapter, which will in turn `structuredClone`
 * it when writing; having a stable, decoupled payload simplifies that handoff.
 */
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

/**
 * Rehydrates a {@link ColumnSearchIndex} from a serialized snapshot.
 *
 * Symmetric with {@link serializeColumnIndex}: arrays and maps are rebuilt
 * with fresh instances so the loaded index is independent of the input
 * payload. The trie is reconstructed via {@link Trie.deserialize}, which
 * re-runs the normal insertion path to guarantee invariants match a
 * freshly-built index.
 */
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
