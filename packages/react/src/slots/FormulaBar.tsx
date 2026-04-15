/**
 * Provides the {@link FormulaBar} slot component, a spreadsheet-style input bar that
 * displays and allows editing of the currently selected cell's value. This module
 * is part of the datagrid's slot system for composable UI chrome.
 *
 * @packageDocumentation
 */
import React from 'react';
import * as styles from './FormulaBar.styles';

/**
 * Configuration props for the {@link FormulaBar} component.
 */
export interface FormulaBarProps {
  /**
   * The current text value displayed in the formula input.
   *
   * @defaultValue `''`
   */
  value?: string;

  /**
   * Callback invoked whenever the user modifies the input text.
   *
   * @param value - The updated string from the input element.
   */
  onChange?: (value: string) => void;

  /**
   * Additional CSS class name(s) appended to the root element.
   * The base class `dg-formula-bar` is always applied.
   */
  className?: string;

  /**
   * Inline style overrides merged onto the default bar layout styles.
   */
  style?: React.CSSProperties;
}

/**
 * Renders a horizontal bar containing an `fx` label and a text input, mimicking the
 * formula bar found in spreadsheet applications. The bar sits above the grid body and
 * reflects the value of the active cell, enabling direct text editing.
 *
 * Layout is achieved with a flex row. The component respects CSS custom properties
 * (`--dg-border-color`, `--dg-bg-color`) for theming consistency.
 *
 * @param props - The component properties.
 * @returns A React element representing the formula bar.
 *
 * @example
 * ```tsx
 * <FormulaBar
 *   value={selectedCellValue}
 *   onChange={(v) => updateCellValue(v)}
 * />
 * ```
 */
export function FormulaBar({ value = '', onChange, className, style }: FormulaBarProps) {
  return (
    <div
      className={`dg-formula-bar${className ? ` ${className}` : ''}`}
      style={{ ...styles.formulaBar, ...style }}
    >
      {/* "fx" indicator label, styled to visually echo spreadsheet conventions */}
      <span style={styles.fxLabel}>fx</span>

      {/* Text input that stretches to fill the remaining width */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        style={styles.formulaInput}
        aria-label="Formula"
      />
    </div>
  );
}
