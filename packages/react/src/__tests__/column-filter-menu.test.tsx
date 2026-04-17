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

describe('DataGridColumnFilterMenu visibility', () => {
  it('renders nothing when open is false', () => {
    renderMenu({ open: false });
    expect(screen.queryByTestId('column-filter-menu')).not.toBeInTheDocument();
  });

  it('renders the menu when open is true', () => {
    renderMenu();
    expect(screen.getByTestId('column-filter-menu')).toBeInTheDocument();
  });

  it('is portaled to document.body', () => {
    renderMenu();
    const menu = screen.getByTestId('column-filter-menu');
    expect(document.body.contains(menu)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Section ordering
// ---------------------------------------------------------------------------

describe('DataGridColumnFilterMenu section ordering', () => {
  it('renders sort-asc before sort-desc', () => {
    renderMenu();
    const asc = screen.getByTestId('column-filter-sort-asc');
    const desc = screen.getByTestId('column-filter-sort-desc');
    expect(
      asc.compareDocumentPosition(desc) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('renders sort rows before clear-filter', () => {
    renderMenu();
    const asc = screen.getByTestId('column-filter-sort-asc');
    const clear = screen.getByTestId('column-filter-clear');
    expect(
      asc.compareDocumentPosition(clear) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('renders clear-filter before search input', () => {
    renderMenu();
    const clear = screen.getByTestId('column-filter-clear');
    const search = screen.getByTestId('column-filter-search');
    expect(
      clear.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('renders search input before value list', () => {
    renderMenu();
    const search = screen.getByTestId('column-filter-search');
    const values = screen.getByTestId('column-filter-values');
    expect(
      search.compareDocumentPosition(values) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('renders value list before OK/Cancel buttons', () => {
    renderMenu();
    const values = screen.getByTestId('column-filter-values');
    const ok = screen.getByTestId('column-filter-ok');
    expect(
      values.compareDocumentPosition(ok) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Sort callbacks
// ---------------------------------------------------------------------------

describe('DataGridColumnFilterMenu sort actions', () => {
  it('sort-asc fires onSortAsc then onClose', () => {
    const onSortAsc = vi.fn();
    const onClose = vi.fn();
    renderMenu({ onSortAsc, onClose });
    fireEvent.click(screen.getByTestId('column-filter-sort-asc'));
    expect(onSortAsc).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

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

describe('DataGridColumnFilterMenu sort labels', () => {
  it('shows "Sort A to Z" / "Sort Z to A" for text dataType', () => {
    renderMenu({ dataType: 'text' });
    expect(screen.getByTestId('column-filter-sort-asc')).toHaveTextContent('Sort A to Z');
    expect(screen.getByTestId('column-filter-sort-desc')).toHaveTextContent('Sort Z to A');
  });

  it('shows "Sort Smallest to Largest" / "Sort Largest to Smallest" for number dataType', () => {
    renderMenu({ dataType: 'number' });
    expect(screen.getByTestId('column-filter-sort-asc')).toHaveTextContent('Sort Smallest to Largest');
    expect(screen.getByTestId('column-filter-sort-desc')).toHaveTextContent('Sort Largest to Smallest');
  });

  it('shows "Sort Oldest to Newest" / "Sort Newest to Oldest" for date dataType', () => {
    renderMenu({ dataType: 'date' });
    expect(screen.getByTestId('column-filter-sort-asc')).toHaveTextContent('Sort Oldest to Newest');
    expect(screen.getByTestId('column-filter-sort-desc')).toHaveTextContent('Sort Newest to Oldest');
  });
});

// ---------------------------------------------------------------------------
// Clear filter
// ---------------------------------------------------------------------------

describe('DataGridColumnFilterMenu clear filter', () => {
  it('clear-filter is aria-disabled when hasActiveFilter is false', () => {
    renderMenu({ hasActiveFilter: false });
    const clearBtn = screen.getByTestId('column-filter-clear');
    expect(clearBtn).toHaveAttribute('aria-disabled', 'true');
  });

  it('clear-filter is NOT aria-disabled when hasActiveFilter is true', () => {
    renderMenu({ hasActiveFilter: true });
    const clearBtn = screen.getByTestId('column-filter-clear');
    expect(clearBtn).not.toHaveAttribute('aria-disabled');
  });

  it('clear-filter click fires onClearFilter + onClose when active', () => {
    const onClearFilter = vi.fn();
    const onClose = vi.fn();
    renderMenu({ hasActiveFilter: true, onClearFilter, onClose });
    fireEvent.click(screen.getByTestId('column-filter-clear'));
    expect(onClearFilter).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('clear-filter click does NOT fire when disabled', () => {
    const onClearFilter = vi.fn();
    const onClose = vi.fn();
    renderMenu({ hasActiveFilter: false, onClearFilter, onClose });
    fireEvent.click(screen.getByTestId('column-filter-clear'));
    expect(onClearFilter).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows title in clear-filter label', () => {
    renderMenu({ title: 'Age', hasActiveFilter: true });
    expect(screen.getByTestId('column-filter-clear')).toHaveTextContent('"Age"');
  });
});

// ---------------------------------------------------------------------------
// Conditions submenu label
// ---------------------------------------------------------------------------

describe('DataGridColumnFilterMenu conditions label', () => {
  it('renders "Text Filters" for text dataType', () => {
    renderMenu({ dataType: 'text' });
    expect(screen.getByTestId('column-filter-conditions')).toHaveTextContent('Text Filters');
  });

  it('renders "Number Filters" for number dataType', () => {
    renderMenu({ dataType: 'number' });
    expect(screen.getByTestId('column-filter-conditions')).toHaveTextContent('Number Filters');
  });

  it('renders "Date Filters" for date dataType', () => {
    renderMenu({ dataType: 'date' });
    expect(screen.getByTestId('column-filter-conditions')).toHaveTextContent('Date Filters');
  });

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

describe('DataGridColumnFilterMenu search', () => {
  it('shows all values when query is empty', () => {
    renderMenu({ distinctValues: ['Alice', 'Bob', 'Charlie'] });
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('narrows checklist by case-insensitive substring match', () => {
    renderMenu({ distinctValues: ['Alice', 'Bob', 'Charlie'] });
    fireEvent.change(screen.getByTestId('column-filter-search'), { target: { value: 'a' } });
    // "Alice" contains 'a', "Charlie" contains 'a' (case-insensitive)
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('shows "Indexing…" placeholder when distinctValues is undefined', () => {
    renderMenu({ distinctValues: undefined });
    expect(screen.queryByTestId('column-filter-values')).not.toBeInTheDocument();
    expect(screen.getByText('Indexing…')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// "(Select All)" behaviour
// ---------------------------------------------------------------------------

describe('DataGridColumnFilterMenu Select All', () => {
  it('(Select All) is checked when selectedValues is undefined (all selected)', () => {
    renderMenu({ selectedValues: undefined });
    const selectAll = screen.getByTestId('column-filter-value-select-all').querySelector('input')!;
    expect(selectAll.checked).toBe(true);
  });

  it('(Select All) is unchecked when selectedValues is an empty set', () => {
    renderMenu({ selectedValues: new Set<string>() });
    const selectAll = screen.getByTestId('column-filter-value-select-all').querySelector('input')!;
    expect(selectAll.checked).toBe(false);
  });

  it('toggling (Select All) OFF unchecks all visible rows', () => {
    renderMenu({ distinctValues: ['Alice', 'Bob', 'Charlie'], selectedValues: undefined });
    const selectAllInput = screen.getByTestId('column-filter-value-select-all').querySelector('input')!;
    // Currently all checked — uncheck via Select All
    fireEvent.click(selectAllInput);
    // All individual checkboxes should now be unchecked
    const checkboxes = screen.getByTestId('column-filter-values').querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((cb) => expect((cb as HTMLInputElement).checked).toBe(false));
  });

  it('toggling (Select All) ON checks all visible rows', () => {
    renderMenu({ distinctValues: ['Alice', 'Bob', 'Charlie'], selectedValues: new Set<string>() });
    const selectAllInput = screen.getByTestId('column-filter-value-select-all').querySelector('input')!;
    fireEvent.click(selectAllInput);
    const checkboxes = screen.getByTestId('column-filter-values').querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((cb) => expect((cb as HTMLInputElement).checked).toBe(true));
  });

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

describe('DataGridColumnFilterMenu blanks row', () => {
  it('shows (Blanks) row when empty string is in distinctValues', () => {
    renderMenu({ distinctValues: ['', 'Alice', 'Bob'] });
    expect(screen.getByTestId('column-filter-value-blanks')).toBeInTheDocument();
  });

  it('does NOT show (Blanks) row when empty string is not in distinctValues', () => {
    renderMenu({ distinctValues: ['Alice', 'Bob'] });
    expect(screen.queryByTestId('column-filter-value-blanks')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// OK / Cancel buttons
// ---------------------------------------------------------------------------

describe('DataGridColumnFilterMenu OK/Cancel', () => {
  it('Cancel closes without firing onApplyValueFilter', () => {
    const onApplyValueFilter = vi.fn();
    const onClose = vi.fn();
    renderMenu({ onApplyValueFilter, onClose });
    fireEvent.click(screen.getByTestId('column-filter-cancel'));
    expect(onApplyValueFilter).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('OK with all values selected fires onApplyValueFilter(undefined)', () => {
    const onApplyValueFilter = vi.fn();
    const onClose = vi.fn();
    // selectedValues undefined = all selected
    renderMenu({ distinctValues: ['Alice', 'Bob'], selectedValues: undefined, onApplyValueFilter, onClose });
    fireEvent.click(screen.getByTestId('column-filter-ok'));
    expect(onApplyValueFilter).toHaveBeenCalledWith(undefined);
    expect(onClose).toHaveBeenCalledOnce();
  });

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

describe('DataGridColumnFilterMenu dismiss', () => {
  it('closes on Escape key', () => {
    const onClose = vi.fn();
    renderMenu({ onClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes on outside click (mousedown outside menu)', () => {
    const onClose = vi.fn();
    renderMenu({ onClose });
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledOnce();
  });

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

describe('DataGridColumnFilterMenu stub items', () => {
  it('sort-by-color is aria-disabled', () => {
    renderMenu();
    expect(screen.getByTestId('column-filter-sort-by-color')).toHaveAttribute('aria-disabled', 'true');
  });

  it('filter-by-color is aria-disabled', () => {
    renderMenu();
    expect(screen.getByTestId('column-filter-by-color')).toHaveAttribute('aria-disabled', 'true');
  });
});

// ---------------------------------------------------------------------------
// Positioning
// ---------------------------------------------------------------------------

describe('DataGridColumnFilterMenu positioning', () => {
  it('positions menu below the anchor rect', () => {
    renderMenu({ anchor: { top: 40, left: 120, bottom: 70, right: 300 } });
    const menu = screen.getByTestId('column-filter-menu');
    // top = anchor.bottom + 4 = 74 (before clamping; jsdom getBoundingClientRect = 0,0)
    expect(menu.style.top).toBe('74px');
    expect(menu.style.left).toBe('120px');
  });

  it('has position:fixed', () => {
    renderMenu();
    expect(screen.getByTestId('column-filter-menu').style.position).toBe('fixed');
  });
});
