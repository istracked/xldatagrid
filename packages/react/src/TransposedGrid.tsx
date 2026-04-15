/**
 * TransposedGrid React component.
 *
 * Renders a form-mode datagrid where rows represent fields and columns
 * represent entities. The first column displays frozen field labels;
 * subsequent columns are editable inputs whose cell type varies per row.
 *
 * @module TransposedGrid
 */

import React, { useMemo, useCallback } from 'react';
import type { TransposedField, CellValue } from '@istracked/datagrid-core';
import { createTransposedConfig } from '@istracked/datagrid-core';
import { DataGrid } from './DataGrid';

/**
 * Props accepted by the {@link TransposedGrid} component.
 */
export interface TransposedGridProps {
  /** Field definitions (become rows). */
  fields: TransposedField[];
  /** Entity column keys. */
  entityKeys: string[];
  /** Current values: Record<fieldId, Record<entityKey, value>>. */
  values?: Record<string, Record<string, unknown>>;
  /** Called when a value changes. */
  onValueChange?: (fieldId: string, entityKey: string, value: CellValue) => void;
  /** Label for the field name column. */
  fieldColumnLabel?: string;
  /** Width of the field label column. */
  fieldColumnWidth?: number;
  /** Width of each entity column. */
  entityColumnWidth?: number;
  /** Theme. */
  theme?: 'light' | 'dark' | Record<string, string>;
}

/**
 * A transposed (form-mode) grid where rows represent fields and columns
 * represent entities.
 *
 * Wraps the standard {@link DataGrid} component, building the configuration
 * via {@link createTransposedConfig} and mapping external `values` into the
 * internal data representation.
 */
export function TransposedGrid(props: TransposedGridProps) {
  const {
    fields,
    entityKeys,
    values = {},
    onValueChange,
    fieldColumnLabel,
    fieldColumnWidth,
    entityColumnWidth,
    theme,
  } = props;

  // Build transposed config for columns and rowTypes
  const config = useMemo(
    () =>
      createTransposedConfig({
        fields,
        entityKeys,
        fieldColumnLabel,
        fieldColumnWidth,
        entityColumnWidth,
      }),
    [fields, entityKeys, fieldColumnLabel, fieldColumnWidth, entityColumnWidth],
  );

  // Build data from fields and values
  const data = useMemo(() => {
    return fields.map(field => {
      const row: Record<string, unknown> = {
        __field_label: field.label,
        __field_id: field.id,
        __field_config: field,
      };
      for (const key of entityKeys) {
        row[key] = values[field.id]?.[key] ?? field.defaultValue ?? null;
      }
      return row;
    });
  }, [fields, entityKeys, values]);

  // Handle cell value changes
  const handleCellEdit = useCallback(
    (_rowKey: string, fieldName: string, value: CellValue) => {
      if (fieldName === '__field_label' || fieldName === '__field_id') return;
      // Find the field by rowKey (__field_id)
      const fieldDef = fields.find(f => f.id === _rowKey);
      if (fieldDef && onValueChange) {
        onValueChange(fieldDef.id, fieldName, value);
      }
    },
    [fields, onValueChange],
  );

  return (
    <DataGrid
      columns={config.columns}
      data={data}
      rowKey={'__field_id'}
      pivotMode="row"
      rowTypes={config.rowTypes}
      selectionMode="cell"
      keyboardNavigation={true}
      theme={theme}
      onCellEdit={handleCellEdit}
    />
  );
}
