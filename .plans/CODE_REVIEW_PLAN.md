# xldatagrid — Comprehensive Code Review & Implementation Plan

**Date:** 2026-04-15 | **Risk Level:** LOW (greenfield repo, no production consumers yet)
**Reviewers:** Dan Abramov, Sebastian Markbage, Anders Hejlsberg, Tanner Linsley, Matt Pocock + 5 specialist agents

---

## Executive Summary

10 parallel expert reviews analyzed every layer of the monorepo. The architecture is fundamentally sound — the module decomposition (pure core + React bindings + extensions + MUI adapter) is correct, and 1,311 tests pass. However, there are **critical correctness bugs**, **type safety holes**, **accessibility gaps**, and **performance traps** that must be fixed before this ships.

---

## Part 1: Critical Findings (Ranked by Severity)

### CRITICAL (must fix — correctness/security bugs)

| # | Finding | Source | Files Affected |
|---|---------|--------|----------------|
| C1 | **`useGridStore` doesn't use `useSyncExternalStore`** — tearing bug in concurrent React. `useReducer` + `useEffect` subscription can render stale state. | Abramov, Linsley | `packages/react/src/use-grid-store.ts:43-54` |
| C2 | **Mutable data behind immutable facade** — undo/redo commands mutate the live `data` array via `splice`/direct assignment. Previous `getState()` snapshots are corrupted. | Markbage | `packages/core/src/undo-redo.ts:151,175-176`, `grid-model.ts:405` |
| C3 | **RichTextCell uses `dangerouslySetInnerHTML` with regex sanitizer** — `onerror`, `onload`, `javascript:` URIs, `<iframe>` all survive `stripScripts()`. XSS vulnerability. | Cell review | `packages/react/src/cells/RichTextCell.tsx:139`, `packages/mui/src/cells/MuiRichTextCell.tsx:51` |
| C4 | **Clipboard Ctrl+C/V/X completely unimplemented** — `use-keyboard.ts` has zero clipboard key handlers despite the infrastructure existing in `clipboard.ts`. | A11y review | `packages/react/src/use-keyboard.ts` |
| C5 | **Model never updates when props change** — `useMemo(() => createAtomicGridModel(config), [])` with empty deps. Changing `data` or `columns` props is silently ignored. | Abramov | `packages/react/src/use-grid.ts:64,101` |
| C6 | **Fire-and-forget async dispatch** — `eventBus.dispatch` returns a Promise that is never awaited. Before-phase hook cancellation is architecturally dead for all sync mutations. | Markbage | `packages/core/src/grid-model.ts:529,578,604,625,639,649,657` |
| C7 | **`aria-selected` missing on cells** — selection is invisible to screen readers. | A11y review | `packages/react/src/body/DataGridBody.tsx:202-216` |
| C8 | **17 TypeScript errors / build fails** — missing exports (`ControlsColumnConfig`, `toggleRowSelection`, `createRowMoveCommand`), type error at `selection.ts:262`. | Test runner | Multiple files across `packages/core` and `packages/react` |
| C9 | **Cell renderer sub-path exports don't exist** — published consumers importing `@istracked/datagrid-react/cells/TextCell` get resolution failures. | DX review | `packages/react/package.json` |

### HIGH (significant quality/performance issues)

