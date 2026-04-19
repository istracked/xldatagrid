/**
 * Transposed (form-mode) grid utilities.
 *
 * Converts a {@link TransposedGridConfig} into a standard {@link GridConfig}
 * that renders with `pivotMode: 'row'`, where each row represents a field and
 * each column represents an entity.
 *
 * @module transposed
 */

import type {
  TransposedGridConfig,
  TransposedField,
  GridConfig,
  ColumnDef,
  RowTypeDef,
  ValidationResult,
  ChromeColumnsConfig,
} from './types';

/**
 * Internal-only row shape produced by {@link createTransposedConfig}.
 *
 * The row builder assigns three marker fields onto every row:
 *   - `__field_label`   — the human-readable label for the row (field)
 *   - `__field_id`      — the stable field id (used as `rowKey`)
 *   - `__field_config`  — the original {@link TransposedField} definition
 *
 * `TData` is user-supplied and does not generally declare these fields, so
 * the resolvers inside this module intersect `TData` with this shape where
 * they read them. The structural intersection replaces the former
 * `as unknown as { __field_label?: unknown }` double cast with a single
 * declaration of exactly what we depend on, keeping the rest of `TData`
 * opaque.
 */
interface TransposedInternalRow {
  __field_label?: unknown;
  __field_id?: unknown;
  __field_config?: TransposedField;
}

/**
 * Creates a {@link GridConfig} from a {@link TransposedGridConfig}.
 *
 * The resulting grid has:
 * - First column: frozen field labels (read-only) — **or**, when
 *   {@link TransposedGridConfig.useChromeFieldColumn} is `true`, the labels
 *   are projected into the row-number chrome gutter via
 *   {@link ChromeColumnsConfig.getChromeCellContent} and the ordinary
 *   `__field_label` data column is omitted entirely.
 * - Subsequent columns: one per entity (editable)
 * - Each row maps to a field with its own cellType via rowTypes
 *
 * @typeParam TData - Row data shape. Defaults to a generic record.
 * @param config - The transposed grid configuration.
 * @returns A standard grid configuration suitable for the DataGrid component.
 */
export function createTransposedConfig<TData = Record<string, unknown>>(
  config: TransposedGridConfig,
): GridConfig<TData> {
  const fieldColumnLabel = config.fieldColumnLabel ?? 'Field';
  const fieldColumnWidth = config.fieldColumnWidth ?? 200;
  const entityColumnWidth = config.entityColumnWidth ?? 200;
  const useChrome = config.useChromeFieldColumn === true;

  // Build columns.
  //
  // When the chrome gutter is the authoritative key column (issue #18 sub-
  // feature 1), we omit the `__field_label` data column entirely: the chrome
  // column takes its place via `getChromeCellContent`. This keeps the data
  // column set equal to the entity count, which matches consumers' mental
  // model of "each column is an entity".
  const labelColumn: ColumnDef<TData> = {
    id: '__field_label',
    field: '__field_label' as keyof TData & string,
    title: fieldColumnLabel,
    width: fieldColumnWidth,
    frozen: 'left',
    editable: false,
    sortable: false,
    filterable: false,
    resizable: true,
  };
  const entityColumns: ColumnDef<TData>[] = config.entityKeys.map(key => ({
    id: key,
    field: key as keyof TData & string,
    title: key,
    width: entityColumnWidth,
    editable: true,
    sortable: false,
    filterable: false,
    resizable: true,
  }));
  const columns: ColumnDef<TData>[] = useChrome
    ? entityColumns
    : [labelColumn, ...entityColumns];

  // Build row type defs from field definitions
  const rowTypes: RowTypeDef[] = config.fields.map((field, index) => ({
    index,
    cellType: field.cellType,
    label: field.label,
    options: field.options,
  }));

  // Build data rows: each field becomes a row
  const data = config.fields.map(field => {
    const row: Record<string, unknown> = {
      __field_label: field.label,
      __field_id: field.id,
      __field_config: field,
    };
    // Initialize entity columns with default values
    for (const key of config.entityKeys) {
      row[key] = field.defaultValue ?? null;
    }
    return row as unknown as TData;
  });

  // Chrome configuration.
  //
  // When `useChromeFieldColumn` is enabled we wire a `getChromeCellContent`
  // resolver that emits the field's display label as the chrome cell's text.
  // The resolver reads `__field_label` off the row rather than closing over
  // `config.fields[rowIndex].label` so that consumers who rearrange rows at
  // runtime still get correct labels. Row numbers are enabled with a width
  // matching `fieldColumnWidth` so the gutter looks like a key column.
  const chrome: ChromeColumnsConfig<TData> | undefined = useChrome
    ? {
        rowNumbers: {
          width: fieldColumnWidth,
          reorderable: false,
          position: 'left',
        },
        getChromeCellContent: (row: TData) => {
          // The transposed-grid internals populate every row with a
          // `__field_label` marker (see the row builder above). `TData` is
          // user-supplied and may not reflect that, so we narrow via a
          // structural type rather than `unknown`/`any` — the shape we
          // actually depend on is declared, the rest of `TData` stays
          // opaque.
          const { __field_label: label } = row as TData & TransposedInternalRow;
          return {
            text: typeof label === 'string' ? label : String(label ?? ''),
          };
        },
      }
    : undefined;

  return {
    data,
    columns,
    rowKey: '__field_id' as keyof TData,
    pivotMode: 'row',
    rowTypes,
    readOnly: false,
    selectionMode: 'cell',
    keyboardNavigation: true,
    ...(chrome ? { chrome } : {}),
  };
}

/**
 * Validates a password confirmation field against its source field.
 *
 * Iterates over {@link fields} looking for entries with a `confirmField`
 * property. When found, compares the value in the confirmation row against
 * the value in the source row for the given {@link entityKey}.
 *
 * @param fields - The transposed field definitions.
 * @param data - The current grid data rows (each must include `__field_id`).
 * @param entityKey - The entity column key to validate.
 * @returns A {@link ValidationResult} with severity `'error'` if a mismatch
 *          is detected, otherwise `null`.
 */
export function validatePasswordConfirmation(
  fields: TransposedField[],
  data: Record<string, unknown>[],
  entityKey: string,
): ValidationResult | null {
  for (const field of fields) {
    if (field.confirmField) {
      const sourceField = fields.find(f => f.id === field.confirmField);
      if (!sourceField) continue;

      const sourceRow = data.find(r => r.__field_id === sourceField.id);
      const confirmRow = data.find(r => r.__field_id === field.id);

      if (!sourceRow || !confirmRow) continue;

      const sourceValue = sourceRow[entityKey];
      const confirmValue = confirmRow[entityKey];

      if (sourceValue !== confirmValue) {
        return { message: 'Values do not match', severity: 'error' };
      }
    }
  }
  return null;
}
