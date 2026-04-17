import type { CSSProperties } from 'react';

export const displayValue = (isNegativeRed: boolean): CSSProperties => ({
  display: 'block',
  textAlign: 'right',
  color: isNegativeRed ? 'red' : undefined,
});

export const editInput: CSSProperties = {
  width: '100%',
  height: '100%',
  border: 0,
  outline: 'none',
  textAlign: 'right',
  boxSizing: 'border-box',
};
