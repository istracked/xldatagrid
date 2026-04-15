import type { CSSProperties } from 'react';

export const container: CSSProperties = {
  position: 'relative',
};

export const chipDisplay: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 3,
  minHeight: 20,
};

export const placeholder: CSSProperties = {
  color: '#9ca3af',
  fontSize: 12,
};

export const selectedChip: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  background: '#eff6ff',
  color: '#1d4ed8',
  borderRadius: 4,
  padding: '1px 6px',
  fontSize: 11,
  fontWeight: 500,
};

export const dropdown: CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  zIndex: 1000,
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
  padding: '4px 0',
  minWidth: 160,
  maxHeight: 240,
  overflowY: 'auto',
};

export const optionLabel = (checked: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 12px',
  cursor: 'pointer',
  fontSize: 13,
  background: checked ? '#eff6ff' : 'none',
});

export const checkbox: CSSProperties = {
  margin: 0,
};

export const emptyMessage: CSSProperties = {
  display: 'block',
  padding: '6px 12px',
  color: '#9ca3af',
  fontSize: 13,
};
