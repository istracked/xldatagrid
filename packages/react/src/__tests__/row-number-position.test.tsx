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

describe('Row number column — position', () => {
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

describe('Row number column — background styling', () => {
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
    // assert on the inline style string that it references our new token and
    // falls back to the existing header-bg token (Excel-gutter grey is provided
    // by the `.dg-theme-excel365` stylesheet, not inline).
    const bg = rowNumberCell.style.background || rowNumberCell.style.backgroundColor;
    expect(bg).toContain('--dg-row-number-bg');
    expect(bg).toContain('--dg-header-bg');
  });

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
    expect(bg).toContain('--dg-header-bg');
  });
});
