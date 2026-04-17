import React from 'react';
import { createRoot } from 'react-dom/client';
import { MuiDataGrid } from '@istracked/datagrid-mui';
import type { ColumnDef, CellValue, GhostRowConfig, ContextMenuConfig, SelectionMode } from '@istracked/datagrid-core';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import LightMode from '@mui/icons-material/LightMode';
import DarkMode from '@mui/icons-material/DarkMode';
import Palette from '@mui/icons-material/Palette';
import FilterList from '@mui/icons-material/FilterList';
import Sort from '@mui/icons-material/Sort';
import Download from '@mui/icons-material/Download';
import GridView from '@mui/icons-material/GridView';
import ViewColumn from '@mui/icons-material/ViewColumn';
import Undo from '@mui/icons-material/Undo';
import Redo from '@mui/icons-material/Redo';
import { makeEmployees, defaultColumns, departmentOptions, Employee } from '../data';
import { EventLog } from '../helpers';
import * as Sections from './sections';

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
// Sections list
// ---------------------------------------------------------------------------

const sections = [
  { id: 'mega-grid', title: 'Mega Grid', component: MegaGridSection },
  { id: 'cell-types', title: 'All Cell Types', component: Sections.CellTypesSection },
  { id: 'actions-column', title: 'Actions Column', component: Sections.ActionsColumnSection },
  { id: 'sort-single', title: 'Single Sort', component: Sections.SortSingleSection },
  { id: 'sort-multi', title: 'Multi Sort', component: Sections.SortMultiSection },
  { id: 'filtering', title: 'Filtering', component: Sections.FilteringSection },
  { id: 'selection', title: 'Selection Modes', component: Sections.SelectionSection },
  { id: 'edit-validation', title: 'Editing + Validation', component: Sections.EditValidationSection },
  { id: 'undo-redo', title: 'Undo / Redo', component: Sections.UndoRedoSection },
  { id: 'clipboard', title: 'Clipboard', component: Sections.ClipboardSection },
  { id: 'col-resize-reorder', title: 'Resize & Reorder', component: Sections.ColResizeReorderSection },
  { id: 'col-visibility', title: 'Column Visibility', component: Sections.ColVisibilitySection },
  { id: 'col-freeze', title: 'Frozen Columns', component: Sections.ColFreezeSection },
  { id: 'col-menu', title: 'Column Menu', component: Sections.ColMenuSection },
  { id: 'ghost-row', title: 'Ghost Row', component: Sections.GhostRowSection },
  { id: 'grouping-row', title: 'Row Grouping', component: Sections.GroupingRowSection },
  { id: 'grouping-multi', title: 'Multi-Level Grouping', component: Sections.GroupingMultiSection },
  { id: 'grouping-column', title: 'Column Grouping', component: Sections.GroupingColumnSection },
  { id: 'master-detail', title: 'Master-Detail', component: Sections.MasterDetailSection },
  { id: 'context-menu', title: 'Context Menu', component: Sections.ContextMenuSection },
  { id: 'keyboard-nav', title: 'Keyboard Navigation', component: Sections.KeyboardNavSection },
  { id: 'theming', title: 'Theming', component: Sections.ThemingSection },
  { id: 'transposed', title: 'Transposed Grid', component: Sections.TransposedSection },
  { id: 'virtualization', title: 'Virtualization (500)', component: Sections.VirtualizationSection },
  { id: 'extensions', title: 'Extensions', component: Sections.ExtensionsSection },
  { id: 'empty-state', title: 'Empty State', component: Sections.EmptyStateSection },
  { id: 'read-only', title: 'Read-Only', component: Sections.ReadOnlySection },
  { id: 'chrome-columns', title: 'Chrome Columns', component: Sections.ChromeColumnsSection },
];

// ---------------------------------------------------------------------------
// Sidebar styles (kept as basic CSS)
// ---------------------------------------------------------------------------

const sidebarStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, bottom: 0, width: 220,
  background: '#f8fafc', borderRight: '1px solid #e2e8f0',
  display: 'flex', flexDirection: 'column', zIndex: 10,
};
const sidebarTitleStyle: React.CSSProperties = {
  padding: '20px 16px 12px', fontWeight: 700, fontSize: 16,
  borderBottom: '1px solid #e2e8f0',
};
const sidebarNavStyle: React.CSSProperties = {
  flex: 1, overflowY: 'auto', padding: '8px 0',
};
const navLinkStyle: React.CSSProperties = {
  display: 'block', padding: '6px 16px', fontSize: 13,
  color: '#64748b', textDecoration: 'none',
};
const navLinkActiveStyle: React.CSSProperties = {
  ...navLinkStyle, color: '#1e293b', fontWeight: 600,
  borderLeft: '3px solid #3b82f6', paddingLeft: 13,
};
const mainStyle: React.CSSProperties = {
  marginLeft: 220, padding: 24,
  display: 'flex', flexDirection: 'column', gap: 48,
};

// ---------------------------------------------------------------------------
// Mega Grid Section (the "everything at once" stress test)
// ---------------------------------------------------------------------------

