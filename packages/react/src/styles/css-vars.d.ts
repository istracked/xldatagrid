/**
 * CSS custom-property augmentation for `React.CSSProperties`.
 *
 * The grid's theme resolution (`resolveThemeStyle`) returns a flat map of
 * `--dg-*` custom properties that callers spread onto a React element's
 * `style` prop. `csstype.Properties` (the base of `React.CSSProperties`) is
 * closed by design and does not include an index signature for CSS custom
 * properties, which previously forced `as unknown as React.CSSProperties`
 * double-assertions inside {@link ../DataGrid.resolveThemeStyle}.
 *
 * This module augments the CSS property set with the standard CSS-variable
 * key pattern (`--<ident>`) so token maps typed as
 * `Record<`--${string}`, string>` flow into `React.CSSProperties` positions
 * without any `as unknown` hop. Standard CSS property keys retain their
 * closed typing — only CSS-custom-property keys are opened.
 *
 * This file is ambient; it is picked up by every compilation that includes
 * `packages/react/src/**`.
 */
import 'csstype';

declare module 'csstype' {
  interface Properties {
    // Index signature restricted to CSS custom-property names. This is the
    // same shape widely used in the React ecosystem to allow `--foo` keys
    // on `style={{ '--foo': 'bar' }}` without weakening the rest of the
    // property set.
    [cssVariable: `--${string}`]: string | number | undefined;
  }
}
