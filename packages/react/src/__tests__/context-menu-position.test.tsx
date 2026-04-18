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
 * This suite exists specifically to guard that transformed-ancestor portal
 * fix. Each test pins one structural invariant of the fix: that the menu
 * leaves the grid's subtree for `document.body`, that its position tracks
 * the trigger coordinates on every open (not just the first mount), and
 * that a real transformed ancestor cannot capture it as a containing block.
 * Regressions that revert the portal or collapse the layout-effect re-seed
 * are meant to fail here before they reach production.
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

// Groups every structural invariant that protects the portal-based fix.
// If any assertion in this describe fails, the context-menu positioning bug
// has been reintroduced at the DOM-structure level.
describe('ContextMenu positioning', () => {
  // Invariant: the rendered menu element is a direct child of
  // `document.body`, not a descendant of the grid. This is what makes
  // `position: fixed` resolve against the viewport regardless of ancestor
  // CSS transforms.
  it('renders the context menu as a child of document.body (portaled)', () => {
    renderGrid();
    fireEvent.contextMenu(screen.getAllByRole('gridcell')[0]!, {
      clientX: 500,
      clientY: 400,
    });
    const menu = screen.getByTestId('context-menu');
    expect(menu.parentElement).toBe(document.body);
  });

  // Invariant: the menu's `left`/`top` reflect the event coordinates on the
  // very first committed frame after opening, and again after closing and
  // reopening at different coordinates. Exercises the layout-effect
  // re-seed that fixes the stale-`(0, 0)` flash.
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

  // Invariant: successive opens from different cursor positions each move
  // the menu to the new coordinates. Catches regressions where a component
  // caches coordinates at mount time instead of re-reading them from state.
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

  // Invariant: when the grid is rendered via `render()`, the returned
  // `container` (the grid's render tree) contains no menu node, while
  // `document.body` does. This separates "the grid component rendered
  // something" from "the menu escaped the grid's subtree".
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

  // Invariant: this is the literal scenario of the original bug. The grid
  // sits inside a `transform`ed wrapper; the menu must still be re-parented
  // to `document.body` and must not end up inside the transformed subtree
  // (which would otherwise become the containing block for `position:
  // fixed` and break coordinate resolution).
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
