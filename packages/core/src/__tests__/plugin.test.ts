import { vi } from 'vitest';
import { PluginHost } from '../plugin';
import { EventBus } from '../events';
import { GridState, GridCommands, ExtensionDefinition } from '../types';

function makeState(): GridState {
  return {
    data: [],
    columns: [],
    sort: [],
    filter: null,
    selection: null,
    editingCell: null,
    page: 0,
    pageSize: 50,
    expandedRows: new Set(),
    expandedSubGrids: new Set(),
    columnOrder: [],
    columnWidths: {},
    hiddenColumns: new Set(),
    frozenColumns: [],
    groupState: null,
    undoStack: [],
    redoStack: [],
  };
}

function makeCommands(): GridCommands {
  return {
    setCellValue: vi.fn(),
    beginEdit: vi.fn(),
    commitEdit: vi.fn(),
    cancelEdit: vi.fn(),
    insertRow: vi.fn(),
    deleteRows: vi.fn(),
    setSelection: vi.fn(),
    scrollToCell: vi.fn(),
    invalidateCells: vi.fn(),
    invalidateAll: vi.fn(),
    sort: vi.fn(),
    filter: vi.fn(),
    setColumnWidth: vi.fn(),
    reorderColumn: vi.fn(),
    toggleColumnVisibility: vi.fn(),
    freezeColumn: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
  };
}

function makeExtension(overrides: Partial<ExtensionDefinition> = {}): ExtensionDefinition {
  return { id: 'test-ext', name: 'Test Extension', ...overrides };
}

