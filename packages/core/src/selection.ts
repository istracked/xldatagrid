/**
 * Selection module for the datagrid core engine.
 *
 * Manages cell, row, and column selection through an anchor/focus range model.
 * Supports multiple selection modes (`cell`, `row`, `none`), keyboard-driven
 * navigation with boundary clamping, and Tab/Shift-Tab wrapping across rows.
 * Every function is pure -- it returns a new state object rather than mutating
 * the existing one.
 *
 * @module selection
 */

import { CellAddress, CellRange, SelectionMode, ColumnDef } from './types';

/**
 * Represents the current selection within the datagrid.
 *
 * @remarks
 * The `range` property uses an anchor/focus model identical to text selections:
 * the anchor is the cell where the selection started and the focus is the cell
 * where it currently ends. The rectangular region between the two defines the
 * selected area.
 */
export interface SelectionState {
  /** The currently selected rectangular range, or `null` when nothing is selected. */
  range: CellRange | null;
  /** Controls the granularity of selection interactions. */
  mode: SelectionMode;
  /** Multiple selected ranges for multi-range (e.g. Ctrl+click) selection. */
  ranges: CellRange[];
}

/**
 * Creates an initial, empty selection state.
 *
 * @param mode - The selection mode to use. Defaults to `'cell'`.
 * @returns A fresh {@link SelectionState} with no active range.
 */
export function createSelection(mode: SelectionMode = 'cell'): SelectionState {
  return { range: null, mode, ranges: [] };
}

/**
 * Selects a single cell by setting both anchor and focus to the same address.
 *
 * If the selection mode is `'none'`, the state is returned unchanged.
 *
 * @param state - Current selection state.
 * @param cell - The cell to select.
 * @returns Updated selection state with the given cell selected.
 */
export function selectCell(state: SelectionState, cell: CellAddress): SelectionState {
  if (state.mode === 'none') return state;
  const newRange = { anchor: cell, focus: cell };
  return { ...state, range: newRange, ranges: [newRange] };
}

/**
 * Selects an entire row by spanning from the first to the last column.
 *
 * The anchor is placed at the first column and the focus at the last column,
 * both on the given row, producing a range that covers every cell in the row.
 *
 * @param state - Current selection state.
 * @param rowId - Identifier of the row to select.
 * @param columns - Full list of column definitions (used to determine bounds).
 * @returns Updated selection state with the entire row selected.
 */
export function selectRow(state: SelectionState, rowId: string, columns: ColumnDef<any>[]): SelectionState {
  if (state.mode === 'none') return state;
  // Determine the first and last column fields
  const firstCol = columns[0]?.field ?? '';
  const lastCol = columns[columns.length - 1]?.field ?? '';
  const newRange = {
    anchor: { rowId, field: firstCol },
    focus: { rowId, field: lastCol },
  };
  return {
    ...state,
    range: newRange,
    ranges: [newRange],
  };
}

/**
 * Selects an entire column by spanning from the first to the last row.
 *
 * The anchor is placed on the first row and the focus on the last row,
 * both on the given field, producing a range that covers every cell in the column.
 *
 * @param state - Current selection state.
 * @param field - The column field to select.
 * @param rowIds - Ordered list of all row identifiers (used to determine bounds).
 * @returns Updated selection state with the entire column selected.
 */
export function selectColumn(state: SelectionState, field: string, rowIds: string[]): SelectionState {
  if (state.mode === 'none') return state;
  // Determine the first and last row identifiers
  const firstRow = rowIds[0] ?? '';
  const lastRow = rowIds[rowIds.length - 1] ?? '';
  const newRange = {
    anchor: { rowId: firstRow, field },
    focus: { rowId: lastRow, field },
  };
  return {
    ...state,
    range: newRange,
    ranges: [newRange],
  };
}

/**
 * Extends the current selection to a new focus cell while keeping the anchor fixed.
 *
 * This is used during Shift-click or Shift-arrow interactions to grow or shrink
 * the selected rectangular region.
 *
 * @param state - Current selection state (must have an existing range).
 * @param cell - The new focus cell.
 * @returns Updated selection state with the focus moved to `cell`.
 */
