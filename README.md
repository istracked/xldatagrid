# xldatagrid

A high-performance, fully-featured datagrid component library for React 19. Built as a pnpm monorepo with a framework-agnostic core, a React rendering layer, a plugin-based extension system, and first-class Material UI integration.

---

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

### NPM Commands

#### Root-Level Commands (run from repo root)

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start the Vite dev server with the playground demos |
| `pnpm run build` | Build all packages (`core`, `react`, `extensions`, `mui`) with tsup |
| `pnpm test` | Run the full test suite with Vitest |
| `pnpm run test:watch` | Run tests in watch mode (re-runs on file changes) |
| `pnpm run test:coverage` | Run tests with v8 code coverage report |
| `pnpm run storybook` | Start Storybook dev server on port 6006 |
| `pnpm run build-storybook` | Build Storybook as a static site |
| `pnpm run typecheck` | Type-check all packages via `tsc -b` (project references) |
| `pnpm run lint` | Lint all files with ESLint |
| `pnpm run format` | Format all files with Prettier |
| `pnpm run validate` | Full CI validation: type-check + build all packages + run all tests |
| `pnpm run docs` | Generate API documentation with TypeDoc |
| `pnpm run docs:open` | Generate API docs and open them in the browser |

#### Per-Package Commands (run from any `packages/*` directory)

Each package (`core`, `react`, `extensions`, `mui`) exposes the same two scripts:

| Command | Description |
|---------|-------------|
| `pnpm run build` | Build the package with tsup (outputs ESM + CJS bundles) |
| `pnpm run dev` | Watch mode — rebuild on file changes with tsup |

To run a per-package command from the repo root:

```bash
# Build only the core package
pnpm --filter @istracked/datagrid-core run build

# Watch the react package
pnpm --filter @istracked/datagrid-react run dev
```

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

42 test files covering:

- **Core** (14 files): grid model, column model, sorting, filtering, selection, editing, clipboard, undo/redo, grouping, virtualization, events, plugins, transposed grid, sub-grid expansion
- **React** (23 files): DataGrid rendering, cell types, chrome columns, ghost row, master-detail, context menu, keyboard navigation, drag-drop, theming, validation, JSON config, pivot modes, clipboard integration, column ops, selection, sort/filter, grouping, undo/redo, sub-grid, transposed grid, grid interaction state, grid store hook
- **Extensions** (3 files): regex validation, export, cell comments
- **MUI** (2 files): theme bridge, MUI cell renderers

### Tech Stack

- **Runtime**: React 19, TypeScript 5.7
- **State**: Jotai (atomic state for grid model)
- **Build**: tsup (per-package ESM + CJS bundles), Vite (playground + Storybook)
- **Test**: Vitest 3 + Testing Library + jsdom
- **Storybook**: Storybook 10 with React-Vite
- **MUI**: Material UI 9 + Emotion
- **Monorepo**: pnpm workspaces

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
- **Filtering** — Predicate-based column filtering with configurable debounce; composite filters with AND/OR logic; operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `startsWith`, `endsWith`, `between`, `isNull`, `isNotNull`
- **Selection** — Cell, row, and range selection modes with keyboard extension (Shift/Ctrl); column/row/all selection; multi-range support
- **Grouping** — Row grouping (single/multi-level) with aggregates (sum, avg, count, min, max) and collapsible column groups
- **Editing** — Inline cell editing with lifecycle management (`beginEdit` / `commitEdit` / `cancelEdit`), validation (sync + regex with error/warning/info severity), and commit/cancel semantics
- **Clipboard** — Copy, cut, and paste integration for single cells and ranges; tab-separated text and HTML table serialization; paste from spreadsheets
- **Undo/Redo** — Command-based undo/redo stack tracking cell edits, row inserts/deletes, row moves, and batch operations; configurable max history (default 100) and auto-batching timeout (300ms)
- **Virtualization** — Row and column virtualization for datasets of 500+ rows with smooth scrolling and configurable overscan
- **Plugin System** — Extension loading and lifecycle orchestration with dependency validation, hook wiring, and reverse-order teardown
- **Event Bus** — Three-phase pub/sub event system (`before` / `on` / `after`) with priority ordering and event cancellation
- **Column Model** — Column definition resolution, width calculation (with min/max clamping), frozen columns (left/right), visibility toggling, reordering, and resizing
- **Transposed Grid** — Form-mode grid where rows are fields and columns are entities

