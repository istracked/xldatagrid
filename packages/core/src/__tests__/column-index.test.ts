/**
 * Contract suite for the per-column search index builder and its
 * serialization pair.
 *
 * The tests pin down the user-facing guarantees the filter dropdown
 * depends on: distinct-value extraction with sentinel blanks, numeric
 * collation, trie-backed prefix and substring search, cache-fingerprint
 * stability, and lossless JSON round-trips.
 */

import {
  buildColumnIndex,
  serializeColumnIndex,
  deserializeColumnIndex,
} from '../search-index/column-index';

// ---------------------------------------------------------------------------
// buildColumnIndex — distinct values + rowIds
// ---------------------------------------------------------------------------

// Covers distinct-value extraction, blank handling, numeric collation, and
// coercion — the data the filter dropdown reads verbatim.
describe('buildColumnIndex — distinct values', () => {
  // Exercises the happy path: duplicate values collapse, and row ids are
  // accumulated under their (lower-cased) display key.
  it('returns sorted, de-duplicated distinct values and correct rowIds per value', () => {
    const rows = [
      { name: 'Alice' },
      { name: 'Bob' },
      { name: 'Alice' },
      { name: 'Carol' },
    ];
    const idx = buildColumnIndex(rows, ['r1', 'r2', 'r3', 'r4'], 'name');

    expect(idx.field).toBe('name');
    expect(idx.distinctValues).toEqual(['Alice', 'Bob', 'Carol']);
    expect(idx.valueToRowIds.get('alice')).toEqual(['r1', 'r3']);
    expect(idx.valueToRowIds.get('bob')).toEqual(['r2']);
    expect(idx.valueToRowIds.get('carol')).toEqual(['r4']);
  });

  // Null and undefined must fold into a single "(blanks)" display so the
  // UI can render one "empty" row regardless of which absent sentinel was
  // used at the source.
  it('collapses null and undefined into "(blanks)"', () => {
    const rows = [
      { name: 'Alice' },
      { name: null },
      { name: undefined },
      { name: 'Alice' },
    ];
    const idx = buildColumnIndex(rows, ['r1', 'r2', 'r3', 'r4'], 'name');

    expect(idx.distinctValues).toContain('(blanks)');
    expect(idx.valueToRowIds.get('(blanks)')).toEqual(['r2', 'r3']);
    expect(idx.valueToRowIds.get('alice')).toEqual(['r1', 'r4']);
  });

  // Numeric collation is what makes string-encoded numbers sort intuitively;
  // a regression here would show "10, 2, 9" in a dropdown.
  it('sorts numeric strings numerically ("10" after "9")', () => {
    const rows = [
      { v: '10' },
      { v: '2' },
      { v: '9' },
      { v: '1' },
    ];
    const idx = buildColumnIndex(rows, ['r1', 'r2', 'r3', 'r4'], 'v');
    expect(idx.distinctValues).toEqual(['1', '2', '9', '10']);
  });

  // Non-strings are coerced by `String(value)` — a contract other call sites
  // implicitly rely on when passing raw row records through.
  it('coerces non-string values to strings via String()', () => {
    const rows = [
      { n: 1 },
      { n: 2 },
      { n: 1 },
    ];
    const idx = buildColumnIndex(rows, ['r1', 'r2', 'r3'], 'n');
    expect(idx.distinctValues).toEqual(['1', '2']);
    expect(idx.valueToRowIds.get('1')).toEqual(['r1', 'r3']);
  });
});

// ---------------------------------------------------------------------------
// buildColumnIndex — trie search
// ---------------------------------------------------------------------------

// Verifies that the trie attached to the built index delivers on both
// prefix and substring modes using the payload the builder populated.
describe('buildColumnIndex — trie search', () => {
  // Prefix search must return every row id whose column value begins with
  // the typed text, regardless of casing.
  it('supports prefix search returning rowIds', () => {
    const rows = [
      { name: 'Alice' },
      { name: 'Alan' },
      { name: 'Bob' },
      { name: 'Alice' },
    ];
    const idx = buildColumnIndex(rows, ['r1', 'r2', 'r3', 'r4'], 'name');

    const results = idx.trie.searchByPrefix('al').sort();
    expect(results).toEqual(['r1', 'r2', 'r4']);
  });

  // Substring search is keyed off the flat store the builder populates via
  // the trie's `insert`, so the two paths must stay in agreement.
  it('supports substring search over distinct values', () => {
    const rows = [
      { name: 'hello world' },
      { name: 'say hello' },
      { name: 'nothing' },
    ];
    const idx = buildColumnIndex(rows, ['r1', 'r2', 'r3'], 'name');
    expect(idx.trie.searchBySubstring('ello').sort()).toEqual(['r1', 'r2']);
  });
});

