import type { CSSProperties } from 'react';

export const controlsCell = (width: number, height: number): CSSProperties => ({
  width,
  minWidth: width,
  maxWidth: width,
  height,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  position: 'sticky',
  left: 0,
  zIndex: 4,
  background: 'var(--dg-bg-color, #ffffff)',
  borderRight: '1px solid var(--dg-border-color, #e2e8f0)',
  boxSizing: 'border-box',
  overflow: 'hidden',
  flexShrink: 0,
});

export const controlsHeaderCell = (width: number, height: number): CSSProperties => ({
  width,
  minWidth: width,
  maxWidth: width,
  height,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'sticky',
  left: 0,
  zIndex: 5,
  background: 'var(--dg-header-bg, #f8fafc)',
  borderRight: '1px solid var(--dg-border-color, #e2e8f0)',
  boxSizing: 'border-box',
});

export const actionButton: CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  padding: 2,
  borderRadius: 2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
  flexShrink: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
  maxWidth: '100%',
};

export const actionButtonIcon: CSSProperties = {
  width: '1em',
  height: '1em',
  fontSize: 'inherit',
  flexShrink: 0,
};

export const rowNumberCell = (width: number, height: number): CSSProperties => ({
  width,
  minWidth: width,
  maxWidth: width,
  height,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderLeft: '1px solid var(--dg-border-color, #e2e8f0)',
  boxSizing: 'border-box',
  cursor: 'pointer',
  userSelect: 'none',
  fontSize: 12,
  color: 'var(--dg-text-color, #64748b)',
  background: 'var(--dg-row-number-bg, var(--dg-header-bg, #f3f2f1))',
});

export const rowNumberHeaderCell = (width: number, height: number): CSSProperties => ({
  width,
  minWidth: width,
  maxWidth: width,
  height,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderLeft: '1px solid var(--dg-border-color, #e2e8f0)',
  boxSizing: 'border-box',
  background: 'var(--dg-row-number-bg, var(--dg-header-bg, #f3f2f1))',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--dg-text-color, #64748b)',
});

export const rowNumberDragging: CSSProperties = {
  opacity: 0.5,
};

export const rowNumberSelected: CSSProperties = {
  background: 'var(--dg-selection-color, #dbeafe)',
  fontWeight: 600,
};
