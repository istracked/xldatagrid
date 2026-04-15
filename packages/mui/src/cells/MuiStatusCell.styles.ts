import type { CSSProperties } from 'react';

export const colorDot = (color: string): CSSProperties => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  background: color,
  display: 'inline-block',
  marginRight: 8,
  flexShrink: 0,
});
