/**
 * Bridges a MUI theme to CSS custom properties used by the datagrid.
 *
 * @module theme-bridge
 * @packageDocumentation
 */

/** Minimal MUI theme shape needed for the bridge. */
export interface MuiThemeShape {
  palette: {
    primary: { main: string };
    background: { paper: string; default: string };
    text: { primary: string; secondary: string };
    divider: string;
    action: { hover: string; selected: string };
    error: { main: string };
    success: { main: string };
    warning: { main: string };
    mode?: 'light' | 'dark';
  };
  typography: {
    fontFamily: string;
    fontSize: number;
  };
}

/**
 * Maps MUI theme tokens to datagrid CSS custom properties.
 *
 * @param theme - A MUI theme object conforming to {@link MuiThemeShape}.
 * @returns A record of CSS custom property names to their string values.
 */
export function bridgeMuiTheme(theme: MuiThemeShape): Record<string, string> {
  return {
    '--dg-primary-color': theme.palette.primary.main,
    '--dg-bg-color': theme.palette.background.paper,
    '--dg-surface-color': theme.palette.background.default,
    '--dg-text-color': theme.palette.text.primary,
    '--dg-text-secondary': theme.palette.text.secondary,
    '--dg-border-color': theme.palette.divider,
    '--dg-hover-bg': theme.palette.action.hover,
    '--dg-selected-bg': theme.palette.action.selected,
    '--dg-error-color': theme.palette.error.main,
    '--dg-success-color': theme.palette.success.main,
    '--dg-warning-color': theme.palette.warning.main,
    '--dg-header-bg': theme.palette.mode === 'dark' ? '#1e293b' : '#f8fafc',
    '--dg-font-family': theme.typography.fontFamily,
    '--dg-font-size': `${theme.typography.fontSize}px`,
  };
}
