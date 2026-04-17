import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as styles from './DataGridColumnFilterMenu.styles';

// Why: mirrors ContextMenu.tsx — avoids React layout-effect warning in SSR.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

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

function sortLabel(dir: 'asc' | 'desc', dataType?: 'text' | 'number' | 'date'): string {
  if (dataType === 'number') return dir === 'asc' ? 'Sort Smallest to Largest' : 'Sort Largest to Smallest';
  if (dataType === 'date') return dir === 'asc' ? 'Sort Oldest to Newest' : 'Sort Newest to Oldest';
  return dir === 'asc' ? 'Sort A to Z' : 'Sort Z to A';
}

function conditionsLabel(dataType?: 'text' | 'number' | 'date'): string {
  if (dataType === 'number') return 'Number Filters';
  if (dataType === 'date') return 'Date Filters';
  return 'Text Filters';
}

/** A single hoverable menu row. */
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

  // Search query local to this open session.
  const [query, setQuery] = useState('');

  // Draft selection — seeded from selectedValues when menu opens; undefined means "all".
  const [draftSelected, setDraftSelected] = useState<Set<string> | undefined>(undefined);

  // Seed draft state when menu opens and reset search.
  // Why: useEffect is correct here — we respond to the open flag changing.
  useEffect(() => {
    if (open) {
      setQuery('');
      setDraftSelected(selectedValues ? new Set(selectedValues) : undefined);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  // Why: intentionally omit selectedValues — we only want the seed on open, not on every prop change.

  // Clamp position so menu stays in viewport.
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

  // Close on outside click.
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

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  // --- checklist logic ---

  const allValues: string[] = distinctValues ? [...distinctValues] : [];

  // Values that match the current search query.
  const visibleValues = query.trim() === ''
    ? allValues
    : allValues.filter((v) => v.toLowerCase().includes(query.toLowerCase()));

  const hasBlanks = allValues.includes('');

  // Whether a given value is checked in the current draft.
  function isChecked(value: string): boolean {
    if (draftSelected === undefined) return true; // "all selected"
    return draftSelected.has(value);
  }

  // Whether "(Select All)" is checked: true only if every visible value is checked.
  const allVisibleChecked = visibleValues.length > 0 && visibleValues.every((v) => isChecked(v));
  const someVisibleChecked = visibleValues.some((v) => isChecked(v));

  function toggleValue(value: string) {
    setDraftSelected((prev) => {
      const base = prev === undefined ? new Set(allValues) : new Set(prev);
      if (base.has(value)) {
        base.delete(value);
      } else {
        base.add(value);
      }
      return base;
    });
  }

  function toggleSelectAll() {
    if (allVisibleChecked) {
      // Uncheck all visible rows.
      setDraftSelected((prev) => {
        const base = prev === undefined ? new Set(allValues) : new Set(prev);
        visibleValues.forEach((v) => base.delete(v));
        return base;
      });
    } else {
      // Check all visible rows.
      setDraftSelected((prev) => {
        const base = prev === undefined ? new Set(allValues) : new Set(prev);
        visibleValues.forEach((v) => base.add(v));
        return base;
      });
    }
  }

  function handleOk() {
    if (draftSelected === undefined) {
      onApplyValueFilter(undefined);
    } else {
      // If the draft contains every value, treat it as "all selected" → clear filter.
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
      {/* Sort rows */}
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

      {/* Filter rows */}
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

      {/* Search input */}
      <input
        type="text"
        data-testid="column-filter-search"
        placeholder="Search"
        value={query}
        style={styles.searchInput}
        onChange={(e) => setQuery(e.target.value)}
      />

      {/* Value checklist */}
      {distinctValues === undefined ? (
        <div style={{ padding: '6px 12px', color: 'var(--dg-disabled-color, #a0a0a0)' }}>
          Indexing…
        </div>
      ) : (
        <div role="listbox" data-testid="column-filter-values" style={styles.valueList}>
          {/* (Select All) row */}
          <label style={styles.checkboxRow} data-testid="column-filter-value-select-all">
            <input
              type="checkbox"
              checked={allVisibleChecked}
              ref={(el) => {
                if (el) el.indeterminate = !allVisibleChecked && someVisibleChecked;
              }}
              onChange={toggleSelectAll}
            />
            (Select All)
          </label>

          {/* (Blanks) row — only when empty string is among distinct values */}
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

          {/* One row per non-empty visible value */}
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

      {/* OK / Cancel */}
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
