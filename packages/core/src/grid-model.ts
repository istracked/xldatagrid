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
  extendSelection, clearSelection, selectAll, toggleRowSelection,
} from './selection';
import {
  createEditingState, EditingState, beginEdit as beginEditState,
  commitEdit as commitEditState, cancelEdit as cancelEditState,
} from './editing';
import {
  createUndoRedoState, UndoRedoState, pushCommand, undo as undoOp, redo as redoOp,
  createCellEditCommand, createRowInsertCommand, createRowDeleteCommand, createRowMoveCommand,
} from './undo-redo';
import { groupRows, createGroupState } from './grouping';

/**
 * Public contract for interacting with the datagrid.
 *
 * Consumers obtain an instance via {@link createGridModel} and use it to read
 * state snapshots, mutate data, drive sorting/filtering/selection, manage
 * columns, register extensions, and subscribe to change notifications.
 *
 * @typeParam TData - Shape of a single data row. Defaults to a generic record.
 */
export interface GridModel<TData = Record<string, unknown>> {
  /**
   * Returns the full, current internal state snapshot.
   *
   * @returns A frozen-in-time copy of every state facet the grid tracks.
   */
  getState(): GridModelState<TData>;

  /**
   * Returns the data rows after active filters and sort orders have been applied.
   *
   * @returns Filtered and sorted array of row objects.
   */
  getProcessedData(): TData[];

  /**
   * Resolves every row in the raw data set to its unique key.
   *
   * @returns An array of string identifiers, one per row, in data order.
   */
  getRowIds(): string[];

  /**
   * Returns the column definitions whose visibility flag is currently enabled.
   *
   * @returns Ordered array of visible {@link ColumnDef} descriptors.
   */
  getVisibleColumns(): ColumnDef<TData>[];

  // ── Mutations ──────────────────────────────────────────────────────────

  /**
   * Overwrites the value of a single cell and records the change on the
   * undo stack.
   *
   * @param cell - Target cell address (row key + field name).
   * @param value - New value to write into the cell.
   */
  setCellValue(cell: CellAddress, value: unknown): void;

  /**
   * Enters inline-editing mode for a specific cell, capturing its current
   * value as the editing baseline.
   *
   * @param cell - The cell to begin editing.
   */
  beginEdit(cell: CellAddress): void;

  /**
   * Commits the currently active inline edit, persisting the new value
   * through {@link setCellValue} and exiting editing mode.
   */
  commitEdit(): void;

  /**
   * Discards the currently active inline edit without modifying cell data.
   */
  cancelEdit(): void;

  /**
   * Inserts a new row at the given index with optional initial data,
   * pushing the operation onto the undo stack.
   *
   * @param index - Zero-based position where the row should be inserted.
   * @param data - Optional initial field values for the new row.
   */
  insertRow(index: number, data?: Record<string, unknown>): void;

  /**
   * Removes one or more rows identified by their keys, recording each
   * deletion on the undo stack in reverse-index order to keep indices
   * stable during the batch.
   *
   * @param rowIds - Array of row key strings to delete.
   */
  deleteRows(rowIds: string[]): void;

  /**
   * Moves a row from one index to another, recording the operation on the
   * undo stack.
   *
   * @param fromIndex - Current zero-based index of the row.
   * @param toIndex - Target zero-based index where the row should be placed.
   */
  moveRow(fromIndex: number, toIndex: number): void;

  /**
   * Toggles the selection state for a specific row identified by its key.
   *
   * @param rowId - Unique key of the row whose selection should be toggled.
   */
  toggleRowSelect(rowId: string): void;

  // ── Sort / filter ─────────────────────────────────────────────────────

  /**
   * Replaces the current sort descriptor array and notifies listeners.
   *
   * @param state - The new multi-column sort specification.
   */
  sort(state: SortState): void;

  /**
   * Cycles the sort direction for a single column, optionally preserving
   * existing sorts when `multi` is true.
   *
   * @param field - Column field name to toggle.
   * @param multi - When true, adds to (or modifies) the existing multi-sort
   *   rather than replacing it.
   */
  toggleColumnSort(field: string, multi: boolean): void;

  /**
   * Replaces the active filter state. Pass `null` to clear all filters.
   *
   * @param state - New filter descriptor, or `null` to remove filtering.
   */
  filter(state: FilterState | null): void;

  // ── Selection ─────────────────────────────────────────────────────────

  /**
   * Sets the primary selection anchor to the given cell address.
   *
   * @param cell - Cell address to select.
   */
  select(cell: CellAddress): void;

  /**
   * Selects an entire row spanning all visible columns.
   *
   * @param rowId - Unique key of the row to select.
   */
  selectRowByKey(rowId: string): void;

  /**
   * Selects an entire column spanning all data rows.
   *
   * @param field - Field name of the column to select.
   */
  selectColumnByField(field: string): void;

