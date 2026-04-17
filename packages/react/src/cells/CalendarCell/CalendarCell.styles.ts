import type { CSSProperties } from 'react';

export const container: CSSProperties = { position: 'relative' };

export const dateLabel: CSSProperties = {
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
  padding: 8,
  minWidth: 220,
};

export const navHeader: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 6,
};

export const navButton: CSSProperties = {
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontSize: 14,
  padding: '2px 6px',
};

export const monthYearLabel: CSSProperties = { fontWeight: 600, fontSize: 13 };

export const dayGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: 2,
  textAlign: 'center',
};

export const weekdayHeader: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#6b7280',
  padding: 2,
};

export const dayButton = (selected: boolean): CSSProperties => ({
  border: 'none',
  borderRadius: 4,
  padding: '3px 0',
  cursor: 'pointer',
  fontSize: 12,
  background: selected ? '#2563eb' : 'none',
  color: selected ? '#fff' : 'inherit',
  fontWeight: selected ? 600 : 400,
});
