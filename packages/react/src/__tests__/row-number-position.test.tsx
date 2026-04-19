/**
 * Guards the Excel-365 row-number chrome column behaviour:
 *   - default `position: "left"` places the row-number gutter before the data
 *     columns in DOM order (both body and header rows),
 *   - opt-in `position: "right"` places it after the data columns, and
 *   - the row-number cells reference the `--dg-row-number-bg` token with a
 *     fallback to `--dg-header-bg` (the Excel-gutter grey is supplied by the
 *     `.dg-theme-excel365` stylesheet, not inline).
 *
 * DOM-order assertions use `compareDocumentPosition` because the render output
 * spans multiple parent nodes (header row vs. body rows), so sibling-index
 * checks are not sufficient.
 */
import { render, screen } from '@testing-library/react';
import { DataGrid } from '../DataGrid';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

type Row = { id: string; name: string };

const data: Row[] = [
  { id: '1', name: 'A' },
  { id: '2', name: 'B' },
];

const columns = [{ id: 'name', field: 'name', title: 'Name' }];

function getFirstRow(): HTMLElement {
  const row = document.querySelector('[data-row-id="1"][role="row"]') as HTMLElement | null;
  if (!row) throw new Error('first data row not found');
  return row;
}

function getFirstDataCell(row: HTMLElement): HTMLElement {
  const cell = row.querySelector('[role="gridcell"]') as HTMLElement | null;
  if (!cell) throw new Error('first data cell not found');
  return cell;
}

// ---------------------------------------------------------------------------
// Row number chrome column — position
// ---------------------------------------------------------------------------

// Covers DOM ordering of the row-number gutter relative to the data columns
// for both the default (`left`) and opt-in (`right`) positions, checked at
// both the header row and the first body row.
describe('Row number column — position', () => {
  // Default `position: "left"` — the row-number body cell must appear before
  // the first data cell within the same row.
  it('defaults to position="left": row-number cell precedes the first data cell in DOM order', () => {
    render(
      <DataGrid
        data={data}
        columns={columns}
        rowKey="id"
        chrome={{ rowNumbers: true }}
      />,
    );

    const rowNumberCell = screen.getAllByTestId('chrome-row-number')[0]!;
    const row = getFirstRow();
    const firstDataCell = getFirstDataCell(row);

    // DOCUMENT_POSITION_FOLLOWING (4) means firstDataCell comes AFTER rowNumberCell
    const rel = rowNumberCell.compareDocumentPosition(firstDataCell);
    expect(rel & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  // Default `position: "left"` — the row-number header tile must appear
  // before the first data column header in the header row.
  it('defaults to position="left": header row-number header precedes first data column header', () => {
    render(
      <DataGrid
        data={data}
        columns={columns}
        rowKey="id"
        chrome={{ rowNumbers: true }}
      />,
    );

    const rowNumberHeader = screen.getByTestId('chrome-row-number-header');
    // The first data column header has role="columnheader" and aria-colindex="1".
    const dataHeader = document.querySelector(
      '[role="columnheader"][aria-colindex="1"]',
    ) as HTMLElement | null;
    expect(dataHeader).not.toBeNull();

    const rel = rowNumberHeader.compareDocumentPosition(dataHeader!);
    expect(rel & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  // Opt-in `position: "right"` — every data cell in a row must precede the
  // row-number cell.
  it('position="right": row-number cell follows all data cells in DOM order', () => {
    render(
      <DataGrid
        data={data}
        columns={columns}
        rowKey="id"
        chrome={{ rowNumbers: { position: 'right' } }}
      />,
    );

    const rowNumberCell = screen.getAllByTestId('chrome-row-number')[0]!;
    const row = getFirstRow();
    const dataCells = Array.from(row.querySelectorAll('[role="gridcell"]')) as HTMLElement[];
    expect(dataCells.length).toBeGreaterThan(0);

    // Every data cell must precede the row-number cell.
    for (const cell of dataCells) {
      const rel = rowNumberCell.compareDocumentPosition(cell);
      expect(rel & Node.DOCUMENT_POSITION_PRECEDING).not.toBe(0);
    }
  });

  // Opt-in `position: "right"` — the row-number header tile must follow the
  // first data column header.
  it('position="right": header row-number header follows all data column headers', () => {
    render(
      <DataGrid
        data={data}
        columns={columns}
        rowKey="id"
        chrome={{ rowNumbers: { position: 'right' } }}
      />,
    );

    const rowNumberHeader = screen.getByTestId('chrome-row-number-header');
    const dataHeader = document.querySelector(
      '[role="columnheader"][aria-colindex="1"]',
    ) as HTMLElement | null;
    expect(dataHeader).not.toBeNull();

    const rel = rowNumberHeader.compareDocumentPosition(dataHeader!);
    expect(rel & Node.DOCUMENT_POSITION_PRECEDING).not.toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Row number chrome column — greyed Excel-gutter background
// ---------------------------------------------------------------------------

// Covers the CSS-token plumbing for the Excel-gutter grey background. jsdom
// does not resolve CSS custom properties, so we assert on the inline style
// string rather than a computed colour value.
describe('Row number column — background styling', () => {
  // Body row-number cell must reference the new `--dg-row-number-bg` token
  // and fall back to `--dg-header-bg` when the token is undefined.
  it('row-number cell background references --dg-row-number-bg token (Excel-gutter grey default #f3f2f1)', () => {
    render(
      <DataGrid
        data={data}
        columns={columns}
        rowKey="id"
        chrome={{ rowNumbers: true }}
      />,
    );

    const rowNumberCell = screen.getAllByTestId('chrome-row-number')[0]! as HTMLElement;

    // jsdom does not resolve CSS custom properties to their fallback value, so
    // assert on the inline style string. The redesigned gutter falls back to
    // body bg (`--dg-bg-color`) rather than the darker header tint so it reads
    // as a clean Sheets-style rail; the Excel 365 theme still supplies its own
    // `--dg-row-number-bg` override.
    const bg = rowNumberCell.style.background || rowNumberCell.style.backgroundColor;
    expect(bg).toContain('--dg-row-number-bg');
    expect(bg).toContain('--dg-bg-color');
  });

  // Header row-number tile must use the same token chain as the body cell so
  // the gutter reads as a single contiguous band.
  it('row-number header cell background references --dg-row-number-bg token', () => {
    render(
      <DataGrid
        data={data}
        columns={columns}
        rowKey="id"
        chrome={{ rowNumbers: true }}
      />,
    );

    const header = screen.getByTestId('chrome-row-number-header') as HTMLElement;
    const bg = header.style.background || header.style.backgroundColor;
    expect(bg).toContain('--dg-row-number-bg');
    expect(bg).toContain('--dg-bg-color');
  });
});
