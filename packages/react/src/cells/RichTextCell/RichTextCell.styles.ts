import type { CSSProperties } from 'react';

export const displayContainer: CSSProperties = {
  overflow: 'hidden',
  maxHeight: 40,
  fontSize: 13,
  lineHeight: '1.4',
};

export const placeholderText: CSSProperties = {
  color: '#9ca3af',
};

/** Prose wrapper so react-markdown output doesn't collapse into a single run-on line. */
export const markdownBody: CSSProperties = {
  display: 'inline',
};

export const editorWrapper: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  height: '100%',
  boxSizing: 'border-box',
};

export const toolbar: CSSProperties = {
  display: 'flex',
  gap: 4,
  padding: '2px 4px',
  borderBottom: '1px solid #e5e7eb',
  background: '#f9fafb',
  flexShrink: 0,
};

export const toolbarButton: CSSProperties = {
  cursor: 'pointer',
  padding: '2px 6px',
  border: '1px solid transparent',
  background: 'transparent',
  fontSize: 12,
  fontFamily: 'inherit',
  color: '#374151',
  borderRadius: 3,
};

export const toolbarToggle: CSSProperties = {
  marginLeft: 'auto',
};

export const textarea: CSSProperties = {
  flex: 1,
  width: '100%',
  border: 0,
  outline: 'none',
  resize: 'none',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 12,
  padding: 4,
  boxSizing: 'border-box',
};

export const preview: CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: 4,
  fontSize: 13,
  lineHeight: 1.4,
  boxSizing: 'border-box',
};
