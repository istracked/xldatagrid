/**
 * Body-row row-number cell for the grid's row-number chrome gutter. Displays
 * the 1-based row number, handles row selection on click, and optionally
 * participates in drag-and-drop row reordering.
 *
 * Design reference: Excel 365 — a greyed left gutter of row numbers that
 * stays pinned during horizontal scroll.
 *
 * Sticky-positioning strategy: when `stickyLeft` is provided the cell is
 * pinned with `position: sticky; left: stickyLeft; zIndex: 5`. Callers compute
 * the offset as the controls column width when a controls column precedes this
 * column, or `0` otherwise. When omitted, the cell scrolls with the grid body.
 */
import React, { useCallback } from 'react';
import * as styles from './ChromeColumn.styles';

/**
 * Props for {@link ChromeRowNumberCell}.
 *
 * `stickyLeft` contract: when set (including `0`) the cell becomes sticky at
 * that left offset with z-index 5. Pass the width of any preceding sticky
 * chrome columns (typically the controls column width), or `0` when the
 * row-number column is the outermost chrome. Drag-and-drop is enabled only
 * when `reorderable` is true; otherwise drag events are no-ops.
 */
export interface ChromeRowNumberCellProps {
  rowNumber: number;
  rowId: string;
  width: number;
  height: number;
  isSelected?: boolean;
  reorderable?: boolean;
  /**
   * When set, pins the cell with `position: sticky; left: stickyLeft` so the
   * row-number gutter stays visible during horizontal scroll. Pass the offset
   * of any preceding sticky chrome columns (e.g. controls width) or `0`.
   */
  stickyLeft?: number;
  onSelect: (rowId: string, shiftKey: boolean, metaKey: boolean) => void;
  onDragStart?: (rowId: string, rowIndex: number) => void;
  onDragOver?: (rowId: string, rowIndex: number) => void;
  onDrop?: (rowId: string, rowIndex: number) => void;
}

/**
 * Renders a single body-row row-number cell. Style composition layers (in
 * order): base `rowNumberCell`, `rowNumberSelected` overlay when the row is
 * selected, then a sticky-left overlay at z-index 5 when `stickyLeft` is
 * provided. Click, drag-start, drag-over and drop handlers are memoised and
 * short-circuit when reordering is disabled.
 */
export function ChromeRowNumberCell(props: ChromeRowNumberCellProps) {
  const { rowNumber, rowId, width, height, isSelected, reorderable, stickyLeft, onSelect, onDragStart, onDragOver, onDrop } = props;

  // Click handler: stop propagation so the row-number click does not also
  // trigger cell-level selection, then forward shift/meta modifiers so the
  // caller can implement range/toggle selection semantics.
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(rowId, e.shiftKey, e.metaKey || e.ctrlKey);
  }, [rowId, onSelect]);

  // Drag-start: gated by `reorderable`. When disabled, cancel the native drag
  // entirely. Otherwise advertise a move-effect payload carrying the row id
  // and notify the parent with the 0-based row index.
  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (!reorderable) { e.preventDefault(); return; }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', rowId);
    onDragStart?.(rowId, rowNumber - 1);
  }, [reorderable, rowId, rowNumber, onDragStart]);

  // Drag-over: `preventDefault` is required to declare this element a valid
  // drop target; we also set a move cursor and bubble the hover up.
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!reorderable) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOver?.(rowId, rowNumber - 1);
  }, [reorderable, rowId, rowNumber, onDragOver]);

  // Drop: again `preventDefault` prevents the browser's default open/navigate
  // behaviour so the parent reorder callback owns the outcome.
  const handleDrop = useCallback((e: React.DragEvent) => {
    if (!reorderable) return;
    e.preventDefault();
    onDrop?.(rowId, rowNumber - 1);
  }, [reorderable, rowId, rowNumber, onDrop]);

  // Compose: base gutter style, selection overlay (wins the background), then
  // optional sticky-left pin. `stickyLeft === 0` is a valid pin position, so
  // the check uses `!== undefined` rather than truthiness.
  const cellStyle = {
    ...styles.rowNumberCell(width, height),
    ...(isSelected ? styles.rowNumberSelected : {}),
    ...(stickyLeft !== undefined ? { position: 'sticky' as const, left: stickyLeft, zIndex: 5 } : {}),
  };

  return (
    <div
      style={cellStyle}
      role="rowheader"
      data-testid="chrome-row-number"
      data-row-number={rowNumber}
      data-row-id={rowId}
      aria-label={`Row ${rowNumber}`}
      draggable={reorderable}
      onClick={handleClick}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {rowNumber}
    </div>
  );
}
