/**
 * Header-row cells for the grid's chrome columns (controls gutter + row-number
 * gutter).
 *
 * Design reference: Excel 365 — the controls gutter and row-number gutter are
 * both pinned to the left of the data columns, with a darker header tile on
 * top of each.
 *
 * Sticky-positioning strategy: the controls header pins at `left: 0` via the
 * shared `controlsHeaderCell` style; the row-number header is sticky only when
 * the `stickyLeft` prop is provided. Callers compute the offset as the controls
 * column width when a controls column precedes the row-number column, or `0`
 * otherwise. Z-index 6 keeps the row-number header above the row-number body
 * cells (z-index 5) on horizontal scroll; the controls header lives at z-index
 * 5 and sits flush at `left: 0`.
 */
import React from 'react';
import * as styles from './ChromeColumn.styles';

/**
 * Props for {@link ChromeControlsHeaderCell}. Width and height lock the cell to
 * the same track dimensions used by the body controls cell so they align.
 */
export interface ChromeControlsHeaderCellProps {
  width: number;
  height: number;
}

/**
 * Header-row tile over the controls gutter. Empty by design — it exists to
 * occupy the grid cell above the row action buttons so the header row remains
 * contiguous. Sticky-pinned at `left: 0`, z-index 5 (configured by
 * `styles.controlsHeaderCell`).
 */
export function ChromeControlsHeaderCell(props: ChromeControlsHeaderCellProps) {
  // Render an empty accessible column header; sticky positioning is baked into
  // `styles.controlsHeaderCell`.
  return (
    <div
      style={styles.controlsHeaderCell(props.width, props.height)}
      role="columnheader"
      data-testid="chrome-controls-header"
      aria-label="Controls"
    />
  );
}

/**
 * Props for {@link ChromeRowNumberHeaderCell}.
 *
 * `stickyLeft` contract: when provided (including `0`), the header cell is
 * pinned with `position: sticky; left: stickyLeft; zIndex: 6`. Callers pass the
 * preceding chrome width — typically the controls column width when a controls
 * column is present, or `0` when the row-number gutter is the outermost chrome.
 * When the prop is omitted the cell scrolls with the grid content.
 */
export interface ChromeRowNumberHeaderCellProps {
  width: number;
  height: number;
  onSelectAll?: () => void;
  /**
   * When set, pins the header cell with `position: sticky; left: stickyLeft`
   * so the row-number gutter header stays visible during horizontal scroll.
   */
  stickyLeft?: number;
}

/**
 * Header-row tile over the row-number gutter (the `#` cell). Clicking fires
 * `onSelectAll` so the header also acts as a select-all affordance. Uses the
 * shared `rowNumberHeaderCell` style and conditionally overlays sticky-left
 * positioning at z-index 6 when `stickyLeft` is provided.
 */
export function ChromeRowNumberHeaderCell(props: ChromeRowNumberHeaderCellProps) {
  // Compose the base header style with an optional sticky overlay. Undefined
  // `stickyLeft` leaves the cell in normal flow; any number (including `0`)
  // opts in to pinning at z-index 6.
  const style = {
    ...styles.rowNumberHeaderCell(props.width, props.height),
    ...(props.stickyLeft !== undefined ? { position: 'sticky' as const, left: props.stickyLeft, zIndex: 6 } : {}),
  };
  return (
    <div
      style={style}
      role="columnheader"
      data-testid="chrome-row-number-header"
      aria-label="Row numbers"
      onClick={props.onSelectAll}
    >
      #
    </div>
  );
}
