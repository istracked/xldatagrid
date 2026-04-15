import React, { useCallback } from 'react';
import type { ColumnDef, SortState, ControlsColumnConfig, RowNumberColumnConfig } from '@istracked/datagrid-core';
import type { ColumnDragState } from '../state';
import { ChromeControlsHeaderCell, ChromeRowNumberHeaderCell } from '../chrome';
import * as styles from './DataGridHeader.styles';

export interface DataGridHeaderProps<TData> {
  columns: ColumnDef<TData>[];
  columnWidths: { width: number }[];
  headerHeight: number;
  sortState: SortState;
  isSortingEnabled: boolean;
  isFilteringEnabled: boolean;
  showColumnMenu: boolean;
  lastFieldInGroup: Map<string, string>;
  getColumnFrozen: (col: ColumnDef<TData>) => 'left' | 'right' | null;
  computeFrozenLeftOffset: (colIdx: number) => number;
  isLastFrozenLeft: (colIdx: number) => boolean;
  columnDrag: ColumnDragState;
  onSort: (field: string, shiftKey: boolean) => void;
  onContextMenu: (e: React.MouseEvent, rowId: string | null, field: string | null) => void;
  onDragStart: (field: string) => void;
  onDragOver: (field: string) => void;
  onDrop: (field: string) => void;
  onDragEnd: () => void;
  onMenuTrigger: (field: string) => void;
  onResizeStart: (field: string, startX: number, startWidth: number) => void;
  onResizeMove: (field: string, width: number) => void;
  onResizeEnd: (field: string, width: number) => void;
  onAutoFit: (field: string) => void;
  controlsConfig?: ControlsColumnConfig | null;
  controlsWidth?: number;
  rowNumberConfig?: RowNumberColumnConfig | null;
  rowNumberWidth?: number;
  onSelectAll?: () => void;
}

function getSortDirection(sortState: SortState, field: string): 'asc' | 'desc' | null {
  return sortState.find(s => s.field === field)?.dir ?? null;
}

function getSortPriority(sortState: SortState, field: string): number | null {
  if (sortState.length <= 1) return null;
  const idx = sortState.findIndex(s => s.field === field);
  return idx >= 0 ? idx + 1 : null;
}

export function DataGridHeader<TData>(props: DataGridHeaderProps<TData>) {
  const {
    columns,
    columnWidths,
    headerHeight,
    sortState,
    isSortingEnabled,
    isFilteringEnabled,
    showColumnMenu,
    lastFieldInGroup,
    getColumnFrozen,
    computeFrozenLeftOffset,
    isLastFrozenLeft,
    columnDrag,
    onSort,
    onContextMenu,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    onMenuTrigger,
    onResizeStart,
    onResizeMove,
    onResizeEnd,
    onAutoFit,
    controlsConfig,
    controlsWidth,
    rowNumberConfig,
    rowNumberWidth,
    onSelectAll,
  } = props;

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, field: string, width: number) => {
      e.stopPropagation();
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = width;
      let lastWidth = startWidth;

      onResizeStart(field, startX, startWidth);

      const onMouseMove = (me: MouseEvent) => {
        const delta = me.clientX - startX;
        lastWidth = Math.max(30, startWidth + delta);
        onResizeMove(field, lastWidth);
      };
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        onResizeEnd(field, lastWidth);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [onResizeStart, onResizeMove, onResizeEnd],
  );

  return (
    <>
      {/* Header */}
      <div
        style={styles.headerRow(headerHeight)}
        role="row"
      >
        {controlsConfig && (
          <ChromeControlsHeaderCell width={controlsWidth ?? 40} height={headerHeight} />
        )}
        {columns.map((col, colIdx) => {
          const width = columnWidths[colIdx]?.width ?? 150;
          const sortDir = getSortDirection(sortState, col.field);
          const sortPriorityVal = getSortPriority(sortState, col.field);
          const frozen = getColumnFrozen(col);
          const isGroupLast = lastFieldInGroup.has(col.field);

          return (
            <div
              key={col.field}
              style={styles.headerCell({
                width,
                height: headerHeight,
                frozen,
                frozenLeftOffset: computeFrozenLeftOffset(colIdx),
                isGroupLast,
                isSortable: col.sortable !== false && isSortingEnabled,
              })}
              role="columnheader"
              aria-colindex={colIdx + 1}
              aria-sort={
                sortDir === 'asc' ? 'ascending' :
                sortDir === 'desc' ? 'descending' :
                'none'
              }
              draggable={!frozen}
              {...(col.sortable !== false && isSortingEnabled ? { 'data-sortable': 'true' } : {})}
              {...(frozen ? { 'data-frozen': frozen, 'data-frozen-border': isLastFrozenLeft(colIdx) ? 'true' : undefined, 'data-drop-disabled': 'true' } : {})}
              {...(isGroupLast ? { 'data-group-last': 'true' } : {})}
              onClick={(e) => {
                if (col.sortable !== false && isSortingEnabled) {
                  onSort(col.field, e.shiftKey);
                }
              }}
              onContextMenu={(e) => onContextMenu(e, null, col.field)}
              onDragStart={(e) => {
                if (frozen) { e.preventDefault(); return; }
                onDragStart(col.field);
                if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (columnDrag.type === 'dragging' && columnDrag.field !== col.field) {
                  onDragOver(col.field);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (columnDrag.type === 'dragging' && columnDrag.field !== col.field && !frozen) {
                  onDrop(col.field);
                }
              }}
              onDragEnd={() => {
                onDragEnd();
              }}
            >
              <span style={styles.headerCellTitle}>
                {col.title}
              </span>
              {sortDir && (
                <span style={styles.sortIndicator}>
                  {sortDir === 'asc' ? '\u25B2' : '\u25BC'}
                </span>
              )}
              {sortPriorityVal != null && (
                <span style={styles.sortPriority}>
                  {sortPriorityVal}
                </span>
              )}
              {/* Filter icon */}
              {isFilteringEnabled && (
                <span data-testid="column-filter-icon" style={styles.filterIcon}>
                  F
                </span>
              )}
              {/* Column menu trigger */}
              {showColumnMenu && (
                <span
                  data-testid="column-menu-trigger"
                  style={styles.columnMenuTrigger}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMenuTrigger(col.field);
                  }}
                >
                  &#8942;
                </span>
              )}
              {/* Resize handle */}
              {col.resizable !== false && (
                <div
                  data-testid="column-resize-handle"
                  style={styles.resizeHandle}
                  onMouseDown={(e) => handleResizeMouseDown(e, col.field, width)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onAutoFit(col.field);
                  }}
                />
              )}
            </div>
          );
        })}
        {rowNumberConfig && (
          <ChromeRowNumberHeaderCell width={rowNumberWidth ?? 50} height={headerHeight} onSelectAll={onSelectAll} />
        )}
      </div>

      {/* Column drop indicator */}
      {columnDrag.type === 'dragging' && columnDrag.overField && (
        <div
          data-testid="column-drop-indicator"
          style={styles.columnDropIndicator}
        />
      )}
    </>
  );
}
