/**
 * Case-insensitive prefix trie with multi-value support.
 *
 * This module provides the primitive lookup structure used by the
 * column-search index. Keys are normalized to lower case on insertion so both
 * prefix and substring queries are case-insensitive without requiring the
 * caller to pre-process input. A single key can map to any number of values,
 * which in the wider system is used to associate a display string (e.g. a
 * person's name) with every row id that carries that value.
 *
 * Two parallel stores are kept: the trie itself for fast prefix descent, and
 * a flat `Map` of lower-cased key to values. The flat store backs substring
 * search (which is inherently a linear scan) and makes `size()` an O(1)
 * operation. Keeping both in sync is a core invariant of this module.
 *
 * The {@link Trie.serialize} output is deliberately JSON-safe so the payload
 * can be persisted to IndexedDB by {@link ../search-index/idb-adapter} and
 * later rehydrated via {@link Trie.deserialize} in either browser or SSR
 * contexts.
 *
 * @module search-index/trie
 */

/**
 * JSON-safe serialized form of a {@link Trie}.
 *
 * Only the flat key/value pairs are persisted — the tree structure is
 * reconstructed on load by re-inserting each entry. This keeps the on-disk
 * representation compact and avoids encoding implementation details of the
 * internal tree layout.
 */
export interface SerializedTrie {
  /** Pairs of `[lowercasedKey, values[]]` for every inserted key. */
  entries: [string, unknown[]][];
}

/**
 * Internal trie node.
 *
 * The `children` map is always present (even when empty) to keep the
 * descent loop branch-free, while `values` is lazily initialized so
 * interior nodes without a terminating key pay no memory cost for an
 * empty array.
 */
interface TrieNode<V> {
  children: Map<string, TrieNode<V>>;
  values?: V[];
}

/**
 * Factory for a fresh, empty trie node.
 *
 * Kept as a standalone helper so both the root constructor initializer and
 * the insertion path allocate nodes through a single, consistent shape.
 */
function createNode<V>(): TrieNode<V> {
  return { children: new Map() };
}

/**
 * Case-insensitive prefix trie.
 *
 * The value type defaults to `string`, which matches the most common caller
 * (mapping distinct display values to row ids). Empty-string prefix or
 * substring queries are treated as a wildcard that returns every stored
 * value — useful when the UI wants to list "all matches" before the user
 * has typed anything.
 *
 * @typeParam V - Type of the payload stored under each key.
 */
export class Trie<V = string> {
  // Root of the prefix tree. Always present even before any insertion.
  private root: TrieNode<V> = createNode<V>();
  /** Parallel flat store for substring scans and for `size()` counting. */
  private keys: Map<string, V[]> = new Map();

  /**
   * Inserts `value` under the lower-cased form of `key`.
   *
   * The same key may be inserted multiple times — each call appends to the
   * key's value list rather than replacing it. Uppercase, mixed, and lower
   * case inputs all collapse to the same bucket.
   *
   * @param key   Arbitrary string key (case is preserved only for the caller;
   *              internally everything is lower-cased).
   * @param value Payload to associate with this key.
   */
  insert(key: string, value: V): void {
    const lower = key.toLowerCase();

    // Walk/create nodes for each character of the key, growing the tree on
    // demand. This is the classic trie descent and is O(key.length).
    let node = this.root;
    for (const ch of lower) {
      let next = node.children.get(ch);
      if (!next) {
        next = createNode<V>();
        node.children.set(ch, next);
      }
      node = next;
    }
    // Attach the value list to the terminal node so prefix search can pick
    // it up when it descends to (or through) this exact depth.
    if (!node.values) node.values = [];
    node.values.push(value);

    // Mirror the insertion into the flat store so substring search doesn't
    // have to re-traverse the tree and so size() stays O(1).
    const existing = this.keys.get(lower);
    if (existing) existing.push(value);
    else this.keys.set(lower, [value]);
  }

