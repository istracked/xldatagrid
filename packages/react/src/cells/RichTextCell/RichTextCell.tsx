/**
 * RichTextCell module for the datagrid component library.
 *
 * The cell stores GitHub-Flavored Markdown source as a plain string. Display
 * mode renders the markdown to HTML via `react-markdown` + `remark-gfm`. Edit
 * mode surfaces a lightweight textarea with keyboard shortcuts for common GFM
 * formatting (Ctrl/Cmd+B bold, Ctrl/Cmd+I italic, Ctrl/Cmd+K link) plus a
 * small toolbar and an optional preview toggle.
 *
 * Image uploads and file attachments are intentionally not supported — image
 * markdown syntax (`![alt](url)`) can still be typed, but no upload UI is
 * rendered and consumers are not asked to wire an upload handler.
 *
 * @module RichTextCell
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { CellValue, ColumnDef } from '@istracked/datagrid-core';
import * as styles from './RichTextCell.styles';

/**
 * Props accepted by the {@link RichTextCell} component.
 *
 * @typeParam TData - The shape of a single row in the datagrid.
 */
interface RichTextCellProps<TData = Record<string, unknown>> {
  /** The raw cell value — a GitHub-Flavored Markdown string. */
  value: CellValue;
  /** The full row data object that this cell belongs to. */
  row: TData;
  /** Column definition providing metadata such as `placeholder` text. */
  column: ColumnDef<TData>;
  /** Zero-based index of the row within the visible datagrid. */
  rowIndex: number;
  /** Whether the cell is currently in inline-edit mode. */
  isEditing: boolean;
  /** Callback to persist the updated markdown string when editing completes. */
  onCommit: (value: CellValue) => void;
  /** Callback to discard changes and exit edit mode. */
  onCancel: () => void;
}

/**
 * Produces a short plain-text snippet from a markdown source, suitable for a
 * cell tooltip. Formatting characters are stripped but the textual content is
 * preserved.
 *
 * @param markdown - The markdown source string.
 * @returns A plain-text representation with normalized whitespace.
 */