| # | Finding | Source | Files Affected |
|---|---------|--------|----------------|
| H1 | **`TData` generic erased at module boundaries** — `ColumnState` loses `TData`, forcing `as` casts everywhere. `ColumnDef.field` is `string` not `keyof TData`. | Hejlsberg | `packages/core/src/column-model.ts`, `grid-model.ts:407,440` |
| H2 | **Event payloads untyped** — `Record<string, unknown>` for all 20+ event types. Extensions must blindly cast. | Hejlsberg, Extension review | `packages/core/src/types.ts:880`, `events.ts` |
| H3 | **`getProcessedData()` recomputed on every call** — no memoization in the imperative `createGridModel` path. Filter+sort runs on every read. | Linsley | `packages/core/src/grid-model.ts:439-444` |
| H4 | **`isCellInRange` is O(n) per cell** — uses `indexOf` for both row and column lookups. At 10k rows, checking selection for visible cells is O(n*m). | Linsley | `packages/core/src/selection.ts:183-186` |
| H5 | **Scroll handler in `useState`** — every scroll event triggers a React state update = 60 re-renders/sec. Should use ref + rAF throttle. | Linsley | `packages/react/src/use-virtualization.ts:111-115` |
| H6 | **No cell memoization** — zero of 30 cell components use `React.memo`. Every cell re-renders on any row-level state change. | Cell review | All `packages/react/src/cells/*.tsx`, `packages/mui/src/cells/*.tsx` |
| H7 | **Tab traps focus in the grid** — `e.preventDefault()` unconditionally on Tab violates WAI-ARIA grid pattern. | A11y review | `packages/react/src/use-keyboard.ts:74` |
| H8 | **No `model.destroy()` on unmount** — leaks subscriptions, event bus listeners, plugin host for the page lifetime. | Abramov | `packages/react/src/DataGrid.tsx` |
| H9 | **Plugin init has no rollback on failure** — extension registered before `init` runs; if `init` throws, extension stuck in broken state. | Extension review | `packages/core/src/plugin.ts:116-119` |
| H10 | **`deleteRows` doesn't batch** — pushes N separate commands instead of using `createBatchCommand`. N individual undos required. | Markbage, Linsley | `packages/core/src/grid-model.ts:582-606` |
| H11 | **`ctx.subscribe` disposer not tracked** — subscriptions created via extension context leak after `unregister`. | Extension review | `packages/core/src/plugin.ts:220` |
| H12 | **No coverage thresholds** — tests can regress to 0% and CI would still pass. | Pocock | `vitest.config.ts` |
| H13 | **~500 of 1001 planned tests implemented** — TESTS.md creates false confidence. | Pocock | `TESTS.md` |
| H14 | **Stale closure in `handleGroupCollapseToggle`** — reads pre-dispatch state immediately after dispatching. | Abramov | `packages/react/src/DataGrid.tsx:595-599` |
| H15 | **UploadCell discards `File` object** — only `file.name` is committed. No upload callback exists. | Cell review | `packages/react/src/cells/UploadCell.tsx:87` |

### MEDIUM (design/DX issues)

| # | Finding | Source |
|---|---------|--------|
| M1 | No discriminated union per cell type — `ColumnDef` allows nonsensical property combos | Hejlsberg |
| M2 | Grouping/pagination not wired into derived atom pipeline | Linsley |
| M3 | Fixed row heights only in virtualization — breaks rich text/sub-grid | Linsley |
| M4 | No inter-extension communication mechanism | Extension review |
| M5 | Stale `gridState` snapshot on `ExtensionContext` | Markbage, Extension review |
| M6 | No Storybook controls/argTypes on any story | DX review |
| M7 | Dual state model (Jotai atoms + imperative GridModel) causes divergence | Abramov |
| M8 | Zero type-level tests for the public API | Pocock |
| M9 | Duplicated test factories across 8+ test files | Pocock |
| M10 | No `prefers-reduced-motion` / `forced-colors` / `:focus-visible` CSS | A11y review |
| M11 | Hardcoded hex colors throughout styles instead of CSS variables | Cell review, DX review |
| M12 | `eslint-disable exhaustive-deps` in 10+ cell components | Cell review |
| M13 | `MasterDetail` duplicates rendering instead of composing with `DataGrid` | Abramov |
| M14 | Event bridge fires duplicate events alongside explicit dispatches | Abramov |
| M15 | No dependency-aware extension unregistration | Extension review |

---

## Part 2: Implementation Plan — TDD-First

### Phase 0: Fix Build & Type Errors (Day 1)
**Risk: LOW** | **Dependencies: None** | **Blocking: Everything else**

