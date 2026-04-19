/**
 * Central orchestration module for the datagrid's data and interaction lifecycle.
 *
 * This module exposes the {@link GridModel} interface and its factory function
 * {@link createGridModel}. Together they form the imperative "model" layer that
 * owns all mutable grid state -- data rows, column layout, sorting, filtering,
 * selection, inline editing, undo/redo history, grouping, and pagination -- and
 * coordinates mutations through an event-driven plugin architecture.
 *
 * The model is framework-agnostic: React (or any other view layer) can drive
 * re-renders via the `subscribe` / `getState` contract compatible with
 * `useSyncExternalStore`.
 *
 * @module grid-model
 */
import {
  GridConfig, GridState, CellAddress, CellValue, SortState,
  FilterState, Command, GridListener, RowKeyResolver, ColumnDef,
  GridEvent, GridEventType, GridCommands, ExtensionContext, ExtensionDefinition,
  GroupState, SelectionMode,
} from './types';
import { EventBus } from './events';
import { PluginHost } from './plugin';
import {
  createColumnState, ColumnState, resizeColumn, reorderColumn,
  toggleColumnVisibility, freezeColumn, getVisibleColumns,
} from './column-model';
import { applySorting, toggleSort } from './sorting';
import { applyFiltering } from './filtering';
import {
  createSelection, SelectionState, selectCell, selectRow, selectColumn,
  extendSelection, extendRowSelection, clearSelection, selectAll, toggleRowSelection,
} from './selection';
import {
  createEditingState, EditingState, beginEdit as beginEditState,
  commitEdit as commitEditState, cancelEdit as cancelEditState,
} from './editing';
import {
  createUndoRedoState, UndoRedoState, pushCommand, undo as undoOp, redo as redoOp,
} from './undo-redo';
import { groupRows, createGroupState } from './grouping';

export interface GridModel<TData = Record<string, unknown>> {
  getState(): GridModelState<TData>;
  getProcessedData(): TData[];
  getRowIds(): string[];
  getVisibleColumns(): ColumnDef<TData>[];
  setCellValue(cell: CellAddress, value: unknown): Promise<void>;
  beginEdit(cell: CellAddress): void;
  commitEdit(): Promise<void>;
  cancelEdit(): void;
  insertRow(index: number, data?: Record<string, unknown>): Promise<void>;
  deleteRows(rowIds: string[]): Promise<void>;
  moveRow(fromIndex: number, toIndex: number): Promise<void>;
  toggleRowSelect(rowId: string): void;
  sort(state: SortState): void;
  toggleColumnSort(field: string, multi: boolean): void;
  filter(state: FilterState | null): void;
  select(cell: CellAddress): void;
  selectRowByKey(rowId: string): void;
  selectColumnByField(field: string): void;
  extendTo(cell: CellAddress): void;
  extendRowSelection(rowId: string): void;
  selectAllCells(): void;
  clearSelectionState(): void;
  setColumnWidth(field: string, width: number): void;
  reorderColumnByField(field: string, toIndex: number): void;
  toggleColumnVisible(field: string): void;
  freezeColumnByField(field: string, position: 'left' | 'right' | null): void;
  undo(): void;
  redo(): void;
  toggleSubGridExpansion(rowId: string): void;
  registerExtension(ext: ExtensionDefinition): Promise<void>;
  unregisterExtension(id: string): Promise<void>;
  subscribe(listener: GridListener): () => void;
  dispatch(type: GridEventType, payload?: Record<string, unknown>): Promise<GridEvent>;
  destroy(): Promise<void>;
}

export interface GridModelState<TData = Record<string, unknown>> {
  data: TData[];
  columns: ColumnState<TData>;
  sort: SortState;
  filter: FilterState | null;
  selection: SelectionState;
  editing: EditingState;
  undoRedo: UndoRedoState;
  groupState: GroupState;
  expandedRows: Set<string>;
  expandedSubGrids: Set<string>;
  page: number;
  pageSize: number;
  config: GridConfig<TData>;
}

