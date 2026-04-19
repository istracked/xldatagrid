import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MuiDataGrid } from '@istracked/datagrid-mui';
import { storyContainer, gridContainer } from './helpers';
import * as styles from './stories.styles';

// ---------------------------------------------------------------------------
// ColumnConfig showcase — exercises four new optional ColumnDef fields:
// `borderRight`, `highlightColor`, `readOnly`, and `skipNavigation`, plus the
// row-number chrome column redesign (body-matching background, muted text).
//
// Kept self-contained (no `stories/data.ts` dependency) so the fixture reads
// as a single-file contract for the Playwright spec at
// `e2e/column-config.spec.ts`.
// ---------------------------------------------------------------------------

const meta: Meta = {
  title: 'Examples/Column Config',
};
export default meta;

interface EmployeeRow {
  id: string;
  name: string;
  dept: string;
  status: string;
  salary: string;
  notes: string;
}

function makeEmployees(count: number): EmployeeRow[] {
  const names = ['Alice', 'Bob', 'Carol', 'Dan', 'Eve', 'Frank', 'Grace', 'Heidi'];
  const depts = ['Engineering', 'Design', 'Marketing', 'Sales'];
  const statuses = ['Active', 'On Leave', 'Remote'];
  const rows: EmployeeRow[] = [];
  for (let i = 0; i < count; i += 1) {
    rows.push({
      id: String(i + 1),
      name: names[i % names.length] ?? `Person ${i + 1}`,
      dept: depts[i % depts.length] ?? 'Engineering',
      status: statuses[i % statuses.length] ?? 'Active',
      salary: `$${(50 + i * 5).toLocaleString()},000`,
      notes: `Row ${i + 1} notes`,
    });
  }
  return rows;
}

// The cast to `any` mirrors Selection.stories.tsx — the new borderRight /
// highlightColor / readOnly / skipNavigation fields do not yet exist on
// `ColumnDef`, so the plain shape is opaque to the compiler until the
// feature lands.
const columns = [
  { id: 'id',     field: 'id',     title: 'ID',     width: 80,  skipNavigation: true },
  { id: 'name',   field: 'name',   title: 'Name',   width: 160 },
  { id: 'dept',   field: 'dept',   title: 'Dept',   width: 140, highlightColor: '#fef3c7' },
  { id: 'status', field: 'status', title: 'Status', width: 120, borderRight: false },
  { id: 'salary', field: 'salary', title: 'Salary', width: 120, readOnly: true },
  {
    id: 'notes',
    field: 'notes',
    title: 'Notes',
    width: 220,
    borderRight: { color: '#8b5cf6', width: 2, style: 'dashed' },
  },
];

export const ColumnConfigShowcase: StoryObj = {
  parameters: {
    docs: {
      description: {
        story:
          'Showcase of the per-column configuration surface: `borderRight` (false or custom object), `highlightColor` (Excel-style tinted column that overlays selection highlights), `readOnly` (blocks beginEdit regardless of the grid-level flag), and `skipNavigation` (click + keyboard navigation skips the column). The row-number chrome gutter also adopts its redesigned body-matching background with muted text.',
      },
    },
  },
  render: () => {
    const rows = makeEmployees(8);
    return (
      <div style={storyContainer}>
        <h2 style={styles.heading}>Column Config Showcase</h2>
        <p style={styles.subtitle}>
          Four new per-column knobs demonstrated side-by-side plus the
          redesigned row-number chrome column (body-matching background,
          muted text, subtle right border).
        </p>
        <div style={gridContainer}>
          <MuiDataGrid
            data={rows}
            columns={columns as any}
            rowKey="id"
            selectionMode="range"
            keyboardNavigation
            chrome={{ rowNumbers: true }}
            shiftArrowBehavior="rangeSelect"
          />
        </div>
      </div>
    );
  },
};
