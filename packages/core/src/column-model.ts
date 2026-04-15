/**
 * Column model module for the datagrid core engine.
 *
 * Manages column layout concerns: display ordering, per-column widths (with
 * min/max clamping), visibility toggling, and column freezing. The state is
 * derived from column definitions at initialisation time and updated immutably
 * through dedicated transform functions.
 *
 * @module column-model
 */

import { ColumnDef } from './types';

/**
 * The runtime column layout state.
 *
 * @remarks
 * `order` decouples display order from the original definition order, enabling
 * drag-and-drop reordering without mutating column definitions. `hidden` and
 * `frozen` track visibility and pinning independently.
 */
export interface ColumnState<TData = Record<string, unknown>> {
  /** The original column definitions. */
  columns: ColumnDef<TData>[];
  /** Field names in current display order. */
  order: string[];
  /** Mapping from field name to current pixel width. */
  widths: Record<string, number>;
  /** Set of field names that are currently hidden. */
  hidden: Set<string>;
  /** Field names of frozen (pinned) columns, in display order. */
  frozen: string[];
}

/**
 * Initialises a {@link ColumnState} from an array of column definitions.
 *
 * Widths default to `150px` when not specified in the definition. Frozen columns
 * are populated from definitions that have `frozen` set to a truthy value.
 *
 * @param columns - The column definitions to initialise from.
 * @returns A fully populated column state.
 */
export function createColumnState<TData = Record<string, unknown>>(columns: ColumnDef<TData>[]): ColumnState<TData> {
  // Derive initial display order from definition order
  const order = columns.map(c => c.field);
  const widths: Record<string, number> = {};
  const frozen: string[] = [];
  for (const col of columns) {
    // Use the defined width or fall back to the 150px default
    widths[col.field] = col.width ?? 150;
    if (col.frozen) frozen.push(col.field);
  }
  return { columns, order, widths, hidden: new Set(), frozen };
}

/**
 * Returns the list of visible column definitions in their current display order.
 *
 * Hidden columns are excluded and the result follows the `order` array rather
 * than the original definition order.
 *
 * @param state - Current column state.
 * @returns Ordered array of visible {@link ColumnDef} objects.
 */
export function getVisibleColumns<TData = Record<string, unknown>>(state: ColumnState<TData>): ColumnDef<TData>[] {
  return state.order
    // Exclude hidden columns
    .filter(field => !state.hidden.has(field))
    // Resolve field names back to full definitions
    .map(field => state.columns.find(c => c.field === field))
    .filter((col): col is ColumnDef<TData> => col != null);
}

/**
 * Retrieves the current pixel width for a column.
 *
 * Falls back to `150px` if no width has been recorded for the field.
 *
 * @param state - Current column state.
 * @param field - The column field name.
 * @returns The column width in pixels.
 */
export function getColumnWidth<TData = Record<string, unknown>>(state: ColumnState<TData>, field: string): number {
  return state.widths[field] ?? 150;
}

/**
 * Resizes a column, clamping the new width to the column's `minWidth` and `maxWidth`.
 *
 * If the column definition does not specify bounds, the width is clamped to
 * a minimum of `50px` and no maximum.
 *
 * @param state - Current column state.
 * @param field - The column field name to resize.
 * @param width - The desired new width in pixels.
 * @returns A new column state with the updated width.
 */
export function resizeColumn<TData = Record<string, unknown>>(state: ColumnState<TData>, field: string, width: number): ColumnState<TData> {
  // Look up the column definition to read min/max constraints
  const col = state.columns.find(c => c.field === field);
  const minW = col?.minWidth ?? 50;
  const maxW = col?.maxWidth ?? Infinity;
  // Clamp the requested width to the allowed range
  const clamped = Math.max(minW, Math.min(maxW, width));
  return { ...state, widths: { ...state.widths, [field]: clamped } };
}

/**
 * Moves a column to a new position in the display order.
 *
 * The column is removed from its current index and inserted at `toIndex`.
 * Returns the state unchanged if the field is not found.
 *
 * @param state - Current column state.
 * @param field - The column field name to move.
 * @param toIndex - The target index in the display order.
 * @returns A new column state with the updated order.
 */
export function reorderColumn<TData = Record<string, unknown>>(state: ColumnState<TData>, field: string, toIndex: number): ColumnState<TData> {
  const order = [...state.order];
  const fromIndex = order.indexOf(field);
  if (fromIndex === -1) return state;
  // Remove from old position and insert at the new one
  order.splice(fromIndex, 1);
  order.splice(toIndex, 0, field);
  return { ...state, order };
}

/**
 * Toggles a column between visible and hidden states.
 *
 * @param state - Current column state.
 * @param field - The column field name to toggle.
 * @returns A new column state with the field's visibility flipped.
 */
export function toggleColumnVisibility<TData = Record<string, unknown>>(state: ColumnState<TData>, field: string): ColumnState<TData> {
  const hidden = new Set(state.hidden);
  if (hidden.has(field)) {
    hidden.delete(field);
  } else {
    hidden.add(field);
  }
  return { ...state, hidden };
}

/**
 * Freezes (pins) a column to the left or right edge, or unfreezes it.
 *
 * Passing `null` for `position` removes the column from the frozen list.
 * `'left'` prepends the column; `'right'` appends it.
 *
 * @param state - Current column state.
 * @param field - The column field name to freeze or unfreeze.
 * @param position - `'left'` to pin at the start, `'right'` to pin at the end, or `null` to unpin.
 * @returns A new column state reflecting the updated freeze configuration.
 */
export function freezeColumn<TData = Record<string, unknown>>(state: ColumnState<TData>, field: string, position: 'left' | 'right' | null): ColumnState<TData> {
  // Remove the field from frozen first, then re-add at the correct position if needed
  let frozen = state.frozen.filter(f => f !== field);
  if (position) {
    frozen = position === 'left' ? [field, ...frozen] : [...frozen, field];
  }
  return { ...state, frozen };
}

/**
 * Checks whether a column is currently frozen (pinned).
 *
 * @param state - Current column state.
 * @param field - The column field name to check.
 * @returns `true` if the column is in the frozen list.
 */
export function isColumnFrozen<TData = Record<string, unknown>>(state: ColumnState<TData>, field: string): boolean {
  return state.frozen.includes(field);
}

/**
 * Returns an ordered list of `{ field, width }` pairs for all visible columns.
 *
 * Useful for rendering the column header and body cells in layout order.
 *
 * @param state - Current column state.
 * @returns Array of objects pairing each visible field with its pixel width.
 */
export function getOrderedColumnWidths<TData = Record<string, unknown>>(state: ColumnState<TData>): { field: string; width: number }[] {
  return getVisibleColumns(state).map(col => ({
    field: col.field,
    width: state.widths[col.field] ?? 150,
  }));
}