  /**
   * Returns every value whose key (lower-cased) starts with `prefix`.
   *
   * The empty string is a valid prefix and returns every stored value — a
   * deliberate convenience for UIs that want to show "all matches" before
   * the user has typed anything.
   *
   * @param prefix Case-insensitive prefix to search for.
   * @returns Values in descent order; duplicates are preserved.
   */
  searchByPrefix(prefix: string): V[] {
    const lower = prefix.toLowerCase();

    // Descend to the node representing the prefix. Any missing character
    // along the path means no key starts with this prefix, so we short-circuit.
    let node = this.root;
    for (const ch of lower) {
      const next = node.children.get(ch);
      if (!next) return [];
      node = next;
    }
    // Every key reachable from this node begins with the prefix, so gather
    // the full subtree's payload into a flat array.
    const out: V[] = [];
    collect(node, out);
    return out;
  }

  /**
   * Returns every value whose key (lower-cased) contains `substring`.
   *
   * Implemented as a linear scan over the flat key store rather than a
   * specialized suffix structure — the search-index column spec only needs
   * correctness here, and distinct value counts are small enough that the
   * scan is not a hot path.
   *
   * @param substring Case-insensitive substring to search for.
   * @returns Values across all matching keys; duplicates are preserved.
   */
  searchBySubstring(substring: string): V[] {
    const needle = substring.toLowerCase();
    if (needle === '') {
      // An empty needle is treated as a wildcard so callers can reuse the
      // same API for "all values" without an extra conditional.
      const out: V[] = [];
      for (const vs of this.keys.values()) out.push(...vs);
      return out;
    }
    // Walk every known key and pull its payload when the substring matches.
    // Distinct key counts are bounded by the number of distinct column values.
    const out: V[] = [];
    for (const [key, vs] of this.keys) {
      if (key.includes(needle)) out.push(...vs);
    }
    return out;
  }

  /**
   * Returns the number of distinct (lower-cased) keys currently stored.
   *
   * Because the flat store de-duplicates keys by their lower-cased form,
   * inserting `"Alice"` and `"ALICE"` and `"alice"` still reports size `1`.
   */
  size(): number {
    return this.keys.size;
  }

  /**
   * Produces a JSON-safe snapshot of every key/value pair.
   *
   * Values are copied into a fresh array so that mutations to the returned
   * payload cannot reach back into the live trie — important because the
   * result is typically handed to `JSON.stringify` for persistence.
   *
   * @returns A {@link SerializedTrie} suitable for `JSON.stringify`.
   */
  serialize(): SerializedTrie {
    const entries: [string, unknown[]][] = [];
    for (const [key, vs] of this.keys) entries.push([key, [...vs]]);
    return { entries };
  }

  /**
   * Rebuilds a trie from a {@link serialize} payload.
   *
   * The tree structure is re-derived by replaying each key's insertions,
   * which keeps the persisted form free of implementation-specific layout
   * and guarantees that a round-trip uses the same invariants as a fresh
   * build.
   *
   * @param data Payload previously produced by {@link Trie.serialize}.
   * @returns A fully populated `Trie<V>` equivalent to the original.
   */
  static deserialize<V>(data: SerializedTrie): Trie<V> {
    const t = new Trie<V>();
    for (const [key, vs] of data.entries) {
      for (const v of vs as V[]) t.insert(key, v);
    }
    return t;
  }
}

/**
 * Depth-first collection of every value found in the subtree rooted at
 * `node`, appended to `out`.
 *
 * Used by {@link Trie.searchByPrefix} after descending to the prefix's
 * terminal node. The traversal order is deterministic (Map iteration
 * preserves insertion order) but callers should not rely on it beyond
 * "all values are returned".
 */
function collect<V>(node: TrieNode<V>, out: V[]): void {
  if (node.values) out.push(...node.values);
  for (const child of node.children.values()) collect(child, out);
}
