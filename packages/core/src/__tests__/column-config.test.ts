import { beginEdit, createEditingState } from '../editing';
import { getNextCell } from '../selection';
import { ColumnDef } from '../types';

// ---------------------------------------------------------------------------
// ColumnDef shape (type-level contract)
// ---------------------------------------------------------------------------

describe('ColumnDef shape', () => {
  it('accepts the four new optional fields without type errors', () => {
    // If `borderRight`, `highlightColor`, `readOnly`, or `skipNavigation`
    // are missing from `ColumnDef`, this declaration fails to type-check and
    // vitest surfaces the error as a test-build failure.
    const col: ColumnDef = {
      id: 'c1',
      field: 'name',
      title: 'Name',
      borderRight: false,
      highlightColor: '#fef3c7',
      readOnly: true,
      skipNavigation: true,
    };
    expect(col.borderRight).toBe(false);
    expect(col.highlightColor).toBe('#fef3c7');
    expect(col.readOnly).toBe(true);
    expect(col.skipNavigation).toBe(true);
  });

  it('accepts borderRight as a style object', () => {
    const col: ColumnDef = {
      id: 'c1',
      field: 'name',
      title: 'Name',
      borderRight: { color: '#000', style: 'dashed', width: 2 },
    };
    expect(col.borderRight).toEqual({ color: '#000', style: 'dashed', width: 2 });
  });
});

// ---------------------------------------------------------------------------
// Navigation: skipNavigation
// ---------------------------------------------------------------------------

describe('navigation: skipNavigation', () => {
  const rowIds = ['r1', 'r2', 'r3'];

  const colsWithMiddleSkip: ColumnDef[] = [
    { id: 'cA', field: 'a', title: 'A' },
    { id: 'cB', field: 'b', title: 'B', skipNavigation: true },
    { id: 'cC', field: 'c', title: 'C' },
  ];

  const colsWithTwoConsecutiveSkips: ColumnDef[] = [
    { id: 'cA', field: 'a', title: 'A' },
    { id: 'cB', field: 'b', title: 'B', skipNavigation: true },
    { id: 'cC', field: 'c', title: 'C', skipNavigation: true },
    { id: 'cD', field: 'd', title: 'D' },
  ];

  const colsAllTrailingSkip: ColumnDef[] = [
    { id: 'cA', field: 'a', title: 'A' },
    { id: 'cB', field: 'b', title: 'B', skipNavigation: true },
    { id: 'cC', field: 'c', title: 'C', skipNavigation: true },
  ];

  it('ArrowRight from col A past a skip B lands on C', () => {
    const result = getNextCell(
      { rowId: 'r1', field: 'a' },
      'right',
      colsWithMiddleSkip,
      rowIds,
    );
    expect(result).toEqual({ rowId: 'r1', field: 'c' });
  });

  it('ArrowRight past two consecutive skip columns lands on the next non-skip', () => {
    const result = getNextCell(
      { rowId: 'r1', field: 'a' },
      'right',
      colsWithTwoConsecutiveSkips,
      rowIds,
    );
    expect(result).toEqual({ rowId: 'r1', field: 'd' });
  });

  it('ArrowLeft past a skip column lands on the preceding non-skip', () => {
    const result = getNextCell(
      { rowId: 'r2', field: 'c' },
      'left',
      colsWithMiddleSkip,
      rowIds,
    );
    expect(result).toEqual({ rowId: 'r2', field: 'a' });
  });

  it('ArrowRight when every following column is skip returns current cell unchanged', () => {
    const current = { rowId: 'r1', field: 'a' };
    const result = getNextCell(current, 'right', colsAllTrailingSkip, rowIds);
    expect(result).toEqual(current);
  });

  it('ArrowDown is unaffected by skipNavigation on the current column', () => {
    const cols: ColumnDef[] = [
      { id: 'cA', field: 'a', title: 'A' },
      { id: 'cB', field: 'b', title: 'B', skipNavigation: true },
      { id: 'cC', field: 'c', title: 'C' },
    ];
    const result = getNextCell({ rowId: 'r1', field: 'b' }, 'down', cols, rowIds);
    expect(result).toEqual({ rowId: 'r2', field: 'b' });
  });

  it('ArrowUp is unaffected by skipNavigation on the current column', () => {
    const cols: ColumnDef[] = [
      { id: 'cA', field: 'a', title: 'A' },
      { id: 'cB', field: 'b', title: 'B', skipNavigation: true },
      { id: 'cC', field: 'c', title: 'C' },
    ];
    const result = getNextCell({ rowId: 'r2', field: 'b' }, 'up', cols, rowIds);
    expect(result).toEqual({ rowId: 'r1', field: 'b' });
  });
});

// ---------------------------------------------------------------------------
// Editing: column-level readOnly
// ---------------------------------------------------------------------------

describe('editing: column-level readOnly', () => {
  const readOnlyCol: ColumnDef = {
    id: 'c1',
    field: 'name',
    title: 'Name',
    readOnly: true,
  };
  const writableCol: ColumnDef = {
    id: 'c2',
    field: 'age',
    title: 'Age',
  };
  const readOnlyButEditableCol: ColumnDef = {
    id: 'c3',
    field: 'city',
    title: 'City',
    readOnly: true,
    editable: true,
  };

  const roCell = { rowId: 'r1', field: 'name' };
  const writableCell = { rowId: 'r1', field: 'age' };
  const conflictCell = { rowId: 'r1', field: 'city' };

  it('beginEdit on a cell whose column has readOnly: true leaves editingCell null', () => {
    const initial = createEditingState();
    const result = beginEdit(initial, roCell, 'Alice', readOnlyCol);
    expect(result.cell).toBeNull();
  });

  it('beginEdit still works on adjacent non-readOnly columns', () => {
    const initial = createEditingState();
    const result = beginEdit(initial, writableCell, 33, writableCol);
    expect(result.cell).toEqual(writableCell);
    expect(result.originalValue).toBe(33);
    expect(result.currentValue).toBe(33);
  });

  it('beginEdit respects readOnly: true even when editable: true is also set (readOnly wins)', () => {
    const initial = createEditingState();
    const result = beginEdit(initial, conflictCell, 'Berlin', readOnlyButEditableCol);
    expect(result.cell).toBeNull();
  });
});
