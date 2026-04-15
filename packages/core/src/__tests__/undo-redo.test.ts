import {
  createUndoRedoState,
  pushCommand,
  undo,
  redo,
  canUndo,
  canRedo,
  clearHistory,
  createCellEditCommand,
  createRowInsertCommand,
  createRowDeleteCommand,
  createRowMoveCommand,
  createBatchCommand,
} from '../undo-redo';

// ---------------------------------------------------------------------------
// createCellEditCommand
// ---------------------------------------------------------------------------

describe('createCellEditCommand', () => {
  it('stores old and new values', () => {
    const data = [{ name: 'Alice' }] as Record<string, unknown>[];
    const cmd = createCellEditCommand(data, 0, 'name', 'Alice', 'Bob');
    expect(cmd.type).toBe('cell:edit');
    expect(cmd.description).toBe('Edit name');
  });

  it('undo reverts cell to previous value', () => {
    const data = [{ name: 'Bob' }] as Record<string, unknown>[];
    const cmd = createCellEditCommand(data, 0, 'name', 'Alice', 'Bob');
    cmd.undo();
    expect(data[0]!.name).toBe('Alice');
  });

  it('redo re-applies the cell edit value', () => {
    const data = [{ name: 'Alice' }] as Record<string, unknown>[];
    const cmd = createCellEditCommand(data, 0, 'name', 'Alice', 'Bob');
    cmd.redo();
    expect(data[0]!.name).toBe('Bob');
  });
});

// ---------------------------------------------------------------------------
// createRowInsertCommand
// ---------------------------------------------------------------------------

describe('createRowInsertCommand', () => {
  it('undo removes the inserted row', () => {
    const row = { id: '1', name: 'New' };
    const data: Record<string, unknown>[] = [row];
    const cmd = createRowInsertCommand(data, 0, row);
    cmd.undo();
    expect(data).toHaveLength(0);
  });

  it('redo re-inserts the row at the correct index', () => {
    const row = { id: '1', name: 'New' };
    const data: Record<string, unknown>[] = [];
    const cmd = createRowInsertCommand(data, 0, row);
    cmd.redo();
    expect(data).toHaveLength(1);
    expect(data[0]).toBe(row);
  });
});

// ---------------------------------------------------------------------------
// createRowDeleteCommand
// ---------------------------------------------------------------------------

