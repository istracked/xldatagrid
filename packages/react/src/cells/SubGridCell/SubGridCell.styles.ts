import type { CSSProperties } from 'react';

export const container = (indentPx: number): CSSProperties => ({
  paddingLeft: indentPx,
  display: 'inline-flex',
  alignItems: 'center',
});

export const toggleButton: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  padding: '2px 4px',
  fontSize: 13,
  color: '#374151',
  borderRadius: 3,
};

export const arrow = (expanded: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 14,
  height: 14,
  lineHeight: '14px',
  textAlign: 'center',
  fontSize: expanded ? 14 : 11,
  fontStyle: 'normal',
  fontWeight: expanded ? 700 : 500,
  color: expanded ? '#dc2626' : '#6b7280',
  transition: 'color 0.12s',
});

export const rowCountBadge: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#e5e7eb',
  borderRadius: 10,
  fontSize: 11,
  fontWeight: 600,
  padding: '1px 6px',
  minWidth: 20,
  color: '#374151',
};

/** Wrapper for the nested grid rendered inside the parent row's expansion row. */
export const expansionRowContainer: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  padding: '6px 8px 6px 32px',
  background: 'rgba(148, 163, 184, 0.06)',
  borderTop: '1px solid #e5e7eb',
  borderBottom: '1px solid #e5e7eb',
};

export const expansionRowInner: CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 4,
  overflow: 'hidden',
  background: '#ffffff',
};

/** Legacy exports retained for back-compat with tests that still reference them. */
export const subGridContainer: CSSProperties = expansionRowContainer;
export const suspenseFallback: CSSProperties = {
  padding: 8,
  fontSize: 12,
  color: '#9ca3af',
};
