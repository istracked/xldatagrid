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
  /**
   * Optional text override. When provided (non-empty), rendered in place of
   * the default `rowNumber` digit. Supplied by the grid's
   * `chrome.getChromeCellContent` resolver.
   */
  contentText?: string;
  /**
   * Optional icon node rendered before the text/digit. Supplied by the grid's
   * `chrome.getChromeCellContent` resolver.
   */
  contentIcon?: React.ReactNode;
  /**
   * Optional secondary click handler that runs in addition to `onSelect`.
   * Supplied by the grid's `chrome.getChromeCellContent` resolver; receives
   * the native `MouseEvent` so callers may `stopPropagation` to suppress
   * selection.
   */
  onContentClick?: (evt: MouseEvent, rowId: string, rowIndex: number) => void;
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
  const { rowNumber, rowId, width, height, isSelected, reorderable, stickyLeft, contentText, contentIcon, onContentClick, onSelect, onDragStart, onDragOver, onDrop } = props;

  // Click handler: stop propagation so the row-number click does not also
  // trigger cell-level selection, then forward shift/meta modifiers so the
  // caller can implement range/toggle selection semantics.
  //
  // The chrome-content `onClick` supplied by `chrome.getChromeCellContent`
  // runs first so consumers may `stopPropagation` on the native event to
  // suppress the default row-selection behaviour. Because React's
  // `e.stopPropagation()` also flips `e.nativeEvent.cancelBubble`, we wrap
  // the native event in a thin proxy that records whether the consumer's
  // handler (and only theirs) called `stopPropagation`.
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    let consumerStopped = false;
    if (onContentClick) {
      const native = e.nativeEvent as MouseEvent;
      // Proxy `stopPropagation` on the native event so invocations inside the
      // consumer's handler are observable without inspecting post-React-mutation
      // state. `preventDefault` is forwarded too so consumers can use either
      // idiom to signal "I handled this".
      const originalStop = native.stopPropagation.bind(native);
      const originalPrevent = native.preventDefault.bind(native);
      native.stopPropagation = () => {
        consumerStopped = true;
        originalStop();
      };
      native.preventDefault = () => {
        consumerStopped = true;
        originalPrevent();
      };
      try {
        onContentClick(native, rowId, rowNumber - 1);
      } finally {
        // Restore native methods so downstream listeners (none here, but
        // future-proof) see the prototype methods rather than our proxies.
        native.stopPropagation = originalStop;
        native.preventDefault = originalPrevent;
      }
      if (consumerStopped) return;
    }
    onSelect(rowId, e.shiftKey, e.metaKey || e.ctrlKey);
  }, [rowId, rowNumber, onContentClick, onSelect]);

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

  // Content override: when either text or icon is supplied via
  // `chrome.getChromeCellContent`, render them in place of the default digit.
  // Icon renders before text when both are present. An empty `contentText`
  // is ignored so an accidental `''` return from the resolver falls back to
  // the default row number.
  const hasCustomContent = Boolean(contentIcon) || (typeof contentText === 'string' && contentText.length > 0);
  const renderedContent = hasCustomContent ? (
    <>
      {contentIcon ? <span data-testid="chrome-row-content-icon" style={styles.rowNumberIcon}>{contentIcon as React.ReactNode}</span> : null}
      {typeof contentText === 'string' && contentText.length > 0 ? (
        <span data-testid="chrome-row-content-text">{contentText}</span>
      ) : null}
    </>
  ) : (
    rowNumber
  );

  return (
    <div
      style={cellStyle}
      role="rowheader"
      data-testid="chrome-row-number"
      data-row-number={rowNumber}
      data-row-id={rowId}
      aria-label={typeof contentText === 'string' && contentText.length > 0 ? contentText : `Row ${rowNumber}`}
      draggable={reorderable}
      onClick={handleClick}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {renderedContent}
    </div>
  );
}
