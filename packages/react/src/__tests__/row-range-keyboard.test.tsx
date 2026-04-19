/**
 * §3 keyboard navigation tests for row-range selection mode.
 *
 * When selectionMode='row', arrow-key navigation should move row-by-row rather
 * than cell-by-cell, and Shift+Arrow (with shiftArrowBehavior='rangeSelect')
 * should extend the full-row range rather than extending a rectangular cell range.
 *
 * Tests verify:
 *   1. ArrowDown selects the next row (all cells) when in row mode.
 *   2. ArrowUp selects the previous row (all cells) when in row mode.
 *   3. ArrowDown is a no-op at the last row.
 *   4. ArrowUp is a no-op at the first row.
 *   5. Shift+ArrowDown (rangeSelect) extends the selection to include the next row.
 *   6. Shift+ArrowUp (rangeSelect) extends the selection to include the previous row.
 *   7. In cell/range mode, ArrowDown still navigates cell-by-cell (no regression).
 */
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { DataGrid } from '../DataGrid';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

type TestRow = { id: string; name: string; age: number };

function makeRows(): TestRow[] {
  return [
    { id: '1', name: 'Alice', age: 30 },
    { id: '2', name: 'Bob', age: 25 },
    { id: '3', name: 'Charlie', age: 35 },
  ];
}

const columns = [
  { id: 'name', field: 'name', title: 'Name' },
  { id: 'age', field: 'age', title: 'Age' },
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

function getGrid() {
  return screen.getByRole('grid');
}

function getCell(rowId: string, field: string): HTMLElement {
  const cell = document.querySelector(
    `[data-row-id="${rowId}"][data-field="${field}"][role="gridcell"]`,
  );
  if (!cell) throw new Error(`Cell not found: rowId=${rowId} field=${field}`);
  return cell as HTMLElement;
}

function getRowEl(rowId: string): HTMLElement {
  const row = document.querySelector(`[role="row"][data-row-id="${rowId}"]`);
  if (!row) throw new Error(`Row not found: rowId=${rowId}`);
  return row as HTMLElement;
}

function rowIsSelected(rowId: string): boolean {
  return getRowEl(rowId).style.boxShadow.includes('--dg-selection-border');
}

function cellIsSelected(rowId: string, field: string): boolean {
  return getCell(rowId, field).style.outline.includes('2px solid');
}

// ---------------------------------------------------------------------------
// Plain arrow navigation in row mode
// ---------------------------------------------------------------------------

describe('row mode — plain arrow key navigation', () => {
  it('ArrowDown moves selection to the next row', () => {
    renderGrid({ selectionMode: 'row' });
    // Select row 1 first
    fireEvent.click(getCell('1', 'name'));
    expect(rowIsSelected('1')).toBe(true);

    fireEvent.keyDown(getGrid(), { key: 'ArrowDown' });
    expect(rowIsSelected('2')).toBe(true);
    expect(rowIsSelected('1')).toBe(false);
  });

  it('ArrowUp moves selection to the previous row', () => {
    renderGrid({ selectionMode: 'row' });
    fireEvent.click(getCell('2', 'name'));
    expect(rowIsSelected('2')).toBe(true);

    fireEvent.keyDown(getGrid(), { key: 'ArrowUp' });
    expect(rowIsSelected('1')).toBe(true);
    expect(rowIsSelected('2')).toBe(false);
  });

  it('ArrowDown at the last row stays on the last row', () => {
    renderGrid({ selectionMode: 'row' });
    fireEvent.click(getCell('3', 'name'));
    expect(rowIsSelected('3')).toBe(true);

    fireEvent.keyDown(getGrid(), { key: 'ArrowDown' });
    expect(rowIsSelected('3')).toBe(true);
  });

  it('ArrowUp at the first row stays on the first row', () => {
    renderGrid({ selectionMode: 'row' });
    fireEvent.click(getCell('1', 'name'));
    expect(rowIsSelected('1')).toBe(true);

    fireEvent.keyDown(getGrid(), { key: 'ArrowUp' });
    expect(rowIsSelected('1')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Shift+Arrow range extension in row mode
// ---------------------------------------------------------------------------

describe('row mode — Shift+Arrow range extension (rangeSelect)', () => {
  it('Shift+ArrowDown extends the row range downward', () => {
    renderGrid({ selectionMode: 'row', shiftArrowBehavior: 'rangeSelect' });
    fireEvent.click(getCell('1', 'name'));
    expect(rowIsSelected('1')).toBe(true);

    fireEvent.keyDown(getGrid(), { key: 'ArrowDown', shiftKey: true });

    // Both rows 1 and 2 should be covered by the selection.
    expect(rowIsSelected('1')).toBe(true);
    expect(rowIsSelected('2')).toBe(true);
    expect(rowIsSelected('3')).toBe(false);
  });

  it('Shift+ArrowUp extends the row range upward', () => {
    renderGrid({ selectionMode: 'row', shiftArrowBehavior: 'rangeSelect' });
    fireEvent.click(getCell('3', 'name'));
    expect(rowIsSelected('3')).toBe(true);

    fireEvent.keyDown(getGrid(), { key: 'ArrowUp', shiftKey: true });

    // Rows 2 and 3 should be covered.
    expect(rowIsSelected('2')).toBe(true);
    expect(rowIsSelected('3')).toBe(true);
    expect(rowIsSelected('1')).toBe(false);
  });

  it('successive Shift+ArrowDown keystrokes compound to cover more rows', () => {
    renderGrid({ selectionMode: 'row', shiftArrowBehavior: 'rangeSelect' });
    fireEvent.click(getCell('1', 'name'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyDown(getGrid(), { key: 'ArrowDown', shiftKey: true });

    // Rows 1, 2, and 3 should all be in the selection.
    expect(rowIsSelected('1')).toBe(true);
    expect(rowIsSelected('2')).toBe(true);
    expect(rowIsSelected('3')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Non-row mode regression: ArrowDown still navigates cell-by-cell
// ---------------------------------------------------------------------------

describe('non-row mode arrow keys are unchanged', () => {
  it('ArrowDown in cell mode moves down by one cell (not row-select)', () => {
    renderGrid({ selectionMode: 'cell' });
    fireEvent.click(getCell('1', 'name'));
    expect(cellIsSelected('1', 'name')).toBe(true);

    fireEvent.keyDown(getGrid(), { key: 'ArrowDown' });

    // Should move to row 2, name column only — not the whole row.
    expect(cellIsSelected('2', 'name')).toBe(true);
    expect(cellIsSelected('2', 'age')).toBe(false);
    // Row-level box-shadow must not appear.
    expect(rowIsSelected('2')).toBe(false);
  });
});
