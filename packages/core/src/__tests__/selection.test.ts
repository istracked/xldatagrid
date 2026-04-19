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
  getEndJumpCell,
  isCellValueEmpty,
  isRowFullySelected,
} from '../selection';
import { CellAddress, ColumnDef } from '../types';

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

// ---------------------------------------------------------------------------
// getEndJumpCell / isCellValueEmpty — Excel-style Ctrl+Arrow "End" navigation
// ---------------------------------------------------------------------------

describe('isCellValueEmpty', () => {
  it('treats null, undefined, and empty string as empty', () => {
    expect(isCellValueEmpty(null)).toBe(true);
    expect(isCellValueEmpty(undefined)).toBe(true);
    expect(isCellValueEmpty('')).toBe(true);
  });

  it('treats 0, false, and non-empty strings as non-empty', () => {
    expect(isCellValueEmpty(0)).toBe(false);
    expect(isCellValueEmpty(false)).toBe(false);
    expect(isCellValueEmpty('x')).toBe(false);
  });
});

describe('getEndJumpCell', () => {
  // A 3-column x 4-row fixture with controlled blanks so we can exercise every
  // "current empty / neighbour empty" permutation Excel distinguishes.
  //
  //          name    age    city
  //   r1:    Alice   30     Paris
  //   r2:    Bob     ''     Lyon        ← blank middle column
  //   r3:    ''      ''     ''          ← fully blank row
  //   r4:    Dan     40     Rome
  const endCols: ColumnDef[] = [
    { id: 'c1', field: 'name', title: 'Name' },
    { id: 'c2', field: 'age', title: 'Age' },
    { id: 'c3', field: 'city', title: 'City' },
  ];
  const endRowIds = ['r1', 'r2', 'r3', 'r4'];
  const endData: Record<string, Record<string, unknown>> = {
    r1: { name: 'Alice', age: 30, city: 'Paris' },
    r2: { name: 'Bob', age: '', city: 'Lyon' },
    r3: { name: '', age: '', city: '' },
    r4: { name: 'Dan', age: 40, city: 'Rome' },
  };
  const get = (cell: CellAddress) => endData[cell.rowId]?.[cell.field];

  it('returns null when already at the edge in the requested direction', () => {
    expect(getEndJumpCell({ rowId: 'r1', field: 'name' }, 'left', endCols, endRowIds, get)).toBeNull();
    expect(getEndJumpCell({ rowId: 'r1', field: 'city' }, 'right', endCols, endRowIds, get)).toBeNull();
    expect(getEndJumpCell({ rowId: 'r1', field: 'name' }, 'up', endCols, endRowIds, get)).toBeNull();
    expect(getEndJumpCell({ rowId: 'r4', field: 'name' }, 'down', endCols, endRowIds, get)).toBeNull();
  });

  it('right from a populated run with populated neighbour lands on the run\'s last non-empty cell', () => {
    // r1 is fully populated, so right from name should stop on city (Excel "End" → last non-blank in block).
    expect(getEndJumpCell({ rowId: 'r1', field: 'name' }, 'right', endCols, endRowIds, get))
      .toEqual({ rowId: 'r1', field: 'city' });
  });

  it('right from a populated cell with an empty neighbour skips the gap to the next non-empty cell', () => {
    // r2 row: [Bob, '', Lyon] — right from name should leap over the blank and land on city.
    expect(getEndJumpCell({ rowId: 'r2', field: 'name' }, 'right', endCols, endRowIds, get))
      .toEqual({ rowId: 'r2', field: 'city' });
  });

  it('right from an empty cell stops on the next non-empty neighbour', () => {
    // r2.age is blank; the next populated cell is city.
    expect(getEndJumpCell({ rowId: 'r2', field: 'age' }, 'right', endCols, endRowIds, get))
      .toEqual({ rowId: 'r2', field: 'city' });
  });

  it('right from an all-empty row lands on the far edge', () => {
    // r3 is fully blank — Excel walks to the last column.
    expect(getEndJumpCell({ rowId: 'r3', field: 'name' }, 'right', endCols, endRowIds, get))
      .toEqual({ rowId: 'r3', field: 'city' });
  });

  it('left mirrors right: populated run → first non-empty, gap → skip to next block', () => {
    // r1 (all populated): left from city → name.
    expect(getEndJumpCell({ rowId: 'r1', field: 'city' }, 'left', endCols, endRowIds, get))
      .toEqual({ rowId: 'r1', field: 'name' });
    // r2 (gap in middle): left from city → name, skipping over blank age.
    expect(getEndJumpCell({ rowId: 'r2', field: 'city' }, 'left', endCols, endRowIds, get))
      .toEqual({ rowId: 'r2', field: 'name' });
  });

  it('down from populated with empty gap skips the gap onto the next populated row', () => {
    // name column: r1=Alice, r2=Bob, r3='', r4=Dan. Down from r2 should jump over r3 to r4.
    expect(getEndJumpCell({ rowId: 'r2', field: 'name' }, 'down', endCols, endRowIds, get))
      .toEqual({ rowId: 'r4', field: 'name' });
  });

  it('down from populated with populated neighbour stops at end of contiguous run', () => {
    // name column r1→r2 is a populated run ending at r2 (r3 is blank).
    expect(getEndJumpCell({ rowId: 'r1', field: 'name' }, 'down', endCols, endRowIds, get))
      .toEqual({ rowId: 'r2', field: 'name' });
  });

  it('up from populated with empty gap jumps over the gap to the next populated row', () => {
    // name column: up from r4 (Dan) skips blank r3 and lands on r2 (Bob).
    expect(getEndJumpCell({ rowId: 'r4', field: 'name' }, 'up', endCols, endRowIds, get))
      .toEqual({ rowId: 'r2', field: 'name' });
  });

  it('up from an all-empty column lands on the first row when nothing is populated', () => {
    // age column: r1=30, r2='', r3='', r4=40. From r3 walking up, we look for
    // first non-empty above: r2 is blank, r1 is 30 → land on r1.
    expect(getEndJumpCell({ rowId: 'r3', field: 'age' }, 'up', endCols, endRowIds, get))
      .toEqual({ rowId: 'r1', field: 'age' });
  });

  it('skips hidden columns when scanning horizontally', () => {
    const withHidden: ColumnDef[] = [
      { id: 'c1', field: 'name', title: 'Name' },
      { id: 'c2', field: 'age', title: 'Age', visible: false },
      { id: 'c3', field: 'city', title: 'City' },
    ];
    // r1 populated; age is hidden so the only visible neighbour is city.
    expect(getEndJumpCell({ rowId: 'r1', field: 'name' }, 'right', withHidden, endRowIds, get))
      .toEqual({ rowId: 'r1', field: 'city' });
  });
});

