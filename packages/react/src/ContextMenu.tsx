/**
 * Context-menu overlay for the datagrid.
 *
 * Renders a floating menu triggered by right-click on rows or column headers.
 * Supports nested sub-menus (via `children` on menu items), keyboard dismiss
 * (Escape), outside-click dismiss, and viewport-boundary repositioning so the
 * menu never overflows the screen.
 *
 * @module ContextMenu
 */
import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ContextMenuItemDef } from '@istracked/datagrid-core';
import * as styles from './ContextMenu.styles';

/**
 * SSR-safe `useLayoutEffect`: falls back to `useEffect` when `window` is
 * undefined so server renders don't emit the React layout-effect warning.
 */
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Describes the open/closed state and screen position of a context menu,
 * along with the grid cell coordinates (row and field) that triggered it.
 */
export interface ContextMenuState {
  /** Whether the menu is currently visible. */
  open: boolean;
  /** Horizontal screen coordinate (px) where the menu was triggered. */
  x: number;
  /** Vertical screen coordinate (px) where the menu was triggered. */
  y: number;
  /** Row ID of the cell that was right-clicked, or `null` for header context menus. */
  rowId: string | null;
  /** Column field of the cell that was right-clicked, or `null` if not column-specific. */
  field: string | null;
}

/**
 * Default closed state for a context menu, used as the reset value after
 * the menu is dismissed.
 */
export const initialContextMenuState: ContextMenuState = {
  open: false,
  x: 0,
  y: 0,
  rowId: null,
  field: null,
};

/**
 * Props for the {@link ContextMenu} component.
 */
export interface ContextMenuProps {
  /** Current open/closed state and trigger coordinates. */
  state: ContextMenuState;
  /** Flat list of menu-item definitions to render. */
  items: ContextMenuItemDef[];
  /** Callback invoked when the menu should close (outside click, Escape, or item action). */
  onClose: () => void;
}

/**
 * Renders the top-level context menu as a fixed-position overlay.
 *
 * On each open, the component measures its own bounding rect against the
 * viewport and shifts the position so the menu stays fully visible. Registers
 * document-level listeners for outside clicks and the Escape key to dismiss.
 *
 * @param props - Menu state, item definitions, and close callback.
 * @returns The menu element, or `null` when closed.
 */
export function ContextMenu({ state, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: state.x, y: state.y });

  // Reposition the menu so it stays within the viewport boundaries.
  //
  // Runs in a layout effect (synchronously before paint) so the menu never
  // flashes at stale coordinates. We always re-seed `position` from the
  // current `state.x/state.y` before clamping — this guarantees that on every
  // open the menu starts at the triggering cursor coordinates, even if the
  // initial `useState` seed captured the default (0, 0).
  useIsomorphicLayoutEffect(() => {
    if (!state.open) return;

    let x = state.x;
    let y = state.y;

    const menu = menuRef.current;
    if (menu) {
      const rect = menu.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (x + rect.width > vw) {
        x = vw - rect.width;
      }
      if (y + rect.height > vh) {
        y = vh - rect.height;
      }
      if (x < 0) x = 0;
      if (y < 0) y = 0;
    }

    setPosition({ x, y });
  }, [state.open, state.x, state.y]);

  // Close on outside click
  useEffect(() => {
    if (!state.open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [state.open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!state.open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.open, onClose]);

  if (!state.open) return null;

  const ctx = { rowId: state.rowId, field: state.field };

  // Render into document.body so ancestor CSS `transform`/`filter`/`perspective`
  // (e.g. virtualized grid containers) can't hijack our `position: fixed` —
  // without the portal, a transformed ancestor becomes the containing block
  // and `top/left` are measured from the ancestor's origin instead of the
  // viewport, causing the menu to jump to the far-left of the window.
  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      data-testid="context-menu"
      style={styles.menu(position.x, position.y)}
    >
      {items.map((item) => (
        <ContextMenuEntry
          key={item.key}
          item={item}
          ctx={ctx}
          onClose={onClose}
        />
      ))}
    </div>,
    document.body,
  );
}

/** Props for an individual context-menu row (used internally by {@link ContextMenu}). */
interface ContextMenuEntryProps {
  /** The menu-item definition to render. */
  item: ContextMenuItemDef;
  /** Cell context (row and field) from the triggering right-click. */
  ctx: { rowId: string | null; field: string | null };
  /** Callback to close the entire menu tree after an action fires. */
  onClose: () => void;
}

/**
 * Renders a single context-menu entry, including optional icon, label, keyboard
 * shortcut hint, danger styling, divider, and a nested sub-menu that opens on hover.
 *
 * Visibility and disabled state can be static booleans or functions evaluated
 * against the cell context, enabling dynamic menu composition.
 */
function ContextMenuEntry({ item, ctx, onClose }: ContextMenuEntryProps) {
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const entryRef = useRef<HTMLDivElement>(null);
  // Debounce timer to prevent sub-menu flicker on rapid mouse-leave/enter
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Evaluate visibility: function or static boolean
  const isVisible = typeof item.visible === 'function'
    ? item.visible(ctx)
    : item.visible !== false;

  // Evaluate disabled state: function or static boolean
  const isDisabled = typeof item.disabled === 'function'
    ? item.disabled(ctx)
    : item.disabled === true;

  const hasChildren = item.children && item.children.length > 0;

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    if (hasChildren) {
      setSubmenuOpen(true);
    }
  }, [hasChildren]);

  const handleMouseLeave = useCallback(() => {
    if (hasChildren) {
      hoverTimeout.current = setTimeout(() => setSubmenuOpen(false), 150);
    }
  }, [hasChildren]);

  if (!isVisible) return null;

  return (
    <>
      <div
        ref={entryRef}
        role="menuitem"
        aria-disabled={isDisabled || undefined}
        data-testid={`context-menu-item-${item.key}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => {
          if (isDisabled) return;
          if (hasChildren) return; // submenu items don't fire onClick directly
          item.onClick(ctx);
          onClose();
        }}
        style={styles.menuItem(isDisabled, !!item.danger)}
      >
        {item.icon && (
          <span
            data-testid={`context-menu-icon-${item.key}`}
            style={styles.icon}
          >
            {item.icon}
          </span>
        )}
        <span style={styles.label}>{item.label}</span>
        {item.shortcut && (
          <span
            data-testid={`context-menu-shortcut-${item.key}`}
            style={styles.shortcut}
          >
            {item.shortcut}
          </span>
        )}
        {hasChildren && (
          <span style={styles.submenuArrow}>&#9654;</span>
        )}
      </div>
      {item.dividerAfter && (
        <div
          data-testid="context-menu-separator"
          style={styles.divider}
          role="separator"
        />
      )}
      {hasChildren && submenuOpen && (
        <div
          role="menu"
          data-testid={`context-menu-submenu-${item.key}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={styles.submenu}
        >
          {item.children!.map((child) => (
            <ContextMenuEntry
              key={child.key}
              item={child}
              ctx={ctx}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </>
  );
}
