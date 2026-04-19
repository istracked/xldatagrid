/**
 * DataGridBody — the virtualised body renderer for the data grid.
 *
 * Responsibilities:
 *  - Drive the virtualisation loop for the non-grouped render path: compute
 *    which rows fall inside `rowRange` and absolutely-position each visible
 *    row at `rowIdx * rowHeight` inside a sized spacer.
 *  - Drive the grouped render path: walk `groupedView` and emit group header
 *    rows, optional aggregate rows, and data rows, honouring the collapsed /
 *    expanded state in `rowGroupExpanded`.
 *  - Compose the per-row chrome columns around the data cells. Each rendered
 *    row has (optionally) a `ChromeControlsCell`, a `ChromeRowNumberCell`,
 *    the data cells from `orderedVisibleColumns`, and — depending on the
 *    configured row-number `position` — the row-number cell on the left or
 *    on the right of the data cells.
 *  - Render each data cell via the `renderCell` closure, which handles cell
 *    selection, the double-click-to-edit interaction, invocation of custom
 *    `cellRenderers`, the fallback `<input>` editor, validation display,
 *    frozen-column sticky offsets, and the context-menu hook.
 *  - Integrate the `GhostRow` for the blank append-row slot, positioning it
 *    at the top or bottom of either the grouped or virtualised wrapper
 *    according to `ghostRowConfig.position`.
 *  - Forward drag/drop events from the row-number cell (row reordering) and
 *    context-menu events from the row container (row-level menu) up to the
 *    owning `DataGrid`.
 *
 * Related modules:
 *  - {@link ../DataGrid} — the owning component that wires model state,
 *    virtualisation and keyboard handling and renders this component.
 *  - {@link ../chrome/ChromeControlsCell} and
 *    {@link ../chrome/ChromeRowNumberCell} — the pinned chrome column cells.
 *  - {@link ../GhostRow} — the appendable blank row at top/bottom.
 *  - {@link ./DataGridBody.styles} — inline CSSProperties factories used
 *    across both render paths.
 */
import React, { useRef } from 'react';
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
import type { ControlsColumnConfig, RowNumberColumnConfig, RowBorderStyle, ChromeCellContent } from '@istracked/datagrid-core';
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

