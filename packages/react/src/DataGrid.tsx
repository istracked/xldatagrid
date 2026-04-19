/**
 * Core DataGrid React component module for the `@istracked/datagrid-react` package.
 *
 * Thin orchestrator that composes header, body, toolbar, and context-menu
 * sub-components. Manages model wiring, keyboard navigation, virtualization,
 * drag-drop, and theme resolution. All rendering is delegated to child
 * components in the `header/`, `body/`, and `toolbar/` directories.
 *
 * Architecture overview:
 *   - The grid is structured as three visual layers stacked vertically inside a
 *     single focusable container: the **toolbar** (column visibility controls,
 *     group expand/collapse actions), the **header** (column titles, sort
 *     indicators, filter triggers, resize/reorder affordances, optional column
 *     group banner), and the **body** (virtualized rows, cell editing, row
 *     number / controls chrome columns, group summary rows).
 *   - This module owns only presentation state and event translation. The
 *     authoritative data model — rows, columns, sort/filter/group state, and
 *     edit transactions — lives in a `GridModel` from `@istracked/datagrid-core`.
 *     The React tree bridges to it through {@link useGridWithAtoms} (which
 *     instantiates the model) and {@link useGridStore} (which subscribes to it
 *     and produces snapshot-friendly state for rendering). All mutations flow
 *     through `model.*` methods; callbacks like `onSortChange` / `onFilterChange`
 *     fire after the model has accepted the change.
 *   - Transient UI state that the core does not need to own — menu openness,
 *     drag sessions, column visibility/width/freeze overrides, row-group
 *     expansion — is kept in React via the `useGridInteraction` reducer and
 *     local `useState` hooks.
 *
 * @module DataGrid
 */
import React, { useRef, useCallback, useState, useEffect, useId, useMemo } from 'react';
import {
  GridConfig,
  ColumnDef,
  CellAddress,
  CellValue,
  CellRange,
  SortState,
  FilterState,
  CellType,
  RowTypeDef,
  ContextMenuConfig,
  ContextMenuItemDef,
  ValidationResult,
  ColumnGroupConfig,
  RowGroupConfig,
  GroupState,
  RowGroup,
  ControlsColumnConfig,
  RowNumberColumnConfig,
} from '@istracked/datagrid-core';
import {
  groupRows,
  getVisibleRowsWithGroups,
  isCellInRange,
  createSelectionChecker,
} from '@istracked/datagrid-core';
import { useGridWithAtoms } from './use-grid';
import { useGridStore } from './use-grid-store';
import { useKeyboard } from './use-keyboard';
import { useVirtualization } from './use-virtualization';
import { useDragDrop } from './use-drag-drop';
import { GridContext } from './context';
import { ContextMenu, ContextMenuState, initialContextMenuState } from './ContextMenu';
import { useGridInteraction } from './state/use-grid-interaction';
import { DataGridHeader } from './header/DataGridHeader';
import { DataGridColumnMenu } from './header/DataGridColumnMenu';
import { DataGridColumnGroupHeader } from './header/DataGridColumnGroupHeader';
import { DataGridBody } from './body/DataGridBody';
import { DataGridToolbar } from './toolbar/DataGridToolbar';
import { DataGridColumnFilterMenu } from './header/column-filter-menu/DataGridColumnFilterMenu';
import { FilterConditionDialog } from './header/column-filter-menu/FilterConditionDialog';
import { useBackgroundIndexer } from './hooks/use-background-indexer';
import type { CompositeFilterDescriptor, FilterDescriptor } from '@istracked/datagrid-core';
import * as styles from './DataGrid.styles';
import { lightThemeTokens, darkThemeTokens } from './styles/tokens';

/**
 * Props accepted by the {@link DataGrid} component.
 *
 * Extends `GridConfig<TData>` from `@istracked/datagrid-core` with React-only
 * concerns: styling, dimension overrides, event callbacks, and UI-layer
 * toggles that have no representation inside the core model (toolbar chrome,
 * column menus, Excel-style filter menu).
 *
 * Callback props are fired after the model has accepted the corresponding
 * mutation — consumers can treat them as "committed" events. They are intended
 * for side effects such as persistence; the grid does not require a value to
 * be returned.
 *
 * @typeParam TData - Shape of a single row record. Defaults to a generic
 *   object keyed by string.
 * @see GridConfig from `@istracked/datagrid-core` for the underlying data-model
 *   options (columns, rows, sorting/filtering/grouping defaults, theme, etc.).
 */
export interface DataGridProps<TData extends Record<string, unknown> = Record<string, unknown>>
  extends GridConfig<TData> {
  className?: string;
  style?: React.CSSProperties;
  rowHeight?: number;
  headerHeight?: number;
  onCellEdit?: (rowKey: string, field: string, value: CellValue, prev: CellValue) => void;
  onRowAdd?: (data: Partial<TData>) => void;
  onRowDelete?: (rowIds: string[]) => void;
  onRowReorder?: (event: { sourceRowId: string; targetRowId: string; fromIndex: number; toIndex: number }) => void;
  onSelectionChange?: (range: CellRange | null) => void;
  onSortChange?: (sort: SortState) => void;
  onFilterChange?: (filter: FilterState | null) => void;
  onGroupChange?: (groupState: GroupState) => void;
  onColumnGroupChange?: (collapsed: Set<string>) => void;
  onColumnResize?: (field: string, width: number) => void;
  onColumnReorder?: (field: string, toIndex: number) => void;
  onColumnVisibilityChange?: (field: string, visible: boolean) => void;
  onColumnFreeze?: (field: string, position: 'left' | 'right' | null) => void;
  cellRenderers?: Record<string, React.ComponentType<CellRendererProps<TData>>>;
  initialFilter?: FilterState | null;
  showGroupControls?: boolean;
  showColumnVisibilityMenu?: boolean;
  showColumnMenu?: boolean;
  /**
   * Enables the Excel 365-style column filter dropdown. When true, clicking
   * the filter icon in a header cell opens a value-list + search dropdown
   * backed by an IndexedDB-cached column index.
   */
  showFilterMenu?: boolean;
  /** Stable id used as the IndexedDB cache key prefix for the column index. */
  gridId?: string;
  groupControlRef?: string;
}

/**
 * Props passed to custom cell renderer components.
 *
 * A renderer receives both the raw value and the full row so it can compute
 * derived display (e.g. reference lookups). It is also handed the editing
 * state so a single component can render both the static and editing views;
 * commit/cancel callbacks funnel edits back through the model.
 */
