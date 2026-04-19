import type { CSSProperties } from 'react';

/**
 * Display-mode wrapper: same flex layout as {@link PasswordCell} so the cell
 * looks identical when not editing.
 */
export const displayContainer: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

/** Masked / revealed text rendered next to the eye toggle in display mode. */
export const maskedText: CSSProperties = {
  letterSpacing: 2,
};

/**
 * Shared style for the show/hide (eye) toggle in both display and edit modes.
 * The toggle is deliberately minimal — a small glyph + accessible label — so
 * it never competes with the primary inputs for visual weight.
 */
export const toggleButton: CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0 4px',
  fontSize: 14,
  lineHeight: 1,
  alignSelf: 'center',
};

/**
 * Edit-mode layout: two inputs stacked vertically with the eye toggle to the
 * right of the first input. The mismatch message sits below both inputs so
 * it never overlaps the entry affordance.
 */
export const editContainer: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: '2px 0',
  width: '100%',
  boxSizing: 'border-box',
};

/** Row wrapping a single input + eye toggle pair. */
export const editInputRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

/** Shared style for the two text inputs so visibility toggling keeps sizing. */
export const editInput: CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: '1px solid var(--dg-border-color, #cbd5e1)',
  borderRadius: 2,
  padding: '2px 4px',
  outline: 'none',
  boxSizing: 'border-box',
  fontSize: 12,
};

/**
 * Inline mismatch message shown when the two entries differ. Uses the grid's
 * error token so it matches built-in validation styling and is picked up by
 * any theme overrides.
 */
export const mismatchMessage: CSSProperties = {
  color: 'var(--dg-error-color, #ef4444)',
  fontSize: 11,
  lineHeight: 1.3,
};
