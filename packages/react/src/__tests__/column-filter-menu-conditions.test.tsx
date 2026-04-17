import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { FilterConditionDialog } from '../header/column-filter-menu/FilterConditionDialog';
import type { CompositeFilterDescriptor } from '@istracked/datagrid-core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface RenderProps {
  open?: boolean;
  field?: string;
  title?: string;
  dataType?: 'text' | 'number' | 'date';
  initial?: CompositeFilterDescriptor;
  onApply?: ReturnType<typeof vi.fn>;
  onClose?: ReturnType<typeof vi.fn>;
}

function renderDialog({
  open = true,
  field = 'name',
  title = 'Name',
  dataType = 'text',
  initial,
  onApply = vi.fn(),
  onClose = vi.fn(),
}: RenderProps = {}) {
  const result = render(
    <FilterConditionDialog
      open={open}
      field={field}
      title={title}
      dataType={dataType}
      initial={initial}
      onApply={onApply}
      onClose={onClose}
    />,
  );
  return { ...result, onApply, onClose };
}

function op1() {
  return screen.getByTestId('filter-cond-op-1') as HTMLSelectElement;
}
function val1() {
  return screen.getByTestId('filter-cond-val-1') as HTMLInputElement;
}
function op2() {
  return screen.getByTestId('filter-cond-op-2') as HTMLSelectElement;
}
function val2() {
  return screen.getByTestId('filter-cond-val-2') as HTMLInputElement;
}
function okBtn() {
  return screen.getByTestId('filter-cond-ok');
}
function cancelBtn() {
  return screen.getByTestId('filter-cond-cancel');
}

// ---------------------------------------------------------------------------
// Visibility & initial state
// ---------------------------------------------------------------------------

