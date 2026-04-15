import {
  createSelection,
  selectCell,
  selectRow,
  selectColumn,
  extendSelection,
  clearSelection,
  selectAll,
  isCellInRange,
  isRowInRanges,
  toggleRowSelection,
  getNextCell,
  getFirstCell,
  getLastCell,
  getNextCellInRow,
  getPrevCellInRow,
} from '../selection';
import { ColumnDef } from '../types';

const cols: ColumnDef[] = [
  { id: 'c1', field: 'name', title: 'Name' },
  { id: 'c2', field: 'age', title: 'Age' },
  { id: 'c3', field: 'city', title: 'City' },
];

const rowIds = ['r1', 'r2', 'r3'];

describe('createSelection', () => {
  it('defaults to cell mode with null range', () => {
    const s = createSelection();
    expect(s.mode).toBe('cell');
    expect(s.range).toBeNull();
  });

  it('accepts explicit mode', () => {
    const s = createSelection('range');
    expect(s.mode).toBe('range');
  });
});

describe('selectCell', () => {
  it('sets range with identical anchor and focus', () => {
    const s = createSelection();
    const result = selectCell(s, { rowId: 'r1', field: 'name' });
    expect(result.range?.anchor).toEqual({ rowId: 'r1', field: 'name' });
    expect(result.range?.focus).toEqual({ rowId: 'r1', field: 'name' });
  });

  it('returns unchanged state when mode is none', () => {
    const s = createSelection('none');
    const result = selectCell(s, { rowId: 'r1', field: 'name' });
    expect(result).toBe(s);
  });

  it('preserves mode', () => {
    const s = createSelection('range');
    const result = selectCell(s, { rowId: 'r2', field: 'age' });
    expect(result.mode).toBe('range');
  });
});

describe('selectRow', () => {
  it('spans first to last column for the given row', () => {
    const s = createSelection('row');
    const result = selectRow(s, 'r2', cols);
    expect(result.range?.anchor).toEqual({ rowId: 'r2', field: 'name' });
    expect(result.range?.focus).toEqual({ rowId: 'r2', field: 'city' });
  });

  it('returns unchanged state when mode is none', () => {
    const s = createSelection('none');
    const result = selectRow(s, 'r1', cols);
    expect(result).toBe(s);
  });
});

describe('selectColumn', () => {
  it('spans first to last row for the given field', () => {
    const s = createSelection();
    const result = selectColumn(s, 'age', rowIds);
    expect(result.range?.anchor).toEqual({ rowId: 'r1', field: 'age' });
    expect(result.range?.focus).toEqual({ rowId: 'r3', field: 'age' });
  });

  it('returns unchanged state when mode is none', () => {
    const s = createSelection('none');
    const result = selectColumn(s, 'age', rowIds);
    expect(result).toBe(s);
  });
});

describe('extendSelection', () => {
  it('keeps anchor and moves focus to new cell', () => {
    const s = selectCell(createSelection('range'), { rowId: 'r1', field: 'name' });
    const result = extendSelection(s, { rowId: 'r3', field: 'city' });
    expect(result.range?.anchor).toEqual({ rowId: 'r1', field: 'name' });
    expect(result.range?.focus).toEqual({ rowId: 'r3', field: 'city' });
  });

  it('returns unchanged state when mode is none', () => {
    const s = createSelection('none');
    const result = extendSelection(s, { rowId: 'r1', field: 'name' });
    expect(result).toBe(s);
  });

  it('returns unchanged state when no existing range', () => {
    const s = createSelection('cell');
    const result = extendSelection(s, { rowId: 'r1', field: 'name' });
    expect(result).toBe(s);
  });
});

describe('clearSelection', () => {
  it('sets range to null', () => {
    const s = selectCell(createSelection(), { rowId: 'r1', field: 'name' });
    const result = clearSelection(s);
    expect(result.range).toBeNull();
  });

  it('preserves mode', () => {
    const s = createSelection('range');
    expect(clearSelection(s).mode).toBe('range');
  });
});

describe('selectAll', () => {
  it('selects from top-left to bottom-right', () => {
    const s = createSelection('range');
    const result = selectAll(s, cols, rowIds);
    expect(result.range?.anchor).toEqual({ rowId: 'r1', field: 'name' });
    expect(result.range?.focus).toEqual({ rowId: 'r3', field: 'city' });
  });

  it('returns unchanged state when mode is none', () => {
    const s = createSelection('none');
    expect(selectAll(s, cols, rowIds)).toBe(s);
  });

  it('returns unchanged state when no rows', () => {
    const s = createSelection('range');
    expect(selectAll(s, cols, [])).toBe(s);
  });

  it('returns unchanged state when no columns', () => {
    const s = createSelection('range');
    expect(selectAll(s, [], rowIds)).toBe(s);
  });
});

