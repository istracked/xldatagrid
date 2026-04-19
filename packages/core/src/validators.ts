/**
 * Multi-validator primitive API for the data grid.
 *
 * This module owns the framework-agnostic validator shape consumed by
 * `ColumnDef.validators` and by the React tooltip rendering layer. A single
 * cell may now accumulate multiple {@link ValidationResult} entries at
 * different severities (error / warning / info); the layer above composes
 * them into a single tooltip using {@link mostSevere} for aria / styling
 * decisions and the full list for the message enumeration.
 *
 * Contracts exercised by `packages/core/src/__tests__/validators.test.ts`:
 *
 *   - `runValidators` calls every validator in declaration order, collects
 *     non-null results, and never inserts a synthetic "clean" sentinel.
 *   - `mostSevere` ranks `error > warning > info` and breaks ties on the
 *     first-declared entry (which is the first-failed validator, given the
 *     ordering contract above).
 *
 * @module validators
 */
import type { CellValue, ValidationResult, ValidationSeverity } from './types';

/**
 * A single cell-level validator.
 *
 * Each validator runs on every commit and returns either a
 * {@link ValidationResult} describing the problem or `null` when the value is
 * acceptable. Returning `null` is the idiomatic "clean" signal — do not
 * fabricate a `severity: 'info'` result to mean "passed". The runner simply
 * omits null results from its output array.
 *
 * The optional `name` is a debugging aid surfaced in dev tools; it carries no
 * runtime behaviour.
 *
 * @typeParam TData - Row shape passed through on `ctx.row` so the validator
 *   can consult sibling fields (cross-field validation).
 */
export interface Validator<TData = unknown> {
  /** Optional diagnostic label; not used for behaviour. */
  name?: string;
  /** Evaluates the cell value and returns a result or `null` when valid. */
  run: (
    value: CellValue,
    ctx: { row: TData; rowId: string; field: string },
  ) => ValidationResult | null;
}

/**
 * Runs every validator in `validators` against `value` in declaration order
 * and returns the collected non-null {@link ValidationResult} entries.
 *
 * Ordering rules:
 *   - Declaration order is preserved verbatim in the output.
 *   - A validator whose `run()` returns `null` is omitted from the output
 *     (no placeholder is emitted).
 *
 * An empty `validators` array, or an array in which every validator returns
 * null, both yield `[]`. There is no synthetic "clean" result.
 */
export function runValidators<TData>(
  value: CellValue,
  validators: Validator<TData>[],
  ctx: { row: TData; rowId: string; field: string },
): ValidationResult[] {
  const out: ValidationResult[] = [];
  for (const v of validators) {
    const result = v.run(value, ctx);
    if (result !== null && result !== undefined) {
      out.push(result);
    }
  }
  return out;
}

// Severity ranking used by `mostSevere`. Larger numbers win; ties are broken
// on declaration order (first wins).
const SEVERITY_RANK: Record<ValidationSeverity, number> = {
  error: 2,
  warning: 1,
  info: 0,
};

/**
 * Returns the most-severe entry in `results` — the one the UI layer should
 * use to drive the cell's aria-invalid state, border colour, and tooltip
 * severity marker.
 *
 * Ranking: `error` (2) beats `warning` (1) beats `info` (0). Ties break on
 * declaration order: the first matching entry wins. Returns `null` when the
 * input array is empty.
 */
export function mostSevere(results: ValidationResult[]): ValidationResult | null {
  if (results.length === 0) return null;
  let best: ValidationResult = results[0]!;
  let bestRank = SEVERITY_RANK[best.severity];
  for (let i = 1; i < results.length; i++) {
    const r = results[i]!;
    const rank = SEVERITY_RANK[r.severity];
    if (rank > bestRank) {
      best = r;
      bestRank = rank;
    }
  }
  return best;
}