/**
 * Props for {@link DataGridBody}.
 *
 * The body is a controlled renderer: the owning `DataGrid` owns all state
 * (selection, editing, grouping, virtualisation range, validation) and passes
 * it down through these props. The body emits user intent back via the
 * `onCellEdit`, `onValidationError`, `onContextMenu`, `onGroupToggle`,
 * `onGroupChange`, `onRowNumberClick`, `onRowDrag*`, `onRowDrop` and
 * `onRowAdd` callbacks.
 *
 * Props are grouped by concern below; the non-trivial ones:
 *  - **Virtualization** — `rowRange` defines the currently-visible slice and
 *    `totalSize` the scroll spacer. `scrollRef` / `handleScroll` let the
 *    parent observe scroll events.
 *  - **Grouping** — `groupedView` is the pre-computed flat list of group
 *    header / aggregate / data rows. When non-null the grouped render path is
 *    taken (no virtualisation).
 *  - **Chrome columns** — `controlsConfig` and `rowNumberConfig` turn the
 *    respective pinned chrome columns on; their widths and click/drag hooks
 *    are supplied separately so the body can remain agnostic of how the
 *    owning grid wires row-selection and reordering behaviour.
 *  - **Ghost row** — `ghostRowConfig` may be a boolean or a config object and
 *    its `position` (top/bottom) is resolved via `resolveGhostPosition`.
 */
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

  // Chrome-level row presentation hooks (issue #14). Each is evaluated per
  // rendered row; returning nullish preserves the stock presentation.
  getRowBorder?: (row: TData, rowId: string, rowIndex: number) => RowBorderStyle | null | undefined;
  getRowBackground?: (row: TData, rowId: string, rowIndex: number) => string | null | undefined;
  getChromeCellContent?: (row: TData, rowId: string, rowIndex: number) => ChromeCellContent | null | undefined;

  // Ghost row
  showGhostRow: boolean;
  ghostRowConfig?: boolean | GhostRowConfig<TData>;
  readOnly?: boolean;
  onRowAdd?: (data: Partial<TData>) => void;

  // Sub-grid expansion
  /**
   * Set of row ids whose sub-grid is currently expanded. For each id in this
   * set, the body renders an inline expansion row beneath the parent row
   * using `renderSubGridExpansionRow`. The depth is inferred from
   * `subGridDepth` (0 for the top-level grid) so nested grids can indent and
   * avoid re-entering themselves.
   */
  expandedSubGrids?: Set<string>;
  /**
   * Called for each expanded row to produce the React subtree rendered in
   * the expansion row. Returning `null` hides the expansion (useful when the
   * row has no sub-grid columns or the data is empty).
   */
  renderSubGridExpansionRow?: (rowId: string, row: TData) => React.ReactNode;
  /** Current nesting depth; 0 for the outer grid. */
  subGridDepth?: number;
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
    getRowBorder,
    getRowBackground,
    getChromeCellContent,
    showGhostRow,
    ghostRowConfig,
    readOnly,
    onRowAdd,
    expandedSubGrids,
    renderSubGridExpansionRow,
    subGridDepth = 0,
  } = props;

  const ghostPosition = showGhostRow ? resolveGhostPosition(ghostRowConfig) : 'bottom';
  const ghostAtTop = ghostPosition === 'top' && showGhostRow;

  // Issue #11: when Esc is pressed inside the fallback inline editor, the
  // unmount that follows `model.cancelEdit()` triggers a native `blur` event
  // that would otherwise commit the draft. This ref flips to `true` in the
  // Escape handler and is consulted by `onBlur` so the cancelled draft is
  // discarded. It lives at component scope so the closure captured by the
  // input survives the unmount.
  const inlineEditCancelledRef = useRef(false);

  // Row-number chrome column position.
  //
  // Defaults to 'left' to match the Excel 365 convention: row numbers sit to
  // the left of the data cells, immediately after the (optional) controls
  // column. Consumers that want the legacy layout (row numbers pinned at the
  // far right of the row) set `rowNumberConfig.position = 'right'`.
  //
  // Render order within a row is:
  //   position: 'left'  →  [controls] [row-number] [data cells...]
  //   position: 'right' →  [controls] [data cells...] [row-number]
  //
  // `rowNumberOnLeft` is cached here because both render paths (grouped and
  // non-grouped) branch on it twice per row and we want a single source of
  // truth.
  const rowNumberPosition: 'left' | 'right' = rowNumberConfig?.position ?? 'left';
  const rowNumberOnLeft = rowNumberPosition === 'left';

  // -------------------------------------------------------------------------
  // Render helper: row-number chrome cell (shared across both body paths)
  // -------------------------------------------------------------------------

  // Horizontal offset at which the row-number cell should be `position:
  // sticky` when rendered on the left. The row-number gutter must stay
  // visible during horizontal scroll (Excel-style) *and* must not overlap the
  // controls column when one is configured. The offset therefore is:
  //
  //   - `controlsWidth ?? 40`  when a controls column is active (the default
  //                            controls-column width is 40px), so the sticky
  //                            row-number cell is pinned immediately to the
  //                            right of the controls column.
  //   - `0`                    when no controls column is configured; the
  //                            row-number cell pins to the left edge.
  //   - `undefined`            when the row number is rendered on the right;
  //                            the cell does not need sticky-left positioning
  //                            in that case (the chrome cell omits the
  //                            sticky style when `stickyLeft` is undefined).
  const rowNumberStickyLeft = rowNumberOnLeft
    ? (controlsConfig ? (controlsWidth ?? 40) : 0)
    : undefined;

  // Render the row-number chrome cell for a given row.
  //
  // Factored into a helper so the grouped and non-grouped render paths can
  // share identical props/key/offset wiring and to keep the two call sites
  // (left-of-data and right-of-data) symmetrical. Returns null when the
  // caller hasn't opted into row numbers — both the config object and a
  // click handler are required before a cell is rendered, matching the
  // pre-refactor behaviour.
  //
  // The `key="__row-number__"` is stable across re-renders and distinct from
  // any column `field` value so React can reconcile this child independently
  // of the data-cell list whose keys are `col.field`.
  const renderRowNumberCell = (row: TData | undefined, rowId: string, rowIdx: number) => {
    if (!rowNumberConfig || !onRowNumberClick) return null;
    // Resolve optional per-row chrome-cell content override. Only invoked when
    // the consumer supplied a resolver; the row may be `undefined` during a
    // brief reconciliation window (e.g. a data swap), in which case we fall
    // back to the default digit rather than propagating `undefined` into user
    // code.
    const content = row !== undefined && getChromeCellContent
      ? getChromeCellContent(row, rowId, rowIdx) ?? null
      : null;
    return (
      <ChromeRowNumberCell
        key="__row-number__"
        rowNumber={rowIdx + 1}
        rowId={rowId}
        width={rowNumberWidth ?? 50}
        height={rowHeight}
        reorderable={rowNumberConfig.reorderable !== false}
        stickyLeft={rowNumberStickyLeft}
        contentText={content?.text}
        contentIcon={content?.icon as React.ReactNode}
        onContentClick={content?.onClick}
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
            ref={(el) => {
              // Clear the cancellation flag each time a new edit input
              // mounts, so a previous Esc doesn't silence the next commit.
              if (el) inlineEditCancelledRef.current = false;
            }}
            onBlur={e => {
              if (inlineEditCancelledRef.current) return;
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
                inlineEditCancelledRef.current = true;
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
        const isExpanded = expandedSubGrids?.has(rowId) ?? false;

        // Resolve per-row presentation overrides for this data row. Evaluated
        // eagerly rather than memoised: resolvers are typically pure and cheap,
        // and the grouped render path is not virtualised so callers are not
        // paying the cost for unrendered rows.
        const rowBg = getRowBackground ? getRowBackground(row, rowId, rowIdx) ?? null : null;
        const rowBorder = getRowBorder ? getRowBorder(row, rowId, rowIdx) ?? null : null;
        return (
          <React.Fragment key={rowId}>
            <div
              style={styles.dataRow({ height: rowHeight, totalWidth, isEven: rowIdx % 2 === 0, background: rowBg, border: rowBorder })}
              role="row"
              aria-rowindex={rowIdx + 2}
              data-row-id={rowId}
              data-row-header="true"
              data-subgrid-expanded={isExpanded ? 'true' : undefined}
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
              {rowNumberOnLeft && renderRowNumberCell(row, rowId, rowIdx)}
              {orderedVisibleColumns.map((col, colIdx) =>
                renderCell(col, colIdx, row, rowId, rowIdx)
              )}
              {!rowNumberOnLeft && renderRowNumberCell(row, rowId, rowIdx)}
            </div>
            {isExpanded && renderSubGridExpansionRow && (
              <div
                role="row"
                data-testid={`subgrid-expansion-${rowId}`}
                data-subgrid-row-id={rowId}
                data-subgrid-depth={subGridDepth + 1}
                style={styles.subGridExpansionRow({
                  totalWidth,
                  depth: subGridDepth,
                })}
              >
                <div style={styles.subGridExpansionInner}>
                  {renderSubGridExpansionRow(rowId, row)}
                </div>
              </div>
            )}
          </React.Fragment>
        );
      }
    });
  };

  // -------------------------------------------------------------------------
  // Sub-grid expansion detection
  // -------------------------------------------------------------------------
  //
  // If any parent row has its sub-grid expanded we cannot keep the virtualised
  // absolute-positioning layout, because the expansion rows introduce variable
  // heights that aren't accounted for by the fixed-`rowHeight` virtualiser.
  // In that case we fall back to a flow layout that renders the full data set
  // (non-virtualised). Virtualisation is restored when every sub-grid is
  // collapsed.
  //
  // This trade-off is acceptable because sub-grid rendering is inherently a
  // "look at a subset of rows closely" interaction; for heavy virtualisation
  // workloads users typically keep the rows collapsed.

  const hasExpandedSubGrids = !!expandedSubGrids && expandedSubGrids.size > 0;

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

    // Choose the row index range: virtualised window when no sub-grids are
    // expanded; full dataset otherwise.
    const indices = hasExpandedSubGrids
      ? processedData.map((_, i) => i)
      : Array.from(
          { length: rowRange.endIndex - rowRange.startIndex + 1 },
          (_, i) => rowRange.startIndex + i,
        );

    return indices.map(rowIdx => {
      const row = processedData[rowIdx];
      if (!row) return null;
      const rowId = rowIds[rowIdx] ?? String(rowIdx);
      const isExpanded = expandedSubGrids?.has(rowId) ?? false;

      // Per-row presentation overrides (issue #14). Resolvers are invoked
      // once per rendered row; `null`/`undefined` results preserve the
      // default zebra stripe and row-separator styling.
      const rowBg = getRowBackground ? getRowBackground(row, rowId, rowIdx) ?? null : null;
      const rowBorder = getRowBorder ? getRowBorder(row, rowId, rowIdx) ?? null : null;

      // Use in-flow positioning (no absolute top) whenever any sub-grid is
      // expanded, so expansion rows can push subsequent rows down naturally.
      const rowStyle = hasExpandedSubGrids
        ? styles.dataRow({ height: rowHeight, totalWidth, isEven: rowIdx % 2 === 0, background: rowBg, border: rowBorder })
        : styles.virtualizedRow({
            height: rowHeight,
            totalWidth,
            top: rowIdx * rowHeight + (ghostAtTop ? rowHeight : 0),
            isEven: rowIdx % 2 === 0,
            background: rowBg,
            border: rowBorder,
          });

      return (
        <React.Fragment key={rowId}>
          <div
            style={rowStyle}
            role="row"
            aria-rowindex={rowIdx + 2}
            data-row-id={rowId}
            data-row-header="true"
            data-subgrid-expanded={isExpanded ? 'true' : undefined}
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
            {rowNumberOnLeft && renderRowNumberCell(row, rowId, rowIdx)}
            {orderedVisibleColumns.map((col, colIdx) =>
              renderCell(col, colIdx, row, rowId, rowIdx)
            )}
            {!rowNumberOnLeft && renderRowNumberCell(row, rowId, rowIdx)}
          </div>
          {isExpanded && renderSubGridExpansionRow && (
            <div
              role="row"
              data-testid={`subgrid-expansion-${rowId}`}
              data-subgrid-row-id={rowId}
              data-subgrid-depth={subGridDepth + 1}
              style={styles.subGridExpansionRow({
                totalWidth,
                depth: subGridDepth,
              })}
            >
              <div style={styles.subGridExpansionInner}>
                {renderSubGridExpansionRow(rowId, row)}
              </div>
            </div>
          )}
        </React.Fragment>
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
        <div
          style={
            hasExpandedSubGrids
              ? styles.groupedBodyWrapper(totalWidth)
              : styles.virtualizedBodyWrapper(
                  rowRange.totalSize + (showGhostRow ? rowHeight : 0),
                  totalWidth,
                )
          }
        >
          {renderNonGroupedBody()}
          {showGhostRow && ghostRowConfig && !hasExpandedSubGrids && (
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