  /**
   * Extends the current selection range from the anchor to the given cell,
   * supporting shift-click and drag-select interactions.
   *
   * @param cell - Cell address marking the new extent of the range.
   */
  extendTo(cell: CellAddress): void;

  /**
   * Selects every cell in the grid (all visible columns x all rows).
   */
  selectAllCells(): void;

  /**
   * Clears the active selection so that no cells are highlighted.
   */
  clearSelectionState(): void;

  // ── Column operations ─────────────────────────────────────────────────

  /**
   * Sets the pixel width of a column and dispatches a resize event.
   *
   * @param field - Field name of the column to resize.
   * @param width - New width in pixels.
   */
  setColumnWidth(field: string, width: number): void;

  /**
   * Moves a column to a new position in the display order.
   *
   * @param field - Field name of the column to move.
   * @param toIndex - Zero-based target position in the column order.
   */
  reorderColumnByField(field: string, toIndex: number): void;

  /**
   * Toggles a column between visible and hidden states.
   *
   * @param field - Field name of the column whose visibility should flip.
   */
  toggleColumnVisible(field: string): void;

  /**
   * Freezes (pins) a column to the left or right edge of the grid, or
   * unfreezes it by passing `null`.
   *
   * @param field - Field name of the column to freeze/unfreeze.
   * @param position - `'left'`, `'right'`, or `null` to unfreeze.
   */
  freezeColumnByField(field: string, position: 'left' | 'right' | null): void;

  // ── Undo / redo ───────────────────────────────────────────────────────

  /** Reverts the most recent undoable command. */
  undo(): void;

  /** Re-applies the most recently undone command. */
  redo(): void;

  // ── Sub-grid expansion ─────────────────────────────────────────────

  /**
   * Toggles the sub-grid expansion state for a given row.
   *
   * When `singleExpand` is enabled in the sub-grid config, expanding a new
   * row automatically collapses any previously expanded row.
   *
   * @param rowId - Unique key of the row to toggle.
   */
  toggleSubGridExpansion(rowId: string): void;

  // ── Extensions ────────────────────────────────────────────────────────

  /**
   * Registers an extension (plugin) with the grid, installing its hooks and
   * running its optional async initializer.
   *
   * @param ext - Extension definition to register.
   */
  registerExtension(ext: ExtensionDefinition): Promise<void>;

  /**
   * Removes a previously registered extension, invoking its teardown
   * lifecycle and cleaning up any hooks it installed.
   *
   * @param id - Unique identifier of the extension to remove.
   */
  unregisterExtension(id: string): Promise<void>;

  // ── Subscribe ─────────────────────────────────────────────────────────

  /**
   * Registers a listener that is called on every state change. Compatible
   * with React's `useSyncExternalStore`.
   *
   * @param listener - Callback invoked whenever the model state changes.
   * @returns A disposal function that removes the listener.
   */
  subscribe(listener: GridListener): () => void;

  // ── Event bus ─────────────────────────────────────────────────────────

  /**
   * Dispatches a typed event through the grid's internal event bus, allowing
   * extensions and hooks to intercept or react to it.
   *
   * @param type - The event type identifier.
   * @param payload - Optional additional data attached to the event.
   * @returns The resolved {@link GridEvent} after all hooks have executed.
   */
  dispatch(type: GridEventType, payload?: Record<string, unknown>): Promise<GridEvent>;

  // ── Destroy ───────────────────────────────────────────────────────────

  /**
   * Tears down the grid model by disposing all extensions, clearing the
   * event bus, and removing every listener. The instance should not be used
   * after this call.
   */
  destroy(): Promise<void>;
}

/**
 * Complete internal state snapshot owned by a {@link GridModel}.
 *
 * Each facet of grid behaviour (data, columns, sort, filter, selection,
 * editing, undo/redo, grouping, pagination) is represented as a dedicated
 * sub-state object so that consumers can subscribe to fine-grained changes.
 *
 * @typeParam TData - Shape of a single data row.
 */
export interface GridModelState<TData = Record<string, unknown>> {
  /** Raw (unprocessed) data rows held by the grid. */
  data: TData[];

  /** Column layout metadata -- order, widths, visibility, and freeze state. */
  columns: ColumnState;

  /** Active multi-column sort descriptors. */
  sort: SortState;

  /** Active filter descriptor, or `null` when no filter is applied. */
  filter: FilterState | null;

  /** Current cell / row / column selection state. */
  selection: SelectionState;

  /** Inline cell editing state (active cell, buffered value). */
  editing: EditingState;

  /** Undo and redo command stacks for reversible mutations. */
  undoRedo: UndoRedoState;

  /** Row grouping configuration. */
  groupState: GroupState;

  /** Set of row keys whose detail/child rows are currently expanded. */
  expandedRows: Set<string>;

