import type { CSSProperties } from 'react';

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