describe('isCellInRange', () => {
  const range = {
    anchor: { rowId: 'r1', field: 'name' },
    focus: { rowId: 'r3', field: 'age' },
  };

  it('returns true for cell inside range', () => {
    expect(isCellInRange({ rowId: 'r2', field: 'name' }, range, cols, rowIds)).toBe(true);
  });

  it('returns true for anchor cell', () => {
    expect(isCellInRange({ rowId: 'r1', field: 'name' }, range, cols, rowIds)).toBe(true);
  });

  it('returns true for focus cell', () => {
    expect(isCellInRange({ rowId: 'r3', field: 'age' }, range, cols, rowIds)).toBe(true);
  });

  it('returns false for cell outside column range', () => {
    expect(isCellInRange({ rowId: 'r1', field: 'city' }, range, cols, rowIds)).toBe(false);
  });

  it('works with inverted anchor/focus order', () => {
    const inverted = { anchor: { rowId: 'r3', field: 'age' }, focus: { rowId: 'r1', field: 'name' } };
    expect(isCellInRange({ rowId: 'r2', field: 'name' }, inverted, cols, rowIds)).toBe(true);
  });
});

describe('getNextCell', () => {
  it('moves right', () => {
    const result = getNextCell({ rowId: 'r1', field: 'name' }, 'right', cols, rowIds);
    expect(result).toEqual({ rowId: 'r1', field: 'age' });
  });

  it('moves left', () => {
    const result = getNextCell({ rowId: 'r1', field: 'age' }, 'left', cols, rowIds);
    expect(result).toEqual({ rowId: 'r1', field: 'name' });
  });

  it('moves down', () => {
    const result = getNextCell({ rowId: 'r1', field: 'name' }, 'down', cols, rowIds);
    expect(result).toEqual({ rowId: 'r2', field: 'name' });
  });

  it('moves up', () => {
    const result = getNextCell({ rowId: 'r2', field: 'name' }, 'up', cols, rowIds);
    expect(result).toEqual({ rowId: 'r1', field: 'name' });
  });

  it('returns null at left edge', () => {
    expect(getNextCell({ rowId: 'r1', field: 'name' }, 'left', cols, rowIds)).toBeNull();
  });

  it('returns null at right edge', () => {
    expect(getNextCell({ rowId: 'r1', field: 'city' }, 'right', cols, rowIds)).toBeNull();
  });

  it('returns null at top edge', () => {
    expect(getNextCell({ rowId: 'r1', field: 'name' }, 'up', cols, rowIds)).toBeNull();
  });

  it('returns null at bottom edge', () => {
    expect(getNextCell({ rowId: 'r3', field: 'name' }, 'down', cols, rowIds)).toBeNull();
  });

  it('skips hidden columns', () => {
    const colsWithHidden: ColumnDef[] = [
      { id: 'c1', field: 'name', title: 'Name' },
      { id: 'c2', field: 'age', title: 'Age', visible: false },
      { id: 'c3', field: 'city', title: 'City' },
    ];
    const result = getNextCell({ rowId: 'r1', field: 'name' }, 'right', colsWithHidden, rowIds);
    expect(result).toEqual({ rowId: 'r1', field: 'city' });
  });

  it('returns null when cell field is not found in visible columns', () => {
    const colsWithHidden: ColumnDef[] = [
      { id: 'c1', field: 'name', title: 'Name' },
      { id: 'c2', field: 'age', title: 'Age', visible: false },
    ];
    expect(getNextCell({ rowId: 'r1', field: 'age' }, 'right', colsWithHidden, rowIds)).toBeNull();
  });
});

describe('getFirstCell', () => {
  it('returns top-left visible cell', () => {
    expect(getFirstCell(cols, rowIds)).toEqual({ rowId: 'r1', field: 'name' });
  });

  it('returns null when no visible columns', () => {
    const hidden: ColumnDef[] = [{ id: 'c1', field: 'name', title: 'Name', visible: false }];
    expect(getFirstCell(hidden, rowIds)).toBeNull();
  });

  it('returns null when no rows', () => {
    expect(getFirstCell(cols, [])).toBeNull();
  });

  it('skips hidden columns', () => {
    const colsWithHidden: ColumnDef[] = [
      { id: 'c1', field: 'name', title: 'Name', visible: false },
      { id: 'c2', field: 'age', title: 'Age' },
    ];
    expect(getFirstCell(colsWithHidden, rowIds)).toEqual({ rowId: 'r1', field: 'age' });
  });
});

describe('getLastCell', () => {
  it('returns bottom-right visible cell', () => {
    expect(getLastCell(cols, rowIds)).toEqual({ rowId: 'r3', field: 'city' });
  });

  it('returns null when no rows', () => {
    expect(getLastCell(cols, [])).toBeNull();
  });

  it('skips hidden columns', () => {
    const colsWithHidden: ColumnDef[] = [
      { id: 'c1', field: 'name', title: 'Name' },
      { id: 'c2', field: 'city', title: 'City', visible: false },
    ];
    expect(getLastCell(colsWithHidden, rowIds)).toEqual({ rowId: 'r3', field: 'name' });
  });
});

