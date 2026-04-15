/**
 * Provides the {@link Toolbar} slot component, a horizontal action bar rendered
 * above the datagrid for hosting buttons, dropdowns, search inputs, and other
 * interactive controls. This module is part of the datagrid's slot system for
 * composable UI chrome.
 *
 * @packageDocumentation
 */
import React from 'react';
import * as styles from './Toolbar.styles';

/**
 * Configuration props for the {@link Toolbar} component.
 */
export interface ToolbarProps {
  /**
   * Toolbar action items rendered inside the bar (buttons, menus, etc.).
   */
  children?: React.ReactNode;

  /**
   * Additional CSS class name(s) appended to the root element.
   * The base class `dg-toolbar` is always applied.
   */
  className?: string;

  /**
   * Inline style overrides merged onto the default bar layout styles.
   */
  style?: React.CSSProperties;
}

/**
 * Renders a horizontal toolbar strip above the datagrid body. Children are laid
 * out in a flex row with a gap between items, making it straightforward to
 * compose action buttons, search fields, and dropdown menus.
 *
 * The component carries `role="toolbar"` for accessibility, allowing assistive
 * technology to recognise the region as a collection of related controls.
 * Theming respects CSS custom properties (`--dg-border-color`, `--dg-header-bg`).
 *
 * @param props - The component properties.
 * @returns A React element representing the toolbar.
 *
 * @example
 * ```tsx
 * <Toolbar>
 *   <button onClick={onAdd}>Add Row</button>
 *   <button onClick={onDelete}>Delete</button>
 *   <input type="search" placeholder="Search..." />
 * </Toolbar>
 * ```
 */
export function Toolbar({ children, className, style }: ToolbarProps) {
  return (
    <div
      className={`dg-toolbar${className ? ` ${className}` : ''}`}
      style={{ ...styles.toolbar, ...style }}
      role="toolbar"
    >
      {children}
    </div>
  );
}
