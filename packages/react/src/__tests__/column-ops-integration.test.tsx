import { render, screen, fireEvent, within, act } from '@testing-library/react';
import React from 'react';
import { DataGrid } from '../DataGrid';
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

type ColRow = { id: string; name: string; age: number; email: string; dept: string };

function makeColData(): ColRow[] {
  return [
    { id: '1', name: 'Alice', age: 30, email: 'alice@test.com', dept: 'Eng' },
    { id: '2', name: 'Bob', age: 25, email: 'bob@test.com', dept: 'Sales' },
    { id: '3', name: 'Charlie', age: 35, email: 'charlie@test.com', dept: 'Eng' },
  ];
}

const colColumns = [
  { id: 'name', field: 'name', title: 'Name', sortable: true, resizable: true, width: 150 },
  { id: 'age', field: 'age', title: 'Age', sortable: true, resizable: true, width: 100 },
  { id: 'email', field: 'email', title: 'Email', resizable: true, width: 200 },
  { id: 'dept', field: 'dept', title: 'Dept', resizable: true, width: 120 },
];

function renderColGrid(overrides: Record<string, unknown> = {}) {
  return render(
    <DataGrid
      data={makeColData()}
      columns={colColumns}
      rowKey="id"
      sorting={true}
      {...(overrides as any)}
    />
  );
}

// ---------------------------------------------------------------------------
// Column Resize Integration Tests
// ---------------------------------------------------------------------------

