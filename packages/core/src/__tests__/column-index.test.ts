import {
  buildColumnIndex,
  serializeColumnIndex,
  deserializeColumnIndex,
} from '../search-index/column-index';

// ---------------------------------------------------------------------------
// buildColumnIndex — distinct values + rowIds
// ---------------------------------------------------------------------------

describe('buildColumnIndex — distinct values', () => {
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

describe('buildColumnIndex — trie search', () => {
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

describe('buildColumnIndex — hash', () => {
  it('produces a stable hash for the same input', () => {
    const rows = [{ n: 'Alice' }, { n: 'Bob' }];
    const a = buildColumnIndex(rows, ['r1', 'r2'], 'n');
    const b = buildColumnIndex(rows, ['r1', 'r2'], 'n');
    expect(a.hash).toBe(b.hash);
  });

  it('produces a different hash when distinct values change', () => {
    const a = buildColumnIndex([{ n: 'Alice' }], ['r1'], 'n');
    const b = buildColumnIndex([{ n: 'Bob' }], ['r1'], 'n');
    expect(a.hash).not.toBe(b.hash);
  });

  it('produces a different hash when the field name changes', () => {
    const rows = [{ name: 'Alice', label: 'Alice' }];
    const a = buildColumnIndex(rows, ['r1'], 'name');
    const b = buildColumnIndex(rows, ['r1'], 'label');
    expect(a.hash).not.toBe(b.hash);
  });

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

describe('serializeColumnIndex / deserializeColumnIndex', () => {
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
