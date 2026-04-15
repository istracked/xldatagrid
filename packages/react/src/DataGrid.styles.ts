import type { CSSProperties } from 'react';

// ---------------------------------------------------------------------------
// Grid container
// ---------------------------------------------------------------------------

export const gridContainer = (
  hasThemeTransition: boolean,
  themeStyle: CSSProperties,
  userStyle?: CSSProperties,
): CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  overflow: 'hidden',
  position: 'relative',
  fontFamily: 'var(--dg-font-family, system-ui, sans-serif)',
  fontSize: 'var(--dg-font-size, 14px)',
  transition: hasThemeTransition ? 'color 0.2s, background 0.2s' : undefined,
  ...themeStyle,
  ...userStyle,
});

// ---------------------------------------------------------------------------
// Drop overlay
// ---------------------------------------------------------------------------

export const dropOverlay: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(59, 130, 246, 0.1)',
  border: '2px dashed #3b82f6',
  zIndex: 10,
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

// ---------------------------------------------------------------------------
// Column visibility
// ---------------------------------------------------------------------------

export const columnVisibilityBar: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '4px 8px',
};

export const columnVisibilityButton: CSSProperties = {
  cursor: 'pointer',
};

export const columnVisibilityMenu: CSSProperties = {
  position: 'absolute',
  zIndex: 20,
  background: '#fff',
  border: '1px solid #ccc',
  padding: 8,
  top: 30,
};

export const columnVisibilityLabel: CSSProperties = {
  display: 'block',
  cursor: 'pointer',
};

// ---------------------------------------------------------------------------
// Group controls
// ---------------------------------------------------------------------------

export const groupControls: CSSProperties = {
  display: 'flex',
  gap: 4,
  padding: '4px 8px',
};

// ---------------------------------------------------------------------------
// Column group header row
// ---------------------------------------------------------------------------

export const columnGroupHeaderRow: CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid var(--dg-border-color, #e2e8f0)',
  background: 'var(--dg-header-bg, #f8fafc)',
};

export const columnGroupHeader = (groupWidth: number): CSSProperties => ({
  width: groupWidth,
  minWidth: groupWidth,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px 8px',
  borderRight: '2px solid var(--dg-border-color, #e2e8f0)',
  fontWeight: 600,
  userSelect: 'none',
  boxSizing: 'border-box',
});

export const columnGroupCollapseButton: CSSProperties = {
  marginLeft: 4,
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  padding: '0 4px',
};

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

// ---------------------------------------------------------------------------
// Column header context menu
// ---------------------------------------------------------------------------

export const columnHeaderMenu = (headerHeight: number, hasColumnGroups: boolean): CSSProperties => ({
  position: 'absolute',
  top: headerHeight + (hasColumnGroups ? 30 : 0),
  zIndex: 30,
  background: '#fff',
  border: '1px solid #ccc',
  padding: 4,
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
});

export const columnMenuItem: CSSProperties = {
  padding: '4px 12px',
  cursor: 'pointer',
};

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
// Empty state
// ---------------------------------------------------------------------------

export const emptyState: CSSProperties = {
  padding: 24,
  textAlign: 'center',
  color: '#94a3b8',
};
