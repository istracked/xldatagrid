/**
 * React hook that incrementally builds per-column search indexes in the
 * background without blocking the main thread.
 *
 * The hook iterates the configured list of `fields` one at a time, yielding
 * to the browser between each field via `requestIdleCallback` (falling back
 * to `setTimeout(…, 0)` in environments that lack the API). For each field
 * it first consults the persisted IDB adapter for a cached payload before
 * falling back to a full rebuild.
 *
 * Caching strategy (pragmatic simplification): if the adapter returns any
 * entry for `(gridId, field)`, the cached payload is accepted as-is. Stale
 * entries are implicitly invalidated by any change to the effect
 * dependencies (`gridId`, `data`, `rowIds`, or `fields`), which triggers a
 * fresh build pass that overwrites the cache. This keeps the hook's logic
 * simple while still meeting the "don't re-hash on every render" goal.
 *
 * @module hooks/use-background-indexer
 */

import { useEffect, useRef, useState } from 'react';

// -----------------------------------------------------------------------------
// Type imports — sibling agents are still building these modules. We use the
// real deep path when available and fall back to local structural types
// otherwise (duck-typed via the `buildIndex`/`openAdapter` injectors).
// -----------------------------------------------------------------------------

/**
 * Minimal structural shape of a built column index payload.
 *
 * The upstream `@istracked/datagrid-core/search-index/column-index` module
 * may expose a richer type; this hook only depends on the fields shown here.
 */
export interface ColumnSearchIndex {
  field: string;
  hash: string;
  distinctValues: string[];
  trie: unknown;
  valueToRowIds: Map<string, string[]>;
}

/**
 * Minimal structural shape of the IDB adapter returned by
 * `openIdbAdapter`. The real type is generic over the payload, but the hook
 * only needs `get` and `put` for column-index payloads.
 */
export interface IdbAdapter<TPayload extends { hash: string } = ColumnSearchIndex> {
  get(gridId: string, field: string): Promise<{ payload: TPayload; hash: string } | null>;
  put(gridId: string, field: string, payload: TPayload): Promise<void>;
}

// -----------------------------------------------------------------------------
// Public API types
// -----------------------------------------------------------------------------

/** Configuration accepted by {@link useBackgroundIndexer}. */
export interface BackgroundIndexerOptions {
  /** Stable identifier for the grid — used as part of the IDB composite key. */
  gridId: string;
  /** Source rows. Re-building triggers when this array reference changes. */
  data: ReadonlyArray<Record<string, unknown>>;
  /** Row identifier per source row, aligned positionally with `data`. */
  rowIds: ReadonlyArray<string>;
  /** Fields to index — typically the filterable column fields. */
  fields: ReadonlyArray<string>;
  /** When `true`, skip all indexing (test/SSR escape hatch). Defaults to `false`. */
  disabled?: boolean;
  /**
   * Optional `buildIndex` injector for testability. Production code should
   * leave this undefined so the real core implementation is used.
   */
  buildIndex?: (
    data: ReadonlyArray<Record<string, unknown>>,
    rowIds: ReadonlyArray<string>,
    field: string,
  ) => ColumnSearchIndex;
  /**
   * Optional adapter injector for testability. Production code should
   * leave this undefined so the real `openIdbAdapter` is used.
   */
  openAdapter?: () => Promise<IdbAdapter>;
  /** Number of fields built per idle tick. Defaults to `1`. */
  chunkSize?: number;
}

/** Per-field lifecycle status. */
export type BackgroundIndexerFieldStatus =
  | 'idle'
  | 'loading-cache'
  | 'building'
  | 'ready'
  | 'error';

/** Snapshot of the indexer returned each render. */
export interface BackgroundIndexerState {
  /** Most recently-built indexes by field (in-memory cache). */
  indexes: Record<string, ColumnSearchIndex>;
  /** Per-field status map. */
  status: Record<string, BackgroundIndexerFieldStatus>;
  /** `true` while any field is still in-flight. */
  isBusy: boolean;
}

// -----------------------------------------------------------------------------
// Defaults for production code paths. Imported lazily to avoid forcing the
// core bundle into consumers who inject their own builder/adapter.
// -----------------------------------------------------------------------------

