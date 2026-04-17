/**
 * Regression tests for the context-menu positioning bug.
 *
 * Bug: the menu was rendered inline inside the grid container. Any ancestor
 * with `transform`/`filter`/`perspective` (virtualized grids set these
 * constantly) becomes the containing block for a `position: fixed` element,
 * so the menu that "should" sit at the cursor landed at the far left of the
 * window. Additionally, `useState({x, y})` captured only the initial mount
 * coords (the default 0/0), so the first render of every open showed the
 * menu in the wrong place until `useEffect` repositioned it.
 *
 * Fix: render through a `document.body` portal and run the clamp in a layout
 * effect that always re-seeds from the current trigger coordinates.
 *
 * These tests verify the DOM-level behaviour (portaling + coordinate
 * seeding) — jsdom does not emulate CSS transforms so the visual bug itself
 * can't be reproduced, but the structural fixes can be.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { DataGrid } from '../DataGrid';

type TestRow = { id: string; name: string; age: number };

function makeData(): TestRow[] {
  return [
    { id: '1', name: 'Alice', age: 30 },
    { id: '2', name: 'Bob', age: 25 },
    { id: '3', name: 'Charlie', age: 35 },
  ];
}

const columns = [
  { id: 'name', field: 'name', title: 'Name' },
  { id: 'age', field: 'age', title: 'Age', sortable: true },
];

function renderGrid() {
  return render(
    <DataGrid
      data={makeData()}
      columns={columns}
      rowKey="id"
      contextMenu={true}
    />,
  );
}

describe('ContextMenu positioning', () => {
  it('renders the context menu as a child of document.body (portaled)', () => {
    renderGrid();
    fireEvent.contextMenu(screen.getAllByRole('gridcell')[0]!, {
      clientX: 500,
      clientY: 400,
    });
    const menu = screen.getByTestId('context-menu');
    expect(menu.parentElement).toBe(document.body);
  });

  it('seeds position from the triggering event coordinates on first open', () => {
    renderGrid();
    fireEvent.contextMenu(screen.getAllByRole('gridcell')[0]!, {
      clientX: 500,
      clientY: 400,
    });
    const menu = screen.getByTestId('context-menu');
    // jsdom reports 0 widths for getBoundingClientRect, so clamping is a
    // no-op: the position set should match the trigger coordinates.
    expect(menu.style.left).toBe('500px');
    expect(menu.style.top).toBe('400px');

    // Close then reopen at different coordinates; the position must update
    // immediately without flashing at (0, 0).
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.contextMenu(screen.getAllByRole('gridcell')[1]!, {
      clientX: 100,
      clientY: 150,
    });
    const menu2 = screen.getByTestId('context-menu');
    expect(menu2.style.left).toBe('100px');
    expect(menu2.style.top).toBe('150px');
  });

  it('moves to new coordinates when re-opened', () => {
    renderGrid();
    const cells = screen.getAllByRole('gridcell');

    fireEvent.contextMenu(cells[0]!, { clientX: 300, clientY: 300 });
    expect(screen.getByTestId('context-menu').style.left).toBe('300px');
    expect(screen.getByTestId('context-menu').style.top).toBe('300px');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('context-menu')).not.toBeInTheDocument();

    fireEvent.contextMenu(cells[1]!, { clientX: 600, clientY: 600 });
    const menu = screen.getByTestId('context-menu');
    expect(menu.style.left).toBe('600px');
    expect(menu.style.top).toBe('600px');
  });

  it('is detached from the grid container when portaled', () => {
    const { container } = renderGrid();
    fireEvent.contextMenu(screen.getAllByRole('gridcell')[0]!, {
      clientX: 250,
      clientY: 250,
    });
    // The menu must NOT live inside the grid's render tree...
    expect(container.querySelector('[data-testid="context-menu"]')).toBeNull();
    // ...but IT MUST exist somewhere in document.body.
    expect(
      document.body.querySelector('[data-testid="context-menu"]'),
    ).not.toBeNull();
  });

  it('escapes a CSS-transformed ancestor via the document.body portal', () => {
    // Reproduces the precise scenario the fix addresses: an ancestor with a
    // CSS `transform` becomes the containing block for `position: fixed`
    // descendants, hijacking the menu's coordinate origin. The portal must
    // re-parent the menu directly under document.body so this can't happen.
    const { container } = render(
      <div data-testid="transformed-ancestor" style={{ transform: 'translateX(1px)' }}>
        <DataGrid
          data={makeData()}
          columns={columns}
          rowKey="id"
          contextMenu={true}
        />
      </div>,
    );

    fireEvent.contextMenu(screen.getAllByRole('gridcell')[0]!, {
      clientX: 500,
      clientY: 400,
    });

    const menu = screen.getByTestId('context-menu');
    const transformedDiv = screen.getByTestId('transformed-ancestor');

    // The menu must live under document.body, NOT inside the transformed
    // subtree — otherwise `position: fixed` would be re-rooted to the
    // transformed ancestor's origin (the original bug).
    expect(document.body.contains(menu)).toBe(true);
    expect(transformedDiv.contains(menu)).toBe(false);
    // And it must not be a descendant of the rendered grid container either.
    expect(container.querySelector('[data-testid="context-menu"]')).toBeNull();
  });
});
