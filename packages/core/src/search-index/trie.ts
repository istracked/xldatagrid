/**
 * Case-insensitive prefix trie with multi-value support.
 *
 * Keys are stored lower-cased so both prefix and substring search are
 * case-insensitive. Each key may carry multiple values (e.g. a display name
 * "Alice" mapping to several row ids). Serialization produces a JSON-safe
 * payload suitable for persisting to IndexedDB.
 *
 * @module search-index/trie
 */

/** JSON-safe serialized form of a {@link Trie}. */
export interface SerializedTrie {
  /** Pairs of `[lowercasedKey, values[]]` for every inserted key. */
  entries: [string, unknown[]][];
}

/** Internal node — lazy `children` map and an optional `values` leaf list. */
interface TrieNode<V> {
  children: Map<string, TrieNode<V>>;
  values?: V[];
}

function createNode<V>(): TrieNode<V> {
  return { children: new Map() };
}

/**
 * Case-insensitive prefix trie. Values are arbitrary (defaults to `string`,
 * typically a rowId). Empty-string prefix / substring queries return every
 * stored value.
 */
export class Trie<V = string> {
  private root: TrieNode<V> = createNode<V>();
  /** Parallel flat store for substring scans and for `size()` counting. */
  private keys: Map<string, V[]> = new Map();

  /** Inserts `value` under the lower-cased form of `key`. */
  insert(key: string, value: V): void {
    const lower = key.toLowerCase();

    // Walk/create nodes for each character of the key
    let node = this.root;
    for (const ch of lower) {
      let next = node.children.get(ch);
      if (!next) {
        next = createNode<V>();
        node.children.set(ch, next);
      }
      node = next;
    }
    // Attach the value list to the terminal node
    if (!node.values) node.values = [];
    node.values.push(value);

    // Maintain the flat store used by substring search + size()
    const existing = this.keys.get(lower);
    if (existing) existing.push(value);
    else this.keys.set(lower, [value]);
  }

  /** Values for any key whose lower-cased form starts with `prefix`. */
  searchByPrefix(prefix: string): V[] {
    const lower = prefix.toLowerCase();

    // Descend to the node representing the prefix
    let node = this.root;
    for (const ch of lower) {
      const next = node.children.get(ch);
      if (!next) return [];
      node = next;
    }
    // Collect values from the subtree rooted at that node
    const out: V[] = [];
    collect(node, out);
    return out;
  }

  /** Values for any key whose lower-cased form contains `substring`. */
  searchBySubstring(substring: string): V[] {
    const needle = substring.toLowerCase();
    if (needle === '') {
      // Empty needle matches every stored value
      const out: V[] = [];
      for (const vs of this.keys.values()) out.push(...vs);
      return out;
    }
    // Linear scan is acceptable here per the spec
    const out: V[] = [];
    for (const [key, vs] of this.keys) {
      if (key.includes(needle)) out.push(...vs);
    }
    return out;
  }

  /** Number of distinct (lower-cased) keys inserted. */
  size(): number {
    return this.keys.size;
  }

  /** Produces a JSON-safe snapshot of every key/value pair. */
  serialize(): SerializedTrie {
    const entries: [string, unknown[]][] = [];
    for (const [key, vs] of this.keys) entries.push([key, [...vs]]);
    return { entries };
  }

  /** Rebuilds a trie from a {@link serialize} payload. */
  static deserialize<V>(data: SerializedTrie): Trie<V> {
    const t = new Trie<V>();
    for (const [key, vs] of data.entries) {
      for (const v of vs as V[]) t.insert(key, v);
    }
    return t;
  }
}

/** Depth-first collection of every value in the subtree. */
function collect<V>(node: TrieNode<V>, out: V[]): void {
  if (node.values) out.push(...node.values);
  for (const child of node.children.values()) collect(child, out);
}
