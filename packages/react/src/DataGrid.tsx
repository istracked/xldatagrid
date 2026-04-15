/**
 * Core DataGrid React component module for the `@istracked/datagrid-react` package.
 *
 * Thin orchestrator that composes header, body, toolbar, and context-menu
 * sub-components. Manages model wiring, keyboard navigation, virtualization,
 * drag-drop, and theme resolution. All rendering is delegated to child
 * components in the `header/`, `body/`, and `toolbar/` directories.
 *
 * @module DataGrid
 */
import React, { useRef, useCallback, useState, useEffect } from 'react';
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
import * as styles from './DataGrid.styles';

/**
 * Props accepted by the {@link DataGrid} component.
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
  groupControlRef?: string;
}

/**
 * Props passed to custom cell renderer components.
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
// ---------------------------------------------------------------------------

const LIGHT_THEME: Record<string, string> = {
  '--dg-primary-color': '#3b82f6',
  '--dg-bg-color': '#ffffff',
  '--dg-text-color': '#1e293b',
  '--dg-border-color': '#e2e8f0',
  '--dg-header-bg': '#f8fafc',
  '--dg-cell-padding': '0 12px',
  '--dg-font-family': 'system-ui, sans-serif',
  '--dg-font-size': '14px',
  '--dg-row-height': '36px',
  '--dg-selection-color': '#3b82f6',
  '--dg-error-color': '#ef4444',
  '--dg-hover-bg': '#f1f5f9',
  color: '#1e293b',
  colorScheme: 'light',
};

const DARK_THEME: Record<string, string> = {
  '--dg-primary-color': '#60a5fa',
  '--dg-bg-color': '#1e293b',
  '--dg-text-color': '#f1f5f9',
  '--dg-border-color': '#334155',
  '--dg-header-bg': '#0f172a',
  '--dg-cell-padding': '0 12px',
  '--dg-font-family': 'system-ui, sans-serif',
  '--dg-font-size': '14px',
  '--dg-row-height': '36px',
  '--dg-selection-color': '#60a5fa',
  '--dg-error-color': '#f87171',
  '--dg-hover-bg': '#334155',
  color: '#f1f5f9',
  colorScheme: 'dark',
};

export function resolveThemeStyle(
  theme: 'light' | 'dark' | Record<string, string> | undefined,
): React.CSSProperties {
  if (!theme) return {};
  if (theme === 'light') return LIGHT_THEME as unknown as React.CSSProperties;
  if (theme === 'dark') return DARK_THEME as unknown as React.CSSProperties;
  return theme as unknown as React.CSSProperties;
}

export { LIGHT_THEME, DARK_THEME };

// ---------------------------------------------------------------------------
// DataGrid component
// ---------------------------------------------------------------------------

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
    groupControlRef,
    ...config
  } = props;

  const themeStyle = resolveThemeStyle(config.theme);
  const { model, store, atoms } = useGridWithAtoms(config);
  const state = useGridStore(model);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useKeyboard(model, containerRef, config.keyboardNavigation !== false);

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

  const isSelected = useCallback((rowId: string, field: string): boolean => {
    const cell: CellAddress = { rowId, field };
    const { range, ranges } = state.selection;
    // Check primary range
    if (range && isCellInRange(cell, range, orderedVisibleColumns, rowIds)) return true;
    // Check multi-select ranges (ctrl+click)
    if (ranges) {
      for (const r of ranges) {
        if (isCellInRange(cell, r, orderedVisibleColumns, rowIds)) return true;
      }
    }
    return false;
  }, [state.selection, orderedVisibleColumns, rowIds]);

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
    rowNumberConfig === true ? { width: 50 }
    : rowNumberConfig ? rowNumberConfig
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
          onMenuTrigger={(field) => interaction.openColumnMenu(field)}
          onResizeStart={() => {}}
          onResizeMove={handleResizeMove}
          onResizeEnd={handleResizeEnd}
          onAutoFit={handleAutoFit}
          controlsConfig={resolvedControlsConfig}
          controlsWidth={controlsWidth}
          rowNumberConfig={resolvedRowNumberConfig}
          rowNumberWidth={rowNumberWidth}
          onSelectAll={handleSelectAll}
        />

        <DataGridColumnMenu
          menuState={interaction.state.menu}
          headerHeight={headerHeight}
          hasColumnGroups={!!columnGroupConfig}
          isSortingEnabled={isSortingEnabled}
          getColumnFrozen={getColumnFrozenByField}
          onSortAsc={handleColumnMenuSortAsc}
          onSortDesc={handleColumnMenuSortDesc}
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
