import { bridgeMuiTheme, MuiThemeShape } from '../theme/theme-bridge';

describe('bridgeMuiTheme', () => {
  const lightTheme: MuiThemeShape = {
    palette: {
      primary: { main: '#1976d2' },
      background: { paper: '#ffffff', default: '#f5f5f5' },
      text: { primary: '#000000', secondary: '#666666' },
      divider: '#e0e0e0',
      action: { hover: 'rgba(0,0,0,0.04)', selected: 'rgba(0,0,0,0.08)' },
      error: { main: '#d32f2f' },
      success: { main: '#2e7d32' },
      warning: { main: '#ed6c02' },
      mode: 'light',
    },
    typography: { fontFamily: '"Roboto", sans-serif', fontSize: 14 },
  };

  test('maps primary color', () => {
    const vars = bridgeMuiTheme(lightTheme);
    expect(vars['--dg-primary-color']).toBe('#1976d2');
  });

  test('maps background color', () => {
    const vars = bridgeMuiTheme(lightTheme);
    expect(vars['--dg-bg-color']).toBe('#ffffff');
  });

  test('maps text color', () => {
    const vars = bridgeMuiTheme(lightTheme);
    expect(vars['--dg-text-color']).toBe('#000000');
  });

  test('maps border color', () => {
    const vars = bridgeMuiTheme(lightTheme);
    expect(vars['--dg-border-color']).toBe('#e0e0e0');
  });

  test('maps error color', () => {
    const vars = bridgeMuiTheme(lightTheme);
    expect(vars['--dg-error-color']).toBe('#d32f2f');
  });

  test('maps success color', () => {
    const vars = bridgeMuiTheme(lightTheme);
    expect(vars['--dg-success-color']).toBe('#2e7d32');
  });

  test('maps warning color', () => {
    const vars = bridgeMuiTheme(lightTheme);
    expect(vars['--dg-warning-color']).toBe('#ed6c02');
  });

  test('maps font family', () => {
    const vars = bridgeMuiTheme(lightTheme);
    expect(vars['--dg-font-family']).toBe('"Roboto", sans-serif');
  });

  test('maps font size', () => {
    const vars = bridgeMuiTheme(lightTheme);
    expect(vars['--dg-font-size']).toBe('14px');
  });

  test('sets light header bg for light mode', () => {
    const vars = bridgeMuiTheme(lightTheme);
    expect(vars['--dg-header-bg']).toBe('#f8fafc');
  });

  test('sets dark header bg for dark mode', () => {
    const darkTheme: MuiThemeShape = {
      ...lightTheme,
      palette: { ...lightTheme.palette, mode: 'dark' },
    };
    const vars = bridgeMuiTheme(darkTheme);
    expect(vars['--dg-header-bg']).toBe('#1e293b');
  });

  test('maps surface color from background.default', () => {
    const vars = bridgeMuiTheme(lightTheme);
    expect(vars['--dg-surface-color']).toBe('#f5f5f5');
  });

  test('maps text secondary', () => {
    const vars = bridgeMuiTheme(lightTheme);
    expect(vars['--dg-text-secondary']).toBe('#666666');
  });

  test('maps hover background', () => {
    const vars = bridgeMuiTheme(lightTheme);
    expect(vars['--dg-hover-bg']).toBe('rgba(0,0,0,0.04)');
  });

  test('maps selected background', () => {
    const vars = bridgeMuiTheme(lightTheme);
    expect(vars['--dg-selected-bg']).toBe('rgba(0,0,0,0.08)');
  });

  test('returns exactly 16 CSS variables', () => {
    // The bridge now forwards row-level tokens from the ingested iAsBuilt
    // palette so dark-mode grids pick up matching row and alt backgrounds
    // instead of falling back to the light defaults baked into the body
    // styles. The count grew from 14 to 16 when `--dg-row-bg` and
    // `--dg-row-bg-alt` were added.
    const vars = bridgeMuiTheme(lightTheme);
    expect(Object.keys(vars).length).toBe(16);
  });

  test('maps row background from ingested light tokens', () => {
    const vars = bridgeMuiTheme(lightTheme);
    expect(vars['--dg-row-bg']).toBe('#ffffff');
    expect(vars['--dg-row-bg-alt']).toBe('#f8fafc');
  });

  test('maps row background from ingested dark tokens in dark mode', () => {
    const darkTheme: MuiThemeShape = {
      ...lightTheme,
      palette: { ...lightTheme.palette, mode: 'dark' },
    };
    const vars = bridgeMuiTheme(darkTheme);
    expect(vars['--dg-row-bg']).toBe('#0f172a');
    expect(vars['--dg-row-bg-alt']).toBe('#1e293b');
  });

  test('defaults header bg to light when mode is undefined', () => {
    const noMode: MuiThemeShape = {
      ...lightTheme,
      palette: { ...lightTheme.palette, mode: undefined },
    };
    const vars = bridgeMuiTheme(noMode);
    expect(vars['--dg-header-bg']).toBe('#f8fafc');
  });
});
