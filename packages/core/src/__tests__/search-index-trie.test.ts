import { Trie } from '../search-index/trie';

// ---------------------------------------------------------------------------
// Trie — case-insensitive prefix search
// ---------------------------------------------------------------------------

describe('Trie — searchByPrefix', () => {
  it('returns all values whose key starts with the prefix', () => {
    const t = new Trie<string>();
    t.insert('Alice', 'r1');
    t.insert('Alan', 'r2');
    t.insert('Bob', 'r3');
    expect(t.searchByPrefix('Al').sort()).toEqual(['r1', 'r2']);
  });

  it('matches case-insensitively', () => {
    const t = new Trie<string>();
    t.insert('Alice', 'r1');
    t.insert('ALICE', 'r2');
    expect(t.searchByPrefix('ali').sort()).toEqual(['r1', 'r2']);
  });

  it('returns an empty array when the prefix has no matches', () => {
    const t = new Trie<string>();
    t.insert('Alice', 'r1');
    expect(t.searchByPrefix('zz')).toEqual([]);
  });

  it('returns all values when the prefix is empty', () => {
    const t = new Trie<string>();
    t.insert('Alice', 'r1');
    t.insert('Bob', 'r2');
    t.insert('Carol', 'r3');
    expect(t.searchByPrefix('').sort()).toEqual(['r1', 'r2', 'r3']);
  });

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

describe('Trie — searchBySubstring', () => {
  it('finds matches in the middle of keys', () => {
    const t = new Trie<string>();
    t.insert('hello world', 'r1');
    t.insert('say hello', 'r2');
    t.insert('nothing', 'r3');
    expect(t.searchBySubstring('ello').sort()).toEqual(['r1', 'r2']);
  });

  it('matches case-insensitively', () => {
    const t = new Trie<string>();
    t.insert('Hello World', 'r1');
    expect(t.searchBySubstring('WORLD')).toEqual(['r1']);
  });

  it('returns an empty array when the substring is absent', () => {
    const t = new Trie<string>();
    t.insert('Alice', 'r1');
    expect(t.searchBySubstring('xyz')).toEqual([]);
  });

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

describe('Trie — size', () => {
  it('counts unique key insertions', () => {
    const t = new Trie<string>();
    t.insert('Alice', 'r1');
    t.insert('Bob', 'r2');
    t.insert('Carol', 'r3');
    expect(t.size()).toBe(3);
  });

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

describe('Trie — serialize / deserialize', () => {
  it('round-trips via serialize → deserialize', () => {
    const t = new Trie<string>();
    t.insert('Alice', 'r1');
    t.insert('Alan', 'r2');
    t.insert('Bob', 'r3');

    const data = t.serialize();
    // The serialized form must be JSON-safe
    const clone = Trie.deserialize<string>(JSON.parse(JSON.stringify(data)));

    expect(clone.searchByPrefix('al').sort()).toEqual(['r1', 'r2']);
    expect(clone.searchByPrefix('').sort()).toEqual(['r1', 'r2', 'r3']);
    expect(clone.size()).toBe(3);
  });

  it('preserves substring search after round-trip', () => {
    const t = new Trie<string>();
    t.insert('hello world', 'r1');
    const clone = Trie.deserialize<string>(JSON.parse(JSON.stringify(t.serialize())));
    expect(clone.searchBySubstring('lo wo')).toEqual(['r1']);
  });
});