describe('PluginHost', () => {
  let bus: EventBus;
  let state: GridState;
  let commands: GridCommands;
  let host: PluginHost;

  beforeEach(() => {
    bus = new EventBus();
    state = makeState();
    commands = makeCommands();
    host = new PluginHost(bus, () => state, () => commands);
  });

  it('registers an extension successfully', async () => {
    await host.register(makeExtension());
    expect(host.isLoaded('test-ext')).toBe(true);
  });

  it('rejects an extension without an id', async () => {
    await expect(host.register({ id: '', name: 'No ID' })).rejects.toThrow('Extension must have an id');
  });

  it('rejects duplicate extension id', async () => {
    await host.register(makeExtension());
    await expect(host.register(makeExtension())).rejects.toThrow('Extension "test-ext" already registered');
  });

  it('calls init on register', async () => {
    const init = vi.fn();
    await host.register(makeExtension({ init }));
    expect(init).toHaveBeenCalledTimes(1);
  });

  it('calls destroy on unregister', async () => {
    const destroy = vi.fn();
    await host.register(makeExtension({ destroy }));
    await host.unregister('test-ext');
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('unregister is a no-op for unknown id', async () => {
    await expect(host.unregister('does-not-exist')).resolves.toBeUndefined();
  });

  it('registers hooks defined by extension', async () => {
    const handler = vi.fn();
    await host.register(makeExtension({
      hooks: () => [{ event: 'cell:click', handler }],
    }));
    await bus.dispatch('cell:click');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('removes hooks when extension is unregistered', async () => {
    const handler = vi.fn();
    await host.register(makeExtension({
      hooks: () => [{ event: 'cell:click', handler }],
    }));
    await host.unregister('test-ext');
    await bus.dispatch('cell:click');
    expect(handler).not.toHaveBeenCalled();
  });

  it('checks dependencies before registering', async () => {
    await host.register(makeExtension({ id: 'base', name: 'Base' }));
    await expect(
      host.register(makeExtension({ id: 'child', name: 'Child', dependencies: ['base', 'missing'] }))
    ).rejects.toThrow('Extension "child" requires "missing" which is not registered');
  });

  it('rejects if a required dependency is not registered', async () => {
    await expect(
      host.register(makeExtension({ id: 'child', name: 'Child', dependencies: ['base'] }))
    ).rejects.toThrow('Extension "child" requires "base" which is not registered');
  });

  it('registers successfully when all dependencies are present', async () => {
    await host.register(makeExtension({ id: 'base', name: 'Base' }));
    await host.register(makeExtension({ id: 'child', name: 'Child', dependencies: ['base'] }));
    expect(host.isLoaded('child')).toBe(true);
  });

  it('isLoaded returns true for a registered extension', async () => {
    await host.register(makeExtension());
    expect(host.isLoaded('test-ext')).toBe(true);
  });

  it('isLoaded returns false for an unregistered extension', () => {
    expect(host.isLoaded('ghost')).toBe(false);
  });

  it('isLoaded returns false after unregistering', async () => {
    await host.register(makeExtension());
    await host.unregister('test-ext');
    expect(host.isLoaded('test-ext')).toBe(false);
  });

  it('getLoadedExtensions returns all registered ids', async () => {
    await host.register(makeExtension({ id: 'ext-a', name: 'A' }));
    await host.register(makeExtension({ id: 'ext-b', name: 'B' }));
    expect(host.getLoadedExtensions()).toEqual(['ext-a', 'ext-b']);
  });

  it('getLoadedExtensions returns empty array when nothing is registered', () => {
    expect(host.getLoadedExtensions()).toEqual([]);
  });

  it('dispose unregisters all extensions in reverse order', async () => {
    const destroyOrder: string[] = [];
    await host.register(makeExtension({ id: 'first', name: 'First', destroy: async () => { destroyOrder.push('first'); } }));
    await host.register(makeExtension({ id: 'second', name: 'Second', destroy: async () => { destroyOrder.push('second'); } }));
    await host.register(makeExtension({ id: 'third', name: 'Third', destroy: async () => { destroyOrder.push('third'); } }));
    await host.dispose();
    expect(destroyOrder).toEqual(['third', 'second', 'first']);
    expect(host.getLoadedExtensions()).toEqual([]);
  });

  it('extension context provides gridState', async () => {
    let capturedState: unknown;
    await host.register(makeExtension({
      init: (ctx) => { capturedState = ctx.gridState; },
    }));
    expect(capturedState).toBe(state);
  });

  it('extension context provides commands', async () => {
    let capturedCommands: unknown;
    await host.register(makeExtension({
      init: (ctx) => { capturedCommands = ctx.commands; },
    }));
    expect(capturedCommands).toBe(commands);
  });

  it('extension context getState() returns current state', async () => {
    let getState: (() => GridState) | undefined;
    await host.register(makeExtension({
      init: (ctx) => { getState = ctx.getState; },
    }));
    expect(getState!()).toBe(state);
  });

  it('extension can add hooks dynamically via ctx.addHook', async () => {
    const handler = vi.fn();
    await host.register(makeExtension({
      init: (ctx) => {
        ctx.addHook({ event: 'row:insert', handler });
      },
    }));
    await bus.dispatch('row:insert');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('dynamic hooks added via ctx.addHook are removed on unregister', async () => {
    const handler = vi.fn();
    await host.register(makeExtension({
      init: (ctx) => {
        ctx.addHook({ event: 'row:insert', handler });
      },
    }));
    await host.unregister('test-ext');
    await bus.dispatch('row:insert');
    expect(handler).not.toHaveBeenCalled();
  });

  it('extension can subscribe to state changes via ctx.subscribe', async () => {
    const listener = vi.fn();
    await host.register(makeExtension({
      init: (ctx) => { ctx.subscribe(listener); },
    }));
    await bus.dispatch('grid:stateChange');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('extension can emit events via ctx.emit', async () => {
    const handler = vi.fn();
    bus.addHook({ event: 'grid:stateChange', handler });
    await host.register(makeExtension({
      init: async (ctx) => {
        await ctx.emit('grid:stateChange', { reason: 'test' });
      },
    }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload).toMatchObject({ reason: 'test', source: 'test-ext' });
  });

  it('supports async init', async () => {
    const order: string[] = [];
    await host.register(makeExtension({
      init: async () => {
        await Promise.resolve();
        order.push('init-done');
      },
    }));
    order.push('after-register');
    expect(order).toEqual(['init-done', 'after-register']);
  });

  it('supports async destroy', async () => {
    const order: string[] = [];
    await host.register(makeExtension({
      destroy: async () => {
        await Promise.resolve();
        order.push('destroy-done');
      },
    }));
    await host.unregister('test-ext');
    order.push('after-unregister');
    expect(order).toEqual(['destroy-done', 'after-unregister']);
  });
});
