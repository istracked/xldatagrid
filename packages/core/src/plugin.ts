/**
 * Extension (plugin) hosting infrastructure for the datagrid.
 *
 * {@link PluginHost} manages the full lifecycle of extensions -- registration,
 * dependency validation, hook wiring, initialisation, teardown, and disposal.
 * It acts as the bridge between the {@link GridModel} (which owns state and
 * mutations) and the {@link ExtensionDefinition} objects supplied by consumers,
 * giving each extension a sandboxed {@link ExtensionContext} through which it
 * can read state, issue commands, emit events, and register event hooks.
 *
 * @module plugin
 */
import { ExtensionDefinition, ExtensionContext, GridState, GridCommands, GridEventType, HookRegistration } from './types';
import { EventBus } from './events';

/**
 * Internal bookkeeping record for a single registered extension.
 *
 * Pairs the original {@link ExtensionDefinition} with the set of disposer
 * callbacks accumulated during registration (hook un-subscribers, etc.)
 * so that teardown can deterministically undo all side-effects.
 */
interface ExtensionEntry {
  /** The original definition object provided at registration time. */
  def: ExtensionDefinition;

  /** Accumulated disposal functions for hooks and subscriptions. */
  disposers: (() => void)[];
}

/**
 * Manages registration, lifecycle, and teardown of grid extensions.
 *
 * Extensions are stored in insertion order so that {@link dispose} can tear
 * them down in reverse, respecting implicit dependency ordering.  Each
 * extension receives an {@link ExtensionContext} scoped to its own identity,
 * ensuring that events it emits carry a `source` tag and that its hooks are
 * cleaned up independently of other extensions.
 *
 * @remarks
 * `PluginHost` is instantiated once per {@link GridModel} and is not intended
 * for direct use by consumers -- the model exposes `registerExtension` /
 * `unregisterExtension` as public surface.
 */
export class PluginHost {
  /** Map of extension id to its bookkeeping entry, preserving insertion order. */
  private extensions: Map<string, ExtensionEntry> = new Map();

  /** Shared event bus provided by the owning GridModel. */
  private eventBus: EventBus;

  /** Lazy accessor returning the latest grid state snapshot. */
  private getState: () => GridState;

  /** Lazy accessor returning the current commands facade. */
  private getCommands: () => GridCommands;

  /**
   * Creates a new plugin host bound to the given event bus and state/command
   * accessors.
   *
   * @param eventBus - The grid's central event bus for hook and event dispatch.
   * @param getState - Thunk that returns a fresh {@link GridState} snapshot on
   *   every call so extensions always see current data.
   * @param getCommands - Thunk that returns the {@link GridCommands} facade,
   *   allowing extensions to mutate grid state.
   */
  constructor(eventBus: EventBus, getState: () => GridState, getCommands: () => GridCommands) {
    this.eventBus = eventBus;
    this.getState = getState;
    this.getCommands = getCommands;
  }

  /**
   * Registers an extension, validates its dependencies, installs hooks, and
   * runs the optional async initialiser.
   *
   * Registration proceeds in a strict order: dependency check, hook
   * installation, map insertion, then `init` callback.  Hooks are installed
   * before `init` so that the extension can emit events during initialisation
   * and have its own hooks respond.
   *
   * @param def - The extension definition to register.
   * @throws If the definition lacks an `id`, if an extension with the same id
   *   is already loaded, or if any declared dependency is missing.
   */
  async register(def: ExtensionDefinition): Promise<void> {
    // Guard: every extension must carry a unique identifier.
    if (!def.id) throw new Error('Extension must have an id');
    if (this.extensions.has(def.id)) throw new Error(`Extension "${def.id}" already registered`);

    // Validate that all declared dependencies have already been registered.
    if (def.dependencies) {
      for (const depId of def.dependencies) {
        if (!this.extensions.has(depId)) {
          throw new Error(`Extension "${def.id}" requires "${depId}" which is not registered`);
        }
      }
    }

    // Collect disposers so that unregister can cleanly undo all side-effects.
    const disposers: (() => void)[] = [];
    const ctx = this.createContext(def.id, disposers);

    // Install event hooks declared by the extension, accumulating their
    // disposal callbacks for later teardown.
    if (def.hooks) {
      const hookRegs = def.hooks(ctx);
      for (const reg of hookRegs) {
        disposers.push(this.eventBus.addHook(reg));
      }
    }

    // Record the extension before running init so that init can query
    // isLoaded or interact with the host safely.
    this.extensions.set(def.id, { def, disposers });

    // Run the optional async initialiser last, after all hooks are wired.
    if (def.init) {
      await def.init(ctx);
    }
  }

