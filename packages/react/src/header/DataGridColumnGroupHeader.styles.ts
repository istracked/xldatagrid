import type { CSSProperties } from 'react';

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
