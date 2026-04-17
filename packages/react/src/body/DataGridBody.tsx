import React from 'react';
import {
  ColumnDef,
  CellAddress,
  CellValue,
  CellType,
  ValidationResult,
  RowGroupConfig,
  RowGroup,
  GroupState,
  GhostRowConfig,
  GhostRowPosition,
  GridModel,
} from '@istracked/datagrid-core';
import type { ControlsColumnConfig, RowNumberColumnConfig } from '@istracked/datagrid-core';
import { CellRendererProps } from '../DataGrid';
import { ChromeControlsCell, ChromeRowNumberCell } from '../chrome';
import { GhostRow } from '../GhostRow';
import * as styles from './DataGridBody.styles';

// ---------------------------------------------------------------------------
// Helper: format cell value for display
// ---------------------------------------------------------------------------

function renderCellValue(value: CellValue, cellType: CellType): string {
  if (value == null) return '';
  if (cellType === 'boolean') return value ? '\u2611' : '\u2610';
  if (cellType === 'currency' && typeof value === 'number') return `$${value.toFixed(2)}`;
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}

// ---------------------------------------------------------------------------
// Helper: validation key
// ---------------------------------------------------------------------------

function getValidationKey(rowId: string, field: string): string {
  return `${rowId}:${field}`;
}

// ---------------------------------------------------------------------------
// Helper: resolve ghost row position from config
// ---------------------------------------------------------------------------