### React Components

- **`<DataGrid>`** — Primary grid component with declarative props for all features
- **`<MasterDetail>`** — Expandable row detail panels with lazy-loading support, single-expand mode, and cache invalidation
- **`<TransposedGrid>`** — Entity-per-column form-mode grid
- **`<GhostRow>`** — Inline new-row entry with position variants (top, bottom, sticky, above-header), default values, and validation
- **Context Menu** — Right-click menu with custom items, submenus, keyboard shortcuts, danger actions, and dividers
- **Keyboard Navigation** — Full arrow-key, Tab, Enter, Escape, Home/End, Page Up/Down navigation with edit-mode entry
- **Theming** — Built-in light and dark themes plus custom CSS variable token maps
- **Chrome Columns** — Optional UI chrome: controls column (far left, action buttons per row) and row-number column (far right, click-to-select, shift/ctrl multi-select, drag-to-reorder)
- **Slots** — Composable slot components: `<Toolbar>`, `<FormulaBar>`, `<StatusBar>`, `<EmptyState>`
- **Drag & Drop** — Row reordering via drag handles on row-number cells

### State Management (Jotai Atoms)

The React package uses a three-tier Jotai atom architecture for granular state:

- **Base Atoms** — Writable ground truth: data, columns, sort, filter, selection, editing, undo/redo, grouping, pagination, config
- **Derived Atoms** — Read-only projections: processed (sorted/filtered) data, visible columns, row IDs
- **Action Atoms** — Write-only mutations: `setCellValue`, `beginEdit`, `commitEdit`, `insertRow`, `deleteRows`, `toggleColumnSort`, etc.

Hooks for consumption:
- `useGrid(config)` — Returns imperative `GridModel`
- `useGridWithAtoms(config)` — Returns `GridModel`, Jotai `store`, and `atoms` for granular subscriptions
- `useGridStore(model)` — Subscribes to full grid state snapshots
- `useGridSelector(model, selector)` — Subscribes to derived state slices
- `useGridContext()` / `useGridAtomContext()` — Access grid from React context

### 15 Cell Types

Each cell type ships as both a standalone React component and an MUI-styled variant:

| Cell Type | Component | MUI Component | Description |
|-----------|-----------|---------------|-------------|
| Text | `TextCell` | `MuiTextCell` | Single-line text input (MUI: `TextField` standard variant) |
| Numeric | `NumericCell` | `MuiNumericCell` | Number input with min/max constraints |
| Currency | `CurrencyCell` | `MuiCurrencyCell` | Formatted currency display with locale support |
| Boolean | `CheckboxCell` | `MuiBooleanCell` | Checkbox toggle (MUI: `Checkbox` with indeterminate) |
| Calendar | `CalendarCell` | `MuiCalendarCell` | Date picker |
| Status | `StatusCell` | `MuiStatusCell` | Color-coded status badge with dropdown (MUI: `Select` + `Chip`) |
| List | `ListCell` | `MuiListCell` | Single-select dropdown (MUI: `Select` + `MenuItem`) |
| Password | `PasswordCell` | `MuiPasswordCell` | Masked input with reveal toggle |
| Tags | `TagsCell` | `MuiTagsCell` | Multi-value tag chips with suggestions and free-text entry |
| Chip Select | `ChipSelectCell` | `MuiChipSelectCell` | Multi-select chip picker (MUI: `Autocomplete` multiple) |
| Compound Chip List | `CompoundChipListCell` | `MuiCompoundChipListCell` | Structured chip objects with id/label pairs |
| Rich Text | `RichTextCell` | `MuiRichTextCell` | Bold/italic/formatted text |
| Upload | `UploadCell` | `MuiUploadCell` | File attachment display (MUI: drag-drop with `LinearProgress`) |
| Actions | `ActionsCell` | `MuiActionsCell` | Row-level action buttons (MUI: `Button`) |
| Sub-Grid | `SubGridCell` | `MuiSubGridCell` | Nested grid within a cell |

