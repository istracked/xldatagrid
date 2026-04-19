/**
 * Cell editing module for the datagrid core engine.
 *
 * Manages the lifecycle of inline cell edits: beginning an edit, updating the
 * in-progress value (with optional column-level validation), committing or
 * cancelling, and querying edit state. All functions are pure and return new
 * state objects.
 *
 * @module editing
 */

import { CellAddress, CellValue, ColumnDef, ValidationResult } from './types';

/**
 * Captures the full state of an in-progress cell edit.
 *
 * @remarks
 * When no edit is active, `cell` is `null` and the remaining fields hold
 * their default (idle) values.
 */
export interface EditingState {
  /** The address of the cell currently being edited, or `null` when idle. */
  cell: CellAddress | null;
  /** The value the cell held before the edit began. */
  originalValue: CellValue;
  /** The value as modified by the user so far. */
  currentValue: CellValue;
  /** Whether the current value passes column validation. */
  isValid: boolean;
  /** Detailed validation result, or `null` when validation passes. */
  validationError: ValidationResult | null;
}

/**
 * Creates the default (idle) editing state with no active edit.
 *
 * @returns A fresh {@link EditingState} ready for use.
 */
export function createEditingState(): EditingState {
  return { cell: null, originalValue: null, currentValue: null, isValid: true, validationError: null };
}

/**
 * Starts an edit session on the specified cell.
 *
 * Captures the cell address and its current value so the edit can be committed
 * or rolled back later.
 *
 * When a `column` definition is supplied and its `readOnly` flag is `true`,
 * the edit is refused: the current `state` is returned unchanged (same
 * rejection pattern used by other non-editable paths). This column-level
 * opt-out wins over `column.editable === true` and is independent of the
 * grid-level `readOnly` flag enforced by higher layers.
 *
 * @param state - Current editing state (returned unchanged on readOnly rejection).
 * @param cell - The address of the cell to edit.
 * @param value - The cell's current value, which becomes both `originalValue` and `currentValue`.
 * @param column - Optional column definition; when `readOnly: true`, the edit is rejected.
 * @returns A new {@link EditingState} representing an active edit on `cell`, or
 *   the incoming `state` unchanged when the column is read-only.
 */
export function beginEdit(
  state: EditingState,
  cell: CellAddress,
  value: CellValue,
  column?: ColumnDef,
): EditingState {
  // Column-level readOnly wins over both `editable: true` on the same column
  // and the grid-level readOnly flag — callers rely on it for per-column
  // immutability. When the guard fires, leave state untouched so any in-flight
  // edit (unlikely, but defined behaviour) is preserved.
  if (column?.readOnly === true) return state;
  return { cell, originalValue: value, currentValue: value, isValid: true, validationError: null };
}

/**
 * Updates the in-progress edit value and optionally validates it.
 *
 * If the column definition provides a `validate` function, it is invoked with
 * the new value. A validation result with severity `'error'` marks the state
 * as invalid, preventing a subsequent commit.
 *
 * @param state - Current editing state.
 * @param value - The updated cell value entered by the user.
 * @param column - Optional column definition used for validation.
 * @returns A new {@link EditingState} reflecting the updated value and validation outcome.
 */
export function updateEditValue(state: EditingState, value: CellValue, column?: ColumnDef): EditingState {
  // Run column-level validation when a validator is defined
  let validationError: ValidationResult | null = null;
  if (column?.validate) {
    validationError = column.validate(value);
  }
  return {
    ...state,
    currentValue: value,
    isValid: !validationError || validationError.severity !== 'error',
    validationError,
  };
}

/**
 * Attempts to commit the current edit, returning the final value and cell address.
 *
 * The commit is rejected (returns `null`) when there is no active edit or the
 * current value has failed validation.
 *
 * @param state - Current editing state.
 * @returns An object containing the committed `value` and `cell`, or `null` if the commit was rejected.
 */
export function commitEdit(state: EditingState): { value: CellValue; cell: CellAddress } | null {
  // Reject when there is no active edit
  if (!state.cell) return null;
  // Reject when validation has flagged an error
  if (!state.isValid) return null;
  return { value: state.currentValue, cell: state.cell };
}

/**
 * Cancels the current edit session and returns to the idle state.
 *
 * The original cell value is not restored here -- callers should simply discard
 * the editing state and rely on the unchanged underlying data.
 *
 * @param _state - Current editing state (unused; a fresh idle state is returned).
 * @returns A fresh idle {@link EditingState}.
 */
export function cancelEdit(_state: EditingState): EditingState {
  return createEditingState();
}

/**
 * Checks whether any cell is currently being edited.
 *
 * @param state - Current editing state.
 * @returns `true` if an edit session is active.
 */
export function isEditing(state: EditingState): boolean {
  return state.cell !== null;
}

/**
 * Checks whether a specific cell is the one currently being edited.
 *
 * @param state - Current editing state.
 * @param cell - The cell address to test.
 * @returns `true` if the given cell matches the active edit cell.
 */
export function isEditingCell(state: EditingState, cell: CellAddress): boolean {
  return state.cell !== null && state.cell.rowId === cell.rowId && state.cell.field === cell.field;
}
