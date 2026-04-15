import React from 'react';
import { createRoot } from 'react-dom/client';
import { DataGrid } from '@istracked/datagrid-react';
import type { ColumnDef, CellValue, GhostRowConfig, ContextMenuConfig, SelectionMode } from '@istracked/datagrid-core';
import { makeEmployees, defaultColumns, departmentOptions, Employee } from '../data';
import { allCellRenderers, EventLog, pageStyle, gridContainer, toolbarStyle, btnStyle, btnActiveStyle, labelStyle } from '../helpers';

// ---------------------------------------------------------------------------
// Custom theme token map
// ---------------------------------------------------------------------------

const customTheme = {
  '--dg-primary-color': '#7c3aed',
  '--dg-bg-color': '#faf5ff',
  '--dg-text-color': '#1e1b4b',
  '--dg-border-color': '#ddd6fe',
  '--dg-header-bg': '#ede9fe',
  '--dg-selection-color': '#7c3aed',
  '--dg-hover-bg': '#f5f3ff',
};

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function App() {
  const [editLog, setEditLog] = React.useState<string[]>([]);
  const [theme, setTheme] = React.useState<'light' | 'dark' | 'custom'>('light');
  const [selectionMode, setSelectionMode] = React.useState<SelectionMode>('range');
  const [groupByDept, setGroupByDept] = React.useState(false);

  const data = React.useMemo(() => makeEmployees(200), []);

  const dark = theme === 'dark';

  function log(msg: string) {
    setEditLog((prev) => [...prev.slice(-49), msg]);
  }

  // -------------------------------------------------------------------------
  // Columns — all resizable/reorderable + per-field enhancements
  // -------------------------------------------------------------------------

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
    ...(c.field === 'salary'
      ? {
          validate: (v: CellValue) =>
            Number(v) < 30000
              ? { message: 'Salary must be >= $30,000', severity: 'error' as const }
              : null,
        }
      : {}),
  }));

  // -------------------------------------------------------------------------
  // Context menu
  // -------------------------------------------------------------------------

  const contextMenu: ContextMenuConfig = {
    items: [
      { key: 'copy', label: 'Copy', shortcut: 'Ctrl+C', onClick: () => {} },
      { key: 'paste', label: 'Paste', shortcut: 'Ctrl+V', onClick: () => {}, dividerAfter: true },
      { key: 'delete', label: 'Delete Row', danger: true, onClick: ({ rowId }) => log(`Deleted ${rowId}`) },
      {
        key: 'export',
        label: 'Export',
        onClick: () => {},
        children: [
          { key: 'csv', label: 'As CSV', onClick: () => log('Export CSV') },
          { key: 'json', label: 'As JSON', onClick: () => log('Export JSON') },
        ],
      },
    ],
  };

  // -------------------------------------------------------------------------
  // Ghost row
  // -------------------------------------------------------------------------

  const ghostRow: GhostRowConfig<Employee> = {
    position: 'bottom',
    sticky: true,
    placeholder: 'Add new employee...',
    defaultValues: { department: 'Engineering', active: true } as any,
    validate: (v: Partial<Employee>) => (!v.name ? 'Name required' : null),
  };

  // -------------------------------------------------------------------------
  // Grouping config
  // -------------------------------------------------------------------------

  const columnGroups = {
    groups: [
      { id: 'personal', title: 'Personal Info', columns: ['name', 'email', 'city'] },
      { id: 'work', title: 'Work Info', columns: ['department', 'role', 'salary', 'startDate'] },
      { id: 'meta', title: 'Metadata', columns: ['active', 'rating'] },
    ],
    collapsible: true,
  };

  const groupingConfig = groupByDept
    ? {
        rows: { fields: ['department'], defaultExpanded: true, aggregates: { salary: 'avg', rating: 'avg' } },
        columns: columnGroups,
      }
    : { columns: columnGroups };

  // -------------------------------------------------------------------------
  // Theme resolution
  // -------------------------------------------------------------------------

  const resolvedTheme = theme === 'custom' ? customTheme : theme;

  // -------------------------------------------------------------------------
  // Export handlers
  // -------------------------------------------------------------------------

  function exportCsv() {
    const headers = cols.map((c) => c.title ?? c.field).join('\t');
    const rows = data.map((row) =>
      cols.map((c) => String((row as any)[c.field] ?? '')).join('\t'),
    );
    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees.csv';
    a.click();
    URL.revokeObjectURL(url);
    log('Exported CSV');
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees.json';
    a.click();
    URL.revokeObjectURL(url);
    log('Exported JSON');
  }

  // -------------------------------------------------------------------------
  // Dark-mode outer wrapper style
  // -------------------------------------------------------------------------

  const wrapperStyle: React.CSSProperties = {
    ...pageStyle,
    background: dark ? '#0f172a' : undefined,
    color: dark ? '#f1f5f9' : undefined,
    transition: 'all 0.3s',
  };

  const darkBorderStyle: React.CSSProperties = {
    ...gridContainer,
    borderColor: dark ? '#334155' : '#e2e8f0',
  };

  // -------------------------------------------------------------------------
  // Button helpers
  // -------------------------------------------------------------------------

  function btn(label: string, active: boolean, onClick: () => void) {
    const base: React.CSSProperties = dark
      ? {
          ...btnStyle,
          background: active ? '#3b82f6' : '#1e293b',
          color: active ? '#fff' : '#cbd5e1',
          borderColor: dark ? '#334155' : '#e2e8f0',
        }
      : active
      ? btnActiveStyle
      : btnStyle;
    return (
      <button key={label} style={base} onClick={onClick}>
        {label}
      </button>
    );
  }

  const labelStyleDark: React.CSSProperties = dark
    ? { ...labelStyle, color: '#94a3b8' }
    : labelStyle;

  const exportBtnStyle: React.CSSProperties = dark
    ? { ...btnStyle, background: '#1e293b', color: '#cbd5e1', borderColor: '#334155' }
    : btnStyle;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div style={wrapperStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ margin: 0, flex: 1 }}>Kitchen Sink</h2>
        <span
          style={{
            fontSize: 12,
            padding: '2px 10px',
            borderRadius: 12,
            background: dark ? '#1e293b' : '#f1f5f9',
            color: dark ? '#94a3b8' : '#64748b',
            fontWeight: 600,
          }}
        >
          200 rows
        </span>
      </div>

      {/* Toolbar */}
      <div style={toolbarStyle}>
        <span style={labelStyleDark}>Theme:</span>
        {btn('light', theme === 'light', () => setTheme('light'))}
        {btn('dark', theme === 'dark', () => setTheme('dark'))}
        {btn('custom', theme === 'custom', () => setTheme('custom'))}

        <span style={{ width: 1, alignSelf: 'stretch', background: dark ? '#334155' : '#e2e8f0' }} />

        <span style={labelStyleDark}>Selection:</span>
        {btn('cell', selectionMode === 'cell', () => setSelectionMode('cell'))}
        {btn('row', selectionMode === 'row', () => setSelectionMode('row'))}
        {btn('range', selectionMode === 'range', () => setSelectionMode('range'))}
        {btn('none', selectionMode === 'none', () => setSelectionMode('none'))}

        <span style={{ width: 1, alignSelf: 'stretch', background: dark ? '#334155' : '#e2e8f0' }} />

        <span style={labelStyleDark}>Grouping:</span>
        {btn('Group by Dept', groupByDept, () => setGroupByDept((v) => !v))}

        <span style={{ width: 1, alignSelf: 'stretch', background: dark ? '#334155' : '#e2e8f0' }} />

        <button style={exportBtnStyle} onClick={exportCsv}>
          Export CSV
        </button>
        <button style={exportBtnStyle} onClick={exportJson}>
          Export JSON
        </button>
      </div>

      {/* Grid */}
      <div style={darkBorderStyle}>
        <DataGrid
          data={data}
          columns={cols as any}
          rowKey="id"
          cellRenderers={allCellRenderers}
          theme={resolvedTheme as any}
          sorting={{ mode: 'multi' }}
          filtering={{ debounceMs: 200 }}
          selectionMode={selectionMode}
          keyboardNavigation
          contextMenu={contextMenu}
          ghostRow={ghostRow as any}
          showColumnVisibilityMenu
          showColumnMenu
          showGroupControls
          grouping={groupingConfig as any}
          chrome={{
            controls: {
              width: 80,
              actions: [
                { key: 'view', label: 'View', onClick: (rowId: string, rowIndex: number) => log(`View row ${rowId} (index ${rowIndex})`) },
                { key: 'delete', label: 'Del', onClick: (rowId: string) => log(`Delete row ${rowId}`) },
              ],
            },
            rowNumbers: { reorderable: true },
          }}
          onRowReorder={({ sourceRowId, targetRowId }: { sourceRowId: string; targetRowId: string }) => log(`Reorder: ${sourceRowId} → ${targetRowId}`)}
          onCellEdit={(rowId, field, value, prev) =>
            log(`[${rowId}].${field}: ${String(prev)} → ${String(value)}`)
          }
          onRowAdd={(row) => log(`+ Row: ${JSON.stringify(row).slice(0, 80)}`)}
          onSortChange={(sort) => log(`Sort: ${JSON.stringify(sort)}`)}
          onSelectionChange={(range) => log(`Select: ${JSON.stringify(range)}`)}
          onColumnResize={(field, width) => log(`Resize: ${field} → ${width}px`)}
          onColumnReorder={(field, idx) => log(`Reorder: ${field} → index ${idx}`)}
          onColumnVisibilityChange={(field, visible) => log(`Visibility: ${field} = ${visible}`)}
          onColumnFreeze={(field, pos) => log(`Freeze: ${field} = ${pos}`)}
        />
      </div>

      {/* Event log */}
      <EventLog entries={editLog} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