All cell renderers implement the `CellRendererProps<TData>` interface:

```typescript
interface CellRendererProps<TData> {
  value: CellValue;
  row: TData;
  column: ColumnDef<TData>;
  rowIndex: number;
  isEditing: boolean;
  onCommit: (value: CellValue) => void;
  onCancel: () => void;
}
```

### Extensions

| Extension | Factory | Description |
|-----------|---------|-------------|
| Regex Validation | `createRegexValidation()` | Pattern-based cell validation |
| Cell Comments | `createCellComments()` | Threaded comments on individual cells |
| Column Resize | `createColumnResize()` | Drag-to-resize column headers |
| Export | `createExportExtension()` | CSV, JSON, and Excel export with header/footer customization |

### MUI Theme Bridge

The MUI package bridges your MUI theme to DataGrid CSS variables automatically:

| CSS Variable | MUI Source |
|---|---|
| `--dg-primary-color` | `palette.primary.main` |
| `--dg-bg-color` | `palette.background.paper` |
| `--dg-text-color` | `palette.text.primary` |
| `--dg-border-color` | `palette.divider` |
| `--dg-hover-bg` | `palette.action.hover` |
| `--dg-error-color` | `palette.error.main` |

---

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
  singleExpand        // optional: only one row expanded at a time
  fetchDetail={async (row) => loadDetails(row.id)}  // optional: lazy-load
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
  muiTheme={muiTheme}   // optional: bridges MUI theme to grid CSS vars
  sorting
  selectionMode="cell"
/>
```

### Imperative Control via Hooks

```tsx
import { useGrid } from '@istracked/datagrid-react';

function MyGrid() {
  const model = useGrid({ columns, data, rowKey: 'id' });

  // Imperative API
  model.sort([{ field: 'name', dir: 'asc' }]);
  model.filter({ field: 'status', value: 'active' });
  model.setCellValue({ rowId: '1', field: 'name' }, 'Alice');
  model.undo();

  return <DataGrid model={model} />;
}
```

### Fine-Grained Atom Subscriptions

```tsx
import { useGridWithAtoms } from '@istracked/datagrid-react';

