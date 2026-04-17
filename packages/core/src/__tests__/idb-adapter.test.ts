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

describe('openIdbAdapter — CRUD round-trips', () => {
  let adapter: IdbAdapter<FakePayload>;

  beforeEach(async () => {
    adapter = await openIdbAdapter<FakePayload>(uniqueDbName());
  });

  afterEach(async () => {
    await adapter.close();
  });

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

  it('get returns null when the key is absent', async () => {
    const row = await adapter.get('missing-grid', 'missing-field');
    expect(row).toBeNull();
  });

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

describe('openIdbAdapter — clear semantics', () => {
  let adapter: IdbAdapter<FakePayload>;

  beforeEach(async () => {
    adapter = await openIdbAdapter<FakePayload>(uniqueDbName());
    await adapter.put('grid-a', 'name', makePayload({ hash: 'a-name' }));
    await adapter.put('grid-a', 'email', makePayload({ hash: 'a-email' }));
    await adapter.put('grid-b', 'name', makePayload({ hash: 'b-name' }));
  });

  afterEach(async () => {
    await adapter.close();
  });

  it('clear(gridId, field) removes only that row and leaves siblings intact', async () => {
    await adapter.clear('grid-a', 'name');

    expect(await adapter.get('grid-a', 'name')).toBeNull();
    expect(await adapter.get('grid-a', 'email')).not.toBeNull();
    expect(await adapter.get('grid-b', 'name')).not.toBeNull();
  });

  it("clearGrid(gridId) removes all rows for that grid but leaves other grids' rows", async () => {
    await adapter.clearGrid('grid-a');

    expect(await adapter.get('grid-a', 'name')).toBeNull();
    expect(await adapter.get('grid-a', 'email')).toBeNull();
    expect(await adapter.get('grid-b', 'name')).not.toBeNull();
  });

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

describe('createNoopIdbAdapter — SSR fallback behaviours', () => {
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

describe('openIdbAdapter — when indexedDB is undefined', () => {
  beforeEach(() => {
    vi.stubGlobal('indexedDB', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a no-op adapter whose get is null and put does not throw', async () => {
    const adapter = await openIdbAdapter<FakePayload>(uniqueDbName());
    expect(await adapter.get('g', 'f')).toBeNull();
    await expect(adapter.put('g', 'f', makePayload())).resolves.toBeUndefined();
    await adapter.close();
  });
});
