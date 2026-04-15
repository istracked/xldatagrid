/**
 * Undo/redo module for the datagrid core engine.
 *
 * Implements a Command-pattern history stack that supports undoing and redoing
 * cell edits, row insertions, row deletions, and arbitrary batches of operations.
 * The redo stack is automatically cleared whenever a new command is pushed,
 * and the undo stack is trimmed to a configurable maximum depth.
 *
 * @module undo-redo
 */

import { Command } from './types';

/**
 * Holds the dual undo/redo stacks and associated configuration.
 *
 * @remarks
 * `pendingBatch` and `batchTimer` support time-based auto-batching of rapid
 * edits (e.g. typing multiple characters). They are managed externally by the
 * integration layer.
 */
export interface UndoRedoState {
  /** Stack of commands that can be undone, ordered oldest-first. */
  undoStack: Command[];
  /** Stack of commands that can be redone, ordered oldest-first. */
  redoStack: Command[];
  /** Maximum number of commands retained in the undo stack. */
  maxHistory: number;
  /** Milliseconds to wait before flushing a pending auto-batch. */
  batchTimeout: number;
  /** Accumulator for commands within the current auto-batch window, or `null` when idle. */
  pendingBatch: Command[] | null;
  /** Timer handle for the current auto-batch flush, or `null` when idle. */
  batchTimer: ReturnType<typeof setTimeout> | null;
}

/**
 * Creates an empty undo/redo state with the given configuration.
 *
 * @param maxHistory - Maximum number of commands to retain. Defaults to `100`.
 * @param batchTimeout - Auto-batch flush delay in milliseconds. Defaults to `300`.
 * @returns A fresh {@link UndoRedoState} with empty stacks.
 */
export function createUndoRedoState(maxHistory: number = 100, batchTimeout: number = 300): UndoRedoState {
  return { undoStack: [], redoStack: [], maxHistory, batchTimeout, pendingBatch: null, batchTimer: null };
}

/**
 * Pushes a new command onto the undo stack.
 *
 * The redo stack is cleared because a new action invalidates the previously
 * undone future. If the undo stack exceeds `maxHistory`, the oldest command
 * is discarded.
 *
 * @param state - Current undo/redo state.
 * @param command - The command to record.
 * @returns A new state with the command appended to the undo stack.
 */
export function pushCommand(state: UndoRedoState, command: Command): UndoRedoState {
  const undoStack = [...state.undoStack, command];
  // Trim to max history by discarding the oldest entries
  while (undoStack.length > state.maxHistory) undoStack.shift();
  // Clear redo stack on new command -- the old future is no longer reachable
  return { ...state, undoStack, redoStack: [] };
}

/**
 * Undoes the most recent command.
 *
 * Pops the top command from the undo stack, invokes its `undo` callback, and
 * moves it onto the redo stack. Returns the state unchanged when the undo
 * stack is empty.
 *
 * @param state - Current undo/redo state.
 * @returns A new state reflecting the undone command.
 */
export function undo(state: UndoRedoState): UndoRedoState {
  if (state.undoStack.length === 0) return state;
  // Pop the most recent command and execute its undo logic
  const undoStack = [...state.undoStack];
  const command = undoStack.pop()!;
  command.undo();
  // Move the command to the redo stack so it can be re-applied later
  return { ...state, undoStack, redoStack: [...state.redoStack, command] };
}

/**
 * Redoes the most recently undone command.
 *
 * Pops the top command from the redo stack, invokes its `redo` callback, and
 * moves it back onto the undo stack. Returns the state unchanged when the redo
 * stack is empty.
 *
 * @param state - Current undo/redo state.
 * @returns A new state reflecting the redone command.
 */
export function redo(state: UndoRedoState): UndoRedoState {
  if (state.redoStack.length === 0) return state;
  // Pop the most recently undone command and re-apply it
  const redoStack = [...state.redoStack];
  const command = redoStack.pop()!;
  command.redo();
  // Move the command back onto the undo stack
  return { ...state, redoStack, undoStack: [...state.undoStack, command] };
}

/**
 * Indicates whether the undo stack contains any commands.
 *
 * @param state - Current undo/redo state.
 * @returns `true` if at least one command can be undone.
 */
export function canUndo(state: UndoRedoState): boolean {
  return state.undoStack.length > 0;
}

/**
 * Indicates whether the redo stack contains any commands.
 *
 * @param state - Current undo/redo state.
 * @returns `true` if at least one command can be redone.
 */
export function canRedo(state: UndoRedoState): boolean {
  return state.redoStack.length > 0;
}