| File | Change | Risk |
|------|--------|------|
| `packages/core/src/selection.ts:262` | Fix `CellRange \| null \| undefined` -> `CellRange \| null` | LOW |
| `packages/core/src/types.ts` | Export `ControlsColumnConfig`, `RowNumberColumnConfig`, `ControlAction` | LOW |
| `packages/core/src/selection.ts` | Export `toggleRowSelection` | LOW |
| `packages/core/src/undo-redo.ts` | Export `createRowMoveCommand` | LOW |
| `packages/react/src/DataGrid.tsx` | Fix references to non-existent properties (`ranges`, `chrome`, etc.) | LOW |
| `packages/react/package.json` | Add sub-path exports for cells | LOW |

### Phase 1: Write Tests for Critical Fixes (Days 1-2)
**TDD: Write failing tests FIRST, then fix.**

| Test Category | Test File | # Tests | What It Validates |
|--------------|-----------|---------|-------------------|
| Tearing/sync | `use-grid-store.test.ts` (new) | 8 | `useSyncExternalStore` contract, concurrent mode safety, selector memoization |
| Immutable snapshots | `undo-redo.test.ts` (extend) | 10 | Previous `getState()` snapshots unaffected by later mutations |
| XSS sanitization | `rich-text-cell.test.tsx` (new) | 12 | `onerror`, `onload`, `javascript:`, `<iframe>`, SVG vectors all stripped |
| Clipboard keys | `keyboard-nav.test.tsx` (extend) | 8 | Ctrl+C/V/X fire serialize/parse, multi-cell copy/paste |
| Prop updates | `DataGrid.test.tsx` (extend) | 6 | Changing `data`/`columns` props re-renders with new values |
| Event cancellation | `events.test.ts` (extend) | 5 | Before-hook cancellation actually prevents mutations |
| ARIA selection | `DataGrid.test.tsx` (extend) | 6 | `aria-selected` on cells, `aria-label` on grid |
| Plugin error recovery | `plugin.test.ts` (extend) | 6 | Failed `init` rolls back, `destroy` error doesn't leak hooks |
| Selection perf | `selection.test.ts` (extend) | 4 | `isCellInRange` with 10k rows completes < 10ms |
| Cell memo | `cells.test.tsx` (extend) | 6 | Cell doesn't re-render when unrelated row state changes |
| **Total** | | **~71** | |

### Phase 2: Implement Critical Fixes (Days 2-4)
**Execution order matters — each fix is numbered by dependency.**

| Order | Fix | Files | Risk | Depends On |
|-------|-----|-------|------|------------|
| 2.1 | Replace `useReducer`+`useEffect` with `useSyncExternalStore` | `use-grid-store.ts` | LOW | Phase 0 |
| 2.2 | Deep-clone data before passing to command factories; copy-on-write in undo/redo | `undo-redo.ts`, `grid-model.ts` | MED | Phase 0 |
| 2.3 | Add DOMPurify dependency; replace `stripScripts()` | `RichTextCell.tsx`, `MuiRichTextCell.tsx`, `package.json` | LOW | None |
| 2.4 | Wire Ctrl+C/V/X in `use-keyboard.ts` to `clipboard.ts` functions | `use-keyboard.ts` | LOW | Phase 0 |
| 2.5 | Add `useEffect` syncing `config.data` -> atom store when props change | `use-grid.ts` | LOW | 2.1 |
| 2.6 | Make mutations await `dispatch` and check cancellation before applying state | `grid-model.ts` | MED | Phase 0 |
| 2.7 | Add `aria-selected`, `aria-label` on grid, `aria-rowindex` on header | `DataGridBody.tsx`, `DataGrid.tsx`, `DataGridHeader.tsx` | LOW | None |
| 2.8 | Add `useEffect(() => () => model.destroy(), [model])` cleanup | `DataGrid.tsx` | LOW | None |

### Phase 3: Write Tests for High-Priority Fixes (Days 3-5)