  /** Set of row keys whose nested sub-grid panels are currently expanded. */
  expandedSubGrids: Set<string>;

  /** Zero-based current page index for pagination. */
  page: number;

  /** Maximum number of rows displayed per page. */
  pageSize: number;

  /** Original configuration object passed to {@link createGridModel}. */
  config: GridConfig<TData>;
}

/**
 * Factory that constructs a fully initialised {@link GridModel} from a
 * declarative {@link GridConfig}.
 *
 * The returned model instance encapsulates all mutable state, wires up the
 * internal event bus and plugin host, and exposes a stable imperative API.
 * State is kept in a single closure-scoped `state` variable; every mutation
 * replaces the top-level reference (shallow copy) and broadcasts to
 * subscribed listeners so that view layers can detect changes efficiently.
 *
 * @typeParam TData - Row data shape; must extend `Record<string, unknown>`.
 *
 * @param config - Declarative grid configuration including initial data,
 *   column definitions, row-key strategy, selection mode, and page size.
 * @returns A ready-to-use {@link GridModel} instance.
 *
 * @example
 * ```ts
 * const grid = createGridModel({
 *   data: myRows,
 *   columns: myColumns,
 *   rowKey: 'id',
 * });
 * grid.subscribe(() => renderGrid(grid.getState()));
 * ```
 */
