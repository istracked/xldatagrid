import type { CSSProperties } from 'react';

/** Markdown editor textarea shared between edit and preview flows. */
export const editorTextarea: CSSProperties = {
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
