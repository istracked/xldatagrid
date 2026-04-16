import type { CSSProperties } from 'react';

export const displayContainer: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 3,
  minHeight: 20,
};

export const placeholder: CSSProperties = {
  color: '#9ca3af',
  fontSize: 12,
};

export const displayChip: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  background: '#f3f4f6',
  borderRadius: 4,
  padding: '1px 6px',
  fontSize: 11,
  fontWeight: 500,
  color: '#374151',
};

export const editWrapper: CSSProperties = {
  outline: 'none',
};

export const editChipContainer: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4,
  marginBottom: 4,
};

export const editChip = (isActive: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  background: isActive ? '#dbeafe' : '#f3f4f6',
  borderRadius: 4,
  padding: '2px 6px',
  fontSize: 11,
  border: isActive ? '1px solid #93c5fd' : '1px solid transparent',
});

export const chipLabelInput: CSSProperties = {
  border: 'none',
  background: 'transparent',
  fontSize: 11,
  width: 80,
  outline: 'none',
};

export const chipLabelText: CSSProperties = {
  cursor: 'pointer',
};

export const removeButton: CSSProperties = {
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  padding: 0,
  fontSize: 12,
  color: '#6b7280',
  lineHeight: 1,
};

export const addButton: CSSProperties = {
  border: '1px dashed #d1d5db',
  background: 'none',
  borderRadius: 4,
  padding: '1px 8px',
  fontSize: 11,
  cursor: 'pointer',
  color: '#6b7280',
};

export const actionBar: CSSProperties = {
  display: 'flex',
  gap: 4,
};

export const actionButton: CSSProperties = {
  fontSize: 11,
  padding: '2px 8px',
  cursor: 'pointer',
};
