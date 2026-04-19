// ---------------------------------------------------------------------------
// Edit commit + post-edit arrow navigation (Excel-365 web contract)
// ---------------------------------------------------------------------------
//
// These tests pin the **Excel-365 web** commit-and-move contract that the
// DataGrid's inline editor MUST honour:
//
//   ENTER   → commit draft value, exit edit mode, move selection DOWN one row.
//   TAB     → commit draft value, exit edit mode, move selection RIGHT one col.
//   ESCAPE  → discard draft, exit edit mode, selection STAYS on the same cell.
//
// After any of the three paths, the plain arrow keys MUST navigate the grid
// normally (ArrowUp/Down/Left/Right). The failure mode this suite guards
// against: the editor's `onKeyDown` currently calls `e.stopPropagation()`
// unconditionally, preventing the grid-level keyboard handler from running
// the Excel-style commit-and-move step AND leaving stale `editing.cell`
// state that can break subsequent arrow navigation.
//
// Currently the editor commits-and-STAYS (legacy issue #10 behaviour). These
// tests are expected to FAIL until the commit-and-move path ships — they are
// deliberately red for TDD.
//
// Pre-release: we are free to change the contract. The canonical, Excel-365-
// aligned spec lives here.
// ---------------------------------------------------------------------------

import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { DataGrid } from '../DataGrid';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

type TestRow = { id: string; name: string; age: number; city: string };

function makeRows(): TestRow[] {
  return [
    { id: '1', name: 'Alice',   age: 30, city: 'NYC' },
    { id: '2', name: 'Bob',     age: 25, city: 'SFO' },
    { id: '3', name: 'Charlie', age: 35, city: 'LON' },
  ];
}

const columns = [
  { id: 'name', field: 'name', title: 'Name', editable: true },
  { id: 'age',  field: 'age',  title: 'Age',  editable: true },
  { id: 'city', field: 'city', title: 'City', editable: true },
];

function renderGrid(overrides: Partial<Parameters<typeof DataGrid>[0]> = {}) {
  const data = makeRows();
  const onCellEdit = vi.fn();
  const utils = render(
    <DataGrid
      data={data}
      columns={columns}
      rowKey="id"
      selectionMode="cell"
      keyboardNavigation
      onCellEdit={onCellEdit}
      {...(overrides as any)}
    />,
  );
  return { ...utils, onCellEdit, data };
}

function getGrid(): HTMLElement {
  return screen.getByRole('grid');
}

function getCell(rowId: string, field: string): HTMLElement {
  const el = document.querySelector(
    `[role="gridcell"][data-row-id="${rowId}"][data-field="${field}"]`,
  );
  if (!el) throw new Error(`cell not found: ${rowId}/${field}`);
  return el as HTMLElement;
}

/** True when the given cell is the active selection (shows outline). */
function isSelected(rowId: string, field: string): boolean {
  return getCell(rowId, field).style.outline.includes('2px solid');
}

/** Convenience: double-click into edit mode, type a new value. */
function enterEditAndType(rowId: string, field: string, value: string): HTMLInputElement {
  fireEvent.click(getCell(rowId, field));
  fireEvent.dblClick(getCell(rowId, field));
  const input = screen.getByRole('textbox') as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
  return input;
}

// ---------------------------------------------------------------------------
// Enter: commit + move DOWN
// ---------------------------------------------------------------------------