  /**
   * Removes a previously registered extension, invoking its `destroy`
   * lifecycle callback and disposing all hooks it installed.
   *
   * If the given id is not currently registered the call is a safe no-op.
   *
   * @param id - Unique identifier of the extension to remove.
   */
  async unregister(id: string): Promise<void> {
    const ext = this.extensions.get(id);
    if (!ext) return;

    // Give the extension a chance to perform its own cleanup.
    if (ext.def.destroy) {
      await ext.def.destroy(this.createContext(id, []));
    }

    // Dispose every hook and subscription the extension accumulated.
    for (const disposer of ext.disposers) {
      disposer();
    }
    this.extensions.delete(id);
  }

  /**
   * Checks whether an extension with the given id is currently registered.
   *
   * @param id - Extension identifier to look up.
   * @returns `true` if the extension is loaded.
   */
  isLoaded(id: string): boolean {
    return this.extensions.has(id);
  }

  /**
   * Returns the identifiers of all currently loaded extensions, in
   * registration order.
   *
   * @returns Array of extension id strings.
   */
  getLoadedExtensions(): string[] {
    return Array.from(this.extensions.keys());
  }

  /**
   * Tears down every registered extension in reverse registration order,
   * ensuring that extensions registered later (which may depend on earlier
   * ones) are destroyed first.
   */
  async dispose(): Promise<void> {
    // Reverse the insertion order so dependants are torn down before their
    // dependencies.
    const ids = Array.from(this.extensions.keys()).reverse();
    for (const id of ids) {
      await this.unregister(id);
    }
  }

  /**
   * Builds an {@link ExtensionContext} scoped to a specific extension.
   *
   * The context provides the extension with read access to grid state, the
   * ability to issue commands, emit events (tagged with the extension's id
   * as `source`), register additional hooks at runtime, and subscribe to the
   * raw event stream.  All hooks added through the context are tracked in the
   * supplied `disposers` array so that they are cleaned up on unregister.
   *
   * @param extensionId - Identifier of the extension receiving the context.
   * @param disposers - Mutable array to which new disposer callbacks are
   *   appended when the extension adds hooks through the context.
   * @returns A fully populated {@link ExtensionContext}.
   */
  private createContext(extensionId: string, disposers: (() => void)[]): ExtensionContext {
    return {
      // Snapshot of grid state at the moment the context is created.
      gridState: this.getState(),

      // Command facade for issuing mutations against the grid.
      commands: this.getCommands(),

      // Event emitter that tags every dispatched event with this extension's id.
      emit: async (type: GridEventType, payload: Record<string, unknown>) => {
        await this.eventBus.dispatch(type, { ...payload, source: extensionId });
      },

      // Dynamic hook registration; the disposer is tracked automatically.
      addHook: (reg: HookRegistration) => {
        const disposer = this.eventBus.addHook(reg);
        disposers.push(disposer);
        return disposer;
      },

      // Raw event stream subscription (not scoped -- receives all events).
      subscribe: (listener) => this.eventBus.subscribe(listener),

      // Live state accessor so long-lived extensions can poll fresh state.
      getState: () => this.getState(),
    };
  }
}
