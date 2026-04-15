import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataGrid } from '@istracked/datagrid-react';
import type { ColumnDef, CellValue, GhostRowConfig, ContextMenuConfig } from '@istracked/datagrid-core';
import { makeEmployees, defaultColumns, departmentOptions, Employee } from './data';
import { allCellRenderers, storyContainer, gridContainer } from './helpers';
import * as styles from './stories.styles';

const meta: Meta = {
  title: 'Pages/Kitchen Sink',
};
export default meta;

export const EverythingAtOnce: StoryObj = {
  render: () => {
    const [editLog, setEditLog] = useState<string[]>([]);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const dark = theme === 'dark';

    const cols: ColumnDef<Employee>[] = defaultColumns.map((c) => ({
      ...c,
      resizable: true,
      reorderable: true,
      ...(c.field === 'name'
        ? {
            frozen: 'left' as const,
            validate: (v: CellValue) =>
              !v || String(v).trim().length < 2
                ? { message: 'Min 2 characters', severity: 'error' as const }
                : null,
          }
        : {}),
      ...(c.field === 'email'
        ? {
            validate: (v: CellValue) =>
              v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v))
                ? { message: 'Invalid email', severity: 'error' as const }
                : null,
          }
        : {}),
    }));

    const contextMenu: ContextMenuConfig = {
      items: [
        { key: 'copy', label: 'Copy', shortcut: 'Ctrl+C', onClick: () => {} },
        { key: 'paste', label: 'Paste', shortcut: 'Ctrl+V', onClick: () => {}, dividerAfter: true },
        { key: 'delete', label: 'Delete Row', danger: true, onClick: ({ rowId }) => setEditLog((p) => [...p.slice(-9), `Deleted ${rowId}`]) },
      ],
    };

    const ghostRow: GhostRowConfig<Employee> = {
      position: 'bottom',
      sticky: true,
      placeholder: 'Add new employee...',
      defaultValues: { department: 'Engineering', active: true } as any,
      validate: (v: Partial<Employee>) => (!v.name ? 'Name required' : null),
    };

    return (
      <div style={{ ...storyContainer, ...styles.kitchenSinkWrapper(dark) }}>
        <div style={styles.flexRowCenterWide}>
          <h2 style={styles.headingFlex}>Kitchen Sink</h2>
          <button onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))} style={styles.kitchenSinkBtnStyle(dark)}>
            {dark ? 'Light' : 'Dark'} Mode
          </button>
        </div>
        <p style={styles.kitchenSinkSubtitle(dark)}>
          Sorting (multi, shift-click) | Filtering | Cell/range selection | Inline editing with validation |
          Ghost row (sticky bottom) | Undo/Redo | Column resize, reorder, freeze, visibility, menu |
          Context menu | Keyboard navigation | Theming | Chrome columns (controls + row numbers)
        </p>

        <div style={{ ...gridContainer, ...styles.kitchenSinkGridBorder(dark) }}>
          <DataGrid
            data={makeEmployees(100)}
            columns={cols as any}
            rowKey="id"
            cellRenderers={allCellRenderers}
            theme={theme}
            sorting={{ mode: 'multi' }}
            filtering={{ debounceMs: 200 }}
            selectionMode="range"
            keyboardNavigation
            contextMenu={contextMenu}
            ghostRow={ghostRow as any}
            showColumnVisibilityMenu
            showColumnMenu
            showGroupControls
            chrome={{
              controls: {
                width: 80,
                actions: [
                  { key: 'view', label: 'View', onClick: (rowId: string, rowIndex: number) => setEditLog((p) => [...p.slice(-9), `View row ${rowId} (index ${rowIndex})`]) },
                  { key: 'delete', label: 'Del', onClick: (rowId: string) => setEditLog((p) => [...p.slice(-9), `Delete row ${rowId}`]) },
                ],
              },
              rowNumbers: { reorderable: true },
            }}
            onRowReorder={({ sourceRowId, targetRowId }: { sourceRowId: string; targetRowId: string }) => setEditLog((p) => [...p.slice(-9), `Reorder: ${sourceRowId} → ${targetRowId}`])}
            onCellEdit={(rowId, field, value, prev) =>
              setEditLog((p) => [...p.slice(-9), `[${rowId}].${field}: ${String(prev)} → ${String(value)}`])
            }
            onRowAdd={(row) => setEditLog((p) => [...p.slice(-9), `+ Row added: ${JSON.stringify(row).slice(0, 80)}`])}
          />
        </div>

        <pre style={styles.kitchenSinkLogPre(dark)}>
          {editLog.length ? editLog.join('\n') : '(interact with the grid to see events)'}
        </pre>
      </div>
    );
  },
};

// ---------------------------------------------------------------------------
// Grouped Kitchen Sink
// ---------------------------------------------------------------------------

export const GroupedKitchenSink: StoryObj = {
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Grouped Kitchen Sink</h2>
      <p style={styles.kitchenSinkGroupedSubtitle}>
        Row grouping by department with aggregates + column groups + sorting + filtering + editing + ghost row.
      </p>
      <div style={gridContainer}>
        <DataGrid
          data={makeEmployees(60)}
          columns={(defaultColumns.map((c) => ({ ...c, resizable: true }))) as any}
          rowKey="id"
          cellRenderers={allCellRenderers}
          grouping={{
            rows: {
              fields: ['department'],
              defaultExpanded: true,
              aggregates: { salary: 'avg', rating: 'avg' },
            },
            columns: {
              groups: [
                { id: 'personal', title: 'Personal Info', columns: ['name', 'email', 'city'] },
                { id: 'work', title: 'Work Info', columns: ['department', 'role', 'salary', 'startDate'] },
                { id: 'meta', title: 'Metadata', columns: ['active', 'rating'] },
              ],
              collapsible: true,
            },
          }}
          sorting={{ mode: 'multi' }}
          filtering
          selectionMode="cell"
          keyboardNavigation
          ghostRow={{ position: 'bottom', placeholder: 'New employee...' } as any}
          showGroupControls
          showColumnVisibilityMenu
        />
      </div>
    </div>
  ),
};
