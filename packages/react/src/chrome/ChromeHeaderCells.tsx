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
  /**
   * When set, pins the header cell with `position: sticky; left: stickyLeft`
   * so the row-number gutter header stays visible during horizontal scroll.
   */
  stickyLeft?: number;
}

export function ChromeRowNumberHeaderCell(props: ChromeRowNumberHeaderCellProps) {
  const style = {
    ...styles.rowNumberHeaderCell(props.width, props.height),
    ...(props.stickyLeft !== undefined ? { position: 'sticky' as const, left: props.stickyLeft, zIndex: 6 } : {}),
  };
  return (
    <div
      style={style}
      role="columnheader"
      data-testid="chrome-row-number-header"
      aria-label="Row numbers"
      onClick={props.onSelectAll}
    >
      #
    </div>
  );
}
