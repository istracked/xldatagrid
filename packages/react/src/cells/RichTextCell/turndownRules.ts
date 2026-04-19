/**
 * Custom turndown rules used by {@link htmlToMarkdown}.
 *
 * Extracted into a dedicated module so the conversion pipeline file can focus
 * on sanitisation + orchestration, and so individual rules remain easy to
 * unit-test or tweak without rereading the full service setup. Every rule in
 * here is registered at module scope exactly once — see `htmlToMarkdown.ts`.
 *
 * @module turndownRules
 */

import type TurndownService from 'turndown';

/**
 * Tighten the default `listItem` rule so the bullet marker is followed by a
 * single space (`- item`) rather than turndown's default of three spaces
 * (`-   item`). The extra padding is valid Markdown but breaks pixel-level
 * parity with the legacy regex helper's output and reads poorly in cell
 * displays. Indentation for nested items still uses the prefix length, so
 * children correctly indent by two spaces under the parent.
 */
export function registerCompactListItem(service: TurndownService): void {
  service.addRule('compactListItem', {
    filter: 'li',
    replacement: (content, node): string => {
      const parent = node.parentNode as HTMLElement | null;
      let prefix: string;
      if (parent?.nodeName === 'OL') {
        const start = parent.getAttribute('start');
        const index = Array.prototype.indexOf.call(parent.children, node);
        const n = start ? Number(start) + index : index + 1;
        prefix = `${n}. `;
      } else {
        prefix = '- ';
      }
      // Trim turndown's wrapping newlines so the prefix sits flush on its line.
      let body = content.replace(/^\n+|\n+$/g, '');
      // Re-indent any interior newlines by the prefix width so continuation
      // content lines up under the first bullet character.
      body = body.replace(/\n/gm, `\n${' '.repeat(prefix.length)}`);
      return prefix + body + (node.nextSibling ? '\n' : '');
    },
  });
}

/**
 * GFM-style double-tilde strikethrough. `turndown-plugin-gfm` ships a single-
 * tilde rule (`~x~`); GitHub and most Markdown parsers actually want `~~x~~`.
 * Overriding here preserves the legacy helper's output shape.
 */
export function registerStrikethroughDouble(service: TurndownService): void {
  service.addRule('strikethroughDouble', {
    // `<strike>` is absent from the modern `HTMLElementTagNameMap`, so we
    // filter by nodeName rather than relying on turndown's typed TagName alias.
    filter: (node): boolean =>
      node.nodeName === 'DEL' ||
      node.nodeName === 'S' ||
      node.nodeName === 'STRIKE',
    replacement: (content): string => `~~${content}~~`,
  });
}

/**
 * Markdown has no native underline. Map `<u>` to italic, matching the legacy
 * helper's behaviour so downstream renderers (react-markdown + remark-gfm)
 * produce the same emphasis style.
 */
export function registerUnderlineAsItalic(service: TurndownService): void {
  service.addRule('underlineAsItalic', {
    filter: 'u',
    replacement: (content): string => `*${content}*`,
  });
}

/**
 * Language-hinted fenced code block. Reads the `language-xxx` class off the
 * inner `<code>` element and emits it as the fence info string, so a snippet
 * like `<pre><code class="language-js">…</code></pre>` round-trips to
 * ```js … ``` rather than an un-tagged fence.
 *
 * Kept explicit (rather than relying on turndown's built-in
 * `fencedCodeBlock` rule) so test snapshots pin the shape and a future
 * turndown release cannot silently change the fence output.
 */
export function registerFencedCodeWithLang(service: TurndownService): void {
  service.addRule('fencedCodeWithLang', {
    filter: (node): boolean => {
      if (node.nodeName !== 'PRE') return false;
      const code = (node as HTMLElement).firstChild as HTMLElement | null;
      return !!code && code.nodeName === 'CODE';
    },
    replacement: (_content, node): string => {
      const code = (node as HTMLElement).firstChild as HTMLElement;
      const className = code.getAttribute('class') ?? '';
      const match = className.match(/language-(\S+)/);
      const lang = match?.[1] ?? '';
      const text = code.textContent ?? '';
      return `\n\n\`\`\`${lang}\n${text}\n\`\`\`\n\n`;
    },
  });
}

/**
 * Register every custom rule this module exposes on the given service.
 * Convenience wrapper used by {@link htmlToMarkdown} so the setup site stays
 * a single line.
 */
export function registerCustomRules(service: TurndownService): void {
  registerFencedCodeWithLang(service);
  registerCompactListItem(service);
  registerStrikethroughDouble(service);
  registerUnderlineAsItalic(service);
}
