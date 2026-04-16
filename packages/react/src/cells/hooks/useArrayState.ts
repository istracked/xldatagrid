/**
 * useArrayState — shared hook for multi-select / tag-list cell editors.
 *
 * Encapsulates the recurring pattern of: array state initialized via a custom
 * parser, re-parsed from the raw value every time the cell enters edit mode.
 *
 * @module useArrayState
 */
import { useState, useEffect } from 'react';

/** Options accepted by {@link useArrayState}. */
export interface UseArrayStateOptions<T = string> {
  /** The current committed value (may be an array, JSON string, scalar, etc.). */
  value: unknown;
  /** Whether the cell is currently in edit mode. */
  isEditing: boolean;
  /** Converts the raw `value` into a typed array (called on mount and on edit start). */
  parse: (value: unknown) => T[];
}

/** Values returned by {@link useArrayState}. */
export interface UseArrayStateReturn<T = string> {
  /** The local array representing the current (uncommitted) edit state. */
  items: T[];
  /** Setter for the items array. */
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
}

/**
 * Manages an array of items for multi-select and tag-list cell editors.
 *
 * The items are initialized from `parse(value)` on mount.  Every time
 * `isEditing` transitions to `true`, the array is re-parsed from the latest
 * `value` so stale state from a previous edit session is discarded.
 */
export function useArrayState<T = string>({
  value,
  isEditing,
  parse,
}: UseArrayStateOptions<T>): UseArrayStateReturn<T> {
  const [items, setItems] = useState<T[]>(() => parse(value));

  // Re-parse the committed value every time the cell re-enters edit mode.
  useEffect(() => {
    if (isEditing) {
      setItems(parse(value));
    }
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  return { items, setItems };
}
