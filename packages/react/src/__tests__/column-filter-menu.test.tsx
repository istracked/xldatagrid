/**
 * Unit tests for {@link DataGridColumnFilterMenu}.
 *
 * Covers the Excel 365 dropdown's visibility, fixed section ordering,
 * sort/clear/conditions callbacks, search filtering, the (Select All) and
 * (Blanks) rows, OK/Cancel commit semantics, outside-click and Escape
 * dismissal, and viewport positioning.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { DataGridColumnFilterMenu } from '../header/column-filter-menu';
import type { DataGridColumnFilterMenuProps } from '../header/column-filter-menu';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const anchor = { top: 40, left: 100, bottom: 60, right: 300 };

function makeProps(overrides: Partial<DataGridColumnFilterMenuProps> = {}): DataGridColumnFilterMenuProps {
  return {
    open: true,
    field: 'name',
    title: 'Name',
    dataType: 'text',
    anchor,
    distinctValues: ['Alice', 'Bob', 'Charlie'],
    selectedValues: undefined,
    hasActiveFilter: false,
    sortDir: null,
    onSortAsc: vi.fn(),
    onSortDesc: vi.fn(),
    onClearFilter: vi.fn(),
    onApplyValueFilter: vi.fn(),
    onOpenCustomFilter: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
}

function renderMenu(overrides: Partial<DataGridColumnFilterMenuProps> = {}) {
  const props = makeProps(overrides);
  const result = render(<DataGridColumnFilterMenu {...props} />);
  return { ...result, props };
}

// ---------------------------------------------------------------------------
// Visibility / render nothing when closed
// ---------------------------------------------------------------------------

// Visibility: the menu returns null while closed and portals to body when open.
describe('DataGridColumnFilterMenu visibility', () => {
  // Closed menu should not appear in the DOM at all.
  it('renders nothing when open is false', () => {
    renderMenu({ open: false });
    expect(screen.queryByTestId('column-filter-menu')).not.toBeInTheDocument();
  });

  // Open menu renders the outer container identified by `data-testid`.
  it('renders the menu when open is true', () => {
    renderMenu();
    expect(screen.getByTestId('column-filter-menu')).toBeInTheDocument();
  });

  // Menu is portaled so it can escape header overflow clipping.
  it('is portaled to document.body', () => {
    renderMenu();
    const menu = screen.getByTestId('column-filter-menu');
    expect(document.body.contains(menu)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Section ordering
// ---------------------------------------------------------------------------

// Section ordering: guards the Excel 365 convention — sort → clear → search
// → checklist → OK/Cancel. Other code paths rely on this order being stable.
describe('DataGridColumnFilterMenu section ordering', () => {
  // Sort-ascending precedes sort-descending within the sort block.
  it('renders sort-asc before sort-desc', () => {
    renderMenu();
    const asc = screen.getByTestId('column-filter-sort-asc');
    const desc = screen.getByTestId('column-filter-sort-desc');
    expect(
      asc.compareDocumentPosition(desc) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
  });

  // Entire sort block sits above the filter block.
  it('renders sort rows before clear-filter', () => {
    renderMenu();
    const asc = screen.getByTestId('column-filter-sort-asc');
    const clear = screen.getByTestId('column-filter-clear');
    expect(
      asc.compareDocumentPosition(clear) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
  });

  // Clear-filter (the last row of the filter block) sits above the search box.
  it('renders clear-filter before search input', () => {
    renderMenu();
    const clear = screen.getByTestId('column-filter-clear');
    const search = screen.getByTestId('column-filter-search');
    expect(
      clear.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
  });

  // Search box precedes the distinct-values checklist it filters.
  it('renders search input before value list', () => {
    renderMenu();
    const search = screen.getByTestId('column-filter-search');
    const values = screen.getByTestId('column-filter-values');
    expect(
      search.compareDocumentPosition(values) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
  });

  // Footer buttons come last.
  it('renders value list before OK/Cancel buttons', () => {
    renderMenu();
    const values = screen.getByTestId('column-filter-values');
    const ok = screen.getByTestId('column-filter-ok');
    expect(
      values.compareDocumentPosition(ok) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Sort callbacks
// ---------------------------------------------------------------------------

// Sort callbacks: picking a sort row fires its callback and closes the menu.
describe('DataGridColumnFilterMenu sort actions', () => {
  // Ascending path.
  it('sort-asc fires onSortAsc then onClose', () => {
    const onSortAsc = vi.fn();
    const onClose = vi.fn();
    renderMenu({ onSortAsc, onClose });
    fireEvent.click(screen.getByTestId('column-filter-sort-asc'));
    expect(onSortAsc).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  // Descending path.
  it('sort-desc fires onSortDesc then onClose', () => {
    const onSortDesc = vi.fn();
    const onClose = vi.fn();
    renderMenu({ onSortDesc, onClose });
    fireEvent.click(screen.getByTestId('column-filter-sort-desc'));
    expect(onSortDesc).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Sort labels by dataType
// ---------------------------------------------------------------------------

// Sort labels: Excel varies the sort wording by column data type.
describe('DataGridColumnFilterMenu sort labels', () => {
  // Text columns use A-to-Z wording.
  it('shows "Sort A to Z" / "Sort Z to A" for text dataType', () => {
    renderMenu({ dataType: 'text' });
    expect(screen.getByTestId('column-filter-sort-asc')).toHaveTextContent('Sort A to Z');
    expect(screen.getByTestId('column-filter-sort-desc')).toHaveTextContent('Sort Z to A');
  });

  // Numeric columns use smallest/largest wording.
  it('shows "Sort Smallest to Largest" / "Sort Largest to Smallest" for number dataType', () => {
    renderMenu({ dataType: 'number' });
    expect(screen.getByTestId('column-filter-sort-asc')).toHaveTextContent('Sort Smallest to Largest');
    expect(screen.getByTestId('column-filter-sort-desc')).toHaveTextContent('Sort Largest to Smallest');
  });

  // Date columns use oldest/newest wording.
  it('shows "Sort Oldest to Newest" / "Sort Newest to Oldest" for date dataType', () => {
    renderMenu({ dataType: 'date' });
    expect(screen.getByTestId('column-filter-sort-asc')).toHaveTextContent('Sort Oldest to Newest');
    expect(screen.getByTestId('column-filter-sort-desc')).toHaveTextContent('Sort Newest to Oldest');
  });
});

// ---------------------------------------------------------------------------
// Clear filter
// ---------------------------------------------------------------------------

// Clear filter: only live when this column has an active predicate, and
// clearing should remove only that field's predicate (caller responsibility).
describe('DataGridColumnFilterMenu clear filter', () => {
  // Inert when no filter is set.
  it('clear-filter is aria-disabled when hasActiveFilter is false', () => {
    renderMenu({ hasActiveFilter: false });
    const clearBtn = screen.getByTestId('column-filter-clear');
    expect(clearBtn).toHaveAttribute('aria-disabled', 'true');
  });

  // Interactive when a filter is active.
  it('clear-filter is NOT aria-disabled when hasActiveFilter is true', () => {
    renderMenu({ hasActiveFilter: true });
    const clearBtn = screen.getByTestId('column-filter-clear');
    expect(clearBtn).not.toHaveAttribute('aria-disabled');
  });

  // Click on the active clear row invokes both callbacks.
  it('clear-filter click fires onClearFilter + onClose when active', () => {
    const onClearFilter = vi.fn();
    const onClose = vi.fn();
    renderMenu({ hasActiveFilter: true, onClearFilter, onClose });
    fireEvent.click(screen.getByTestId('column-filter-clear'));
    expect(onClearFilter).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  // Disabled rows must swallow clicks.
  it('clear-filter click does NOT fire when disabled', () => {
    const onClearFilter = vi.fn();
    const onClose = vi.fn();
    renderMenu({ hasActiveFilter: false, onClearFilter, onClose });
    fireEvent.click(screen.getByTestId('column-filter-clear'));
    expect(onClearFilter).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  // Label interpolates the column title like Excel 365 does.
  it('shows title in clear-filter label', () => {
    renderMenu({ title: 'Age', hasActiveFilter: true });
    expect(screen.getByTestId('column-filter-clear')).toHaveTextContent('"Age"');
  });
});

// ---------------------------------------------------------------------------
// Conditions submenu label
// ---------------------------------------------------------------------------

// Conditions submenu label varies by data type, and clicking it launches
// the custom-condition dialog via the caller-supplied callback.
describe('DataGridColumnFilterMenu conditions label', () => {
  // Text wording.
  it('renders "Text Filters" for text dataType', () => {
    renderMenu({ dataType: 'text' });
    expect(screen.getByTestId('column-filter-conditions')).toHaveTextContent('Text Filters');
  });

  // Number wording.
  it('renders "Number Filters" for number dataType', () => {
    renderMenu({ dataType: 'number' });
    expect(screen.getByTestId('column-filter-conditions')).toHaveTextContent('Number Filters');
  });

  // Date wording.
  it('renders "Date Filters" for date dataType', () => {
    renderMenu({ dataType: 'date' });
    expect(screen.getByTestId('column-filter-conditions')).toHaveTextContent('Date Filters');
  });

  // Activating the submenu item launches the custom-condition dialog.
  it('conditions click fires onOpenCustomFilter + onClose', () => {
    const onOpenCustomFilter = vi.fn();
    const onClose = vi.fn();
    renderMenu({ onOpenCustomFilter, onClose });
    fireEvent.click(screen.getByTestId('column-filter-conditions'));
    expect(onOpenCustomFilter).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Search filtering of value checklist
// ---------------------------------------------------------------------------

// Search: case-insensitive substring filtering of the distinct-values
// checklist, plus an "Indexing…" placeholder until distinct values arrive.
describe('DataGridColumnFilterMenu search', () => {
  // Empty query leaves the full list visible.
  it('shows all values when query is empty', () => {
    renderMenu({ distinctValues: ['Alice', 'Bob', 'Charlie'] });
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  // Typing a letter narrows the list to values containing it.
  it('narrows checklist by case-insensitive substring match', () => {
    renderMenu({ distinctValues: ['Alice', 'Bob', 'Charlie'] });
    fireEvent.change(screen.getByTestId('column-filter-search'), { target: { value: 'a' } });
    // "Alice" contains 'a', "Charlie" contains 'a' (case-insensitive)
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  // Undefined distinctValues means the search index is still building.
  it('shows "Indexing…" placeholder when distinctValues is undefined', () => {
    renderMenu({ distinctValues: undefined });
    expect(screen.queryByTestId('column-filter-values')).not.toBeInTheDocument();
    expect(screen.getByText('Indexing…')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// "(Select All)" behaviour
// ---------------------------------------------------------------------------

// "(Select All)": tri-state checkbox that toggles all currently-visible
// rows. With a search query active it only affects matching rows.
describe('DataGridColumnFilterMenu Select All', () => {
  // Undefined selectedValues → all checked by convention.
  it('(Select All) is checked when selectedValues is undefined (all selected)', () => {
    renderMenu({ selectedValues: undefined });
    const selectAll = screen.getByTestId('column-filter-value-select-all').querySelector('input')!;
    expect(selectAll.checked).toBe(true);
  });

  // Empty selected set → unchecked.
  it('(Select All) is unchecked when selectedValues is an empty set', () => {
    renderMenu({ selectedValues: new Set<string>() });
    const selectAll = screen.getByTestId('column-filter-value-select-all').querySelector('input')!;
    expect(selectAll.checked).toBe(false);
  });

  // Turning Select All off clears every individual row.
  it('toggling (Select All) OFF unchecks all visible rows', () => {
    renderMenu({ distinctValues: ['Alice', 'Bob', 'Charlie'], selectedValues: undefined });
    const selectAllInput = screen.getByTestId('column-filter-value-select-all').querySelector('input')!;
    // Currently all checked — uncheck via Select All
    fireEvent.click(selectAllInput);
    // All individual checkboxes should now be unchecked
    const checkboxes = screen.getByTestId('column-filter-values').querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((cb) => expect((cb as HTMLInputElement).checked).toBe(false));
  });

  // Turning Select All on checks every individual row.
  it('toggling (Select All) ON checks all visible rows', () => {
    renderMenu({ distinctValues: ['Alice', 'Bob', 'Charlie'], selectedValues: new Set<string>() });
    const selectAllInput = screen.getByTestId('column-filter-value-select-all').querySelector('input')!;
    fireEvent.click(selectAllInput);
    const checkboxes = screen.getByTestId('column-filter-values').querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((cb) => expect((cb as HTMLInputElement).checked).toBe(true));
  });

  // Search scope: Select All must not touch hidden rows.
  it('(Select All) with search only toggles visible rows', () => {
    renderMenu({ distinctValues: ['Alice', 'Bob', 'Charlie'], selectedValues: undefined });
    // Search narrows to Alice + Charlie
    fireEvent.change(screen.getByTestId('column-filter-search'), { target: { value: 'a' } });
    const selectAllInput = screen.getByTestId('column-filter-value-select-all').querySelector('input')!;
    // Uncheck visible rows (Alice + Charlie)
    fireEvent.click(selectAllInput);
    // Alice and Charlie should be unchecked; Bob (hidden) state doesn't matter for visible rows
    expect(screen.getByText('Alice').closest('label')!.querySelector('input')!.checked).toBe(false);
    expect(screen.getByText('Charlie').closest('label')!.querySelector('input')!.checked).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Blanks row
// ---------------------------------------------------------------------------

// "(Blanks)": rendered only when the empty-string sentinel appears in
// the distinct-values list (produced upstream for null/undefined cells).
describe('DataGridColumnFilterMenu blanks row', () => {
  // Blanks row appears when empty string is present.
  it('shows (Blanks) row when empty string is in distinctValues', () => {
    renderMenu({ distinctValues: ['', 'Alice', 'Bob'] });
    expect(screen.getByTestId('column-filter-value-blanks')).toBeInTheDocument();
  });

  // Blanks row is absent when no blank values exist in this column.
  it('does NOT show (Blanks) row when empty string is not in distinctValues', () => {
    renderMenu({ distinctValues: ['Alice', 'Bob'] });
    expect(screen.queryByTestId('column-filter-value-blanks')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// OK / Cancel buttons
// ---------------------------------------------------------------------------

// OK/Cancel: OK commits the draft (or `undefined` when "all selected"),
// Cancel discards it. Both close the menu.
describe('DataGridColumnFilterMenu OK/Cancel', () => {
  // Cancel never emits a selection change.
  it('Cancel closes without firing onApplyValueFilter', () => {
    const onApplyValueFilter = vi.fn();
    const onClose = vi.fn();
    renderMenu({ onApplyValueFilter, onClose });
    fireEvent.click(screen.getByTestId('column-filter-cancel'));
    expect(onApplyValueFilter).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });

  // "All selected" collapses to undefined → caller clears the filter.
  it('OK with all values selected fires onApplyValueFilter(undefined)', () => {
    const onApplyValueFilter = vi.fn();
    const onClose = vi.fn();
    // selectedValues undefined = all selected
    renderMenu({ distinctValues: ['Alice', 'Bob'], selectedValues: undefined, onApplyValueFilter, onClose });
    fireEvent.click(screen.getByTestId('column-filter-ok'));
    expect(onApplyValueFilter).toHaveBeenCalledWith(undefined);
    expect(onClose).toHaveBeenCalledOnce();
  });

  // Partial selection emits the exact Set so the caller can build an
  // `in`-descriptor from it.
  it('OK with partial selection fires onApplyValueFilter with exact Set', () => {
    const onApplyValueFilter = vi.fn();
    const onClose = vi.fn();
    renderMenu({
      distinctValues: ['Alice', 'Bob', 'Charlie'],
      selectedValues: undefined,
      onApplyValueFilter,
      onClose,
    });
    // Uncheck Bob
    const bobLabel = screen.getByText('Bob').closest('label')!;
    fireEvent.click(bobLabel.querySelector('input')!);
    fireEvent.click(screen.getByTestId('column-filter-ok'));
    expect(onApplyValueFilter).toHaveBeenCalledWith(new Set(['Alice', 'Charlie']));
    expect(onClose).toHaveBeenCalledOnce();
  });

  // Starting from "nothing selected" and ticking a single row emits a
  // singleton Set.
  it('OK with initially-empty selection and one value checked fires correct Set', () => {
    const onApplyValueFilter = vi.fn();
    renderMenu({
      distinctValues: ['Alice', 'Bob', 'Charlie'],
      selectedValues: new Set<string>(),
      onApplyValueFilter,
      onClose: vi.fn(),
    });
    // Check Alice
    const aliceLabel = screen.getByText('Alice').closest('label')!;
    fireEvent.click(aliceLabel.querySelector('input')!);
    fireEvent.click(screen.getByTestId('column-filter-ok'));
    expect(onApplyValueFilter).toHaveBeenCalledWith(new Set(['Alice']));
  });
});

// ---------------------------------------------------------------------------
// Dismiss behaviours
// ---------------------------------------------------------------------------

// Dismiss: Escape and outside-mousedown both close; clicks inside the
// menu itself must not trigger the outside-click listener.
describe('DataGridColumnFilterMenu dismiss', () => {
  // Escape closes.
  it('closes on Escape key', () => {
    const onClose = vi.fn();
    renderMenu({ onClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  // Outside mousedown closes.
  it('closes on outside click (mousedown outside menu)', () => {
    const onClose = vi.fn();
    renderMenu({ onClose });
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledOnce();
  });

  // Clicks inside the menu must not dismiss it.
  it('does NOT close on click inside the menu', () => {
    const onClose = vi.fn();
    renderMenu({ onClose });
    const menu = screen.getByTestId('column-filter-menu');
    fireEvent.mouseDown(menu);
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Stub items are aria-disabled
// ---------------------------------------------------------------------------

// Stub rows: "Sort by Color" and "Filter by Color" are placeholders
// carrying `aria-disabled="true"` until those features ship.
describe('DataGridColumnFilterMenu stub items', () => {
  // Sort-by-color is inert.
  it('sort-by-color is aria-disabled', () => {
    renderMenu();
    expect(screen.getByTestId('column-filter-sort-by-color')).toHaveAttribute('aria-disabled', 'true');
  });

  // Filter-by-color is inert.
  it('filter-by-color is aria-disabled', () => {
    renderMenu();
    expect(screen.getByTestId('column-filter-by-color')).toHaveAttribute('aria-disabled', 'true');
  });
});

// ---------------------------------------------------------------------------
// Positioning
// ---------------------------------------------------------------------------

// Positioning: the menu sits just below-left of the anchor rect by
// default. jsdom returns zero-sized bounding rects so clamping has nothing
// to adjust in these tests.
describe('DataGridColumnFilterMenu positioning', () => {
  // Top = anchor.bottom + 4, left = anchor.left.
  it('positions menu below the anchor rect', () => {
    renderMenu({ anchor: { top: 40, left: 120, bottom: 70, right: 300 } });
    const menu = screen.getByTestId('column-filter-menu');
    // top = anchor.bottom + 4 = 74 (before clamping; jsdom getBoundingClientRect = 0,0)
    expect(menu.style.top).toBe('74px');
    expect(menu.style.left).toBe('120px');
  });

  // Portaled menu must use fixed positioning so scroll does not move it.
  it('has position:fixed', () => {
    renderMenu();
    expect(screen.getByTestId('column-filter-menu').style.position).toBe('fixed');
  });
});