describe('getNextCellInRow', () => {
  it('moves right within the same row', () => {
    const result = getNextCellInRow({ rowId: 'r1', field: 'name' }, cols, rowIds);
    expect(result).toEqual({ rowId: 'r1', field: 'age' });
  });

  it('wraps to first cell of next row at row end', () => {
    const result = getNextCellInRow({ rowId: 'r1', field: 'city' }, cols, rowIds);
    expect(result).toEqual({ rowId: 'r2', field: 'name' });
  });

  it('returns null at last cell of last row', () => {
    const result = getNextCellInRow({ rowId: 'r3', field: 'city' }, cols, rowIds);
    expect(result).toBeNull();
  });
});

describe('getPrevCellInRow', () => {
  it('moves left within the same row', () => {
    const result = getPrevCellInRow({ rowId: 'r1', field: 'age' }, cols, rowIds);
    expect(result).toEqual({ rowId: 'r1', field: 'name' });
  });

  it('wraps to last cell of previous row at row start', () => {
    const result = getPrevCellInRow({ rowId: 'r2', field: 'name' }, cols, rowIds);
    expect(result).toEqual({ rowId: 'r1', field: 'city' });
  });

  it('returns null at first cell of first row', () => {
    const result = getPrevCellInRow({ rowId: 'r1', field: 'name' }, cols, rowIds);
    expect(result).toBeNull();
  });
});

describe('multi-range selection', () => {
  it('toggleRowSelection adds a row to ranges', () => {
    const s = createSelection('row');
    const result = toggleRowSelection(s, 'r1', cols);
    expect(result.ranges).toHaveLength(1);
    expect(result.ranges[0].anchor).toEqual({ rowId: 'r1', field: 'name' });
    expect(result.ranges[0].focus).toEqual({ rowId: 'r1', field: 'city' });
    expect(result.range).toEqual(result.ranges[0]);
  });

  it('toggleRowSelection removes existing row from ranges', () => {
    let s = createSelection('row');
    s = toggleRowSelection(s, 'r1', cols);
    const result = toggleRowSelection(s, 'r1', cols);
    expect(result.ranges).toHaveLength(0);
    expect(result.range).toBeNull();
  });

  it('toggleRowSelection on multiple rows builds up ranges array', () => {
    let s = createSelection('row');
    s = toggleRowSelection(s, 'r1', cols);
    s = toggleRowSelection(s, 'r3', cols);
    expect(s.ranges).toHaveLength(2);
    expect(s.ranges[0].anchor.rowId).toBe('r1');
    expect(s.ranges[1].anchor.rowId).toBe('r3');
    expect(s.range).toEqual(s.ranges[1]);
  });

  it('isRowInRanges returns true for row in a range', () => {
    const ranges = [
      { anchor: { rowId: 'r1', field: 'name' }, focus: { rowId: 'r2', field: 'city' } },
    ];
    expect(isRowInRanges('r1', ranges, cols, rowIds)).toBe(true);
    expect(isRowInRanges('r2', ranges, cols, rowIds)).toBe(true);
  });

  it('isRowInRanges returns false for row not in any range', () => {
    const ranges = [
      { anchor: { rowId: 'r1', field: 'name' }, focus: { rowId: 'r1', field: 'city' } },
    ];
    expect(isRowInRanges('r3', ranges, cols, rowIds)).toBe(false);
  });

  it('selectRow resets ranges to single element', () => {
    let s = createSelection('row');
    s = toggleRowSelection(s, 'r1', cols);
    s = toggleRowSelection(s, 'r2', cols);
    const result = selectRow(s, 'r3', cols);
    expect(result.ranges).toHaveLength(1);
    expect(result.ranges[0].anchor.rowId).toBe('r3');
    expect(result.ranges[0].focus.rowId).toBe('r3');
  });

  it('clearSelection empties ranges', () => {
    let s = createSelection('row');
    s = toggleRowSelection(s, 'r1', cols);
    s = toggleRowSelection(s, 'r2', cols);
    const result = clearSelection(s);
    expect(result.ranges).toHaveLength(0);
    expect(result.range).toBeNull();
  });

  it('extendSelection updates the last range in ranges', () => {
    let s = createSelection('range');
    s = selectCell(s, { rowId: 'r1', field: 'name' });
    // Now ranges has one entry; extend should update it
    const result = extendSelection(s, { rowId: 'r3', field: 'city' });
    expect(result.ranges).toHaveLength(1);
    expect(result.ranges[0].anchor).toEqual({ rowId: 'r1', field: 'name' });
    expect(result.ranges[0].focus).toEqual({ rowId: 'r3', field: 'city' });
  });

  it('createSelection initializes with empty ranges', () => {
    const s = createSelection();
    expect(s.ranges).toEqual([]);
  });
});
