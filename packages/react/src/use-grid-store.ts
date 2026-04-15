/**
 * React hooks for subscribing to {@link GridModel} state changes.
 *
 * These hooks bridge the imperative {@link GridModel.subscribe} notification
 * channel into React's rendering cycle by forcing re-renders on every model
 * change and reading fresh state synchronously during render.
 *
 * {@link useGridStore} returns the complete {@link GridModelState} snapshot,
 * while {@link useGridSelector} accepts a selector function for deriving a
 * focused slice of state, reducing the surface area a component depends on.
 *
 * @module use-grid-store
 */
import { useState, useEffect, useReducer, useRef } from 'react';
import { GridModel, GridModelState } from '@istracked/datagrid-core';

/**
 * Subscribes to a {@link GridModel} and returns the full state snapshot on
 * every change.
 *
 * Internally uses a monotonically incrementing counter via `useReducer` to
 * force a re-render whenever the model fires its change listener. The
 * actual state is read synchronously from the model during render, so
 * the returned value is always consistent with the latest atom writes.
 *
 * @typeParam TData - Row data shape; must be a string-keyed record.
 *
 * @param model - The {@link GridModel} instance to observe.
 *
 * @returns The current {@link GridModelState} snapshot.
 *
 * @example
 * ```tsx
 * const state = useGridStore(model);
 * console.log(state.data, state.sort);
 * ```
 */
export function useGridStore<TData extends Record<string, unknown>>(
  model: GridModel<TData>
): GridModelState<TData> {
  // Use a counter to force re-renders when the model notifies.
  // Then read the latest state directly from the model during render.
  const [, forceRender] = useReducer((c: number) => c + 1, 0);

  // Subscribe to the model's composite change channel; the effect tears down
  // and resubscribes if the model identity changes.
  useEffect(() => {
    const unsub = model.subscribe(() => {
      forceRender();
    });
    return unsub;
  }, [model]);

  return model.getState();
}

/**
 * Subscribes to a {@link GridModel} and returns a derived value computed by
 * the provided selector function.
 *
 * Operates identically to {@link useGridStore} regarding the subscription
 * mechanism, but passes the full state through `selector` before returning,
 * allowing callers to extract a narrow slice of state and keep component
 * re-render scope minimal.
 *
 * @remarks
 * The selector runs on every render triggered by a model change, so it
 * should be a fast, pure function. If the selected value is referentially
 * unstable (e.g., a new array each time), consider memoizing in the
 * selector or wrapping the result with `useMemo`.
 *
 * @typeParam TData - Row data shape; must be a string-keyed record.
 * @typeParam T - The derived value type returned by the selector.
 *
 * @param model - The {@link GridModel} instance to observe.
 * @param selector - A pure function that extracts a value from the full
 *   {@link GridModelState}.
 *
 * @returns The value produced by `selector` for the current state.
 *
 * @example
 * ```tsx
 * const sortState = useGridSelector(model, s => s.sort);
 * ```
 */
export function useGridSelector<TData extends Record<string, unknown>, T>(
  model: GridModel<TData>,
  selector: (state: GridModelState<TData>) => T,
): T {
  // Force re-render counter, same pattern as useGridStore.
  const [, forceRender] = useReducer((c: number) => c + 1, 0);

  // Subscribe to the model's composite change channel.
  useEffect(() => {
    const unsub = model.subscribe(() => {
      forceRender();
    });
    return unsub;
  }, [model]);

  // Apply the selector to the latest state snapshot during render.
  return selector(model.getState());
}