export function extendSelection(state: SelectionState, cell: CellAddress): SelectionState {
  if (state.mode === 'none' || !state.range) return state;
  const newRange = { anchor: state.range.anchor, focus: cell };
  const updatedRanges = state.ranges.length > 0
    ? [...state.ranges.slice(0, -1), newRange]
    : [newRange];
  return { ...state, range: newRange, ranges: updatedRanges };
}

/**
 * Clears the active selection, resetting the range to `null`.
 *
 * @param state - Current selection state.
 * @returns Updated selection state with no active range.
 */
export function clearSelection(state: SelectionState): SelectionState {
  return { ...state, range: null, ranges: [] };
}

/**
 * Selects all cells in the grid by spanning from the top-left to the bottom-right cell.
 *
 * Returns the state unchanged when the mode is `'none'` or when the grid is empty.
 *
 * @param state - Current selection state.
 * @param columns - Full list of column definitions.
 * @param rowIds - Ordered list of all row identifiers.
 * @returns Updated selection state covering the entire grid.
 */
export function selectAll(state: SelectionState, columns: ColumnDef<any>[], rowIds: string[]): SelectionState {
  if (state.mode === 'none' || rowIds.length === 0 || columns.length === 0) return state;
  const firstRowId = rowIds[0] ?? '';
  const lastRowId = rowIds[rowIds.length - 1] ?? '';
  const firstField = columns[0]?.field ?? '';
  const lastField = columns[columns.length - 1]?.field ?? '';
  const newRange = {
    anchor: { rowId: firstRowId, field: firstField },
    focus: { rowId: lastRowId, field: lastField },
  };
  return {
    ...state,
    range: newRange,
    ranges: [newRange],
  };
}

/**
 * Tests whether a given cell falls inside a selection range.
 *
 * The range is normalised to a bounding rectangle using column and row indices
 * so that it works regardless of anchor/focus ordering.
 *
 * @param cell - The cell address to test.
 * @param range - The selection range to test against.
 * @param columns - Full list of column definitions (for index resolution).
 * @param rowIds - Ordered list of all row identifiers (for index resolution).
 * @returns `true` when the cell is within the rectangular bounds of the range.
 */
export function isCellInRange(cell: CellAddress, range: CellRange, columns: ColumnDef<any>[], rowIds: string[]): boolean {
  // Resolve column indices for the anchor, focus, and candidate cell
  const colIndices = columns.map(c => c.field);
  const anchorCol = colIndices.indexOf(range.anchor.field);
  const focusCol = colIndices.indexOf(range.focus.field);
  const cellCol = colIndices.indexOf(cell.field);
  const minCol = Math.min(anchorCol, focusCol);
  const maxCol = Math.max(anchorCol, focusCol);

  // Resolve row indices for the anchor, focus, and candidate cell
  const anchorRow = rowIds.indexOf(range.anchor.rowId);
  const focusRow = rowIds.indexOf(range.focus.rowId);
  const cellRow = rowIds.indexOf(cell.rowId);
  const minRow = Math.min(anchorRow, focusRow);
  const maxRow = Math.max(anchorRow, focusRow);

  // Check that the cell falls within the normalised bounding rectangle
  return cellCol >= minCol && cellCol <= maxCol && cellRow >= minRow && cellRow <= maxRow;
}

/**
 * Checks whether a given row is covered by any range in a list of ranges.
 *
 * A row is considered "in" a range when its index falls between the anchor
 * and focus row indices (inclusive) for that range.
 *
 * @param rowId - The row identifier to test.
 * @param ranges - The list of selection ranges to check.
 * @param columns - Full list of column definitions (for index resolution).
 * @param rowIds - Ordered list of all row identifiers (for index resolution).
 * @returns `true` when the row is within at least one range.
 */
export function isRowInRanges(rowId: string, ranges: CellRange[], columns: ColumnDef<any>[], rowIds: string[]): boolean {
  const rowIdx = rowIds.indexOf(rowId);
  if (rowIdx === -1) return false;
  for (const range of ranges) {
    const anchorRow = rowIds.indexOf(range.anchor.rowId);
    const focusRow = rowIds.indexOf(range.focus.rowId);
    const minRow = Math.min(anchorRow, focusRow);
    const maxRow = Math.max(anchorRow, focusRow);
    if (rowIdx >= minRow && rowIdx <= maxRow) return true;
  }
  return false;
}