/**
 * Creates a reversible command for a single cell edit.
 *
 * The command captures the data array, row index, field name, and both old and
 * new values. Undo restores the old value; redo re-applies the new value.
 *
 * @param data - The mutable data array backing the grid.
 * @param rowIndex - Index of the row containing the edited cell.
 * @param field - Column field name of the edited cell.
 * @param oldValue - Value before the edit.
 * @param newValue - Value after the edit.
 * @returns A {@link Command} that can undo and redo the cell edit.
 */
export function createCellEditCommand(
  data: Record<string, unknown>[],
  rowIndex: number,
  field: string,
  oldValue: unknown,
  newValue: unknown
): Command {
  return {
    type: 'cell:edit',
    timestamp: Date.now(),
    description: `Edit ${field}`,
    undo: () => { const row = data[rowIndex]; if (row) row[field] = oldValue; },
    redo: () => { const row = data[rowIndex]; if (row) row[field] = newValue; },
  };
}

/**
 * Creates a reversible command for inserting a new row.
 *
 * Undo removes the inserted row; redo re-inserts it at the original position.
 *
 * @param data - The mutable data array backing the grid.
 * @param index - Position at which to insert the row.
 * @param row - The row object to insert.
 * @returns A {@link Command} that can undo and redo the row insertion.
 */
export function createRowInsertCommand(
  data: Record<string, unknown>[],
  index: number,
  row: Record<string, unknown>
): Command {
  return {
    type: 'row:insert',
    timestamp: Date.now(),
    description: 'Insert row',
    undo: () => { data.splice(index, 1); },
    redo: () => { data.splice(index, 0, row); },
  };
}

/**
 * Creates a reversible command for deleting a row.
 *
 * Undo re-inserts the deleted row at its original position; redo removes it again.
 *
 * @param data - The mutable data array backing the grid.
 * @param index - Position of the row to delete.
 * @param row - The row object being deleted (kept for restoration on undo).
 * @returns A {@link Command} that can undo and redo the row deletion.
 */
export function createRowDeleteCommand(
  data: Record<string, unknown>[],
  index: number,
  row: Record<string, unknown>
): Command {
  return {
    type: 'row:delete',
    timestamp: Date.now(),
    description: 'Delete row',
    undo: () => { data.splice(index, 0, row); },
    redo: () => { data.splice(index, 1); },
  };
}

/**
 * Creates a reversible command for moving a row from one index to another.
 *
 * Undo moves the row back to its original position; redo re-applies the move.
 *
 * @param data - The mutable data array backing the grid.
 * @param fromIndex - Original position of the row to move.
 * @param toIndex - Target position where the row should be placed.
 * @returns A {@link Command} that can undo and redo the row move.
 */
export function createRowMoveCommand(
  data: Record<string, unknown>[],
  fromIndex: number,
  toIndex: number
): Command {
  return {
    type: 'row:move',
    timestamp: Date.now(),
    description: `Move row from ${fromIndex} to ${toIndex}`,
    undo: () => {
      const [row] = data.splice(toIndex, 1);
      if (row) data.splice(fromIndex, 0, row);
    },
    redo: () => {
      const [row] = data.splice(fromIndex, 1);
      if (row) data.splice(toIndex, 0, row);
    },
  };
}

/**
 * Wraps multiple commands into a single batch that is undone/redone atomically.
 *
 * Undo executes child commands in reverse order; redo executes them in forward
 * order, preserving correct sequencing for operations that depend on order.
 *
 * @param commands - The ordered list of commands to group.
 * @returns A single {@link Command} representing the batch.
 *
 * @example
 * ```ts
 * const batch = createBatchCommand([editCmd1, editCmd2]);
 * pushCommand(state, batch); // undo/redo treats both edits as one step
 * ```
 */
export function createBatchCommand(commands: Command[]): Command {
  return {
    type: 'batch',
    timestamp: Date.now(),
    description: `Batch (${commands.length} operations)`,
    // Undo in reverse to correctly unwind dependent mutations
    undo: () => { for (let i = commands.length - 1; i >= 0; i--) { const cmd = commands[i]; if (cmd) cmd.undo(); } },
    // Redo in forward order to re-apply mutations sequentially
    redo: () => { for (const cmd of commands) cmd.redo(); },
  };
}

/**
 * Resets both the undo and redo stacks, discarding all recorded history.
 *
 * @param state - Current undo/redo state.
 * @returns A new state with empty undo and redo stacks.
 */
export function clearHistory(state: UndoRedoState): UndoRedoState {
  return { ...state, undoStack: [], redoStack: [] };
}
