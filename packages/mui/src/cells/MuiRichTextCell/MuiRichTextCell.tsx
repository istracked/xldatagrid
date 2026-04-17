/**
 * MUI rich text cell renderer for the datagrid.
 *
 * @module MuiRichTextCell
 * @packageDocumentation
 */
import React from 'react';
import DOMPurify from 'dompurify';
import Box from '@mui/material/Box';
import type { CellRendererProps } from '@istracked/datagrid-react';
import { useDraftState } from '@istracked/datagrid-react';
import { htmlTextarea } from './MuiRichTextCell.styles';

function htmlToPlainText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * MUI-based rich text cell renderer using Box with dangerouslySetInnerHTML.
 */
export const MuiRichTextCell = React.memo(function MuiRichTextCell<TData = Record<string, unknown>>({
  value,
  column,
  isEditing,
  onCommit,
  onCancel,
}: CellRendererProps<TData>) {
  const rawHtml = value != null ? String(value) : '';
  const safeHtml = DOMPurify.sanitize(rawHtml);
  const { draft, setDraft, inputRef, handleBlur } = useDraftState({
    initialValue: rawHtml,
    isEditing,
    onCommit: onCommit as (value: unknown) => void,
    onCancel,
  });

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
      ref={inputRef as React.RefObject<HTMLTextAreaElement>}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
      }}
      onBlur={handleBlur}
      placeholder={column.placeholder ?? 'Enter HTML content...'}
      style={htmlTextarea}
    />
  );
}) as <TData = Record<string, unknown>>(props: CellRendererProps<TData>) => React.ReactElement;
