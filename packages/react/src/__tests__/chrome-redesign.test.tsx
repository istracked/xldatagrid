/**
 * Failing red-phase tests for the Google-Sheets-style row-number chrome
 * redesign. The body row-number cell should visually read as part of the
 * body (light, muted, borderless-on-top), not as an extension of the header:
 *
 *   background : `var(--dg-row-number-bg, var(--dg-bg-color, #ffffff))`
 *   color      : `var(--dg-row-number-text, #9ca3af)`
 *   borderRight: `1px solid var(--dg-border-color)`
 *   fontWeight : 400 / normal (body cell — NOT 600)
 *
 * The header tile (`#`) keeps its pre-existing `fontWeight: 600` but picks up
 * the new muted token for `color`.
 *
 * Sentinel hexes are injected via the `theme` prop so the computed styles
 * resolve to the expected RGB triplets. Tests compare against the `style`
 * attribute as a compatibility fallback because jsdom's `getComputedStyle`
 * may leave `var(...)` references unresolved.
 */
import React from 'react';
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

// Sentinel token values — chosen so the RGB form is easy to spot in errors.
const SENTINEL_BG = '#f0f1f2'; // body background
const SENTINEL_HEADER_BG = '#101112'; // header background — MUST differ
const SENTINEL_ROW_NUMBER_TEXT = '#c0d0e0'; // muted row-number text colour
const SENTINEL_BORDER = '#abcdef';

const SENTINEL_BG_RGB = 'rgb(240, 241, 242)';
const SENTINEL_ROW_NUMBER_TEXT_RGB = 'rgb(192, 208, 224)';

/**
 * Builds a theme object that pins every token this test cares about to a
 * sentinel hex. Does NOT define `--dg-row-number-bg` so the new fallback
 * chain `var(--dg-row-number-bg, var(--dg-bg-color, #ffffff))` resolves to
 * the body background — which is what the redesign is asserting.
 */
function theme() {
  return {
    '--dg-bg-color': SENTINEL_BG,
    '--dg-header-bg': SENTINEL_HEADER_BG,
    '--dg-row-number-text': SENTINEL_ROW_NUMBER_TEXT,
    '--dg-border-color': SENTINEL_BORDER,
  };
}

function bodyRowNumberCell(): HTMLElement {
  const cell = screen.getAllByTestId('chrome-row-number')[0]!;
  return cell as HTMLElement;
}

function headerRowNumberCell(): HTMLElement {
  return screen.getByTestId('chrome-row-number-header') as HTMLElement;
}

// ---------------------------------------------------------------------------
// Body row-number cell
// ---------------------------------------------------------------------------

