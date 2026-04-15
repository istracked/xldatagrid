import type { CSSProperties } from 'react';

export const statusBar: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '2px 8px',
  borderTop: '1px solid var(--dg-border-color, #e2e8f0)',
  background: 'var(--dg-header-bg, #f8fafc)',
  fontSize: 12,
};
