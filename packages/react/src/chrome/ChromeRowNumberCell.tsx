import React, { useCallback } from 'react';
import * as styles from './ChromeColumn.styles';

export interface ChromeRowNumberCellProps {
  rowNumber: number;
  rowId: string;
  width: number;
  height: number;
  isSelected?: boolean;
  reorderable?: boolean;
  /**
   * When set, pins the cell with `position: sticky; left: stickyLeft` so the
   * row-number gutter stays visible during horizontal scroll. Pass the offset
   * of any preceding sticky chrome columns (e.g. controls width) or `0`.
   */
  stickyLeft?: number;
  onSelect: (rowId: string, shiftKey: boolean, metaKey: boolean) => void;
  onDragStart?: (rowId: string, rowIndex: number) => void;
  onDragOver?: (rowId: string, rowIndex: number) => void;
  onDrop?: (rowId: string, rowIndex: number) => void;
}

export function ChromeRowNumberCell(props: ChromeRowNumberCellProps) {
  const { rowNumber, rowId, width, height, isSelected, reorderable, stickyLeft, onSelect, onDragStart, onDragOver, onDrop } = props;

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(rowId, e.shiftKey, e.metaKey || e.ctrlKey);
  }, [rowId, onSelect]);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (!reorderable) { e.preventDefault(); return; }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', rowId);
    onDragStart?.(rowId, rowNumber - 1);
  }, [reorderable, rowId, rowNumber, onDragStart]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!reorderable) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOver?.(rowId, rowNumber - 1);
  }, [reorderable, rowId, rowNumber, onDragOver]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (!reorderable) return;
    e.preventDefault();
    onDrop?.(rowId, rowNumber - 1);
  }, [reorderable, rowId, rowNumber, onDrop]);

  const cellStyle = {
    ...styles.rowNumberCell(width, height),
    ...(isSelected ? styles.rowNumberSelected : {}),
    ...(stickyLeft !== undefined ? { position: 'sticky' as const, left: stickyLeft, zIndex: 5 } : {}),
  };

  return (
    <div
      style={cellStyle}
      role="rowheader"
      data-testid="chrome-row-number"
      data-row-number={rowNumber}
      data-row-id={rowId}
      aria-label={`Row ${rowNumber}`}
      draggable={reorderable}
      onClick={handleClick}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {rowNumber}
    </div>
  );
}
