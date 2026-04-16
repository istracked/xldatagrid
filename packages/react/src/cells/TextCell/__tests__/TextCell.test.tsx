import { vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import type { ColumnDef } from '@istracked/datagrid-core';
import { TextCell } from '../TextCell';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const baseColumn: ColumnDef = {
  id: 'col1',
  field: 'name',
  title: 'Name',
  editable: true,
};

const noop = () => {};

// ---------------------------------------------------------------------------
// TextCell
// ---------------------------------------------------------------------------

describe('TextCell', () => {
  it('renders display value', () => {
    const { container } = render(
      <TextCell value="hello" row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(container.textContent).toContain('hello');
  });

  it('renders empty when value is null', () => {
    const { container } = render(
      <TextCell value={null} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(container.querySelector('span')?.textContent?.trim()).toBe('');
  });

  it('renders placeholder when value is empty', () => {
    const col = { ...baseColumn, placeholder: 'Type here...' };
    render(
      <TextCell value="" row={{}} column={col} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(screen.getByText('Type here...')).toBeTruthy();
  });

  it('shows input when isEditing=true', () => {
    const { container } = render(
      <TextCell value="hello" row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    const input = container.querySelector('input');
    expect(input).toBeTruthy();
    expect(input?.value).toBe('hello');
  });

  it('calls onCommit with updated value on Enter', () => {
    const onCommit = vi.fn();
    const { container } = render(
      <TextCell value="hello" row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={onCommit} onCancel={noop} />
    );
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { value: 'world' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith('world');
  });

  it('calls onCancel on Escape', () => {
    const onCancel = vi.fn();
    const { container } = render(
      <TextCell value="hello" row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={onCancel} />
    );
    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onCommit on blur', () => {
    const onCommit = vi.fn();
    const { container } = render(
      <TextCell value="hello" row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={onCommit} onCancel={noop} />
    );
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { value: 'blurred' } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith('blurred');
  });

  it('renders textarea for multiline format', () => {
    const col = { ...baseColumn, format: 'multiline' };
    const { container } = render(
      <TextCell value="line1" row={{}} column={col} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    expect(container.querySelector('textarea')).toBeTruthy();
  });

  it('does NOT commit on Enter in multiline mode', () => {
    const onCommit = vi.fn();
    const col = { ...baseColumn, format: 'multiline' };
    const { container } = render(
      <TextCell value="line1" row={{}} column={col} rowIndex={0} isEditing={true} onCommit={onCommit} onCancel={noop} />
    );
    const textarea = container.querySelector('textarea')!;
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('cancels on Escape in multiline mode', () => {
    const onCancel = vi.fn();
    const col = { ...baseColumn, format: 'multiline' };
    const { container } = render(
      <TextCell value="line1" row={{}} column={col} rowIndex={0} isEditing={true} onCommit={noop} onCancel={onCancel} />
    );
    const textarea = container.querySelector('textarea')!;
    fireEvent.keyDown(textarea, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('display has overflow ellipsis style', () => {
    const { container } = render(
      <TextCell value="long text" row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    const span = container.querySelector('span');
    expect(span?.style.textOverflow).toBe('ellipsis');
  });

  it('shows title attribute with full value', () => {
    const { container } = render(
      <TextCell value="full value" row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(container.querySelector('span')?.title).toBe('full value');
  });

  it('handles undefined value', () => {
    const { container } = render(
      <TextCell value={undefined} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(container.querySelector('span')).toBeTruthy();
  });

  it('commits empty string when input is cleared', () => {
    const onCommit = vi.fn();
    const { container } = render(
      <TextCell value="hello" row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={onCommit} onCancel={noop} />
    );
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith('');
  });

  it('passes placeholder to input in edit mode', () => {
    const col = { ...baseColumn, placeholder: 'Enter name' };
    const { container } = render(
      <TextCell value="" row={{}} column={col} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    expect(container.querySelector('input')?.placeholder).toBe('Enter name');
  });
});
