import type { CSSProperties } from 'react';

/** Outer floating container, portaled to document.body. */
export const container = (top: number, left: number): CSSProperties => ({
  position: 'fixed',
  top,
  left,
  zIndex: 9999,
  minWidth: 240,
  background: 'var(--dg-menu-bg, #ffffff)',
  border: '1px solid var(--dg-border-color, #d4d4d4)',
  borderRadius: 2,
  boxShadow: 'var(--dg-menu-shadow, 0 2px 8px rgba(0,0,0,0.15))',
  fontFamily: 'var(--dg-font-family, "Segoe UI", system-ui, sans-serif)',
  fontSize: 'var(--dg-font-size, 12px)',
  userSelect: 'none',
});

export const menuItem = (disabled: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '5px 12px',
  cursor: disabled ? 'default' : 'pointer',
  color: disabled ? 'var(--dg-disabled-color, #a0a0a0)' : 'inherit',
  whiteSpace: 'nowrap',
});

export const menuItemHover: CSSProperties = {
  background: 'var(--dg-hover-bg, #e8e8e8)',
};

export const icon: CSSProperties = {
  width: 14,
  textAlign: 'center',
  flexShrink: 0,
};

export const label: CSSProperties = {
  flex: 1,
};

export const submenuCaret: CSSProperties = {
  marginLeft: 'auto',
  fontSize: 10,
  opacity: 0.5,
};

export const divider: CSSProperties = {
  height: 1,
  background: 'var(--dg-border-color, #d4d4d4)',
  margin: '4px 0',
};

export const searchInput: CSSProperties = {
  display: 'block',
  boxSizing: 'border-box',
  padding: '4px 6px',
  margin: '4px 8px',
  width: 'calc(100% - 16px)',
  border: '1px solid var(--dg-border-color, #d4d4d4)',
  borderRadius: 2,
  fontFamily: 'inherit',
  fontSize: 'inherit',
  outline: 'none',
};

export const valueList: CSSProperties = {
  maxHeight: 240,
  overflowY: 'auto',
  padding: '2px 0',
};

export const checkboxRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '3px 12px',
  cursor: 'pointer',
};

export const footerRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 6,
  padding: '6px 8px',
  borderTop: '1px solid var(--dg-border-color, #d4d4d4)',
};

export const button = (primary: boolean): CSSProperties => ({
  padding: '3px 12px',
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