describe('FilterConditionDialog — visibility', () => {
  it('returns null when open=false', () => {
    renderDialog({ open: false });
    expect(screen.queryByTestId('filter-cond-dialog')).toBeNull();
  });

  it('renders the dialog when open=true', () => {
    renderDialog();
    expect(screen.getByTestId('filter-cond-dialog')).toBeTruthy();
  });

  it('shows only row 1 initially; row 2 and And/Or hidden until row 1 is filled', () => {
    renderDialog();
    expect(screen.getByTestId('filter-cond-op-1')).toBeTruthy();
    expect(screen.queryByTestId('filter-cond-and')).toBeNull();
    expect(screen.queryByTestId('filter-cond-op-2')).toBeNull();
  });

  it('reveals And/Or radios and row 2 after filling row 1', () => {
    renderDialog();
    fireEvent.change(op1(), { target: { value: 'eq' } });
    expect(screen.getByTestId('filter-cond-and')).toBeTruthy();
    expect(screen.getByTestId('filter-cond-op-2')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Portal to document.body
// ---------------------------------------------------------------------------

describe('FilterConditionDialog — portal', () => {
  it('is portaled to document.body', () => {
    renderDialog();
    const dialog = screen.getByTestId('filter-cond-dialog');
    expect(dialog.closest('body')).toBe(document.body);
    // The dialog's direct parent should be document.body (portal root)
    expect(dialog.parentElement).toBe(document.body);
  });
});

// ---------------------------------------------------------------------------
// Text dataType operators
// ---------------------------------------------------------------------------

describe('FilterConditionDialog — text operators', () => {
  it('contains "equals", "contains", "begins with" options', () => {
    renderDialog({ dataType: 'text' });
    const select = op1();
    const optionTexts = Array.from(select.options).map((o) => o.text);
    expect(optionTexts).toContain('equals');
    expect(optionTexts).toContain('contains');
    expect(optionTexts).toContain('begins with');
  });

  it('contains "ends with", "does not equal", "is empty", "is not empty"', () => {
    renderDialog({ dataType: 'text' });
    const optionTexts = Array.from(op1().options).map((o) => o.text);
    expect(optionTexts).toContain('ends with');
    expect(optionTexts).toContain('does not equal');
    expect(optionTexts).toContain('is empty');
    expect(optionTexts).toContain('is not empty');
  });
});

// ---------------------------------------------------------------------------
// Number dataType operators
// ---------------------------------------------------------------------------

describe('FilterConditionDialog — number operators', () => {
  it('contains "is greater than" and "is between"', () => {
    renderDialog({ dataType: 'number' });
    const optionTexts = Array.from(op1().options).map((o) => o.text);
    expect(optionTexts).toContain('is greater than');
    expect(optionTexts).toContain('is between');
  });

  it('"is between" reveals a second value input with "and" separator', () => {
    renderDialog({ dataType: 'number' });
    fireEvent.change(op1(), { target: { value: 'between' } });
    expect(screen.getByTestId('filter-cond-val-1')).toBeTruthy();
    expect(screen.getByTestId('filter-cond-val-1-b')).toBeTruthy();
    expect(screen.getByText('and')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Date dataType operators
// ---------------------------------------------------------------------------

describe('FilterConditionDialog — date operators', () => {
  it('uses "is after", "is before", "is between" labels', () => {
    renderDialog({ dataType: 'date' });
    const optionTexts = Array.from(op1().options).map((o) => o.text);
    expect(optionTexts).toContain('is after');
    expect(optionTexts).toContain('is before');
    expect(optionTexts).toContain('is between');
  });

  it('value input is type="date"', () => {
    renderDialog({ dataType: 'date' });
    fireEvent.change(op1(), { target: { value: 'eq' } });
    expect(val1().type).toBe('date');
  });
});

// ---------------------------------------------------------------------------
// isNull / isNotNull — hides value input
// ---------------------------------------------------------------------------

describe('FilterConditionDialog — is empty / is not empty', () => {
  it('"is empty" hides the value input', () => {
    renderDialog({ dataType: 'text' });
    fireEvent.change(op1(), { target: { value: 'isNull' } });
    expect(screen.queryByTestId('filter-cond-val-1')).toBeNull();
  });

  it('"is empty" OK fires onApply with isNull descriptor', () => {
    const { onApply } = renderDialog({ dataType: 'text', field: 'name' });
    fireEvent.change(op1(), { target: { value: 'isNull' } });
    fireEvent.click(okBtn());
    expect(onApply).toHaveBeenCalledWith({
      logic: 'and',
      filters: [{ field: 'name', operator: 'isNull', value: null }],
    });
  });
});

// ---------------------------------------------------------------------------
// Two-clause AND
// ---------------------------------------------------------------------------

describe('FilterConditionDialog — two-clause AND', () => {
  it('builds correct composite filter with And logic', () => {
    const { onApply } = renderDialog({ dataType: 'text', field: 'name' });

    // Row 1: contains "foo"
    fireEvent.change(op1(), { target: { value: 'contains' } });
    fireEvent.change(val1(), { target: { value: 'foo' } });

    // Row 2: equals "bar"
    fireEvent.change(op2(), { target: { value: 'eq' } });
    fireEvent.change(val2(), { target: { value: 'bar' } });

    // Ensure "And" is selected (it's the default)
    expect((screen.getByTestId('filter-cond-and') as HTMLInputElement).checked).toBe(true);

    fireEvent.click(okBtn());

    expect(onApply).toHaveBeenCalledWith({
      logic: 'and',
      filters: [
        { field: 'name', operator: 'contains', value: 'foo' },
        { field: 'name', operator: 'eq', value: 'bar' },
      ],
    });
  });
});

// ---------------------------------------------------------------------------
// Two-clause OR
// ---------------------------------------------------------------------------

describe('FilterConditionDialog — two-clause OR', () => {
  it('builds correct composite filter with Or logic', () => {
    const { onApply } = renderDialog({ dataType: 'text', field: 'name' });

    fireEvent.change(op1(), { target: { value: 'contains' } });
    fireEvent.change(val1(), { target: { value: 'foo' } });

    fireEvent.change(op2(), { target: { value: 'eq' } });
    fireEvent.change(val2(), { target: { value: 'bar' } });

    fireEvent.click(screen.getByTestId('filter-cond-or'));

    fireEvent.click(okBtn());

    expect(onApply).toHaveBeenCalledWith({
      logic: 'or',
      filters: [
        { field: 'name', operator: 'contains', value: 'foo' },
        { field: 'name', operator: 'eq', value: 'bar' },
      ],
    });
  });
});

// ---------------------------------------------------------------------------
// OK with both rows empty → clear filter
// ---------------------------------------------------------------------------

describe('FilterConditionDialog — clear filter', () => {
  it('calls onApply(null) when both rows are empty', () => {
    const { onApply } = renderDialog();
    fireEvent.click(okBtn());
    expect(onApply).toHaveBeenCalledWith(null);
  });
});

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------

describe('FilterConditionDialog — cancel', () => {
  it('calls onClose without calling onApply when Cancel is clicked', () => {
    const { onApply, onClose } = renderDialog();
    fireEvent.click(cancelBtn());
    expect(onClose).toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Backdrop click
// ---------------------------------------------------------------------------

describe('FilterConditionDialog — backdrop click', () => {
  it('calls onClose when backdrop is mouse-pressed', () => {
    const { onClose } = renderDialog();
    fireEvent.mouseDown(screen.getByTestId('filter-cond-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onClose when dialog body is mouse-pressed', () => {
    const { onClose } = renderDialog();
    fireEvent.mouseDown(screen.getByTestId('filter-cond-dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Escape key
// ---------------------------------------------------------------------------

describe('FilterConditionDialog — escape key', () => {
  it('calls onClose when Escape is pressed', () => {
    const { onClose } = renderDialog();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// initial prop preloads form
// ---------------------------------------------------------------------------

describe('FilterConditionDialog — initial prop', () => {
  it('preloads row 1 operator and value from initial', () => {
    const initial: CompositeFilterDescriptor = {
      logic: 'or',
      filters: [{ field: 'name', operator: 'eq', value: 'X' }],
    };
    renderDialog({ initial, dataType: 'text' });

    const select = op1();
    expect(select.value).toBe('eq');
    expect(val1().value).toBe('X');
  });

  it('preloads Or radio when initial.logic is "or"', () => {
    const initial: CompositeFilterDescriptor = {
      logic: 'or',
      filters: [
        { field: 'name', operator: 'eq', value: 'X' },
        { field: 'name', operator: 'contains', value: 'Y' },
      ],
    };
    renderDialog({ initial, dataType: 'text' });

    expect((screen.getByTestId('filter-cond-or') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByTestId('filter-cond-and') as HTMLInputElement).checked).toBe(false);
  });

  it('preloads both rows from initial two-clause filter', () => {
    const initial: CompositeFilterDescriptor = {
      logic: 'and',
      filters: [
        { field: 'name', operator: 'startsWith', value: 'A' },
        { field: 'name', operator: 'endsWith', value: 'Z' },
      ],
    };
    renderDialog({ initial, dataType: 'text' });

    expect(op1().value).toBe('startsWith');
    expect(val1().value).toBe('A');
    expect(op2().value).toBe('endsWith');
    expect(val2().value).toBe('Z');
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

describe('FilterConditionDialog — accessibility', () => {
  it('marks the dialog with aria-modal="true"', () => {
    renderDialog();
    const dialog = screen.getByTestId('filter-cond-dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('role')).toBe('dialog');
  });

  it('disables the placeholder "-- select --" option', () => {
    renderDialog();
    const placeholder = Array.from(op1().options).find((o) => o.value === '');
    expect(placeholder).toBeTruthy();
    expect(placeholder!.disabled).toBe(true);
  });

  it('focuses the first operator select when opened', async () => {
    renderDialog();
    // Focus is moved on the next tick (setTimeout 0).
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(document.activeElement).toBe(op1());
  });
});

// ---------------------------------------------------------------------------
// Between validation
// ---------------------------------------------------------------------------

describe('FilterConditionDialog — between validation', () => {
  it('does not emit a between descriptor with an empty second value', () => {
    const { onApply } = renderDialog({ dataType: 'number', field: 'age' });

    fireEvent.change(op1(), { target: { value: 'between' } });
    fireEvent.change(val1(), { target: { value: '5' } });
    // Intentionally leave the second value empty.

    fireEvent.click(okBtn());

    // The half-filled between is invalid and should not produce a descriptor.
    // Since it was the only condition, onApply should be called with null.
    expect(onApply).toHaveBeenCalledWith(null);
    // And it must not have produced a descriptor with an empty value2.
    const calls = onApply.mock.calls;
    for (const [arg] of calls) {
      if (arg && typeof arg === 'object') {
        for (const f of arg.filters) {
          expect(f.value).not.toEqual(['5', '']);
        }
      }
    }
  });
});