describe('edit-commit-nav — Enter commits and moves DOWN (Excel-365)', () => {
  it('Enter commits the typed value via the model and fires onCellEdit', () => {
    // `onCellEdit` is wired directly from the DataGridBody's commit handler;
    // it serves as our spy that `model.setCellValue` + `model.commitEdit`
    // actually ran on Enter (as opposed to cancel/blur paths).
    const { onCellEdit } = renderGrid();
    const input = enterEditAndType('1', 'name', 'newvalue');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCellEdit).toHaveBeenCalledWith('1', 'name', 'newvalue', 'Alice');
  });

  it('Enter exits edit mode (no input mounted afterwards)', () => {
    renderGrid();
    const input = enterEditAndType('1', 'name', 'newvalue');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('Enter updates the cell DOM to show the committed value', () => {
    renderGrid();
    const input = enterEditAndType('1', 'name', 'newvalue');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(getCell('1', 'name').textContent).toContain('newvalue');
  });

  it('Enter moves selection DOWN one row (Excel-365 commit-and-advance)', () => {
    renderGrid();
    const input = enterEditAndType('1', 'name', 'newvalue');
    fireEvent.keyDown(input, { key: 'Enter' });
    // The edited cell is no longer the anchor; the row below is.
    expect(isSelected('2', 'name')).toBe(true);
    expect(isSelected('1', 'name')).toBe(false);
  });

  it('Enter at the BOTTOM row does not crash and leaves selection on same cell', () => {
    // Design choice: stay on same cell when there is no row below. We
    // deliberately do NOT wrap to the top row because Excel-365's behaviour
    // on the last row is to stop at the bottom edge.
    renderGrid();
    const input = enterEditAndType('3', 'name', 'bottomrow');
    expect(() => fireEvent.keyDown(input, { key: 'Enter' })).not.toThrow();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(isSelected('3', 'name')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tab: commit + move RIGHT
// ---------------------------------------------------------------------------

describe('edit-commit-nav — Tab commits and moves RIGHT (Excel-365)', () => {
  it('Tab commits the typed value via the model and fires onCellEdit', () => {
    const { onCellEdit } = renderGrid();
    const input = enterEditAndType('1', 'name', 'newvalue');
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(onCellEdit).toHaveBeenCalledWith('1', 'name', 'newvalue', 'Alice');
  });

  it('Tab exits edit mode (no input mounted afterwards)', () => {
    renderGrid();
    const input = enterEditAndType('1', 'name', 'newvalue');
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('Tab updates the cell DOM to show the committed value', () => {
    renderGrid();
    const input = enterEditAndType('1', 'name', 'newvalue');
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(getCell('1', 'name').textContent).toContain('newvalue');
  });

  it('Tab moves selection RIGHT one cell (Excel-365 commit-and-advance)', () => {
    renderGrid();
    const input = enterEditAndType('1', 'name', 'newvalue');
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(isSelected('1', 'age')).toBe(true);
    expect(isSelected('1', 'name')).toBe(false);
  });

  it('Tab at the RIGHTMOST column does not crash and leaves selection on same cell', () => {
    // Design choice: stay on the same cell when there is no column to the
    // right. Excel-365 wraps to the first column of the next row here, but we
    // pick "stay" as a safer, non-surprising default for this grid.
    renderGrid();
    const input = enterEditAndType('1', 'city', 'rightedge');
    expect(() => fireEvent.keyDown(input, { key: 'Tab' })).not.toThrow();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(isSelected('1', 'city')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Escape: cancel + STAY
// ---------------------------------------------------------------------------

describe('edit-commit-nav — Escape cancels and stays (Excel-365)', () => {
  it('Escape does NOT fire onCellEdit (no commit)', () => {
    const { onCellEdit } = renderGrid();
    const input = enterEditAndType('1', 'name', 'discarded');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onCellEdit).not.toHaveBeenCalled();
  });

  it('Escape preserves the original underlying value in the DOM', () => {
    renderGrid();
    const input = enterEditAndType('1', 'name', 'discarded');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(getCell('1', 'name').textContent).toContain('Alice');
    expect(getCell('1', 'name').textContent).not.toContain('discarded');
  });

  it('Escape exits edit mode (no input mounted afterwards)', () => {
    renderGrid();
    const input = enterEditAndType('1', 'name', 'discarded');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('Escape keeps selection on the SAME cell (no vertical / horizontal move)', () => {
    renderGrid();
    const input = enterEditAndType('1', 'name', 'discarded');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(isSelected('1', 'name')).toBe(true);
    expect(isSelected('2', 'name')).toBe(false);
    expect(isSelected('1', 'age')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Post-edit arrow navigation: guards the regression where stale editing
// state (or bubbled `stopPropagation` from a recycled editor) blocks the
// grid-level keyboard handler from running plain arrow-key navigation.
// ---------------------------------------------------------------------------

describe('edit-commit-nav — arrow keys work AFTER a commit / cancel', () => {
  it('ArrowDown works after Enter commit', () => {
    renderGrid();
    // Enter commit from row 1 → selection lands on row 2.
    const input = enterEditAndType('1', 'name', 'v');
    fireEvent.keyDown(input, { key: 'Enter' });
    // Now a plain ArrowDown on the grid root must move to row 3.
    fireEvent.keyDown(getGrid(), { key: 'ArrowDown' });
    expect(isSelected('3', 'name')).toBe(true);
  });

  it('ArrowUp works after Enter commit', () => {
    renderGrid();
    // Enter commit from row 2 → selection lands on row 3.
    fireEvent.click(getCell('2', 'name'));
    fireEvent.dblClick(getCell('2', 'name'));
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'v' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    // ArrowUp from row 3 → row 2.
    fireEvent.keyDown(getGrid(), { key: 'ArrowUp' });
    expect(isSelected('2', 'name')).toBe(true);
  });

  it('ArrowRight works after Tab commit', () => {
    renderGrid();
    // Tab commit from (1,name) → selection lands on (1,age).
    const input = enterEditAndType('1', 'name', 'v');
    fireEvent.keyDown(input, { key: 'Tab' });
    // ArrowRight from (1,age) → (1,city).
    fireEvent.keyDown(getGrid(), { key: 'ArrowRight' });
    expect(isSelected('1', 'city')).toBe(true);
  });

  it('ArrowLeft works after Tab commit', () => {
    renderGrid();
    // Tab commit from (1,age) → selection lands on (1,city).
    fireEvent.click(getCell('1', 'age'));
    fireEvent.dblClick(getCell('1', 'age'));
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'v' } });
    fireEvent.keyDown(input, { key: 'Tab' });
    // ArrowLeft from (1,city) → (1,age).
    fireEvent.keyDown(getGrid(), { key: 'ArrowLeft' });
    expect(isSelected('1', 'age')).toBe(true);
  });

  it('ArrowDown/Up/Left/Right all work after Escape', () => {
    // Selection stays on (2,age); each arrow navigates in the expected
    // direction. Guards against stale `editing.cell` state left by Escape.
    renderGrid();
    fireEvent.click(getCell('2', 'age'));
    fireEvent.dblClick(getCell('2', 'age'));
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'discard' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    fireEvent.keyDown(getGrid(), { key: 'ArrowDown' });
    expect(isSelected('3', 'age')).toBe(true);

    fireEvent.keyDown(getGrid(), { key: 'ArrowUp' });
    expect(isSelected('2', 'age')).toBe(true);

    fireEvent.keyDown(getGrid(), { key: 'ArrowLeft' });
    expect(isSelected('2', 'name')).toBe(true);

    fireEvent.keyDown(getGrid(), { key: 'ArrowRight' });
    expect(isSelected('2', 'age')).toBe(true);
  });
});
