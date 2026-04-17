import type { CSSProperties } from 'react';

export const checkbox = (editable: boolean): CSSProperties => ({
  cursor: editable ? 'pointer' : 'default',
});
