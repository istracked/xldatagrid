/**
 * Provides the {@link EmptyState} slot component for displaying placeholder content
 * when a datagrid has no data to render. This module is part of the datagrid's slot
 * system, allowing consumers to customize the empty-data experience.
 *
 * @packageDocumentation
 */
import React from 'react';
import * as styles from './EmptyState.styles';

/**
 * Configuration props for the {@link EmptyState} component.
 */
export interface EmptyStateProps {
  /**
   * Optional custom content to render inside the empty state container.
   * When provided, this takes precedence over the {@link EmptyStateProps.message | message} prop.
   */
  children?: React.ReactNode;

  /**
   * A plain-text message displayed when no {@link EmptyStateProps.children | children} are provided.
   *
   * @defaultValue `'No data'`
   */
  message?: string;

  /**
   * Additional CSS class name(s) appended to the root element.
   * The base class `dg-empty-state` is always applied.
   */
  className?: string;

  /**
   * Inline style overrides merged onto the default flex-centered layout styles.
   */
  style?: React.CSSProperties;
}

/**
 * Renders a centered placeholder within the datagrid viewport when there are no rows
 * to display. Consumers can supply arbitrary {@link EmptyStateProps.children | children}
 * for fully custom content, or rely on the simple {@link EmptyStateProps.message | message}
 * string which defaults to `"No data"`.
 *
 * The component uses a vertical flex layout to center its content both horizontally
 * and vertically, and respects CSS custom properties (`--dg-text-color`) for theming.
 *
 * @param props - The component properties.
 * @returns A React element representing the empty state container.
 *
 * @example
 * ```tsx
 * // Simple usage with the default message
 * <EmptyState />
 *
 * // Custom message
 * <EmptyState message="Nothing to show" />
 *
 * // Fully custom content
 * <EmptyState>
 *   <img src="/empty.svg" alt="" />
 *   <p>No results match your filters</p>
 * </EmptyState>
 * ```
 */
export function EmptyState({ children, message = 'No data', className, style }: EmptyStateProps) {
  return (
    <div
      className={`dg-empty-state${className ? ` ${className}` : ''}`}
      style={{ ...styles.emptyState, ...style }}
    >
      {/* Render custom children if provided; otherwise fall back to the message string */}
      {children ?? <span>{message}</span>}
    </div>
  );
}
