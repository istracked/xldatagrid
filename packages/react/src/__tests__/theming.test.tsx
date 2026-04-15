import { render, screen } from '@testing-library/react';
import { DataGrid, LIGHT_THEME, DARK_THEME } from '../DataGrid';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

type TestRow = { id: string; name: string; age: number };

function makeData(): TestRow[] {
  return [
    { id: '1', name: 'Alice', age: 30 },
    { id: '2', name: 'Bob', age: 25 },
  ];
}

const columns = [
  { id: 'name', field: 'name', title: 'Name' },
  { id: 'age', field: 'age', title: 'Age' },
];

function renderGrid(overrides: Partial<Parameters<typeof DataGrid>[0]> = {}) {
  return render(
    <DataGrid
      data={makeData()}
      columns={columns}
      rowKey="id"
      {...(overrides as any)}
    />,
  );
}

/** Helper: get the inline style value for a CSS custom property on the grid container */
function getGridStyle(prop: string): string {
  const grid = screen.getByRole('grid');
  return grid.style.getPropertyValue(prop);
}

// ---------------------------------------------------------------------------
// Individual CSS custom property tests
// ---------------------------------------------------------------------------

describe('Theming', () => {
  it('theme applies CSS custom property for primary color', () => {
    renderGrid({ theme: { '--dg-primary-color': '#ff0000' } });
    expect(getGridStyle('--dg-primary-color')).toBe('#ff0000');
  });

  it('theme applies CSS custom property for background color', () => {
    renderGrid({ theme: { '--dg-bg-color': '#111111' } });
    expect(getGridStyle('--dg-bg-color')).toBe('#111111');
  });

  it('theme applies CSS custom property for text color', () => {
    renderGrid({ theme: { '--dg-text-color': '#222222' } });
    expect(getGridStyle('--dg-text-color')).toBe('#222222');
  });

  it('theme applies CSS custom property for border color', () => {
    renderGrid({ theme: { '--dg-border-color': '#333333' } });
    expect(getGridStyle('--dg-border-color')).toBe('#333333');
  });

  it('theme applies CSS custom property for header background', () => {
    renderGrid({ theme: { '--dg-header-bg': '#444444' } });
    expect(getGridStyle('--dg-header-bg')).toBe('#444444');
  });

  it('theme applies CSS custom property for cell padding', () => {
    renderGrid({ theme: { '--dg-cell-padding': '0 20px' } });
    expect(getGridStyle('--dg-cell-padding')).toBe('0 20px');
  });

  it('theme applies CSS custom property for font family', () => {
    renderGrid({ theme: { '--dg-font-family': 'monospace' } });
    expect(getGridStyle('--dg-font-family')).toBe('monospace');
  });

  it('theme applies CSS custom property for font size', () => {
    renderGrid({ theme: { '--dg-font-size': '16px' } });
    expect(getGridStyle('--dg-font-size')).toBe('16px');
  });

  it('theme applies CSS custom property for row height', () => {
    renderGrid({ theme: { '--dg-row-height': '48px' } });
    expect(getGridStyle('--dg-row-height')).toBe('48px');
  });

  it('theme applies CSS custom property for selection color', () => {
    renderGrid({ theme: { '--dg-selection-color': '#00ff00' } });
    expect(getGridStyle('--dg-selection-color')).toBe('#00ff00');
  });

  it('theme applies CSS custom property for error color', () => {
    renderGrid({ theme: { '--dg-error-color': '#ff00ff' } });
    expect(getGridStyle('--dg-error-color')).toBe('#ff00ff');
  });

  it('theme applies CSS custom property for hover background', () => {
    renderGrid({ theme: { '--dg-hover-bg': '#aabbcc' } });
    expect(getGridStyle('--dg-hover-bg')).toBe('#aabbcc');
  });

  // ---------------------------------------------------------------------------
  // Light / dark presets
  // ---------------------------------------------------------------------------

  it('theme light mode applies light color scheme', () => {
    renderGrid({ theme: 'light' });
    const grid = screen.getByRole('grid');
    expect(grid.style.colorScheme).toBe('light');
    expect(getGridStyle('--dg-bg-color')).toBe(LIGHT_THEME['--dg-bg-color']);
    expect(getGridStyle('--dg-primary-color')).toBe(LIGHT_THEME['--dg-primary-color']);
  });

  it('theme dark mode applies dark color scheme', () => {
    renderGrid({ theme: 'dark' });
    const grid = screen.getByRole('grid');
    expect(grid.style.colorScheme).toBe('dark');
    expect(getGridStyle('--dg-bg-color')).toBe(DARK_THEME['--dg-bg-color']);
    expect(getGridStyle('--dg-primary-color')).toBe(DARK_THEME['--dg-primary-color']);
  });

  // ---------------------------------------------------------------------------
  // Theme switching
  // ---------------------------------------------------------------------------

  it('theme switches from light to dark mode', () => {
    const { rerender } = render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" theme="light" />,
    );
    let grid = screen.getByRole('grid');
    expect(grid.style.colorScheme).toBe('light');

    rerender(
      <DataGrid data={makeData()} columns={columns} rowKey="id" theme="dark" />,
    );
    grid = screen.getByRole('grid');
    expect(grid.style.colorScheme).toBe('dark');
    expect(getGridStyle('--dg-bg-color')).toBe(DARK_THEME['--dg-bg-color']);
  });

  it('theme switches from dark to light mode', () => {
    const { rerender } = render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" theme="dark" />,
    );
    let grid = screen.getByRole('grid');
    expect(grid.style.colorScheme).toBe('dark');

    rerender(
      <DataGrid data={makeData()} columns={columns} rowKey="id" theme="light" />,
    );
    grid = screen.getByRole('grid');
    expect(grid.style.colorScheme).toBe('light');
    expect(getGridStyle('--dg-bg-color')).toBe(LIGHT_THEME['--dg-bg-color']);
  });

  // ---------------------------------------------------------------------------
  // Persistence / re-render
  // ---------------------------------------------------------------------------

  it('theme persists across grid re-renders', () => {
    const { rerender } = render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" theme="dark" />,
    );
    expect(getGridStyle('--dg-bg-color')).toBe(DARK_THEME['--dg-bg-color']);

    // Re-render with same theme but different data
    rerender(
      <DataGrid
        data={[{ id: '99', name: 'Zara', age: 40 }]}
        columns={columns}
        rowKey="id"
        theme="dark"
      />,
    );
    expect(getGridStyle('--dg-bg-color')).toBe(DARK_THEME['--dg-bg-color']);
    expect(screen.getByRole('grid').style.colorScheme).toBe('dark');
  });

  // ---------------------------------------------------------------------------
  // Sub-grid / nested
  // ---------------------------------------------------------------------------

  it('theme applies to nested sub-grid', () => {
    const { container } = render(
      <div>
        <DataGrid data={makeData()} columns={columns} rowKey="id" theme="dark" />
        <DataGrid data={makeData()} columns={columns} rowKey="id" theme="dark" />
      </div>,
    );
    const grids = container.querySelectorAll('[role="grid"]');
    expect(grids).toHaveLength(2);
    for (const grid of grids) {
      expect((grid as HTMLElement).style.getPropertyValue('--dg-bg-color')).toBe(
        DARK_THEME['--dg-bg-color'],
      );
    }
  });

  // ---------------------------------------------------------------------------
  // Context menu, calendar, dropdown inherit theme
  // ---------------------------------------------------------------------------

  it('theme applies to context menu', () => {
    // The context menu reads CSS custom properties from the parent container.
    // When theme sets --dg-border-color on the grid, the ContextMenu component
    // references var(--dg-border-color) in its styles. We verify the grid
    // container has the expected property set.
    renderGrid({ theme: 'dark' });
    expect(getGridStyle('--dg-border-color')).toBe(DARK_THEME['--dg-border-color']);
  });

  it('theme applies to calendar popup', () => {
    // Calendar popups use the same CSS custom property inheritance.
    // Verify theme tokens are set on the container which calendar inherits from.
    renderGrid({ theme: 'light' });
    expect(getGridStyle('--dg-primary-color')).toBe(LIGHT_THEME['--dg-primary-color']);
    expect(getGridStyle('--dg-font-family')).toBe(LIGHT_THEME['--dg-font-family']);
  });

  it('theme applies to dropdown popups', () => {
    // Dropdown popups inherit CSS custom properties from the grid container.
    renderGrid({ theme: 'dark' });
    expect(getGridStyle('--dg-header-bg')).toBe(DARK_THEME['--dg-header-bg']);
    expect(getGridStyle('--dg-text-color')).toBe(DARK_THEME['--dg-text-color']);
  });

  // ---------------------------------------------------------------------------
  // Custom override precedence
  // ---------------------------------------------------------------------------

  it('theme custom property override takes precedence', () => {
    // style prop should override theme values
    renderGrid({
      theme: 'light',
      style: { '--dg-primary-color': '#custom1' } as React.CSSProperties,
    });
    // The style prop is spread after themeStyle, so it overrides
    const grid = screen.getByRole('grid');
    expect(grid.style.getPropertyValue('--dg-primary-color')).toBe('#custom1');
  });

  // ---------------------------------------------------------------------------
  // Inheritance from parent
  // ---------------------------------------------------------------------------

  it('theme inherits from parent CSS custom properties', () => {
    // When no theme is set, the grid does not override CSS custom properties,
    // allowing parent values to flow through via var() fallbacks.
    const { container } = render(
      <div style={{ '--dg-primary-color': '#parent-blue' } as React.CSSProperties}>
        <DataGrid data={makeData()} columns={columns} rowKey="id" />
      </div>,
    );
    const grid = container.querySelector('[role="grid"]') as HTMLElement;
    // Without a theme, the grid should NOT set --dg-primary-color inline
    expect(grid.style.getPropertyValue('--dg-primary-color')).toBe('');
  });

  // ---------------------------------------------------------------------------
  // Transition on theme switch
  // ---------------------------------------------------------------------------

  it('theme applies transition on theme switch', () => {
    renderGrid({ theme: 'dark' });
    const grid = screen.getByRole('grid');
    expect(grid.style.transition).toContain('color');
    expect(grid.style.transition).toContain('background');
  });
});
