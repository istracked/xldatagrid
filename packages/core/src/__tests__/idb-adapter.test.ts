/**
 * Contract suite for the IndexedDB persistence adapter.
 *
 * Exercised against a `fake-indexeddb` global wired in by `vitest.setup.ts`,
 * these tests cover CRUD round-trips, overwrite semantics (including the
 * `savedAt` timestamp), the three clear granularities (per-row, per-grid,
 * all), and the SSR fallback behaviour when IndexedDB is absent from the
 * environment. Together they protect the cache layer's correctness and the
 * adapter's promise never to surface IndexedDB errors for the common
 * "missing row" case.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  openIdbAdapter,
  createNoopIdbAdapter,
  IdbAdapter,
} from '../search-index/idb-adapter';

// ---------------------------------------------------------------------------
// Shape of a fake serialized column-index payload. Mirrors the real one
// loosely -- the adapter is generic over any `{ hash: string; ... }` shape.
// ---------------------------------------------------------------------------
interface FakePayload {
  field: string;
  distinctValues: string[];
  entries: Array<[string, string[]]>;
  trie: { root: Record<string, unknown> };
  hash: string;
}

function makePayload(overrides: Partial<FakePayload> = {}): FakePayload {
  return {
    field: 'name',
    distinctValues: ['alice', 'bob'],
    entries: [
      ['alice', ['r1']],
      ['bob', ['r2']],
    ],
    trie: { root: { a: { $: ['r1'] }, b: { $: ['r2'] } } },
    hash: 'hash-abc',
    ...overrides,
  };
}

/** Generate a unique dbName per test to avoid cross-test contamination. */
function uniqueDbName(): string {
  return `test-db-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ---------------------------------------------------------------------------
// Live adapter (backed by fake-indexeddb via vitest.setup.ts)
// ---------------------------------------------------------------------------

// Covers the baseline write/read behaviour of the real (fake-idb-backed)
// adapter: payload fidelity, missing-row handling, and overwrite semantics.
describe('openIdbAdapter — CRUD round-trips', () => {
  let adapter: IdbAdapter<FakePayload>;

  beforeEach(async () => {
    // Each test gets its own database so state cannot leak between tests.
    adapter = await openIdbAdapter<FakePayload>(uniqueDbName());
  });

  afterEach(async () => {
    await adapter.close();
  });

  // The canonical read-after-write test: every field the interface promises
  // to expose must make it back out of the store intact.
  it('put then get round-trips the payload (hash + arbitrary fields)', async () => {
    const payload = makePayload({ hash: 'h1' });
    await adapter.put('grid-1', 'name', payload);

    const row = await adapter.get('grid-1', 'name');
    expect(row).not.toBeNull();
    expect(row!.key).toBe('grid-1::name');
    expect(row!.gridId).toBe('grid-1');
    expect(row!.field).toBe('name');
    expect(row!.hash).toBe('h1');
    expect(row!.payload).toEqual(payload);
    expect(typeof row!.savedAt).toBe('number');
  });

  // Missing rows must resolve `null` rather than throw — callers always
  // branch on the nullish result instead of try/catching.
  it('get returns null when the key is absent', async () => {
    const row = await adapter.get('missing-grid', 'missing-field');
    expect(row).toBeNull();
  });

  // Second write at the same key must replace the first, bumping both the
  // hash (for downstream change detection) and the stored timestamp.
  it('put overwrites the existing entry (hash + savedAt update)', async () => {
    await adapter.put('g', 'name', makePayload({ hash: 'h1' }));
    const first = await adapter.get('g', 'name');

    // Advance the clock so `savedAt` is guaranteed to differ.
    const originalNow = Date.now;
    const frozen = first!.savedAt + 1_000;
    vi.spyOn(Date, 'now').mockImplementation(() => frozen);

    try {
      await adapter.put('g', 'name', makePayload({ hash: 'h2' }));
      const second = await adapter.get('g', 'name');

      expect(second!.hash).toBe('h2');
      expect(second!.savedAt).toBe(frozen);
      expect(second!.savedAt).toBeGreaterThan(first!.savedAt);
    } finally {
      vi.mocked(Date.now).mockRestore?.();
      // Safety: restore if spyOn didn't cover it.
      Date.now = originalNow;
    }
  });
});

// Protects the three-level clear API: single row, whole grid, and global
// wipe — each with the appropriate blast radius.
describe('openIdbAdapter — clear semantics', () => {
  let adapter: IdbAdapter<FakePayload>;

  beforeEach(async () => {
    // Seed the store with rows spanning two grids so the scoping tests have
    // both matching and non-matching data to discriminate.
    adapter = await openIdbAdapter<FakePayload>(uniqueDbName());
    await adapter.put('grid-a', 'name', makePayload({ hash: 'a-name' }));
    await adapter.put('grid-a', 'email', makePayload({ hash: 'a-email' }));
    await adapter.put('grid-b', 'name', makePayload({ hash: 'b-name' }));
  });

  afterEach(async () => {
    await adapter.close();
  });

  // Per-row clear must be surgical: neither siblings in the same grid nor
  // other grids' rows may be affected.
  it('clear(gridId, field) removes only that row and leaves siblings intact', async () => {
    await adapter.clear('grid-a', 'name');

    expect(await adapter.get('grid-a', 'name')).toBeNull();
    expect(await adapter.get('grid-a', 'email')).not.toBeNull();
    expect(await adapter.get('grid-b', 'name')).not.toBeNull();
  });

  // Per-grid clear relies on the `by-grid` secondary index and must delete
  // every row for the named grid without touching other grids.
  it("clearGrid(gridId) removes all rows for that grid but leaves other grids' rows", async () => {
    await adapter.clearGrid('grid-a');

    expect(await adapter.get('grid-a', 'name')).toBeNull();
    expect(await adapter.get('grid-a', 'email')).toBeNull();
    expect(await adapter.get('grid-b', 'name')).not.toBeNull();
  });

  // Global clear is an explicit escape hatch for full cache invalidation.
  it('clearAll empties the store', async () => {
    await adapter.clearAll();

    expect(await adapter.get('grid-a', 'name')).toBeNull();
    expect(await adapter.get('grid-a', 'email')).toBeNull();
    expect(await adapter.get('grid-b', 'name')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// No-op adapter (SSR fallback, exercised both directly and via the factory)
// ---------------------------------------------------------------------------

// Directly exercises the exported no-op factory so the fallback has its
// own test coverage independent of the factory branching in `openIdbAdapter`.
describe('createNoopIdbAdapter — SSR fallback behaviours', () => {
  // Every method must resolve successfully so call sites can remain
  // environment-agnostic without try/catch boilerplate.
  it('get resolves null and mutators resolve without throwing', async () => {
    const adapter = createNoopIdbAdapter<FakePayload>();
    expect(await adapter.get('g', 'f')).toBeNull();
    await expect(adapter.put('g', 'f', makePayload())).resolves.toBeUndefined();
    await expect(adapter.clear('g', 'f')).resolves.toBeUndefined();
    await expect(adapter.clearGrid('g')).resolves.toBeUndefined();
    await expect(adapter.clearAll()).resolves.toBeUndefined();
    await expect(adapter.close()).resolves.toBeUndefined();
  });
});

// Exercises the factory's environment check: when `indexedDB` is missing,
// callers must transparently get the no-op adapter.
describe('openIdbAdapter — when indexedDB is undefined', () => {
  beforeEach(() => {
    // Stubbing the global simulates a non-browser environment (SSR, Node
    // without an IndexedDB shim) without requiring a separate test runner.
    vi.stubGlobal('indexedDB', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Sanity-check the two call paths that matter most to consumers: a read
  // that returns null and a write that does not throw.
  it('returns a no-op adapter whose get is null and put does not throw', async () => {
    const adapter = await openIdbAdapter<FakePayload>(uniqueDbName());
    expect(await adapter.get('g', 'f')).toBeNull();
    await expect(adapter.put('g', 'f', makePayload())).resolves.toBeUndefined();
    await adapter.close();
  });
});
