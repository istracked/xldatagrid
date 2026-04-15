/**
 * Provides the {@link StatusBar} slot component, a footer strip that displays
 * contextual information such as row counts, selection summaries, or custom
 * indicators below the datagrid body. This module is part of the datagrid's
 * slot system for composable UI chrome.
 *
 * @packageDocumentation
 */
import React from 'react';
import * as styles from './StatusBar.styles';

/**
 * Configuration props for the {@link StatusBar} component.
 */
export interface StatusBarProps {
  /**
   * Arbitrary content rendered inside the status bar.
   * Typically contains text spans, badges, or small widgets.
   */
  children?: React.ReactNode;

  /**
   * Additional CSS class name(s) appended to the root element.
   * The base class `dg-status-bar` is always applied.
   */
  className?: string;

  /**
   * Inline style overrides merged onto the default bar layout styles.
   */
  style?: React.CSSProperties;
}

/**
 * Renders a thin horizontal bar at the bottom of the datagrid, intended for
 * status information (e.g., row counts, aggregation results, selection metadata).
 *
 * The bar uses a flex row with `space-between` justification so that left-aligned
 * and right-aligned content can coexist naturally. It carries `role="status"` for
 * accessibility, informing screen readers that its content is a live status region.
 * Theming is driven by CSS custom properties (`--dg-border-color`, `--dg-header-bg`).
 *
 * @param props - The component properties.
 * @returns A React element representing the status bar.
 *
 * @example
 * ```tsx
 * <StatusBar>
 *   <span>Rows: 1,024</span>
 *   <span>Selected: 3</span>
 * </StatusBar>
 * ```
 */
export function StatusBar({ children, className, style }: StatusBarProps) {
  return (
    <div
      className={`dg-status-bar${className ? ` ${className}` : ''}`}
      style={{ ...styles.statusBar, ...style }}
      role="status"
    >
      {children}
    </div>
  );
}