describe('createRowDeleteCommand', () => {
  it('undo restores the deleted row at its original index', () => {
    const row = { id: '1', name: 'Gone' };
    const data: Record<string, unknown>[] = [];
    const cmd = createRowDeleteCommand(data, 0, row);
    cmd.undo();
    expect(data).toHaveLength(1);
    expect(data[0]).toBe(row);
  });

  it('redo removes the row again', () => {
    const row = { id: '1', name: 'Gone' };
    const data: Record<string, unknown>[] = [row];
    const cmd = createRowDeleteCommand(data, 0, row);
    cmd.redo();
    expect(data).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// createRowMoveCommand
// ---------------------------------------------------------------------------

describe('createRowMoveCommand', () => {
  it('redo moves row from fromIndex to toIndex', () => {
    const data: Record<string, unknown>[] = [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
      { id: '3', name: 'Charlie' },
    ];
    const cmd = createRowMoveCommand(data, 0, 2);
    cmd.redo();
    expect(data[0]!.id).toBe('2');
    expect(data[1]!.id).toBe('3');
    expect(data[2]!.id).toBe('1');
  });

  it('undo moves row back to fromIndex', () => {
    const data: Record<string, unknown>[] = [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
      { id: '3', name: 'Charlie' },
    ];
    const cmd = createRowMoveCommand(data, 0, 2);
    cmd.redo();
    cmd.undo();
    expect(data[0]!.id).toBe('1');
    expect(data[1]!.id).toBe('2');
    expect(data[2]!.id).toBe('3');
  });

  it('works with adjacent indices', () => {
    const data: Record<string, unknown>[] = [
      { id: '1' },
      { id: '2' },
    ];
    const cmd = createRowMoveCommand(data, 0, 1);
    cmd.redo();
    expect(data[0]!.id).toBe('2');
    expect(data[1]!.id).toBe('1');
  });

  it('works when moving to end of array', () => {
    const data: Record<string, unknown>[] = [
      { id: '1' },
      { id: '2' },
      { id: '3' },
      { id: '4' },
    ];
    const cmd = createRowMoveCommand(data, 1, 3);
    cmd.redo();
    expect(data[0]!.id).toBe('1');
    expect(data[1]!.id).toBe('3');
    expect(data[2]!.id).toBe('4');
    expect(data[3]!.id).toBe('2');
  });
});

// ---------------------------------------------------------------------------
// createBatchCommand
// ---------------------------------------------------------------------------

describe('createBatchCommand', () => {
  it('undoes commands in reverse order', () => {
    const order: number[] = [];
    const commands = [
      { type: 'a', timestamp: 0, undo: () => order.push(1), redo: () => {} },
      { type: 'b', timestamp: 0, undo: () => order.push(2), redo: () => {} },
      { type: 'c', timestamp: 0, undo: () => order.push(3), redo: () => {} },
    ];
    const batch = createBatchCommand(commands);
    batch.undo();
    expect(order).toEqual([3, 2, 1]);
  });

  it('redoes commands in forward order', () => {
    const order: number[] = [];
    const commands = [
      { type: 'a', timestamp: 0, undo: () => {}, redo: () => order.push(1) },
      { type: 'b', timestamp: 0, undo: () => {}, redo: () => order.push(2) },
      { type: 'c', timestamp: 0, undo: () => {}, redo: () => order.push(3) },
    ];
    const batch = createBatchCommand(commands);
    batch.redo();
    expect(order).toEqual([1, 2, 3]);
  });

  it('description includes the command count', () => {
    const commands = [
      { type: 'a', timestamp: 0, undo: () => {}, redo: () => {} },
      { type: 'b', timestamp: 0, undo: () => {}, redo: () => {} },
    ];
    const batch = createBatchCommand(commands);
    expect(batch.description).toBe('Batch (2 operations)');
  });
});

// ---------------------------------------------------------------------------
// undo / redo stack mechanics
// ---------------------------------------------------------------------------

describe('undo', () => {
  it('reverts the last cell edit', () => {
    const data = [{ score: 10 }] as Record<string, unknown>[];
    let state = createUndoRedoState();
    const cmd = createCellEditCommand(data, 0, 'score', 10, 20);
    data[0]!.score = 20;
    state = pushCommand(state, cmd);
    state = undo(state);
    expect(data[0]!.score).toBe(10);
  });

  it('calls the undo function on the command', () => {
    let called = false;
    let state = createUndoRedoState();
    state = pushCommand(state, { type: 'test', timestamp: 0, undo: () => { called = true; }, redo: () => {} });
    undo(state);
    expect(called).toBe(true);
  });

  it('moves the command to the redo stack', () => {
    let state = createUndoRedoState();
    state = pushCommand(state, { type: 'test', timestamp: 0, undo: () => {}, redo: () => {} });
    state = undo(state);
    expect(state.undoStack).toHaveLength(0);
    expect(state.redoStack).toHaveLength(1);
  });

  it('walks back through history with multiple undos', () => {
    const values: number[] = [];
    let state = createUndoRedoState();
    for (let i = 1; i <= 3; i++) {
      const captured = i;
      state = pushCommand(state, { type: 'test', timestamp: 0, undo: () => values.push(captured), redo: () => {} });
    }
    state = undo(state);
    state = undo(state);
    expect(values).toEqual([3, 2]);
  });

  it('has no effect when history is empty', () => {
    const state = createUndoRedoState();
    const next = undo(state);
    expect(next).toBe(state);
  });
});

describe('redo', () => {
  it('re-applies the last undone action', () => {
    const data = [{ score: 10 }] as Record<string, unknown>[];
    let state = createUndoRedoState();
    const cmd = createCellEditCommand(data, 0, 'score', 10, 20);
    data[0]!.score = 20;
    state = pushCommand(state, cmd);
    state = undo(state);   // score -> 10
    state = redo(state);   // score -> 20
    expect(data[0]!.score).toBe(20);
  });

  it('restores cell edit value', () => {
    const data = [{ name: 'Alice' }] as Record<string, unknown>[];
    let state = createUndoRedoState();
    const cmd = createCellEditCommand(data, 0, 'name', 'Alice', 'Bob');
    data[0]!.name = 'Bob';
    state = pushCommand(state, cmd);
    state = undo(state);
    expect(data[0]!.name).toBe('Alice');
    state = redo(state);
    expect(data[0]!.name).toBe('Bob');
  });

  it('restores deleted row removal after undo', () => {
    const row = { id: '1' };
    const data: Record<string, unknown>[] = [row];
    let state = createUndoRedoState();
    const cmd = createRowDeleteCommand(data, 0, row);
    data.splice(0, 1);
    state = pushCommand(state, cmd);
    state = undo(state);   // row restored
    expect(data).toHaveLength(1);
    state = redo(state);   // row deleted again
    expect(data).toHaveLength(0);
  });

  it('restores added row after undo', () => {
    const row = { id: '1' };
    const data: Record<string, unknown>[] = [row];
    let state = createUndoRedoState();
    const cmd = createRowInsertCommand(data, 0, row);
    state = pushCommand(state, cmd);
    state = undo(state);   // row removed
    expect(data).toHaveLength(0);
    state = redo(state);   // row re-inserted
    expect(data).toHaveLength(1);
  });

  it('walks forward through history with multiple redos', () => {
    const values: number[] = [];
    let state = createUndoRedoState();
    for (let i = 1; i <= 3; i++) {
      const captured = i;
      state = pushCommand(state, { type: 'test', timestamp: 0, undo: () => {}, redo: () => values.push(captured) });
    }
    state = undo(state);
    state = undo(state);
    state = undo(state);
    values.length = 0; // reset tracker
    state = redo(state);
    state = redo(state);
    expect(values).toEqual([1, 2]);
  });

  it('has no effect when redo stack is empty', () => {
    const state = createUndoRedoState();
    const next = redo(state);
    expect(next).toBe(state);
  });

  it('clears the redo stack when a new command is pushed after undo', () => {
    let state = createUndoRedoState();
    state = pushCommand(state, { type: 'a', timestamp: 0, undo: () => {}, redo: () => {} });
    state = undo(state);
    expect(state.redoStack).toHaveLength(1);
    state = pushCommand(state, { type: 'b', timestamp: 0, undo: () => {}, redo: () => {} });
    expect(state.redoStack).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// canUndo / canRedo
// ---------------------------------------------------------------------------

describe('canUndo', () => {
  it('returns true when history exists', () => {
    let state = createUndoRedoState();
    state = pushCommand(state, { type: 'x', timestamp: 0, undo: () => {}, redo: () => {} });
    expect(canUndo(state)).toBe(true);
  });

  it('returns false when history is empty', () => {
    expect(canUndo(createUndoRedoState())).toBe(false);
  });
});

describe('canRedo', () => {
  it('returns true when redo stack exists', () => {
    let state = createUndoRedoState();
    state = pushCommand(state, { type: 'x', timestamp: 0, undo: () => {}, redo: () => {} });
    state = undo(state);
    expect(canRedo(state)).toBe(true);
  });

  it('returns false when redo stack is empty', () => {
    expect(canRedo(createUndoRedoState())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// pushCommand / history limit
// ---------------------------------------------------------------------------

describe('pushCommand', () => {
  it('trims the undo stack to maxHistory', () => {
    let state = createUndoRedoState(3);
    for (let i = 0; i < 5; i++) {
      state = pushCommand(state, { type: 'x', timestamp: i, undo: () => {}, redo: () => {} });
    }
    expect(state.undoStack).toHaveLength(3);
  });

  it('history limit prevents memory growth beyond maxHistory', () => {
    let state = createUndoRedoState(2);
    state = pushCommand(state, { type: 'a', timestamp: 1, undo: () => {}, redo: () => {} });
    state = pushCommand(state, { type: 'b', timestamp: 2, undo: () => {}, redo: () => {} });
    state = pushCommand(state, { type: 'c', timestamp: 3, undo: () => {}, redo: () => {} });
    expect(state.undoStack).toHaveLength(2);
    // Oldest command ('a') was evicted; 'b' is now the oldest
    expect(state.undoStack[0]!.type).toBe('b');
  });
});

// ---------------------------------------------------------------------------
// clearHistory
// ---------------------------------------------------------------------------

describe('clearHistory', () => {
  it('empties both the undo and redo stacks', () => {
    let state = createUndoRedoState();
    state = pushCommand(state, { type: 'x', timestamp: 0, undo: () => {}, redo: () => {} });
    state = undo(state);
    state = clearHistory(state);
    expect(state.undoStack).toHaveLength(0);
    expect(state.redoStack).toHaveLength(0);
  });
});
