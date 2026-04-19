/**
 * Failing red-phase tests for the four new optional `ColumnDef` fields:
 *   - `borderRight` — per-column right-border override (or removal).
 *   - `highlightColor` — static Excel-style column tint that composes with
 *     selection / range overlays.
 *   - `readOnly` — column-level edit gate that neutralises the
 *     double-click-to-edit and F2 affordances.
 *   - `skipNavigation` — skips the column during click selection and
 *     keyboard (Arrow / Tab) navigation.
 *
 * These assertions are intentionally encoded *before* the implementation so
 * they drive the new contract. They are expected to fail against the current
 * tree — see README / PR description for the contract these tests pin down.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { DataGrid } from '../DataGrid';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

type Row = {
  id: string;
  name: string;
  age: number;
  dept: string;
  score: number;
};

function makeRows(): Row[] {
  return [
    { id: '1', name: 'Alice', age: 30, dept: 'Eng', score: 90 },
    { id: '2', name: 'Bob', age: 25, dept: 'HR', score: 70 },
    { id: '3', name: 'Carol', age: 35, dept: 'Ops', score: 85 },
  ];
}

function getCell(rowId: string, field: string): HTMLElement {
  const cell = document.querySelector(
    `[data-row-id="${rowId}"][data-field="${field}"][role="gridcell"]`,
  );
  if (!cell) throw new Error(`Cell not found: rowId=${rowId} field=${field}`);
  return cell as HTMLElement;
}

function getGrid(): HTMLElement {
  const grid = document.querySelector('[role="grid"]');
  if (!grid) throw new Error('Grid root not found');
  return grid as HTMLElement;
}

function isSelected(rowId: string, field: string): boolean {
  return getCell(rowId, field).getAttribute('aria-selected') === 'true';
}

// ---------------------------------------------------------------------------
// borderRight
// ---------------------------------------------------------------------------

describe('ColumnDef.borderRight', () => {
  it('borderRight: false removes the right border on the cell', () => {
    const columns = [
      { id: 'name', field: 'name', title: 'Name' },
      { id: 'age', field: 'age', title: 'Age', borderRight: false as const },
      { id: 'dept', field: 'dept', title: 'Dept' },
    ];
    render(<DataGrid data={makeRows()} columns={columns} rowKey="id" />);

    const cell = getCell('1', 'age');
    const neighbour = getCell('1', 'name');

    // The cell with `borderRight: false` must explicitly drop the right
    // border. We compare the serialised style attribute against a neighbour
    // that still has the default border — the skipped column's style string
    // must be materially different (missing the border-right entry, or
    // containing an explicit `none` / `0px` override).
    const styleAttr = (cell.getAttribute('style') || '').toLowerCase();
    const neighbourStyleAttr = (neighbour.getAttribute('style') || '').toLowerCase();

    const inlineBr = cell.style.borderRight;
    const inlineBrs = cell.style.borderRightStyle;
    const inlineBrw = cell.style.borderRightWidth;

    const explicitlyNone =
      inlineBr === 'none' ||
      inlineBr === '0px none' ||
      inlineBrs === 'none' ||
      inlineBrw === '0px' ||
      styleAttr.includes('border-right: none') ||
      styleAttr.includes('border-right:none') ||
      styleAttr.includes('border-right: 0') ||
      styleAttr.includes('border-right:0');

    // Either the style has an explicit "no border" declaration, OR the
    // two cells' border-right entries differ (proving the feature applied
    // a column-level override to this one cell and not to the neighbour).
    const neighbourHasBorder =
      (neighbour.style.borderRight || '').length > 0 ||
      neighbourStyleAttr.includes('border-right:');
    const thisCellHasBorder =
      (cell.style.borderRight || '').length > 0 ||
      styleAttr.includes('border-right:');
    const differsFromNeighbour = neighbourHasBorder && !thisCellHasBorder;

    expect(explicitlyNone || differsFromNeighbour).toBe(true);
  });

  it('borderRight: { color, width } renders a 2px solid #ff00ff right border', () => {
    const columns = [
      { id: 'name', field: 'name', title: 'Name' },
      {
        id: 'age',
        field: 'age',
        title: 'Age',
        borderRight: { color: '#ff00ff', width: 2 },
      },
      { id: 'dept', field: 'dept', title: 'Dept' },
    ];
    render(<DataGrid data={makeRows()} columns={columns} rowKey="id" />);

    const cell = getCell('1', 'age');
    // Assert on the inline style first so the test can observe the value
    // the renderer wrote regardless of how jsdom serialises it.
    const inlineBr = (cell.style.borderRight || '').toLowerCase();
    const inlineColor = (cell.style.borderRightColor || '').toLowerCase();
    const inlineWidth = cell.style.borderRightWidth;
    const inlineStyle = cell.style.borderRightStyle;

    // Accept either the shorthand `borderRight: '2px solid #ff00ff'` or the
    // per-property decomposition.
    const hasColor =
      inlineBr.includes('#ff00ff') ||
      inlineBr.includes('rgb(255, 0, 255)') ||
      inlineColor === '#ff00ff' ||
      inlineColor === 'rgb(255, 0, 255)';
    const hasWidth = inlineBr.includes('2px') || inlineWidth === '2px';
    const hasSolid = inlineBr.includes('solid') || inlineStyle === 'solid';

    expect(hasColor).toBe(true);
    expect(hasWidth).toBe(true);
    expect(hasSolid).toBe(true);
  });

  it('default (no borderRight) keeps a 1px solid var(--dg-border-color) right border', () => {
    const columns = [
      { id: 'name', field: 'name', title: 'Name' },
      { id: 'age', field: 'age', title: 'Age' },
    ];
    render(<DataGrid data={makeRows()} columns={columns} rowKey="id" />);

    const cell = getCell('1', 'name');
    // Read the attribute directly so we observe the full serialised style
    // even when jsdom fails to decompose a shorthand with `var(...)` values.
    const styleAttr = (cell.getAttribute('style') || '').toLowerCase();
    const inlineBr = (cell.style.borderRight || '').toLowerCase();
    const inlineStyle = cell.style.borderRightStyle;
    const computed = window.getComputedStyle(cell).borderRightStyle;

    // The default must still be a solid 1px border referencing
    // `--dg-border-color`. We allow either the shorthand or per-prop form.
    const isSolid =
      inlineBr.includes('solid') ||
      inlineStyle === 'solid' ||
      computed === 'solid' ||
      styleAttr.includes('solid');
    const refsToken =
      inlineBr.includes('--dg-border-color') ||
      (cell.style.borderRightColor || '').includes('--dg-border-color') ||
      styleAttr.includes('--dg-border-color');
    // A default 1px width must be present somewhere.
    const hasDefaultWidth =
      inlineBr.includes('1px') ||
      cell.style.borderRightWidth === '1px' ||
      styleAttr.includes('border-right: 1px') ||
      styleAttr.includes('border-right:1px');

    expect(isSolid).toBe(true);
    expect(refsToken).toBe(true);
    expect(hasDefaultWidth).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// highlightColor
// ---------------------------------------------------------------------------

describe('ColumnDef.highlightColor', () => {
  it('cell in a column with highlightColor renders that color as background when unselected', () => {
    const columns = [
      { id: 'name', field: 'name', title: 'Name' },
      { id: 'age', field: 'age', title: 'Age', highlightColor: '#fef3c7' },
      { id: 'dept', field: 'dept', title: 'Dept' },
    ];
    render(<DataGrid data={makeRows()} columns={columns} rowKey="id" />);

    const cell = getCell('1', 'age');
    const bg = (cell.style.background || cell.style.backgroundColor || '').toLowerCase();

    // Accept either the hex or the RGB serialisation, OR an inner layer
    // element that carries the highlight color.
    const rgbForm = 'rgb(254, 243, 199)';
    const directMatch = bg.includes('#fef3c7') || bg.includes(rgbForm);

    let layeredMatch = false;
    cell.querySelectorAll<HTMLElement>('*').forEach((child) => {
      const childBg = (
        child.style.background || child.style.backgroundColor || ''
      ).toLowerCase();
      if (childBg.includes('#fef3c7') || childBg.includes(rgbForm)) {
        layeredMatch = true;
      }
    });

    expect(directMatch || layeredMatch).toBe(true);
  });

  it('highlight stays observable when the cell is part of a selected range', () => {
    const columns = [
      { id: 'name', field: 'name', title: 'Name' },
      { id: 'age', field: 'age', title: 'Age', highlightColor: '#fef3c7' },
      { id: 'dept', field: 'dept', title: 'Dept' },
    ];
    render(
      <DataGrid
        data={makeRows()}
        columns={columns}
        rowKey="id"
        selectionMode="range"
      />,
    );

    // Create a rectangular range that includes the highlighted column.
    fireEvent.mouseDown(getCell('1', 'name'));
    fireEvent.mouseEnter(getCell('2', 'dept'));
    fireEvent.mouseUp(getCell('2', 'dept'));

    // Fallback path: just click the highlighted cell so it becomes selected
    // in case mouseDown/Enter/Up doesn't wire a range in this config.
    fireEvent.click(getCell('1', 'age'));

    const cell = getCell('1', 'age');
    // Selection presence — either aria-selected is true on the target cell
    // or a sibling cell is selected (we only need to observe "the grid has
    // a selection").
    const somethingSelected =
      cell.getAttribute('aria-selected') === 'true' ||
      !!document.querySelector('[role="gridcell"][aria-selected="true"]');
    expect(somethingSelected).toBe(true);

    // The highlight must still be reachable — either inline on the cell, or
    // on a layered inner element. The selection / range tint may overlay it
    // via a distinct mechanism (pseudo-element, layered background, etc.).
    const bg = (cell.style.background || cell.style.backgroundColor || '').toLowerCase();
    const rgbForm = 'rgb(254, 243, 199)';
    const directMatch = bg.includes('#fef3c7') || bg.includes(rgbForm);
    let layeredMatch = false;
    cell.querySelectorAll<HTMLElement>('*').forEach((child) => {
      const childBg = (
        child.style.background || child.style.backgroundColor || ''
      ).toLowerCase();
      if (childBg.includes('#fef3c7') || childBg.includes(rgbForm)) {
        layeredMatch = true;
      }
    });

    expect(directMatch || layeredMatch).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// skipNavigation
// ---------------------------------------------------------------------------

describe('ColumnDef.skipNavigation', () => {
  const columnsWithSkip = [
    { id: 'name', field: 'name', title: 'Name' },
    {
      id: 'age',
      field: 'age',
      title: 'Age',
      skipNavigation: true,
    },
    { id: 'dept', field: 'dept', title: 'Dept' },
    { id: 'score', field: 'score', title: 'Score' },
  ];

  it('clicking a cell in a skipNavigation column does NOT flip aria-selected on it', () => {
    render(
      <DataGrid
        data={makeRows()}
        columns={columnsWithSkip}
        rowKey="id"
      />,
    );

    fireEvent.click(getCell('1', 'age'));
    expect(isSelected('1', 'age')).toBe(false);
  });

  it('ArrowRight from the column before a skipNav column lands on the column AFTER the skip', () => {
    render(
      <DataGrid
        data={makeRows()}
        columns={columnsWithSkip}
        rowKey="id"
      />,
    );

    fireEvent.click(getCell('1', 'name'));
    expect(isSelected('1', 'name')).toBe(true);

    fireEvent.keyDown(getGrid(), { key: 'ArrowRight' });

    expect(isSelected('1', 'age')).toBe(false);
    expect(isSelected('1', 'dept')).toBe(true);
  });

  it('ArrowLeft from the column after a skipNav column lands on the column BEFORE the skip', () => {
    render(
      <DataGrid
        data={makeRows()}
        columns={columnsWithSkip}
        rowKey="id"
      />,
    );

    fireEvent.click(getCell('1', 'dept'));
    expect(isSelected('1', 'dept')).toBe(true);

    fireEvent.keyDown(getGrid(), { key: 'ArrowLeft' });

    expect(isSelected('1', 'age')).toBe(false);
    expect(isSelected('1', 'name')).toBe(true);
  });

  it('Tab follows the skipNavigation rule (jumps over the skipped column)', () => {
    render(
      <DataGrid
        data={makeRows()}
        columns={columnsWithSkip}
        rowKey="id"
      />,
    );

    fireEvent.click(getCell('1', 'name'));
    fireEvent.keyDown(getGrid(), { key: 'Tab' });

    expect(isSelected('1', 'age')).toBe(false);
    expect(isSelected('1', 'dept')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// readOnly
// ---------------------------------------------------------------------------

describe('ColumnDef.readOnly', () => {
  const columnsWithReadOnly = [
    { id: 'name', field: 'name', title: 'Name' },
    { id: 'age', field: 'age', title: 'Age', readOnly: true },
    { id: 'dept', field: 'dept', title: 'Dept' },
  ];

  it('double-click on a readOnly column cell does NOT enter edit mode', () => {
    render(
      <DataGrid
        data={makeRows()}
        columns={columnsWithReadOnly}
        rowKey="id"
      />,
    );

    const cell = getCell('1', 'age');
    fireEvent.doubleClick(cell);

    // No input element should be mounted inside the read-only cell.
    expect(cell.querySelector('input')).toBeNull();
    // And globally, for paranoia — no edit input should exist at all given
    // no other cell was interacted with.
    expect(document.querySelector('input')).toBeNull();
  });

  it('F2 on a focused cell in a readOnly column is a no-op (no input element appears)', () => {
    render(
      <DataGrid
        data={makeRows()}
        columns={columnsWithReadOnly}
        rowKey="id"
      />,
    );

    fireEvent.click(getCell('1', 'age'));
    fireEvent.keyDown(getGrid(), { key: 'F2' });

    const cell = getCell('1', 'age');
    expect(cell.querySelector('input')).toBeNull();
    expect(document.querySelector('input')).toBeNull();
  });
});