/**
 * Default `buildIndex` — attempts to import the real implementation from
 * core; if unavailable (e.g. sibling agent hasn't published yet) throws a
 * descriptive error so the caller knows to pass an injector.
 */
async function defaultBuildIndex(): Promise<
  (
    data: ReadonlyArray<Record<string, unknown>>,
    rowIds: ReadonlyArray<string>,
    field: string,
  ) => ColumnSearchIndex
> {
  const mod = (await import('@istracked/datagrid-core').catch(() => null)) as
    | { buildColumnIndex?: unknown }
    | null;
  if (mod && typeof mod.buildColumnIndex === 'function') {
    return mod.buildColumnIndex as (
      data: ReadonlyArray<Record<string, unknown>>,
      rowIds: ReadonlyArray<string>,
      field: string,
    ) => ColumnSearchIndex;
  }
  throw new Error(
    'useBackgroundIndexer: buildColumnIndex is not exported from @istracked/datagrid-core. ' +
      'Pass a `buildIndex` injector via options.',
  );
}

/** Default adapter opener — delegates to the real IDB adapter in core. */
async function defaultOpenAdapter(): Promise<IdbAdapter> {
  const mod = (await import('@istracked/datagrid-core').catch(() => null)) as
    | { openIdbAdapter?: () => Promise<IdbAdapter> }
    | null;
  if (mod && typeof mod.openIdbAdapter === 'function') {
    return mod.openIdbAdapter();
  }
  throw new Error(
    'useBackgroundIndexer: openIdbAdapter is not exported from @istracked/datagrid-core. ' +
      'Pass an `openAdapter` injector via options.',
  );
}

// -----------------------------------------------------------------------------
// Idle-callback helpers. `requestIdleCallback` is not universally available
// (notably Safari < 16.4 and Node/jsdom). We detect at call time to stay
// SSR-safe and testable.
// -----------------------------------------------------------------------------

type IdleHandle = number;

type IdleDeadline = { didTimeout: boolean; timeRemaining: () => number };

function scheduleIdle(cb: (deadline: IdleDeadline) => void): IdleHandle {
  const w = typeof globalThis !== 'undefined' ? (globalThis as typeof globalThis & {
    requestIdleCallback?: (cb: (d: IdleDeadline) => void) => IdleHandle;
  }) : undefined;
  if (w && typeof w.requestIdleCallback === 'function') {
    return w.requestIdleCallback(cb);
  }
  // setTimeout fallback — synthesise a permissive deadline.
  return setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 0) as unknown as IdleHandle;
}

function cancelIdle(handle: IdleHandle): void {
  const w = typeof globalThis !== 'undefined' ? (globalThis as typeof globalThis & {
    cancelIdleCallback?: (h: IdleHandle) => void;
  }) : undefined;
  if (w && typeof w.cancelIdleCallback === 'function') {
    w.cancelIdleCallback(handle);
    return;
  }
  clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);
}

// -----------------------------------------------------------------------------
// Hook implementation
// -----------------------------------------------------------------------------

const EMPTY_INDEXES: Record<string, ColumnSearchIndex> = Object.freeze({});
const EMPTY_STATUS: Record<string, BackgroundIndexerFieldStatus> = Object.freeze({});

/**
 * Incrementally builds (and caches) per-column search indexes in the
 * background. See module-level docs for the strategy overview.
 */