| Test Category | # Tests | What It Validates |
|--------------|---------|-------------------|
| Typed event payloads | 10 | Event map discriminates payload per type |
| `TData` generic threading | 8 | No `as` casts needed in consumer code |
| `getProcessedData` memoization | 5 | Same result reference when inputs unchanged |
| Batch delete undo | 4 | Single undo reverts multi-row delete |
| Tab exits grid at boundary | 3 | Focus moves to next focusable element |
| Cell `React.memo` effectiveness | 6 | Render count assertions |
| Scroll perf | 4 | Scroll handler uses rAF, not `useState` |
| Coverage thresholds | 1 | Config enforces 80% lines/branches/functions |
| Type-level tests | 15 | `expect-type` tests for public API generics |
| **Total** | **~56** | |

### Phase 4: Implement High-Priority Fixes (Days 4-7)

| Order | Fix | Files | Risk |
|-------|-----|-------|------|
| 4.1 | Make `ColumnState` generic, thread `TData` through | `column-model.ts`, `grid-model.ts`, `types.ts` | MED |
| 4.2 | Add `GridEventMap` discriminated event type system | `types.ts`, `events.ts` | MED |
| 4.3 | Memoize `getProcessedData` with dirty flags | `grid-model.ts` | LOW |
| 4.4 | Replace `indexOf` with `Set` in `isCellInRange` | `selection.ts` | LOW |
| 4.5 | Replace `useState` scroll with `useRef` + `rAF` | `use-virtualization.ts` | LOW |
| 4.6 | Wrap all 30 cell components in `React.memo` | All `cells/*.tsx` | LOW |
| 4.7 | Fix Tab to exit grid at boundary | `use-keyboard.ts` | LOW |
| 4.8 | `deleteRows` -> use `createBatchCommand` | `grid-model.ts` | LOW |
| 4.9 | Plugin init try/catch with rollback | `plugin.ts` | LOW |
| 4.10 | Track `ctx.subscribe` disposers | `plugin.ts` | LOW |
| 4.11 | Add coverage thresholds to vitest config | `vitest.config.ts` | LOW |
| 4.12 | Add `vitest-plugin-expect-type` type tests | New files | LOW |

### Phase 5: Medium-Priority Improvements (Days 7-10)

| Fix | Files | Risk |
|-----|-------|------|
| Discriminated union per cell type on `ColumnDef` | `types.ts` | MED |
| Wire grouping/pagination into derived atom pipeline | `derived-atoms.ts`, `action-atoms.ts` | MED |
| Variable row height support in virtualization | `virtualization.ts`, `use-virtualization.ts` | MED |
| Add `prefers-reduced-motion`, `forced-colors`, `:focus-visible` CSS | `datagrid.css`, `datagrid-theme.css` | LOW |
| Replace hardcoded hex colors with CSS variables | All `.styles.ts` files | LOW |
| Create shared test utilities module | New `test-utils.ts` | LOW |
| Add Storybook argTypes/controls | All `.stories.tsx` | LOW |
| Fix `MasterDetail` to compose with `DataGrid` | `MasterDetail.tsx` | MED |
| Remove duplicate event bridge fires | `event-bridge.ts` | LOW |

---

## Part 3: Dependency Graph

```
Phase 0 (build fix)
  |-- Phase 1 (write critical tests) --> Phase 2 (critical fixes)
  |                                           |-- 2.1 (useSyncExternalStore)
  |                                           |     \-- 2.5 (prop sync)
  |                                           |-- 2.2 (immutable undo)
  |                                           |-- 2.3 (DOMPurify) [independent]
  |                                           |-- 2.4 (clipboard keys)
  |                                           |-- 2.6 (async dispatch)
  |                                           |-- 2.7 (ARIA) [independent]
  |                                           \-- 2.8 (destroy cleanup) [independent]
  |
  \-- Phase 3 (write high-prio tests) --> Phase 4 (high-prio fixes)
                                               |-- 4.1 (TData generics) -> 4.2 (event map)
                                               |-- 4.3-4.5 [independent of each other]
                                               |-- 4.6 (React.memo) [independent]
                                               \-- 4.9-4.10 (plugin fixes) [independent]

Phase 5 (medium-prio) --> after Phase 4 complete
```

---

## Part 4: Files Affected Summary

