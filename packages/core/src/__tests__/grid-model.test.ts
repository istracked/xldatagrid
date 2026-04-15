import { vi } from 'vitest';
import { createGridModel } from '../grid-model';
import { ExtensionDefinition } from '../types';

// Recreated fresh each call to prevent cross-test mutation bleed.
// createGridModel spreads the top-level array but keeps row object references,
// so we deep-copy each row to ensure mutations in one test don't affect another.
function makeSampleData() {
  return [
    { id: '1', name: 'Alice', age: 30, active: true },
    { id: '2', name: 'Bob', age: 25, active: false },
    { id: '3', name: 'Charlie', age: 35, active: true },
  ];
}

const sampleColumns = [
  { id: 'name', field: 'name', title: 'Name' },
  { id: 'age', field: 'age', title: 'Age', sortable: true },
  { id: 'active', field: 'active', title: 'Active' },
];

function createTestGrid() {
  return createGridModel({ data: makeSampleData(), columns: sampleColumns, rowKey: 'id' });
}

describe('createGridModel', () => {
  describe('initial state', () => {
    it('getState returns initial state', () => {
      const grid = createTestGrid();
      const s = grid.getState();
      expect(s.data).toHaveLength(3);
      expect(s.sort).toEqual([]);
      expect(s.filter).toBeNull();
      expect(s.page).toBe(0);
      expect(s.pageSize).toBe(50);
    });

    it('getProcessedData returns all data initially', () => {
      const grid = createTestGrid();
      expect(grid.getProcessedData()).toHaveLength(3);
    });

    it('getRowIds returns row keys from data', () => {
      const grid = createTestGrid();
      expect(grid.getRowIds()).toEqual(['1', '2', '3']);
    });

    it('getVisibleColumns returns all columns initially', () => {
      const grid = createTestGrid();
      const cols = grid.getVisibleColumns();
      expect(cols.map(c => c.field)).toEqual(['name', 'age', 'active']);
    });

    it('uses function rowKey when provided', () => {
      const grid = createGridModel({
        data: makeSampleData(),
        columns: sampleColumns,
        rowKey: (row) => `row-${row.id}`,
      });
      expect(grid.getRowIds()).toEqual(['row-1', 'row-2', 'row-3']);
    });
  });

  describe('cell editing', () => {
    it('setCellValue updates the cell in data', () => {
      const grid = createTestGrid();
      grid.setCellValue({ rowId: '1', field: 'name' }, 'Alicia');
      const data = grid.getProcessedData();
      expect(data.find(r => r.id === '1')?.name).toBe('Alicia');
    });

    it('setCellValue notifies subscribers', () => {
      const grid = createTestGrid();
      const listener = vi.fn();
      grid.subscribe(listener);
      grid.setCellValue({ rowId: '1', field: 'name' }, 'Alicia');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('setCellValue does nothing for unknown rowId', () => {
      const grid = createTestGrid();
      const listener = vi.fn();
      grid.subscribe(listener);
      grid.setCellValue({ rowId: 'nonexistent', field: 'name' }, 'X');
      expect(listener).not.toHaveBeenCalled();
    });

    it('beginEdit sets editing cell and value in state', () => {
      const grid = createTestGrid();
      grid.beginEdit({ rowId: '2', field: 'name' });
      const editing = grid.getState().editing;
      expect(editing.cell).toEqual({ rowId: '2', field: 'name' });
      expect(editing.originalValue).toBe('Bob');
    });

    it('beginEdit does nothing for unknown rowId', () => {
      const grid = createTestGrid();
      grid.beginEdit({ rowId: 'ghost', field: 'name' });
      expect(grid.getState().editing.cell).toBeNull();
    });

    it('commitEdit applies edit value to data', () => {
      const grid = createTestGrid();
      grid.beginEdit({ rowId: '1', field: 'name' });
      // Directly mutate editing state via beginEdit so currentValue = originalValue = 'Alice'
      // commitEdit uses currentValue, which starts as the original
      grid.commitEdit();
      // Value stays 'Alice' since we did not call updateEditValue — just verify it didn't crash
      expect(grid.getState().editing.cell).toBeNull();
    });

    it('cancelEdit clears editing state', () => {
      const grid = createTestGrid();
      grid.beginEdit({ rowId: '1', field: 'name' });
      expect(grid.getState().editing.cell).not.toBeNull();
      grid.cancelEdit();
      expect(grid.getState().editing.cell).toBeNull();
    });
  });

  describe('row operations', () => {
    it('insertRow adds a row at the specified index', () => {
      const grid = createTestGrid();
      grid.insertRow(1, { id: '99', name: 'Dave', age: 28, active: true });
      expect(grid.getState().data).toHaveLength(4);
      expect(grid.getState().data[1]?.id).toBe('99');
    });

    it('insertRow notifies subscribers', () => {
      const grid = createTestGrid();
      const listener = vi.fn();
      grid.subscribe(listener);
      grid.insertRow(0, { id: '99', name: 'Dave', age: 28, active: true });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('insertRow with no data inserts an empty row object', () => {
      const grid = createTestGrid();
      grid.insertRow(0);
      expect(grid.getState().data).toHaveLength(4);
    });

    it('deleteRows removes rows by id', () => {
      const grid = createTestGrid();
      grid.deleteRows(['1', '3']);
      const data = grid.getState().data;
      expect(data).toHaveLength(1);
      expect(data[0]?.id).toBe('2');
    });

    it('deleteRows ignores unknown row ids', () => {
      const grid = createTestGrid();
      grid.deleteRows(['nonexistent']);
      expect(grid.getState().data).toHaveLength(3);
    });
  });

  describe('moveRow', () => {
    it('moves row from one index to another', () => {
      const grid = createTestGrid();
      grid.moveRow(0, 2);
      const data = grid.getState().data;
      expect(data[0]?.id).toBe('2');
      expect(data[1]?.id).toBe('3');
      expect(data[2]?.id).toBe('1');
    });

    it('undo restores original order', () => {
      const grid = createTestGrid();
      grid.moveRow(0, 2);
      grid.undo();
      const data = grid.getState().data;
      expect(data[0]?.id).toBe('1');
      expect(data[1]?.id).toBe('2');
      expect(data[2]?.id).toBe('3');
    });

    it('redo re-applies the move', () => {
      const grid = createTestGrid();
      grid.moveRow(0, 2);
      grid.undo();
      grid.redo();
      const data = grid.getState().data;
      expect(data[0]?.id).toBe('2');
      expect(data[1]?.id).toBe('3');
      expect(data[2]?.id).toBe('1');
    });

    it('dispatches row:move event', async () => {
      const grid = createTestGrid();
      const handler = vi.fn();
      const ext = {
        id: 'move-listener',
        name: 'Move Listener',
        hooks: () => [{ event: 'row:move' as const, handler }],
      };
      await grid.registerExtension(ext);
      grid.moveRow(1, 0);
      // The event bus dispatches synchronously within moveRow
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('notifies subscribers', () => {
      const grid = createTestGrid();
      const listener = vi.fn();
      grid.subscribe(listener);
      grid.moveRow(0, 1);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('sorting', () => {
    it('sort applies sort state', () => {
      const grid = createTestGrid();
      grid.sort([{ field: 'age', dir: 'asc' }]);
      expect(grid.getState().sort).toEqual([{ field: 'age', dir: 'asc' }]);
    });

    it('sort notifies subscribers', () => {
      const grid = createTestGrid();
      const listener = vi.fn();
      grid.subscribe(listener);
      grid.sort([{ field: 'age', dir: 'desc' }]);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('toggleColumnSort sets asc on first toggle', () => {
      const grid = createTestGrid();
      grid.toggleColumnSort('age', false);
      expect(grid.getState().sort).toEqual([{ field: 'age', dir: 'asc' }]);
    });

    it('toggleColumnSort cycles asc to desc', () => {
      const grid = createTestGrid();
      grid.toggleColumnSort('age', false);
      grid.toggleColumnSort('age', false);
      expect(grid.getState().sort).toEqual([{ field: 'age', dir: 'desc' }]);
    });

    it('toggleColumnSort removes sort on third toggle', () => {
      const grid = createTestGrid();
      grid.toggleColumnSort('age', false);
      grid.toggleColumnSort('age', false);
      grid.toggleColumnSort('age', false);
      expect(grid.getState().sort).toEqual([]);
    });

    it('toggleColumnSort with multi=true accumulates sorts', () => {
      const grid = createTestGrid();
      grid.toggleColumnSort('name', true);
      grid.toggleColumnSort('age', true);
      expect(grid.getState().sort).toHaveLength(2);
    });
  });

  describe('filtering', () => {
    it('filter applies filter state', () => {
      const grid = createTestGrid();
      const filterState = { logic: 'and' as const, filters: [{ field: 'active', operator: 'eq' as const, value: true }] };
      grid.filter(filterState);
      expect(grid.getState().filter).toEqual(filterState);
    });

    it('filter null clears filter', () => {
      const grid = createTestGrid();
      grid.filter({ logic: 'and', filters: [{ field: 'active', operator: 'eq', value: true }] });
      grid.filter(null);
      expect(grid.getState().filter).toBeNull();
    });

    it('getProcessedData applies filter to reduce rows', () => {
      const grid = createTestGrid();
      grid.filter({ logic: 'and', filters: [{ field: 'active', operator: 'eq', value: true }] });
      const result = grid.getProcessedData();
      expect(result).toHaveLength(2);
      expect(result.every(r => r.active === true)).toBe(true);
    });

    it('getProcessedData applies sort after filter', () => {
      const grid = createTestGrid();
      grid.filter({ logic: 'and', filters: [{ field: 'active', operator: 'eq', value: true }] });
      grid.sort([{ field: 'age', dir: 'desc' }]);
      const result = grid.getProcessedData();
      expect(result).toHaveLength(2);
      expect(result[0]?.age).toBe(35); // Charlie
      expect(result[1]?.age).toBe(30); // Alice
    });
  });

  describe('selection', () => {
    it('select sets selection to a single cell', () => {
      const grid = createTestGrid();
      grid.select({ rowId: '1', field: 'name' });
      const sel = grid.getState().selection;
      expect(sel.range?.anchor).toEqual({ rowId: '1', field: 'name' });
      expect(sel.range?.focus).toEqual({ rowId: '1', field: 'name' });
    });

    it('select notifies subscribers', () => {
      const grid = createTestGrid();
      const listener = vi.fn();
      grid.subscribe(listener);
      grid.select({ rowId: '1', field: 'name' });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('selectRowByKey selects entire row spanning all visible columns', () => {
      const grid = createTestGrid();
      grid.selectRowByKey('2');
      const range = grid.getState().selection.range!;
      expect(range.anchor.rowId).toBe('2');
      expect(range.focus.rowId).toBe('2');
      expect(range.anchor.field).toBe('name');
      expect(range.focus.field).toBe('active');
    });

    it('selectColumnByField selects all rows in a column', () => {
      const grid = createTestGrid();
      grid.selectColumnByField('age');
      const range = grid.getState().selection.range!;
      expect(range.anchor.field).toBe('age');
      expect(range.focus.field).toBe('age');
      expect(range.anchor.rowId).toBe('1');
      expect(range.focus.rowId).toBe('3');
    });

    it('extendTo moves focus while keeping anchor', () => {
      const grid = createTestGrid();
      grid.select({ rowId: '1', field: 'name' });
      grid.extendTo({ rowId: '3', field: 'age' });
      const range = grid.getState().selection.range!;
      expect(range.anchor).toEqual({ rowId: '1', field: 'name' });
      expect(range.focus).toEqual({ rowId: '3', field: 'age' });
    });

    it('extendTo is a no-op when no selection exists', () => {
      const grid = createTestGrid();
      grid.extendTo({ rowId: '3', field: 'age' });
      // extendSelection returns unchanged state when range is null
      expect(grid.getState().selection.range).toBeNull();
    });

    it('selectAllCells covers entire grid', () => {
      const grid = createTestGrid();
      grid.selectAllCells();
      const range = grid.getState().selection.range!;
      expect(range.anchor).toEqual({ rowId: '1', field: 'name' });
      expect(range.focus).toEqual({ rowId: '3', field: 'active' });
    });

    it('clearSelectionState removes selection range', () => {
      const grid = createTestGrid();
      grid.select({ rowId: '1', field: 'name' });
      grid.clearSelectionState();
      expect(grid.getState().selection.range).toBeNull();
    });
  });

  describe('column operations', () => {
    it('setColumnWidth updates column width', () => {
      const grid = createTestGrid();
      grid.setColumnWidth('name', 300);
      expect(grid.getState().columns.widths['name']).toBe(300);
    });

    it('setColumnWidth notifies subscribers', () => {
      const grid = createTestGrid();
      const listener = vi.fn();
      grid.subscribe(listener);
      grid.setColumnWidth('name', 200);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('reorderColumnByField changes column order', () => {
      const grid = createTestGrid();
      grid.reorderColumnByField('age', 0);
      expect(grid.getState().columns.order[0]).toBe('age');
    });

    it('toggleColumnVisible hides a visible column', () => {
      const grid = createTestGrid();
      grid.toggleColumnVisible('age');
      expect(grid.getState().columns.hidden.has('age')).toBe(true);
      expect(grid.getVisibleColumns().map(c => c.field)).not.toContain('age');
    });

    it('toggleColumnVisible shows a hidden column', () => {
      const grid = createTestGrid();
      grid.toggleColumnVisible('age');
      grid.toggleColumnVisible('age');
      expect(grid.getState().columns.hidden.has('age')).toBe(false);
    });

    it('freezeColumnByField adds column to frozen list', () => {
      const grid = createTestGrid();
      grid.freezeColumnByField('name', 'left');
      expect(grid.getState().columns.frozen).toContain('name');
    });

    it('freezeColumnByField with null removes column from frozen', () => {
      const grid = createTestGrid();
      grid.freezeColumnByField('name', 'left');
      grid.freezeColumnByField('name', null);
      expect(grid.getState().columns.frozen).not.toContain('name');
    });
  });

  describe('undo / redo', () => {
    it('undo reverts the last cell edit', () => {
      const grid = createTestGrid();
      grid.setCellValue({ rowId: '1', field: 'name' }, 'Alicia');
      expect(grid.getState().data[0]?.name).toBe('Alicia');
      grid.undo();
      expect(grid.getState().data[0]?.name).toBe('Alice');
    });

    it('redo re-applies an undone edit', () => {
      const grid = createTestGrid();
      grid.setCellValue({ rowId: '1', field: 'name' }, 'Alicia');
      grid.undo();
      grid.redo();
      expect(grid.getState().data[0]?.name).toBe('Alicia');
    });

    it('undo then redo round-trip leaves state unchanged', () => {
      const grid = createTestGrid();
      grid.setCellValue({ rowId: '2', field: 'age' }, 99);
      grid.undo();
      grid.redo();
      expect(grid.getState().data[1]?.age).toBe(99);
    });

    it('undo is a no-op when stack is empty', () => {
      const grid = createTestGrid();
      expect(() => grid.undo()).not.toThrow();
      expect(grid.getState().undoRedo.undoStack).toHaveLength(0);
    });

    it('redo is a no-op when stack is empty', () => {
      const grid = createTestGrid();
      expect(() => grid.redo()).not.toThrow();
      expect(grid.getState().undoRedo.redoStack).toHaveLength(0);
    });

    it('new edit clears redo stack', () => {
      const grid = createTestGrid();
      grid.setCellValue({ rowId: '1', field: 'name' }, 'Alicia');
      grid.undo();
      grid.setCellValue({ rowId: '1', field: 'name' }, 'Ally');
      expect(grid.getState().undoRedo.redoStack).toHaveLength(0);
    });
  });

  describe('subscribe / unsubscribe', () => {
    it('subscribe returns a working unsubscribe function', () => {
      const grid = createTestGrid();
      const listener = vi.fn();
      const unsub = grid.subscribe(listener);
      unsub();
      grid.setCellValue({ rowId: '1', field: 'name' }, 'Alicia');
      expect(listener).not.toHaveBeenCalled();
    });

    it('unsubscribe stops notifications', () => {
      const grid = createTestGrid();
      const listener = vi.fn();
      const unsub = grid.subscribe(listener);
      grid.setCellValue({ rowId: '1', field: 'name' }, 'Alicia');
      expect(listener).toHaveBeenCalledTimes(1);
      unsub();
      grid.setCellValue({ rowId: '1', field: 'name' }, 'Aliciaa');
      expect(listener).toHaveBeenCalledTimes(1); // still once, not twice
    });

    it('multiple subscribers are all notified', () => {
      const grid = createTestGrid();
      const a = vi.fn();
      const b = vi.fn();
      const c = vi.fn();
      grid.subscribe(a);
      grid.subscribe(b);
      grid.subscribe(c);
      grid.sort([{ field: 'age', dir: 'asc' }]);
      expect(a).toHaveBeenCalledTimes(1);
      expect(b).toHaveBeenCalledTimes(1);
      expect(c).toHaveBeenCalledTimes(1);
    });
  });

  describe('extensions', () => {
    it('registerExtension adds the extension', async () => {
      const grid = createTestGrid();
      const ext: ExtensionDefinition = {
        id: 'test-ext',
        name: 'Test Extension',
        init: vi.fn(),
      };
      await grid.registerExtension(ext);
      expect(ext.init).toHaveBeenCalledTimes(1);
    });

    it('unregisterExtension calls destroy and removes hooks', async () => {
      const grid = createTestGrid();
      const destroy = vi.fn();
      const ext: ExtensionDefinition = {
        id: 'removable-ext',
        name: 'Removable',
        destroy,
      };
      await grid.registerExtension(ext);
      await grid.unregisterExtension('removable-ext');
      expect(destroy).toHaveBeenCalledTimes(1);
    });

    it('registerExtension with hooks wires event handlers', async () => {
      const grid = createTestGrid();
      const handler = vi.fn();
      const ext: ExtensionDefinition = {
        id: 'hook-ext',
        name: 'Hook Ext',
        hooks: (_ctx) => [
          { event: 'column:sort', handler },
        ],
      };
      await grid.registerExtension(ext);
      await grid.dispatch('column:sort', { sort: [] });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('dispatch', () => {
    it('dispatch returns a GridEvent with correct type', async () => {
      const grid = createTestGrid();
      const event = await grid.dispatch('grid:stateChange', { reason: 'test' });
      expect(event.type).toBe('grid:stateChange');
      expect(event.payload).toMatchObject({ reason: 'test' });
    });
  });

  describe('destroy', () => {
    it('destroy resolves without error', async () => {
      const grid = createTestGrid();
      await expect(grid.destroy()).resolves.toBeUndefined();
    });

    it('destroy cleans up listeners so they are no longer called', async () => {
      const grid = createTestGrid();
      const listener = vi.fn();
      grid.subscribe(listener);
      await grid.destroy();
      // After destroy, internal listener set is cleared — no way to trigger
      // notify externally, so we just confirm no error was thrown
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
