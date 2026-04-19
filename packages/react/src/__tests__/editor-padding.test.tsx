/**
 * Editor padding parity — Excel-365 contract guard.
 *
 * Background: each data cell renders with `padding: var(--dg-cell-padding, 0
 * 12px)` via `styles.cell()`. When a user double-clicks a cell, the fallback
 * inline `<input>` editor mounts and today uses `styles.cellInput` with
 * `padding: 0`. That mismatch causes the glyphs inside the edited cell to
 * shift horizontally the instant edit mode begins — a visible "jump" that is
 * NOT present in Excel 365 web (where the editor inherits cell box metrics
 * exactly).
 *
 * These tests encode the Excel-365-parity contract: mounting the editor must
 * be visually invisible except for a blinking caret. The input's padding MUST
 * come from the same `var(--dg-cell-padding, …)` token chain that the cell
 * uses, its font cascade MUST be inherited (so font-size / line-height are
 * identical), and it MUST NOT introduce any border, outline, or horizontal
 * margin that would push the first glyph off-axis.
 *
 * jsdom caveat: jsdom does not resolve CSS custom properties against declared
 * values — `getComputedStyle(...).paddingLeft` returns an empty string when
 * the declared value is `var(--dg-cell-padding, 0 12px)`. We therefore probe
 * the inline-style objects directly (the same React `style` prop objects the
 * cell/input render with) and assert token-string identity. The E2E spec in
 * `e2e/editor-padding.spec.ts` performs the numeric pixel-parity check in a
 * real browser.
 *
 * These tests are authored RED: with the current
 * `packages/react/src/body/DataGridBody.styles.ts#cellInput` (padding: 0,
 * font: inherit but NO padding token, etc.) they must fail. Implementation
 * lives in that module, not in this test.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { DataGrid } from '../DataGrid';
import * as bodyStyles from '../body/DataGridBody.styles';

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

type Row = { id: string; name: string };

function makeRows(): Row[] {
  return [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
  ];
}

const columns = [{ id: 'name', field: 'name', title: 'Name', width: 160 }];

function renderGrid() {
  return render(
    <DataGrid
      data={makeRows()}
      columns={columns}
      rowKey="id"
    />,
  );
}

// ---------------------------------------------------------------------------
// Helper: enter edit mode on the first data cell and return both elements.
// ---------------------------------------------------------------------------

function enterEdit(): { cell: HTMLElement; input: HTMLInputElement } {
  renderGrid();
  const cells = screen.getAllByRole('gridcell');
  const cell = cells[0]!;
  // Click-then-dblclick matches the real interaction order (select then edit)
  // and mirrors `DataGrid.test.tsx` patterns.
  fireEvent.click(cell);
  fireEvent.dblClick(cell);
  const input = screen.getByRole('textbox') as HTMLInputElement;
  return { cell, input };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('editor padding matches cell padding (Excel-365 parity)', () => {
  // Guard on the declared style factories directly — this is the source of
  // truth the component renders with. If either side's padding token changes
  // this assertion catches the drift immediately.
  it("the input's inline-style padding equals the cell's inline-style padding", () => {
    const { cell, input } = enterEdit();

    const cellPadding = cell.style.padding;
    const inputPadding = input.style.padding;

    // The cell ships `var(--dg-cell-padding, 0 12px)` today; the editor must
    // use the same token chain so the glyph X-position is preserved.
    expect(cellPadding).toMatch(/var\(--dg-cell-padding/);
    expect(inputPadding).toMatch(/var\(--dg-cell-padding/);
    expect(inputPadding).toBe(cellPadding);
  });

  it('the cellInput style factory exposes the same --dg-cell-padding token as the cell factory', () => {
    // Direct assertion on the exported style objects so the contract is
    // independently verifiable without a render.
    const cellStyle = bodyStyles.cell({
      width: 160,
      height: 32,
      selected: false,
      hasError: false,
      frozen: null,
      frozenLeftOffset: 0,
      editable: true,
    });
    expect(String(cellStyle.padding)).toMatch(/var\(--dg-cell-padding/);
    expect(String(bodyStyles.cellInput.padding)).toMatch(/var\(--dg-cell-padding/);
    expect(bodyStyles.cellInput.padding).toBe(cellStyle.padding);
  });

  it('the input has no horizontal margin that would shift the glyph baseline', () => {
    const { input } = enterEdit();
    // Any non-zero horizontal margin moves the first glyph off the cell's
    // padding-box origin. Empty string OR "0" are both acceptable.
    const ml = input.style.marginLeft || '0';
    const mr = input.style.marginRight || '0';
    expect(ml).toMatch(/^(0|0px)$/);
    expect(mr).toMatch(/^(0|0px)$/);
  });

  it('the input has no border-width that would shift the glyph baseline', () => {
    const { input } = enterEdit();
    // A non-zero border adds width to the input's box and consequently
    // pushes the content-box inset. The contract requires border: none.
    expect(input.style.border === 'none' || input.style.border === '' ).toBe(true);
    // Verify no horizontal border shorthand sneaks in via per-side props.
    expect(input.style.borderLeft || '').not.toMatch(/\d+px/);
    expect(input.style.borderRight || '').not.toMatch(/\d+px/);
  });

  it("the input's font-family / font-size / font-weight / line-height are inherited or unset", () => {
    const { input } = enterEdit();
    const allowed = (v: string | undefined): boolean => {
      const s = (v ?? '').trim();
      return s === '' || s === 'inherit';
    };
    // `font: inherit` shorthand expands to all four longhand properties as
    // 'inherit', OR they may simply be unset (empty string) — both let the
    // cell's own font cascade through.
    expect(allowed(input.style.fontFamily)).toBe(true);
    expect(allowed(input.style.fontSize)).toBe(true);
    expect(allowed(input.style.fontWeight)).toBe(true);
    expect(allowed(input.style.lineHeight)).toBe(true);
  });

  it("the input's border and outline are 'none' (no halo competing with the cell's selection outline)", () => {
    const { input } = enterEdit();
    // React/jsdom elides `border: none` shorthand from the serialised style
    // attribute; the functional contract is "no visible border", which holds
    // when either (a) the inline style reads 'none' or (b) no border shorthand
    // is set at all and no longhand introduces a width.
    const borderOk =
      input.style.border === 'none' ||
      (input.style.border === '' &&
        input.style.borderWidth === '' &&
        input.style.borderStyle === '');
    expect(borderOk).toBe(true);
    expect(input.style.outline).toBe('none');
  });

  it('inline-style snapshot: input padding uses the same CSS token chain as the cell', () => {
    const { cell, input } = enterEdit();

    // Snapshot the two inline-style objects' padding tokens side-by-side so
    // any drift (e.g. the cell switches tokens but the input lags behind) is
    // caught by a single symmetric diff rather than two independent asserts.
    const snapshot = {
      cell: { padding: cell.style.padding },
      input: { padding: input.style.padding },
    };
    expect(snapshot).toMatchInlineSnapshot(`
      {
        "cell": {
          "padding": "var(--dg-cell-padding, 0 12px)",
        },
        "input": {
          "padding": "var(--dg-cell-padding, 0 12px)",
        },
      }
    `);
  });
});