describe('isRowFullySelected', () => {
  it('returns true when range spans anchor-to-focus across all columns on the same row', () => {
    const s = selectRow(createSelection('row'), 'r2', cols);
    expect(isRowFullySelected(s, 'r2', cols)).toBe(true);
  });

  it('returns false for a partial-row range (not all columns covered)', () => {
    const s = createSelection('cell');
    const partial = {
      ...s,
      range: { anchor: { rowId: 'r1', field: 'name' }, focus: { rowId: 'r1', field: 'age' } },
      ranges: [{ anchor: { rowId: 'r1', field: 'name' }, focus: { rowId: 'r1', field: 'age' } }],
    };
    expect(isRowFullySelected(partial, 'r1', cols)).toBe(false);
  });

  it('returns false when range is null', () => {
    const s = createSelection('row');
    expect(isRowFullySelected(s, 'r1', cols)).toBe(false);
  });

  it('returns false when the range belongs to a different row', () => {
    const s = selectRow(createSelection('row'), 'r1', cols);
    expect(isRowFullySelected(s, 'r2', cols)).toBe(false);
  });

  it('returns false when columns list is empty', () => {
    const s = selectRow(createSelection('row'), 'r1', cols);
    expect(isRowFullySelected(s, 'r1', [])).toBe(false);
  });
});