export function createGridModel<TData extends Record<string, unknown>>(
  config: GridConfig<TData>
): GridModel<TData> {
  // Build a row-key resolver: accept either a property name string or a
  // custom function, normalising both into a single callable.
  const resolveRowKey: RowKeyResolver<TData> = typeof config.rowKey === 'function'
    ? config.rowKey
    : (row: TData) => String(row[config.rowKey as keyof TData]);

  // Initialise the composite state object from config defaults and fresh
  // sub-state factories.
  let state: GridModelState<TData> = {
    data: [...config.data],
    columns: createColumnState(config.columns as ColumnDef[]),
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

  // Subscriber bookkeeping -- a simple Set gives O(1) add/remove.
  const listeners = new Set<GridListener>();

  // Single event bus shared between the model itself and the plugin host.
  const eventBus = new EventBus();

  // Broadcast to all registered listeners after every state transition.
  function notify() {
    for (const l of listeners) l();
  }

  // Derive an ordered list of row keys from the current raw data array.
  function getRowIds(): string[] {
    return state.data.map(row => resolveRowKey(row));
  }

  // Apply active filters first, then sort, producing the "view" data that
  // the presentation layer should render.
  function getProcessedData(): TData[] {
    let result = state.data;
    result = applyFiltering(result as Record<string, unknown>[] as TData[], state.filter);
    result = applySorting(result as Record<string, unknown>[] as TData[], state.sort);
    return result;
  }

  // Wrap every model mutation as an async-compatible GridCommands entry so
  // that extensions can invoke grid operations through a uniform interface.
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
    scrollToCell: () => {}, // no-op at the model layer; the React view handles scrolling
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

  // Instantiate the plugin host, providing lazy accessors for the latest
  // state snapshot and the commands object so that extensions always see
  // fresh data without tight coupling to internal state.
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

  // ── Model implementation object ────────────────────────────────────────
  const model: GridModel<TData> = {
    getState: () => state,
    getProcessedData,
    getRowIds,
    getVisibleColumns: () => getVisibleColumns(state.columns) as ColumnDef<TData>[],

    setCellValue(cell: CellAddress, value: unknown) {
      // Locate the target row by its key; bail out if the key is stale.
      const rowIds = getRowIds();
      const rowIndex = rowIds.indexOf(cell.rowId);
      if (rowIndex === -1) return;

      // Capture the previous value for undo and build a reversible command.
      const row = state.data[rowIndex];
      if (!row) return;
      const oldValue = row[cell.field as keyof TData];
      const cmd = createCellEditCommand(
        state.data as Record<string, unknown>[],
        rowIndex,
        cell.field,
        oldValue,
        value
      );

      // Execute the mutation and push the command onto the undo stack.
      cmd.redo();
      state = { ...state, undoRedo: pushCommand(state.undoRedo, cmd) };

      // Notify extensions and listeners of the value change.
      eventBus.dispatch('cell:valueChange', { cell, oldValue, newValue: value });
      notify();
    },

    beginEdit(cell: CellAddress) {
      // Resolve the row index so the current cell value can be captured as
      // the editing baseline.
      const rowIds = getRowIds();
      const rowIndex = rowIds.indexOf(cell.rowId);
      if (rowIndex === -1) return;
      const row = state.data[rowIndex];
      if (!row) return;
      const value = row[cell.field as keyof TData] as CellValue;
      state = { ...state, editing: beginEditState(state.editing, cell, value) };
      notify();
    },

    commitEdit() {
      // Attempt to extract the buffered value; if editing was active,
      // persist it through setCellValue (which handles undo and events).
      const result = commitEditState(state.editing);
      if (result) {
        model.setCellValue(result.cell, result.value);
      }
      // Always clear the editing state regardless of whether a commit occurred.
      state = { ...state, editing: cancelEditState(state.editing) };
      notify();
    },

    cancelEdit() {
      // Discard the editing buffer without touching cell data.
      state = { ...state, editing: cancelEditState(state.editing) };
      notify();
    },

    insertRow(index: number, data?: Record<string, unknown>) {
      const newRow = (data ?? {}) as TData;

      // Create a reversible insert command and execute it immediately.
      const cmd = createRowInsertCommand(
        state.data as Record<string, unknown>[],
        index,
        newRow as Record<string, unknown>
      );
      cmd.redo();

      // Shallow-copy the data array so reference equality checks detect
      // the change, and record the command for undo.
      state = { ...state, data: [...state.data], undoRedo: pushCommand(state.undoRedo, cmd) };
      eventBus.dispatch('row:insert', { index, data: newRow });
      notify();
    },

    deleteRows(rowIds: string[]) {
      // Resolve indices up front and sort descending so that splicing
      // earlier positions does not shift later ones.
      const allRowIds = getRowIds();
      const entries = rowIds
        .map(rowId => ({ rowId, index: allRowIds.indexOf(rowId) }))
        .filter(e => e.index !== -1)
        .sort((a, b) => b.index - a.index);

      // Process each deletion individually to keep the undo stack granular
      // -- each row can be re-inserted independently on undo.
      for (const { index } of entries) {
        const row = state.data[index];
        if (!row) continue;
        const cmd = createRowDeleteCommand(
          state.data as Record<string, unknown>[],
          index,
          row as Record<string, unknown>
        );
        cmd.redo();
        state = { ...state, data: [...state.data], undoRedo: pushCommand(state.undoRedo, cmd) };
      }
      eventBus.dispatch('row:delete', { rowIds });
      notify();
    },

    moveRow(fromIndex: number, toIndex: number) {
      // Snapshot-based move: capture before/after row order so undo/redo
      // always work regardless of array reference identity.
      const before = [...state.data];
      const after = [...before];
      const [row] = after.splice(fromIndex, 1);
      if (row) after.splice(toIndex, 0, row);

      const cmd: Command = {
        type: 'row:move',
        timestamp: Date.now(),
        description: `Move row from ${fromIndex} to ${toIndex}`,
        undo: () => { state = { ...state, data: [...before] }; },
        redo: () => { state = { ...state, data: [...after] }; },
      };

      state = { ...state, data: after, undoRedo: pushCommand(state.undoRedo, cmd) };
      eventBus.dispatch('row:move', { fromIndex, toIndex });
      notify();
    },

    toggleRowSelect(rowId: string) {
      const columns = getVisibleColumns(state.columns) as ColumnDef[];
      state = { ...state, selection: toggleRowSelection(state.selection, rowId, columns) };
      notify();
    },

    sort(sortState: SortState) {
      // Replace the sort descriptors wholesale; the view re-derives
      // processed data on next read.
      state = { ...state, sort: sortState };
      eventBus.dispatch('column:sort', { sort: sortState });
      notify();
    },

    toggleColumnSort(field: string, multi: boolean) {
      // Delegate cycling logic to the sorting module, then apply.
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
      // Span all visible columns when selecting an entire row.
      const cols = getVisibleColumns(state.columns) as ColumnDef<TData>[];
      state = { ...state, selection: selectRow(state.selection, rowId, cols as ColumnDef[]) };
      notify();
    },

    selectColumnByField(field: string) {
      // Span all data rows when selecting an entire column.
      const rowIds = getRowIds();
      state = { ...state, selection: selectColumn(state.selection, field, rowIds) };
      notify();
    },

    extendTo(cell: CellAddress) {
      state = { ...state, selection: extendSelection(state.selection, cell) };
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
        // Collapse
        next.delete(rowId);
        state = { ...state, expandedSubGrids: next };
        eventBus.dispatch('subGrid:collapse', { rowId });
      } else {
        // In single-expand mode, clear all others first
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
      // Evaluate undoOp first: the command's undo callback may mutate
      // `state` (e.g. snapshot-based row move), so we must read state
      // AFTER the callback executes.
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
      // Return a disposer that removes this specific listener.
      return () => { listeners.delete(listener); };
    },

    async dispatch(type: GridEventType, payload: Record<string, unknown> = {}) {
      return eventBus.dispatch(type, payload);
    },

    async destroy() {
      // Tear down in reverse dependency order: extensions first (they may
      // emit final events), then the bus, then listeners.
      await pluginHost.dispose();
      eventBus.clear();
      listeners.clear();
    },
  };

  return model;
}
