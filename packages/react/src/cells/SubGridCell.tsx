/**
 * SubGridCell module for the datagrid component library.
 *
 * Provides a cell renderer that embeds a nested DataGrid inside a parent grid cell.
 * The sub-grid is collapsible: a toggle button shows the row count as a badge, and
 * expanding the section lazy-loads the DataGrid component via React.lazy/Suspense to
 * avoid circular imports and enable code splitting.
 *
 * @module SubGridCell
 */
import React, { useState, lazy, Suspense } from 'react';
import type { CellValue, ColumnDef } from '@istracked/datagrid-core';
import * as styles from './SubGridCell.styles';

// Lazy-load the DataGrid to avoid circular imports and enable code splitting
const DataGrid = lazy(() => import('../DataGrid').then((m) => ({ default: m.DataGrid })));

/**
 * Props accepted by the {@link SubGridCell} component.
 *
 * @typeParam TData - The shape of a single row in the parent datagrid. Defaults to a generic record.
 */
interface SubGridCellProps<TData = Record<string, unknown>> {
  /** The raw cell value, expected to be an array of row objects for the nested grid. */
  value: CellValue;
  /** The full parent row data object that this cell belongs to. */
  row: TData;
  /** Column definition providing `subGridColumns` and `subGridRowKey` for the nested grid. */
  column: ColumnDef<TData>;
  /** Zero-based index of the parent row within the visible datagrid. */
  rowIndex: number;
  /** Whether the cell is currently in inline-edit mode (unused for sub-grid cells). */
  isEditing: boolean;
  /** Callback to persist updates (unused for sub-grid cells). */
  onCommit: (value: CellValue) => void;
  /** Callback to discard changes (unused for sub-grid cells). */
  onCancel: () => void;
}

/**
 * Coerces a {@link CellValue} into an array of record objects for sub-grid rows.
 *
 * Returns the value directly if it is already an array; otherwise returns an empty array.
 *
 * @param value - The raw cell value to parse.
 * @returns An array of row objects suitable for the nested DataGrid.
 */
function parseRows(value: CellValue): Record<string, unknown>[] {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  return [];
}

/**
 * A datagrid cell renderer that embeds a collapsible nested DataGrid.
 *
 * Displays a toggle button with an expand/collapse arrow and a badge showing the number
 * of nested rows. When expanded, the nested DataGrid is rendered inside a bordered
 * container using React Suspense for lazy loading. Column definitions and the row key
 * for the sub-grid are sourced from the parent column's `subGridColumns` and
 * `subGridRowKey` properties.
 *
 * @typeParam TData - Parent row data shape, defaults to `Record<string, unknown>`.
 *
 * @param props - The component props conforming to {@link SubGridCellProps}.
 * @returns A React element with a toggle button and, when expanded, a nested DataGrid.
 *
 * @example
 * ```tsx
 * <SubGridCell
 *   value={[{ id: 1, name: 'Sub-row 1' }, { id: 2, name: 'Sub-row 2' }]}
 *   row={parentRow}
 *   column={{ ...columnDef, subGridColumns: nestedColumns, subGridRowKey: 'id' }}
 *   rowIndex={0}
 *   isEditing={false}
 *   onCommit={handleCommit}
 *   onCancel={handleCancel}
 * />
 * ```
 */
export function SubGridCell<TData = Record<string, unknown>>({
  value,
  column,
}: SubGridCellProps<TData>) {
  // Parse the cell value into sub-grid row data
  const rows = parseRows(value);
  const [expanded, setExpanded] = useState(false);

  // Extract nested grid configuration from the column definition
  const subGridColumns = column.subGridColumns ?? [];
  const rowKey = column.subGridRowKey ?? 'id';

  // Support nestingLevel-based indentation via column metadata or default to 0
  const nestingLevel = (column as ColumnDef<TData> & { nestingLevel?: number }).nestingLevel ?? 0;
  const indentPx = nestingLevel * 16;

  return (
    <div style={styles.container(indentPx)}>
      {/* Toggle button with a rotation-animated arrow and row count badge */}
      <button
        type="button"
        aria-label={expanded ? 'Collapse sub-grid' : 'Expand sub-grid'}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        style={styles.toggleButton}
      >
        {/* Directional arrow that rotates 90 degrees when expanded */}
        <span style={styles.arrow(expanded)}>
          ▶
        </span>
        {/* Row count badge */}
        <span style={styles.rowCountBadge}>
          {rows.length}
        </span>
      </button>
      {/* Nested DataGrid rendered inside a bordered container when expanded */}
      {expanded && (
        <div style={styles.subGridContainer}>
          <Suspense fallback={<div style={styles.suspenseFallback}>Loading...</div>}>
            <DataGrid
              columns={subGridColumns}
              data={rows}
              rowKey={rowKey}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}
