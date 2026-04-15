import type { CSSProperties } from 'react';

// ---------------------------------------------------------------------------
// Header row
// ---------------------------------------------------------------------------

export const headerRow = (height: number): CSSProperties => ({
  display: 'flex',
  height,
  minHeight: height,
  borderBottom: '2px solid var(--dg-border-color, #e2e8f0)',
  background: 'var(--dg-header-bg, #f8fafc)',
  overflow: 'hidden',
});

// ---------------------------------------------------------------------------
// Header cell
// ---------------------------------------------------------------------------

export const headerCell = (opts: {
  width: number;
  height: number;
  frozen: 'left' | 'right' | null;
  frozenLeftOffset: number;
  isGroupLast: boolean;
  isSortable: boolean;
}): CSSProperties => ({
  width: opts.width,
  minWidth: opts.width,
  maxWidth: opts.width,
  height: opts.height,
  display: 'flex',
  alignItems: 'center',
  padding: 'var(--dg-cell-padding, 0 12px)',
  borderRight: opts.isGroupLast
    ? '2px solid var(--dg-border-color, #e2e8f0)'
    : '1px solid var(--dg-border-color, #e2e8f0)',
  cursor: opts.isSortable ? 'pointer' : 'default',
  userSelect: 'none',
  fontWeight: 600,
  boxSizing: 'border-box',
  position: opts.frozen ? 'sticky' : 'relative',
  left: opts.frozen === 'left' ? opts.frozenLeftOffset : undefined,
  zIndex: opts.frozen ? 3 : undefined,
  background: 'var(--dg-header-bg, #f8fafc)',
});

export const headerCellTitle: CSSProperties = {
  flex: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const sortIndicator: CSSProperties = {
  marginLeft: 4,
  fontSize: 12,
};

export const sortPriority: CSSProperties = {
  marginLeft: 2,
  fontSize: 10,
};

export const filterIcon: CSSProperties = {
  marginLeft: 4,
  fontSize: 10,
};

export const columnMenuTrigger: CSSProperties = {
  marginLeft: 4,
  cursor: 'pointer',
  fontSize: 12,
};

export const resizeHandle: CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 0,
  bottom: 0,
  width: 6,
  cursor: 'col-resize',
  zIndex: 5,
};

// ---------------------------------------------------------------------------
// Column drop indicator
// ---------------------------------------------------------------------------

export const columnDropIndicator: CSSProperties = {
  position: 'absolute',
  width: 2,
  background: '#3b82f6',
  zIndex: 20,
  pointerEvents: 'none',
};
