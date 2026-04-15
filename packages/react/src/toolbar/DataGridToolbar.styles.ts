import type { CSSProperties } from 'react';

export const columnVisibilityBar: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '4px 8px',
};

export const columnVisibilityButton: CSSProperties = {
  cursor: 'pointer',
};

export const columnVisibilityMenu: CSSProperties = {
  position: 'absolute',
  zIndex: 20,
  background: '#fff',
  border: '1px solid #ccc',
  padding: 8,
  top: 30,
};

export const columnVisibilityLabel: CSSProperties = {
  display: 'block',
  cursor: 'pointer',
};

export const groupControls: CSSProperties = {
  display: 'flex',
  gap: 4,
  padding: '4px 8px',
};