export interface CellRendererProps<TData = Record<string, unknown>> {
  value: CellValue;
  row: TData;
  column: ColumnDef<TData>;
  rowIndex: number;
  isEditing: boolean;
  onCommit: (value: CellValue) => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Theme token helpers
//
// The palette values used by the light and dark presets are ingested from the
// organisation-wide `istracked/tokens` repository (see
// `packages/react/src/styles/tokens/`). The grid does not carry its own
// hand-tuned colours any more — both theme objects are projections of the
// W3C design-token tree onto the `--dg-*` custom properties our inline styles
// consume. Run `pnpm sync:tokens` after a tokens-repo upgrade to refresh the
// snapshot under `src/styles/tokens/`.
// ---------------------------------------------------------------------------

const LIGHT_THEME: Record<string, string> = lightThemeTokens;

const DARK_THEME: Record<string, string> = darkThemeTokens;

export function resolveThemeStyle(
  theme: 'light' | 'dark' | Record<string, string> | undefined,
): React.CSSProperties {
  if (!theme) return {};
  if (theme === 'light') return { ...LIGHT_THEME } as unknown as React.CSSProperties;
  if (theme === 'dark') return { ...DARK_THEME } as unknown as React.CSSProperties;
  // A string preset we do not recognise (e.g. `"excel365"`) is handled
  // entirely via CSS — the grid root receives `data-theme="…"` and the
  // matching stylesheet provides the tokens. Returning the string itself
  // here would cause callers to spread it as indexed character properties
  // into `style`, which React DOM then rejects with
  // `TypeError: Indexed property setter is not supported` inside
  // `setValueForStyle`. A custom token map is copied into a plain object
  // for the same reason — callers treat the result as a writable
  // `React.CSSProperties` bag and must not receive a frozen/exotic object.
  if (typeof theme === 'string') return {};
  return { ...theme } as unknown as React.CSSProperties;
}

export { LIGHT_THEME, DARK_THEME };

// ---------------------------------------------------------------------------
// DataGrid component
// ---------------------------------------------------------------------------

/**
 * Top-level grid component.
 *
 * Instantiates a `GridModel` from `@istracked/datagrid-core`, wires it to a
 * React render tree via subscription hooks, and composes the toolbar, column
 * group banner, header, body, context menu, column menu, and (optionally) the
 * Excel-365 filter menu into a single scrolling surface.
 *
 * Lifecycle notes:
 *   - The underlying model is owned by this component; it is destroyed on
 *     unmount via a cleanup effect to release any subscriptions the core may
 *     have established.
 *   - `initialFilter` is applied exactly once on mount — subsequent changes to
 *     the prop are ignored so that controlled filter state cannot fight with
 *     the user's interactive changes.
 *
 * Usage:
 * ```tsx
 * <DataGrid
 *   columns={columns}
 *   rows={rows}
 *   showFilterMenu
 *   gridId="orders-grid"
 *   onFilterChange={setFilter}
 * />
 * ```
 *
 * @typeParam TData - Row shape; inferred from `columns`/`rows`.
 * @see GridModel and GridConfig from `@istracked/datagrid-core` for the
 *   authoritative data model this component renders.
 */
export function DataGrid<TData extends Record<string, unknown>>(props: DataGridProps<TData>) {
  const {
    className,
    style,
    rowHeight = 36,
    headerHeight = 40,
    onCellEdit,
    onRowAdd,
    onRowDelete: _onRowDelete,
    onRowReorder,
    onSelectionChange: _onSelectionChange,
    onSortChange,
    onFilterChange: _onFilterChange,
    onGroupChange,
    onColumnGroupChange,
    onColumnResize,
    onColumnReorder,
    onColumnVisibilityChange,
    onColumnFreeze,
    cellRenderers,
    initialFilter,
    showGroupControls,
    showColumnVisibilityMenu,
    showColumnMenu,
    showFilterMenu,
    gridId,
    groupControlRef,
    ...config
  } = props;

  const themeStyle = resolveThemeStyle(config.theme);
  const { model, store, atoms } = useGridWithAtoms(config);
  const state = useGridStore(model);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => { model.destroy(); }, [model]);

  useKeyboard(model, containerRef, config.keyboardNavigation !== false, scrollRef);

