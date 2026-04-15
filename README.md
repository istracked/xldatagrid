# xldatagrid

A high-performance, fully-featured datagrid component library for React 19. Built as a pnpm monorepo with a framework-agnostic core, a React rendering layer, a plugin-based extension system, and first-class Material UI integration.

---

## Packages

| Package | Description | Version |
|---------|-------------|---------|
| `@istracked/datagrid-core` | Framework-agnostic grid engine: types, state models, sorting, filtering, selection, grouping, editing, clipboard, undo/redo, virtualization, plugin system | 0.1.0 |
| `@istracked/datagrid-react` | React 19 bindings: `<DataGrid>`, hooks, 15 cell renderers, chrome columns, ghost row, master-detail, transposed grid, context menu, keyboard navigation, theming | 0.1.0 |
| `@istracked/datagrid-extensions` | Drop-in extensions: regex validation, cell comments, column resize, CSV/JSON/Excel export | 0.1.0 |
| `@istracked/datagrid-mui` | Material UI adapter: MUI-styled cell renderers for all 15 cell types, theme bridge, `<MuiDataGrid>` convenience wrapper | 0.1.0 |

## Features

### Core Engine

- **Sorting** — Single and multi-column sorting with custom comparators and shift-click stacking
- **Filtering** — Predicate-based column filtering with configurable debounce
- **Selection** — Cell, row, and range selection modes with keyboard extension (Shift/Ctrl)
- **Grouping** — Row grouping (single/multi-level) with aggregates (sum, avg, count, min, max) and collapsible column groups
- **Editing** — Inline cell editing with lifecycle management, validation (sync + regex), and commit/cancel semantics
- **Clipboard** — Copy, cut, and paste integration for single cells and ranges
- **Undo/Redo** — Command-based undo/redo stack tracking all cell edits
- **Virtualization** — Row and column virtualization for datasets of 500+ rows with smooth scrolling
- **Plugin System** — Extension loading and lifecycle orchestration for third-party capabilities
- **Event Bus** — Pub/sub event system for decoupled grid communication
- **Column Model** — Column definition resolution, width calculation, frozen columns, visibility toggling, reordering, and resizing
- **Transposed Grid** — Form-mode grid where rows are fields and columns are entities

### React Components

- **`<DataGrid>`** — Primary grid component with declarative props for all features
- **`<MasterDetail>`** — Expandable row detail panels with lazy-loading support
- **`<TransposedGrid>`** — Entity-per-column form-mode grid
- **`<GhostRow>`** — Inline new-row entry with position variants (top, bottom, sticky, above-header), default values, and validation
- **Context Menu** — Right-click menu with custom items, submenus, keyboard shortcuts, danger actions, and dividers
- **Keyboard Navigation** — Full arrow-key, Tab, Enter, Escape, Home/End, Page Up/Down navigation with edit-mode entry
- **Theming** — Built-in light and dark themes plus custom CSS variable token maps
- **Chrome Columns** — Optional UI chrome: controls column (far left, action buttons per row) and row-number column (far right, click-to-select, shift/ctrl multi-select, drag-to-reorder)
- **Slots** — Composable slot components: `<Toolbar>`, `<FormulaBar>`, `<StatusBar>`, `<EmptyState>`
- **Drag & Drop** — Row reordering via drag handles on row-number cells

### 15 Cell Types

Each cell type ships as both a standalone React component and an MUI-styled variant:

| Cell Type | Component | Description |
|-----------|-----------|-------------|
| Text | `TextCell` | Single-line text input |
| Numeric | `NumericCell` | Number input with min/max constraints |
| Currency | `CurrencyCell` | Formatted currency display with locale support |
| Boolean | `CheckboxCell` | Checkbox toggle |
| Calendar | `CalendarCell` | Date picker |
| Status | `StatusCell` | Color-coded status badge with dropdown |
| List | `ListCell` | Single-select dropdown |
| Password | `PasswordCell` | Masked input with reveal toggle |
| Tags | `TagsCell` | Multi-value tag chips with suggestions and free-text entry |
| Chip Select | `ChipSelectCell` | Multi-select chip picker |
| Compound Chip List | `CompoundChipListCell` | Structured chip objects with id/label pairs |
| Rich Text | `RichTextCell` | Bold/italic/formatted text |
| Upload | `UploadCell` | File attachment display |
| Actions | `ActionsCell` | Row-level action buttons |
| Sub-Grid | `SubGridCell` | Nested grid within a cell |

### Extensions

| Extension | Factory | Description |
|-----------|---------|-------------|
| Regex Validation | `createRegexValidation()` | Pattern-based cell validation |
| Cell Comments | `createCellComments()` | Threaded comments on individual cells |
| Column Resize | `createColumnResize()` | Drag-to-resize column headers |
| Export | `createExportExtension()` | CSV, JSON, and Excel export with header/footer customization |

## Quick Start

```bash
# Install
pnpm add @istracked/datagrid-core @istracked/datagrid-react

# Or with MUI integration
pnpm add @istracked/datagrid-core @istracked/datagrid-react @istracked/datagrid-mui
```

```tsx
import { DataGrid } from '@istracked/datagrid-react';
import { TextCell } from '@istracked/datagrid-react/cells/TextCell';
import { NumericCell } from '@istracked/datagrid-react/cells/NumericCell';

const columns = [
  { id: 'name', field: 'name', title: 'Name', cellType: 'text', editable: true },
  { id: 'age', field: 'age', title: 'Age', cellType: 'numeric', width: 100 },
];

const data = [
  { id: '1', name: 'Alice', age: 30 },
  { id: '2', name: 'Bob', age: 25 },
];

function App() {
  return (
    <DataGrid
      data={data}
      columns={columns}
      rowKey="id"
      cellRenderers={{ text: TextCell, numeric: NumericCell }}
      sorting={{ mode: 'multi' }}
      selectionMode="range"
      keyboardNavigation
    />
  );
}
```

