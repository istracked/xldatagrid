/**
 * Excel 365 column-header filter dropdown.
 *
 * This is the menu that opens when the user clicks the filter glyph on a
 * column header. It mirrors the Excel 365 dropdown exactly, with a fixed
 * section order:
 *   1. Sort ascending
 *   2. Sort descending
 *   3. (stub) Sort by Color
 *   4. Clear filter from "Title"
 *   5. (stub) Filter by Color
 *   6. Text/Number/Date Filters (opens the custom-condition dialog)
 *   7. Search input
 *   8. (Select All) + (Blanks) + distinct-values checklist
 *   9. OK / Cancel footer
 *
 * The section order is a hard invariant — tests in
 * `column-filter-menu.test.tsx` guard it. Callers must not reorder rows
 * without updating tests.
 *
 * Accessibility
 * - Outer container has `role="menu"`; rows use `role="menuitem"`; the
 *   checklist uses `role="listbox"`.
 * - Stubbed "by color" rows carry `aria-disabled="true"` so assistive tech
 *   announces them as unavailable.
 * - The (Select All) checkbox uses the `indeterminate` DOM flag when only
 *   some visible rows are checked.
 *
 * Design notes
 * - The menu is portaled to `document.body` so it is not clipped by the
 *   grid header's overflow:hidden.
 * - Draft selection is held locally and only propagated to the caller via
 *   `onApplyValueFilter` when the user clicks OK; Cancel simply closes
 *   and discards the draft.
 * - "(Blanks)" corresponds to an empty-string entry in `distinctValues`,
 *   which the upstream search index emits using the `'(blanks)'` sentinel
 *   to represent null/undefined cells.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as styles from './DataGridColumnFilterMenu.styles';

// Mirrors ContextMenu.tsx — avoids React layout-effect warning in SSR.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Props for {@link DataGridColumnFilterMenu}.
 *
 * The menu is a controlled component: the parent owns `open`, the current
 * `selectedValues` set, and the active sort direction. Every user-initiated
 * change flows back through the `on*` callbacks; the menu itself only keeps
 * the in-flight search query and draft selection locally.
 */
export interface DataGridColumnFilterMenuProps {
  /** Whether the dropdown is visible. */
  open: boolean;
  /** The field this dropdown controls. */
  field: string;
  /** Human label shown in "Clear Filter from «title»" and the condition submenu title. */
  title: string;
  /** Drives which Filters submenu label appears. */
  dataType?: 'text' | 'number' | 'date';
  /** Anchor rect in viewport coords — menu positions itself below-left. */
  anchor: { top: number; left: number; bottom: number; right: number };
  /** Distinct values for the checklist, already sorted. Undefined → "Indexing…" placeholder. */
  distinctValues?: ReadonlyArray<string>;
  /** Currently selected value set. Undefined means all selected (no filter). */
  selectedValues?: ReadonlySet<string>;
  /** Whether this column has an active filter. */
  hasActiveFilter: boolean;
  /** Current sort direction for this field. */
  sortDir: 'asc' | 'desc' | null;

  onSortAsc: () => void;
  onSortDesc: () => void;
  onClearFilter: () => void;
  /** Undefined = all selected → caller should clear filter. */
  onApplyValueFilter: (selectedValues: Set<string> | undefined) => void;
  /** Caller renders the custom-condition dialog; this menu just triggers it. */
  onOpenCustomFilter: () => void;
  onClose: () => void;
}

/**
 * Picks the Excel 365 sort label variant that matches the column data type.
 * Text columns say "Sort A to Z", numbers "Sort Smallest to Largest", and
 * dates "Sort Oldest to Newest" (with the reverse for descending).
 */
function sortLabel(dir: 'asc' | 'desc', dataType?: 'text' | 'number' | 'date'): string {
  if (dataType === 'number') return dir === 'asc' ? 'Sort Smallest to Largest' : 'Sort Largest to Smallest';
  if (dataType === 'date') return dir === 'asc' ? 'Sort Oldest to Newest' : 'Sort Newest to Oldest';
  return dir === 'asc' ? 'Sort A to Z' : 'Sort Z to A';
}

/**
 * Label used for the submenu that opens the custom-condition dialog,
 * localised by data type ("Text Filters", "Number Filters", "Date Filters").
 */
function conditionsLabel(dataType?: 'text' | 'number' | 'date'): string {
  if (dataType === 'number') return 'Number Filters';
  if (dataType === 'date') return 'Date Filters';
  return 'Text Filters';
}

/**
 * A single hoverable menu row (`role="menuitem"`).
 *
 * Applies hover styles on mouse enter/leave and exposes `aria-disabled` when
 * `disabled` is true. Disabled rows swallow click events so stubbed entries
 * such as "Sort by Color" are inert.
 */
