/**
 * usePasswordInput — shared hook for password cell editors.
 *
 * Consolidates the small but error-prone set of concerns that
 * {@link PasswordCell} and {@link PasswordConfirmCell} were both handling
 * independently:
 *   - a visibility / reveal toggle,
 *   - deriving the native input type (`password` vs `text`) from that state,
 *   - picking an appropriate `autocomplete` token for the browser's password
 *     manager, and
 *   - generating stable React ids for the primary / confirm inputs and the
 *     `aria-describedby` target used by the mismatch alert in confirm mode.
 *
 * The hook is deliberately limited to these concerns — draft state, commit
 * handling, and focus management stay in each cell because their contracts
 * differ (single-input with Tab-commit vs two-input with mismatch gating).
 *
 * @module usePasswordInput
 */
import { useCallback, useId, useMemo, useState } from 'react';

/**
 * Options accepted by {@link usePasswordInput}.
 *
 * All fields are optional; the defaults match the behaviour of the original
 * {@link PasswordCell} (password hidden initially, single input, new-password
 * autocomplete).
 */
export interface UsePasswordInputOptions {
  /**
   * Initial value for the `visible` state. Defaults to `false` so password
   * values are masked on first render, matching typical credential-form UX.
   */
  initialVisible?: boolean;
  /**
   * Deprecated in this implementation (kept for API compatibility): an
   * additional prefix applied to the generated `baseId`. React's `useId`
   * already guarantees uniqueness per-call-site, so this is only useful for
   * human-readable debugging when multiple password inputs live side by side.
   */
  idPrefix?: string;
  /**
   * When `true`, the consumer is using both the primary and confirm inputs
   * and the browser `autoComplete` token becomes `"new-password"` (which
   * matches the PasswordConfirmCell default). When `false`, `autoComplete`
   * is `"current-password"` so password managers fill existing credentials
   * in single-input cells. Defaults to `false`.
   */
  confirmMode?: boolean;
}

/**
 * Values returned by {@link usePasswordInput}. All ids are stable across
 * renders for a given call site.
 */
export interface UsePasswordInputResult {
  /** Whether the password is currently revealed (plain text). */
  visible: boolean;
  /** Toggles the `visible` flag. Safe to pass directly to `onClick`. */
  toggle: () => void;
  /** `'text'` when revealed, `'password'` when masked. */
  inputType: 'password' | 'text';
  /**
   * Autocomplete hint used by browsers / password managers. `'new-password'`
   * in confirm mode, `'current-password'` otherwise.
   */
  autoComplete: 'new-password' | 'current-password';
  /** Stable base id for the cell instance, produced via `useId()`. */
  baseId: string;
  /** Id for the primary password input (`${baseId}-pw1`). */
  primaryInputId: string;
  /** Id for the confirmation input (`${baseId}-pw2`), only used in confirm mode. */
  confirmInputId: string;
  /** Id for the `aria-describedby` target that surfaces validation errors. */
  describedById: string;
}

/**
 * Manages the show/hide toggle and stable ids shared by password cell
 * renderers.
 *
 * The hook returns a derived `inputType` and `autoComplete` so the consuming
 * cell's JSX stays declarative (no in-component ternaries for these two). The
 * id trio (`primaryInputId`, `confirmInputId`, `describedById`) mirrors the
 * naming convention already used by {@link PasswordConfirmCell} so the
 * refactor does not perturb any `getByLabelText` / `aria-describedby` wiring.
 *
 * @example
 * ```tsx
 * const pw = usePasswordInput({ confirmMode: true });
 * return (
 *   <>
 *     <input id={pw.primaryInputId} type={pw.inputType} autoComplete={pw.autoComplete} />
 *     <input id={pw.confirmInputId} type={pw.inputType} autoComplete={pw.autoComplete} />
 *     <button onClick={pw.toggle}>{pw.visible ? 'Hide' : 'Show'}</button>
 *   </>
 * );
 * ```
 */
export function usePasswordInput(opts?: UsePasswordInputOptions): UsePasswordInputResult {
  const { initialVisible = false, idPrefix, confirmMode = false } = opts ?? {};

  const [visible, setVisible] = useState<boolean>(initialVisible);

  // `useId` produces a stable, SSR-safe id per call site. The optional
  // `idPrefix` is appended purely for debuggability — React already
  // guarantees uniqueness regardless of the prefix.
  const rawId = useId();
  const baseId = useMemo(
    () => (idPrefix ? `${idPrefix}${rawId}` : rawId),
    [idPrefix, rawId],
  );

  const toggle = useCallback(() => {
    setVisible((v) => !v);
  }, []);

  const inputType: 'password' | 'text' = visible ? 'text' : 'password';
  const autoComplete: 'new-password' | 'current-password' = confirmMode
    ? 'new-password'
    : 'current-password';

  const primaryInputId = `${baseId}-pw1`;
  const confirmInputId = `${baseId}-pw2`;
  const describedById = `${baseId}-mismatch`;

  return {
    visible,
    toggle,
    inputType,
    autoComplete,
    baseId,
    primaryInputId,
    confirmInputId,
    describedById,
  };
}