/**
 * Toggles a row in the multi-range selection.
 *
 * If the row already has a dedicated range in `ranges` (a range where both
 * anchor and focus share the same `rowId`), that range is removed. Otherwise
 * a new full-row range is appended. The `range` property is kept in sync:
 * it points to the last range, or `null` when `ranges` becomes empty.
 *
 * @param state - Current selection state.
 * @param rowId - The row to toggle.
 * @param columns - Full list of column definitions (used to determine bounds).
 * @returns Updated selection state.
 */
export function toggleRowSelection(state: SelectionState, rowId: string, columns: ColumnDef<any>[]): SelectionState {
  if (state.mode === 'none') return state;

  const firstCol = columns[0]?.field ?? '';
  const lastCol = columns[columns.length - 1]?.field ?? '';

  // Check if the row is already represented as its own range
  const existingIdx = state.ranges.findIndex(
    r => r.anchor.rowId === rowId && r.focus.rowId === rowId
  );

  let newRanges: CellRange[];
  if (existingIdx !== -1) {
    // Remove the existing range for this row
    newRanges = [...state.ranges.slice(0, existingIdx), ...state.ranges.slice(existingIdx + 1)];
  } else {
    // Add a new full-row range
    newRanges = [
      ...state.ranges,
      { anchor: { rowId, field: firstCol }, focus: { rowId, field: lastCol } },
    ];
  }

  const newRange = newRanges.length > 0 ? newRanges[newRanges.length - 1]! : null;
  return { ...state, range: newRange, ranges: newRanges };
}

/**
 * Computes the adjacent cell in the given direction, respecting visibility and grid bounds.
 *
 * Hidden columns are skipped. Returns `null` when movement would exceed the grid boundary.
 *
 * @param current - The starting cell address.
 * @param direction - The direction to move (`'up'`, `'down'`, `'left'`, `'right'`).
 * @param columns - Full list of column definitions (hidden columns are excluded).
 * @param rowIds - Ordered list of all row identifiers.
 * @returns The adjacent {@link CellAddress}, or `null` if at the boundary.
 */
export function getNextCell(
  current: CellAddress,
  direction: 'up' | 'down' | 'left' | 'right',
  columns: ColumnDef<any>[],
  rowIds: string[]
): CellAddress | null {
  // Filter to only visible columns so hidden ones are seamlessly skipped
  const visibleCols = columns.filter(c => c.visible !== false);
  const colIdx = visibleCols.findIndex(c => c.field === current.field);
  const rowIdx = rowIds.indexOf(current.rowId);
  if (colIdx === -1 || rowIdx === -1) return null;

  // Move one step in the requested direction, clamping at boundaries
  switch (direction) {
    case 'left': {
      const col = colIdx > 0 ? visibleCols[colIdx - 1] : undefined;
      return col ? { rowId: current.rowId, field: col.field } : null;
    }
    case 'right': {
      const col = colIdx < visibleCols.length - 1 ? visibleCols[colIdx + 1] : undefined;
      return col ? { rowId: current.rowId, field: col.field } : null;
    }
    case 'up': {
      const rowId = rowIdx > 0 ? rowIds[rowIdx - 1] : undefined;
      return rowId != null ? { rowId, field: current.field } : null;
    }
    case 'down': {
      const rowId = rowIdx < rowIds.length - 1 ? rowIds[rowIdx + 1] : undefined;
      return rowId != null ? { rowId, field: current.field } : null;
    }
  }
}

/**
 * Returns the address of the first (top-left) visible cell in the grid.
 *
 * @param columns - Full list of column definitions.
 * @param rowIds - Ordered list of all row identifiers.
 * @returns The top-left {@link CellAddress}, or `null` if the grid is empty.
 */
export function getFirstCell(columns: ColumnDef<any>[], rowIds: string[]): CellAddress | null {
  const visibleCols = columns.filter(c => c.visible !== false);
  const firstRow = rowIds[0];
  const firstCol = visibleCols[0];
  if (!firstCol || firstRow == null) return null;
  return { rowId: firstRow, field: firstCol.field };
}

/**
 * Returns the address of the last (bottom-right) visible cell in the grid.
 *
 * @param columns - Full list of column definitions.
 * @param rowIds - Ordered list of all row identifiers.
 * @returns The bottom-right {@link CellAddress}, or `null` if the grid is empty.
 */