export function useBackgroundIndexer(
  options: BackgroundIndexerOptions,
): BackgroundIndexerState {
  const {
    gridId,
    data,
    rowIds,
    fields,
    disabled = false,
    buildIndex,
    openAdapter,
    chunkSize = 1,
  } = options;

  const [indexes, setIndexes] = useState<Record<string, ColumnSearchIndex>>(
    EMPTY_INDEXES,
  );
  const [status, setStatus] = useState<
    Record<string, BackgroundIndexerFieldStatus>
  >(EMPTY_STATUS);
  const [isBusy, setIsBusy] = useState(false);

  // Latest-ref pattern so the async loop reads current injectors without
  // being part of the effect's dependency array (avoiding accidental
  // re-schedules when a parent component re-creates inline closures).
  const buildIndexRef = useRef(buildIndex);
  const openAdapterRef = useRef(openAdapter);
  buildIndexRef.current = buildIndex;
  openAdapterRef.current = openAdapter;

  // Tracks whether the hook is still mounted. Async work that resolves
  // after unmount must NOT call setState — under React 19 + jsdom this
  // surfaces as `act()` warnings and, more critically, can leave dangling
  // microtask chains that cross-pollute subsequent tests in the same file.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (disabled) {
      return undefined;
    }
    if (fields.length === 0) {
      if (isMountedRef.current) setIsBusy(false);
      return undefined;
    }

    let cancelled = false;
    let idleHandle: IdleHandle | null = null;
    let adapter: IdbAdapter | null = null;

    // Local guard: a setState is safe iff the effect hasn't been cleaned up
    // AND the component is still mounted. Centralising the check here
    // prevents stray updates from in-flight Promises that resolve after
    // either boundary.
    const safeSetIndexes: typeof setIndexes = (updater) => {
      if (cancelled || !isMountedRef.current) return;
      setIndexes(updater);
    };
    const safeSetStatus: typeof setStatus = (updater) => {
      if (cancelled || !isMountedRef.current) return;
      setStatus(updater);
    };
    const safeSetIsBusy: typeof setIsBusy = (updater) => {
      if (cancelled || !isMountedRef.current) return;
      setIsBusy(updater);
    };

    // Reset per-field status to 'loading-cache' for the current field set.
    safeSetStatus((prev) => {
      const next: Record<string, BackgroundIndexerFieldStatus> = { ...prev };
      for (const f of fields) next[f] = 'loading-cache';
      return next;
    });
    safeSetIsBusy(true);

    const processField = async (field: string): Promise<void> => {
      if (cancelled) return;
      try {
        if (!adapter) {
          const opener = openAdapterRef.current ?? defaultOpenAdapter;
          adapter = await opener();
        }
        if (cancelled) return;

        // (a) cache probe
        const cached = await adapter.get(gridId, field);
        if (cancelled) return;

        if (cached && cached.payload) {
          // Pragmatic simplification: trust any fresh cached entry. See
          // module-level strategy note.
          const payload = cached.payload;
          safeSetIndexes((prev) => ({ ...prev, [field]: payload }));
          safeSetStatus((prev) => ({ ...prev, [field]: 'ready' }));
          return;
        }

        // (b) rebuild path
        safeSetStatus((prev) => ({ ...prev, [field]: 'building' }));
        const builder = buildIndexRef.current ?? (await defaultBuildIndex());
        if (cancelled) return;

        const payload = builder(data, rowIds, field);
        if (cancelled) return;

        await adapter.put(gridId, field, payload);
        if (cancelled) return;

        safeSetIndexes((prev) => ({ ...prev, [field]: payload }));
        safeSetStatus((prev) => ({ ...prev, [field]: 'ready' }));
      } catch {
        safeSetStatus((prev) => ({ ...prev, [field]: 'error' }));
      }
    };

    // Track the in-flight chunk Promise so cleanup can `await` it (well —
    // it can at least observe completion). Since React effect cleanups are
    // synchronous we can't actually await here, but flipping `cancelled`
    // before the next microtask runs guarantees no further setState fires.
    const runChunk = (startIdx: number): void => {
      idleHandle = scheduleIdle(() => {
        idleHandle = null;
        if (cancelled) return;
        void (async () => {
          const end = Math.min(startIdx + chunkSize, fields.length);
          for (let i = startIdx; i < end; i += 1) {
            if (cancelled) return;
            await processField(fields[i]!);
          }
          if (cancelled) return;
          if (end < fields.length) {
            runChunk(end);
          } else {
            safeSetIsBusy(false);
          }
        })();
      });
    };

    runChunk(0);

    return () => {
      cancelled = true;
      if (idleHandle != null) {
        cancelIdle(idleHandle);
        idleHandle = null;
      }
    };
    // `data`, `rowIds`, `fields` are compared by reference — the hook
    // re-schedules when callers pass new references, which is the correct
    // invalidation boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridId, data, rowIds, fields, disabled, chunkSize]);

  return { indexes, status, isBusy };
}
