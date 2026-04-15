import type { CSSProperties } from 'react';

export const formulaBar: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderBottom: '1px solid var(--dg-border-color, #e2e8f0)',
  background: 'var(--dg-bg-color, #ffffff)',
};

export const fxLabel: CSSProperties = {
  fontWeight: 600,
  marginRight: 8,
  fontSize: 12,
};

export const formulaInput: CSSProperties = {
  flex: 1,
  border: 'none',
  outline: 'none',
  font: 'inherit',
  background: 'transparent',
};