function markdownToPlainText(markdown: string): string {
  return markdown
    // Remove fenced code blocks entirely.
    .replace(/```[\s\S]*?```/g, ' ')
    // Remove inline code delimiters but keep text.
    .replace(/`([^`]*)`/g, '$1')
    // Collapse image/link markup to the visible label.
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Strip emphasis markers.
    .replace(/([*_~]){1,3}([^*_~]+)\1{1,3}/g, '$2')
    // Strip heading / list markers at line starts.
    .replace(/^\s{0,3}(?:#{1,6}|[-*+]|\d+\.)\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Wraps the current textarea selection with matching markers, or inserts a
 * placeholder when no selection exists.
 */
function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  placeholder: string,
): { value: string; selectionStart: number; selectionEnd: number } {
  const { value, selectionStart, selectionEnd } = textarea;
  const selected = value.slice(selectionStart, selectionEnd);
  const content = selected || placeholder;
  const next = `${value.slice(0, selectionStart)}${before}${content}${after}${value.slice(selectionEnd)}`;
  const cursorStart = selectionStart + before.length;
  const cursorEnd = cursorStart + content.length;
  return { value: next, selectionStart: cursorStart, selectionEnd: cursorEnd };
}

/**
 * Produces a link insertion from the current selection: `[text](url)`, with
 * the URL placeholder pre-selected so the user can immediately type it.
 */
function insertLink(textarea: HTMLTextAreaElement): {
  value: string;
  selectionStart: number;
  selectionEnd: number;
} {
  const { value, selectionStart, selectionEnd } = textarea;
  const selected = value.slice(selectionStart, selectionEnd) || 'text';
  const urlPlaceholder = 'https://';
  const snippet = `[${selected}](${urlPlaceholder})`;
  const next = `${value.slice(0, selectionStart)}${snippet}${value.slice(selectionEnd)}`;
  const urlStart = selectionStart + selected.length + 3; // `[${selected}](`
  const urlEnd = urlStart + urlPlaceholder.length;
  return { value: next, selectionStart: urlStart, selectionEnd: urlEnd };
}

/**
 * Datagrid cell renderer for Markdown rich-text content.
 *
 * Stores GitHub-Flavored Markdown source as a plain string. In display mode
 * the markdown is rendered via `react-markdown` with `remark-gfm`, supporting
 * tables, strikethrough, task lists, and autolinked URLs. Edit mode presents
 * a small toolbar and textarea with the following keyboard shortcuts:
 *
 * - `Ctrl/Cmd+B` — wrap selection in `**…**` (bold)
 * - `Ctrl/Cmd+I` — wrap selection in `*…*` (italic)
 * - `Ctrl/Cmd+K` — insert `[selected](https://)` with the URL selected
 * - `Escape`    — cancel editing (discard draft)
 *
 * Editing commits on blur. Newlines are allowed in the textarea.
 *
 * @typeParam TData - Row data shape.
 * @param props - The component props conforming to {@link RichTextCellProps}.
 * @returns A React element rendering markdown output or a textarea editor.
 *
 * @example
 * ```tsx
 * <RichTextCell
 *   value="**Hello** *world*"
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
  // Coerce the cell value into a markdown string.
  const rawMarkdown = value != null ? String(value) : '';
  const [draft, setDraft] = useState(rawMarkdown);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) {
      setDraft(rawMarkdown);
      setShowPreview(false);
      textareaRef.current?.focus();
    }
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Applies a wrap/insert to the textarea selection, updates the draft, and
   * restores the caret position so keyboard-driven editing feels native.
   */
  const applyTransform = useCallback(
    (transform: (ta: HTMLTextAreaElement) => { value: string; selectionStart: number; selectionEnd: number }) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const next = transform(ta);
      setDraft(next.value);
      // Restore selection after React re-renders the controlled textarea.
      requestAnimationFrame(() => {
        if (!textareaRef.current) return;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(next.selectionStart, next.selectionEnd);
      });
    },
    [],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      onCancel();
      return;
    }
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    const key = e.key.toLowerCase();
    if (key === 'b') {
      e.preventDefault();
      applyTransform((ta) => wrapSelection(ta, '**', '**', 'bold text'));
    } else if (key === 'i') {
      e.preventDefault();
      applyTransform((ta) => wrapSelection(ta, '*', '*', 'italic text'));
    } else if (key === 'k') {
      e.preventDefault();
      applyTransform(insertLink);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    // Ignore blur events caused by clicking one of the in-editor toolbar buttons;
    // those re-focus the textarea via applyTransform.
    const next = e.relatedTarget as HTMLElement | null;
    if (next && next.dataset?.richtextToolbar === 'true') return;
    onCommit(draft);
  };

  // Display mode: render markdown via react-markdown + remark-gfm.
  if (!isEditing) {
    const plainText = markdownToPlainText(rawMarkdown);
    return (
      <div style={styles.displayContainer} title={plainText}>
        {rawMarkdown ? (
          <div style={styles.markdownBody} data-testid="richtext-rendered">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{rawMarkdown}</ReactMarkdown>
          </div>
        ) : (
          <span style={styles.placeholderText}>{column.placeholder ?? 'No content'}</span>
        )}
      </div>
    );
  }

  // Edit mode: toolbar + textarea, with optional preview.
  return (
    <div style={styles.editorWrapper}>
      <div style={styles.toolbar} role="toolbar" aria-label="Rich text formatting">
        <button
          type="button"
          data-richtext-toolbar="true"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyTransform((ta) => wrapSelection(ta, '**', '**', 'bold text'))}
          style={{ ...styles.toolbarButton, fontWeight: 'bold' }}
          aria-label="Bold (Ctrl+B)"
          title="Bold (Ctrl+B)"
        >
          B
        </button>
        <button
          type="button"
          data-richtext-toolbar="true"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyTransform((ta) => wrapSelection(ta, '*', '*', 'italic text'))}
          style={{ ...styles.toolbarButton, fontStyle: 'italic' }}
          aria-label="Italic (Ctrl+I)"
          title="Italic (Ctrl+I)"
        >
          I
        </button>
        <button
          type="button"
          data-richtext-toolbar="true"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyTransform((ta) => wrapSelection(ta, '~~', '~~', 'strikethrough'))}
          style={{ ...styles.toolbarButton, textDecoration: 'line-through' }}
          aria-label="Strikethrough"
          title="Strikethrough"
        >
          S
        </button>
        <button
          type="button"
          data-richtext-toolbar="true"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyTransform((ta) => wrapSelection(ta, '`', '`', 'code'))}
          style={{ ...styles.toolbarButton, fontFamily: 'monospace' }}
          aria-label="Inline code"
          title="Inline code"
        >
          {'</>'}
        </button>
        <button
          type="button"
          data-richtext-toolbar="true"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyTransform(insertLink)}
          style={styles.toolbarButton}
          aria-label="Insert link (Ctrl+K)"
          title="Insert link (Ctrl+K)"
        >
          Link
        </button>
        <button
          type="button"
          data-richtext-toolbar="true"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShowPreview((prev) => !prev)}
          style={{ ...styles.toolbarButton, ...styles.toolbarToggle }}
          aria-pressed={showPreview}
          aria-label={showPreview ? 'Edit source' : 'Show preview'}
          title={showPreview ? 'Edit source' : 'Show preview'}
        >
          {showPreview ? 'Edit' : 'Preview'}
        </button>
      </div>
      {showPreview ? (
        <div style={styles.preview} data-testid="richtext-preview">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft || '*Nothing to preview*'}</ReactMarkdown>
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={column.placeholder ?? 'Enter markdown...'}
          style={styles.textarea}
          aria-label="Markdown editor"
        />
      )}
    </div>
  );
}) as <TData = Record<string, unknown>>(props: RichTextCellProps<TData>) => React.ReactElement;
