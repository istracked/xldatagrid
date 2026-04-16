import type { CSSProperties } from 'react';

export const displayContainer: CSSProperties = {
  overflow: 'hidden',
  maxHeight: 40,
  fontSize: 13,
  lineHeight: '1.4',
};

export const placeholderText: CSSProperties = {
  color: '#9ca3af',
};

export const textarea: CSSProperties = {
  width: '100%',
  height: '100%',
  border: 0,
  outline: 'none',
  resize: 'vertical',
  fontFamily: 'monospace',
  fontSize: 12,
  padding: 4,
  boxSizing: 'border-box',
};
