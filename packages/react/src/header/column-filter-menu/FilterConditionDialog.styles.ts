/**
 * Inline-style helpers for {@link FilterConditionDialog}.
 *
 * Theming hooks match the rest of the datagrid family (`--dg-*` custom
 * properties with sensible Excel-palette fallbacks). Stacking order is
 * `backdrop` below `dialog` via explicit z-indexes.
 */
import type { CSSProperties } from 'react';

/** Full-screen backdrop; closes the dialog on mousedown. */
export const backdrop: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.3)',
  zIndex: 10000,
};

/** Centred dialog panel sitting above the backdrop. */
export const dialog: CSSProperties = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%,-50%)',
  zIndex: 10001,
  minWidth: 360,
  background: 'var(--dg-menu-bg, #ffffff)',
  border: '1px solid var(--dg-border-color, #d4d4d4)',
  borderRadius: 2,
  boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
  fontFamily: 'var(--dg-font-family, "Segoe UI", system-ui, sans-serif)',
  fontSize: 'var(--dg-font-size, 13px)',
  padding: '16px 20px',
};

/** "Show rows where:" heading. */
export const heading: CSSProperties = {
  fontWeight: 600,
  marginBottom: 12,
};

/** A single condition row (operator + value). */
export const conditionRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: 6,
};

/** Operator <select> element. */
export const operatorSelect: CSSProperties = {
  flex: '0 0 auto',
  minWidth: 160,
  padding: '3px 4px',
  border: '1px solid var(--dg-border-color, #d4d4d4)',
  borderRadius: 2,
  fontFamily: 'inherit',
  fontSize: 'inherit',
  background: '#fff',
};

/** Value <input> element. */
export const valueInput: CSSProperties = {
  flex: 1,
  padding: '3px 6px',
  border: '1px solid var(--dg-border-color, #d4d4d4)',
  borderRadius: 2,
  fontFamily: 'inherit',
  fontSize: 'inherit',
  minWidth: 0,
};

/** "and" label between the two between-values. */
export const andLabel: CSSProperties = {
  flexShrink: 0,
  fontSize: 'inherit',
};

/** Radio group row (And / Or). */
export const radioRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  margin: '8px 0',
};

/** Footer row containing OK / Cancel buttons. */
export const footer: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  marginTop: 16,
  borderTop: '1px solid var(--dg-border-color, #d4d4d4)',
  paddingTop: 12,
};

/**
 * OK/Cancel button styling. `primary=true` paints the Excel-green OK button;
 * `primary=false` paints the neutral Cancel button. Contrast between the
 * green background and the white label is ~4.99:1 (WCAG AA).
 */
export const button = (primary: boolean): CSSProperties => ({
  padding: '4px 14px',
  fontSize: 'inherit',
  fontFamily: 'inherit',
  cursor: 'pointer',
  border: '1px solid var(--dg-border-color, #d4d4d4)',
  borderRadius: 2,
  // Excel-green fallback paired with explicit white text yields ~4.99:1
  // contrast (WCAG AA). Keep both halves in sync if you change the bg.
  background: primary ? 'var(--dg-primary-color, #217346)' : '#ffffff',
  color: primary ? '#ffffff' : 'inherit',
});
