/**
 * Contract suite for the case-insensitive prefix/substring {@link Trie}.
 *
 * These tests lock in the behaviour the rest of the search-index stack
 * depends on: case-insensitive matching, multi-value keys, empty-query
 * wildcard semantics, stable `size()` accounting across case-variant
 * insertions, and a JSON-safe serialize/deserialize round-trip. A
 * regression in any of these directly breaks the filter dropdown search.
 */

import { Trie } from '../search-index/trie';

// ---------------------------------------------------------------------------
// Trie — case-insensitive prefix search
// ---------------------------------------------------------------------------

// Covers the primary read path used by the filter dropdown: prefix descent
// with case-insensitive matching and an empty-prefix wildcard.
describe('Trie — searchByPrefix', () => {
  // Baseline case: multiple keys share a prefix, and both are returned.
  it('returns all values whose key starts with the prefix', () => {
    const t = new Trie<string>();
    t.insert('Alice', 'r1');
    t.insert('Alan', 'r2');
    t.insert('Bob', 'r3');
    expect(t.searchByPrefix('Al').sort()).toEqual(['r1', 'r2']);
  });

  // Case-insensitivity is the whole point of lower-casing on insert; verify
  // that mixed casings on both sides still collapse to the same bucket.
  it('matches case-insensitively', () => {
    const t = new Trie<string>();
    t.insert('Alice', 'r1');
    t.insert('ALICE', 'r2');
    expect(t.searchByPrefix('ali').sort()).toEqual(['r1', 'r2']);
  });

  // Misses must return an empty array rather than throwing, so callers
  // can always pass results straight into render logic.
  it('returns an empty array when the prefix has no matches', () => {
    const t = new Trie<string>();
    t.insert('Alice', 'r1');
    expect(t.searchByPrefix('zz')).toEqual([]);
  });

  // The empty prefix is treated as a wildcard that returns every stored
  // value — UI code relies on this to show the full list before typing.
  it('returns all values when the prefix is empty', () => {
    const t = new Trie<string>();
    t.insert('Alice', 'r1');
    t.insert('Bob', 'r2');
    t.insert('Carol', 'r3');
    expect(t.searchByPrefix('').sort()).toEqual(['r1', 'r2', 'r3']);
  });

  // Multi-value keys map one display string to many row ids; the prefix
  // search must return every associated value, not just the first.
  it('supports multiple values under the same key', () => {
    const t = new Trie<string>();
    t.insert('Alice', 'r1');
    t.insert('Alice', 'r7');
    expect(t.searchByPrefix('alice').sort()).toEqual(['r1', 'r7']);
  });
});

// ---------------------------------------------------------------------------
// Trie — searchBySubstring
// ---------------------------------------------------------------------------

// Substring search backs the "contains" filter mode; these tests lock in
// mid-key matching, case insensitivity, and empty-needle wildcard semantics.
describe('Trie — searchBySubstring', () => {
  // Substring matching differs from prefix matching precisely by locating
  // hits that are not anchored to the start of the key.
  it('finds matches in the middle of keys', () => {
    const t = new Trie<string>();
    t.insert('hello world', 'r1');
    t.insert('say hello', 'r2');
    t.insert('nothing', 'r3');
    expect(t.searchBySubstring('ello').sort()).toEqual(['r1', 'r2']);
  });

  // The case-insensitivity contract applies to substring search too.
  it('matches case-insensitively', () => {
    const t = new Trie<string>();
    t.insert('Hello World', 'r1');
    expect(t.searchBySubstring('WORLD')).toEqual(['r1']);
  });

  // Misses resolve to an empty array, mirroring prefix-search behaviour.
  it('returns an empty array when the substring is absent', () => {
    const t = new Trie<string>();
    t.insert('Alice', 'r1');
    expect(t.searchBySubstring('xyz')).toEqual([]);
  });

  // Empty-needle wildcard semantics match the prefix API so both searches
  // can be driven by the same input field without an explicit conditional.
  it('returns all values when the substring is empty', () => {
    const t = new Trie<string>();
    t.insert('Alice', 'r1');
    t.insert('Bob', 'r2');
    expect(t.searchBySubstring('').sort()).toEqual(['r1', 'r2']);
  });
});

// ---------------------------------------------------------------------------
// Trie — size
// ---------------------------------------------------------------------------

// Ensures `size()` reports the number of distinct lower-cased keys, which
// the caching layer uses as a cheap sanity check on the deserialized index.
describe('Trie — size', () => {
  // Straightforward count of unique keys.
  it('counts unique key insertions', () => {
    const t = new Trie<string>();
    t.insert('Alice', 'r1');
    t.insert('Bob', 'r2');
    t.insert('Carol', 'r3');
    expect(t.size()).toBe(3);
  });

  // Case-variant insertions must not inflate the size; the distinct-key
  // count is case-insensitive because keys are stored lower-cased.
  it('does not grow when the same key is re-inserted (case-insensitive)', () => {
    const t = new Trie<string>();
    t.insert('Alice', 'r1');
    t.insert('alice', 'r2');
    t.insert('ALICE', 'r3');
    expect(t.size()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Trie — serialize / deserialize
// ---------------------------------------------------------------------------

// Locks in the persistence contract: the serialized form must survive a
// full JSON round-trip and produce a trie that is behaviourally identical.
describe('Trie — serialize / deserialize', () => {
  // Full round-trip through JSON plus verification that every read path
  // still works on the rehydrated trie.
  it('round-trips via serialize → deserialize', () => {
    const t = new Trie<string>();
    t.insert('Alice', 'r1');
    t.insert('Alan', 'r2');
    t.insert('Bob', 'r3');

    const data = t.serialize();
    // Forcing through JSON.stringify/parse proves the payload is genuinely
    // JSON-safe rather than accidentally relying on object identity.
    const clone = Trie.deserialize<string>(JSON.parse(JSON.stringify(data)));

    expect(clone.searchByPrefix('al').sort()).toEqual(['r1', 'r2']);
    expect(clone.searchByPrefix('').sort()).toEqual(['r1', 'r2', 'r3']);
    expect(clone.size()).toBe(3);
  });

  // Substring search relies on the flat key store, which is rebuilt from
  // the serialized entries; this guards against regressions there.
  it('preserves substring search after round-trip', () => {
    const t = new Trie<string>();
    t.insert('hello world', 'r1');
    const clone = Trie.deserialize<string>(JSON.parse(JSON.stringify(t.serialize())));
    expect(clone.searchBySubstring('lo wo')).toEqual(['r1']);
  });
});