| Package | Files Modified | Files Created | Risk |
|---------|---------------|---------------|------|
| `packages/core` | 10 of 14 source files | 0 | LOW-MED |
| `packages/react` | 12 of ~40 source files | 2 test utils | LOW-MED |
| `packages/extensions` | 0 | 0 | NONE |
| `packages/mui` | 2 (RichTextCell, styles) | 0 | LOW |
| Root | 2 (vitest.config.ts, package.json) | 0 | LOW |
| **Tests** | ~8 existing test files extended | ~4 new test files | LOW |

**Total: ~127 new tests across Phases 1 & 3, on top of the existing 1,311.**

---

## Part 5: Detailed Expert Reviews

### Dan Abramov — React Architecture

1. **[CRITICAL] `useGridStore` should use `useSyncExternalStore`** (`use-grid-store.ts:43-54`). Tearing bug in concurrent mode.
2. **[CRITICAL] Model never updates when props change** (`use-grid.ts:64,101`). Empty deps on `useMemo`.
3. **[MAJOR] Dual state causes divergence and O(n) re-renders.** Jotai atoms, interaction reducer, and local `useState` all fighting.
4. **[MAJOR] Massive render body** — `DataGrid.tsx` is 870 lines, O(n^2) column ordering on every render.
5. **[MAJOR] `DataGridBody` is not memoized** — 30 props including new function references every render.
6. **[MAJOR] `handleGroupCollapseToggle` reads stale state** (`DataGrid.tsx:595-599`).
7. **[MAJOR] `processFiles` in `useDragDrop` closes over stale `state.uploads`** (`use-drag-drop.ts:266,352`).
8. **[MINOR] `useCallback` on `dispatch` is pointless** — `dispatch` from `useReducer` is stable.
9. **[MINOR] `getContextMenuItems` captures stale deps** (`DataGrid.tsx:230-247`).
10. **[MINOR] `MasterDetail` is a parallel implementation**, not composing with DataGrid.
11. **[MINOR] Event bridge fires duplicate events** (`event-bridge.ts:44-56`).
12. **[MINOR] No `model.destroy()` call on unmount** — leaks subscriptions.

### Sebastian Markbage — Core Architecture

1. **[MEDIUM] GridModel is a god function** — 53+ members, should be split into facets.
2. **[LOW-MEDIUM] EventBus re-sorts on every `addHook`** — O(n log n) per registration.
3. **[LOW] PluginHost is well-structured** — dependency validation, reverse teardown correct.
4. **[HIGH] Mutable data behind immutable facade** — `let state` + spread with in-place splice.
5. **[HIGH] `deleteRows` doesn't batch** — N commands instead of `createBatchCommand`.
6. **[LOW] Framework agnosticism is clean** — no React leaks in core.
7. **[LOW-MEDIUM] Command closures retain data array references** — prevents GC.
8. **[MEDIUM-HIGH] Async dispatch is fire-and-forget** — cancellation is dead.

### Anders Hejlsberg — TypeScript Types

1. **[HIGH] `TData` erased at module boundaries** — `ColumnState` drops the generic.
2. **[HIGH] `ColumnDef.field` is `string`, not `keyof TData`**.
3. **[HIGH] Event payload is `Record<string, unknown>`** — zero per-event discrimination.
4. **[MEDIUM] Missing discriminated unions** for cell types.
5. **[HIGH] Unsafe `as any` casts** — `(props as any).onValidationError`, `{ model, store, atoms } as any`.
6. **[MEDIUM] No branded/nominal types** for `rowId` vs `field`.
7. **[MEDIUM] Context type erasure** — `useGridContext<TData>()` casts without validation.
8. **[MEDIUM] Extension system is closed** — `GridEventType` can't be augmented.

### Tanner Linsley — State & Data Layer

