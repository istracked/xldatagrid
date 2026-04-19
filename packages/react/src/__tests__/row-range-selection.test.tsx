/**
 * RTL tests for row-range selection rendering (§2).
 *
 * Verifies:
 *   - Shift+click rowheader extends to a contiguous range → rows carry
 *     inset box-shadow; per-cell outlines inside are 'none'.
 *   - Ctrl+click rowheader after a click toggles a disjoint second row.
 *   - Ctrl+click same rowheader twice removes it.
 *   - Bug regression: after click row 2, Ctrl+click row 5, row 2 still
 *     carries row-level boxShadow (was missing before §1 fix).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataGrid } from '../DataGrid';

type TestRow = { id: string; name: string; age: number; city: string };

function makeRows(): TestRow[] {
  return [
    { id: '1', name: 'Alice', age: 30, city: 'Paris' },
    { id: '2', name: 'Bob', age: 25, city: 'Lyon' },
    { id: '3', name: 'Charlie', age: 35, city: 'Nice' },
    { id: '4', name: 'Diana', age: 28, city: 'Bordeaux' },
    { id: '5', name: 'Eve', age: 32, city: 'Marseille' },
  ];
}

const columns = [
  { id: 'name', field: 'name', title: 'Name' },
  { id: 'age', field: 'age', title: 'Age' },
  { id: 'city', field: 'city', title: 'City' },
];

function renderGrid() {
  return render(
    <DataGrid
      data={makeRows()}
      columns={columns}
      rowKey="id"
      selectionMode="row"
      chrome={{ rowNumbers: true }}
    />,
  );
}

function getRowEl(rowId: string): HTMLElement {
  const row = document.querySelector(`[role="row"][data-row-id="${rowId}"]`);
  if (!row) throw new Error(`Row not found: ${rowId}`);
  return row as HTMLElement;
}

function getAllCellsInRow(rowId: string): HTMLElement[] {
  return Array.from(
    document.querySelectorAll(`[data-row-id="${rowId}"][role="gridcell"]`),
  ) as HTMLElement[];
}

function rowHasSelectionShadow(rowId: string): boolean {
  const shadow = getRowEl(rowId).style.boxShadow;
  return shadow.includes('--dg-selection-border');
}

// ---------------------------------------------------------------------------
// Shift+click extends to a contiguous range
// ---------------------------------------------------------------------------

describe('row-range selection — Shift+click', () => {
  it('rows 1, 2, 3 all carry boxShadow; per-cell outlines are none', () => {
    renderGrid();
    const rowNumbers = screen.getAllByTestId('chrome-row-number');

    // Click row 1, then Shift+click row 3
    fireEvent.click(rowNumbers[0]!);
    fireEvent.click(rowNumbers[2]!, { shiftKey: true });

    expect(rowHasSelectionShadow('1')).toBe(true);
    expect(rowHasSelectionShadow('2')).toBe(true);
    expect(rowHasSelectionShadow('3')).toBe(true);

    // Per-cell outlines are suppressed inside selected rows
    ['1', '2', '3'].forEach((rowId) => {
      getAllCellsInRow(rowId).forEach((cell) => {
        expect(cell.style.outline).toBe('none');
      });
    });
  });

  it('row 1 shadow has top inset; row 3 has bottom inset; row 2 has neither', () => {
    renderGrid();
    const rowNumbers = screen.getAllByTestId('chrome-row-number');
    fireEvent.click(rowNumbers[0]!);
    fireEvent.click(rowNumbers[2]!, { shiftKey: true });

    const shadow1 = getRowEl('1').style.boxShadow;
    const shadow2 = getRowEl('2').style.boxShadow;
    const shadow3 = getRowEl('3').style.boxShadow;

    // top shadow is `inset 0 2px ...`
    expect(shadow1).toContain('inset 0 2px');
    // bottom shadow is `inset 0 -2px ...`
    expect(shadow3).toContain('inset 0 -2px');
    // middle row should not have top or bottom inset
    expect(shadow2).not.toContain('inset 0 2px');
    expect(shadow2).not.toContain('inset 0 -2px');
  });

  it('rows 4 and 5 do not carry boxShadow after range selects rows 1-3', () => {
    renderGrid();
    const rowNumbers = screen.getAllByTestId('chrome-row-number');
    fireEvent.click(rowNumbers[0]!);
    fireEvent.click(rowNumbers[2]!, { shiftKey: true });

    expect(rowHasSelectionShadow('4')).toBe(false);
    expect(rowHasSelectionShadow('5')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Ctrl+click toggles disjoint selection
// ---------------------------------------------------------------------------

describe('row-range selection — Ctrl+click', () => {
  it('rows 2 and 5 have all four inset shadows after click 2 then Ctrl+click 5', () => {
    renderGrid();
    const rowNumbers = screen.getAllByTestId('chrome-row-number');
    fireEvent.click(rowNumbers[1]!);
    fireEvent.click(rowNumbers[4]!, { ctrlKey: true });

    const shadow2 = getRowEl('2').style.boxShadow;
    const shadow5 = getRowEl('5').style.boxShadow;

    // Both singleton rows must have all four inset shadow segments
    expect(shadow2).toContain('inset 0 2px');
    expect(shadow2).toContain('inset 0 -2px');
    expect(shadow2).toContain('inset 2px 0');
    expect(shadow2).toContain('inset -2px 0');

    expect(shadow5).toContain('inset 0 2px');
    expect(shadow5).toContain('inset 0 -2px');
    expect(shadow5).toContain('inset 2px 0');
    expect(shadow5).toContain('inset -2px 0');
  });

  it('row 3 has no boxShadow when rows 2 and 5 are disjoint-selected', () => {
    renderGrid();
    const rowNumbers = screen.getAllByTestId('chrome-row-number');
    fireEvent.click(rowNumbers[1]!);
    fireEvent.click(rowNumbers[4]!, { ctrlKey: true });

    expect(rowHasSelectionShadow('3')).toBe(false);
  });

  it('Ctrl+click same rowheader twice removes it', () => {
    renderGrid();
    const rowNumbers = screen.getAllByTestId('chrome-row-number');
    fireEvent.click(rowNumbers[1]!);
    fireEvent.click(rowNumbers[4]!, { ctrlKey: true });
    // Ctrl+click row 5 again to remove it
    fireEvent.click(rowNumbers[4]!, { ctrlKey: true });

    expect(rowHasSelectionShadow('5')).toBe(false);
    // Row 2 is still selected
    expect(rowHasSelectionShadow('2')).toBe(true);
  });

  it('bug regression: row 2 keeps its boxShadow after Ctrl+click adds row 5', () => {
    renderGrid();
    const rowNumbers = screen.getAllByTestId('chrome-row-number');
    // Click row 2 to select it
    fireEvent.click(rowNumbers[1]!);
    // Ctrl+click row 5 — before the §1 fix, row 2 would lose its outline
    fireEvent.click(rowNumbers[4]!, { ctrlKey: true });

    // Row 2 must STILL carry the row-level box-shadow
    expect(rowHasSelectionShadow('2')).toBe(true);
  });
});