export function getLastCell(columns: ColumnDef<any>[], rowIds: string[]): CellAddress | null {
  const visibleCols = columns.filter(c => c.visible !== false);
  const lastRow = rowIds[rowIds.length - 1];
  const lastCol = visibleCols[visibleCols.length - 1];
  if (!lastCol || lastRow == null) return null;
  return { rowId: lastRow, field: lastCol.field };
}

/**
 * Moves to the next cell in left-to-right, top-to-bottom reading order (Tab behaviour).
 *
 * When the current cell is the last in its row, the cursor wraps to the first
 * visible column of the next row.
 *
 * @param current - The starting cell address.
 * @param columns - Full list of column definitions.
 * @param rowIds - Ordered list of all row identifiers.
 * @returns The next {@link CellAddress} in reading order, or `null` at the grid's end.
 */
export function getNextCellInRow(current: CellAddress, columns: ColumnDef<any>[], rowIds: string[]): CellAddress | null {
  // Try moving right within the same row first
  const next = getNextCell(current, 'right', columns, rowIds);
  if (next) return next;
  // Wrap to first cell of next row
  const rowIdx = rowIds.indexOf(current.rowId);
  const visibleCols = columns.filter(c => c.visible !== false);
  const nextRowId = rowIdx < rowIds.length - 1 ? rowIds[rowIdx + 1] : undefined;
  const firstCol = visibleCols[0];
  if (nextRowId != null && firstCol) {
    return { rowId: nextRowId, field: firstCol.field };
  }
  return null;
}

/**
 * Moves to the previous cell in right-to-left, bottom-to-top reading order (Shift-Tab behaviour).
 *
 * When the current cell is the first in its row, the cursor wraps to the last
 * visible column of the previous row.
 *
 * @param current - The starting cell address.
 * @param columns - Full list of column definitions.
 * @param rowIds - Ordered list of all row identifiers.
 * @returns The previous {@link CellAddress} in reading order, or `null` at the grid's start.
 */
export function createSelectionChecker(
  ranges: CellRange[],
  columns: ColumnDef<any>[],
  rowIds: string[],
): (rowIndex: number, colIndex: number) => boolean {
  if (ranges.length === 0) return () => false;

  const fieldToCol = new Map<string, number>();
  for (let i = 0; i < columns.length; i++) {
    fieldToCol.set(columns[i]!.field, i);
  }
  const rowIdToRow = new Map<string, number>();
  for (let i = 0; i < rowIds.length; i++) {
    rowIdToRow.set(rowIds[i]!, i);
  }

  const bounds: { minRow: number; maxRow: number; minCol: number; maxCol: number }[] = [];
  for (const range of ranges) {
    const anchorRow = rowIdToRow.get(range.anchor.rowId) ?? -1;
    const focusRow = rowIdToRow.get(range.focus.rowId) ?? -1;
    const anchorCol = fieldToCol.get(range.anchor.field) ?? -1;
    const focusCol = fieldToCol.get(range.focus.field) ?? -1;
    if (anchorRow === -1 || focusRow === -1 || anchorCol === -1 || focusCol === -1) continue;
    bounds.push({
      minRow: Math.min(anchorRow, focusRow),
      maxRow: Math.max(anchorRow, focusRow),
      minCol: Math.min(anchorCol, focusCol),
      maxCol: Math.max(anchorCol, focusCol),
    });
  }

  if (bounds.length === 0) return () => false;

  return (rowIndex: number, colIndex: number): boolean => {
    for (const b of bounds) {
      if (rowIndex >= b.minRow && rowIndex <= b.maxRow && colIndex >= b.minCol && colIndex <= b.maxCol) {
        return true;
      }
    }
    return false;
  };
}

export function getPrevCellInRow(current: CellAddress, columns: ColumnDef<any>[], rowIds: string[]): CellAddress | null {
  // Try moving left within the same row first
  const prev = getNextCell(current, 'left', columns, rowIds);
  if (prev) return prev;
  // Wrap to last cell of previous row
  const rowIdx = rowIds.indexOf(current.rowId);
  const visibleCols = columns.filter(c => c.visible !== false);
  const prevRowId = rowIdx > 0 ? rowIds[rowIdx - 1] : undefined;
  const lastCol = visibleCols[visibleCols.length - 1];
  if (prevRowId != null && lastCol) {
    return { rowId: prevRowId, field: lastCol.field };
  }
  return null;
}
