import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { MuiRichTextCell } from '../MuiRichTextCell';
import type { ColumnDef, CellValue } from '@istracked/datagrid-core';

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
  } as const;
}

describe('MuiRichTextCell', () => {
  it('renders markdown (bold + GFM strikethrough) in display mode', () => {
    render(<MuiRichTextCell {...makeProps({ value: '**bold** ~~gone~~' })} />);
    const rendered = screen.getByTestId('richtext-rendered');
    expect(rendered.querySelector('strong')?.textContent).toBe('bold');
    expect(rendered.querySelector('del')?.textContent).toBe('gone');
  });

  it('renders GFM tables', () => {
    const md = '| H |\n| - |\n| 1 |';
    render(<MuiRichTextCell {...makeProps({ value: md })} />);
    expect(screen.getByTestId('richtext-rendered').querySelector('table')).not.toBeNull();
  });

  it('shows textarea with markdown source in edit mode', () => {
    render(<MuiRichTextCell {...makeProps({ isEditing: true, value: '*hi*' })} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('*hi*');
  });

  it('commits draft markdown on blur', () => {
    const onCommit = vi.fn();
    render(<MuiRichTextCell {...makeProps({ isEditing: true, value: '', onCommit })} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '**done**' } });
    fireEvent.blur(textarea);
    expect(onCommit).toHaveBeenCalledWith('**done**');
  });

  it('does not render any upload UI', () => {
    render(<MuiRichTextCell {...makeProps({ isEditing: true, value: '' })} />);
    expect(document.querySelector('input[type="file"]')).toBeNull();
    expect(screen.queryByRole('button', { name: /upload/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /attach/i })).toBeNull();
  });
});
