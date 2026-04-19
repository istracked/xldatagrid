import type { CSSProperties } from 'react';

/**
 * Wrapper around the "Selected" / em-dash label so the cell is click-friendly
 * when the column is editable. A default cursor is used when the cell is
 * read-only so the affordance matches the click-to-toggle behaviour.
 */
export const container = (editable: boolean): CSSProperties => ({
  cursor: editable ? 'pointer' : 'default',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  userSelect: 'none',
});

/**
 * Style for the "Selected" label when the underlying value is `true`. Rendered
 * with a subtle colour + weight so it reads as an activation pill without
 * requiring a background chip.
 */
export const selectedText: CSSProperties = {
  color: 'var(--dg-primary-color, #2563eb)',
  fontWeight: 600,
};

/**
 * Style for the em-dash affordance used when the underlying value is `false`.
 * Muted colour so the dash reads as a deliberate "no value" rather than a
 * failed render.
 */
export const unselectedText: CSSProperties = {
  color: 'var(--dg-text-muted, #94a3b8)',
};