function MyGrid() {
  const { model, store, atoms } = useGridWithAtoms(config);

  // Read derived state
  const sortState = store.get(atoms.base.sortAtom);
  const processedData = store.get(atoms.derived.processedDataAtom);

  return <DataGrid model={model} />;
}
```

---

## Configuration Reference

### DataGrid Props

| Prop | Type | Description |
|------|------|-------------|
| `data` | `TData[]` | Row data array |
| `columns` | `ColumnDef<TData>[]` | Column definitions |
| `rowKey` | `string \| (row: TData) => string` | Unique row identifier |
| `rowHeight` | `number` | Row height in pixels |
| `headerHeight` | `number` | Header row height in pixels |
| `theme` | `'light' \| 'dark' \| Record<string, string>` | Theme or custom CSS variable map |
| `className` | `string` | CSS class name |
| `style` | `CSSProperties` | Inline styles |
| `sorting` | `boolean \| SortConfig` | Enable sorting (`mode`: `'single'` or `'multi'`) |
| `filtering` | `boolean \| FilterConfig` | Enable filtering (`debounceMs`) |
| `selectionMode` | `'cell' \| 'row' \| 'range' \| 'none'` | Selection behavior |
| `readOnly` | `boolean` | Disable all editing |
| `pageSize` | `number` | Rows per page |
| `keyboardNavigation` | `boolean` | Enable keyboard nav |
| `cellRenderers` | `Record<string, ComponentType>` | Custom cell renderer map |
| `chrome` | `ChromeConfig` | Controls column and row numbers |
| `ghostRow` | `boolean \| GhostRowConfig` | Inline new-row entry |
| `grouping` | `boolean \| GroupingConfig` | Row/column grouping |
| `contextMenu` | `boolean \| ContextMenuConfig` | Right-click menu |
| `subGrid` | `SubGridConfig` | Nested sub-grids |
| `fileDrop` | `FileDropConfig` | File drop zones |
| `pivotMode` | `'column' \| 'row'` | Pivot orientation |
| `showColumnMenu` | `boolean` | Column header menus |
| `showColumnVisibilityMenu` | `boolean` | Column visibility picker |
| `showGroupControls` | `boolean` | Grouping UI controls |

### Event Callbacks

| Callback | Signature |
|----------|-----------|
| `onCellEdit` | `(cell: CellAddress, value: CellValue) => void` |
| `onRowAdd` | `(row: TData) => void` |
| `onRowDelete` | `(rowIds: string[]) => void` |
| `onRowReorder` | `(event: { sourceRowId, targetRowId }) => void` |
| `onSelectionChange` | `(selection: SelectionState) => void` |
| `onSortChange` | `(sort: SortState) => void` |
| `onFilterChange` | `(filter: FilterState) => void` |
| `onGroupChange` | `(group: GroupState) => void` |
| `onColumnGroupChange` | `(groups: ColumnGroupConfig[]) => void` |
| `onColumnResize` | `(field: string, width: number) => void` |
| `onColumnReorder` | `(order: string[]) => void` |
| `onColumnVisibilityChange` | `(field: string, visible: boolean) => void` |
| `onColumnFreeze` | `(field: string, position: 'left' \| 'right' \| null) => void` |

### Column Definition

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique column identifier |
| `field` | `string` | Data field key |
| `title` | `string` | Header display text |
| `cellType` | `CellType` | One of the 15 cell types |
| `width` / `minWidth` / `maxWidth` | `number` | Column width constraints |
| `editable` | `boolean` | Allow inline editing |
| `sortable` | `boolean` | Allow sorting |
| `filterable` | `boolean` | Allow filtering |
| `resizable` | `boolean` | Allow drag-resize |
| `reorderable` | `boolean` | Allow drag-reorder |
| `visible` | `boolean` | Column visibility |
| `frozen` | `'left' \| 'right'` | Pin to edge |
| `validate` | `(value) => ValidationResult \| null` | Cell validation function |
| `options` | `StatusOption[]` | Options for status/list/select cells |
| `suggestions` | `string[]` | Autocomplete suggestions for tags |
| `placeholder` | `string` | Input placeholder text |
| `format` | `string` | Display format string |
| `min` / `max` | `number` | Numeric constraints |

### Grid Event Types

Events dispatched through the three-phase EventBus:

| Event | Description |
|-------|-------------|
| `cell:valueChange` | Cell value was modified |
| `cell:selectionChange` | Selection changed |
| `cell:click` / `cell:doubleClick` | Cell interaction |
| `cell:validation` | Validation triggered |
| `row:insert` / `row:delete` / `row:move` | Row operations |
| `column:resize` / `column:sort` / `column:filter` | Column operations |
| `column:reorder` / `column:visibility` | Column layout changes |
| `clipboard:copy` / `clipboard:paste` | Clipboard operations |
| `contextMenu:open` | Context menu opened |
| `subGrid:expand` / `subGrid:collapse` | Sub-grid toggled |
| `grid:mount` / `grid:unmount` | Grid lifecycle |
| `grid:dataChange` / `grid:stateChange` | Data/state updates |

### Writing Extensions

```typescript
import type { ExtensionDefinition } from '@istracked/datagrid-core';

const myExtension: ExtensionDefinition = {
  id: 'my-extension',
  name: 'My Extension',
  version: '1.0.0',
  dependencies: [],             // other extension IDs
  init: (ctx) => {              // called on load
    const state = ctx.gridState;
    ctx.commands.setCellValue({ rowId: '1', field: 'name' }, 'Hello');
  },
  destroy: (ctx) => { },       // called on teardown (LIFO order)
  hooks: (ctx) => [
    {
      event: 'cell:valueChange',
      phase: 'after',           // 'before' | 'on' | 'after'
      priority: 500,            // lower runs first
      handler: (event) => {
        console.log('Cell changed:', event.payload);
      },
    },
  ],
};
```

## License

MIT