describe('chrome redesign — body row-number cell', () => {
  it('background resolves to the body-bg sentinel (NOT the header-bg sentinel)', () => {
    render(
      <DataGrid
        data={data}
        columns={columns}
        rowKey="id"
        chrome={{ rowNumbers: true }}
        theme={theme()}
      />,
    );

    const cell = bodyRowNumberCell();
    const computed = window.getComputedStyle(cell);
    const inline = (cell.style.background || cell.style.backgroundColor || '').toLowerCase();

    // Computed form (preferred): must resolve to the body-bg sentinel.
    const computedMatches =
      computed.backgroundColor === SENTINEL_BG_RGB ||
      computed.background.includes(SENTINEL_BG_RGB);

    // Inline fallback: must reference `--dg-bg-color` somewhere in the
    // fallback chain, AND must NOT equal `--dg-header-bg` as the outermost
    // token (the old behaviour).
    const inlineReferencesBodyBg = inline.includes('--dg-bg-color');
    // Old behaviour used `var(--dg-row-number-bg, var(--dg-header-bg))`
    // with NO body-bg fallback — catch that regression.
    const inlineIsOldChain = inline.includes('--dg-header-bg') && !inline.includes('--dg-bg-color');

    expect(computedMatches || inlineReferencesBodyBg).toBe(true);
    expect(inlineIsOldChain).toBe(false);
  });

  it('text color resolves to the muted row-number-text sentinel', () => {
    render(
      <DataGrid
        data={data}
        columns={columns}
        rowKey="id"
        chrome={{ rowNumbers: true }}
        theme={theme()}
      />,
    );

    const cell = bodyRowNumberCell();
    const computed = window.getComputedStyle(cell);
    const inline = (cell.style.color || '').toLowerCase();

    const computedMatches = computed.color === SENTINEL_ROW_NUMBER_TEXT_RGB;
    const inlineReferencesToken = inline.includes('--dg-row-number-text');
    const inlineIsOldChain = inline.includes('--dg-text-color') && !inline.includes('--dg-row-number-text');

    expect(computedMatches || inlineReferencesToken).toBe(true);
    expect(inlineIsOldChain).toBe(false);
  });

  it('has a solid right border of at least 1px', () => {
    render(
      <DataGrid
        data={data}
        columns={columns}
        rowKey="id"
        chrome={{ rowNumbers: true }}
        theme={theme()}
      />,
    );

    const cell = bodyRowNumberCell();
    const computed = window.getComputedStyle(cell);
    const inlineBr = (cell.style.borderRight || '').toLowerCase();
    const inlineStyle = cell.style.borderRightStyle;
    const inlineWidth = cell.style.borderRightWidth;

    const isSolid =
      computed.borderRightStyle === 'solid' ||
      inlineStyle === 'solid' ||
      inlineBr.includes('solid');

    // Parse a pixel width from any available source.
    const widths = [computed.borderRightWidth, inlineWidth, inlineBr]
      .map((s) => {
        const m = /(\d+(?:\.\d+)?)px/.exec(s || '');
        return m ? parseFloat(m[1]!) : NaN;
      })
      .filter((n) => !Number.isNaN(n));
    const maxWidth = widths.length > 0 ? Math.max(...widths) : 0;

    expect(isSolid).toBe(true);
    expect(maxWidth).toBeGreaterThanOrEqual(1);
  });

  it('font-weight is 400 / normal (NOT 600)', () => {
    render(
      <DataGrid
        data={data}
        columns={columns}
        rowKey="id"
        chrome={{ rowNumbers: true }}
        theme={theme()}
      />,
    );

    const cell = bodyRowNumberCell();
    const computed = window.getComputedStyle(cell);
    const inline = String(cell.style.fontWeight ?? '');

    const effective = inline || computed.fontWeight || '';
    expect(['400', 'normal', '']).toContain(effective);
    expect(effective).not.toBe('600');
    expect(effective).not.toBe('bold');
  });
});

// ---------------------------------------------------------------------------
// Header row-number cell
// ---------------------------------------------------------------------------

describe('chrome redesign — header row-number cell', () => {
  it('header row-number tile keeps fontWeight: 600', () => {
    render(
      <DataGrid
        data={data}
        columns={columns}
        rowKey="id"
        chrome={{ rowNumbers: true }}
        theme={theme()}
      />,
    );

    const header = headerRowNumberCell();
    const computed = window.getComputedStyle(header);
    const inline = String(header.style.fontWeight ?? '');

    const effective = inline || computed.fontWeight || '';
    expect(effective).toBe('600');
  });

  it('header row-number tile text uses the muted row-number-text token', () => {
    render(
      <DataGrid
        data={data}
        columns={columns}
        rowKey="id"
        chrome={{ rowNumbers: true }}
        theme={theme()}
      />,
    );

    const header = headerRowNumberCell();
    const computed = window.getComputedStyle(header);
    const inline = (header.style.color || '').toLowerCase();

    const computedMatches = computed.color === SENTINEL_ROW_NUMBER_TEXT_RGB;
    const inlineReferencesToken = inline.includes('--dg-row-number-text');

    expect(computedMatches || inlineReferencesToken).toBe(true);
  });
});
