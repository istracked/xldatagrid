import type { CSSProperties } from 'react';

export const dropZone = (isDragging: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  border: isDragging ? '2px dashed #2563eb' : '2px dashed transparent',
  borderRadius: 4,
  padding: isDragging ? 4 : 0,
  transition: 'border-color 0.15s',
});

export const fileLink: CSSProperties = {
  fontSize: 13,
  color: '#2563eb',
  textDecoration: 'underline',
  flex: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const placeholder: CSSProperties = {
  color: '#9ca3af',
  fontSize: 13,
  flex: 1,
};

export const uploadButton: CSSProperties = {
  border: '1px solid #d1d5db',
  borderRadius: 4,
  background: '#f9fafb',
  cursor: 'pointer',
  padding: '2px 8px',
  fontSize: 11,
  whiteSpace: 'nowrap',
};

export const hiddenInput: CSSProperties = {
  display: 'none',
};
