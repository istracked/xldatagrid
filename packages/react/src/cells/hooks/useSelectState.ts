/**
 * useSelectState — shared hook for single-select / dropdown cell editors.
 *
 * Encapsulates the recurring pattern of: draft value that mirrors the committed
 * value, and an `open` flag that is driven entirely by `isEditing`.
 *
 * @module useSelectState
 */
import { useState, useEffect } from 'react';

/** Options accepted by {@link useSelectState}. */
export interface UseSelectStateOptions {
  /** The current committed value shown in the cell. */
  value: unknown;
  /** Whether the cell is currently in edit mode. */
  isEditing: boolean;
}

/** Values returned by {@link useSelectState}. */
export interface UseSelectStateReturn {
  /** The local draft value, updated independently of the committed value while editing. */
  draft: unknown;
  /** Setter for the draft value. */
  setDraft: React.Dispatch<React.SetStateAction<unknown>>;
  /** Whether the dropdown/popover should be rendered as open. */
  open: boolean;
  /** Setter for the open flag — allows consumers to close without exiting edit mode. */
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Manages draft value and open state for Select-style cell editors.
 *
 * The draft is re-synced from `value` whenever `value` changes from outside
 * (e.g. undo/redo).  The `open` flag is set to `true` as soon as `isEditing`
 * becomes true and back to `false` when it becomes false.
 */
export function useSelectState({ value, isEditing }: UseSelectStateOptions): UseSelectStateReturn {
  const [draft, setDraft] = useState<unknown>(value);
  const [open, setOpen] = useState(false);

  // Sync draft whenever the external committed value changes.
  useEffect(() => {
    setDraft(value);
  }, [value]);

  // Mirror the open state to the isEditing flag.
  useEffect(() => {
    setOpen(isEditing);
  }, [isEditing]);

  return { draft, setDraft, open, setOpen };
}
