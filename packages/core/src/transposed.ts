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
} from './types';

/**
 * Creates a {@link GridConfig} from a {@link TransposedGridConfig}.
 *
 * The resulting grid has:
 * - First column: frozen field labels (read-only)
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

  // Build columns: field label column + one per entity
  const columns: ColumnDef<TData>[] = [
    {
      id: '__field_label',
      field: '__field_label',
      title: fieldColumnLabel,
      width: fieldColumnWidth,
      frozen: 'left',
      editable: false,
      sortable: false,
      filterable: false,
      resizable: true,
    },
    ...config.entityKeys.map(key => ({
      id: key,
      field: key,
      title: key,
      width: entityColumnWidth,
      editable: true,
      sortable: false,
      filterable: false,
      resizable: true,
    })),
  ];

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

  return {
    data,
    columns,
    rowKey: '__field_id' as keyof TData,
    pivotMode: 'row',
    rowTypes,
    readOnly: false,
    selectionMode: 'cell',
    keyboardNavigation: true,
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
