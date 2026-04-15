import type { CSSProperties } from 'react';

export const menu = (x: number, y: number): CSSProperties => ({
  position: 'fixed',
  top: y,
  left: x,
  zIndex: 9999,
  background: 'var(--dg-menu-bg, #ffffff)',
  border: '1px solid var(--dg-border-color, #e2e8f0)',
  borderRadius: 6,
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  padding: '4px 0',
  minWidth: 180,
  fontFamily: 'var(--dg-font-family, system-ui, sans-serif)',
  fontSize: 'var(--dg-font-size, 14px)',
});

export const menuItem = (isDisabled: boolean, isDanger: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  padding: '6px 12px',
  cursor: isDisabled ? 'default' : 'pointer',
  opacity: isDisabled ? 0.4 : 1,
  color: isDanger ? '#ef4444' : 'inherit',
  position: 'relative',
});

export const icon: CSSProperties = {
  marginRight: 8,
  width: 16,
  textAlign: 'center',
};

export const label: CSSProperties = {
  flex: 1,
};

export const shortcut: CSSProperties = {
  marginLeft: 24,
  fontSize: 12,
  opacity: 0.6,
};

export const submenuArrow: CSSProperties = {
  marginLeft: 8,
};

export const divider: CSSProperties = {
  height: 1,
  background: 'var(--dg-border-color, #e2e8f0)',
  margin: '4px 0',
};

export const submenu: CSSProperties = {
  position: 'absolute',
  left: '100%',
  top: 0,
  background: 'var(--dg-menu-bg, #ffffff)',
  border: '1px solid var(--dg-border-color, #e2e8f0)',
  borderRadius: 6,
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  padding: '4px 0',
  minWidth: 160,
  zIndex: 10000,
};