export function createGridModel<TData extends Record<string, unknown>>(
  config: GridConfig<TData>
): GridModel<TData> {
  const resolveRowKey: RowKeyResolver<TData> = typeof config.rowKey === 'function'
    ? config.rowKey
    : (row: TData) => String(row[config.rowKey as keyof TData]);

  let state: GridModelState<TData> = {
    data: [...config.data],
    columns: createColumnState(config.columns),
    sort: [],
    filter: null,
    selection: createSelection(config.selectionMode ?? 'cell'),
    editing: createEditingState(),
    undoRedo: createUndoRedoState(),
    groupState: createGroupState(),
    expandedRows: new Set(),
    expandedSubGrids: new Set(),
    page: 0,
    pageSize: config.pageSize ?? 50,
    config,
  };

  const listeners = new Set<GridListener>();
  const eventBus = new EventBus();

  function notify() {
    for (const l of listeners) l();
  }

  function getRowIds(): string[] {
    return state.data.map(row => resolveRowKey(row));
  }

  let cachedProcessedData: TData[] | null = null;
  let lastDataRef: TData[] | null = null;
  let lastSortRef: SortState | null = null;
  let lastFilterRef: FilterState | null = null;

  function getProcessedData(): TData[] {
    if (
      cachedProcessedData &&
      state.data === lastDataRef &&
      state.sort === lastSortRef &&
      state.filter === lastFilterRef
    ) {
      return cachedProcessedData;
    }
    let result = state.data;
    result = applyFiltering(result as Record<string, unknown>[] as TData[], state.filter);
    result = applySorting(result as Record<string, unknown>[] as TData[], state.sort);
    cachedProcessedData = result;
    lastDataRef = state.data;
    lastSortRef = state.sort;
    lastFilterRef = state.filter;
    return result;
  }

  const commands: GridCommands = {
    setCellValue: async (cell, value) => model.setCellValue(cell, value),
    beginEdit: async (cell) => model.beginEdit(cell),
    commitEdit: async () => model.commitEdit(),
    cancelEdit: async () => model.cancelEdit(),
    insertRow: async (index, data) => model.insertRow(index, data),
    deleteRows: async (rowIds) => model.deleteRows(rowIds),
    setSelection: (range) => {
      if (range) model.select(range.anchor);
      else model.clearSelectionState();
    },
    scrollToCell: () => {},
    invalidateCells: () => notify(),
    invalidateAll: () => notify(),
    sort: (s) => model.sort(s),
    filter: (f) => model.filter(f),
    setColumnWidth: (field, width) => model.setColumnWidth(field, width),
    reorderColumn: (field, toIndex) => model.reorderColumnByField(field, toIndex),
    toggleColumnVisibility: (field) => model.toggleColumnVisible(field),
    freezeColumn: (field, frozen) => model.freezeColumnByField(field, frozen),
    undo: () => model.undo(),
    redo: () => model.redo(),
  };

  const pluginHost = new PluginHost(
    eventBus,
    () => ({
      data: state.data,
      columns: getVisibleColumns(state.columns) as ColumnDef[],
      sort: state.sort,
      filter: state.filter,
      selection: state.selection.range,
      editingCell: state.editing.cell,
      page: state.page,
      pageSize: state.pageSize,
      expandedRows: state.expandedRows,
      expandedSubGrids: state.expandedSubGrids,
      columnOrder: state.columns.order,
      columnWidths: state.columns.widths,
      hiddenColumns: state.columns.hidden,
      frozenColumns: state.columns.frozen,
      groupState: state.groupState,
      undoStack: state.undoRedo.undoStack,
      redoStack: state.undoRedo.redoStack,
    }),
    () => commands,
  );

  const model: GridModel<TData> = {
    getState: () => state,
    getProcessedData,
    getRowIds,
    getVisibleColumns: () => getVisibleColumns(state.columns),

    async setCellValue(cell: CellAddress, value: unknown) {
      const rowIds = getRowIds();
      const rowIndex = rowIds.indexOf(cell.rowId);
      if (rowIndex === -1) return;

      const row = state.data[rowIndex];
      if (!row) return;
      const oldValue = row[cell.field as keyof TData];

      const beforeEvent = await eventBus.dispatch('before:cell:valueChange', { cell, oldValue, newValue: value });
      if (beforeEvent.cancelled) return;

      const before = structuredClone(state.data);
      const after = structuredClone(state.data);
      after[rowIndex] = { ...after[rowIndex]!, [cell.field]: value } as TData;

      const cmd: Command = {
        type: 'cell:edit',
        timestamp: Date.now(),
        description: `Edit ${cell.field}`,
        undo: () => { state = { ...state, data: structuredClone(before) }; },
        redo: () => { state = { ...state, data: structuredClone(after) }; },
      };

      state = { ...state, data: after, undoRedo: pushCommand(state.undoRedo, cmd) };

      await eventBus.dispatch('cell:valueChange', { cell, oldValue, newValue: value });
      notify();
    },

    beginEdit(cell: CellAddress) {
      const rowIds = getRowIds();
      const rowIndex = rowIds.indexOf(cell.rowId);
      if (rowIndex === -1) return;
      const row = state.data[rowIndex];
      if (!row) return;
      const value = row[cell.field as keyof TData] as CellValue;
      state = { ...state, editing: beginEditState(state.editing, cell, value) };
      notify();
    },

    async commitEdit() {
      const result = commitEditState(state.editing);
      if (result) {
        await model.setCellValue(result.cell, result.value);
      }
      state = { ...state, editing: cancelEditState(state.editing) };
      notify();
    },

    cancelEdit() {
      state = { ...state, editing: cancelEditState(state.editing) };
      notify();
    },

    async insertRow(index: number, data?: Record<string, unknown>) {
      const newRow = (data ?? {}) as TData;

      const beforeEvent = await eventBus.dispatch('before:row:insert', { index, data: newRow });
      if (beforeEvent.cancelled) return;

      const before = structuredClone(state.data);
      const after = structuredClone(state.data);
      after.splice(index, 0, newRow);

      const cmd: Command = {
        type: 'row:insert',
        timestamp: Date.now(),
        description: 'Insert row',
        undo: () => { state = { ...state, data: structuredClone(before) }; },
        redo: () => { state = { ...state, data: structuredClone(after) }; },
      };

      state = { ...state, data: after, undoRedo: pushCommand(state.undoRedo, cmd) };
      await eventBus.dispatch('row:insert', { index, data: newRow });
      notify();
    },

    async deleteRows(rowIds: string[]) {
      const allRowIds = getRowIds();
      const entries = rowIds
        .map(rowId => ({ rowId, index: allRowIds.indexOf(rowId) }))
        .filter(e => e.index !== -1)
        .sort((a, b) => b.index - a.index);

      if (entries.length === 0) return;

      const beforeEvent = await eventBus.dispatch('before:row:delete', { rowIds });
      if (beforeEvent.cancelled) return;

      const before = structuredClone(state.data);
      const after = structuredClone(state.data);
      for (const { index } of entries) {
        const originalRow = state.data[index] as TData;
        const clonedIndex = after.findIndex(
          (r) => JSON.stringify(r) === JSON.stringify(originalRow)
        );
        if (clonedIndex !== -1) after.splice(clonedIndex, 1);
      }

      const batchCmd: Command = {
        type: 'batch',
        timestamp: Date.now(),
        description: `Delete ${entries.length} row(s)`,
        undo: () => { state = { ...state, data: structuredClone(before) }; },
        redo: () => { state = { ...state, data: structuredClone(after) }; },
      };

      state = { ...state, data: after, undoRedo: pushCommand(state.undoRedo, batchCmd) };
      await eventBus.dispatch('row:delete', { rowIds });
      notify();
    },

    async moveRow(fromIndex: number, toIndex: number) {
      const beforeEvent = await eventBus.dispatch('before:row:move', { fromIndex, toIndex });
      if (beforeEvent.cancelled) return;

      const before = structuredClone(state.data);
      const after = structuredClone(before);
      const [row] = after.splice(fromIndex, 1);
      if (row) after.splice(toIndex, 0, row);

      const cmd: Command = {
        type: 'row:move',
        timestamp: Date.now(),
        description: `Move row from ${fromIndex} to ${toIndex}`,
        undo: () => { state = { ...state, data: structuredClone(before) }; },
        redo: () => { state = { ...state, data: structuredClone(after) }; },
      };

      state = { ...state, data: after, undoRedo: pushCommand(state.undoRedo, cmd) };
      await eventBus.dispatch('row:move', { fromIndex, toIndex });
      notify();
    },

    toggleRowSelect(rowId: string) {
      const columns = getVisibleColumns(state.columns);
      state = { ...state, selection: toggleRowSelection(state.selection, rowId, columns) };
      notify();
    },

    sort(sortState: SortState) {
      state = { ...state, sort: sortState };
      eventBus.dispatch('column:sort', { sort: sortState });
      notify();
    },

    toggleColumnSort(field: string, multi: boolean) {
      const newSort = toggleSort(state.sort, field, multi);
      model.sort(newSort);
    },

    filter(filterState: FilterState | null) {
      state = { ...state, filter: filterState };
      eventBus.dispatch('column:filter', { filter: filterState });
      notify();
    },

    select(cell: CellAddress) {
      state = { ...state, selection: selectCell(state.selection, cell) };
      eventBus.dispatch('cell:selectionChange', { selection: state.selection.range });
      notify();
    },

    selectRowByKey(rowId: string) {
      const cols = getVisibleColumns(state.columns);
      state = { ...state, selection: selectRow(state.selection, rowId, cols) };
      notify();
    },

    selectColumnByField(field: string) {
      const rowIds = getRowIds();
      state = { ...state, selection: selectColumn(state.selection, field, rowIds) };
      notify();
    },

    extendTo(cell: CellAddress) {
      state = { ...state, selection: extendSelection(state.selection, cell) };
      notify();
    },

    extendRowSelection(rowId: string) {
      const cols = getVisibleColumns(state.columns);
      state = { ...state, selection: extendRowSelection(state.selection, rowId, cols) };
      notify();
    },

    selectAllCells() {
      const cols = getVisibleColumns(state.columns) as ColumnDef<TData>[];
      const rowIds = getRowIds();
      state = { ...state, selection: selectAll(state.selection, cols as ColumnDef[], rowIds) };
      notify();
    },

    clearSelectionState() {
      state = { ...state, selection: clearSelection(state.selection) };
      notify();
    },

    setColumnWidth(field: string, width: number) {
      state = { ...state, columns: resizeColumn(state.columns, field, width) };
      eventBus.dispatch('column:resize', { field, width });
      notify();
    },

    reorderColumnByField(field: string, toIndex: number) {
      state = { ...state, columns: reorderColumn(state.columns, field, toIndex) };
      eventBus.dispatch('column:reorder', { field, toIndex });
      notify();
    },

    toggleColumnVisible(field: string) {
      state = { ...state, columns: toggleColumnVisibility(state.columns, field) };
      eventBus.dispatch('column:visibility', { field });
      notify();
    },

    freezeColumnByField(field: string, position: 'left' | 'right' | null) {
      state = { ...state, columns: freezeColumn(state.columns, field, position) };
      notify();
    },

    toggleSubGridExpansion(rowId: string) {
      const next = new Set(state.expandedSubGrids);
      const singleExpand = state.config.subGrid?.singleExpand ?? false;

      if (next.has(rowId)) {
        next.delete(rowId);
        state = { ...state, expandedSubGrids: next };
        eventBus.dispatch('subGrid:collapse', { rowId });
      } else {
        if (singleExpand) {
          next.clear();
        }
        next.add(rowId);
        state = { ...state, expandedSubGrids: next };
        eventBus.dispatch('subGrid:expand', { rowId });
      }
      notify();
    },

    undo() {
      const newUndoRedo = undoOp(state.undoRedo);
      state = { ...state, undoRedo: newUndoRedo };
      notify();
    },

    redo() {
      const newUndoRedo = redoOp(state.undoRedo);
      state = { ...state, undoRedo: newUndoRedo };
      notify();
    },

    async registerExtension(ext: ExtensionDefinition) {
      await pluginHost.register(ext);
    },

    async unregisterExtension(id: string) {
      await pluginHost.unregister(id);
    },

    subscribe(listener: GridListener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },

    async dispatch(type: GridEventType, payload: Record<string, unknown> = {}) {
      return eventBus.dispatch(type, payload);
    },

    async destroy() {
      await pluginHost.dispose();
      eventBus.clear();
      listeners.clear();
    },
  };

  return model;
}
