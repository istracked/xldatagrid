import type { CSSProperties } from 'react';

/**
 * Wrapper around the "Selected" / em-dash label so the cell is click-friendly
 * when the column is editable. A default cursor is used when the cell is
 * read-only so the affordance matches the click-to-toggle behaviour.
 *
 * When `focused` is true, a 2px focus ring using the grid's focus token is
 * drawn around the cell so keyboard users always have a visible affordance.
 * jsdom does not resolve `:focus-visible`, so the ring is driven by an
 * `onFocus` / `onBlur` flag rather than a pseudo-selector — that also keeps
 * the implementation within the inline-style system the other cells use.
 */
export const container = (editable: boolean, focused = false): CSSProperties => ({
  cursor: editable ? 'pointer' : 'default',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  userSelect: 'none',
  outline: focused ? '2px solid var(--dg-focus-color, #0284c7)' : 'none',
  outlineOffset: focused ? 2 : undefined,
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
