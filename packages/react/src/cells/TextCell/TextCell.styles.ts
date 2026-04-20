import type { CSSProperties } from 'react';

export const displayText: CSSProperties = {
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const placeholder: CSSProperties = {
  color: '#9ca3af',
};

// Excel-365 padding parity (issue #65): the inline editor is positioned
// absolutely to fill the cell's *border-box* (escaping the cell's
// padding-box) and then re-applies the same `--dg-cell-padding` token the
// cell uses, so `input.rect.left === cell.rect.left` and
// `input.padding-left === cell.padding-left` — the first glyph lands on
// the same pixel it occupied in display mode and the only visible change
// on enter-edit is a blinking caret. Font is inherited so family / size /
// weight / line-height match the cell pixel-for-pixel.
export const editTextarea: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  margin: 0,
  border: 0,
  outline: 'none',
  resize: 'vertical',
  boxSizing: 'border-box',
  padding: 'var(--dg-cell-padding, 0 12px)',
  font: 'inherit',
  lineHeight: 'inherit',
  background: 'transparent',
};

export const editInput: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  margin: 0,
  border: 0,
  outline: 'none',
  boxSizing: 'border-box',
  padding: 'var(--dg-cell-padding, 0 12px)',
  font: 'inherit',
  lineHeight: 'inherit',
  background: 'transparent',
};
