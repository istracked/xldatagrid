/**
 * MUI rich text cell renderer for the datagrid.
 *
 * The cell stores GitHub-Flavored Markdown source as a plain string. Display
 * mode renders the markdown via `react-markdown` + `remark-gfm`. Edit mode
 * provides a small MUI-styled toolbar plus a textarea with GFM keyboard
 * shortcuts (Ctrl/Cmd+B bold, Ctrl/Cmd+I italic, Ctrl/Cmd+K link) and an
 * optional preview toggle. No upload UI is rendered.
 *
 * @module MuiRichTextCell
 * @packageDocumentation
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import ToggleButton from '@mui/material/ToggleButton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { CellRendererProps } from '@istracked/datagrid-react';
import { editorTextarea } from './MuiRichTextCell.styles';

function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/([*_~]){1,3}([^*_~]+)\1{1,3}/g, '$2')
    .replace(/^\s{0,3}(?:#{1,6}|[-*+]|\d+\.)\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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
  const urlStart = selectionStart + selected.length + 3;
  const urlEnd = urlStart + urlPlaceholder.length;
  return { value: next, selectionStart: urlStart, selectionEnd: urlEnd };
}

const toolbarButtonSx = {
  minWidth: 28,
  px: 0.5,
  py: 0,
  fontSize: 12,
  lineHeight: 1.2,
  textTransform: 'none',
} as const;

/**
 * MUI-based markdown rich-text cell renderer.
 *
 * Stores GitHub-Flavored Markdown and renders it through `react-markdown`.
 * The edit mode surfaces an MUI toolbar for the common GFM formatting
 * primitives, plus a preview toggle. Image uploads and file attachments are
 * not supported.
 */
export const MuiRichTextCell = React.memo(function MuiRichTextCell<TData = Record<string, unknown>>({
  value,
  column,
  isEditing,
  onCommit,
  onCancel,
}: CellRendererProps<TData>) {
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

  const applyTransform = useCallback(
    (transform: (ta: HTMLTextAreaElement) => { value: string; selectionStart: number; selectionEnd: number }) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const next = transform(ta);
      setDraft(next.value);
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
    const next = e.relatedTarget as HTMLElement | null;
    if (next && next.dataset?.richtextToolbar === 'true') return;
    onCommit(draft);
  };

  if (!isEditing) {
    const plainText = markdownToPlainText(rawMarkdown);
    return (
      <Box
        sx={{ overflow: 'hidden', maxHeight: 40, fontSize: 13, lineHeight: 1.4 }}
        title={plainText}
      >
        {rawMarkdown ? (
          <Box component="span" data-testid="richtext-rendered">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{rawMarkdown}</ReactMarkdown>
          </Box>
        ) : (
          <Box component="span" sx={{ color: 'text.secondary' }}>
            {column.placeholder ?? 'No content'}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      <Box
        role="toolbar"
        aria-label="Rich text formatting"
        sx={{
          display: 'flex',
          gap: 0.5,
          px: 0.5,
          py: 0.25,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'action.hover',
          flexShrink: 0,
        }}
      >
        <Tooltip title="Bold (Ctrl+B)">
          <Button
            size="small"
            data-richtext-toolbar="true"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyTransform((ta) => wrapSelection(ta, '**', '**', 'bold text'))}
            aria-label="Bold"
            sx={{ ...toolbarButtonSx, fontWeight: 'bold' }}
          >
            B
          </Button>
        </Tooltip>
        <Tooltip title="Italic (Ctrl+I)">
          <Button
            size="small"
            data-richtext-toolbar="true"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyTransform((ta) => wrapSelection(ta, '*', '*', 'italic text'))}
            aria-label="Italic"
            sx={{ ...toolbarButtonSx, fontStyle: 'italic' }}
          >
            I
          </Button>
        </Tooltip>
        <Tooltip title="Strikethrough">
          <Button
            size="small"
            data-richtext-toolbar="true"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyTransform((ta) => wrapSelection(ta, '~~', '~~', 'strikethrough'))}
            aria-label="Strikethrough"
            sx={{ ...toolbarButtonSx, textDecoration: 'line-through' }}
          >
            S
          </Button>
        </Tooltip>
        <Tooltip title="Inline code">
          <Button
            size="small"
            data-richtext-toolbar="true"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyTransform((ta) => wrapSelection(ta, '`', '`', 'code'))}
            aria-label="Inline code"
            sx={{ ...toolbarButtonSx, fontFamily: 'monospace' }}
          >
            {'</>'}
          </Button>
        </Tooltip>
        <Tooltip title="Insert link (Ctrl+K)">
          <Button
            size="small"
            data-richtext-toolbar="true"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyTransform(insertLink)}
            aria-label="Insert link"
            sx={toolbarButtonSx}
          >
            Link
          </Button>
        </Tooltip>
        <ToggleButton
          value="preview"
          size="small"
          selected={showPreview}
          data-richtext-toolbar="true"
          onMouseDown={(e) => e.preventDefault()}
          onChange={() => setShowPreview((prev) => !prev)}
          sx={{ ml: 'auto', py: 0, px: 1, fontSize: 12, textTransform: 'none' }}
          aria-label={showPreview ? 'Edit source' : 'Show preview'}
        >
          {showPreview ? 'Edit' : 'Preview'}
        </ToggleButton>
      </Box>
      {showPreview ? (
        <Box
          sx={{ flex: 1, overflow: 'auto', p: 0.5, fontSize: 13, lineHeight: 1.4 }}
          data-testid="richtext-preview"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft || '*Nothing to preview*'}</ReactMarkdown>
        </Box>
      ) : (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={column.placeholder ?? 'Enter markdown...'}
          style={editorTextarea}
          aria-label="Markdown editor"
        />
      )}
    </Box>
  );
}) as <TData = Record<string, unknown>>(props: CellRendererProps<TData>) => React.ReactElement;
