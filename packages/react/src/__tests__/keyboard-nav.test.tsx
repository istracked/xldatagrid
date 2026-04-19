import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { DataGrid } from '../DataGrid';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

type TestRow = { id: string; name: string; age: number; active: boolean };

function makeRows(): TestRow[] {
  return [
    { id: '1', name: 'Alice', age: 30, active: true },
    { id: '2', name: 'Bob', age: 25, active: false },
    { id: '3', name: 'Charlie', age: 35, active: true },
  ];
}

const columns = [
  { id: 'name', field: 'name', title: 'Name' },
  { id: 'age', field: 'age', title: 'Age' },
  { id: 'active', field: 'active', title: 'Active', cellType: 'boolean' as const },
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

/** Get the grid container (role="grid") for dispatching keyboard events. */
function getGrid() {
  return screen.getByRole('grid');
}

/** Find cell by data attributes. */
function getCell(rowId: string, field: string): HTMLElement {
  const cell = document.querySelector(
    `[data-row-id="${rowId}"][data-field="${field}"][role="gridcell"]`,
  );
  if (!cell) throw new Error(`Cell not found: rowId=${rowId} field=${field}`);
  return cell as HTMLElement;
}

/** Check whether a cell currently has the selection outline. */
function isSelected(rowId: string, field: string): boolean {
  const cell = getCell(rowId, field);
  return cell.style.outline.includes('2px solid');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Keyboard navigation', () => {
  // -- Tab ------------------------------------------------------------------

  it('Tab moves focus to next cell in row', () => {
    renderGrid();
    fireEvent.click(getCell('1', 'name'));
    expect(isSelected('1', 'name')).toBe(true);

    fireEvent.keyDown(getGrid(), { key: 'Tab' });
    expect(isSelected('1', 'age')).toBe(true);
  });

  it('Tab from last cell in row moves to first cell of next row', () => {
    renderGrid();
    fireEvent.click(getCell('1', 'active'));

    fireEvent.keyDown(getGrid(), { key: 'Tab' });
    expect(isSelected('2', 'name')).toBe(true);
  });

  it('Tab from last cell in last row stays (no ghost row in default config)', () => {
    renderGrid();
    fireEvent.click(getCell('3', 'active'));

    fireEvent.keyDown(getGrid(), { key: 'Tab' });
    // getNextCellInRow returns null, so selection should not change
    expect(isSelected('3', 'active')).toBe(true);
  });

  it('Shift+Tab moves focus to previous cell in row', () => {
    renderGrid();
    fireEvent.click(getCell('1', 'age'));

    fireEvent.keyDown(getGrid(), { key: 'Tab', shiftKey: true });
    expect(isSelected('1', 'name')).toBe(true);
  });

  it('Shift+Tab from first cell in row moves to last cell of previous row', () => {
    renderGrid();
    fireEvent.click(getCell('2', 'name'));

    fireEvent.keyDown(getGrid(), { key: 'Tab', shiftKey: true });
    expect(isSelected('1', 'active')).toBe(true);
  });

  // -- Enter ----------------------------------------------------------------

  it('Enter commits edit and moves focus to cell below', () => {
    renderGrid();
    fireEvent.click(getCell('1', 'name'));
    // Enter edit mode
    fireEvent.keyDown(getGrid(), { key: 'F2' });
    // Now commit via Enter on grid (the hook handles Enter when editing.cell is set)
    fireEvent.keyDown(getGrid(), { key: 'Enter' });
    expect(isSelected('2', 'name')).toBe(true);
  });

  it('Shift+Enter moves focus to cell above', () => {
    renderGrid();
    fireEvent.click(getCell('2', 'name'));
    fireEvent.keyDown(getGrid(), { key: 'F2' });
    fireEvent.keyDown(getGrid(), { key: 'Enter', shiftKey: true });
    expect(isSelected('1', 'name')).toBe(true);
  });

  // -- Escape ---------------------------------------------------------------

  it('Escape exits edit mode without committing', () => {
    const onCellEdit = vi.fn();
    renderGrid({ onCellEdit });
    fireEvent.click(getCell('1', 'name'));
    fireEvent.keyDown(getGrid(), { key: 'F2' });
    // Editing should be active (input rendered)
    expect(document.querySelector('input')).not.toBeNull();
    fireEvent.keyDown(getGrid(), { key: 'Escape' });
    expect(document.querySelector('input')).toBeNull();
    expect(onCellEdit).not.toHaveBeenCalled();
  });

  it('Escape clears selection when not in edit mode', () => {
    renderGrid();
    fireEvent.click(getCell('1', 'name'));
    expect(isSelected('1', 'name')).toBe(true);

    fireEvent.keyDown(getGrid(), { key: 'Escape' });
    expect(isSelected('1', 'name')).toBe(false);
  });

  // -- Arrow keys -----------------------------------------------------------

  it('ArrowRight moves focus to next cell', () => {
    renderGrid();
    fireEvent.click(getCell('1', 'name'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowRight' });
    expect(isSelected('1', 'age')).toBe(true);
  });

  it('ArrowLeft moves focus to previous cell', () => {
    renderGrid();
    fireEvent.click(getCell('1', 'age'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowLeft' });
    expect(isSelected('1', 'name')).toBe(true);
  });

  it('ArrowDown moves focus to cell below', () => {
    renderGrid();
    fireEvent.click(getCell('1', 'name'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowDown' });
    expect(isSelected('2', 'name')).toBe(true);
  });

  it('ArrowUp moves focus to cell above', () => {
    renderGrid();
    fireEvent.click(getCell('2', 'name'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowUp' });
    expect(isSelected('1', 'name')).toBe(true);
  });

  it('ArrowRight at rightmost column does not move', () => {
    renderGrid();
    fireEvent.click(getCell('1', 'active'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowRight' });
    expect(isSelected('1', 'active')).toBe(true);
  });

  it('ArrowLeft at leftmost column does not move', () => {
    renderGrid();
    fireEvent.click(getCell('1', 'name'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowLeft' });
    expect(isSelected('1', 'name')).toBe(true);
  });

  it('ArrowDown at last row does not move', () => {
    renderGrid();
    fireEvent.click(getCell('3', 'name'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowDown' });
    expect(isSelected('3', 'name')).toBe(true);
  });

  it('ArrowUp at first row does not move', () => {
    renderGrid();
    fireEvent.click(getCell('1', 'name'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowUp' });
    expect(isSelected('1', 'name')).toBe(true);
  });

  // -- Ctrl+Home / Ctrl+End -----------------------------------------------

  it('Ctrl+Home moves focus to first cell in grid', () => {
    renderGrid();
    fireEvent.click(getCell('3', 'active'));
    fireEvent.keyDown(getGrid(), { key: 'Home', ctrlKey: true });
    expect(isSelected('1', 'name')).toBe(true);
  });

  it('Ctrl+End moves focus to last cell in grid', () => {
    renderGrid();
    fireEvent.click(getCell('1', 'name'));
    fireEvent.keyDown(getGrid(), { key: 'End', ctrlKey: true });
    expect(isSelected('3', 'active')).toBe(true);
  });

  // -- Home / End -----------------------------------------------------------

  it('Home moves focus to first cell in current row', () => {
    renderGrid();
    fireEvent.click(getCell('2', 'active'));
    fireEvent.keyDown(getGrid(), { key: 'Home' });
    expect(isSelected('2', 'name')).toBe(true);
  });

  it('End moves focus to last cell in current row', () => {
    renderGrid();
    fireEvent.click(getCell('2', 'name'));
    fireEvent.keyDown(getGrid(), { key: 'End' });
    expect(isSelected('2', 'active')).toBe(true);
  });

  // -- F2 -------------------------------------------------------------------

  it('F2 enters edit mode on focused cell', () => {
    renderGrid();
    fireEvent.click(getCell('1', 'name'));
    fireEvent.keyDown(getGrid(), { key: 'F2' });
    expect(document.querySelector('input')).not.toBeNull();
  });

  // -- Space ----------------------------------------------------------------

  it('Space toggles checkbox cell', () => {
    renderGrid();
    // active col for row 1 is true initially
    const cell = getCell('1', 'active');
    expect(cell.textContent).toContain('\u2611'); // checked

    fireEvent.click(cell);
    fireEvent.keyDown(getGrid(), { key: ' ' });
    // After toggle, should be false
    expect(getCell('1', 'active').textContent).toContain('\u2610'); // unchecked
  });

  // -- Delete ---------------------------------------------------------------

  it('Delete clears focused cell value', () => {
    renderGrid();
    const cell = getCell('1', 'name');
    expect(cell.textContent).toContain('Alice');

    fireEvent.click(cell);
    fireEvent.keyDown(getGrid(), { key: 'Delete' });
    expect(getCell('1', 'name').textContent?.trim()).toBe('');
  });

  // -- Ctrl+A ---------------------------------------------------------------

  it('Ctrl+A selects all cells', () => {
    renderGrid();
    fireEvent.click(getCell('1', 'name'));
    fireEvent.keyDown(getGrid(), { key: 'a', ctrlKey: true });
    // selectAll sets anchor to first cell and focus to last cell.
    // The component's isSelected only checks anchor equality, so
    // the first cell should have the outline.
    expect(isSelected('1', 'name')).toBe(true);
  });

  // -- Shift+Arrow (scroll branch, default) ---------------------------------
  //
  // With the default `shiftArrowBehavior: 'scroll'`, Shift+Arrow pans the
  // viewport and must NOT alter the selection anchor or focus.

  it('Shift+ArrowRight does not change selection (default scroll branch)', () => {
    renderGrid();
    fireEvent.click(getCell('1', 'name'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowRight', shiftKey: true });
    expect(isSelected('1', 'name')).toBe(true);
    // Neighbouring cell should not have been pulled into the range.
    expect(isSelected('1', 'age')).toBe(false);
  });

  it('Shift+ArrowLeft does not change selection (default scroll branch)', () => {
    renderGrid();
    fireEvent.click(getCell('1', 'age'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowLeft', shiftKey: true });
    expect(isSelected('1', 'age')).toBe(true);
    expect(isSelected('1', 'name')).toBe(false);
  });

  it('Shift+ArrowDown does not change selection (default scroll branch)', () => {
    renderGrid();
    fireEvent.click(getCell('1', 'name'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowDown', shiftKey: true });
    expect(isSelected('1', 'name')).toBe(true);
    expect(isSelected('2', 'name')).toBe(false);
  });

  it('Shift+ArrowUp does not change selection (default scroll branch)', () => {
    renderGrid();
    fireEvent.click(getCell('2', 'name'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowUp', shiftKey: true });
    expect(isSelected('2', 'name')).toBe(true);
    expect(isSelected('1', 'name')).toBe(false);
  });

  // -- Ctrl+Arrow (Excel "End" jump) ---------------------------------------

  // When every cell along the row or column is populated, "End" mode walks to
  // the far edge of the populated run — which is the grid edge in this fixture.

  it('Ctrl+ArrowRight jumps to last non-empty cell in row', () => {
    renderGrid();
    fireEvent.click(getCell('1', 'name'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowRight', ctrlKey: true });
    expect(isSelected('1', 'active')).toBe(true);
  });

  it('Ctrl+ArrowLeft jumps to first non-empty cell in row', () => {
    renderGrid();
    fireEvent.click(getCell('1', 'active'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowLeft', ctrlKey: true });
    expect(isSelected('1', 'name')).toBe(true);
  });

  it('Ctrl+ArrowDown jumps to last non-empty cell in column', () => {
    renderGrid();
    fireEvent.click(getCell('1', 'name'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowDown', ctrlKey: true });
    expect(isSelected('3', 'name')).toBe(true);
  });

  it('Ctrl+ArrowUp jumps to first non-empty cell in column', () => {
    renderGrid();
    fireEvent.click(getCell('3', 'name'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowUp', ctrlKey: true });
    expect(isSelected('1', 'name')).toBe(true);
  });

  // -- Ctrl+Shift+Arrow (extend range to End target) -----------------------

  /** Whether the given cell renders `aria-selected="true"` — covers the whole range. */
  function isInRange(rowId: string, field: string): boolean {
    return getCell(rowId, field).getAttribute('aria-selected') === 'true';
  }

  it('Ctrl+Shift+ArrowRight extends selection to the row\'s last non-empty cell', () => {
    renderGrid();
    fireEvent.click(getCell('1', 'name'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowRight', ctrlKey: true, shiftKey: true });

    // Every cell between the anchor (inclusive) and the row's last populated cell lights up.
    expect(isInRange('1', 'name')).toBe(true);
    expect(isInRange('1', 'age')).toBe(true);
    expect(isInRange('1', 'active')).toBe(true);
    // Other rows remain untouched.
    expect(isInRange('2', 'name')).toBe(false);
  });

  it('Ctrl+Shift+ArrowDown extends selection to the column\'s last non-empty row', () => {
    renderGrid();
    fireEvent.click(getCell('1', 'name'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowDown', ctrlKey: true, shiftKey: true });

    expect(isInRange('1', 'name')).toBe(true);
    expect(isInRange('2', 'name')).toBe(true);
    expect(isInRange('3', 'name')).toBe(true);
    // Other columns stay out of range.
    expect(isInRange('2', 'age')).toBe(false);
  });

  it('Ctrl+Shift+ArrowLeft extends left to the first non-empty cell, keeping the anchor', () => {
    renderGrid();
    fireEvent.click(getCell('3', 'active'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowLeft', ctrlKey: true, shiftKey: true });

    // Row 3, all three columns, selected.
    expect(isInRange('3', 'name')).toBe(true);
    expect(isInRange('3', 'age')).toBe(true);
    expect(isInRange('3', 'active')).toBe(true);
    // Rows above are untouched.
    expect(isInRange('1', 'name')).toBe(false);
  });

  it('Ctrl+Shift+ArrowUp extends up to the first non-empty row, keeping the anchor column', () => {
    renderGrid();
    fireEvent.click(getCell('3', 'active'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowUp', ctrlKey: true, shiftKey: true });

    // "active" column should light up from r1 through the anchor at r3.
    expect(isInRange('1', 'active')).toBe(true);
    expect(isInRange('2', 'active')).toBe(true);
    expect(isInRange('3', 'active')).toBe(true);
    // Adjacent columns stay out of range.
    expect(isInRange('1', 'age')).toBe(false);
  });

  // -- PageDown / PageUp ----------------------------------------------------

  it('PageDown moves focus down (no-op at boundary when already at last row)', () => {
    renderGrid();
    fireEvent.click(getCell('3', 'name'));
    // PageDown is not implemented in use-keyboard, so pressing it should not throw
    // and the selection should remain unchanged.
    fireEvent.keyDown(getGrid(), { key: 'PageDown' });
    expect(isSelected('3', 'name')).toBe(true);
  });

  it('PageUp moves focus up (no-op at boundary when already at first row)', () => {
    renderGrid();
    fireEvent.click(getCell('1', 'name'));
    fireEvent.keyDown(getGrid(), { key: 'PageUp' });
    expect(isSelected('1', 'name')).toBe(true);
  });

  // -- Hidden columns -------------------------------------------------------

  it('keyboard navigation skips hidden columns', () => {
    const cols = [
      { id: 'name', field: 'name', title: 'Name' },
      { id: 'age', field: 'age', title: 'Age', visible: false },
      { id: 'active', field: 'active', title: 'Active', cellType: 'boolean' as const },
    ];
    render(
      <DataGrid data={makeRows()} columns={cols} rowKey="id" />,
    );
    // Only name and active are visible
    const nameCell = getCell('1', 'name');
    fireEvent.click(nameCell);
    fireEvent.keyDown(getGrid(), { key: 'ArrowRight' });
    // Should jump directly to 'active', skipping hidden 'age'
    expect(isSelected('1', 'active')).toBe(true);
  });
});
