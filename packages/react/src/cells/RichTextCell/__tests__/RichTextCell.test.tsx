import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { RichTextCell } from '../RichTextCell';
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
// RichTextCell
// ---------------------------------------------------------------------------

describe('RichTextCell', () => {
  it('renders HTML content via dangerouslySetInnerHTML in display mode', () => {
    render(<RichTextCell {...makeProps({ value: '<b>Bold text</b>' })} />);
    expect(screen.getByText('Bold text')).toBeInTheDocument();
  });

  it('renders placeholder when value is null', () => {
    render(<RichTextCell {...makeProps({ value: null, column: { placeholder: 'No content' } })} />);
    expect(screen.getByText('No content')).toBeInTheDocument();
  });

  it('renders placeholder when value is empty string', () => {
    render(<RichTextCell {...makeProps({ value: '' })} />);
    expect(screen.getByText(/no content/i)).toBeInTheDocument();
  });

  it('strips script tags from HTML before display', () => {
    render(<RichTextCell {...makeProps({ value: '<script>alert(1)</script><p>Safe</p>' })} />);
    expect(screen.getByText('Safe')).toBeInTheDocument();
    // Script should not be in the document
    expect(document.querySelector('script')).not.toBeInTheDocument();
  });

  it('shows textarea in edit mode', () => {
    render(<RichTextCell {...makeProps({ isEditing: true, value: '<b>test</b>' })} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('textarea value matches raw HTML string in edit mode', () => {
    render(<RichTextCell {...makeProps({ isEditing: true, value: '<b>test</b>' })} />);
    expect(screen.getByRole('textbox')).toHaveValue('<b>test</b>');
  });

  it('calls onCommit with updated HTML on blur', () => {
    const onCommit = vi.fn();
    render(<RichTextCell {...makeProps({ isEditing: true, value: '<p>Hello</p>', onCommit })} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '<p>World</p>' } });
    fireEvent.blur(textarea);
    expect(onCommit).toHaveBeenCalledWith('<p>World</p>');
  });

  it('calls onCancel on Escape key', () => {
    const onCancel = vi.fn();
    render(<RichTextCell {...makeProps({ isEditing: true, value: '', onCancel })} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('does NOT call onCommit on Enter key (allows newlines)', () => {
    const onCommit = vi.fn();
    render(<RichTextCell {...makeProps({ isEditing: true, value: '', onCommit })} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('preserves nested HTML tags in display', () => {
    render(<RichTextCell {...makeProps({ value: '<em><strong>Nested</strong></em>' })} />);
    expect(screen.getByText('Nested')).toBeInTheDocument();
  });
});
