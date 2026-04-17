import type { CSSProperties } from 'react';

export const container: CSSProperties = { position: 'relative', outline: 'none' };

export const displayLabel: CSSProperties = {
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const placeholder: CSSProperties = { color: '#9ca3af' };

export const dropdown: CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  zIndex: 1000,
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
  listStyle: 'none',
  margin: 0,
  padding: '4px 0',
  minWidth: 140,
  maxHeight: 220,
  overflowY: 'auto',
};

export const optionItem = (active: boolean, selected: boolean): CSSProperties => ({
  padding: '6px 12px',
  cursor: 'pointer',
  fontSize: 13,
  background: active ? '#eff6ff' : 'none',
  fontWeight: selected ? 600 : 400,
});

export const emptyMessage: CSSProperties = {
  padding: '6px 12px',
  color: '#9ca3af',
  fontSize: 13,
};
