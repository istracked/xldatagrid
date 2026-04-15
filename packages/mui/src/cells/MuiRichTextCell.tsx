/**
 * MUI rich text cell renderer for the datagrid.
 *
 * @module MuiRichTextCell
 * @packageDocumentation
 */
import React, { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import type { CellValue } from '@istracked/datagrid-core';
import type { CellRendererProps } from '@istracked/datagrid-react';
import { htmlTextarea } from './MuiRichTextCell.styles';

function stripScripts(html: string): string {
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

function htmlToPlainText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * MUI-based rich text cell renderer using Box with dangerouslySetInnerHTML.
 */
export function MuiRichTextCell<TData = Record<string, unknown>>({
  value,
  column,
  isEditing,
  onCommit,
  onCancel,
}: CellRendererProps<TData>) {
  const rawHtml = value != null ? String(value) : '';
  const safeHtml = stripScripts(rawHtml);
  const [draft, setDraft] = useState(rawHtml);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) {
      setDraft(rawHtml);
      textareaRef.current?.focus();
    }
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isEditing) {
    const plainText = htmlToPlainText(safeHtml);
    return (
      <Box
        sx={{ overflow: 'hidden', maxHeight: 40, fontSize: 13, lineHeight: 1.4 }}
        title={plainText}
      >
        {safeHtml ? (
          <span dangerouslySetInnerHTML={{ __html: safeHtml }} />
        ) : (
          <Box component="span" sx={{ color: 'text.secondary' }}>
            {column.placeholder ?? 'No content'}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <textarea
      ref={textareaRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
      }}
      onBlur={() => onCommit(draft)}
      placeholder={column.placeholder ?? 'Enter HTML content...'}
      style={htmlTextarea}
    />
  );
}
