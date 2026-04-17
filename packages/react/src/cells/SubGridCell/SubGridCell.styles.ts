import type { CSSProperties } from 'react';

export const container = (indentPx: number): CSSProperties => ({
  paddingLeft: indentPx,
});

export const toggleButton: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  padding: 0,
  fontSize: 13,
  color: '#374151',
};

export const arrow = (expanded: boolean): CSSProperties => ({
  display: 'inline-block',
  width: 12,
  height: 12,
  lineHeight: '12px',
  textAlign: 'center',
  transform: expanded ? 'rotate(90deg)' : 'none',
  transition: 'transform 0.15s',
  fontStyle: 'normal',
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
};

export const subGridContainer: CSSProperties = {
  marginTop: 4,
  border: '1px solid #e5e7eb',
  borderRadius: 4,
  overflow: 'hidden',
};

export const suspenseFallback: CSSProperties = {
  padding: 8,
  fontSize: 12,
  color: '#9ca3af',
};
