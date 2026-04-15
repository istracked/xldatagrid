import React from 'react';
import type { ControlAction } from '@istracked/datagrid-core';
import * as styles from './ChromeColumn.styles';

export interface ChromeControlsCellProps {
  actions: ControlAction[];
  rowId: string;
  rowIndex: number;
  width: number;
  height: number;
}

export function ChromeControlsCell(props: ChromeControlsCellProps) {
  const { actions, rowId, rowIndex, width, height } = props;

  return (
    <div
      style={styles.controlsCell(width, height)}
      role="cell"
      data-testid="chrome-controls-cell"
      aria-label="Row controls"
    >
      {actions.map(action => (
        <button
          key={action.key}
          style={styles.actionButton}
          aria-label={action.label}
          data-testid={`chrome-action-${action.key}`}
          onClick={(e) => {
            e.stopPropagation();
            action.onClick?.(rowId, rowIndex);
          }}
        >
          {action.render ? (action.render(rowId, rowIndex) as React.ReactNode) : action.label}
        </button>
      ))}
    </div>
  );
}
