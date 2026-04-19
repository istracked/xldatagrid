/**
 * Tests for the Shift+Arrow range styling now flowing through the same
 * chrome-API plumbing as consumer-supplied row presentation hooks (issue #14
 * + follow-up to PR #29 / issue #16).
 *
 * Prior to this refactor the range tint was a hard-coded `--dg-range-bg`
 * override inside the `styles.cell` factory, parallel to the chrome-column
 * `getRowBackground` path. It is now routed through a per-cell background
 * resolver inside `renderCell` that composes cleanly with a consumer's
 * `getRowBackground`.
 *
 * Composition rule (asserted below):
 *
 *   - The consumer's `getRowBackground` paints the row *container*; that
 *     colour shows through every non-tinted cell in the row.
 *   - The range tint is painted on the *cell* itself using the
 *     `--dg-range-bg` token, which is an rgba value with built-in alpha.
 *     It therefore *overlays* the consumer colour rather than replacing it
 *     — both are visible to the user.
 *   - Default consumers (no `getRowBackground`) see the exact same visual as
 *     before the refactor: transparent cells revealing the zebra-striped
 *     row container, with range cells tinted via `--dg-range-bg`.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { DataGrid } from '../DataGrid';

type Row = { id: string; a: string; b: string; c: string };

function makeRows(): Row[] {
  return [
    { id: '1', a: 'a1', b: 'b1', c: 'c1' },
    { id: '2', a: 'a2', b: 'b2', c: 'c2' },
    { id: '3', a: 'a3', b: 'b3', c: 'c3' },
  ];
}

const columns = [
  { id: 'a', field: 'a' as const, title: 'A' },
  { id: 'b', field: 'b' as const, title: 'B' },
  { id: 'c', field: 'c' as const, title: 'C' },
];

function renderGrid(overrides: Partial<Parameters<typeof DataGrid>[0]> = {}) {
  return render(
    <DataGrid
      data={makeRows()}
      columns={columns}
      rowKey="id"
      selectionMode="range"
      shiftArrowBehavior="rangeSelect"
      {...(overrides as any)}
    />,
  );
}

function getGrid() {
  return screen.getByRole('grid');
}

function getCell(rowId: string, field: string): HTMLElement {
  const cell = document.querySelector(
    `[data-row-id="${rowId}"][data-field="${field}"][role="gridcell"]`,
  );
  if (!cell) throw new Error(`Cell not found: ${rowId}/${field}`);
  return cell as HTMLElement;
}

function getRowContainer(rowId: string): HTMLElement {
  const row = document.querySelector(
    `[data-row-id="${rowId}"][role="row"]`,
  );
  if (!row) throw new Error(`Row container not found: ${rowId}`);
  return row as HTMLElement;
}

describe('range styling routes through the chrome-API plumbing', () => {
  it('tints the range cell background with the --dg-range-bg token (no consumer hook)', () => {
    renderGrid();
    fireEvent.click(getCell('1', 'a'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowRight', shiftKey: true });

    // Both anchor and focus fall inside the rectangular range and receive
    // the token-driven cell background — the same visual as before the
    // refactor, now sourced from the chrome-style cell background resolver.
    expect(getCell('1', 'a').style.background).toContain('--dg-range-bg');
    expect(getCell('1', 'b').style.background).toContain('--dg-range-bg');
  });

  it('leaves cells outside the range with no cell-level background override', () => {
    renderGrid();
    fireEvent.click(getCell('1', 'a'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowRight', shiftKey: true });

    // Out-of-range cell: cell is transparent so the row container's
    // background (zebra stripe / consumer colour) shows through.
    expect(getCell('2', 'c').style.background).toBe('');
  });

  it('single-cell selection does NOT apply the range tint (visual unchanged for default consumers)', () => {
    renderGrid();
    fireEvent.click(getCell('2', 'b'));
    // No Shift+Arrow — single-cell selection only. Cell should remain
    // transparent (outline-only visual, matching pre-refactor behaviour).
    expect(getCell('2', 'b').style.background).toBe('');
  });

  it('composes with a consumer getRowBackground: row bg on container, range tint overlays on cells', () => {
    // Consumer paints row 1 bright red via the chrome API.
    renderGrid({
      chrome: {
        getRowBackground: (row: Row) => (row.id === '1' ? '#ff0000' : null),
      },
    });

    // Select a range that overlaps the consumer-coloured row.
    fireEvent.click(getCell('1', 'a'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowRight', shiftKey: true });

    // The row *container* carries the consumer's colour…
    const row1 = getRowContainer('1');
    expect(row1.style.background).toMatch(/#ff0000|rgb\(255,\s*0,\s*0\)/i);

    // …and the range cell simultaneously carries the range tint on its own
    // background. The token is rgba with built-in alpha, so the red shows
    // through underneath — the two compose rather than one replacing the
    // other. This is the composition rule documented in the module header.
    expect(getCell('1', 'a').style.background).toContain('--dg-range-bg');
    expect(getCell('1', 'b').style.background).toContain('--dg-range-bg');
  });

  it('keeps the consumer row colour visible on non-range cells in the same row', () => {
    renderGrid({
      chrome: {
        getRowBackground: (row: Row) => (row.id === '1' ? '#ff0000' : null),
      },
    });
    fireEvent.click(getCell('1', 'a'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowRight', shiftKey: true });

    // Cell 'c' in row 1 is outside the range — it must NOT get the range
    // tint and must NOT shadow the row container's consumer colour.
    const cellC = getCell('1', 'c');
    expect(cellC.style.background).toBe('');
  });

  it('frozen-column background still wins over the range tint (unchanged behaviour)', () => {
    const frozenColumns = [
      { id: 'a', field: 'a' as const, title: 'A', frozen: 'left' as const },
      { id: 'b', field: 'b' as const, title: 'B' },
      { id: 'c', field: 'c' as const, title: 'C' },
    ];
    render(
      <DataGrid
        data={makeRows()}
        columns={frozenColumns}
        rowKey="id"
        selectionMode="range"
        shiftArrowBehavior="rangeSelect"
      />,
    );
    fireEvent.click(getCell('1', 'a'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowRight', shiftKey: true });

    // Frozen cell stays painted with the header token, not the range tint,
    // so pinned columns remain legible against a scrolled range.
    expect(getCell('1', 'a').style.background).toContain('--dg-header-bg');
    // Non-frozen range cell still gets the tint.
    expect(getCell('1', 'b').style.background).toContain('--dg-range-bg');
  });
});
