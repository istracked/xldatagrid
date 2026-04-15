import { useReducer, useCallback } from 'react';
import {
  gridInteractionReducer,
  initialGridInteractionState,
  GridInteractionState,
  GridInteractionAction,
} from './grid-interaction-state';

export interface UseGridInteractionReturn {
  state: GridInteractionState;
  dispatch: React.Dispatch<GridInteractionAction>;
  openContextMenu: (x: number, y: number, rowId: string | null, field: string | null) => void;
  openColumnMenu: (field: string) => void;
  openColumnVisibilityMenu: () => void;
  closeMenu: () => void;
  startColumnDrag: (field: string) => void;
  updateColumnDragOver: (overField: string) => void;
  dropColumn: (currentOrder: string[]) => void;
  endColumnDrag: () => void;
  startColumnGroupDrag: (groupId: string) => void;
  updateColumnGroupDragOver: (overGroupId: string) => void;
  dropColumnGroup: (currentGroupOrder: string[]) => void;
  endColumnGroupDrag: () => void;
  setColumnWidth: (field: string, width: number) => void;
  hideColumn: (field: string) => void;
  showColumn: (field: string) => void;
  freezeColumn: (field: string, position: 'left' | 'right') => void;
  unfreezeColumn: (field: string) => void;
  toggleColumnGroupCollapse: (groupId: string) => void;
  setColumnOrder: (order: string[]) => void;
}

export function useGridInteraction(): UseGridInteractionReturn {
  const [state, dispatch] = useReducer(gridInteractionReducer, initialGridInteractionState);

  const openContextMenu = useCallback(
    (x: number, y: number, rowId: string | null, field: string | null) => {
      dispatch({ type: 'open-context-menu', x, y, rowId, field });
    },
    [dispatch],
  );

  const openColumnMenu = useCallback(
    (field: string) => {
      dispatch({ type: 'open-column-menu', field });
    },
    [dispatch],
  );

  const openColumnVisibilityMenu = useCallback(() => {
    dispatch({ type: 'open-column-visibility-menu' });
  }, [dispatch]);

  const closeMenu = useCallback(() => {
    dispatch({ type: 'close-menu' });
  }, [dispatch]);

  const startColumnDrag = useCallback(
    (field: string) => {
      dispatch({ type: 'start-column-drag', field });
    },
    [dispatch],
  );

  const updateColumnDragOver = useCallback(
    (overField: string) => {
      dispatch({ type: 'update-column-drag-over', overField });
    },
    [dispatch],
  );

  const dropColumn = useCallback(
    (currentOrder: string[]) => {
      dispatch({ type: 'drop-column', currentOrder });
    },
    [dispatch],
  );

  const endColumnDrag = useCallback(() => {
    dispatch({ type: 'end-column-drag' });
  }, [dispatch]);

  const startColumnGroupDrag = useCallback(
    (groupId: string) => {
      dispatch({ type: 'start-column-group-drag', groupId });
    },
    [dispatch],
  );

  const updateColumnGroupDragOver = useCallback(
    (overGroupId: string) => {
      dispatch({ type: 'update-column-group-drag-over', overGroupId });
    },
    [dispatch],
  );

  const dropColumnGroup = useCallback(
    (currentGroupOrder: string[]) => {
      dispatch({ type: 'drop-column-group', currentGroupOrder });
    },
    [dispatch],
  );

  const endColumnGroupDrag = useCallback(() => {
    dispatch({ type: 'end-column-group-drag' });
  }, [dispatch]);

  const setColumnWidth = useCallback(
    (field: string, width: number) => {
      dispatch({ type: 'set-column-width', field, width });
    },
    [dispatch],
  );

  const hideColumn = useCallback(
    (field: string) => {
      dispatch({ type: 'hide-column', field });
    },
    [dispatch],
  );

  const showColumn = useCallback(
    (field: string) => {
      dispatch({ type: 'show-column', field });
    },
    [dispatch],
  );

  const freezeColumn = useCallback(
    (field: string, position: 'left' | 'right') => {
      dispatch({ type: 'freeze-column', field, position });
    },
    [dispatch],
  );

  const unfreezeColumn = useCallback(
    (field: string) => {
      dispatch({ type: 'unfreeze-column', field });
    },
    [dispatch],
  );

  const toggleColumnGroupCollapse = useCallback(
    (groupId: string) => {
      dispatch({ type: 'toggle-column-group-collapse', groupId });
    },
    [dispatch],
  );

  const setColumnOrder = useCallback(
    (order: string[]) => {
      dispatch({ type: 'set-column-order', order });
    },
    [dispatch],
  );

  return {
    state,
    dispatch,
    openContextMenu,
    openColumnMenu,
    openColumnVisibilityMenu,
    closeMenu,
    startColumnDrag,
    updateColumnDragOver,
    dropColumn,
    endColumnDrag,
    startColumnGroupDrag,
    updateColumnGroupDragOver,
    dropColumnGroup,
    endColumnGroupDrag,
    setColumnWidth,
    hideColumn,
    showColumn,
    freezeColumn,
    unfreezeColumn,
    toggleColumnGroupCollapse,
    setColumnOrder,
  };
}