### Chrome Columns

Add controls and row numbers to the grid edges:

```tsx
<DataGrid
  data={data}
  columns={columns}
  rowKey="id"
  chrome={{
    controls: {
      width: 80,
      actions: [
        { key: 'edit', label: 'Edit', onClick: (rowId) => console.log('Edit', rowId) },
        { key: 'delete', label: 'Del', onClick: (rowId) => console.log('Delete', rowId) },
      ],
    },
    rowNumbers: { reorderable: true },
  }}
  onRowReorder={({ sourceRowId, targetRowId }) =>
    console.log(`Move ${sourceRowId} to ${targetRowId}`)
  }
/>
```

### Master-Detail

```tsx
import { MasterDetail } from '@istracked/datagrid-react';

<MasterDetail
  data={data}
  columns={columns}
  rowKey="id"
  detailComponent={({ row }) => <div>Details for {row.name}</div>}
/>
```

### Ghost Row

```tsx
<DataGrid
  data={data}
  columns={columns}
  rowKey="id"
  ghostRow={{
    position: 'bottom',
    sticky: true,
    placeholder: 'Add new row...',
    defaultValues: { department: 'Engineering' },
    validate: (values) => (!values.name ? 'Name is required' : null),
  }}
  onRowAdd={(row) => console.log('New row:', row)}
/>
```

### Extensions

```tsx
import { createRegexValidation } from '@istracked/datagrid-extensions';
import { createExportExtension } from '@istracked/datagrid-extensions';

// Regex validation on email fields
const emailValidator = createRegexValidation({
  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  message: 'Invalid email format',
});

// CSV/JSON export
const exporter = createExportExtension({ format: 'csv' });
```

### MUI Integration

```tsx
import { MuiDataGrid } from '@istracked/datagrid-mui';

// Automatically uses MUI-themed cell renderers and respects your MUI theme
<MuiDataGrid
  data={data}
  columns={columns}
  rowKey="id"
  sorting
  selectionMode="cell"
/>
```

## Development

### Prerequisites

- Node.js >= 20
- pnpm 9.x

### Setup

```bash
git clone https://github.com/istracked/xldatagrid.git
cd xldatagrid
pnpm install
```

### Commands

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start Vite dev server with playground demos |
| `pnpm run build` | Build all packages with tsup |
| `pnpm test` | Run all 1,311 tests with Vitest |
| `pnpm run test:watch` | Run tests in watch mode |
| `pnpm run test:coverage` | Run tests with v8 coverage |
| `pnpm run storybook` | Start Storybook on port 6006 |
| `pnpm run typecheck` | Type-check all packages |
| `pnpm run lint` | Lint with ESLint |
| `pnpm run format` | Format with Prettier |
| `pnpm run validate` | Full validation: typecheck + build + test |
| `pnpm run docs` | Generate API docs with TypeDoc |

### Playground

The playground is a Vite multi-page app at `playground/` with two comprehensive demos:

- **Kitchen Sink** (`/kitchen-sink/`) — Single mega-grid with every feature enabled: sorting, filtering, selection, editing, validation, ghost row, context menu, column groups, chrome columns, theming, keyboard navigation, export
- **Sink Kitchen** (`/sink-kitchen/`) — 27 isolated sections, each showcasing one feature with its own grid, controls, and event log. Sidebar navigation with scroll-tracking. Every section has `data-testid` attributes for automated UI testing.

### Storybook

17 story files covering every feature:

- Introduction, Basic Grid, Cell Types, Chrome Columns, Column Operations, Context Menu, Editing, Extensions, Filtering, Ghost Row, Grouping, Keyboard Navigation, Kitchen Sink, Master-Detail, Selection, Sorting, Theming

### Project Structure

```
xldatagrid/
  packages/
    core/           # Framework-agnostic grid engine
    react/          # React 19 components and hooks
    extensions/     # Plugin extensions (validation, export, comments)
    mui/            # Material UI cell renderers and theme bridge
  playground/       # Vite multi-page demo app
    kitchen-sink/   # Everything-at-once mega-grid
    sink-kitchen/   # Feature-by-feature isolated sections
  stories/          # Storybook stories
```

### Test Suite

41 test files with 1,311 tests covering:

- Core: grid model, column model, sorting, filtering, selection, editing, clipboard, undo/redo, grouping, virtualization, events, plugins, transposed grid, sub-grid expansion
- React: DataGrid rendering, cell types, chrome columns, ghost row, master-detail, context menu, keyboard navigation, drag-drop, theming, validation, JSON config, pivot modes, integration tests for sorting/filtering, selection, column operations, clipboard, undo/redo, grouping
- Extensions: regex validation, export, cell comments
- MUI: theme bridge, MUI cell renderers

## Tech Stack

- **Runtime**: React 19, TypeScript 5.7
- **State**: Jotai (atomic state for grid model)
- **Build**: tsup (per-package ESM + CJS bundles), Vite (playground + Storybook)
- **Test**: Vitest 3 + Testing Library + jsdom
- **Storybook**: Storybook 10 with React-Vite
- **MUI**: Material UI 9 + Emotion
- **Monorepo**: pnpm workspaces

## License

MIT
