/**
 * Public entry point for the `@datagrid/core` package.
 *
 * Re-exports every public symbol from the core sub-modules so that consumers
 * can import everything from a single path:
 *
 * ```ts
 * import { EventBus, GridConfig, ColumnDef } from '@datagrid/core';
 * ```
 *
 * Modules re-exported:
 * - **types** — shared interfaces, type aliases, and enumerations.
 * - **events** — the {@link EventBus} publish/subscribe implementation.
 * - **grid-model** — core grid state management.
 * - **column-model** — column definition resolution and helpers.
 * - **selection** — cell/range selection logic.
 * - **sorting** — sort-state management and comparators.
 * - **filtering** — filter predicate evaluation.
 * - **virtualization** — row/column virtualisation for large datasets.
 * - **editing** — cell editing lifecycle management.
 * - **clipboard** — copy/paste integration.
 * - **grouping** — row and column grouping engine.
 * - **plugin** — extension loading and lifecycle orchestration.
 * - **undo-redo** — command-based undo/redo stack.
 *
 * @module core
 */

export * from './types';
export * from './events';
export * from './grid-model';
export * from './column-model';
export * from './selection';
export * from './sorting';
export * from './filtering';
export * from './virtualization';
export * from './editing';
export * from './clipboard';
export * from './grouping';
export * from './plugin';
export * from './undo-redo';
export * from './transposed';
