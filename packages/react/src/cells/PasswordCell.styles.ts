import type { CSSProperties } from 'react';

export const displayContainer: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

export const maskedText: CSSProperties = {
  letterSpacing: 2,
};

export const toggleButton: CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0 2px',
  fontSize: 12,
};

export const editInput: CSSProperties = {
  width: '100%',
  height: '100%',
  border: 0,
  outline: 'none',
  boxSizing: 'border-box',
};
