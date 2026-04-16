# Storybook Consolidation & MUI Refactor Plan

## Objective

Eliminate duplicate demo infrastructure (playground vs storybook), refactor all stories to use MUI components, add missing extensions from webapp modules, and add missing stories (sub-grid, new extensions).

---

## Current State

| Surface | Entry | Content |
|---------|-------|---------|
| `pnpm run dev` | Vite → playground/ | kitchen-sink (stress test) + sink-kitchen (27 sections) |
| `pnpm run storybook` | Storybook → stories/ | 14 story files, 22 stories |
| `pnpm run build-storybook` | Static HTML | Same as storybook |

**Problem**: playground and stories demo the same features with different code. Stories use plain React cell renderers instead of MUI.

## Target State

| Surface | Entry | Content |
|---------|-------|---------|
| `pnpm run storybook` | Storybook dev server | ALL features from playground + existing stories, MUI renderers |
| `pnpm run build-storybook` | Static HTML site | Same as storybook |
| `pnpm run dev` | **REMOVED** | — |

---

## Files Affected

### DELETE (risk: low)
| File | Reason |
|------|--------|
| `playground/index.html` | Consolidated into storybook |
| `playground/kitchen-sink/index.html` | → KitchenSink.stories.tsx |
| `playground/kitchen-sink/main.tsx` | → KitchenSink.stories.tsx |
| `playground/sink-kitchen/index.html` | → Individual story files |
| `playground/sink-kitchen/main.tsx` | → Individual story files |
| `playground/sink-kitchen/sections.tsx` | → Individual story files |
| `playground/helpers.ts` | → stories/helpers.ts (already exists) |
| `playground/data/index.ts` | → stories/data.ts (already exists) |
| `playground/package.json` | No longer needed |
| `playground/vite.config.ts` | Storybook has own Vite config |

### MODIFY (risk: low)
| File | Change |
|------|--------|
| `package.json` | Remove `dev` script |
| `stories/helpers.ts` | Switch to MUI renderers (`muiCellRendererMap`) |
| `stories/BasicGrid.stories.tsx` | Use `MuiDataGrid` instead of `DataGrid` |
| `stories/CellTypes.stories.tsx` | Use `MuiDataGrid` |
| `stories/ChromeColumns.stories.tsx` | Use `MuiDataGrid` |
| `stories/ColumnOperations.stories.tsx` | Use `MuiDataGrid` |
| `stories/ContextMenu.stories.tsx` | Use `MuiDataGrid` |
| `stories/Editing.stories.tsx` | Use `MuiDataGrid` |
| `stories/Extensions.stories.tsx` | Use `MuiDataGrid` |
| `stories/Filtering.stories.tsx` | Use `MuiDataGrid` |
| `stories/GhostRow.stories.tsx` | Use `MuiDataGrid` |
| `stories/Grouping.stories.tsx` | Use `MuiDataGrid` |
| `stories/Keyboard.stories.tsx` | Use `MuiDataGrid` |
| `stories/KitchenSink.stories.tsx` | Use `MuiDataGrid`, merge playground kitchen-sink features |
| `stories/MasterDetail.stories.tsx` | Use `MuiDataGrid` |
| `stories/Selection.stories.tsx` | Use `MuiDataGrid` |
| `stories/Sorting.stories.tsx` | Use `MuiDataGrid` |
| `stories/Theming.stories.tsx` | Use `MuiDataGrid` + `MuiDataGridThemeProvider` |
| `.storybook/main.ts` | Add MUI package alias |
| `.storybook/preview.ts` | Add MUI theme provider decorator |
| `README.md` | Remove `pnpm run dev` from commands table |

### CREATE (risk: low)
| File | Purpose |
|------|---------|
| `stories/SubGrid.stories.tsx` | **Missing**: sub-grid expansion, nested grids, single-expand mode |
| `stories/Components.stories.tsx` | COMPONENTS reference: MUI components we wrap locally |
| `stories/Virtualization.stories.tsx` | From playground: 500-row virtual scroll demo |
| `stories/Clipboard.stories.tsx` | From playground: copy/cut/paste demo |
| `stories/UndoRedo.stories.tsx` | From playground: dedicated undo/redo story |
| `stories/ReadOnly.stories.tsx` | From playground: read-only mode demo |
| `stories/EmptyState.stories.tsx` | From playground: zero-row empty state |
| `stories/TransposedGrid.stories.tsx` | From playground: transposed/form mode |
| `packages/extensions/src/formula-bar/index.ts` | New extension: formula bar editing |
| `packages/extensions/src/excel-mode/index.ts` | New extension: excel-style tab-through editing |
| `packages/extensions/src/validation-tooltip/index.ts` | New extension: validation tooltip display |
| `stories/FormulaBar.stories.tsx` | Story for formula bar extension |
| `stories/ExcelMode.stories.tsx` | Story for excel mode extension |
| `stories/ValidationTooltip.stories.tsx` | Story for validation tooltip |
| `stories/__tests__/storybook-consolidation.test.tsx` | TDD test suite |

### NEW EXTENSIONS (from webapp modules)
| Extension | Webapp Source | Risk |
|-----------|-------------|------|
| `formula-bar` | `DataGrid/FormulaBar.tsx` + `RichTextFormulaBar.tsx` | Low |
| `excel-mode` | `SmartDataGridExcelMode.tsx` | Low |
| `validation-tooltip` | `ValidationTooltip.tsx` | Low |

---

## Execution Order

### Step 1: Tests (TDD)
Write comprehensive test suite covering:
- All stories render without errors
- MUI cell renderers are used (not plain React)
- Sub-grid stories exist and render
- New extension stories exist
- COMPONENTS reference story exists
- No playground directory references remain
- `dev` script is removed from package.json

### Step 2: Consolidate infrastructure
- Remove `dev` script from package.json
- Update .storybook config for MUI
- Update stories/helpers.ts to use MUI renderers

### Step 3: Refactor existing stories to MUI
- Switch all 14 story files from `DataGrid` to `MuiDataGrid`
- Update imports and renderer maps

### Step 4: Add missing stories from playground
- SubGrid, Virtualization, Clipboard, UndoRedo, ReadOnly, EmptyState, TransposedGrid
- Merge playground kitchen-sink features into KitchenSink.stories.tsx

### Step 5: Add COMPONENTS reference story
- Document all MUI components we wrap with local implementations

### Step 6: Create new extensions
- formula-bar, excel-mode, validation-tooltip

### Step 7: Add extension stories
- FormulaBar, ExcelMode, ValidationTooltip stories

### Step 8: Delete playground
- Remove playground/ directory entirely

### Step 9: Update README
- Remove `pnpm run dev` from commands table
- Update storybook documentation

---

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Delete playground/ | Low | All content migrated to stories first |
| Remove `dev` script | Low | Storybook replaces it |
| Switch to MUI renderers | Low | MUI package already exists with all 15 cell types |
| New extensions | Low | Standalone modules, no existing code changes |
| New stories | Low | Additive only |

**Overall risk: LOW** — This is a consolidation and migration, not a behavioral change.