1. **[HIGH] Grouping/pagination missing from pipeline**.
2. **[MEDIUM] O(n) `indexOf` in `setCellValue`** at 10k rows.
3. **[HIGH] `getProcessedData()` has zero memoization** in imperative path.
4. **[HIGH] `useGridStore` tearing hazard** — concurrent React.
5. **[HIGH] `useGridSelector` re-renders on every change** regardless of selector output.
6. **[HIGH] Virtualization assumes fixed row heights only**.
7. **[HIGH] Scroll handler in `useState`** — 60 re-renders/sec.
8. **[MEDIUM] `deleteRows` doesn't batch**.
9. **[HIGH] `isCellInRange` is O(n) per cell**.
10. **[HIGH] `useGrid` has empty dependency array** — model frozen at mount.

### Matt Pocock — Test Suite & DX

1. **[MEDIUM] No shared test utility module** — 8+ separate `makeData()` definitions.
2. **[HIGH] Missing test categories**: concurrency, a11y, error boundaries, perf, clipboard.
3. **[MEDIUM] Weak assertions** that would pass broken implementations.
4. **[MEDIUM] Missing `navigator.clipboard`, `matchMedia`, `IntersectionObserver` mocks**.
5. **[HIGH] No coverage thresholds**.
6. **[HIGH] TESTS.md plan: 1001 tests planned, ~500 implemented**.
7. **[HIGH] Zero type-level tests**.
8. **[LOW] `globals: true`** hurts discoverability.

### Cell Renderer & MUI Review

1. **[MEDIUM] No shared interface enforcement** — cells redeclare props independently.
2. **[HIGH] Stale closure in ChipSelectCell outside-click handler**.
3. **[MEDIUM] MUI cells use `setTimeout(() => focus(), 0)`** — race with blur.
4. **[HIGH] MuiStatusCell hardcodes hex colors** — breaks dark mode.
5. **[CRITICAL] RichTextCell `dangerouslySetInnerHTML` with regex sanitizer** — XSS.
6. **[HIGH] No cells use `React.memo`** — O(columns) re-renders per interaction.
7. **[HIGH] UploadCell discards `File` object** — consumers can't upload.

### Extension System Review

1. **[HIGH] No rollback on failed `init`** — extension stuck in broken state.
2. **[LOW] Global sort on every `addHook`** — O(n log n).
3. **[HIGH] No inter-extension communication** — no discovery, no typed messaging.
4. **[MEDIUM] `gridState` snapshot vs `getState()` live accessor confusion**.
5. **[HIGH] `ctx.subscribe` disposer not tracked** — leaks on unregister.
6. **[HIGH] Cell-comments extension is non-functional** — hardcoded stubs.
7. **[HIGH] No generic API slot on `ExtensionDefinition`** — extensions hack around it.

### Accessibility & Keyboard Review

1. **[HIGH] Missing PageUp/PageDown keys**.
2. **[MEDIUM] No Ctrl+Shift+Arrow extend-to-edge**.
3. **[CRITICAL] No clipboard key handlers wired**.
4. **[HIGH] Tab traps focus in grid**.
5. **[CRITICAL] `aria-selected` missing on cells**.
6. **[HIGH] No `aria-label` on grid container**.
7. **[HIGH] No live region for selection/sort announcements**.
8. **[HIGH] Zero `@media` queries** — no reduced-motion, forced-colors.
9. **[HIGH] No `:focus-visible` styling**.
10. **[HIGH] Focus not restored after context menu close**.

### Storybook & DX Review

1. **[HIGH] No Storybook argTypes/controls** on any story.
2. **[CRITICAL] Cell renderer sub-path exports don't exist** in published output.
3. **[HIGH] `splitting: false`** on react package — no tree-shaking.
4. **[MEDIUM] Duplicated data/helpers** between playground and stories.
5. **[HIGH] `a11y: { test: 'todo' }`** — addon installed but disabled.
6. **[MEDIUM] `validate` script uses wrong typecheck command**.
7. **[LOW] No changeset/release workflow, no CI config, no ESLint rules**.

### Test Execution Results

- **1,311 tests pass** across 41 test files (8.14s).
- **17 TypeScript errors** — missing exports, type mismatches.
- **Build fails** — DTS generation blocked by `selection.ts:262` type error.
- **No E2E tests** — Playwright is a dependency but unused.
