/**
 * MUI sub-grid cell renderer for the datagrid.
 *
 * @module MuiSubGridCell
 * @packageDocumentation
 */
import React, { useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import type { CellValue, ColumnDef } from '@istracked/datagrid-core';
import type { CellRendererProps } from '@istracked/datagrid-react';
import { subGridTable, tableHeader, tableCell } from './MuiSubGridCell.styles';

function parseRows(value: CellValue): Record<string, unknown>[] {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  return [];
}

/**
 * MUI-based sub-grid cell renderer using Accordion pattern.
 */
export function MuiSubGridCell<TData = Record<string, unknown>>({
  value,
  column,
}: CellRendererProps<TData>) {
  const rows = parseRows(value);
  const [expanded, setExpanded] = useState(false);

  const subGridColumns = column.subGridColumns ?? [];
  const rowKey = column.subGridRowKey ?? 'id';
  const nestingLevel = (column as ColumnDef<TData> & { nestingLevel?: number }).nestingLevel ?? 0;

  return (
    <Box sx={{ pl: nestingLevel * 2 }}>
      <Accordion
        expanded={expanded}
        onChange={(_e, isExpanded) => setExpanded(isExpanded)}
        disableGutters
        elevation={0}
        sx={{
          '&:before': { display: 'none' },
          backgroundColor: 'transparent',
        }}
      >
        <AccordionSummary
          expandIcon={
            <Box component="span" sx={{ fontSize: 12, transition: 'transform 0.15s' }}>
              &#9654;
            </Box>
          }
          sx={{ minHeight: 0, px: 0, '& .MuiAccordionSummary-content': { margin: 0, gap: 1 } }}
        >
          <Chip label={rows.length} size="small" sx={{ fontSize: 11, fontWeight: 600, height: 20 }} />
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0, mt: 0.5 }}>
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
            {/* Render a simple table for the sub-grid data */}
            <table style={subGridTable}>
              <thead>
                <tr>
                  {subGridColumns.map((col: ColumnDef) => (
                    <th
                      key={col.field}
                      style={tableHeader}
                    >
                      {col.title ?? col.field}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={String(row[rowKey] ?? idx)}>
                    {subGridColumns.map((col: ColumnDef) => (
                      <td key={col.field} style={tableCell}>
                        {String(row[col.field] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
