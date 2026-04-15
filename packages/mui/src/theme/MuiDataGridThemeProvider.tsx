/**
 * Theme provider that bridges MUI palette tokens into datagrid CSS variables.
 *
 * @module MuiDataGridThemeProvider
 * @packageDocumentation
 */
import React, { useMemo } from 'react';
import { bridgeMuiTheme, MuiThemeShape } from './theme-bridge';

/**
 * Props accepted by {@link MuiDataGridThemeProvider}.
 */
export interface MuiDataGridThemeProviderProps {
  /** The MUI theme to bridge into datagrid CSS custom properties. */
  theme: MuiThemeShape;
  /** Children to wrap with the CSS custom properties. */
  children: React.ReactNode;
}

/**
 * Wraps children with CSS custom properties derived from a MUI theme.
 *
 * @param props - {@link MuiDataGridThemeProviderProps}
 * @returns A wrapper `<div>` that sets datagrid CSS variables from MUI tokens.
 */
export function MuiDataGridThemeProvider({ theme, children }: MuiDataGridThemeProviderProps) {
  const cssVars = useMemo(() => bridgeMuiTheme(theme), [theme]);

  return (
    <div style={cssVars as React.CSSProperties}>
      {children}
    </div>
  );
}
