/**
 * Regression tests for issue #15 — row-click selection reuses the chrome
 * column's click handler.
 *
 * Before the fix, clicking a data cell in `selectionMode='row'` only set a
 * single-cell selection (a leftover of the cell-selection code path). The
 * chrome row-number gutter already did the right thing — it dispatched to
 * `model.selectRowByKey(rowId)` via the row-number click handler. The fix
 * consolidates both entry points onto that same handler so there is a single
 * "select this row" code path shared by in-row clicks and gutter clicks.
 *
 * These tests verify:
 *   1. Clicking a data cell in `row` mode selects every cell in the row.
 *   2. The row-number gutter click and the in-row click produce the same
 *      selection outcome.
 *   3. Shift/Ctrl modifiers still extend or toggle the selection when the
 *      click originates from a data cell — matching the pre-existing chrome
 *      row-number click semantics.
 *   4. Other selection modes (`cell`, `range`, `none`) retain their
 *      pre-existing cell-click semantics.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataGrid, CellRendererProps } from '../DataGrid';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

type TestRow = { id: string; name: string; age: number; score: number };

function makeRows(): TestRow[] {
  return [
    { id: '1', name: 'Alice', age: 30, score: 90 },
    { id: '2', name: 'Bob', age: 25, score: 85 },
    { id: '3', name: 'Charlie', age: 35, score: 70 },
  ];
}

const columns = [
  { id: 'name', field: 'name', title: 'Name' },
  { id: 'age', field: 'age', title: 'Age' },
  { id: 'score', field: 'score', title: 'Score' },
];

function renderGrid(overrides: Partial<Parameters<typeof DataGrid>[0]> = {}) {
  return render(
    <DataGrid
      data={makeRows()}
      columns={columns}
      rowKey="id"
      {...(overrides as any)}
    />,
  );
}

function getCell(rowId: string, field: string): HTMLElement {
  const cell = document.querySelector(
    `[data-row-id="${rowId}"][data-field="${field}"][role="gridcell"]`,
  );
  if (!cell) throw new Error(`Cell not found: rowId=${rowId} field=${field}`);
  return cell as HTMLElement;
}

function getAllCellsInRow(rowId: string): HTMLElement[] {
  return Array.from(
    document.querySelectorAll(
      `[data-row-id="${rowId}"][role="gridcell"]`,
    ),
  ) as HTMLElement[];
}

function hasSelectionOutline(el: HTMLElement): boolean {
  return el.style.outline.includes('2px solid');
}

function getRowEl(rowId: string): HTMLElement {
  const row = document.querySelector(
    `[role="row"][data-row-id="${rowId}"]`,
  );
  if (!row) throw new Error(`Row not found: rowId=${rowId}`);
  return row as HTMLElement;
}

// ---------------------------------------------------------------------------
// In-row data-cell clicks in selectionMode='row'
// ---------------------------------------------------------------------------

describe('row-click selection (issue #15)', () => {
  it('selects every cell in the clicked row when selectionMode is "row"', () => {
    renderGrid({ selectionMode: 'row' });

    fireEvent.click(getCell('2', 'name'));

    // With the row-level outline feature, the row container gets the outline
    // and per-cell outlines are suppressed. Verify the row is visually selected.
    const rowEl = getRowEl('2');
    expect(rowEl.style.outline).toContain('2px solid');

    // Per-cell outlines are suppressed — the row outline replaces them.
    const rowCells = getAllCellsInRow('2');
    expect(rowCells.length).toBeGreaterThan(1);
    rowCells.forEach((cell) => {
      expect(cell.style.outline).toBe('none');
    });

    // Other rows are unaffected.
    const otherRowEl = getRowEl('1');
    expect(otherRowEl.style.outline ?? '').not.toContain('2px solid');
  });

  it('produces the same selection whether the click came from a data cell or the row-number gutter', () => {
    // Data-cell click path.
    const { unmount } = renderGrid({
      selectionMode: 'row',
      chrome: { rowNumbers: true },
    });
    fireEvent.click(getCell('3', 'score'));
    const afterCellClick = getRowEl('3').style.outline.includes('2px solid');
    unmount();

    // Row-number gutter click path on a freshly rendered grid.
    renderGrid({ selectionMode: 'row', chrome: { rowNumbers: true } });
    const rowNumberCells = screen.getAllByTestId('chrome-row-number');
    // Row 3 is at index 2 in the data order.
    fireEvent.click(rowNumberCells[2]!);
    const afterGutterClick = getRowEl('3').style.outline.includes('2px solid');

    expect(afterCellClick).toBe(true);
    expect(afterGutterClick).toBe(true);
  });

  it('Ctrl+click on a data cell toggles the row into a multi-row selection', () => {
    renderGrid({ selectionMode: 'row' });
    fireEvent.click(getCell('1', 'name'));
    // Ctrl+click row 2 — should add row 2 (without clearing row 1) because
    // the chrome click handler interprets `metaKey` as a toggle.
    fireEvent.click(getCell('2', 'age'), { ctrlKey: true });
    // The row container for row 2 gets the outline (last selected range).
    expect(getRowEl('2').style.outline).toContain('2px solid');
  });

  it('Shift+click on a data cell extends the range from the last anchor', () => {
    renderGrid({ selectionMode: 'row' });
    fireEvent.click(getCell('1', 'name'));
    fireEvent.click(getCell('3', 'score'), { shiftKey: true });
    // Shift produces a multi-row range (rows 1-3) with anchor/focus on different
    // rows, so isRowFullySelected returns false. Per-cell outlines remain visible.
    ['1', '2', '3'].forEach((rowId) => {
      getAllCellsInRow(rowId).forEach((cell) => {
        expect(hasSelectionOutline(cell)).toBe(true);
      });
    });
  });
});

// ---------------------------------------------------------------------------
// defaultPrevented guard
// ---------------------------------------------------------------------------

describe('row-click selection respects e.defaultPrevented', () => {
  it('does NOT trigger row selection when a custom cell renderer calls e.preventDefault()', () => {
    // A custom renderer that calls preventDefault on every click. This simulates
    // a consumer that owns the click (e.g. opens a popup). DataGridBody must
    // check e.defaultPrevented before routing to onRowNumberClick.
    function StopRenderer({ value }: CellRendererProps) {
      return (
        <span
          data-testid="custom-cell"
          onClick={(e: React.MouseEvent) => e.preventDefault()}
        >
          {String(value)}
        </span>
      );
    }

    const cols = [
      { id: 'name', field: 'name', title: 'Name', cellType: 'stop' as const },
      { id: 'age', field: 'age', title: 'Age' },
    ];

    render(
      <DataGrid
        data={makeRows()}
        columns={cols as any}
        rowKey="id"
        selectionMode="row"
        cellRenderers={{ stop: StopRenderer as any }}
      />,
    );

    // Clicking the inner span will bubble up with defaultPrevented=true.
    // The gridcell onClick (handleCellClick) must bail out before row-select.
    const customCell = screen.getAllByTestId('custom-cell')[0]!;
    fireEvent.click(customCell);

    // No cell in row 1 should have a selection outline.
    getAllCellsInRow('1').forEach((cell) => {
      expect(hasSelectionOutline(cell)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Non-row modes retain cell-click semantics
// ---------------------------------------------------------------------------

describe('row-click selection does not change other selection modes', () => {
  it('selectionMode="cell" still selects a single cell on click', () => {
    renderGrid({ selectionMode: 'cell' });
    fireEvent.click(getCell('2', 'age'));

    expect(hasSelectionOutline(getCell('2', 'age'))).toBe(true);
    // Other cells in the same row are not selected.
    expect(hasSelectionOutline(getCell('2', 'name'))).toBe(false);
    expect(hasSelectionOutline(getCell('2', 'score'))).toBe(false);
  });

  it('selectionMode="range" still starts a single-cell range on click', () => {
    renderGrid({ selectionMode: 'range' });
    fireEvent.click(getCell('1', 'name'));

    expect(hasSelectionOutline(getCell('1', 'name'))).toBe(true);
    expect(hasSelectionOutline(getCell('1', 'age'))).toBe(false);
  });

  it('selectionMode="none" suppresses selection on click', () => {
    renderGrid({ selectionMode: 'none' });
    fireEvent.click(getCell('1', 'name'));
    expect(hasSelectionOutline(getCell('1', 'name'))).toBe(false);
  });

  it('default selectionMode (cell) keeps the single-cell click contract', () => {
    renderGrid();
    fireEvent.click(getCell('2', 'score'));
    expect(hasSelectionOutline(getCell('2', 'score'))).toBe(true);
    expect(hasSelectionOutline(getCell('2', 'name'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Row-level outline on rowheader click (CSS-only, path #1)
// ---------------------------------------------------------------------------

describe('row-level selection outline on rowheader click', () => {
  it('row element gets outline and per-cell outlines are suppressed after rowheader click', () => {
    renderGrid({ selectionMode: 'row', chrome: { rowNumbers: true } });

    const rowNumberCells = screen.getAllByTestId('chrome-row-number');
    // Row 2 is at index 1 in the data order.
    fireEvent.click(rowNumberCells[1]!);

    const rowEl = getRowEl('2');
    // The row itself must carry the selection outline (2px solid is the reliable
    // part; jsdom may strip or truncate CSS variable fallback values).
    expect(rowEl.style.outline).toContain('2px solid');

    // Every gridcell in that row must have its outline suppressed.
    getAllCellsInRow('2').forEach((cell) => {
      expect(cell.style.outline).toBe('none');
    });
  });

  it('per-cell outlines remain and no row outline when a single gridcell is clicked (cell mode)', () => {
    renderGrid({ selectionMode: 'cell' });

    fireEvent.click(getCell('1', 'name'));

    const rowEl = getRowEl('1');
    // No row-level outline in cell mode.
    expect(rowEl.style.outline ?? '').not.toContain('2px solid');

    // The clicked cell keeps its own outline.
    expect(hasSelectionOutline(getCell('1', 'name'))).toBe(true);
  });
});