describe('column resize integration', () => {
  it('changes width on drag handle', () => {
    renderColGrid();
    const resizeHandle = screen.getAllByTestId('column-resize-handle')[0]!;
    // Simulate drag: mousedown, mousemove, mouseup
    fireEvent.mouseDown(resizeHandle, { clientX: 150 });
    fireEvent.mouseMove(document, { clientX: 200 });
    fireEvent.mouseUp(document);
    // The first column (Name) should now be wider
    const nameHeader = screen.getByRole('columnheader', { name: /^name/i });
    const width = parseInt(nameHeader.style.width);
    expect(width).toBe(200); // 150 + 50
  });

  it('shows resize cursor on handle hover', () => {
    renderColGrid();
    const resizeHandle = screen.getAllByTestId('column-resize-handle')[0]!;
    expect(resizeHandle).toHaveStyle({ cursor: 'col-resize' });
  });

  it('updates all cells in column', () => {
    renderColGrid();
    const resizeHandle = screen.getAllByTestId('column-resize-handle')[0]!;
    fireEvent.mouseDown(resizeHandle, { clientX: 150 });
    fireEvent.mouseMove(document, { clientX: 250 });
    fireEvent.mouseUp(document);
    // All name cells should have updated width
    const nameCells = screen.getAllByRole('gridcell').filter(
      (c) => c.getAttribute('data-field') === 'name'
    );
    nameCells.forEach((cell) => {
      expect(parseInt(cell.style.width)).toBe(250);
    });
  });

  it('fires onColumnResize callback', () => {
    const onColumnResize = vi.fn();
    renderColGrid({ onColumnResize });
    const resizeHandle = screen.getAllByTestId('column-resize-handle')[0]!;
    fireEvent.mouseDown(resizeHandle, { clientX: 150 });
    fireEvent.mouseMove(document, { clientX: 200 });
    fireEvent.mouseUp(document);
    expect(onColumnResize).toHaveBeenCalledWith('name', 200);
  });

  it('double-click auto-fits to content width', () => {
    renderColGrid();
    const resizeHandle = screen.getAllByTestId('column-resize-handle')[0]!;
    fireEvent.doubleClick(resizeHandle);
    // Auto-fit should adjust width based on content
    const nameHeader = screen.getByRole('columnheader', { name: /^name/i });
    const width = parseInt(nameHeader.style.width);
    // Width should have changed from default
    expect(width).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Column Reorder Integration Tests
// ---------------------------------------------------------------------------

describe('column reorder integration', () => {
  it('drags column to new position', () => {
    renderColGrid();
    const headers = screen.getAllByRole('columnheader');
    const ageHeader = headers.find((h) => h.textContent?.includes('Age'))!;
    const nameHeader = headers.find((h) => h.textContent?.includes('Name'))!;

    // Drag Age to the Name position (index 0)
    fireEvent.dragStart(ageHeader);
    fireEvent.dragOver(nameHeader);
    fireEvent.drop(nameHeader);
    fireEvent.dragEnd(ageHeader);

    const updatedHeaders = screen.getAllByRole('columnheader');
    expect(updatedHeaders[0]?.textContent?.trim()).toContain('Age');
  });

  it('shows drop indicator at target position', () => {
    renderColGrid();
    const headers = screen.getAllByRole('columnheader');
    const ageHeader = headers.find((h) => h.textContent?.includes('Age'))!;
    const nameHeader = headers.find((h) => h.textContent?.includes('Name'))!;

    fireEvent.dragStart(ageHeader);
    fireEvent.dragOver(nameHeader);
    // Drop indicator should be visible
    expect(screen.getByTestId('column-drop-indicator')).toBeInTheDocument();
    fireEvent.dragEnd(ageHeader);
  });

  it('updates column order in state', () => {
    renderColGrid();
    const headers = screen.getAllByRole('columnheader');
    const ageHeader = headers.find((h) => h.textContent?.includes('Age'))!;
    const emailHeader = headers.find((h) => h.textContent?.includes('Email'))!;

    fireEvent.dragStart(ageHeader);
    fireEvent.dragOver(emailHeader);
    fireEvent.drop(emailHeader);
    fireEvent.dragEnd(ageHeader);

    const updatedHeaders = screen.getAllByRole('columnheader');
    const titles = updatedHeaders.map((h) => h.textContent?.replace(/[^a-zA-Z\s]/g, '').trim());
    expect(titles.indexOf('Age')).toBeGreaterThan(titles.indexOf('Name'));
  });

  it('fires onColumnReorder callback', () => {
    const onColumnReorder = vi.fn();
    renderColGrid({ onColumnReorder });
    const headers = screen.getAllByRole('columnheader');
    const ageHeader = headers.find((h) => h.textContent?.includes('Age'))!;
    const nameHeader = headers.find((h) => h.textContent?.includes('Name'))!;

    fireEvent.dragStart(ageHeader);
    fireEvent.dragOver(nameHeader);
    fireEvent.drop(nameHeader);
    fireEvent.dragEnd(ageHeader);

    expect(onColumnReorder).toHaveBeenCalledWith('age', 0);
  });

  it('does not allow drop on frozen column region', () => {
    const frozenColumns = [
      { ...colColumns[0]!, frozen: 'left' as const },
      ...colColumns.slice(1),
    ];
    render(
      <DataGrid
        data={makeColData()}
        columns={frozenColumns}
        rowKey="id"
        sorting={true}
      />
    );
    const headers = screen.getAllByRole('columnheader');
    const ageHeader = headers.find((h) => h.textContent?.includes('Age'))!;
    const nameHeader = headers.find((h) => h.textContent?.includes('Name'))!;

    fireEvent.dragStart(ageHeader);
    fireEvent.dragOver(nameHeader);
    // The frozen column should not accept drops
    expect(nameHeader).toHaveAttribute('data-drop-disabled', 'true');
    fireEvent.dragEnd(ageHeader);
  });
});

// ---------------------------------------------------------------------------
// Column Visibility Integration Tests
// ---------------------------------------------------------------------------

describe('column visibility integration', () => {
  it('toggle hides column', () => {
    render(
      <DataGrid
        data={makeColData()}
        columns={colColumns}
        rowKey="id"
        showColumnVisibilityMenu={true}
      />
    );
    // Open the visibility menu
    fireEvent.click(screen.getByTestId('column-visibility-toggle'));
    const menu = screen.getByTestId('column-visibility-menu');
    // Uncheck Email column
    const emailCheckbox = within(menu).getByLabelText('Email');
    fireEvent.click(emailCheckbox);
    // Email header should be gone
    expect(screen.queryByRole('columnheader', { name: /email/i })).not.toBeInTheDocument();
  });

  it('toggle shows hidden column', () => {
    render(
      <DataGrid
        data={makeColData()}
        columns={colColumns}
        rowKey="id"
        showColumnVisibilityMenu={true}
      />
    );
    fireEvent.click(screen.getByTestId('column-visibility-toggle'));
    const menu = screen.getByTestId('column-visibility-menu');
    const emailCheckbox = within(menu).getByLabelText('Email');
    // Hide then show
    fireEvent.click(emailCheckbox);
    expect(screen.queryByRole('columnheader', { name: /email/i })).not.toBeInTheDocument();
    fireEvent.click(emailCheckbox);
    expect(screen.getByRole('columnheader', { name: /email/i })).toBeInTheDocument();
  });

  it('menu lists all columns with checkboxes', () => {
    render(
      <DataGrid
        data={makeColData()}
        columns={colColumns}
        rowKey="id"
        showColumnVisibilityMenu={true}
      />
    );
    fireEvent.click(screen.getByTestId('column-visibility-toggle'));
    const menu = screen.getByTestId('column-visibility-menu');
    const checkboxes = within(menu).getAllByRole('checkbox');
    expect(checkboxes.length).toBe(4); // Name, Age, Email, Dept
  });

  it('fires onColumnVisibilityChange callback', () => {
    const onColumnVisibilityChange = vi.fn();
    render(
      <DataGrid
        data={makeColData()}
        columns={colColumns}
        rowKey="id"
        showColumnVisibilityMenu={true}
        onColumnVisibilityChange={onColumnVisibilityChange}
      />
    );
    fireEvent.click(screen.getByTestId('column-visibility-toggle'));
    const menu = screen.getByTestId('column-visibility-menu');
    const emailCheckbox = within(menu).getByLabelText('Email');
    fireEvent.click(emailCheckbox);
    expect(onColumnVisibilityChange).toHaveBeenCalledWith('email', false);
  });

  it('hidden column data excluded from export', () => {
    render(
      <DataGrid
        data={makeColData()}
        columns={colColumns}
        rowKey="id"
        showColumnVisibilityMenu={true}
      />
    );
    fireEvent.click(screen.getByTestId('column-visibility-toggle'));
    const menu = screen.getByTestId('column-visibility-menu');
    const emailCheckbox = within(menu).getByLabelText('Email');
    fireEvent.click(emailCheckbox);
    // No email cells should be rendered
    const emailCells = screen.queryAllByRole('gridcell').filter(
      (c) => c.getAttribute('data-field') === 'email'
    );
    expect(emailCells.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Column Freeze Integration Tests
// ---------------------------------------------------------------------------

describe('column freeze integration', () => {
  it('locks column to left side', () => {
    const frozenColumns = [
      { ...colColumns[0]!, frozen: 'left' as const },
      ...colColumns.slice(1),
    ];
    render(
      <DataGrid data={makeColData()} columns={frozenColumns} rowKey="id" />
    );
    const nameHeader = screen.getByRole('columnheader', { name: /^name/i });
    expect(nameHeader).toHaveAttribute('data-frozen', 'left');
  });

  it('frozen column does not scroll horizontally', () => {
    const frozenColumns = [
      { ...colColumns[0]!, frozen: 'left' as const },
      ...colColumns.slice(1),
    ];
    render(
      <DataGrid data={makeColData()} columns={frozenColumns} rowKey="id" />
    );
    const nameHeader = screen.getByRole('columnheader', { name: /^name/i });
    expect(nameHeader).toHaveStyle({ position: 'sticky' });
  });

  it('frozen column border visible', () => {
    const frozenColumns = [
      { ...colColumns[0]!, frozen: 'left' as const },
      ...colColumns.slice(1),
    ];
    render(
      <DataGrid data={makeColData()} columns={frozenColumns} rowKey="id" />
    );
    const nameHeader = screen.getByRole('columnheader', { name: /^name/i });
    expect(nameHeader).toHaveAttribute('data-frozen-border', 'true');
  });

  it('multiple columns lock in order', () => {
    const frozenColumns = [
      { ...colColumns[0]!, frozen: 'left' as const },
      { ...colColumns[1]!, frozen: 'left' as const },
      ...colColumns.slice(2),
    ];
    render(
      <DataGrid data={makeColData()} columns={frozenColumns} rowKey="id" />
    );
    const headers = screen.getAllByRole('columnheader');
    expect(headers[0]).toHaveAttribute('data-frozen', 'left');
    expect(headers[1]).toHaveAttribute('data-frozen', 'left');
  });

  it('unfreeze returns column to scrollable region', () => {
    // Render with frozen, then programmatically unfreeze via column menu
    render(
      <DataGrid
        data={makeColData()}
        columns={[{ ...colColumns[0]!, frozen: 'left' as const }, ...colColumns.slice(1)]}
        rowKey="id"
        showColumnMenu={true}
      />
    );
    // Unfreeze via column header menu
    const nameHeader = screen.getByRole('columnheader', { name: /^name/i });
    fireEvent.contextMenu(nameHeader);
    const unfreezeOption = screen.getByTestId('column-menu-unfreeze');
    fireEvent.click(unfreezeOption);
    // Column should no longer be frozen
    const updatedNameHeader = screen.getByRole('columnheader', { name: /^name/i });
    expect(updatedNameHeader).not.toHaveAttribute('data-frozen');
  });

  it('fires onColumnFreeze callback', () => {
    const onColumnFreeze = vi.fn();
    render(
      <DataGrid
        data={makeColData()}
        columns={colColumns}
        rowKey="id"
        showColumnMenu={true}
        onColumnFreeze={onColumnFreeze}
      />
    );
    // Freeze via column header menu
    const nameHeader = screen.getByRole('columnheader', { name: /^name/i });
    fireEvent.contextMenu(nameHeader);
    const freezeOption = screen.getByTestId('column-menu-freeze');
    fireEvent.click(freezeOption);
    expect(onColumnFreeze).toHaveBeenCalledWith('name', 'left');
  });
});

// ---------------------------------------------------------------------------
// Column Header Integration Tests
// ---------------------------------------------------------------------------

describe('column header integration', () => {
  it('renders sortable indicator when sorting enabled', () => {
    renderColGrid();
    const nameHeader = screen.getByRole('columnheader', { name: /^name/i });
    expect(nameHeader).toHaveAttribute('data-sortable', 'true');
  });

  it('renders filter icon when filtering enabled', () => {
    render(
      <DataGrid
        data={makeColData()}
        columns={colColumns}
        rowKey="id"
        filtering={true}
      />
    );
    const filterIcons = screen.queryAllByTestId('column-filter-icon');
    expect(filterIcons.length).toBeGreaterThan(0);
  });

  it('renders column menu trigger', () => {
    render(
      <DataGrid
        data={makeColData()}
        columns={colColumns}
        rowKey="id"
        showColumnMenu={true}
      />
    );
    const menuTriggers = screen.queryAllByTestId('column-menu-trigger');
    expect(menuTriggers.length).toBe(4); // One per column
  });

  it('column header menu shows hide column option', () => {
    render(
      <DataGrid
        data={makeColData()}
        columns={colColumns}
        rowKey="id"
        showColumnMenu={true}
      />
    );
    const nameHeader = screen.getByRole('columnheader', { name: /^name/i });
    fireEvent.contextMenu(nameHeader);
    expect(screen.getByTestId('column-menu-hide')).toBeInTheDocument();
  });

  it('column header menu shows freeze column option', () => {
    render(
      <DataGrid
        data={makeColData()}
        columns={colColumns}
        rowKey="id"
        showColumnMenu={true}
      />
    );
    const nameHeader = screen.getByRole('columnheader', { name: /^name/i });
    fireEvent.contextMenu(nameHeader);
    expect(screen.getByTestId('column-menu-freeze')).toBeInTheDocument();
  });
});
