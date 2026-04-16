import type { CSSProperties } from 'react';

export const container: CSSProperties = {
  display: 'flex',
  gap: 4,
  alignItems: 'center',
};

export const actionWrapper: CSSProperties = {
  position: 'relative',
  display: 'inline-block',
};

export const actionButton = (isDisabled: boolean): CSSProperties => ({
  padding: '2px 8px',
  cursor: isDisabled ? 'not-allowed' : 'pointer',
  opacity: isDisabled ? 0.5 : 1,
});

export const tooltip: CSSProperties = {
  position: 'absolute',
  bottom: '100%',
  left: '50%',
  transform: 'translateX(-50%)',
  background: '#1f2937',
  color: '#fff',
  padding: '2px 6px',
  borderRadius: 4,
  fontSize: 11,
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  zIndex: 1000,
};

export const optionButton = (isDisabled?: boolean): CSSProperties => ({
  padding: '2px 8px',
  cursor: isDisabled ? 'not-allowed' : 'pointer',
  opacity: isDisabled ? 0.5 : 1,
});
