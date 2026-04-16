import type { CSSProperties } from 'react';

export const displayText: CSSProperties = {
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const placeholder: CSSProperties = {
  color: '#9ca3af',
};

export const editTextarea: CSSProperties = {
  width: '100%',
  height: '100%',
  border: 0,
  outline: 'none',
  resize: 'vertical',
  boxSizing: 'border-box',
};

export const editInput: CSSProperties = {
  width: '100%',
  height: '100%',
  border: 0,
  outline: 'none',
  boxSizing: 'border-box',
};