// ---------------------------------------------------------------------------
// buildColumnIndex — hash
// ---------------------------------------------------------------------------

// The hash is the cache key for persisted indexes; its stability and
// input-sensitivity are both strict requirements.
describe('buildColumnIndex — hash', () => {
  // Determinism: identical inputs must always produce the same hash so
  // callers can compare fingerprints before deciding to rebuild.
  it('produces a stable hash for the same input', () => {
    const rows = [{ n: 'Alice' }, { n: 'Bob' }];
    const a = buildColumnIndex(rows, ['r1', 'r2'], 'n');
    const b = buildColumnIndex(rows, ['r1', 'r2'], 'n');
    expect(a.hash).toBe(b.hash);
  });

  // Changing the actual distinct values must bust the cache; otherwise
  // stale indexes could be served after the data changes.
  it('produces a different hash when distinct values change', () => {
    const a = buildColumnIndex([{ n: 'Alice' }], ['r1'], 'n');
    const b = buildColumnIndex([{ n: 'Bob' }], ['r1'], 'n');
    expect(a.hash).not.toBe(b.hash);
  });

  // The field name is part of the fingerprint so two columns in the same
  // grid with coincidentally identical values don't share a cache slot.
  it('produces a different hash when the field name changes', () => {
    const rows = [{ name: 'Alice', label: 'Alice' }];
    const a = buildColumnIndex(rows, ['r1'], 'name');
    const b = buildColumnIndex(rows, ['r1'], 'label');
    expect(a.hash).not.toBe(b.hash);
  });

  // Row ids are deliberately excluded from the hash so routine reorderings
  // (sorting, pagination) don't force unnecessary cache invalidation.
  it('is independent of rowId ordering (only depends on field + distinctValues)', () => {
    // Same distinct values under the same field -> same hash, regardless of rowIds.
    const a = buildColumnIndex([{ n: 'Alice' }, { n: 'Bob' }], ['r1', 'r2'], 'n');
    const b = buildColumnIndex([{ n: 'Alice' }, { n: 'Bob' }], ['x1', 'x2'], 'n');
    expect(a.hash).toBe(b.hash);
  });
});

// ---------------------------------------------------------------------------
// serializeColumnIndex / deserializeColumnIndex
// ---------------------------------------------------------------------------

// End-to-end guarantee that a built index can be persisted and restored
// through a full JSON round-trip with no loss of functionality.
describe('serializeColumnIndex / deserializeColumnIndex', () => {
  // Validates every consumer-visible field after a serialize → JSON → parse
  // → deserialize cycle, including trie-driven search on the clone.
  it('round-trips distinct values, rowIds, and trie search', () => {
    const rows = [
      { name: 'Alice' },
      { name: 'Alan' },
      { name: 'Bob' },
      { name: 'Alice' },
    ];
    const idx = buildColumnIndex(rows, ['r1', 'r2', 'r3', 'r4'], 'name');

    const data = serializeColumnIndex(idx);
    // Must be JSON-safe end-to-end.
    const clone = deserializeColumnIndex(JSON.parse(JSON.stringify(data)));

    expect(clone.field).toBe('name');
    expect(clone.distinctValues).toEqual(['Alice', 'Alan', 'Bob'].sort(
      new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }).compare,
    ));
    expect(clone.valueToRowIds.get('alice')).toEqual(['r1', 'r4']);
    expect(clone.valueToRowIds.get('alan')).toEqual(['r2']);
    expect(clone.trie.searchByPrefix('al').sort()).toEqual(['r1', 'r2', 'r4']);
    expect(clone.hash).toBe(idx.hash);
  });
});