  // Apply initial filter once on mount
  const initialFilterApplied = useRef(false);
  useEffect(() => {
    if (initialFilter && !initialFilterApplied.current) {
      initialFilterApplied.current = true;
      model.filter(initialFilter);
      _onFilterChange?.(initialFilter);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dragDrop = useDragDrop(model, config.fileDrop);

  // Unified interaction state (replaces 12 separate useState calls)
  const interaction = useGridInteraction();

  // Row grouping state (kept separate — different lifecycle)
  const [rowGroupExpanded, setRowGroupExpanded] = useState<Set<string>>(new Set());
  const [rowGroupsInitialized, setRowGroupsInitialized] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, ValidationResult | null>>({});

  // --- Context menu ---
  const contextMenuEnabled = config.contextMenu !== false && config.contextMenu !== undefined;
  const contextMenuConfig: ContextMenuConfig | null = contextMenuEnabled
    ? (typeof config.contextMenu === 'object' ? config.contextMenu : {})
    : null;

  const openContextMenu = useCallback((e: React.MouseEvent, rowId: string | null, field: string | null) => {
    if (!contextMenuEnabled && !showColumnMenu) return;
    e.preventDefault();
    if (showColumnMenu && field && !rowId) {
      interaction.openColumnMenu(field);
      return;
    }
    if (!contextMenuEnabled) return;
    interaction.openContextMenu(e.clientX, e.clientY, rowId, field);
  }, [contextMenuEnabled, showColumnMenu, interaction]);

  const closeContextMenu = useCallback(() => {
    interaction.closeMenu();
  }, [interaction]);

  // Bridge discriminated union → ContextMenuState for the ContextMenu component
  const ctxMenuState: ContextMenuState = interaction.state.menu.type === 'context'
    ? { open: true, x: interaction.state.menu.x, y: interaction.state.menu.y, rowId: interaction.state.menu.rowId, field: interaction.state.menu.field }
    : initialContextMenuState;

  const getContextMenuItems = useCallback((): ContextMenuItemDef[] => {
    const customItems = contextMenuConfig?.items ?? [];
    const builtInItems: ContextMenuItemDef[] = [];
    if (ctxMenuState.rowId) {
      builtInItems.push({
        key: '__delete-row',
        label: 'Delete Row',
        danger: true,
        onClick: (ctx) => {
          if (ctx.rowId) {
            model.deleteRows([ctx.rowId]);
            _onRowDelete?.([ctx.rowId]);
          }
        },
      });
    }
    return [...customItems, ...builtInItems];
  }, [contextMenuConfig, ctxMenuState.rowId, model, _onRowDelete]);

  // --- Columns ---
  const processedData = model.getProcessedData();
  const rowIds = model.getRowIds();
  const visibleColumns = model.getVisibleColumns();

  // Apply column group collapse
  const columnGroupConfig = config.grouping && typeof config.grouping === 'object'
    && config.grouping.columns && typeof config.grouping.columns === 'object'
    ? config.grouping.columns as ColumnGroupConfig
    : null;

  const hiddenByColumnGroup = new Set<string>();
  if (columnGroupConfig) {
    for (const group of columnGroupConfig.groups) {
      if (interaction.state.collapsedColumnGroups.has(group.id) && group.columns.length > 1) {
        for (let i = 1; i < group.columns.length; i++) {
          const colField = group.columns[i];
          if (colField) hiddenByColumnGroup.add(colField);
        }
      }
    }
  }

  const effectiveVisibleColumns = visibleColumns.filter(
    (c) => !hiddenByColumnGroup.has(c.field) && !interaction.state.hiddenColumns.has(c.field)
  );

  const effectiveGroupOrder = interaction.state.columnGroupOrder ?? (columnGroupConfig?.groups.map(g => g.id) ?? []);

  // Apply column group reorder
  let orderedVisibleColumns = effectiveVisibleColumns;
  if (columnGroupConfig && interaction.state.columnGroupOrder) {
    const orderedColumns: ColumnDef<TData>[] = [];
    for (const groupId of effectiveGroupOrder) {
      const group = columnGroupConfig.groups.find(g => g.id === groupId);
      if (group) {
        for (const field of group.columns) {
          const col = effectiveVisibleColumns.find(c => c.field === field);
          if (col) orderedColumns.push(col);
        }
      }
    }
    for (const col of effectiveVisibleColumns) {
      if (!orderedColumns.includes(col)) orderedColumns.push(col);
    }
    orderedVisibleColumns = orderedColumns;
  }

  // Apply column reorder override
  if (interaction.state.columnOrderOverride) {
    const reordered: ColumnDef<TData>[] = [];
    for (const field of interaction.state.columnOrderOverride) {
      const col = orderedVisibleColumns.find(c => c.field === field);
      if (col) reordered.push(col);
    }
    for (const col of orderedVisibleColumns) {
      if (!reordered.includes(col)) reordered.push(col);
    }
    orderedVisibleColumns = reordered;
  }

  // Frozen column resolution
  const getColumnFrozen = useCallback((col: ColumnDef<TData>): 'left' | 'right' | null => {
    if (col.field in interaction.state.frozenOverrides) {
      return interaction.state.frozenOverrides[col.field] ?? null;
    }
    return col.frozen ?? null;
  }, [interaction.state.frozenOverrides]);

  // Last field per column group (for border rendering)
  const lastFieldInGroup = new Map<string, string>();
  if (columnGroupConfig) {
    for (const group of columnGroupConfig.groups) {
      const visibleInGroup = group.columns.filter(
        (f) => orderedVisibleColumns.some((c) => c.field === f)
      );
      if (visibleInGroup.length > 0) {
        const lastField = visibleInGroup[visibleInGroup.length - 1];
        if (lastField) lastFieldInGroup.set(lastField, 'true');
      }
    }
  }

  // Column widths
  const columnWidths = orderedVisibleColumns.map(c => ({
    width: interaction.state.columnWidthOverrides[c.field] ?? state.columns.widths[c.field] ?? c.width ?? 150,
  }));

  // Virtualization
  const { rowRange, colRange: _colRange, handleScroll } = useVirtualization({
    totalRows: processedData.length,
    rowHeight,
    columns: columnWidths,
    containerRef: scrollRef,
  });

  // Cell type resolution
  const getCellType = useCallback((column: ColumnDef<TData>, rowIndex: number): CellType => {
    if (config.pivotMode === 'row' && config.rowTypes) {
      const rowType = (config.rowTypes as RowTypeDef[]).find(rt => rt.index === rowIndex);
      if (rowType) return rowType.cellType;
    }
    return column.cellType ?? 'text';
  }, [config.pivotMode, config.rowTypes]);

  const selectionChecker = useMemo(
    () => createSelectionChecker(state.selection.ranges, orderedVisibleColumns, rowIds),
    [state.selection.ranges, orderedVisibleColumns, rowIds],
  );

  const isSelected = useCallback((rowId: string, field: string): boolean => {
    const rowIdx = rowIds.indexOf(rowId);
    const colIdx = orderedVisibleColumns.findIndex(c => c.field === field);
    if (rowIdx === -1 || colIdx === -1) return false;
    return selectionChecker(rowIdx, colIdx);
  }, [selectionChecker, rowIds, orderedVisibleColumns]);

  // Determine whether the active selection spans more than one cell so the
  // body can apply a range-tint background (in addition to the per-cell
  // outline) to the non-anchor cells. A single-cell selection keeps the
  // plain outline-only appearance.
  const hasMultiCellRange = useMemo(() => {
    for (const r of state.selection.ranges) {
      if (r.anchor.rowId !== r.focus.rowId || r.anchor.field !== r.focus.field) return true;
    }
    return false;
  }, [state.selection.ranges]);

  const isInRange = useCallback((rowId: string, field: string): boolean => {
    if (!hasMultiCellRange) return false;
    const rowIdx = rowIds.indexOf(rowId);
    const colIdx = orderedVisibleColumns.findIndex(c => c.field === field);
    if (rowIdx === -1 || colIdx === -1) return false;
    return selectionChecker(rowIdx, colIdx);
  }, [hasMultiCellRange, selectionChecker, rowIds, orderedVisibleColumns]);

  const isEditingCell = useCallback((rowId: string, field: string): boolean => {
    const cell = state.editing.cell;
    return cell !== null && cell.rowId === rowId && cell.field === field;
  }, [state.editing.cell]);

  const isSortingEnabled = config.sorting !== false;
  const isFilteringEnabled = config.filtering !== false && config.filtering !== undefined;

  // Chrome columns
  const chromeConfig = config.chrome;
  const controlsConfig = chromeConfig?.controls;
  const rowNumberConfig = chromeConfig?.rowNumbers;
  const resolvedControlsConfig: ControlsColumnConfig | null =
    controlsConfig === true ? { actions: [], width: 40 }
    : controlsConfig ? controlsConfig
    : null;
  const resolvedRowNumberConfig: RowNumberColumnConfig | null =
    rowNumberConfig === true ? { width: 50, widthMode: 'fixed', reorderable: true, position: 'left' }
    : rowNumberConfig ? { position: 'left', ...rowNumberConfig }
    : null;
  const controlsWidth = resolvedControlsConfig?.width ?? 40;
  const rowNumberWidth = resolvedRowNumberConfig?.width ?? 50;
  const dataColumnsWidth = columnWidths.reduce((sum, c) => sum + c.width, 0);
  const totalWidth = (resolvedControlsConfig ? controlsWidth : 0) + dataColumnsWidth + (resolvedRowNumberConfig ? rowNumberWidth : 0);

  const showGhostRow = !!config.ghostRow && !config.readOnly;
  const isReadOnly = config.readOnly === true;
  const fileDropEnabled = typeof config.fileDrop === 'object' && config.fileDrop.enabled;
  const groupingEnabled = config.grouping !== undefined && config.grouping !== null;
  const themeId = typeof config.theme === 'string' ? config.theme : (config.theme ? 'custom' : undefined);

  // Frozen column helpers
  const computeFrozenLeftOffset = useCallback((colIdx: number): number => {
    let offset = resolvedControlsConfig ? controlsWidth : 0;
    for (let i = 0; i < colIdx; i++) {
      const col = orderedVisibleColumns[i];
      if (col && getColumnFrozen(col) === 'left') {
        offset += columnWidths[i]?.width ?? 150;
      }
    }
    return offset;
  }, [orderedVisibleColumns, columnWidths, getColumnFrozen]);

  const isLastFrozenLeft = useCallback((colIdx: number): boolean => {
    const col = orderedVisibleColumns[colIdx];
    if (!col || getColumnFrozen(col) !== 'left') return false;
    const next = orderedVisibleColumns[colIdx + 1];
    if (!next) return true;
    return getColumnFrozen(next) !== 'left';
  }, [orderedVisibleColumns, getColumnFrozen]);

  // Row grouping
  const rowGroupConfig = config.grouping && typeof config.grouping === 'object'
    && config.grouping.rows && typeof config.grouping.rows === 'object'
    ? config.grouping.rows as RowGroupConfig
    : null;

  const computedRowGroups = rowGroupConfig
    ? groupRows(processedData as Record<string, unknown>[], processedData.map((_, i) => rowIds[i] ?? String(i)), rowGroupConfig)
    : [];

  useEffect(() => {
    if (rowGroupConfig && computedRowGroups.length > 0 && !rowGroupsInitialized) {
      setRowGroupsInitialized(true);
      if (groupControlRef === 'collapse-all') {
        setRowGroupExpanded(new Set());
      } else {
        const allKeys = new Set<string>();
        function collectKeys(groups: typeof computedRowGroups) {
          for (const g of groups) {
            allKeys.add(g.key);
            if (g.subGroups) collectKeys(g.subGroups);
          }
        }
        collectKeys(computedRowGroups);
        setRowGroupExpanded(allKeys);
      }
    }
  }, [rowGroupConfig, computedRowGroups.length, rowGroupsInitialized, groupControlRef]);

  const groupedView = rowGroupConfig ? getVisibleRowsWithGroups({
    rowGroups: computedRowGroups,
    expandedGroups: rowGroupExpanded,
  }, false) : null;

  // Validation
  const validateCell = useCallback((col: ColumnDef<TData>, value: CellValue, rowId: string): ValidationResult | null => {
    if (!col.validate) return null;
    const result = col.validate(value);
    const key = `${rowId}:${col.field}`;
    setValidationErrors(prev => {
      if (result === prev[key]) return prev;
      return { ...prev, [key]: result };
    });
    return result;
  }, []);

  const clearValidation = useCallback((rowId: string, field: string) => {
    const key = `${rowId}:${field}`;
    setValidationErrors(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const onValidationError = (props as any).onValidationError as
    | ((cell: CellAddress, error: ValidationResult) => void)
    | undefined;

  // --- Column menu action handlers ---
  const getColumnFrozenByField = useCallback((field: string): 'left' | 'right' | null => {
    const col = orderedVisibleColumns.find(c => c.field === field);
    if (!col) return null;
    return getColumnFrozen(col);
  }, [orderedVisibleColumns, getColumnFrozen]);

  const handleColumnMenuSortAsc = useCallback((field: string) => {
    model.sort([{ field, dir: 'asc' }]);
    onSortChange?.(model.getState().sort);
  }, [model, onSortChange]);

  const handleColumnMenuSortDesc = useCallback((field: string) => {
    model.sort([{ field, dir: 'desc' }]);
    onSortChange?.(model.getState().sort);
  }, [model, onSortChange]);

  const handleColumnMenuHide = useCallback((field: string) => {
    interaction.hideColumn(field);
    onColumnVisibilityChange?.(field, false);
  }, [interaction, onColumnVisibilityChange]);

  const handleColumnMenuFreeze = useCallback((field: string) => {
    interaction.freezeColumn(field, 'left');
    onColumnFreeze?.(field, 'left');
  }, [interaction, onColumnFreeze]);

  const handleColumnMenuUnfreeze = useCallback((field: string) => {
    interaction.unfreezeColumn(field);
    onColumnFreeze?.(field, null);
  }, [interaction, onColumnFreeze]);

  // --- Header handlers ---
  const handleSort = useCallback((field: string, shiftKey: boolean) => {
    model.toggleColumnSort(field, shiftKey);
    onSortChange?.(model.getState().sort);
  }, [model, onSortChange]);

  const handleHeaderDragStart = useCallback((field: string) => {
    interaction.startColumnDrag(field);
  }, [interaction]);

  const handleHeaderDragOver = useCallback((field: string) => {
    interaction.updateColumnDragOver(field);
  }, [interaction]);

  const handleHeaderDrop = useCallback((targetField: string) => {
    if (interaction.state.columnDrag.type !== 'dragging') return;
    const dragging = interaction.state.columnDrag.field;
    if (dragging === targetField) return;
    // Compute new order using remove-then-insert-at-original-index
    const currentOrder = interaction.state.columnOrderOverride ?? orderedVisibleColumns.map(c => c.field);
    const fromIdx = currentOrder.indexOf(dragging);
    const toIdx = currentOrder.indexOf(targetField);
    if (fromIdx >= 0 && toIdx >= 0) {
      const newOrder = [...currentOrder];
      newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, dragging);
      interaction.setColumnOrder(newOrder);
      onColumnReorder?.(dragging, toIdx);
    }
    interaction.endColumnDrag();
  }, [interaction, orderedVisibleColumns, onColumnReorder]);

  const handleHeaderDragEnd = useCallback(() => {
    interaction.endColumnDrag();
  }, [interaction]);

  const handleResizeMove = useCallback((field: string, width: number) => {
    interaction.setColumnWidth(field, width);
  }, [interaction]);

  const handleResizeEnd = useCallback((field: string, finalWidth: number) => {
    onColumnResize?.(field, finalWidth);
  }, [onColumnResize]);

  const handleAutoFit = useCallback((field: string) => {
    const col = orderedVisibleColumns.find(c => c.field === field);
    const autoWidth = Math.max(60, (col?.title?.length ?? 5) * 10 + 40);
    interaction.setColumnWidth(field, autoWidth);
    onColumnResize?.(field, autoWidth);
  }, [interaction, orderedVisibleColumns, onColumnResize]);

  // --- Column group handlers ---
  const handleGroupDragStart = useCallback((groupId: string) => {
    interaction.startColumnGroupDrag(groupId);
  }, [interaction]);

  const handleGroupDragOver = useCallback((groupId: string) => {
    interaction.updateColumnGroupDragOver(groupId);
  }, [interaction]);

  const handleGroupDrop = useCallback((targetGroupId: string) => {
    if (interaction.state.columnGroupDrag.type !== 'dragging') return;
    const dragging = interaction.state.columnGroupDrag.groupId;
    if (dragging === targetGroupId) {
      interaction.endColumnGroupDrag();
      return;
    }
    // Compute new order using the same remove-then-insert-at-original-index logic
    const currentOrder = interaction.state.columnGroupOrder ?? (columnGroupConfig?.groups.map(g => g.id) ?? []);
    const fromIdx = currentOrder.indexOf(dragging);
    const toIdx = currentOrder.indexOf(targetGroupId);
    if (fromIdx >= 0 && toIdx >= 0) {
      const newOrder = [...currentOrder];
      newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, dragging);
      interaction.dispatch({ type: 'set-column-group-order', order: newOrder });
    }
    interaction.endColumnGroupDrag();
  }, [interaction, columnGroupConfig]);

  const handleGroupDragEnd = useCallback(() => {
    interaction.endColumnGroupDrag();
  }, [interaction]);

  const handleGroupCollapseToggle = useCallback((groupId: string) => {
    interaction.toggleColumnGroupCollapse(groupId);
    const next = new Set(interaction.state.collapsedColumnGroups);
    if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
    onColumnGroupChange?.(next);
  }, [interaction, onColumnGroupChange]);

  // --- Toolbar handlers ---
  const handleToggleVisibilityMenu = useCallback(() => {
    if (interaction.state.menu.type === 'columnVisibility') {
      interaction.closeMenu();
    } else {
      interaction.openColumnVisibilityMenu();
    }
  }, [interaction]);

  const handleColumnVisibilityChange = useCallback((field: string, visible: boolean) => {
    if (visible) {
      interaction.showColumn(field);
      onColumnVisibilityChange?.(field, true);
    } else {
      interaction.hideColumn(field);
      onColumnVisibilityChange?.(field, false);
    }
  }, [interaction, onColumnVisibilityChange]);

  const handleCollapseAll = useCallback(() => {
    setRowGroupExpanded(new Set());
    onGroupChange?.({ rowGroups: computedRowGroups, expandedGroups: new Set() });
  }, [computedRowGroups, onGroupChange]);

  const handleExpandAll = useCallback(() => {
    const allKeys = new Set<string>();
    function collectKeys(groups: RowGroup[]) {
      for (const g of groups) {
        allKeys.add(g.key);
        if (g.subGroups) collectKeys(g.subGroups);
      }
    }
    collectKeys(computedRowGroups);
    setRowGroupExpanded(allKeys);
    onGroupChange?.({ rowGroups: computedRowGroups, expandedGroups: allKeys });
  }, [computedRowGroups, onGroupChange]);

  // --- Body handlers ---
  const handleGroupToggle = useCallback((groupKey: string) => {
    setRowGroupExpanded(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey); else next.add(groupKey);
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Chrome column handlers
  // ---------------------------------------------------------------------------

  const handleRowNumberClick = useCallback((rowId: string, shiftKey: boolean, metaKey: boolean) => {
    if (metaKey) {
      model.toggleRowSelect(rowId);
    } else if (shiftKey) {
      const cols = orderedVisibleColumns;
      const lastCol = cols[cols.length - 1];
      if (lastCol) model.extendTo({ rowId, field: lastCol.field });
    } else {
      model.selectRowByKey(rowId);
    }
  }, [model, orderedVisibleColumns]);

  const [rowDragState, setRowDragState] = useState<{ sourceRowId: string; sourceIndex: number } | null>(null);

  const handleRowDragStart = useCallback((rowId: string, rowIndex: number) => {
    setRowDragState({ sourceRowId: rowId, sourceIndex: rowIndex });
  }, []);

  const handleRowDragOver = useCallback((_rowId: string, _rowIndex: number) => {
    // Visual indicator could be added here in the future
  }, []);

  const handleRowDrop = useCallback((targetRowId: string, rowIndex: number) => {
    if (rowDragState) {
      model.moveRow(rowDragState.sourceIndex, rowIndex);
      onRowReorder?.({
        sourceRowId: rowDragState.sourceRowId,
        targetRowId,
        fromIndex: rowDragState.sourceIndex,
        toIndex: rowIndex,
      });
      setRowDragState(null);
    }
  }, [model, rowDragState, onRowReorder]);

  const handleSelectAll = useCallback(() => {
    model.selectAllCells();
  }, [model]);

  // ---------------------------------------------------------------------------
  // Excel 365 column filter menu integration
  //
  // Opting into `showFilterMenu` swaps the per-column header filter icon from
  // the legacy input/predicate UI to the Excel-style dropdown, which combines
  // a search box, a distinct-values checklist, and an entry point to a more
  // powerful conditional filter dialog. The flow is:
  //   1. The header emits `onFilterMenuTrigger(field, DOMRect)` on icon click.
  //   2. A background indexer streams distinct values for each filterable
  //      field into IndexedDB; the dropdown pulls from that cache.
  //   3. Selections are converted back to a `CompositeFilterDescriptor` and
  //      passed to `model.filter()` — the exact same channel the legacy UI
  //      uses, so downstream filter handling remains shared.
  // ---------------------------------------------------------------------------

  const filterMenuEnabled = showFilterMenu === true;

  // The Excel dropdown is only offered for columns that declare themselves
  // filterable (the default) and are currently visible in the header. When the
  // feature is off we short-circuit to an empty array so the indexer has no
  // work to do.
  const filterableFields = useMemo<string[]>(() => {
    if (!filterMenuEnabled) return [];
    return orderedVisibleColumns
      .filter((c) => c.filterable !== false)
      .map((c) => c.field);
  }, [filterMenuEnabled, orderedVisibleColumns]);

  // The background indexer persists distinct-value indexes to IndexedDB keyed
  // by `gridId`. Rendering multiple grids on the same page without distinct
  // ids would otherwise have them all collide on a shared namespace and
  // overwrite each other's indexes. `useId()` gives us a stable, render-safe
  // identifier per React instance so the common "two grids, no explicit id"
  // case still stores each grid under its own IDB namespace. Consumers who
  // want the cache to survive remounts should pass an explicit `gridId`.
  const autoGridId = useId();
  const resolvedGridId = gridId ?? `auto-${autoGridId}`;

  // The indexer hook is invoked unconditionally so that toggling
  // `filterMenuEnabled` at runtime does not violate the Rules of Hooks; when
  // the feature is off it runs in a disabled, no-op state so no IDB writes or
  // computation happens.
  const indexerState = useBackgroundIndexer({
    gridId: resolvedGridId,
    data: processedData as ReadonlyArray<Record<string, unknown>>,
    rowIds,
    fields: filterableFields,
    disabled: !filterMenuEnabled,
  });

  // `FilterMenuOpen` models the open state of the Excel dropdown: either a
  // specific field is open (with the anchoring header-button rect needed for
  // positioning) or no dropdown is open. Keeping it as a local discriminated
  // value avoids polluting the shared interaction reducer with concerns that
  // are specific to this feature.
  type FilterMenuOpen = {
    field: string;
    anchor: { top: number; left: number; bottom: number; right: number };
  } | null;

  // `filterMenuOpen` tracks the Excel dropdown; `conditionDialogOpen` tracks
  // the "Custom filter…" conditional dialog that the dropdown can launch. Only
  // one of each can be open at a time, and the dropdown closes itself before
  // the dialog opens.
  const [filterMenuOpen, setFilterMenuOpen] = useState<FilterMenuOpen>(null);
  const [conditionDialogOpen, setConditionDialogOpen] = useState<{ field: string } | null>(null);

  // Opening the Excel dropdown must force the legacy column menu closed so
  // they never overlap visually or compete for keyboard focus. The anchor
  // rect is captured here (rather than stored as a live DOMRect) to decouple
  // the popup from the header button's layout lifecycle.
  const handleFilterMenuTrigger = useCallback((field: string, anchor: DOMRect) => {
    // Mutual exclusion: close the legacy column menu when the Excel filter menu opens.
    interaction.closeMenu();
    setFilterMenuOpen({
      field,
      anchor: {
        top: anchor.top,
        left: anchor.left,
        bottom: anchor.bottom,
        right: anchor.right,
      },
    });
  }, [interaction]);

  const closeFilterMenu = useCallback(() => setFilterMenuOpen(null), []);

  // Mirror of the mutual-exclusion rule on the other side: when the legacy
  // column menu is opened (from the header's caret button), the Excel filter
  // dropdown is dismissed so only one menu is visible per column at a time.
  const handleColumnMenuTrigger = useCallback((field: string) => {
    // Mutual exclusion: close the Excel filter menu when the legacy column menu opens.
    setFilterMenuOpen(null);
    interaction.openColumnMenu(field);
  }, [interaction]);

  // Derives the set of fields that currently have *any* filter predicate
  // attached so the header can paint the filter icon in its "active" state.
  // The composite filter tree is nestable (`logic` nodes containing more
  // composites), so a recursive walk is needed to collect every leaf's
  // `field` regardless of grouping depth.
  const activeFilterFields = useMemo<Set<string>>(() => {
    const set = new Set<string>();
    const fs = state.filter;
    if (!fs) return set;
    function visit(node: CompositeFilterDescriptor | FilterDescriptor) {
      if ('filters' in node) {
        for (const child of node.filters) visit(child);
      } else {
        set.add(node.field);
      }
    }
    visit(fs);
    return set;
  }, [state.filter]);

  // The Excel dropdown's checklist only has a meaningful "checked subset" when
  // the field is filtered by a single `in`-operator predicate (the shape the
  // dropdown itself produces). Any other predicate — a range, a text contains,
  // a nested composite — is treated as opaque: we return `undefined` so the
  // checklist renders every value as selected, signalling that clearing it
  // will drop the entire predicate on this field.
  const selectedValuesByField = useMemo<Record<string, Set<string> | undefined>>(() => {
    const out: Record<string, Set<string> | undefined> = {};
    const fs = state.filter;
    if (!fs) return out;
    for (const child of fs.filters) {
      if ('field' in child && child.operator === 'in' && Array.isArray(child.value)) {
        out[child.field] = new Set(child.value.map(String));
      }
    }
    return out;
  }, [state.filter]);

  // Central mutation helper used by every Excel-menu action. It edits the
  // filter tree as a field-scoped replace: predicates belonging to the named
  // field are dropped, the replacement (if any) is appended, and an empty
  // result collapses back to `null` so the grid reports "no filter". Logic
  // (`and`/`or`) is preserved from the existing tree or defaults to `and` for
  // a fresh tree.
  //
  // Pruning walks the tree recursively so nested composites emitted by the
  // "Custom Filter…" dialog (shape: { logic, filters: [...leaves on field] })
  // are removed along with plain leaves. A composite whose entire subtree
  // only targeted `field` collapses to an empty list and is dropped; a mixed
  // composite loses its `field`-matching branches but stays in the tree.
  const replaceFieldFilter = useCallback(
    (field: string, replacement: FilterDescriptor | CompositeFilterDescriptor | null) => {
      const prev = state.filter;

      const stripField = (
        node: FilterDescriptor | CompositeFilterDescriptor,
      ): FilterDescriptor | CompositeFilterDescriptor | null => {
        if ('filters' in node) {
          const kept: Array<FilterDescriptor | CompositeFilterDescriptor> = [];
          for (const child of node.filters) {
            const pruned = stripField(child);
            if (pruned !== null) kept.push(pruned);
          }
          if (kept.length === 0) return null;
          return { ...node, filters: kept };
        }
        return node.field === field ? null : node;
      };

      const otherFilters: Array<FilterDescriptor | CompositeFilterDescriptor> = [];
      if (prev) {
        for (const child of prev.filters) {
          const pruned = stripField(child);
          if (pruned !== null) otherFilters.push(pruned);
        }
      }
      const nextChildren = replacement ? [...otherFilters, replacement] : otherFilters;
      const next: CompositeFilterDescriptor | null =
        nextChildren.length > 0 ? { logic: prev?.logic ?? 'and', filters: nextChildren } : null;
      model.filter(next);
      _onFilterChange?.(next);
    },
    [state.filter, model, _onFilterChange],
  );

  // Applied when the user commits the checklist: a defined `values` set turns
  // into an `in` predicate; an undefined set means "no restriction", which is
  // equivalent to clearing any existing filter on this field.
  const handleApplyValueFilter = useCallback(
    (field: string, values: Set<string> | undefined) => {
      if (!values) {
        replaceFieldFilter(field, null);
        return;
      }
      replaceFieldFilter(field, {
        field,
        operator: 'in',
        value: [...values],
      });
    },
    [replaceFieldFilter],
  );

  // Invoked from the dropdown's "Clear filter from <column>" entry. Removes
  // the field-scoped predicate regardless of its operator.
  const handleClearFieldFilter = useCallback(
    (field: string) => replaceFieldFilter(field, null),
    [replaceFieldFilter],
  );

  // The dropdown's "Custom filter…" entry hands off to a dedicated modal that
  // builds richer predicates (between / starts-with / and-or chains). Opening
  // the dialog simply records which field it should target.
  const handleOpenConditionDialog = useCallback((field: string) => {
    setConditionDialogOpen({ field });
  }, []);

  // Receives the composite predicate produced by the condition dialog and
  // routes it through the same field-scoped replace helper so the behaviour
  // stays consistent with the checklist path.
  const handleApplyConditionFilter = useCallback(
    (field: string, composite: CompositeFilterDescriptor | null) => {
      replaceFieldFilter(field, composite);
    },
    [replaceFieldFilter],
  );

  // Maps column `cellType` values onto the three data-type families the
  // Excel menu understands. This normalisation lets the menu pick the right
  // operator set, value formatter, and input widget without knowing about
  // every granular cell type the grid supports.
  const resolveColumnDataType = useCallback(
    (field: string): 'text' | 'number' | 'date' => {
      const col = orderedVisibleColumns.find((c) => c.field === field);
      const t = col?.cellType as string | undefined;
      if (t === 'numeric' || t === 'number' || t === 'currency') return 'number';
      if (t === 'calendar' || t === 'date' || t === 'datetime') return 'date';
      return 'text';
    },
    [orderedVisibleColumns],
  );

  // Looks up a human-readable column label for the dropdown and dialog
  // headings. Falls back to the field key so the UI never renders blank.
  const resolveColumnTitle = useCallback(
    (field: string): string => {
      const col = orderedVisibleColumns.find((c) => c.field === field);
      return (col?.title as string | undefined) ?? field;
    },
    [orderedVisibleColumns],
  );

  // ---------------------------------------------------------------------------
  // Sub-grid expansion rendering
  // ---------------------------------------------------------------------------
  //
  // Each parent row that has `cellType: 'subGrid'` columns can render an
  // inline expansion row beneath itself that hosts a fully independent nested
  // grid. Recursion is handled by re-entering `<DataGrid>` with the parent
  // cell's array value as its `data` and the parent column's `subGridColumns`
  // as its `columns`. Every nested level receives its own `GridModel` via
  // `useGridWithAtoms` so sort state, drag sessions, selection, and keyboard
  // focus are scoped to that level.
  //
  // Depth tracking:
  //   - `subGridDepth` increments by 1 for each nested grid; the outer grid
  //     starts at 0.
  //   - `config.subGrid?.maxDepth` caps recursion. When the current depth is
  //     >= maxDepth, the toggle still renders but the expansion row is not
  //     mounted. The minimum supported depth is 2 (parent → subgrid →
  //     subgrid-within-subgrid).

  const subGridDepth = config.subGrid?.nestingLevel ?? 0;
  const subGridMaxDepth = config.subGrid?.maxDepth ?? 3;

  // Resolve the first `subGrid` column on the parent row; the nested grid
  // draws its data and columns from that column's configuration. Rows with
  // more than one sub-grid column are rare — document the restriction in
  // the PR and keep the common case simple.
  const getSubGridColumnForRow = useCallback((): ColumnDef<TData> | null => {
    for (const col of orderedVisibleColumns) {
      if (col.cellType === 'subGrid') return col;
    }
    return null;
  }, [orderedVisibleColumns]);

  const renderSubGridExpansionRow = useCallback(
    (rowId: string, row: TData): React.ReactNode => {
      // Honour maxDepth: once we've reached the cap, skip mounting the nested
      // grid. The toggle remains clickable; users see an empty expansion slot
      // so the "tried to go deeper than supported" outcome is still visible.
      if (subGridDepth >= subGridMaxDepth) return null;

      const subCol = getSubGridColumnForRow();
      if (!subCol) return null;

      const rawValue = row[subCol.field as keyof TData];
      const nestedData = Array.isArray(rawValue)
        ? (rawValue as Record<string, unknown>[])
        : [];
      const nestedColumns = (subCol.subGridColumns ?? []) as ColumnDef<Record<string, unknown>>[];
      const nestedRowKey = (subCol.subGridRowKey ?? 'id') as keyof Record<string, unknown>;

      if (nestedColumns.length === 0) return null;

      return (
        <DataGrid<Record<string, unknown>>
          key={`${rowId}-subgrid`}
          data={nestedData}
          columns={nestedColumns}
          rowKey={nestedRowKey}
          cellRenderers={cellRenderers as any}
          keyboardNavigation={config.keyboardNavigation !== false}
          selectionMode={config.selectionMode ?? 'cell'}
          theme={config.theme}
          subGrid={{
            ...(config.subGrid ?? {}),
            nestingLevel: subGridDepth + 1,
            maxDepth: subGridMaxDepth,
            isSubGrid: true,
          }}
          rowHeight={rowHeight}
          headerHeight={headerHeight}
        />
      );
    },
    [
      subGridDepth,
      subGridMaxDepth,
      getSubGridColumnForRow,
      cellRenderers,
      config.keyboardNavigation,
      config.selectionMode,
      config.theme,
      config.subGrid,
      rowHeight,
      headerHeight,
    ],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <GridContext.Provider value={{ model, store, atoms } as any}>
      <div
        ref={containerRef}
        className={`istracked-datagrid${className ? ` ${className}` : ''}`}
        style={styles.gridContainer(!!config.theme, themeStyle, style)}
        tabIndex={0}
        role="grid"
        aria-rowcount={processedData.length}
        aria-colcount={visibleColumns.length}
        aria-readonly={isReadOnly || undefined}
        {...(themeId ? { 'data-theme': themeId } : {})}
        {...(isReadOnly ? { 'data-readonly': 'true' } : {})}
        {...(showGhostRow ? { 'data-ghost-row': 'true' } : {})}
        {...(fileDropEnabled ? { 'data-file-drop': 'true' } : {})}
        {...(groupingEnabled ? { 'data-grouping': 'true' } : {})}
        onDragEnter={dragDrop.handlers.onDragEnter}
        onDragOver={dragDrop.handlers.onDragOver}
        onDragLeave={dragDrop.handlers.onDragLeave}
        onDrop={dragDrop.handlers.onDrop}
        onKeyDown={dragDrop.handlers.onKeyDown}
      >
        {/* Drop overlay */}
        {dragDrop.state.isDragging && (
          <div
            data-testid="drop-overlay"
            data-drop-target={dragDrop.state.dropTarget?.type ?? 'grid'}
            data-drop-field={dragDrop.state.dropTarget?.field}
            data-drop-row={dragDrop.state.dropTarget?.rowId}
            style={styles.dropOverlay}
          >
            Drop files here
          </div>
        )}
        {/* Drop errors */}
        {dragDrop.state.errors.length > 0 && (
          <div data-testid="drop-errors" role="alert">
            {dragDrop.state.errors.map((err, i) => (
              <div key={i} data-testid="drop-error">{err.reason}</div>
            ))}
          </div>
        )}

        <DataGridToolbar
          showColumnVisibilityMenu={!!showColumnVisibilityMenu}
          showGroupControls={!!showGroupControls}
          visibleColumns={visibleColumns}
          allColumns={config.columns ?? []}
          hiddenColumns={interaction.state.hiddenColumns}
          menuState={interaction.state.menu}
          onToggleVisibilityMenu={handleToggleVisibilityMenu}
          onColumnVisibilityChange={handleColumnVisibilityChange}
          rowGroupConfig={rowGroupConfig}
          computedRowGroups={computedRowGroups}
          onCollapseAll={handleCollapseAll}
          onExpandAll={handleExpandAll}
        />

        {columnGroupConfig && (
          <DataGridColumnGroupHeader
            columnGroupConfig={columnGroupConfig}
            effectiveGroupOrder={effectiveGroupOrder}
            orderedVisibleColumns={orderedVisibleColumns}
            columnWidths={columnWidths}
            collapsedColumnGroups={interaction.state.collapsedColumnGroups}
            columnGroupDrag={interaction.state.columnGroupDrag}
            onDragStart={handleGroupDragStart}
            onDragOver={handleGroupDragOver}
            onDrop={handleGroupDrop}
            onDragEnd={handleGroupDragEnd}
            onCollapseToggle={handleGroupCollapseToggle}
          />
        )}

        {/*
         * The header hosts the two menu entry points: the caret-style column
         * menu (always routed through `handleColumnMenuTrigger`) and the Excel
         * filter-icon trigger (wired only when `filterMenuEnabled`, otherwise
         * left `undefined` so the header suppresses the icon entirely).
         * `activeFilterFields` tells the header which icons to paint in the
         * filtered state; it is likewise only supplied when the Excel menu is
         * enabled so the legacy path keeps its pre-existing styling.
         */}
        <DataGridHeader
          columns={orderedVisibleColumns}
          columnWidths={columnWidths}
          headerHeight={headerHeight}
          sortState={state.sort}
          isSortingEnabled={isSortingEnabled}
          isFilteringEnabled={isFilteringEnabled}
          showColumnMenu={!!showColumnMenu}
          lastFieldInGroup={lastFieldInGroup}
          getColumnFrozen={getColumnFrozen}
          computeFrozenLeftOffset={computeFrozenLeftOffset}
          isLastFrozenLeft={isLastFrozenLeft}
          columnDrag={interaction.state.columnDrag}
          onSort={handleSort}
          onContextMenu={openContextMenu}
          onDragStart={handleHeaderDragStart}
          onDragOver={handleHeaderDragOver}
          onDrop={handleHeaderDrop}
          onDragEnd={handleHeaderDragEnd}
          onMenuTrigger={handleColumnMenuTrigger}
          onResizeStart={() => {}}
          onResizeMove={handleResizeMove}
          onResizeEnd={handleResizeEnd}
          onAutoFit={handleAutoFit}
          controlsConfig={resolvedControlsConfig}
          controlsWidth={controlsWidth}
          rowNumberConfig={resolvedRowNumberConfig}
          rowNumberWidth={rowNumberWidth}
          onSelectAll={handleSelectAll}
          onFilterMenuTrigger={filterMenuEnabled ? handleFilterMenuTrigger : undefined}
          activeFilterFields={filterMenuEnabled ? activeFilterFields : undefined}
        />

        {/*
         * The Excel filter dropdown is rendered inline in the grid subtree (as
         * a positioned popup) only while a field is open. The conditional
         * mount both avoids paying the render cost when closed and ensures
         * the component fully re-initialises per open — no stale checklist
         * state between columns.
         */}
        {filterMenuEnabled && filterMenuOpen && (
          <DataGridColumnFilterMenu
            open={true}
            field={filterMenuOpen.field}
            title={resolveColumnTitle(filterMenuOpen.field)}
            dataType={resolveColumnDataType(filterMenuOpen.field)}
            anchor={filterMenuOpen.anchor}
            distinctValues={indexerState.indexes[filterMenuOpen.field]?.distinctValues}
            selectedValues={selectedValuesByField[filterMenuOpen.field]}
            hasActiveFilter={activeFilterFields.has(filterMenuOpen.field)}
            sortDir={state.sort.find((s) => s.field === filterMenuOpen.field)?.dir ?? null}
            onSortAsc={() => handleColumnMenuSortAsc(filterMenuOpen.field)}
            onSortDesc={() => handleColumnMenuSortDesc(filterMenuOpen.field)}
            onClearFilter={() => handleClearFieldFilter(filterMenuOpen.field)}
            onApplyValueFilter={(values) => handleApplyValueFilter(filterMenuOpen.field, values)}
            onOpenCustomFilter={() => handleOpenConditionDialog(filterMenuOpen.field)}
            onClose={closeFilterMenu}
          />
        )}

        {/*
         * The custom-filter condition dialog is a separate modal launched
         * from the Excel dropdown's "Custom filter…" entry. Applying it both
         * commits the composite predicate and dismisses the dialog in a
         * single callback so the flow feels atomic to the user.
         */}
        {filterMenuEnabled && conditionDialogOpen && (
          <FilterConditionDialog
            open={true}
            field={conditionDialogOpen.field}
            title={resolveColumnTitle(conditionDialogOpen.field)}
            dataType={resolveColumnDataType(conditionDialogOpen.field)}
            onApply={(filter) => {
              handleApplyConditionFilter(conditionDialogOpen.field, filter);
              setConditionDialogOpen(null);
            }}
            onClose={() => setConditionDialogOpen(null)}
          />
        )}

        {/*
         * The legacy column menu (hide, freeze) continues to mount
         * unconditionally — it coexists with the Excel dropdown rather than
         * being replaced by it. Visibility is driven by the interaction
         * reducer's `menu` discriminant, so rendering the component while no
         * column-menu session is active is effectively free.
         */}
        <DataGridColumnMenu
          menuState={interaction.state.menu}
          headerHeight={headerHeight}
          hasColumnGroups={!!columnGroupConfig}
          getColumnFrozen={getColumnFrozenByField}
          onHide={handleColumnMenuHide}
          onFreeze={handleColumnMenuFreeze}
          onUnfreeze={handleColumnMenuUnfreeze}
          onClose={closeContextMenu}
        />

        <DataGridBody
          processedData={processedData}
          rowIds={rowIds}
          orderedVisibleColumns={orderedVisibleColumns}
          columnWidths={columnWidths}
          totalWidth={totalWidth}
          rowHeight={rowHeight}
          rowRange={rowRange}
          scrollRef={scrollRef}
          handleScroll={handleScroll}
          isSelected={isSelected}
          isInRange={isInRange}
          isEditingCell={isEditingCell}
          getCellType={getCellType}
          getColumnFrozen={getColumnFrozen}
          computeFrozenLeftOffset={computeFrozenLeftOffset}
          cellRenderers={cellRenderers}
          isReadOnly={isReadOnly}
          model={model}
          validateCell={validateCell}
          clearValidation={clearValidation}
          validationErrors={validationErrors}
          onCellEdit={onCellEdit}
          onValidationError={onValidationError}
          onContextMenu={openContextMenu}
          groupedView={groupedView}
          rowGroupExpanded={rowGroupExpanded}
          onGroupToggle={handleGroupToggle}
          rowGroupConfig={rowGroupConfig}
          computedRowGroups={computedRowGroups}
          onGroupChange={onGroupChange}
          showGhostRow={showGhostRow}
          ghostRowConfig={config.ghostRow}
          readOnly={config.readOnly}
          onRowAdd={onRowAdd}
          controlsConfig={resolvedControlsConfig}
          controlsWidth={controlsWidth}
          rowNumberConfig={resolvedRowNumberConfig}
          rowNumberWidth={rowNumberWidth}
          onRowNumberClick={handleRowNumberClick}
          onRowDragStart={handleRowDragStart}
          onRowDragOver={handleRowDragOver}
          onRowDrop={handleRowDrop}
          getRowBorder={chromeConfig?.getRowBorder}
          getRowBackground={chromeConfig?.getRowBackground}
          getChromeCellContent={chromeConfig?.getChromeCellContent}
          selectionMode={config.selectionMode}
          expandedSubGrids={state.expandedSubGrids}
          subGridDepth={subGridDepth}
          renderSubGridExpansionRow={renderSubGridExpansionRow}
        />

        {contextMenuEnabled && (
          <ContextMenu
            state={ctxMenuState}
            items={getContextMenuItems()}
            onClose={closeContextMenu}
          />
        )}
      </div>
    </GridContext.Provider>
  );
}

/**
 * Formats a raw cell value into a display string based on the column's cell type.
 */
function renderCellValue(value: CellValue, cellType: CellType): string {
  if (value == null) return '';
  if (cellType === 'boolean') return value ? '\u2611' : '\u2610';
  if (cellType === 'currency' && typeof value === 'number') return `$${value.toFixed(2)}`;
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}
