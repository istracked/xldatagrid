import type { CSSProperties } from 'react';

// ---------------------------------------------------------------------------
// Scrollable body
// ---------------------------------------------------------------------------

export const scrollableBody: CSSProperties = {
  flex: 1,
  overflow: 'auto',
  position: 'relative',
};

export const groupedBodyWrapper = (totalWidth: number): CSSProperties => ({
  width: totalWidth,
});

export const virtualizedBodyWrapper = (
  totalHeight: number,
  totalWidth: number,
): CSSProperties => ({
  height: totalHeight,
  width: totalWidth,
  position: 'relative',
});

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------

export const cell = (opts: {
  width: number;
  height: number;
  selected: boolean;
  hasError: boolean;
  frozen: 'left' | 'right' | null;
  frozenLeftOffset: number;
  editable: boolean;
}): CSSProperties => ({
  width: opts.width,
  minWidth: opts.width,
  maxWidth: opts.width,
  height: opts.height,
  display: 'flex',
  alignItems: 'center',
  padding: 'var(--dg-cell-padding, 0 12px)',
  borderRight: '1px solid var(--dg-border-color, #e2e8f0)',
  boxSizing: 'border-box',
  outline: opts.selected ? '2px solid var(--dg-selection-border, #3b82f6)' : 'none',
  outlineOffset: -2,
  overflow: 'hidden',
  cursor: opts.editable ? 'text' : 'default',
  border: opts.hasError ? '2px solid var(--dg-error-color, #ef4444)' : undefined,
  position: opts.frozen ? 'sticky' : 'relative',
  left: opts.frozen === 'left' ? opts.frozenLeftOffset : undefined,
  zIndex: opts.frozen ? 2 : undefined,
  background: opts.frozen ? 'var(--dg-header-bg, #f8fafc)' : undefined,
});

export const cellInput: CSSProperties = {
  width: '100%',
  height: '100%',
  border: 'none',
  outline: 'none',
  padding: 0,
  font: 'inherit',
  background: 'transparent',
};

export const cellValueText: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const validationError: CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 4,
  fontSize: 10,
  color: 'var(--dg-error-color, #ef4444)',
  whiteSpace: 'nowrap',
};

// ---------------------------------------------------------------------------
// Row group header
// ---------------------------------------------------------------------------

export const groupHeaderRow = (opts: {
  height: number;
  totalWidth: number;
  depth: number;
}): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  height: opts.height,
  width: opts.totalWidth,
  borderBottom: '1px solid var(--dg-border-color, #e2e8f0)',
  background: 'var(--dg-header-bg, #f8fafc)',
  paddingLeft: opts.depth * 20 + 8,
  cursor: 'pointer',
  fontWeight: 600,
  boxSizing: 'border-box',
});

export const groupExpandIcon: CSSProperties = {
  marginRight: 8,
};

export const groupCount: CSSProperties = {
  marginLeft: 8,
  color: '#94a3b8',
};

// ---------------------------------------------------------------------------
// Aggregate row
// ---------------------------------------------------------------------------

export const groupAggregateRow = (height: number, totalWidth: number): CSSProperties => ({
  display: 'flex',
  height,
  width: totalWidth,
  borderBottom: '1px solid var(--dg-border-color, #e2e8f0)',
  background: '#f1f5f9',
  fontStyle: 'italic',
});

export const aggregateCell = (width: number): CSSProperties => ({
  width,
  minWidth: width,
  maxWidth: width,
  display: 'flex',
  alignItems: 'center',
  padding: 'var(--dg-cell-padding, 0 12px)',
  borderRight: '1px solid var(--dg-border-color, #e2e8f0)',
  boxSizing: 'border-box',
});

// ---------------------------------------------------------------------------
// Data rows
// ---------------------------------------------------------------------------

export const dataRow = (opts: {
  height: number;
  totalWidth: number;
  isEven: boolean;
}): CSSProperties => ({
  display: 'flex',
  height: opts.height,
  width: opts.totalWidth,
  borderBottom: '1px solid var(--dg-border-color, #e2e8f0)',
  background: opts.isEven
    ? 'var(--dg-row-bg, #ffffff)'
    : 'var(--dg-row-bg-alt, #f8fafc)',
});

export const virtualizedRow = (opts: {
  height: number;
  totalWidth: number;
  top: number;
  isEven: boolean;
}): CSSProperties => ({
  display: 'flex',
  position: 'absolute',
  top: opts.top,
  height: opts.height,
  width: opts.totalWidth,
  borderBottom: '1px solid var(--dg-border-color, #e2e8f0)',
  background: opts.isEven
    ? 'var(--dg-row-bg, #ffffff)'
    : 'var(--dg-row-bg-alt, #f8fafc)',
});

// ---------------------------------------------------------------------------
// Row number chrome overrides for left (sticky) positioning
// ---------------------------------------------------------------------------

/**
 * Returns style overrides for the row-number cell when it is anchored on the
 * left side of the data cells. Makes the cell `position: sticky` so it remains
 * pinned during horizontal scroll. `stickyLeft` should be `controlsWidth` when
 * the controls column is also pinned-left, otherwise `0`.
 */
export const rowNumberCellLeft = (
  _width: number,
  _height: number,
  stickyLeft: number,
): CSSProperties => ({
  position: 'sticky',
  left: stickyLeft,
  zIndex: 5,
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

export const emptyState: CSSProperties = {
  padding: 24,
  textAlign: 'center',
  color: '#94a3b8',
};
