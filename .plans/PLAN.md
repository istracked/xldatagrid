# istracked DataGrid — Implementation Plan

Date: 2026-04-13
Risk Level: LOW (new repo, no production code affected until migration)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Reference Architecture Analysis](#3-reference-architecture-analysis)
4. [Architecture Decisions](#4-architecture-decisions)
5. [Feature Matrix — Current vs New](#5-feature-matrix)
6. [Cell Type Mapping](#6-cell-type-mapping)
7. [JSON Configuration API](#7-json-configuration-api)
8. [Extension System Design](#8-extension-system-design)
9. [Project Structure](#9-project-structure)
10. [Dependencies](#10-dependencies)
11. [Test Suite Plan (1001 tests)](#11-test-suite-plan)
12. [Files Affected](#12-files-affected)
13. [Risk Assessment](#13-risk-assessment)
14. [Execution Order](#14-execution-order)

---

## 1. Executive Summary

Replace the current Telerik/KendoReact v13 datagrid (10+ @progress packages, ~$1,500/yr license) with a purpose-built, lightweight spreadsheet component. The new grid draws architectural inspiration from DataGridXL2 (column-as-DOM-node rendering) and jspreadsheet (plugin system, feature toggles), but is React 19 + TypeScript native from day one.

**Key capabilities:**
- Pivot modes: column-driven OR row-driven cell type assignment
- JSON config to toggle formula bar, toolbar rows, sorting, filtering, context menu, grouping
- Extension system with typed hooks, lifecycle, inter-extension messaging
- Built-in extensions: regex validation, cell comments with threaded discussions
- Sub-grid cells with nested data support
- Drag-and-drop files onto grid/columns/cells
- All 14 cell types from the current Telerik implementation, plus sub-grid

**Approach:** TDD-first. Write the full test suite (~1001 tests) before any implementation code.

---

## 2. Current State Analysis

### 2.1 Telerik/KendoReact Dependencies (17 packages)

| Package | Version | Purpose |
|---------|---------|---------|
| `@progress/kendo-react-grid` | 13.0.0 | Core grid component |
| `@progress/kendo-react-dateinputs` | 13.0.0 | Calendar, DatePicker |
| `@progress/kendo-react-dropdowns` | 13.0.0 | DropDownList, AutoComplete |
| `@progress/kendo-react-buttons` | 13.0.0 | Button components |
| `@progress/kendo-react-dialogs` | 13.0.0 | Dialog, Window |
| `@progress/kendo-react-popup` | 13.0.0 | Popup component |
| `@progress/kendo-react-excel-export` | 13.0.0 | Excel export |
| `@progress/kendo-react-pdf` | 13.0.0 | PDF export |
| `@progress/kendo-react-form` | 13.0.0 | Form components |
| `@progress/kendo-data-query` | 1.7.1 | Filtering, sorting, grouping |
| `@progress/kendo-react-intl` | 13.0.0 | Internationalization |
| `@progress/kendo-react-upload` | 13.0.0 | Upload component |
| `@progress/kendo-react-layout` | 13.0.0 | Layout components |
| `@progress/kendo-react-listbox` | 13.0.0 | ListBox |
| `@progress/kendo-react-treeview` | 13.0.0 | TreeView |
| `@progress/kendo-svg-icons` | 4.3.0 | Icon library |
| `@progress/kendo-theme-default` | 12.3.0 | Default theme |

### 2.2 Current Grid Architecture

**Three-tier grid hierarchy:**
1. **DataGrid** (`DataGrid.tsx`) — Base grid with sorting, filtering, paging, export
2. **SmartDataGrid** (`SmartDataGrid.tsx`) — Unified state management, advanced features
3. **MasterDataGrid** (`MasterDataGrid.tsx`) — Master-detail, ghost row, context menu, command column

**Key patterns:**
- **Cell Registry** (`cellRegistry.ts`) — Factory pattern mapping `ColumnCellType` to cell component factories
- **Context-based handler delivery** — `EditingCellContext` + `DataGridHandlersContext` avoid closure stale issues
- **TypedColumnProps** — Type-safe column configuration with discriminated union cell type configs

### 2.3 Current Cell Types (from `types.ts`)

```typescript
type ColumnCellType = 'text' | 'date' | 'status' | 'listBadge' | 'compoundChipList' |
                      'password' | 'numeric' | 'textAutocomplete' | 'boolean' | 'chipSelect';
```

**Additional specialized cells (20+ total):**
- PlainTextEditCell, DatePickerEditCell, StatusCell, ListBadgeCellCell
- CompoundChipListCell, CheckboxCell, PasswordEditCell, AutocompleteChipCell
- DateCell, CurrencyCell, ActiveBadgeCell, VerifiedBadgeCell, RoleBadgeCell
- UserCountCell, ActionsCell, AdminActionsCell, UserActionsCell
- RichTextEditCell, RichTextFormulaBar, EditCommandCell, EditableCell
- 18+ transposed cell variants

### 2.4 Current Features

| Feature | Implementation |
|---------|---------------|
| Sorting | Single/multi-column via kendo-data-query |
| Filtering | Text, numeric, boolean, date filter types |
| Paging | Configurable page sizes [10, 20, 50, 100] |
| Column resize | Drag with min width, auto-fit |
| Column reorder | Drag-and-drop |
| Column visibility | Gear icon dropdown with checkboxes |
| Inline editing | Cell-level with keyboard navigation |
| Master-detail | 6 detail row types (warranties, contacts, ops, PM, drawings, plans) |
| Context menu | Right-click with delete, extensible items |
| Ghost row | Inline new-row creation at bottom |
| Validation | Column-level validators, visual error tooltips |
| Export | Excel (xlsx), PDF |
| File upload | Drag-drop on warranty/contact/instruction fields |
| Keyboard nav | Tab, Enter, Escape, Arrow keys, Shift combos |
| Formula bar | Rich text editing in toolbar mode |
| Transposed grid | Row-oriented editing mode |

---

## 3. Reference Architecture Analysis

### 3.1 DataGridXL2 — What to Adopt

| Decision | Rationale |
|----------|-----------|
| **Column-as-DOM-node rendering** | Each column = 1 DOM element. Cell text stacks via `line-height` + `white-space: pre`. N columns = N DOM nodes, not N*M. |
| **Canvas for backgrounds only** | Cell backgrounds (selection, highlights) on canvas. Text stays in DOM for font rendering, accessibility, selection. |
| **Stable ID + coordinate mapping** | id/index/coord triple for rows and columns. Enables efficient sort, filter, hide, reorder without moving data. |
| **Native scrollbar via scroll surface** | Real scrollable div with oversized child for native scroll behavior. |
| **Command-pattern undo/redo** | Each operation stores undo/redo command pair. |

### 3.1.1 DataGridXL2 — What to Avoid

| Decision | Problem |
|----------|---------|
| No cell-level rendering extensibility | Cells are just text; no custom renderers. We need per-cell React components. |
| CSS-in-JS without actual CSS | All styles inline via JS. Use CSS custom properties instead. |
| No plugin architecture | Only "parts" for toolbars. We need full extension system. |
| Single-file monolith | 260KB, no tree-shaking. Design with ES modules. |
| No TypeScript | No types. We're TypeScript-first. |
| No accessibility (ARIA) | Must design in from day one. |

### 3.2 jspreadsheet — What to Adopt

| Decision | Rationale |
|----------|-----------|
| **Plugin registration API** | Simple object with known methods. Easy to write, test, compose. |
| **Context menu modification via return value** | Plugins return modified items array. Clean pattern. |
| **Feature toggles via boolean config** | `allowComments`, `filters`, `rowDrag`, etc. Natural JSON config. |
| **Built-in column types with custom editor interface** | `createCell`, `openEditor`, `closeEditor`, `updateCell`, `destroyCell` lifecycle. |
| **Event system with before/after variants** | `onbeforechange` can cancel. `onchange` for response. |

### 3.2.1 jspreadsheet — What to Improve

| Decision | Improvement |
|----------|-------------|
| Catch-all `onevent` | Typed event subscriptions with specific payloads |
| No plugin dependencies | Topological sort with required/optional dependencies |
| No cleanup lifecycle | `destroy()` + automatic hook/subscription disposal |
| No async in hooks | Full async/await support |
| No inter-plugin comms | Typed message bus with request/reply |
| Bolted-on React | React-native hooks (`useExtension`, `useExtensionState`) |
| No config validation | JSON Schema subset for extension config |

---

## 4. Architecture Decisions

### 4.1 Rendering Model: Hybrid Column-DOM + React Cell Renderers

```
┌─────────────────────────────────────────────┐
│ Grid Container (React)                       │
│ ┌─────────────────────────────────────────┐ │
│ │ Toolbar Slot (optional, configurable)    │ │
│ ├─────────────────────────────────────────┤ │
│ │ Formula Bar Slot (optional, config)      │ │
│ ├─────────────────────────────────────────┤ │
│ │ Header Row (sticky)                      │ │
│ ├─────────────────────────────────────────┤ │
│ │ ┌───────┬───────┬───────┬───────┐       │ │
│ │ │ Col 0 │ Col 1 │ Col 2 │ Col N │ ← DOM│ │
│ │ │┌─────┐│┌─────┐│┌─────┐│┌─────┐│       │ │
│ │ ││Cell │││Cell │││Cell │││Cell ││ ← React│ │
│ │ │├─────┤│├─────┤│├─────┤│├─────┤│       │ │
│ │ ││Cell │││Cell │││Cell │││Cell ││       │ │
│ │ │└─────┘│└─────┘│└─────┘│└─────┘│       │ │
│ │ └───────┴───────┴───────┴───────┘       │ │
│ ├─────────────────────────────────────────┤ │
│ │ Ghost Row (optional)                     │ │
│ ├─────────────────────────────────────────┤ │
│ │ Status Bar Slot (optional)               │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

- Each column is a positioned DOM container (DataGridXL2 inspiration)
- Cell content inside each column is a React component (custom renderers)
- Canvas layer behind columns for selection highlighting, backgrounds
- `useSyncExternalStore` bridges core model to React (not context+reducer)

### 4.2 Pivot Modes

**Column-Driven (default):**
```json
{
  "pivotMode": "column",
  "columns": [
    { "field": "name", "cellType": "text" },
    { "field": "dueDate", "cellType": "calendar" },
    { "field": "status", "cellType": "status", "options": [...] },
    { "field": "files", "cellType": "subGrid" }
  ]
}
```
Every cell in the "name" column renders as text. Every cell in "dueDate" renders as calendar.

**Row-Driven:**
```json
{
  "pivotMode": "row",
  "rows": [
    { "index": 0, "cellType": "text", "label": "Header Row" },
    { "index": 1, "cellType": "calendar", "label": "Date Row" },
    { "index": 2, "cellType": "tags", "label": "Tags Row" }
  ]
}
```
Every cell in row 0 renders as text. Every cell in row 1 renders as calendar.

### 4.3 Core State Machine (Framework-Agnostic)

```
@istracked/datagrid-core (zero dependencies)
├── GridModel — mutable state + subscribe() for useSyncExternalStore
├── ColumnModel — column definitions, sizing, reorder state
├── SelectionModel — cell/row/range selection state machine
├── SortingEngine — multi-column sort with comparator factories
├── FilteringEngine — composite filter predicates
├── VirtualizationEngine — row + column range calculations
├── EditingController — cell edit lifecycle (begin, validate, commit, cancel)
├── ClipboardManager — copy/paste serialization
├── PluginHost — plugin registration, lifecycle, event dispatch
└── EventBus — typed pub/sub with before/on/after phases
```

### 4.4 Package Architecture

```
@istracked/datagrid-core     — Pure TS, zero deps. Grid state machine.
@istracked/datagrid-react    — React 19 bindings. Rendering, hooks, CSS.
@istracked/datagrid-extensions — Built-in extensions (tree-shakeable per-extension).
```

---

## 5. Feature Matrix

| Feature | Current (Telerik) | New Grid | Priority |
|---------|------------------|----------|----------|
| Cell rendering | DOM per cell | Column-DOM + React cells | P0 |
| Virtual scrolling | Kendo built-in | Custom (row + column) | P0 |
| Column-driven cell types | Via cellRegistry | Pivot mode: column | P0 |
| Row-driven cell types | Via transposedCells | Pivot mode: row | P0 |
| JSON config for toolbar/bars | Props-based | JSON config object | P0 |
| Inline editing | Kendo GridItemChange | Custom edit controller | P0 |
| Sorting (single/multi) | kendo-data-query | Custom sort engine | P0 |
| Filtering | kendo-data-query | Custom filter engine | P0 |
| Column resize | Kendo built-in | Extension | P0 |
| Column reorder | Kendo built-in | Extension | P1 |
| Column visibility | Custom hook | Extension | P1 |
| Context menu | Custom component | Core + extension contributions | P0 |
| Ghost row | Custom hook | Core feature | P0 |
| Master-detail | Custom hook | Core feature | P1 |
| Sub-grid cell | Not cell-level | New: cell type + expansion | P0 |
| Keyboard navigation | Custom helpers | Core feature | P0 |
| Validation (column) | Custom validators | Core + regex extension | P0 |
| Cell comments | Not implemented | Extension with threading | P1 |
| Drag-drop files | Per-field hooks | Core feature (grid/col/cell) | P0 |
| Undo/redo | Not implemented | Core (command pattern) | P1 |
| Export (Excel) | Kendo ExcelExport | Extension | P2 |
| Export (PDF) | Kendo GridPDFExport | Extension | P2 |
| Export (CSV) | Not implemented | Extension | P2 |
| Clipboard | Not implemented | Core feature | P1 |
| Theming | Kendo theme overrides | CSS custom properties | P0 |
| Grouping (rows) | Not implemented | Configurable extension | P1 |
| Grouping (columns) | Not implemented | Configurable extension | P1 |
| Formula bar | RichTextFormulaBar | Configurable slot | P1 |
| Extension system | N/A | New: typed hooks, lifecycle | P0 |

---

## 6. Cell Type Mapping

### Current Telerik → New Grid

| Current Cell | Current File | New Cell Type | New Component | Notes |
|-------------|-------------|---------------|---------------|-------|
| PlainTextEditCell | `cells/PlainTextEditCell.tsx` | `text` | `TextCell.tsx` | Cursor position preservation, validation |
| DatePickerEditCell | `cells/DatePickerEditCell.tsx` | `calendar` | `CalendarCell.tsx` | Popup calendar, date formatting |
| StatusCell | `cells/StatusCell.tsx` | `status` | `StatusCell.tsx` | Dropdown with colored badges |
| ListBadgeCellCell | `cells/ListBadgeCellCell.tsx` | `tags` | `TagsCell.tsx` | Chip list with autocomplete |
| CompoundChipListCell | `cells/CompoundChipListCell.tsx` | `compoundChipList` | `CompoundChipListCell.tsx` | Multi-field chip with status |
| CheckboxCell | `cells/CheckboxCell.tsx` | `boolean` | `CheckboxCell.tsx` | Toggle checkbox |
| PasswordEditCell | `cells/PasswordEditCell.tsx` | `password` | `PasswordCell.tsx` | Masked input |
| AutocompleteChipCell | `cells/AutocompleteChipCell.tsx` | `chipSelect` | `ChipSelectCell.tsx` | Multi-select chip dropdown |
| CurrencyCell | `cells/CurrencyCell.tsx` | `currency` | `CurrencyCell.tsx` | Formatted currency display |
| RichTextEditCell | `cells/RichTextEditCell.tsx` | `richText` | `RichTextCell.tsx` | TipTap-based editor |
| DateCell | `cells/DateCell.tsx` | `date` (display) | Merged into `CalendarCell.tsx` | Display mode of calendar |
| ActionsCell | `cells/ActionsCell.tsx` | `actions` | `ActionsCell.tsx` | Button group |
| N/A (new) | — | `numeric` | `NumericCell.tsx` | Number input with min/max |
| N/A (new) | — | `upload` | `UploadCell.tsx` | File upload/download link |
| N/A (new) | — | `subGrid` | `SubGridCell.tsx` | Expandable nested grid |
| N/A (new) | — | `list` | `ListCell.tsx` | Simple dropdown list |

### Cell Component Interface (shared)

```typescript
interface CellRendererProps<TData = unknown> {
  value: CellValue;
  row: TData;
  column: ColumnDef<TData>;
  rowIndex: number;
  isEditing: boolean;
  onCommit: (value: CellValue) => void;
  onCancel: () => void;
  gridContext: GridModel<TData>;
}
```

---

## 7. JSON Configuration API

### 7.1 Top-Level Grid Config

```typescript
interface DataGridConfig<TData = unknown> {
  // Data
  data: TData[];
  columns: ColumnDef<TData>[];
  rowKey: keyof TData | ((row: TData) => string);

  // Pivot mode
  pivotMode?: 'column' | 'row';  // default: 'column'
  rowTypes?: RowTypeDef[];        // only used when pivotMode: 'row'

  // Feature toggles (each bar/row above the grid)
  bars?: {
    toolbar?: boolean | ToolbarConfig;       // default: false
    formulaBar?: boolean | FormulaBarConfig; // default: false
    filterBar?: boolean;                     // default: false
  };

  // Sorting & filtering
  sorting?: boolean | SortConfig;     // default: true
  filtering?: boolean | FilterConfig; // default: true

  // Context menu
  contextMenu?: boolean | ContextMenuConfig; // default: true

  // Grouping
  grouping?: {
    rows?: boolean | RowGroupConfig;
    columns?: boolean | ColumnGroupConfig;
  };

  // Sub-grid
  subGrid?: SubGridConfig;

  // Drag & drop files
  fileDrop?: FileDropConfig;

  // Ghost row (inline creation)
  ghostRow?: boolean | GhostRowConfig<TData>;

  // Selection
  selectionMode?: 'cell' | 'row' | 'range' | 'none';

  // Read-only mode
  readOnly?: boolean;

  // Extensions
  extensions?: ExtensionDefinition[];
  extensionConfig?: Record<string, Record<string, unknown>>;

  // Theming
  theme?: 'light' | 'dark' | Record<string, string>;

  // Keyboard navigation
  keyboardNavigation?: boolean; // default: true

  // Callbacks
  onCellEdit?: (rowKey: string, field: string, value: CellValue, prev: CellValue) => void;
  onRowAdd?: (data: Partial<TData>) => void;
  onRowDelete?: (rowIds: string[]) => void;
  onSelectionChange?: (range: CellRange | null) => void;
  onSortChange?: (sort: SortState) => void;
  onFilterChange?: (filter: FilterState) => void;
}
```

### 7.2 Bar Toggle Examples

```json
// Minimal — just the grid
{ "bars": { "toolbar": false, "formulaBar": false } }

// With toolbar only
{ "bars": { "toolbar": true } }

// With formula bar + custom toolbar
{
  "bars": {
    "toolbar": { "items": ["export", "search", "separator", "undo", "redo"] },
    "formulaBar": { "multiline": true, "maxHeight": 120 }
  }
}
```

### 7.3 File Drop Config

```typescript
interface FileDropConfig {
  // Grid-level drop (creates new rows)
  enabled: boolean;
  accept?: string[];            // MIME types: ['image/*', 'application/pdf']
  maxFileSize?: number;         // bytes
  maxFiles?: number;

  // Column-level drop (restrict to specific columns)
  columnDrop?: Record<string, {
    accept?: string[];
    maxFileSize?: number;
    createRow?: boolean;        // true = new row, false = populate cell
  }>;

  // Cell-level drop behavior
  cellDrop?: {
    subGridField?: string;      // if dropped on sub-grid cell, create entry here
  };

  // Callbacks
  onFileDrop?: (files: File[], target: DropTarget) => void;
  onUploadProgress?: (fileId: string, progress: number) => void;
  onUploadComplete?: (fileId: string, result: unknown) => void;
}
```

---

## 8. Extension System Design

### 8.1 Core Concepts

The extension system uses a **three-phase event pipeline** (before/on/after) with **typed events**, **priority ordering**, **async support**, and **automatic cleanup**.

Full type contracts are at: `experiments/extension-system/types.ts`

### 8.2 Extension Lifecycle

```
register() → configValidation → dependencyResolution → init() → hooks()
                                                          ↓
                                                      onMount()
                                                          ↓
                                                  [grid is live]
                                                          ↓
                                                    beforeRender() ←→ afterRender()
                                                          ↓
                                                    onUnmount()
                                                          ↓
                                                     destroy()
```

### 8.3 Key Interfaces

**ExtensionDefinition** — What extension authors export:
- `id`, `name`, `version`, `hostVersion`, `description`
- `dependencies` — required/optional with semver
- `configSchema` — JSON Schema subset for validation
- `initialState` — factory for reactive state
- Lifecycle: `init`, `onMount`, `onUnmount`, `beforeRender`, `afterRender`, `destroy`
- `hooks` — factory returning typed event subscriptions

**ExtensionContext** — What extensions receive:
- `config` — validated, read-only config
- `gridState` — read-only grid state snapshot
- `commands` — intent-based grid mutations (setCellValue, insertRow, etc.)
- `store` — private reactive state (for `useExtensionState`)
- `messages` — typed inter-extension message bus
- `toolbar` — add/remove/override toolbar items
- `contextMenu` — add/remove/override context menu items
- `addHook` / `removeHook` — dynamic hook registration

**GridEventMap** — 20+ typed events:
- Cell: `valueChange`, `selectionChange`, `click`, `doubleClick`, `validation`
- Row: `insert`, `delete`, `move`
- Column: `resize`, `sort`, `filter`
- Clipboard: `copy`, `paste`
- Context menu: `open`
- Lifecycle: `mount`, `unmount`, `beforeRender`, `afterRender`, `dataChange`

### 8.4 Built-In Extensions

**Regex Validation** (`experiments/extension-system/extensions/regex-validation.ts`):
- Per-column regex rules with severity levels (error/warning/info)
- Short-circuit or continue-on-failure per rule
- Invert match (blacklist patterns)
- Rejects edits on error-severity failures (configurable)
- Broadcasts `validation:errorsChanged` and `validation:cellValidated` messages
- Exposes error state via `useExtensionState` for React rendering

**Cell Comments** (`experiments/extension-system/extensions/cell-comments.ts`):
- Threaded discussions per cell (configurable max depth)
- Permission model: canCreate, canEditOwn/Any, canDeleteOwn/Any, canResolve
- Backend-agnostic: emits persistence operations, host handles storage
- Cell indicator triangle, comment panel sidebar, status bar count
- Context menu item: "Add comment..."
- Toolbar toggle: "Show/hide comments"
- Messages: `threadCreated`, `commentAdded`, `commentEdited`, `commentDeleted`, `threadResolved`

### 8.5 vs jspreadsheet Plugin System

| jspreadsheet | Our Extension System |
|---|---|
| Catch-all `onevent` | 20+ typed events in `GridEventMap` |
| No priority | Three-phase (`before`/`on`/`after`) + numeric priority |
| No cancellation | `CancellableEvent` mixin on before-phase events |
| No dependencies | `ExtensionDependency` with required/optional + semver |
| No cleanup | `destroy()` lifecycle + automatic disposal |
| No inter-plugin comms | Typed `MessageBus` with request/reply |
| No async | Full async/await in hooks and lifecycle |
| No config validation | `ConfigSchema` with JSON Schema subset |
| Bolted-on React | Native hooks: `useExtension`, `useExtensionState`, `useExtensionSlot` |

---

## 9. Project Structure

```
istracked/datagrid/
├── package.json                     # root workspace config
├── pnpm-workspace.yaml
├── tsconfig.json                    # base tsconfig
├── tsconfig.build.json              # stricter production config
├── vite.config.ts                   # dev playground
├── vitest.config.ts                 # root test config
├── vitest.workspace.ts              # per-package test configs
├── playwright.config.ts
├── eslint.config.js                 # flat config (ESLint 9)
├── .prettierrc
├── .gitignore
├── PLAN.md                          # this file
│
├── packages/
│   ├── core/                        # @istracked/datagrid-core
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── types.ts             # GridConfig, ColumnDef, CellValue, etc.
│   │   │   ├── grid-model.ts        # core state machine
│   │   │   ├── column-model.ts      # column definitions, sizing, reorder
│   │   │   ├── selection.ts         # cell/row/range selection state machine
│   │   │   ├── sorting.ts           # multi-column sort
│   │   │   ├── filtering.ts         # filter predicates + composition
│   │   │   ├── pagination.ts        # offset/limit
│   │   │   ├── virtualization.ts    # row + column range calculations
│   │   │   ├── editing.ts           # cell edit lifecycle
│   │   │   ├── clipboard.ts         # copy/paste serialization
│   │   │   ├── grouping.ts          # row/column grouping
│   │   │   ├── plugin.ts            # extension host, registry, lifecycle
│   │   │   ├── events.ts            # typed event bus (before/on/after)
│   │   │   ├── undo-redo.ts         # command-pattern history
│   │   │   └── utils/
│   │   │       ├── range.ts
│   │   │       └── comparators.ts
│   │   └── __tests__/               # ~350 unit tests (core logic)
│   │       ├── grid-model.test.ts
│   │       ├── selection.test.ts
│   │       ├── sorting.test.ts
│   │       ├── filtering.test.ts
│   │       ├── virtualization.test.ts
│   │       ├── editing.test.ts
│   │       ├── clipboard.test.ts
│   │       ├── grouping.test.ts
│   │       ├── plugin.test.ts
│   │       ├── events.test.ts
│   │       └── undo-redo.test.ts
│   │
│   ├── react/                       # @istracked/datagrid-react
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── DataGrid.tsx         # <DataGrid /> main component
│   │   │   ├── context.ts           # GridContext
│   │   │   ├── use-grid.ts          # creates + memoizes grid model
│   │   │   ├── use-grid-store.ts    # useSyncExternalStore bridge
│   │   │   ├── use-virtualization.ts
│   │   │   ├── use-selection.ts
│   │   │   ├── use-keyboard.ts      # keyboard navigation
│   │   │   ├── use-drag-drop.ts     # file drag-and-drop
│   │   │   ├── renderers/
│   │   │   │   ├── HeaderRow.tsx
│   │   │   │   ├── Row.tsx
│   │   │   │   ├── Cell.tsx
│   │   │   │   ├── EditCell.tsx
│   │   │   │   ├── ColumnNode.tsx   # column-as-DOM-node
│   │   │   │   └── GhostRow.tsx
│   │   │   ├── cells/               # built-in cell renderers
│   │   │   │   ├── TextCell.tsx
│   │   │   │   ├── CalendarCell.tsx
│   │   │   │   ├── StatusCell.tsx
│   │   │   │   ├── TagsCell.tsx
│   │   │   │   ├── CompoundChipListCell.tsx
│   │   │   │   ├── CheckboxCell.tsx
│   │   │   │   ├── PasswordCell.tsx
│   │   │   │   ├── ChipSelectCell.tsx
│   │   │   │   ├── CurrencyCell.tsx
│   │   │   │   ├── RichTextCell.tsx
│   │   │   │   ├── NumericCell.tsx
│   │   │   │   ├── UploadCell.tsx
│   │   │   │   ├── SubGridCell.tsx
│   │   │   │   ├── ListCell.tsx
│   │   │   │   └── ActionsCell.tsx
│   │   │   ├── slots/
│   │   │   │   ├── Toolbar.tsx
│   │   │   │   ├── FormulaBar.tsx
│   │   │   │   ├── StatusBar.tsx
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   └── ContextMenu.tsx
│   │   │   └── styles/
│   │   │       ├── datagrid.css
│   │   │       └── datagrid-theme.css
│   │   └── __tests__/               # ~500 component tests
│   │       ├── DataGrid.test.tsx
│   │       ├── cells/
│   │       │   ├── TextCell.test.tsx
│   │       │   ├── CalendarCell.test.tsx
│   │       │   ├── StatusCell.test.tsx
│   │       │   └── ... (one per cell type)
│   │       ├── renderers/
│   │       │   ├── Cell.test.tsx
│   │       │   ├── GhostRow.test.tsx
│   │       │   └── ColumnNode.test.tsx
│   │       └── hooks/
│   │           ├── use-keyboard.test.ts
│   │           ├── use-selection.test.ts
│   │           └── use-drag-drop.test.ts
│   │
│   └── extensions/                  # @istracked/datagrid-extensions
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsup.config.ts
│       ├── src/
│       │   ├── index.ts
│       │   ├── regex-validation/
│       │   │   ├── index.ts
│       │   │   ├── regex-validation-plugin.ts
│       │   │   └── ValidationIndicator.tsx
│       │   ├── cell-comments/
│       │   │   ├── index.ts
│       │   │   ├── cell-comments-plugin.ts
│       │   │   ├── CommentPopover.tsx
│       │   │   ├── CommentPanel.tsx
│       │   │   └── CommentIndicator.tsx
│       │   ├── column-resize/
│       │   │   ├── index.ts
│       │   │   ├── column-resize-plugin.ts
│       │   │   └── ResizeHandle.tsx
│       │   ├── column-reorder/
│       │   │   └── ...
│       │   ├── row-grouping/
│       │   │   └── ...
│       │   ├── column-grouping/
│       │   │   └── ...
│       │   ├── excel-export/
│       │   │   └── ...
│       │   └── frozen-columns/
│       │       └── ...
│       └── __tests__/               # ~150 extension tests
│           ├── regex-validation.test.ts
│           ├── cell-comments.test.ts
│           ├── column-resize.test.ts
│           └── ...
│
├── playground/                      # dev sandbox (not published)
│   ├── index.html
│   ├── main.tsx
│   ├── App.tsx
│   ├── demos/
│   │   ├── BasicGrid.tsx
│   │   ├── PivotModes.tsx
│   │   ├── EditableGrid.tsx
│   │   ├── SubGridDemo.tsx
│   │   ├── DragDropDemo.tsx
│   │   └── KitchenSink.tsx
│   └── data/
│       └── mock-data.ts
│
└── e2e/                             # Playwright E2E tests
    ├── fixtures/
    │   └── grid-page.ts             # page object model
    ├── basic.spec.ts
    ├── virtualization.spec.ts
    ├── keyboard-navigation.spec.ts
    ├── editing.spec.ts
    ├── drag-drop.spec.ts
    └── sub-grid.spec.ts
```

---

## 10. Dependencies

### 10.1 Root Workspace

```jsonc
{
  "devDependencies": {
    // Build
    "typescript": "~5.7.3",
    "tsup": "~8.4.0",
    "vite": "~6.1.0",

    // Test
    "vitest": "~3.0.5",
    "@testing-library/react": "~16.2.0",
    "@testing-library/jest-dom": "~6.6.3",
    "jsdom": "~25.0.1",
    "@playwright/test": "~1.50.1",

    // Lint + Format
    "eslint": "~9.19.0",
    "typescript-eslint": "~8.22.0",
    "eslint-plugin-react-hooks": "~5.1.0",
    "prettier": "~3.4.2",

    // React (dev — peer dep for packages)
    "react": "~19.0.0",
    "react-dom": "~19.0.0",
    "@types/react": "~19.0.8",
    "@types/react-dom": "~19.0.3"
  }
}
```

### 10.2 Package Dependencies

| Package | Runtime Deps | Peer Deps |
|---------|-------------|-----------|
| `@istracked/datagrid-core` | **None** (zero dependencies) | — |
| `@istracked/datagrid-react` | `@istracked/datagrid-core` | `react ^19`, `react-dom ^19` |
| `@istracked/datagrid-extensions` | `@istracked/datagrid-core` | `@istracked/datagrid-react`, `react ^19` |

### 10.3 Optional Dependencies (per extension)

| Extension | Optional Dep | Purpose |
|-----------|-------------|---------|
| `excel-export` | `xlsx` or `exceljs` | XLSX generation |
| `rich-text` | `@tiptap/react` | Rich text editing |
| `cell-comments` | None (host provides persistence) | — |

---

## 11. Test Suite Plan (1001 Tests)

Following TDD philosophy: **all tests written first, all failing, then implemented one group at a time.**

### Test Distribution

| Category | Count | Tool |
|----------|-------|------|
| Core Grid Rendering | 35 | Vitest + RTL |
| Pivot Modes — Column-Driven | 28 | Vitest + RTL |
| Pivot Modes — Row-Driven | 26 | Vitest + RTL |
| Cell Type: Text | 18 | Vitest + RTL |
| Cell Type: Calendar | 20 | Vitest + RTL |
| Cell Type: Status (Dropdown) | 18 | Vitest + RTL |
| Cell Type: Tags | 18 | Vitest + RTL |
| Cell Type: Compound Chip List | 16 | Vitest + RTL |
| Cell Type: Checkbox | 14 | Vitest + RTL |
| Cell Type: Password | 14 | Vitest + RTL |
| Cell Type: Chip Select | 16 | Vitest + RTL |
| Cell Type: Currency | 14 | Vitest + RTL |
| Cell Type: Rich Text | 16 | Vitest + RTL |
| Cell Type: Numeric | 14 | Vitest + RTL |
| Cell Type: Upload/Download | 16 | Vitest + RTL |
| Cell Type: Sub-Grid | 16 | Vitest + RTL |
| Cell Type: Actions | 14 | Vitest + RTL |
| Cell Type: List | 12 | Vitest + RTL |
| JSON Configuration | 30 | Vitest + RTL |
| Extension System | 48 | Vitest |
| Extension: Regex Validation | 32 | Vitest |
| Extension: Cell Comments | 38 | Vitest + RTL |
| Sub-Grid | 18 | Vitest + RTL |
| Drag & Drop Files | 36 | Vitest + RTL + Playwright |
| Context Menu | 22 | Vitest + RTL |
| Sorting & Filtering | 38 | Vitest |
| Grouping | 28 | Vitest + RTL |
| Keyboard Navigation | 36 | Vitest + RTL + Playwright |
| Ghost Row | 22 | Vitest + RTL |
| Column Operations | 28 | Vitest + RTL |
| Selection | 30 | Vitest + RTL |
| Undo/Redo | 26 | Vitest |
| Export | 24 | Vitest |
| Master-Detail | 20 | Vitest + RTL |
| Validation | 26 | Vitest + RTL |
| Clipboard | 28 | Vitest + RTL |
| Theming | 24 | Vitest + RTL |
| **TOTAL** | **1001** | |

### Full Test Listing

(See appendix file: `datagrid/TESTS.md`)

---

## 12. Files Affected

### 12.1 New Files (datagrid repo)

| File | Package | Risk |
|------|---------|------|
| `packages/core/src/types.ts` | core | None — new file |
| `packages/core/src/grid-model.ts` | core | None |
| `packages/core/src/column-model.ts` | core | None |
| `packages/core/src/selection.ts` | core | None |
| `packages/core/src/sorting.ts` | core | None |
| `packages/core/src/filtering.ts` | core | None |
| `packages/core/src/pagination.ts` | core | None |
| `packages/core/src/virtualization.ts` | core | None |
| `packages/core/src/editing.ts` | core | None |
| `packages/core/src/clipboard.ts` | core | None |
| `packages/core/src/grouping.ts` | core | None |
| `packages/core/src/plugin.ts` | core | None |
| `packages/core/src/events.ts` | core | None |
| `packages/core/src/undo-redo.ts` | core | None |
| `packages/react/src/DataGrid.tsx` | react | None |
| `packages/react/src/cells/*.tsx` (15 files) | react | None |
| `packages/react/src/renderers/*.tsx` (6 files) | react | None |
| `packages/react/src/slots/*.tsx` (5 files) | react | None |
| `packages/react/src/hooks/*.ts` (5 files) | react | None |
| `packages/react/src/styles/*.css` (2 files) | react | None |
| `packages/extensions/src/**/` (8 extensions) | extensions | None |
| Test files (~40 files) | all | None |
| Config files (~12 files) | root | None |

**Total new files: ~110**

### 12.2 Webapp Files Affected (future migration, NOT in this plan)

| File | Change | Risk |
|------|--------|------|
| `webapp/package.json` | Remove 17 @progress deps, add 3 @istracked deps | Medium |
| `webapp/src/components/common/DataGrid/*` (40+ files) | Replace entirely | Medium |
| `webapp/src/modules/assets/components/AssetGrid/*` | Update imports + props | Low |
| `webapp/src/modules/*/components/*Grid*` | Update imports + props | Low |
| `webapp/src/styles/kendo.overrides.css` | Delete | None |

**Migration is a separate phase. This plan covers only the new datagrid repo.**

---

## 13. Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| New repo, no production impact | **None** | Isolated development |
| Test suite written before implementation | **None** | TDD ensures coverage |
| Core package has zero runtime deps | **Low** | No dependency risk |
| React 19 peer dependency | **Low** | Webapp already on React 19 |
| Custom virtualization vs proven library | **Medium** | Extensive tests (35+ virtualization tests). Consider falling back to `@tanstack/virtual` if needed. |
| Rendering performance of column-DOM approach | **Medium** | Benchmark early (Phase 4). Canvas fallback designed in. |
| Extension system complexity | **Low** | Type contracts written first. Implementation follows contracts. |
| Rich text cell (TipTap dependency) | **Low** | Peer dependency, tree-shakeable |
| Sub-grid recursive rendering | **Medium** | Cap nesting depth. Test performance at 3 levels. |
| Drag-and-drop browser compat | **Low** | Standard HTML5 DnD API. Playwright E2E across browsers. |
| Migration from Telerik (future) | **Medium** | API surface designed to match current patterns. Cell registry pattern preserved. |

---

## 14. Execution Order

### Phase 1: Scaffold + Test Infrastructure (Week 1)
**Goal:** Empty project that builds, lints, and runs (failing) tests.

| Step | Task | Risk | Depends On |
|------|------|------|------------|
| 1.1 | Initialize monorepo (pnpm, workspaces, tsconfig) | None | — |
| 1.2 | Configure Vitest, Playwright, ESLint, Prettier | None | 1.1 |
| 1.3 | Create package stubs (core, react, extensions) | None | 1.1 |
| 1.4 | Write ALL 1001 test stubs (describe + it.todo) | None | 1.2 |
| 1.5 | Verify test runner discovers all tests | None | 1.4 |

### Phase 2: Core State Machine (Weeks 2-3)
**Goal:** Framework-agnostic grid engine passing all core tests.

| Step | Task | Risk | Depends On |
|------|------|------|------------|
| 2.1 | Implement `types.ts` — all type definitions | None | 1.3 |
| 2.2 | Implement `events.ts` — typed event bus with phases | Low | 2.1 |
| 2.3 | Implement `grid-model.ts` — core state + subscribe() | Low | 2.1, 2.2 |
| 2.4 | Implement `column-model.ts` — column state | None | 2.1 |
| 2.5 | Implement `selection.ts` — selection state machine | Low | 2.1 |
| 2.6 | Implement `sorting.ts` — multi-column sort | None | 2.1 |
| 2.7 | Implement `filtering.ts` — composite filters | None | 2.1 |
| 2.8 | Implement `virtualization.ts` — range calculations | Low | 2.1 |
| 2.9 | Implement `editing.ts` — edit lifecycle | Low | 2.1, 2.2 |
| 2.10 | Implement `clipboard.ts` — copy/paste serialization | None | 2.1 |
| 2.11 | Implement `undo-redo.ts` — command pattern history | None | 2.1, 2.2 |
| 2.12 | Implement `grouping.ts` — row/column grouping | Low | 2.1 |
| 2.13 | Implement `plugin.ts` — extension host + lifecycle | Medium | 2.1, 2.2 |
| 2.14 | Pass all core unit tests (~350 tests) | — | 2.2-2.13 |

### Phase 3: React Rendering Layer (Weeks 4-5)
**Goal:** Grid renders in browser with virtualization and basic interaction.

| Step | Task | Risk | Depends On |
|------|------|------|------------|
| 3.1 | Implement `DataGrid.tsx` — main component shell | Low | 2.3 |
| 3.2 | Implement `use-grid.ts` + `use-grid-store.ts` | Low | 2.3 |
| 3.3 | Implement `ColumnNode.tsx` — column-as-DOM-node | Medium | 3.1 |
| 3.4 | Implement `HeaderRow.tsx`, `Row.tsx`, `Cell.tsx` | Low | 3.3 |
| 3.5 | Implement `use-virtualization.ts` — scroll handler | Medium | 2.8, 3.1 |
| 3.6 | Implement `use-selection.ts` — mouse/click selection | Low | 2.5, 3.1 |
| 3.7 | Implement `use-keyboard.ts` — keyboard navigation | Low | 3.6 |
| 3.8 | Implement `GhostRow.tsx` — inline new row | Low | 3.4 |
| 3.9 | Implement `ContextMenu.tsx` | Low | 3.1 |
| 3.10 | Implement slots: `Toolbar.tsx`, `FormulaBar.tsx`, `StatusBar.tsx` | None | 3.1 |
| 3.11 | Implement `datagrid.css` + `datagrid-theme.css` | None | 3.1 |
| 3.12 | Set up playground with basic demo | None | 3.1-3.11 |
| 3.13 | Pass all rendering + interaction tests (~200 tests) | — | 3.1-3.12 |

### Phase 4: Cell Types (Weeks 5-7)
**Goal:** All 15 cell types implemented and tested.

| Step | Task | Risk | Depends On |
|------|------|------|------------|
| 4.1 | `TextCell.tsx` | None | 3.4 |
| 4.2 | `CheckboxCell.tsx` | None | 3.4 |
| 4.3 | `NumericCell.tsx` | None | 3.4 |
| 4.4 | `PasswordCell.tsx` | None | 3.4 |
| 4.5 | `CalendarCell.tsx` (date picker popup) | Low | 3.4 |
| 4.6 | `StatusCell.tsx` (dropdown with badges) | Low | 3.4 |
| 4.7 | `ListCell.tsx` (simple dropdown) | Low | 3.4 |
| 4.8 | `TagsCell.tsx` (chip list + autocomplete) | Medium | 3.4 |
| 4.9 | `ChipSelectCell.tsx` (multi-select chips) | Medium | 3.4 |
| 4.10 | `CompoundChipListCell.tsx` | Medium | 3.4 |
| 4.11 | `CurrencyCell.tsx` | None | 3.4 |
| 4.12 | `ActionsCell.tsx` | None | 3.4 |
| 4.13 | `UploadCell.tsx` (file link + upload) | Low | 3.4 |
| 4.14 | `RichTextCell.tsx` (TipTap integration) | Medium | 3.4 |
| 4.15 | `SubGridCell.tsx` (nested grid expansion) | Medium | 3.4, 3.1 |
| 4.16 | Implement pivot mode: column-driven | Low | 4.1-4.15 |
| 4.17 | Implement pivot mode: row-driven | Low | 4.1-4.15 |
| 4.18 | Pass all cell type + pivot tests (~280 tests) | — | 4.1-4.17 |

### Phase 5: Extensions (Weeks 7-8)
**Goal:** Extension system live with two built-in extensions.

| Step | Task | Risk | Depends On |
|------|------|------|------------|
| 5.1 | Implement extension host runtime (from type contracts) | Medium | 2.13 |
| 5.2 | Implement React hooks: `useExtension`, `useExtensionState` | Low | 5.1 |
| 5.3 | Implement message bus | Low | 5.1 |
| 5.4 | Implement toolbar/context menu contribution APIs | Low | 5.1, 3.9, 3.10 |
| 5.5 | Implement regex validation extension | Low | 5.1-5.4 |
| 5.6 | Implement cell comments extension | Medium | 5.1-5.4 |
| 5.7 | Implement column-resize extension | Low | 5.1 |
| 5.8 | Implement column-reorder extension | Low | 5.1 |
| 5.9 | Implement row-grouping extension | Medium | 5.1, 2.12 |
| 5.10 | Implement column-grouping extension | Medium | 5.1, 2.12 |
| 5.11 | Pass all extension tests (~120 tests) | — | 5.5-5.10 |

### Phase 6: Advanced Features (Weeks 8-10)
**Goal:** Sub-grid, drag-drop, master-detail, export.

| Step | Task | Risk | Depends On |
|------|------|------|------------|
| 6.1 | Implement `use-drag-drop.ts` — file drag-and-drop | Low | 3.1 |
| 6.2 | Implement grid-level, column-level, cell-level drop targets | Low | 6.1 |
| 6.3 | Implement sub-grid data flow (drop → sub-grid entry) | Medium | 4.15, 6.2 |
| 6.4 | Implement master-detail expansion (detail row wrapper) | Low | 3.1 |
| 6.5 | Implement excel-export extension | Low | 5.1 |
| 6.6 | Implement CSV export | None | 5.1 |
| 6.7 | Pass all advanced feature tests (~100 tests) | — | 6.1-6.6 |

### Phase 7: Polish + E2E (Week 10-11)
**Goal:** Full E2E coverage, performance benchmarks, documentation.

| Step | Task | Risk | Depends On |
|------|------|------|------------|
| 7.1 | Write Playwright E2E tests (drag-drop, keyboard, scroll) | None | 6.7 |
| 7.2 | Performance benchmark: 10K rows, 50 columns | Low | 3.5 |
| 7.3 | Accessibility audit (ARIA roles, screen reader) | Low | 3.4 |
| 7.4 | KitchenSink playground demo | None | All |
| 7.5 | All 1001 tests green | — | All |

### Phase 8: Migration Prep (Week 12, separate effort)
**Goal:** Integration path from webapp's current Telerik grid.

| Step | Task | Risk | Depends On |
|------|------|------|------------|
| 8.1 | Create migration guide: Telerik → @istracked/datagrid | None | 7.5 |
| 8.2 | Create adapter for existing column configs | Low | 7.5 |
| 8.3 | Pilot migration: one grid page in webapp | Medium | 8.2 |

---

## Timeline Summary

```
Week 1:      Scaffold + 1001 test stubs
Weeks 2-3:   Core state machine (350 tests green)
Weeks 4-5:   React rendering layer (550 tests green)
Weeks 5-7:   Cell types + pivot modes (830 tests green)
Weeks 7-8:   Extension system (950 tests green)
Weeks 8-10:  Advanced features (1001 tests green)
Weeks 10-11: E2E, perf, a11y, polish
Week 12:     Migration prep
```

**Total: ~12 weeks to feature-complete datagrid + migration guide.**
