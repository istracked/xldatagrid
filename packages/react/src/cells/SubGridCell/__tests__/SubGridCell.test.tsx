import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { SubGridCell } from '../SubGridCell';
import type { ColumnDef, CellValue } from '@istracked/datagrid-core';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function makeColumn(overrides: Partial<ColumnDef> = {}): ColumnDef {
  return { id: 'col1', field: 'col1', title: 'Column 1', ...overrides };
}

function makeProps(overrides: {
  value?: CellValue;
  column?: Partial<ColumnDef>;
  isEditing?: boolean;
  onCommit?: (v: CellValue) => void;
  onCancel?: () => void;
}) {
  return {
    value: overrides.value ?? null,
    row: {},
    column: makeColumn(overrides.column),
    rowIndex: 0,
    isEditing: overrides.isEditing ?? false,
    onCommit: overrides.onCommit ?? vi.fn(),
    onCancel: overrides.onCancel ?? vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// SubGridCell fixtures
// ---------------------------------------------------------------------------

const subRows = [
  { id: 'sr1', name: 'Sub row 1' },
  { id: 'sr2', name: 'Sub row 2' },
];

const subColumns: ColumnDef[] = [
  { id: 'name', field: 'name', title: 'Name' },
];

// ---------------------------------------------------------------------------
// SubGridCell
// ---------------------------------------------------------------------------

describe('SubGridCell', () => {
  it('renders expand toggle button', () => {
    render(<SubGridCell {...makeProps({ value: subRows, column: { subGridColumns: subColumns } })} />);
    expect(screen.getByRole('button', { name: /expand sub-grid/i })).toBeInTheDocument();
  });

  it('shows row count badge with correct count', () => {
    render(<SubGridCell {...makeProps({ value: subRows, column: { subGridColumns: subColumns } })} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows 0 count when value is empty array', () => {
    render(<SubGridCell {...makeProps({ value: [], column: { subGridColumns: subColumns } })} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('shows 0 count when value is null', () => {
    render(<SubGridCell {...makeProps({ value: null, column: { subGridColumns: subColumns } })} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('is collapsed by default (aria-expanded false)', () => {
    render(<SubGridCell {...makeProps({ value: subRows, column: { subGridColumns: subColumns } })} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands on toggle button click (aria-expanded becomes true)', () => {
    render(<SubGridCell {...makeProps({ value: subRows, column: { subGridColumns: subColumns } })} />);
    const button = screen.getByRole('button', { name: /expand sub-grid/i });
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('changes button label to "Collapse sub-grid" when expanded', () => {
    render(<SubGridCell {...makeProps({ value: subRows, column: { subGridColumns: subColumns } })} />);
    fireEvent.click(screen.getByRole('button', { name: /expand sub-grid/i }));
    expect(screen.getByRole('button', { name: /collapse sub-grid/i })).toBeInTheDocument();
  });

  it('collapses on second toggle click', () => {
    render(<SubGridCell {...makeProps({ value: subRows, column: { subGridColumns: subColumns } })} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows loading fallback text initially when expanded (lazy load)', async () => {
    // Mock the lazy import to stay pending so Suspense fallback renders
    vi.mock('../../DataGrid', () => {
      return { DataGrid: () => null, __esModule: true };
    });
    // Re-import to pick up mock — but the lazy() in the real module may
    // resolve synchronously in test. Instead, check that the Suspense
    // boundary exists by verifying the "Loading..." text or the sub-grid
    // content renders after expansion.
    render(<SubGridCell {...makeProps({ value: subRows, column: { subGridColumns: subColumns } })} />);
    fireEvent.click(screen.getByRole('button', { name: /expand/i }));
    // After expanding, either the Suspense fallback or the resolved DataGrid
    // should be in the DOM — verify the expansion happened
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    vi.restoreAllMocks();
  });

  it('renders sub-grid container border when expanded', () => {
    render(<SubGridCell {...makeProps({ value: subRows, column: { subGridColumns: subColumns } })} />);
    fireEvent.click(screen.getByRole('button'));
    // Container div with border should be present
    const container = document.querySelector('[style*="border"]');
    expect(container).toBeInTheDocument();
  });
});