function resolveGhostPosition<T extends Record<string, unknown> = Record<string, unknown>>(config: boolean | GhostRowConfig<T> | undefined): GhostRowPosition {
  if (typeof config === 'object' && config.position) return config.position;
  return 'bottom';
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DataGridBodyProps<TData extends Record<string, unknown>> {
  // Data
  processedData: TData[];
  rowIds: string[];
  orderedVisibleColumns: ColumnDef<TData>[];
  columnWidths: { width: number }[];
  totalWidth: number;
  rowHeight: number;

  // Virtualization
  rowRange: { startIndex: number; endIndex: number; totalSize: number };
  scrollRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;

  // State
  isSelected: (rowId: string, field: string) => boolean;
  isEditingCell: (rowId: string, field: string) => boolean;
  getCellType: (column: ColumnDef<TData>, rowIndex: number) => CellType;
  getColumnFrozen: (col: ColumnDef<TData>) => 'left' | 'right' | null;
  computeFrozenLeftOffset: (colIdx: number) => number;

  // Editing
  cellRenderers?: Record<string, React.ComponentType<CellRendererProps<TData>>>;
  isReadOnly: boolean;
  model: GridModel<TData>;
  validateCell: (col: ColumnDef<TData>, value: CellValue, rowId: string) => ValidationResult | null;
  clearValidation: (rowId: string, field: string) => void;
  validationErrors: Record<string, ValidationResult | null>;
  onCellEdit?: (rowKey: string, field: string, value: CellValue, prev: CellValue) => void;
  onValidationError?: (cell: CellAddress, error: ValidationResult) => void;

  // Context menu
  onContextMenu: (e: React.MouseEvent, rowId: string | null, field: string | null) => void;

  // Grouping
  groupedView: any[] | null;
  rowGroupExpanded: Set<string>;
  onGroupToggle: (groupKey: string) => void;
  rowGroupConfig: RowGroupConfig | null;
  computedRowGroups: RowGroup[];
  onGroupChange?: (groupState: GroupState) => void;

  // Chrome columns
  controlsConfig?: ControlsColumnConfig | null;
  controlsWidth?: number;
  rowNumberConfig?: RowNumberColumnConfig | null;
  rowNumberWidth?: number;
  onRowNumberClick?: (rowId: string, shiftKey: boolean, metaKey: boolean) => void;
  onRowDragStart?: (rowId: string, rowIndex: number) => void;
  onRowDragOver?: (rowId: string, rowIndex: number) => void;
  onRowDrop?: (rowId: string, rowIndex: number) => void;

  // Ghost row
  showGhostRow: boolean;
  ghostRowConfig?: boolean | GhostRowConfig<TData>;
  readOnly?: boolean;
  onRowAdd?: (data: Partial<TData>) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataGridBody<TData extends Record<string, unknown>>(
  props: DataGridBodyProps<TData>,
) {
  const {
    processedData,
    rowIds,
    orderedVisibleColumns,
    columnWidths,
    totalWidth,
    rowHeight,
    rowRange,
    scrollRef,
    handleScroll,
    isSelected,
    isEditingCell,
    getCellType,
    getColumnFrozen,
    computeFrozenLeftOffset,
    cellRenderers,
    isReadOnly,
    model,
    validateCell,
    clearValidation,
    validationErrors,
    onCellEdit,
    onValidationError,
    onContextMenu,
    groupedView,
    rowGroupExpanded,
    onGroupToggle,
    rowGroupConfig,
    computedRowGroups,
    onGroupChange,
    controlsConfig,
    controlsWidth,
    rowNumberConfig,
    rowNumberWidth,
    onRowNumberClick,
    onRowDragStart,
    onRowDragOver,
    onRowDrop,
    showGhostRow,
    ghostRowConfig,
    readOnly,
    onRowAdd,
  } = props;

  const ghostPosition = showGhostRow ? resolveGhostPosition(ghostRowConfig) : 'bottom';
  const ghostAtTop = ghostPosition === 'top' && showGhostRow;

  // Row-number chrome column position (default: 'left' — Excel 365 convention).
  // When 'left', render order is: controls, row-number, data cells.
  // When 'right', render order is: controls, data cells, row-number (legacy).
  const rowNumberPosition: 'left' | 'right' = rowNumberConfig?.position ?? 'left';
  const rowNumberOnLeft = rowNumberPosition === 'left';

  // -------------------------------------------------------------------------
  // Render helper: row-number chrome cell (shared across both body paths)
  // -------------------------------------------------------------------------

  const rowNumberStickyLeft = rowNumberOnLeft
    ? (controlsConfig ? (controlsWidth ?? 40) : 0)
    : undefined;

  const renderRowNumberCell = (rowId: string, rowIdx: number) => {
    if (!rowNumberConfig || !onRowNumberClick) return null;
    return (
      <ChromeRowNumberCell
        key="__row-number__"
        rowNumber={rowIdx + 1}
        rowId={rowId}
        width={rowNumberWidth ?? 50}
        height={rowHeight}
        reorderable={rowNumberConfig.reorderable !== false}
        stickyLeft={rowNumberStickyLeft}
        onSelect={onRowNumberClick}
        onDragStart={onRowDragStart}
        onDragOver={onRowDragOver}
        onDrop={onRowDrop}
      />
    );
  };

  // -------------------------------------------------------------------------
  // Find row by ID helper
  // -------------------------------------------------------------------------

  const findRowByRowId = (rowId: string): TData | undefined => {
    for (let i = 0; i < processedData.length; i++) {
      if ((rowIds[i] ?? String(i)) === rowId) return processedData[i];
    }
    return undefined;
  };

  // -------------------------------------------------------------------------
  // renderCell
  // -------------------------------------------------------------------------

  const renderCell = (
    col: ColumnDef<TData>,
    colIdx: number,
    row: TData,
    rowId: string,
    rowIdx: number,
  ) => {
    const width = columnWidths[colIdx]?.width ?? 150;
    const value = row[col.field as keyof TData] as CellValue;
    const editing = isEditingCell(rowId, col.field);
    const selected = isSelected(rowId, col.field);
    const cellType = getCellType(col, rowIdx);
    const cellAddr: CellAddress = { rowId, field: col.field };
    const CustomRenderer = cellRenderers?.[cellType];
    const vKey = getValidationKey(rowId, col.field);
    const cellError = validationErrors[vKey] ?? null;
    const hasError = cellError !== null && cellError.severity === 'error';
    const frozen = getColumnFrozen(col);

    return (
      <div
        key={col.field}
        style={styles.cell({
          width,
          height: rowHeight,
          selected,
          hasError,
          frozen,
          frozenLeftOffset: computeFrozenLeftOffset(colIdx),
          editable: col.editable !== false && !isReadOnly,
        })}
        role="gridcell"
        aria-colindex={colIdx + 1}
        aria-selected={selected}
        aria-invalid={hasError || undefined}
        data-cell-type={cellType}
        data-field={col.field}
        data-row-id={rowId}
        title={hasError ? cellError!.message : undefined}
        onClick={() => model.select(cellAddr)}
        onContextMenu={(e) => onContextMenu(e, rowId, col.field)}
        onDoubleClick={() => {
          if (col.editable !== false && !readOnly) {
            model.beginEdit(cellAddr);
          }
        }}
      >
        {CustomRenderer ? (
          <CustomRenderer
            value={value}
            row={row}
            column={col}
            rowIndex={rowIdx}
            isEditing={editing}
            onCommit={v => {
              const vResult = validateCell(col, v, rowId);
              if (vResult && vResult.severity === 'error') {
                onValidationError?.(cellAddr, vResult);
                return;
              }
              clearValidation(rowId, col.field);
              model.setCellValue(cellAddr, v);
              model.cancelEdit();
              onCellEdit?.(rowId, col.field, v, value);
            }}
            onCancel={() => model.cancelEdit()}
          />
        ) : editing ? (
          <input
            autoFocus
            defaultValue={value != null ? String(value) : ''}
            style={styles.cellInput}
            onBlur={e => {
              const newVal = e.target.value;
              const vResult = validateCell(col, newVal, rowId);
              if (vResult && vResult.severity === 'error') {
                onValidationError?.(cellAddr, vResult);
                model.cancelEdit();
                return;
              }
              clearValidation(rowId, col.field);
              model.setCellValue(cellAddr, newVal);
              model.cancelEdit();
              onCellEdit?.(rowId, col.field, newVal, value);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const newVal = (e.target as HTMLInputElement).value;
                const vResult = validateCell(col, newVal, rowId);
                if (vResult && vResult.severity === 'error') {
                  onValidationError?.(cellAddr, vResult);
                  model.cancelEdit();
                  e.stopPropagation();
                  return;
                }
                clearValidation(rowId, col.field);
                model.setCellValue(cellAddr, newVal);
                model.cancelEdit();
                onCellEdit?.(rowId, col.field, newVal, value);
              } else if (e.key === 'Escape') {
                model.cancelEdit();
              }
              e.stopPropagation();
            }}
          />
        ) : (
          <span style={styles.cellValueText}>
            {renderCellValue(value, cellType)}
          </span>
        )}
        {hasError && (
          <span
            data-testid={`validation-error-${col.field}`}
            role="alert"
            style={styles.validationError}
          >
            {cellError!.message}
          </span>
        )}
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Grouped body rendering
  // -------------------------------------------------------------------------

  const renderGroupedBody = () => {
    if (!groupedView) return null;

    return groupedView.map((item) => {
      if (item.type === 'group') {
        const group = item.group!;
        const isExpanded = rowGroupExpanded.has(group.key);
        return (
          <React.Fragment key={`group-${item.key}`}>
            <div
              data-testid="group-header-row"
              data-group-key={group.key}
              data-group-value={String(group.value)}
              data-group-depth={item.depth}
              role="row"
              style={styles.groupHeaderRow({ height: rowHeight, totalWidth, depth: item.depth })}
              onClick={() => {
                onGroupToggle(group.key);
                onGroupChange?.({ rowGroups: computedRowGroups, expandedGroups: rowGroupExpanded });
              }}
            >
              <span style={styles.groupExpandIcon}>{isExpanded ? '\u25BC' : '\u25B6'}</span>
              <span>{String(group.value)}</span>
              <span style={styles.groupCount}>({group.count})</span>
            </div>
            {/* Aggregate row */}
            {rowGroupConfig?.aggregates && isExpanded && (
              <div
                data-testid="group-aggregate-row"
                data-group-key={group.key}
                role="row"
                style={styles.groupAggregateRow(rowHeight, totalWidth)}
              >
                {orderedVisibleColumns.map((col, colIdx) => {
                  const w = columnWidths[colIdx]?.width ?? 150;
                  const aggValue = group.aggregates?.[col.field];
                  return (
                    <div
                      key={col.field}
                      style={styles.aggregateCell(w)}
                    >
                      {aggValue != null ? String(aggValue) : ''}
                    </div>
                  );
                })}
              </div>
            )}
          </React.Fragment>
        );
      } else {
        // Data row
        const rowId = item.key;
        const row = findRowByRowId(rowId);
        if (!row) return null;
        const rowIdx = rowIds.indexOf(rowId);

        return (
          <div
            key={rowId}
            style={styles.dataRow({ height: rowHeight, totalWidth, isEven: rowIdx % 2 === 0 })}
            role="row"
            aria-rowindex={rowIdx + 2}
            data-row-id={rowId}
            data-row-header="true"
            onContextMenu={(e) => {
              if (e.target === e.currentTarget) {
                onContextMenu(e, rowId, null);
              }
            }}
          >
            {controlsConfig && (
              <ChromeControlsCell
                actions={controlsConfig.actions}
                rowId={rowId}
                rowIndex={rowIdx}
                width={controlsWidth ?? 40}
                height={rowHeight}
              />
            )}
            {rowNumberOnLeft && renderRowNumberCell(rowId, rowIdx)}
            {orderedVisibleColumns.map((col, colIdx) =>
              renderCell(col, colIdx, row, rowId, rowIdx)
            )}
            {!rowNumberOnLeft && renderRowNumberCell(rowId, rowIdx)}
          </div>
        );
      }
    });
  };

  // -------------------------------------------------------------------------
  // Non-grouped body rendering
  // -------------------------------------------------------------------------

  const renderNonGroupedBody = () => {
    if (processedData.length === 0) {
      return (
        <div style={styles.emptyState}>
          No data
        </div>
      );
    }

    return Array.from(
      { length: rowRange.endIndex - rowRange.startIndex + 1 },
      (_, i) => rowRange.startIndex + i
    ).map(rowIdx => {
      const row = processedData[rowIdx];
      if (!row) return null;
      const rowId = rowIds[rowIdx] ?? String(rowIdx);
      return (
        <div
          key={rowId}
          style={styles.virtualizedRow({ height: rowHeight, totalWidth, top: rowIdx * rowHeight + (ghostAtTop ? rowHeight : 0), isEven: rowIdx % 2 === 0 })}
          role="row"
          aria-rowindex={rowIdx + 2}
          data-row-id={rowId}
          data-row-header="true"
          onContextMenu={(e) => {
            if (e.target === e.currentTarget) {
              onContextMenu(e, rowId, null);
            }
          }}
        >
          {controlsConfig && (
            <ChromeControlsCell
              actions={controlsConfig.actions}
              rowId={rowId}
              rowIndex={rowIdx}
              width={controlsWidth ?? 40}
              height={rowHeight}
            />
          )}
          {rowNumberOnLeft && renderRowNumberCell(rowId, rowIdx)}
          {orderedVisibleColumns.map((col, colIdx) =>
            renderCell(col, colIdx, row, rowId, rowIdx)
          )}
          {!rowNumberOnLeft && renderRowNumberCell(rowId, rowIdx)}
        </div>
      );
    });
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      ref={scrollRef}
      style={styles.scrollableBody}
      onScroll={handleScroll}
    >
      {rowGroupConfig && groupedView ? (
        <div style={styles.groupedBodyWrapper(totalWidth)}>
          {showGhostRow && ghostRowConfig && ghostPosition === 'top' && (
            <GhostRow
              columns={orderedVisibleColumns}
              columnWidths={columnWidths}
              rowHeight={rowHeight}
              topOffset={0}
              model={model as any}
              config={ghostRowConfig}
              readOnly={readOnly}
              onRowAdd={onRowAdd}
            />
          )}
          {renderGroupedBody()}
          {showGhostRow && ghostRowConfig && ghostPosition !== 'top' && (
            <GhostRow
              columns={orderedVisibleColumns}
              columnWidths={columnWidths}
              rowHeight={rowHeight}
              topOffset={0}
              model={model as any}
              config={ghostRowConfig}
              readOnly={readOnly}
              onRowAdd={onRowAdd}
            />
          )}
        </div>
      ) : (
        <div style={styles.virtualizedBodyWrapper(rowRange.totalSize + (showGhostRow ? rowHeight : 0), totalWidth)}>
          {renderNonGroupedBody()}
          {showGhostRow && ghostRowConfig && (
            <GhostRow
              columns={orderedVisibleColumns}
              columnWidths={columnWidths}
              rowHeight={rowHeight}
              topOffset={ghostPosition === 'top' ? 0 : processedData.length * rowHeight}
              model={model as any}
              config={ghostRowConfig}
              readOnly={readOnly}
              onRowAdd={onRowAdd}
            />
          )}
        </div>
      )}
    </div>
  );
}
