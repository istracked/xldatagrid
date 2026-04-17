/**
 * Text cell renderer for the datagrid.
 *
 * Provides a display mode that truncates overflowing text with an ellipsis and
 * an inline edit mode that renders either a single-line `<input>` or a
 * multi-line `<textarea>` depending on the column's `format` option.
 *
 * @module TextCell
 * @packageDocumentation
 */
import React, { useState, useRef, useEffect } from 'react';
import type { CellValue, ColumnDef } from '@istracked/datagrid-core';
import * as styles from './TextCell.styles';

/**
 * Props accepted by {@link TextCell}.
 *
 * @typeParam TData - The row data shape, defaults to a generic record.
 */
interface TextCellProps<TData = Record<string, unknown>> {
  /** The current cell value, coerced to a string for display. */
  value: CellValue;
  /** The full row data object containing this cell. */
  row: TData;
  /** Column definition that controls placeholder text and multiline format. */
  column: ColumnDef<TData>;
  /** Zero-based index of the row within the visible dataset. */
  rowIndex: number;
  /** Whether the cell is currently in inline-edit mode. */
  isEditing: boolean;
  /** Callback to persist the edited value back to the data source. */
  onCommit: (value: CellValue) => void;
  /** Callback to discard the current edit and exit edit mode. */
  onCancel: () => void;
}

/**
 * Renders a text value inside the datagrid, toggling between a read-only
 * display span and an editable input (or textarea) based on `isEditing`.
 *
 * In display mode the value is shown as a truncated single line with a
 * native `title` tooltip.  When the column defines no value, the configured
 * `placeholder` text is rendered in a muted style.
 *
 * In edit mode the component keeps a local `draft` state so that keystrokes
 * are non-destructive until the user explicitly commits (Enter / blur) or
 * cancels (Escape).  If the column format includes `"multiline"`, a
 * `<textarea>` is rendered instead of an `<input>`.
 *
 * @typeParam TData - Row data shape forwarded from the grid.
 *
 * @param props - {@link TextCellProps}
 * @returns A React element representing the text cell.
 *
 * @example
 * ```tsx
 * <TextCell
 *   value="Hello"
 *   row={rowData}
 *   column={columnDef}
 *   rowIndex={0}
 *   isEditing={false}
 *   onCommit={handleCommit}
 *   onCancel={handleCancel}
 * />
 * ```
 */
export const TextCell = React.memo(function TextCell<TData = Record<string, unknown>>({
  value,
  column,
  isEditing,
  onCommit,
  onCancel,
}: TextCellProps<TData>) {
  // Normalise null/undefined to empty string for safe rendering
  const displayValue = value == null ? '' : String(value);
  const [draft, setDraft] = useState(displayValue);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Sync draft when edit mode starts
  useEffect(() => {
    if (isEditing) {
      setDraft(displayValue);
      // Focus after render so the cursor is placed inside the input immediately
      inputRef.current?.focus();
    }
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Display mode ---
  if (!isEditing) {
    return (
      <span
        style={styles.displayText}
        title={displayValue}
      >
        {displayValue || (
          <span style={styles.placeholder}>{column.placeholder}</span>
        )}
      </span>
    );
  }

  // --- Edit mode key handling ---

  /** Commits on Enter (single-line only) and cancels on Escape. */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !column.format?.includes('multiline')) {
      onCommit(draft);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  /** Commits the current draft when the input loses focus. */
  const handleBlur = () => {
    onCommit(draft);
  };

  // --- Multiline variant ---
  // Renders a <textarea> when the column format specifies multiline,
  // allowing newlines within the cell value.
  if (column.format?.includes('multiline')) {
    return (
      <textarea
        ref={inputRef as React.Ref<HTMLTextAreaElement>}
        value={draft}
        placeholder={column.placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
        }}
        onBlur={handleBlur}
        style={styles.editTextarea}
      />
    );
  }

  // --- Single-line variant ---
  return (
    <input
      ref={inputRef as React.Ref<HTMLInputElement>}
      type="text"
      value={draft}
      placeholder={column.placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      style={styles.editInput}
    />
  );
}) as <TData = Record<string, unknown>>(props: TextCellProps<TData>) => React.ReactElement;
