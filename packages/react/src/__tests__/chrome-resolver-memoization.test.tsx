/**
 * Performance-oriented tests for the chrome row-presentation APIs
 * (`getRowBackground`, `getRowBorder`, `getChromeCellContent`).
 *
 * The resolvers are invoked per rendered row; a naive implementation
 * re-invokes them on every parent re-render even when nothing relevant
 * has changed. For grids with 10k+ rows and expensive consumer
 * resolvers that becomes a perf cliff, so the row container is
 * wrapped in `React.memo` with a shallow comparator and the resolver
 * identities are threaded through unchanged.
 *
 * The invariants we assert here:
 *
 *  1. An identical re-render with the same props must NOT re-invoke
 *     the resolvers — `React.memo` skips row subtrees whose inputs
 *     are referentially stable.
 *
 *  2. A re-render that changes only unrelated chrome state (e.g.
 *     container style / height) must leave the invocation count
 *     unchanged — this is the same property as (1) but re-phrased
 *     against the common "responsive-height" re-render loop.
 *
 *  3. When the underlying row data changes, the resolvers MUST be
 *     re-invoked for each affected row — memoization must not mask
 *     a stale background after a row-level edit.
 */
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { ChromeColumnsConfig } from '@istracked/datagrid-core';
import { DataGrid } from '../DataGrid';

// ────────────────────────────────────────────────────────────────────────────
// Compile-time assertions — these don't run at test time but a regression in
// `ChromeColumnsConfig<TData>` generics will fail the vitest `tsc` pass and,
// because this file is part of the grid test sources, block the PR.
// ────────────────────────────────────────────────────────────────────────────

type _RowForTypes = { id: string; name: string; amount: number };

// Happy path — fields flow through the generic.
const _okConfig: ChromeColumnsConfig<_RowForTypes> = {
  getRowBackground: (row) => row.name,
  getRowBorder: (row) => (row.amount > 0 ? { color: '#000' } : null),
  getChromeCellContent: (row) => ({ text: row.name }),
};
void _okConfig;

const _badConfig: ChromeColumnsConfig<_RowForTypes> = {
  // @ts-expect-error `nonexistent` is not a field on _RowForTypes
  getRowBackground: (row) => row.nonexistent,
};
void _badConfig;

const _wrongReturnType: ChromeColumnsConfig<_RowForTypes> = {
  // @ts-expect-error Must return string | null | undefined, not number
  getRowBackground: (row) => row.amount,
};
void _wrongReturnType;

type TestRow = { id: string; name: string; value: number };

function makeData(count = 3): TestRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    name: `Row ${i + 1}`,
    value: i,
  }));
}

const columns = [
  { id: 'name', field: 'name', title: 'Name' },
  { id: 'value', field: 'value', title: 'Value' },
];

describe('chrome resolver memoization', () => {
  it('skips resolver invocations on an identical re-render', () => {
    const data = makeData(3);
    // Stable reference — the caller owns memoization of the resolver.
    const getRowBackground = vi.fn((row: TestRow) =>
      row.value % 2 === 0 ? '#eeeeee' : null,
    );

    const { rerender } = render(
      <DataGrid
        data={data}
        columns={columns as any}
        rowKey="id"
        chrome={{ rowNumbers: true, getRowBackground }}
      />,
    );

    const firstRenderCount = getRowBackground.mock.calls.length;
    expect(firstRenderCount).toBeGreaterThanOrEqual(3);

    // Identical re-render (same references, same data, same config).
    rerender(
      <DataGrid
        data={data}
        columns={columns as any}
        rowKey="id"
        chrome={{ rowNumbers: true, getRowBackground }}
      />,
    );

    // Row-level React.memo should skip these rows — no new invocations.
    expect(getRowBackground.mock.calls.length).toBe(firstRenderCount);
  });

  it('re-invokes resolvers when the row data changes', () => {
    const getRowBackground = vi.fn((row: TestRow) => (row.name.includes('A') ? '#f00' : null));

    const firstData: TestRow[] = [
      { id: '1', name: 'Alice', value: 0 },
      { id: '2', name: 'Bob', value: 1 },
    ];

    const { rerender } = render(
      <DataGrid
        data={firstData}
        columns={columns as any}
        rowKey="id"
        chrome={{ rowNumbers: true, getRowBackground }}
      />,
    );

    const firstRenderCount = getRowBackground.mock.calls.length;

    // Mutate ONE row reference — memo must invalidate for that row.
    const secondData: TestRow[] = [
      { id: '1', name: 'Alice', value: 0 }, // unchanged (but new reference)
      { id: '2', name: 'Bobby', value: 1 }, // changed
    ];

    rerender(
      <DataGrid
        data={secondData}
        columns={columns as any}
        rowKey="id"
        chrome={{ rowNumbers: true, getRowBackground }}
      />,
    );

    // At least the changed row must have been resolved again. Because the
    // data array identity changed the memo will invalidate for both rows —
    // this is expected: we guarantee CORRECTNESS, not minimal invalidation.
    expect(getRowBackground.mock.calls.length).toBeGreaterThan(firstRenderCount);
  });

  it('does not re-invoke resolvers when an unrelated container prop changes', () => {
    const data = makeData(3);
    const getRowBackground = vi.fn(() => null);
    const getRowBorder = vi.fn(() => null);

    const { rerender } = render(
      <DataGrid
        data={data}
        columns={columns as any}
        rowKey="id"
        chrome={{ rowNumbers: true, getRowBackground, getRowBorder }}
        style={{ height: 400 }}
      />,
    );

    const baselineBg = getRowBackground.mock.calls.length;
    const baselineBorder = getRowBorder.mock.calls.length;
    expect(baselineBg).toBeGreaterThanOrEqual(3);
    expect(baselineBorder).toBeGreaterThanOrEqual(3);

    // Re-render with an unrelated cosmetic change. Row-level memo must
    // prevent row subtree work.
    rerender(
      <DataGrid
        data={data}
        columns={columns as any}
        rowKey="id"
        chrome={{ rowNumbers: true, getRowBackground, getRowBorder }}
        style={{ height: 500 }}
      />,
    );

    expect(getRowBackground.mock.calls.length).toBe(baselineBg);
    expect(getRowBorder.mock.calls.length).toBe(baselineBorder);
  });
});
