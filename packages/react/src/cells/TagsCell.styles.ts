import type { CSSProperties } from 'react';

export const tagBadge: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 2,
  padding: '1px 6px',
  borderRadius: 10,
  background: '#dbeafe',
  color: '#1e40af',
  fontSize: 12,
  whiteSpace: 'nowrap',
};

export const tagRemoveButton: CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
  lineHeight: 1,
  fontSize: 12,
  color: '#1e40af',
};

export const displayContainer: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4,
};

export const editContainer: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4,
  alignItems: 'center',
  minWidth: 80,
};

export const tagInput: CSSProperties = {
  border: 'none',
  outline: 'none',
  minWidth: 60,
  flex: 1,
};
