import type { CSSProperties } from 'react';

export const container: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
};

export const headerRow = (headerHeight: number): CSSProperties => ({
  display: 'flex',
  height: headerHeight,
  borderBottom: '2px solid #e2e8f0',
  background: '#f8fafc',
});

export const headerCell = (width: number): CSSProperties => ({
  width,
  minWidth: width,
  padding: '0 12px',
  display: 'flex',
  alignItems: 'center',
  fontWeight: 600,
  borderRight: '1px solid #e2e8f0',
  boxSizing: 'border-box',
});

export const rowsContainer: CSSProperties = {
  flex: 1,
  overflow: 'auto',
};

export const masterRow = (rowHeight: number): CSSProperties => ({
  display: 'flex',
  height: rowHeight,
  borderBottom: '1px solid #e2e8f0',
});

export const expandIconCell = (width: number): CSSProperties => ({
  width,
  minWidth: width,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  borderRight: '1px solid #e2e8f0',
  boxSizing: 'border-box',
});

export const expandIcon: CSSProperties = {
  fontSize: 12,
  userSelect: 'none',
};

export const dataCell = (width: number): CSSProperties => ({
  width,
  minWidth: width,
  display: 'flex',
  alignItems: 'center',
  padding: '0 12px',
  borderRight: '1px solid #e2e8f0',
  boxSizing: 'border-box',
  overflow: 'hidden',
});

export const cellText: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const detailPanel = (detailHeight?: number): CSSProperties => ({
  width: '100%',
  ...(detailHeight != null ? { height: detailHeight, overflow: 'auto' } : {}),
  borderBottom: '1px solid #e2e8f0',
  background: '#fafafa',
});

export const detailLoading: CSSProperties = {
  padding: 16,
  textAlign: 'center',
};