function MegaGridSection() {
  const [editLog, setEditLog] = React.useState<string[]>([]);
  const [theme, setTheme] = React.useState<'light' | 'dark' | 'custom'>('light');
  const [selectionMode, setSelectionMode] = React.useState<SelectionMode>('range');
  const [groupByDept, setGroupByDept] = React.useState(false);

  const data = React.useMemo(() => makeEmployees(200), []);

  const dark = theme === 'dark';

  function log(msg: string) {
    setEditLog((prev) => [...prev.slice(-49), msg]);
  }

  // Columns
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

  // Context menu
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

  // Ghost row
  const ghostRow: GhostRowConfig<Employee> = {
    position: 'bottom',
    sticky: true,
    placeholder: 'Add new employee...',
    defaultValues: { department: 'Engineering', active: true } as any,
    validate: (v: Partial<Employee>) => (!v.name ? 'Name required' : null),
  };

  // Grouping config
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

  // Theme resolution
  const resolvedTheme = theme === 'custom' ? customTheme : theme;

  // Export handlers
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

  // Theme icon map
  const themeIcons: Record<string, React.ReactNode> = {
    light: <LightMode fontSize="small" />,
    dark: <DarkMode fontSize="small" />,
    custom: <Palette fontSize="small" />,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>
          Mega Grid
        </Typography>
        <Chip label="200 rows" size="small" variant="outlined" />
      </Box>

      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
          Theme:
        </Typography>
        <ToggleButtonGroup
          value={theme}
          exclusive
          onChange={(_, val) => { if (val) setTheme(val); }}
          size="small"
        >
          <ToggleButton value="light"><LightMode fontSize="small" sx={{ mr: 0.5 }} />light</ToggleButton>
          <ToggleButton value="dark"><DarkMode fontSize="small" sx={{ mr: 0.5 }} />dark</ToggleButton>
          <ToggleButton value="custom"><Palette fontSize="small" sx={{ mr: 0.5 }} />custom</ToggleButton>
        </ToggleButtonGroup>

        <Divider orientation="vertical" flexItem />

        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
          Selection:
        </Typography>
        <ToggleButtonGroup
          value={selectionMode}
          exclusive
          onChange={(_, val) => { if (val) setSelectionMode(val); }}
          size="small"
        >
          <ToggleButton value="cell">cell</ToggleButton>
          <ToggleButton value="row">row</ToggleButton>
          <ToggleButton value="range">range</ToggleButton>
          <ToggleButton value="none">none</ToggleButton>
        </ToggleButtonGroup>

        <Divider orientation="vertical" flexItem />

        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
          Grouping:
        </Typography>
        <ToggleButtonGroup
          value={groupByDept ? 'on' : 'off'}
          exclusive
          onChange={() => setGroupByDept((v) => !v)}
          size="small"
        >
          <ToggleButton value="on">
            <ViewColumn fontSize="small" sx={{ mr: 0.5 }} />
            Group by Dept
          </ToggleButton>
        </ToggleButtonGroup>

        <Divider orientation="vertical" flexItem />

        <Button variant="outlined" size="small" startIcon={<Download />} onClick={exportCsv}>
          Export CSV
        </Button>
        <Button variant="outlined" size="small" startIcon={<Download />} onClick={exportJson}>
          Export JSON
        </Button>
      </Box>

      {/* Grid */}
      <Paper
        variant="outlined"
        sx={{
          height: 500,
          overflow: 'hidden',
          borderRadius: 2,
          ...(dark ? { background: '#0f172a', borderColor: '#334155' } : {}),
        }}
      >
        <MuiDataGrid
          data={data}
          columns={cols as any}
          rowKey="id"
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
            rowNumbers: { position: 'left' },
          }}
          onRowReorder={({ sourceRowId, targetRowId }: { sourceRowId: string; targetRowId: string }) => log(`Reorder: ${sourceRowId} -> ${targetRowId}`)}
          onCellEdit={(rowId, field, value, prev) =>
            log(`[${rowId}].${field}: ${String(prev)} -> ${String(value)}`)
          }
          onRowAdd={(row) => log(`+ Row: ${JSON.stringify(row).slice(0, 80)}`)}
          onSortChange={(sort) => log(`Sort: ${JSON.stringify(sort)}`)}
          onSelectionChange={(range) => log(`Select: ${JSON.stringify(range)}`)}
          onColumnResize={(field, width) => log(`Resize: ${field} -> ${width}px`)}
          onColumnReorder={(field, idx) => log(`Reorder: ${field} -> index ${idx}`)}
          onColumnVisibilityChange={(field, visible) => log(`Visibility: ${field} = ${visible}`)}
          onColumnFreeze={(field, pos) => log(`Freeze: ${field} = ${pos}`)}
        />
      </Paper>

      {/* Event log */}
      <EventLog entries={editLog} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function App() {
  const [activeId, setActiveId] = React.useState(sections[0].id);

  // IntersectionObserver to track which section is currently visible
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Sidebar */}
      <nav style={sidebarStyle}>
        <div style={sidebarTitleStyle}>Kitchen Sink</div>
        <div style={sidebarNavStyle}>
          {sections.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              style={s.id === activeId ? navLinkActiveStyle : navLinkStyle}
            >
              {s.title}
            </a>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main style={mainStyle}>
        {sections.map(s => (
          <section key={s.id} id={s.id} data-testid={`section-${s.id}`}>
            <s.component />
          </section>
        ))}
      </main>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
