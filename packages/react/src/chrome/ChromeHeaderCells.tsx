import React from 'react';
import * as styles from './ChromeColumn.styles';

export interface ChromeControlsHeaderCellProps {
  width: number;
  height: number;
}

export function ChromeControlsHeaderCell(props: ChromeControlsHeaderCellProps) {
  return (
    <div
      style={styles.controlsHeaderCell(props.width, props.height)}
      role="columnheader"
      data-testid="chrome-controls-header"
      aria-label="Controls"
    />
  );
}

export interface ChromeRowNumberHeaderCellProps {
  width: number;
  height: number;
  onSelectAll?: () => void;
}

export function ChromeRowNumberHeaderCell(props: ChromeRowNumberHeaderCellProps) {
  return (
    <div
      style={styles.rowNumberHeaderCell(props.width, props.height)}
      role="columnheader"
      data-testid="chrome-row-number-header"
      aria-label="Row numbers"
      onClick={props.onSelectAll}
    >
      #
    </div>
  );
}
