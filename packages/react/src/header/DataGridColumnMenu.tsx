import React from 'react';
import type { MenuState } from '../state';
import * as styles from './DataGridColumnMenu.styles';

export interface DataGridColumnMenuProps {
  menuState: MenuState;
  headerHeight: number;
  hasColumnGroups: boolean;
  isSortingEnabled: boolean;
  getColumnFrozen: (field: string) => 'left' | 'right' | null;
  onSortAsc: (field: string) => void;
  onSortDesc: (field: string) => void;
  onHide: (field: string) => void;
  onFreeze: (field: string) => void;
  onUnfreeze: (field: string) => void;
  onClose: () => void;
}

export function DataGridColumnMenu(props: DataGridColumnMenuProps) {
  const {
    menuState,
    headerHeight,
    hasColumnGroups,
    isSortingEnabled,
    getColumnFrozen,
    onSortAsc,
    onSortDesc,
    onHide,
    onFreeze,
    onUnfreeze,
    onClose,
  } = props;

  if (menuState.type !== 'column') return null;

  const field = menuState.field;
  const frozen = getColumnFrozen(field);

  return (
    <div
      data-testid="column-header-menu"
      style={styles.columnHeaderMenu(headerHeight, hasColumnGroups)}
    >
      {isSortingEnabled && (
        <>
          <div
            data-testid="column-menu-sort-asc"
            style={styles.columnMenuItem}
            onClick={() => {
              onSortAsc(field);
              onClose();
            }}
          >
            Sort Ascending
          </div>
          <div
            data-testid="column-menu-sort-desc"
            style={styles.columnMenuItem}
            onClick={() => {
              onSortDesc(field);
              onClose();
            }}
          >
            Sort Descending
          </div>
        </>
      )}
      <div
        data-testid="column-menu-hide"
        style={styles.columnMenuItem}
        onClick={() => {
          onHide(field);
          onClose();
        }}
      >
        Hide Column
      </div>
      {frozen ? (
        <div
          data-testid="column-menu-unfreeze"
          style={styles.columnMenuItem}
          onClick={() => {
            onUnfreeze(field);
            onClose();
          }}
        >
          Unfreeze Column
        </div>
      ) : (
        <div
          data-testid="column-menu-freeze"
          style={styles.columnMenuItem}
          onClick={() => {
            onFreeze(field);
            onClose();
          }}
        >
          Freeze Column
        </div>
      )}
    </div>
  );
}
