/**
 * Inline `CSSProperties` factories for the grid's chrome columns: the controls
 * gutter (row action buttons) and the row-number gutter.
 *
 * Design reference: Excel 365 — a neutral grey left gutter that remains pinned
 * during horizontal scroll, with a darker header tile on top.
 *
 * Sticky-positioning strategy: chrome columns pin to the grid's left edge via
 * `position: sticky`. When the row-number column sits to the right of the
 * controls column, its sticky `left` offset must equal the controls width; when
 * no controls column is rendered the offset is `0`. Z-index layering keeps
 * chrome above body cells and chrome headers above chrome body cells:
 *   - controls body cell:   z-index 4
 *   - controls header cell: z-index 5
 *   - row-number body cell: z-index 5 (only when sticky)
 *   - row-number header:    z-index 6 (only when sticky)
 *
 * The `--dg-row-number-bg` CSS custom property is the row-number tint token; it
 * falls back to `--dg-header-bg` so consumers that do not define the new token
 * still get a sensible header-matching background. The Excel-gutter grey
 * (`#f3f2f1`) is supplied by the `.dg-theme-excel365` stylesheet rather than
 * inline.
 */
import type { CSSProperties } from 'react';

/**
 * Body-row controls cell (row action buttons). Sticky-pinned to the left edge
 * at `left: 0`, z-index 4 so it sits above normal body cells but below any
 * header row. Width/height are fixed to the supplied values to prevent flex
 * growth; `overflow: hidden` clips overflowing action buttons.
 */
export const controlsCell = (width: number, height: number): CSSProperties => ({
  // Locked track width so the column cannot flex with siblings.
  width,
  minWidth: width,
  maxWidth: width,
  height,
  // Centered button row with a small inter-button gap.
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  // Pinned to the grid's left edge during horizontal scroll.
  position: 'sticky',
  left: 0,
  zIndex: 4,
  // Opaque body background so scrolled content cannot bleed through.
  background: 'var(--dg-bg-color, #ffffff)',
  borderRight: '1px solid var(--dg-border-color, #e2e8f0)',
  boxSizing: 'border-box',
  // Clip overflowing children; `flexShrink: 0` prevents collapse.
  overflow: 'hidden',
  flexShrink: 0,
});

/**
 * Header-row controls cell. Mirrors the body controls cell but uses the header
 * background token and a higher z-index (5) so it stays above the row-number
 * header cell on horizontal scroll.
 */
export const controlsHeaderCell = (width: number, height: number): CSSProperties => ({
  // Same locked-width contract as the body cell.
  width,
  minWidth: width,
  maxWidth: width,
  height,
  // Centered placeholder (the header tile is currently empty).
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  // Pinned to the grid's left edge; higher z-index than `controlsCell` so the
  // header tile stays on top when the body scrolls under it.
  position: 'sticky',
  left: 0,
  zIndex: 5,
  background: 'var(--dg-header-bg, #f8fafc)',
  borderRight: '1px solid var(--dg-border-color, #e2e8f0)',
  boxSizing: 'border-box',
});

/**
 * Shared style for each action button inside a controls cell. Transparent,
 * borderless, tightly padded, with ellipsis-truncated text so labels never
 * break the row layout.
 */
export const actionButton: CSSProperties = {
  // Ghost-button look: no border, transparent fill, icon-sized padding.
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  padding: 2,
  borderRadius: 2,
  // Center icon/label inside the button.
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
  // Allow the button to shrink and clip rather than overflow the cell.
  flexShrink: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
  maxWidth: '100%',
};

/**
 * Sizing for an `<svg>`/icon node inside an `actionButton`. Scales with the
 * button's font-size so the icon matches surrounding text.
 */
export const actionButtonIcon: CSSProperties = {
  // Track the parent button's font-size for crisp 1:1 icon scaling.
  width: '1em',
  height: '1em',
  fontSize: 'inherit',
  // Never shrink the icon — label text is what collapses first.
  flexShrink: 0,
};

