/**
 * Unit tests for {@link useBackgroundIndexer}.
 *
 * Contracts protected by this file:
 * - `disabled: true` and empty `fields` are complete no-ops: neither the
 *   builder nor the adapter opener is touched, and `isBusy` settles to
 *   `false`.
 * - Each field is built exactly once per effect pass and in the order
 *   declared; the resulting `indexes` map is keyed by field.
 * - `buildIndex` is never called during render — all work is deferred to
 *   the idle callback.
 * - Unmounting while idle callbacks are still pending cancels them and
 *   leaves no stray setState to warn `act()` on subsequent tests.
 * - A cached payload short-circuits the rebuild path and is surfaced
 *   verbatim (including its prior `hash`).
 *
 * Uses spy injectors for both `buildIndex` and `openAdapter` so no real
 * IndexedDB round-trip is required — the tests exercise the scheduling,
 * caching, and cancellation contracts declaratively.
 *
 * Historical note: an earlier version of this file relied on
 * `vi.useFakeTimers()` to drive `requestIdleCallback` manually, but the
 * combination of fake timers + React 19's internal scheduling + async
 * effect cleanups caused cross-test hangs. We instead use a stubbed
 * `requestIdleCallback` that synchronously calls `setTimeout(cb, 0)` on
 * real timers and wait for the hook to settle via `waitFor`. The hook
 * itself guards every setState behind an `isMountedRef`/`cancelled`
 * check so stray async work cannot bleed across test boundaries, and
 * memoises its array deps by content so the inline `fields={[…]}`
 * literals these tests pass cannot trigger an infinite reschedule loop.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useBackgroundIndexer,
  type ColumnSearchIndex,
  type IdbAdapter,
} from '../hooks/use-background-indexer';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

interface CachedEntry {
  payload: ColumnSearchIndex;
  hash: string;
}

function makeIndex(field: string, hash = `h-${field}`): ColumnSearchIndex {
  return {
    field,
    hash,
    distinctValues: [`${field}-a`, `${field}-b`],
    trie: null,
    valueToRowIds: new Map<string, string[]>([
      [`${field}-a`, ['r1']],
      [`${field}-b`, ['r2']],
    ]),
  };
}

function makeAdapterSpy(
  seed: Record<string, CachedEntry> = {},
): IdbAdapter & {
  _get: ReturnType<typeof vi.fn>;
  _put: ReturnType<typeof vi.fn>;
  _store: Map<string, CachedEntry>;
} {
  const store = new Map<string, CachedEntry>(Object.entries(seed));
  const key = (gridId: string, field: string) => `${gridId}::${field}`;

  const get = vi.fn(async (gridId: string, field: string) => {
    return store.get(key(gridId, field)) ?? null;
  });
  const put = vi.fn(async (gridId: string, field: string, payload: ColumnSearchIndex) => {
    store.set(key(gridId, field), { payload, hash: payload.hash });
  });

  return {
    get,
    put,
    _get: get,
    _put: put,
    _store: store,
  } as IdbAdapter & {
    _get: ReturnType<typeof vi.fn>;
    _put: ReturnType<typeof vi.fn>;
    _store: Map<string, CachedEntry>;
  };
}

// ---------------------------------------------------------------------------
// Idle-callback stub — routes to real setTimeout so the hook's scheduling
// runs to completion under normal async tick semantics.
// ---------------------------------------------------------------------------

let cancelIdleCallbackSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  let counter = 0;
  const timeouts = new Map<number, ReturnType<typeof setTimeout>>();

  vi.stubGlobal('requestIdleCallback', ((cb: (d: { didTimeout: boolean; timeRemaining: () => number }) => void) => {
    counter += 1;
    const id = counter;
    const t = setTimeout(() => {
      timeouts.delete(id);
      cb({ didTimeout: false, timeRemaining: () => 50 });
    }, 0);
    timeouts.set(id, t);
    return id;
  }) as unknown as typeof requestIdleCallback);

  cancelIdleCallbackSpy = vi.fn((id: number) => {
    const t = timeouts.get(id);
    if (t) {
      clearTimeout(t);
      timeouts.delete(id);
    }
  });
  vi.stubGlobal('cancelIdleCallback', cancelIdleCallbackSpy as unknown as typeof cancelIdleCallback);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const DATA: ReadonlyArray<Record<string, unknown>> = [
  { id: 'r1', name: 'Alice', city: 'Paris', age: 30 },
  { id: 'r2', name: 'Bob', city: 'Lyon', age: 25 },
];
const ROW_IDS: ReadonlyArray<string> = ['r1', 'r2'];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// Behaviour of the public hook surface. Grouped into a single suite
// because every test shares the same idle-callback stub setup.
describe('useBackgroundIndexer', () => {
  // `disabled: true` must be a total no-op: neither injector is invoked,
  // no state transitions fire, and `isBusy` remains false.
  it('does not invoke buildIndex or openAdapter when disabled', async () => {
    const buildIndex = vi.fn(makeIndex);
    const openAdapter = vi.fn(async () => makeAdapterSpy());

    const { result } = renderHook(() =>
      useBackgroundIndexer({
        gridId: 'g1',
        data: DATA,
        rowIds: ROW_IDS,
        fields: ['name', 'city'],
        disabled: true,
        buildIndex,
        openAdapter,
      }),
    );

    // Give any accidental work a chance to schedule.
    await new Promise((r) => setTimeout(r, 10));

    expect(buildIndex).not.toHaveBeenCalled();
    expect(openAdapter).not.toHaveBeenCalled();
    expect(result.current.isBusy).toBe(false);
    expect(result.current.indexes).toEqual({});
  });

  // An empty `fields` array must short-circuit before scheduling any
  // idle work and must normalise `isBusy` to false so lingering flags
  // from prior passes cannot leak through.
  it('does not call buildIndex and stays idle when fields is empty', async () => {
    const buildIndex = vi.fn(makeIndex);
    const openAdapter = vi.fn(async () => makeAdapterSpy());

    const { result } = renderHook(() =>
      useBackgroundIndexer({
        gridId: 'g1',
        data: DATA,
        rowIds: ROW_IDS,
        fields: [],
        buildIndex,
        openAdapter,
      }),
    );

    await new Promise((r) => setTimeout(r, 10));

    expect(buildIndex).not.toHaveBeenCalled();
    expect(openAdapter).not.toHaveBeenCalled();
    expect(result.current.isBusy).toBe(false);
  });

  // Exercise the happy path end-to-end: every field should traverse
  // the rebuild branch exactly once, in declaration order, and the
  // resulting indexes map should contain every requested key.
  it('calls buildIndex exactly once per field after flushing idle callbacks', async () => {
    const buildIndex = vi.fn((_data, _rowIds, field: string) => makeIndex(field));
    const adapter = makeAdapterSpy();
    const openAdapter = vi.fn(async () => adapter);
    const fields = ['name', 'city', 'age'];

    const { result } = renderHook(() =>
      useBackgroundIndexer({
        gridId: 'g1',
        data: DATA,
        rowIds: ROW_IDS,
        fields,
        buildIndex,
        openAdapter,
      }),
    );

    await waitFor(() => {
      expect(result.current.isBusy).toBe(false);
      expect(buildIndex).toHaveBeenCalledTimes(3);
    });
    expect(buildIndex.mock.calls.map((c) => c[2])).toEqual(['name', 'city', 'age']);
    expect(Object.keys(result.current.indexes).sort()).toEqual(['age', 'city', 'name']);
  });

  // Index construction must happen off the render path. Asserting the
  // builder has zero synchronous invocations protects consumers from
  // jank introduced by accidentally running the heavy builder during
  // commit.
  it('does not call buildIndex synchronously during render', () => {
    const buildIndex = vi.fn(makeIndex);
    const openAdapter = vi.fn(async () => makeAdapterSpy());

    const { unmount } = renderHook(() =>
      useBackgroundIndexer({
        gridId: 'g1',
        data: DATA,
        rowIds: ROW_IDS,
        fields: ['name', 'city', 'age'],
        buildIndex,
        openAdapter,
      }),
    );

    // Synchronously after render, before any idle callback has fired.
    expect(buildIndex).toHaveBeenCalledTimes(0);

    unmount();
  });

  // Consumer-facing shape check: after the pipeline drains the
  // `indexes` and `status` maps should be populated per field with the
  // payloads produced by the builder.
  it('exposes built indexes keyed by field after flushing', async () => {
    const buildIndex = vi.fn((_data, _rowIds, field: string) => makeIndex(field));
    const adapter = makeAdapterSpy();
    const openAdapter = vi.fn(async () => adapter);

    const { result } = renderHook(() =>
      useBackgroundIndexer({
        gridId: 'g1',
        data: DATA,
        rowIds: ROW_IDS,
        fields: ['name', 'city'],
        buildIndex,
        openAdapter,
      }),
    );

    await waitFor(() => {
      expect(result.current.isBusy).toBe(false);
      expect(result.current.status.name).toBe('ready');
      expect(result.current.status.city).toBe('ready');
    });
    expect(result.current.indexes.name).toBeDefined();
    expect(result.current.indexes.name.field).toBe('name');
    expect(result.current.indexes.city).toBeDefined();
    expect(result.current.indexes.city.field).toBe('city');
  });

  // Cleanup contract: unmounting before the idle callback fires must
  // route through `cancelIdleCallback` so no setState lands after the
  // hook has detached. The spy asserts the cancellation pathway was
  // actually taken.
  it('cancels pending idle callbacks on unmount', async () => {
    const buildIndex = vi.fn(makeIndex);
    const openAdapter = vi.fn(async () => makeAdapterSpy());

    const { unmount } = renderHook(() =>
      useBackgroundIndexer({
        gridId: 'g1',
        data: DATA,
        rowIds: ROW_IDS,
        fields: ['name', 'city', 'age'],
        buildIndex,
        openAdapter,
      }),
    );

    // Unmount synchronously before the idle callback has fired.
    unmount();

    expect(cancelIdleCallbackSpy).toHaveBeenCalled();
  });

  // Cache-hit branch: a seeded adapter should satisfy the probe for
  // `city` without invoking the builder, while the uncached `name`
  // field still goes through the rebuild path. Verifies the pragmatic
  // "trust the cache" strategy documented on the hook.
  it('uses cached payload when adapter returns a hit', async () => {
    const cachedCity = makeIndex('city', 'cached-city-hash');
    const adapter = makeAdapterSpy({
      'g1::city': { payload: cachedCity, hash: cachedCity.hash },
    });
    const openAdapter = vi.fn(async () => adapter);
    const buildIndex = vi.fn((_data, _rowIds, field: string) => makeIndex(field));

    const { result } = renderHook(() =>
      useBackgroundIndexer({
        gridId: 'g1',
        data: DATA,
        rowIds: ROW_IDS,
        fields: ['city', 'name'],
        buildIndex,
        openAdapter,
      }),
    );

    await waitFor(() => {
      expect(result.current.isBusy).toBe(false);
      expect(result.current.status.city).toBe('ready');
      expect(result.current.status.name).toBe('ready');
    });

    // `city` was cached → buildIndex should only have been called for `name`.
    expect(buildIndex).toHaveBeenCalledTimes(1);
    expect(buildIndex).toHaveBeenCalledWith(DATA, ROW_IDS, 'name');

    expect(result.current.indexes.city.distinctValues).toEqual(
      cachedCity.distinctValues,
    );
    expect(result.current.indexes.city.hash).toBe('cached-city-hash');
    expect(result.current.indexes.name.field).toBe('name');
  });
});
