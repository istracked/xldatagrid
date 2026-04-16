/**
 * RichTextCell module for the datagrid component library.
 *
 * Provides a cell renderer for HTML rich-text content. In display mode, sanitized HTML
 * is rendered inline with script tags stripped for safety. In edit mode, a monospace
 * textarea allows direct editing of the raw HTML source, with blur-to-commit semantics.
 *
 * @module RichTextCell
 */
import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import type { CellValue, ColumnDef } from '@istracked/datagrid-core';
import * as styles from './RichTextCell.styles';

/**
 * Props accepted by the {@link RichTextCell} component.
 *
 * @typeParam TData - The shape of a single row in the datagrid. Defaults to a generic record.
 */
interface RichTextCellProps<TData = Record<string, unknown>> {
  /** The raw cell value containing HTML markup. */
  value: CellValue;
  /** The full row data object that this cell belongs to. */
  row: TData;
  /** Column definition providing metadata such as `placeholder` text. */
  column: ColumnDef<TData>;
  /** Zero-based index of the row within the visible datagrid. */
  rowIndex: number;
  /** Whether the cell is currently in inline-edit mode. */
  isEditing: boolean;
  /** Callback to persist the updated HTML string when editing completes. */
  onCommit: (value: CellValue) => void;
  /** Callback to discard changes and exit edit mode. */
  onCancel: () => void;
}

/**
 * Converts an HTML string to plain text by stripping all tags and collapsing whitespace.
 *
 * Useful for generating tooltip text or accessible descriptions from rich content.
 *
 * @param html - The HTML string to convert.
 * @returns A plain-text representation with normalized whitespace.
 */
function htmlToPlainText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * A datagrid cell renderer for HTML rich-text content.
 *
 * In display mode, the cell renders sanitized HTML inline via `dangerouslySetInnerHTML`,
 * with all `<script>` tags removed. A plain-text conversion is used for the tooltip.
 * In edit mode, a resizable monospace `<textarea>` exposes the raw HTML source, committing
 * on blur and cancelling on Escape. Enter is allowed for multi-line editing.
 *
 * @typeParam TData - Row data shape, defaults to `Record<string, unknown>`.
 *
 * @param props - The component props conforming to {@link RichTextCellProps}.
 * @returns A React element rendering sanitized HTML or a raw-HTML textarea editor.
 *
 * @example
 * ```tsx
 * <RichTextCell
 *   value="<p>Hello <strong>world</strong></p>"
 *   row={rowData}
 *   column={columnDef}
 *   rowIndex={0}
 *   isEditing={false}
 *   onCommit={handleCommit}
 *   onCancel={handleCancel}
 * />
 * ```
 */
export const RichTextCell = React.memo(function RichTextCell<TData = Record<string, unknown>>({
  value,
  column,
  isEditing,
  onCommit,
  onCancel,
}: RichTextCellProps<TData>) {
  // Coerce the cell value to a string and sanitize script tags for safe rendering
  const rawHtml = value != null ? String(value) : '';
  const safeHtml = DOMPurify.sanitize(rawHtml);
  const [draft, setDraft] = useState(rawHtml);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize the draft with the current value and auto-focus the textarea on edit
  useEffect(() => {
    if (isEditing) {
      setDraft(rawHtml);
      // Focus textarea after render
      textareaRef.current?.focus();
    }
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Handles keyboard shortcuts within the textarea.
   * Escape cancels editing; Enter is intentionally not intercepted to allow newlines.
   *
   * @param e - The keyboard event.
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
    // Allow Enter for newlines in rich text
  };

  /**
   * Commits the current draft HTML when the textarea loses focus.
   */
  const handleBlur = () => {
    onCommit(draft);
  };

  // Display mode: render sanitized HTML with overflow clipping
  if (!isEditing) {
    const plainText = htmlToPlainText(safeHtml);
    return (
      <div
        style={styles.displayContainer}
        title={plainText}
      >
        {safeHtml ? (
          <span dangerouslySetInnerHTML={{ __html: safeHtml }} />
        ) : (
          <span style={styles.placeholderText}>{column.placeholder ?? 'No content'}</span>
        )}
      </div>
    );
  }

  // Edit mode: render a monospace textarea for raw HTML editing
  return (
    <textarea
      ref={textareaRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      placeholder={column.placeholder ?? 'Enter HTML content...'}
      style={styles.textarea}
    />
  );
}) as <TData = Record<string, unknown>>(props: RichTextCellProps<TData>) => React.ReactElement;
