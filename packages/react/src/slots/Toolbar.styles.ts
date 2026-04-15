import type { CSSProperties } from 'react';

export const toolbar: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 8px',
  borderBottom: '1px solid var(--dg-border-color, #e2e8f0)',
  background: 'var(--dg-header-bg, #f8fafc)',
};
