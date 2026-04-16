import { vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { TextCell } from '../../cells/TextCell';
import { CheckboxCell } from '../../cells/CheckboxCell';
import { NumericCell } from '../../cells/NumericCell';
import { PasswordCell } from '../../cells/PasswordCell';
import { CurrencyCell } from '../../cells/CurrencyCell';
import { StatusCell } from '../../cells/StatusCell';
import { TagsCell } from '../../cells/TagsCell';
import { ActionsCell } from '../../cells/ActionsCell';
import type { ColumnDef } from '@istracked/datagrid-core';

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

// ---------------------------------------------------------------------------
// CheckboxCell
// ---------------------------------------------------------------------------

describe('CheckboxCell', () => {
  it('renders checked when value is true', () => {
    const { container } = render(
      <CheckboxCell value={true} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect((container.querySelector('input') as HTMLInputElement).checked).toBe(true);
  });

  it('renders unchecked when value is false', () => {
    const { container } = render(
      <CheckboxCell value={false} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect((container.querySelector('input') as HTMLInputElement).checked).toBe(false);
  });

  it('is indeterminate when value is null', () => {
    const { container } = render(
      <CheckboxCell value={null} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.indeterminate).toBe(true);
  });

  it('has aria-checked="mixed" when value is null', () => {
    const { container } = render(
      <CheckboxCell value={null} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(container.querySelector('input')?.getAttribute('aria-checked')).toBe('mixed');
  });

  it('calls onCommit with !value when toggled (true -> false)', () => {
    const onCommit = vi.fn();
    const { container } = render(
      <CheckboxCell value={true} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={onCommit} onCancel={noop} />
    );
    fireEvent.click(container.querySelector('input')!);
    expect(onCommit).toHaveBeenCalledWith(false);
  });

  it('calls onCommit with true when toggled from false', () => {
    const onCommit = vi.fn();
    const { container } = render(
      <CheckboxCell value={false} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={onCommit} onCancel={noop} />
    );
    fireEvent.click(container.querySelector('input')!);
    expect(onCommit).toHaveBeenCalledWith(true);
  });

  it('is disabled when column.editable is false', () => {
    const col = { ...baseColumn, editable: false };
    const { container } = render(
      <CheckboxCell value={false} row={{}} column={col} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect((container.querySelector('input') as HTMLInputElement).disabled).toBe(true);
  });

  it('does not call onCommit when disabled', () => {
    const onCommit = vi.fn();
    const col = { ...baseColumn, editable: false };
    const { container } = render(
      <CheckboxCell value={false} row={{}} column={col} rowIndex={0} isEditing={false} onCommit={onCommit} onCancel={noop} />
    );
    fireEvent.click(container.querySelector('input')!);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('has aria-checked="true" when checked', () => {
    const { container } = render(
      <CheckboxCell value={true} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(container.querySelector('input')?.getAttribute('aria-checked')).toBe('true');
  });

  it('has aria-checked="false" when unchecked', () => {
    const { container } = render(
      <CheckboxCell value={false} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(container.querySelector('input')?.getAttribute('aria-checked')).toBe('false');
  });

  it('renders a checkbox input element', () => {
    const { container } = render(
      <CheckboxCell value={false} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(container.querySelector('input[type="checkbox"]')).toBeTruthy();
  });

  it('handles undefined value as unchecked', () => {
    const { container } = render(
      <CheckboxCell value={undefined} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect((container.querySelector('input') as HTMLInputElement).checked).toBe(false);
  });

  it('toggling from null calls onCommit with true (boolean cast)', () => {
    const onCommit = vi.fn();
    const { container } = render(
      <CheckboxCell value={null} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={onCommit} onCancel={noop} />
    );
    fireEvent.click(container.querySelector('input')!);
    expect(onCommit).toHaveBeenCalledWith(true);
  });

  it('is enabled (not disabled) when column.editable is true', () => {
    const { container } = render(
      <CheckboxCell value={false} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect((container.querySelector('input') as HTMLInputElement).disabled).toBe(false);
  });

  it('has correct cursor style when editable', () => {
    const { container } = render(
      <CheckboxCell value={false} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect((container.querySelector('input') as HTMLInputElement).style.cursor).toBe('pointer');
  });
});

// ---------------------------------------------------------------------------
// NumericCell
// ---------------------------------------------------------------------------

describe('NumericCell', () => {
  it('renders number right-aligned in display mode', () => {
    const { container } = render(
      <NumericCell value={42} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    const span = container.querySelector('span');
    expect(span?.style.textAlign).toBe('right');
    expect(span?.textContent).toBe('42');
  });

  it('renders empty for null value', () => {
    const { container } = render(
      <NumericCell value={null} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(container.querySelector('span')?.textContent).toBe('');
  });

  it('shows input when isEditing=true', () => {
    const { container } = render(
      <NumericCell value={10} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    expect(container.querySelector('input')).toBeTruthy();
  });

  it('pre-fills input with current value', () => {
    const { container } = render(
      <NumericCell value={99} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    expect((container.querySelector('input') as HTMLInputElement).value).toBe('99');
  });

  it('calls onCommit with parsed number on Enter', () => {
    const onCommit = vi.fn();
    const { container } = render(
      <NumericCell value={0} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={onCommit} onCancel={noop} />
    );
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { value: '123' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith(123);
  });

  it('calls onCancel on Escape', () => {
    const onCancel = vi.fn();
    const { container } = render(
      <NumericCell value={0} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={onCancel} />
    );
    fireEvent.keyDown(container.querySelector('input')!, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('increments value on ArrowUp', () => {
    const { container } = render(
      <NumericCell value={5} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect((input as HTMLInputElement).value).toBe('6');
  });

  it('decrements value on ArrowDown', () => {
    const { container } = render(
      <NumericCell value={5} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect((input as HTMLInputElement).value).toBe('4');
  });

  it('respects max constraint on ArrowUp', () => {
    const col = { ...baseColumn, max: 5 };
    const { container } = render(
      <NumericCell value={5} row={{}} column={col} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect((input as HTMLInputElement).value).toBe('5');
  });

  it('respects min constraint on ArrowDown', () => {
    const col = { ...baseColumn, min: 0 };
    const { container } = render(
      <NumericCell value={0} row={{}} column={col} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect((input as HTMLInputElement).value).toBe('0');
  });

  it('rejects non-numeric input (letters)', () => {
    const { container } = render(
      <NumericCell value={0} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { value: '12abc' } });
    // Non-numeric change should be rejected; value stays as-is from state
    expect((input as HTMLInputElement).value).toBe('0');
  });

  it('calls onCommit with null for empty input', () => {
    const onCommit = vi.fn();
    const { container } = render(
      <NumericCell value={5} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={onCommit} onCancel={noop} />
    );
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith(null);
  });

  it('formats with thousands separator when format="thousands"', () => {
    const col = { ...baseColumn, format: 'thousands' };
    const { container } = render(
      <NumericCell value={1234567} row={{}} column={col} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(container.querySelector('span')?.textContent).toMatch(/1[,.]234[,.]567/);
  });

  it('commits on blur', () => {
    const onCommit = vi.fn();
    const { container } = render(
      <NumericCell value={0} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={onCommit} onCancel={noop} />
    );
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { value: '77' } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith(77);
  });

  it('clamps entered value above max', () => {
    const onCommit = vi.fn();
    const col = { ...baseColumn, max: 100 };
    const { container } = render(
      <NumericCell value={0} row={{}} column={col} rowIndex={0} isEditing={true} onCommit={onCommit} onCancel={noop} />
    );
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { value: '999' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith(100);
  });

  it('clamps entered value below min', () => {
    const onCommit = vi.fn();
    const col = { ...baseColumn, min: 10 };
    const { container } = render(
      <NumericCell value={50} row={{}} column={col} rowIndex={0} isEditing={true} onCommit={onCommit} onCancel={noop} />
    );
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith(10);
  });
});

// ---------------------------------------------------------------------------
// PasswordCell
// ---------------------------------------------------------------------------

describe('PasswordCell', () => {
  it('renders masked dots in display mode', () => {
    const { container } = render(
      <PasswordCell value="secret" row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    // Mask char is bullet \u2022; displayed length matches value length
    const text = container.querySelector('span span')?.textContent ?? '';
    expect([...text].length).toBe('secret'.length);
    expect(text).not.toContain('secret');
  });

  it('renders empty display for null value', () => {
    const { container } = render(
      <PasswordCell value={null} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(container.querySelector('span span')?.textContent).toBe('');
  });

  it('shows reveal toggle button in display mode', () => {
    render(
      <PasswordCell value="secret" row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(screen.getByRole('button', { name: /reveal|show/i })).toBeTruthy();
  });

  it('reveals value when toggle button clicked', () => {
    const { container } = render(
      <PasswordCell value="secret" row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    fireEvent.click(screen.getByText('Show'));
    expect(container.querySelector('span span')?.textContent).toBe('secret');
  });

  it('hides value again after second toggle', () => {
    const { container } = render(
      <PasswordCell value="secret" row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    fireEvent.click(screen.getByText('Show'));
    fireEvent.click(screen.getByText('Hide'));
    const text = container.querySelector('span span')?.textContent ?? '';
    expect(text).not.toContain('secret');
  });

  it('shows password input when isEditing=true', () => {
    const { container } = render(
      <PasswordCell value="secret" row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    expect(container.querySelector('input[type="password"]')).toBeTruthy();
  });

  it('calls onCommit on Enter', () => {
    const onCommit = vi.fn();
    const { container } = render(
      <PasswordCell value="secret" row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={onCommit} onCancel={noop} />
    );
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { value: 'newpass' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith('newpass');
  });

  it('calls onCancel on Escape', () => {
    const onCancel = vi.fn();
    const { container } = render(
      <PasswordCell value="secret" row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={onCancel} />
    );
    fireEvent.keyDown(container.querySelector('input')!, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onCommit on blur', () => {
    const onCommit = vi.fn();
    const { container } = render(
      <PasswordCell value="old" row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={onCommit} onCancel={noop} />
    );
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { value: 'blurred' } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith('blurred');
  });

  it('pre-fills input with current value in edit mode', () => {
    const { container } = render(
      <PasswordCell value="abc123" row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    expect((container.querySelector('input') as HTMLInputElement).value).toBe('abc123');
  });

  it('masked length equals value string length', () => {
    const { container } = render(
      <PasswordCell value="12345" row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    const text = container.querySelector('span span')?.textContent ?? '';
    expect([...text].length).toBe(5);
  });

  it('toggle button label changes between Show and Hide', () => {
    render(
      <PasswordCell value="pw" row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(screen.getByText('Show')).toBeTruthy();
    fireEvent.click(screen.getByText('Show'));
    expect(screen.getByText('Hide')).toBeTruthy();
  });

  it('aria-label changes between reveal and hide states', () => {
    render(
      <PasswordCell value="pw" row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-label')).toMatch(/reveal/i);
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-label')).toMatch(/hide/i);
  });

  it('input type is password (not text) in edit mode', () => {
    const { container } = render(
      <PasswordCell value="pw" row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    expect(container.querySelector('input')?.type).toBe('password');
  });
});

// ---------------------------------------------------------------------------
// CurrencyCell
// ---------------------------------------------------------------------------

describe('CurrencyCell', () => {
  it('renders formatted currency value with $ symbol', () => {
    const { container } = render(
      <CurrencyCell value={1234.5} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(container.textContent).toContain('$');
    expect(container.textContent).toContain('1,234.50');
  });

  it('renders empty for null value', () => {
    const { container } = render(
      <CurrencyCell value={null} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(container.querySelector('span')?.textContent).toBe('');
  });

  it('renders right-aligned', () => {
    const { container } = render(
      <CurrencyCell value={100} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(container.querySelector('span')?.style.textAlign).toBe('right');
  });

  it('renders negative value in red by default', () => {
    const { container } = render(
      <CurrencyCell value={-50} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(container.querySelector('span')?.style.color).toBe('red');
  });

  it('does not render negative in red when format includes no-red', () => {
    const col = { ...baseColumn, format: 'no-red' };
    const { container } = render(
      <CurrencyCell value={-50} row={{}} column={col} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(container.querySelector('span')?.style.color).not.toBe('red');
  });

  it('shows numeric input in edit mode', () => {
    const { container } = render(
      <CurrencyCell value={100} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    expect(container.querySelector('input')).toBeTruthy();
  });

  it('pre-fills edit input with raw numeric value', () => {
    const { container } = render(
      <CurrencyCell value={99.99} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    expect((container.querySelector('input') as HTMLInputElement).value).toBe('99.99');
  });

  it('calls onCommit with parsed number on Enter', () => {
    const onCommit = vi.fn();
    const { container } = render(
      <CurrencyCell value={0} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={onCommit} onCancel={noop} />
    );
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { value: '500' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith(500);
  });

  it('calls onCancel on Escape', () => {
    const onCancel = vi.fn();
    const { container } = render(
      <CurrencyCell value={0} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={onCancel} />
    );
    fireEvent.keyDown(container.querySelector('input')!, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('commits on blur', () => {
    const onCommit = vi.fn();
    const { container } = render(
      <CurrencyCell value={0} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={onCommit} onCancel={noop} />
    );
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { value: '250.5' } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith(250.5);
  });

  it('rejects non-numeric input in edit mode', () => {
    const { container } = render(
      <CurrencyCell value={0} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { value: '1abc' } });
    expect((input as HTMLInputElement).value).toBe('0');
  });

  it('uses custom currency symbol from format', () => {
    const col = { ...baseColumn, format: 'EUR:€' };
    const { container } = render(
      <CurrencyCell value={42} row={{}} column={col} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(container.textContent).toContain('€');
  });

  it('displays two decimal places', () => {
    const { container } = render(
      <CurrencyCell value={10} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(container.textContent).toContain('10.00');
  });

  it('calls onCommit with null for empty input', () => {
    const onCommit = vi.fn();
    const { container } = render(
      <CurrencyCell value={5} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={onCommit} onCancel={noop} />
    );
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith(null);
  });

  it('positive value is not red', () => {
    const { container } = render(
      <CurrencyCell value={10} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(container.querySelector('span')?.style.color).not.toBe('red');
  });
});

// ---------------------------------------------------------------------------
// StatusCell
// ---------------------------------------------------------------------------

const statusOptions = [
  { value: 'active', label: 'Active', color: '#22c55e' },
  { value: 'inactive', label: 'Inactive', color: '#ef4444' },
  { value: 'pending', label: 'Pending', color: '#f59e0b' },
];

const statusColumn: ColumnDef = { ...baseColumn, options: statusOptions };

describe('StatusCell', () => {
  it('renders the current status badge', () => {
    render(
      <StatusCell value="active" row={{}} column={statusColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('renders empty badge for unknown value', () => {
    const { container } = render(
      <StatusCell value="unknown" row={{}} column={statusColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(container.textContent).toContain('unknown');
  });

  it('does not show dropdown in display mode', () => {
    render(
      <StatusCell value="active" row={{}} column={statusColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('opens dropdown when isEditing=true', () => {
    render(
      <StatusCell value="active" row={{}} column={statusColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    expect(screen.getByRole('listbox')).toBeTruthy();
  });

  it('lists all options in dropdown', () => {
    render(
      <StatusCell value="active" row={{}} column={statusColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    // "Active" appears in both the badge and the dropdown option
    expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Inactive')).toBeTruthy();
    expect(screen.getByText('Pending')).toBeTruthy();
  });

  it('updates draft when option is clicked and commits on blur', () => {
    const onCommit = vi.fn();
    render(
      <StatusCell value="active" row={{}} column={statusColumn} rowIndex={0} isEditing={true} onCommit={onCommit} onCancel={noop} />
    );
    // Use mouseDown because the dropdown uses onMouseDown to prevent blur first
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Inactive' }));
    // Click updates draft but does NOT call onCommit (cell stays in edit mode)
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('moves activeIndex down on ArrowDown', () => {
    const { container } = render(
      <StatusCell value="active" row={{}} column={statusColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    const listbox = screen.getByRole('listbox');
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    const options = container.querySelectorAll('[role="option"]');
    expect(options[1]?.getAttribute('data-active')).toBe('true');
  });

  it('moves activeIndex up on ArrowUp', () => {
    const { container } = render(
      <StatusCell value="inactive" row={{}} column={statusColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    const listbox = screen.getByRole('listbox');
    fireEvent.keyDown(listbox, { key: 'ArrowDown' }); // go to index 2
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });   // back to index 1
    const options = container.querySelectorAll('[role="option"]');
    expect(options[1]?.getAttribute('data-active')).toBe('true');
  });

  it('updates draft on Enter and closes dropdown without committing', () => {
    const onCommit = vi.fn();
    render(
      <StatusCell value="active" row={{}} column={statusColumn} rowIndex={0} isEditing={true} onCommit={onCommit} onCancel={noop} />
    );
    const listbox = screen.getByRole('listbox');
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    fireEvent.keyDown(listbox, { key: 'Enter' });
    // Enter updates draft and closes dropdown but does NOT commit (cell stays in edit mode)
    expect(onCommit).not.toHaveBeenCalled();
    // Dropdown should be closed
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('calls onCancel on Escape', () => {
    const onCancel = vi.fn();
    render(
      <StatusCell value="active" row={{}} column={statusColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={onCancel} />
    );
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('renders color indicators for options', () => {
    const { container } = render(
      <StatusCell value="active" row={{}} column={statusColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    const colorDots = container.querySelectorAll('[role="option"] span');
    expect(colorDots.length).toBeGreaterThan(0);
  });

  it('marks current value option as aria-selected=true', () => {
    render(
      <StatusCell value="inactive" row={{}} column={statusColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    const options = screen.getAllByRole('option');
    const inactiveOpt = options.find((o) => o.textContent?.includes('Inactive'));
    expect(inactiveOpt?.getAttribute('aria-selected')).toBe('true');
  });

  it('renders with empty options list without crashing', () => {
    const col = { ...baseColumn, options: [] };
    render(
      <StatusCell value="x" row={{}} column={col} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    expect(screen.getByRole('listbox')).toBeTruthy();
  });

  it('does not open dropdown when not editing even on click', () => {
    render(
      <StatusCell value="active" row={{}} column={statusColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// TagsCell
// ---------------------------------------------------------------------------

describe('TagsCell', () => {
  it('renders tags in display mode', () => {
    render(
      <TagsCell value={['alpha', 'beta']} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(screen.getByText('alpha')).toBeTruthy();
    expect(screen.getByText('beta')).toBeTruthy();
  });

  it('renders empty for null value', () => {
    const { container } = render(
      <TagsCell value={null} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(container.querySelector('span')?.textContent).toBe('');
  });

  it('shows input field in edit mode', () => {
    const { container } = render(
      <TagsCell value={['alpha']} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    expect(container.querySelector('input')).toBeTruthy();
  });

  it('adds tag on Enter key', () => {
    const { container } = render(
      <TagsCell value={[]} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { value: 'newtag' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('newtag')).toBeTruthy();
  });

  it('adds tag on comma key', () => {
    const { container } = render(
      <TagsCell value={[]} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { value: 'tagone' } });
    fireEvent.keyDown(input, { key: ',' });
    expect(screen.getByText('tagone')).toBeTruthy();
  });

  it('prevents duplicate tags', () => {
    const { container } = render(
      <TagsCell value={['existing']} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { value: 'existing' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    const tags = screen.getAllByText('existing');
    expect(tags.length).toBe(1);
  });

  it('removes last tag on Backspace when input is empty', () => {
    const { container } = render(
      <TagsCell value={['first', 'second']} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(screen.queryByText('second')).toBeNull();
    expect(screen.getByText('first')).toBeTruthy();
  });

  it('removes specific tag via close button', () => {
    render(
      <TagsCell value={['alpha', 'beta']} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    const removeBtn = screen.getByRole('button', { name: /remove tag alpha/i });
    fireEvent.mouseDown(removeBtn);
    expect(screen.queryByText('alpha')).toBeNull();
    expect(screen.getByText('beta')).toBeTruthy();
  });

  it('calls onCancel on Escape', () => {
    const onCancel = vi.fn();
    const { container } = render(
      <TagsCell value={[]} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={onCancel} />
    );
    fireEvent.keyDown(container.querySelector('input')!, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onCommit with tag array on blur', () => {
    const onCommit = vi.fn();
    const { container } = render(
      <TagsCell value={['a']} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={onCommit} onCancel={noop} />
    );
    fireEvent.blur(container.querySelector('input')!);
    expect(onCommit).toHaveBeenCalledWith(['a']);
  });

  it('parses comma-separated string value', () => {
    render(
      <TagsCell value="foo,bar,baz" row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(screen.getByText('foo')).toBeTruthy();
    expect(screen.getByText('bar')).toBeTruthy();
    expect(screen.getByText('baz')).toBeTruthy();
  });

  it('does not show remove buttons in display mode', () => {
    render(
      <TagsCell value={['alpha']} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('commits added tag on blur when input has pending text', () => {
    const onCommit = vi.fn();
    const { container } = render(
      <TagsCell value={[]} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={onCommit} onCancel={noop} />
    );
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { value: 'pending' } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith(['pending']);
  });

  it('clears input after adding a tag', () => {
    const { container } = render(
      <TagsCell value={[]} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'tag1' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input.value).toBe('');
  });

  it('does not remove on Backspace when input has text', () => {
    const { container } = render(
      <TagsCell value={['keep']} row={{}} column={baseColumn} rowIndex={0} isEditing={true} onCommit={noop} onCancel={noop} />
    );
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { value: 'typing' } });
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(screen.getByText('keep')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// ActionsCell
// ---------------------------------------------------------------------------

describe('ActionsCell', () => {
  const makeActionsColumn = (actions: Array<{
    label: string;
    onClick: (row: unknown) => void;
    disabled?: boolean | ((row: unknown) => boolean);
    tooltip?: string;
  }>) => ({ ...baseColumn, actions } as any);

  it('renders action buttons', () => {
    const col = makeActionsColumn([
      { label: 'Edit', onClick: noop },
      { label: 'Delete', onClick: noop },
    ]);
    render(
      <ActionsCell value={null} row={{}} column={col} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy();
  });

  it('calls action onClick with row data', () => {
    const onClick = vi.fn();
    const row = { id: 1, name: 'test' };
    const col = makeActionsColumn([{ label: 'Do it', onClick }]);
    render(
      <ActionsCell value={null} row={row} column={col} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Do it' }));
    expect(onClick).toHaveBeenCalledWith(row);
  });

  it('disabled button is not clickable', () => {
    const onClick = vi.fn();
    const col = makeActionsColumn([{ label: 'Disabled', onClick, disabled: true }]);
    render(
      <ActionsCell value={null} row={{}} column={col} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    const btn = screen.getByRole('button', { name: 'Disabled' });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('supports disabled as a function', () => {
    const onClick = vi.fn();
    const col = makeActionsColumn([
      { label: 'Conditional', onClick, disabled: (r: any) => r.locked === true },
    ]);
    render(
      <ActionsCell value={null} row={{ locked: true }} column={col} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect((screen.getByRole('button', { name: 'Conditional' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('enables button when disabled function returns false', () => {
    const col = makeActionsColumn([
      { label: 'Active', onClick: noop, disabled: () => false },
    ]);
    render(
      <ActionsCell value={null} row={{}} column={col} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect((screen.getByRole('button', { name: 'Active' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows tooltip on hover', () => {
    const col = makeActionsColumn([{ label: 'Info', onClick: noop, tooltip: 'More details' }]);
    render(
      <ActionsCell value={null} row={{}} column={col} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Info' }));
    expect(screen.getByRole('tooltip')).toBeTruthy();
    expect(screen.getByRole('tooltip').textContent).toBe('More details');
  });

  it('hides tooltip on mouse leave', () => {
    const col = makeActionsColumn([{ label: 'Info', onClick: noop, tooltip: 'Tip text' }]);
    render(
      <ActionsCell value={null} row={{}} column={col} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    const btn = screen.getByRole('button', { name: 'Info' });
    fireEvent.mouseEnter(btn);
    fireEvent.mouseLeave(btn);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('renders nothing when no actions and no options', () => {
    const { container } = render(
      <ActionsCell value={null} row={{}} column={baseColumn} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('falls back to column.options when no actions defined', () => {
    const col = {
      ...baseColumn,
      options: [{ value: 'view', label: 'View' }],
    };
    render(
      <ActionsCell value={null} row={{}} column={col} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(screen.getByRole('button', { name: 'View' })).toBeTruthy();
  });

  it('disabled option from column.options renders disabled', () => {
    const col = {
      ...baseColumn,
      options: [{ value: 'del', label: 'Delete', disabled: true }],
    };
    render(
      <ActionsCell value={null} row={{}} column={col} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect((screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders multiple tooltips independently', () => {
    const col = makeActionsColumn([
      { label: 'A', onClick: noop, tooltip: 'Tip A' },
      { label: 'B', onClick: noop, tooltip: 'Tip B' },
    ]);
    render(
      <ActionsCell value={null} row={{}} column={col} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'A' }));
    expect(screen.getByRole('tooltip').textContent).toBe('Tip A');
    fireEvent.mouseLeave(screen.getByRole('button', { name: 'A' }));
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'B' }));
    expect(screen.getByRole('tooltip').textContent).toBe('Tip B');
  });

  it('buttons have aria-label matching their label', () => {
    const col = makeActionsColumn([{ label: 'Archive', onClick: noop }]);
    render(
      <ActionsCell value={null} row={{}} column={col} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(screen.getByRole('button', { name: 'Archive' }).getAttribute('aria-label')).toBe('Archive');
  });

  it('does not crash when value is not null', () => {
    const col = makeActionsColumn([{ label: 'Go', onClick: noop }]);
    render(
      <ActionsCell value="ignored" row={{}} column={col} rowIndex={0} isEditing={false} onCommit={noop} onCancel={noop} />
    );
    expect(screen.getByRole('button', { name: 'Go' })).toBeTruthy();
  });
});