function MenuItem({
  testId,
  disabled,
  icon,
  children,
  hasCaret,
  onClick,
}: {
  testId: string;
  disabled?: boolean;
  icon?: string;
  children: React.ReactNode;
  hasCaret?: boolean;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isDisabled = !!disabled;

  return (
    <div
      role="menuitem"
      data-testid={testId}
      aria-disabled={isDisabled || undefined}
      style={{
        ...styles.menuItem(isDisabled),
        ...(hovered && !isDisabled ? styles.menuItemHover : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        if (isDisabled) return;
        onClick?.();
      }}
    >
      {icon !== undefined && <span style={styles.icon}>{icon}</span>}
      <span style={styles.label}>{children}</span>
      {hasCaret && <span style={styles.submenuCaret}>&#9654;</span>}
    </div>
  );
}

/**
 * Excel 365 column filter dropdown.
 *
 * Returns `null` when `open` is false. When open the menu is portaled to
 * `document.body` and positioned just below the anchor rect, clamped to the
 * viewport. Closes on Escape or on mousedown outside its own container.
 */
export function DataGridColumnFilterMenu(props: DataGridColumnFilterMenuProps): React.ReactElement | null {
  const {
    open,
    field,
    title,
    dataType,
    anchor,
    distinctValues,
    selectedValues,
    hasActiveFilter,
    onSortAsc,
    onSortDesc,
    onClearFilter,
    onApplyValueFilter,
    onOpenCustomFilter,
    onClose,
  } = props;

  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: anchor.bottom + 4, left: anchor.left });

  // Search query scoped to this open session; reset on every open.
  const [query, setQuery] = useState('');

  // Draft checkbox selection. `undefined` is the shorthand for "all selected"
  // and is also what the caller passes when no filter is active.
  const [draftSelected, setDraftSelected] = useState<Set<string> | undefined>(undefined);

  // Seed the draft state from the caller's `selectedValues` the moment the
  // menu opens, and clear the search box. Mid-session prop changes are
  // ignored on purpose so an external update doesn't blow away pending
  // user edits — hence the eslint disable.
  useEffect(() => {
    if (open) {
      setQuery('');
      setDraftSelected(selectedValues ? new Set(selectedValues) : undefined);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  // `selectedValues` is intentionally omitted; we only want to seed on open.

  // After layout, clamp the menu into the viewport. Runs as a layout effect
  // so the DOM is measured on the same frame it is positioned, avoiding a
  // one-frame flash at the initial anchor position.
  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    let top = anchor.bottom + 4;
    let left = anchor.left;
    const menu = menuRef.current;
    if (menu) {
      const rect = menu.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (left + rect.width > vw) left = vw - rect.width;
      if (top + rect.height > vh) top = vh - rect.height;
      if (left < 0) left = 0;
      if (top < 0) top = 0;
    }
    setPosition({ top, left });
  }, [open, anchor.bottom, anchor.left]);

  // Dismiss when the user presses a pointer outside the menu container.
  // We listen for `mousedown` rather than `click` so the dismissal fires
  // before any stray click handler on an underlying element.
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open, onClose]);

  // Escape dismisses the menu. Attached to `document` so the focused element
  // inside the menu (e.g. the search input) still triggers it.
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  // Checklist state derived from props + local draft.

  const allValues: string[] = distinctValues ? [...distinctValues] : [];

  // Values that match the current search query (case-insensitive substring).
  const visibleValues = query.trim() === ''
    ? allValues
    : allValues.filter((v) => v.toLowerCase().includes(query.toLowerCase()));

  // The search index emits an empty string for null/undefined cells. When
  // present, it is surfaced as the dedicated "(Blanks)" row above the rest.
  const hasBlanks = allValues.includes('');

  /** Returns whether a given distinct value is checked in the draft. */
  function isChecked(value: string): boolean {
    if (draftSelected === undefined) return true; // undefined encodes "all selected"
    return draftSelected.has(value);
  }

  // "(Select All)" is fully checked only when every currently-visible value
  // is checked. `someVisibleChecked` drives the indeterminate tri-state.
  const allVisibleChecked = visibleValues.length > 0 && visibleValues.every((v) => isChecked(v));
  const someVisibleChecked = visibleValues.some((v) => isChecked(v));

  /** Flip a single checkbox in the draft set. */
  function toggleValue(value: string) {
    setDraftSelected((prev) => {
      // Materialise the "all selected" shorthand before mutating.
      const base = prev === undefined ? new Set(allValues) : new Set(prev);
      if (base.has(value)) {
        base.delete(value);
      } else {
        base.add(value);
      }
      return base;
    });
  }

  /**
   * Check/uncheck every currently-visible row. When a search filter is
   * active this only affects matching rows; hidden rows retain their
   * previous checked state.
   */
  function toggleSelectAll() {
    if (allVisibleChecked) {
      // Currently all visible rows are on → turn them all off.
      setDraftSelected((prev) => {
        const base = prev === undefined ? new Set(allValues) : new Set(prev);
        visibleValues.forEach((v) => base.delete(v));
        return base;
      });
    } else {
      // At least one visible row is off → turn them all on.
      setDraftSelected((prev) => {
        const base = prev === undefined ? new Set(allValues) : new Set(prev);
        visibleValues.forEach((v) => base.add(v));
        return base;
      });
    }
  }

  /**
   * Commits the current draft to the caller via `onApplyValueFilter` and
   * closes the menu. A draft that contains every distinct value is
   * collapsed back to `undefined`, signalling that no filter is needed.
   * The caller is expected to translate a non-undefined set into a single
   * `{field, operator: 'in', value: [...set]}` descriptor.
   */
  function handleOk() {
    if (draftSelected === undefined) {
      onApplyValueFilter(undefined);
    } else {
      // When every distinct value ended up checked, report "all selected"
      // instead of an equivalent in-set — downstream uses this to clear
      // the predicate entirely for this field.
      const allSelected = allValues.every((v) => draftSelected.has(v));
      onApplyValueFilter(allSelected ? undefined : new Set(draftSelected));
    }
    onClose();
  }

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      data-testid="column-filter-menu"
      data-field={field}
      style={styles.container(position.top, position.left)}
    >
      {/* Section 1: sort rows. Clicking either sort row fires the sort
          callback and then closes the menu (matches Excel 365 behaviour). */}
      <MenuItem
        testId="column-filter-sort-asc"
        icon="↑"
        onClick={() => { onSortAsc(); onClose(); }}
      >
        {sortLabel('asc', dataType)}
      </MenuItem>
      <MenuItem
        testId="column-filter-sort-desc"
        icon="↓"
        onClick={() => { onSortDesc(); onClose(); }}
      >
        {sortLabel('desc', dataType)}
      </MenuItem>
      <MenuItem
        testId="column-filter-sort-by-color"
        disabled
        hasCaret
      >
        Sort by Color
      </MenuItem>

      <div role="separator" style={styles.divider} />

      {/* Section 2: filter rows. Clear-filter is inert unless this column
          has an active predicate; the caller is responsible for removing
          only this field's predicate and preserving the rest. */}
      <MenuItem
        testId="column-filter-clear"
        disabled={!hasActiveFilter}
        onClick={() => { onClearFilter(); onClose(); }}
      >
        {`Clear Filter from "${title}"`}
      </MenuItem>
      <MenuItem
        testId="column-filter-by-color"
        disabled
        hasCaret
      >
        Filter by Color
      </MenuItem>
      <MenuItem
        testId="column-filter-conditions"
        hasCaret
        onClick={() => { onOpenCustomFilter(); onClose(); }}
      >
        {conditionsLabel(dataType)}
      </MenuItem>

      <div role="separator" style={styles.divider} />

      {/* Section 3: search input. Narrows the checklist below in real time
          via case-insensitive substring match. Scoped to this open session. */}
      <input
        type="text"
        data-testid="column-filter-search"
        placeholder="Search"
        value={query}
        style={styles.searchInput}
        onChange={(e) => setQuery(e.target.value)}
      />

      {/* Section 4: distinct-values checklist. When `distinctValues` is
          undefined the search index is still being built — show a
          placeholder rather than an empty list. */}
      {distinctValues === undefined ? (
        <div style={{ padding: '6px 12px', color: 'var(--dg-disabled-color, #a0a0a0)' }}>
          Indexing…
        </div>
      ) : (
        <div role="listbox" data-testid="column-filter-values" style={styles.valueList}>
          {/* (Select All) — tri-state checkbox. Checked when every visible
              value is on, indeterminate when some are on, unchecked when
              none are. */}
          <label style={styles.checkboxRow} data-testid="column-filter-value-select-all">
            <input
              type="checkbox"
              checked={allVisibleChecked}
              ref={(el) => {
                // The `indeterminate` flag must be set via the DOM ref;
                // React does not expose it as a JSX attribute.
                if (el) el.indeterminate = !allVisibleChecked && someVisibleChecked;
              }}
              onChange={toggleSelectAll}
            />
            (Select All)
          </label>

          {/* (Blanks) — only rendered when the distinct-values set contains
              the empty-string sentinel (null/undefined cells from the
              search index). Matches Excel 365 wording. */}
          {hasBlanks && (
            <label style={styles.checkboxRow} data-testid="column-filter-value-blanks">
              <input
                type="checkbox"
                checked={isChecked('')}
                onChange={() => toggleValue('')}
              />
              (Blanks)
            </label>
          )}

          {/* One row per non-empty visible value. The empty-string row is
              already rendered above as "(Blanks)" and is filtered out here. */}
          {visibleValues
            .filter((v) => v !== '')
            .map((value) => (
              <label key={value} style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={isChecked(value)}
                  onChange={() => toggleValue(value)}
                />
                {value}
              </label>
            ))}
        </div>
      )}

      {/* Footer: OK commits the draft, Cancel discards it. Both close. */}
      <div style={styles.footerRow}>
        <button
          data-testid="column-filter-cancel"
          style={styles.button(false)}
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          data-testid="column-filter-ok"
          style={styles.button(true)}
          onClick={handleOk}
        >
          OK
        </button>
      </div>
    </div>,
    document.body,
  );
}