/**
 * Body-row row-number cell. Centered digit with the Excel-gutter background
 * token `--dg-row-number-bg` that falls back to `--dg-header-bg` when the
 * token is not defined. Does not apply sticky positioning by itself — callers
 * opt into sticky via the `stickyLeft` prop on `ChromeRowNumberCell`.
 */
export const rowNumberCell = (width: number, height: number): CSSProperties => ({
  // Locked track width.
  width,
  minWidth: width,
  maxWidth: width,
  height,
  // Center the row-number digit.
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderLeft: '1px solid var(--dg-border-color, #e2e8f0)',
  // Thin separator between the gutter and the first content column — matches
  // the Google-Sheets / Excel-Web look where the gutter reads as part of the
  // body rather than an extension of the header.
  borderRight: '1px solid var(--dg-border-color, #e2e8f0)',
  boxSizing: 'border-box',
  // Clickable for row selection; disable text selection so drag works cleanly.
  cursor: 'pointer',
  userSelect: 'none',
  fontSize: 12,
  // Body-cell digit weight — regular, not bold. The selection overlay
  // (`rowNumberSelected`) bumps this back to 600 for the active row.
  fontWeight: 400,
  // Muted medium-grey number. Falls back to a Sheets-style `#9ca3af`.
  color: 'var(--dg-row-number-text, #9ca3af)',
  // Gutter background reads as the body (near-white in light theme) rather
  // than the header tint. Fallback chain lets consumers override via the
  // dedicated token, the body-bg token, or finally a hard-coded white.
  background: 'var(--dg-row-number-bg, var(--dg-bg-color, transparent))',
});

/**
 * Header-row row-number cell (the `#` tile). Visually matches the body
 * row-number cell but bolds the text and omits the clickable cursor. Sticky
 * positioning is applied by the component when `stickyLeft` is provided.
 */
export const rowNumberHeaderCell = (width: number, height: number): CSSProperties => ({
  // Locked track width.
  width,
  minWidth: width,
  maxWidth: width,
  height,
  // Center the `#` glyph.
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderLeft: '1px solid var(--dg-border-color, #e2e8f0)',
  borderRight: '1px solid var(--dg-border-color, #e2e8f0)',
  boxSizing: 'border-box',
  // Same token chain as the body cell so the gutter reads as a single column
  // top-to-bottom — the `#` tile should not visually stand apart from the
  // numbered body cells below it.
  background: 'var(--dg-row-number-bg, var(--dg-bg-color, transparent))',
  fontSize: 12,
  // Header glyph stays bold — this is the visual affordance that distinguishes
  // the header tile from the body row-number cells.
  fontWeight: 600,
  // Muted number-column text token, matching the body cells.
  color: 'var(--dg-row-number-text, #9ca3af)',
});

/**
 * Icon-wrapper style applied to the optional icon supplied via
 * `chrome.getChromeCellContent`. The icon sits flush against the text (small
 * inline-flex wrapper so the icon centres vertically and clips to the cell
 * height without forcing it to grow).
 */
export const rowNumberIcon: CSSProperties = {
  // Inline-flex so the icon centres with the text baseline.
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  // Small gap before any following text, matching the surrounding typography.
  marginRight: 4,
  // Never shrink — text wins the clipping contest first.
  flexShrink: 0,
  // Icons sized via their own width/height; constrain here so very large
  // icons cannot push the cell height beyond the row.
  maxHeight: '100%',
  lineHeight: 1,
};

/**
 * Visual overlay applied to a row-number cell that is the drag source during a
 * row-reorder interaction.
 */
export const rowNumberDragging: CSSProperties = {
  // Dim the drag source for visual feedback during reorder.
  opacity: 0.5,
};

/**
 * Visual overlay applied to a row-number cell whose row is selected. Merged on
 * top of `rowNumberCell` so it wins the background cascade.
 */
export const rowNumberSelected: CSSProperties = {
  // Selection-tinted fill and bolder digit for the selected row.
  background: 'var(--dg-selection-color, #dbeafe)',
  fontWeight: 600,
};
