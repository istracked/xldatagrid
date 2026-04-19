/**
 * Best-effort HTML-to-GFM-Markdown converter for migrating legacy cell values.
 *
 * The previous {@link RichTextCell} stored raw HTML. The editor now speaks
 * GitHub-Flavored Markdown, so existing values must be converted at the data
 * layer. This helper is intentionally lightweight — it handles the common
 * inline/block tags that the HTML editor produced (`<b>`, `<strong>`, `<i>`,
 * `<em>`, `<u>`, `<s>`, `<p>`, `<br>`, `<a>`, `<code>`, `<pre>`, headings,
 * lists). Anything outside this set is stripped rather than escaped, keeping
 * the output readable.
 *
 * Consumers with richer HTML (tables, nested formatting, custom tags) should
 * pre-convert with a full parser such as `turndown` before migrating.
 *
 * @module htmlToMarkdown
 */

/**
 * Converts a legacy HTML rich-text string to GitHub-Flavored Markdown.
 *
 * Intended for one-time data migration when upgrading consumers from the
 * HTML-backed editor to the markdown-backed editor. The conversion is
 * heuristic and best-effort; unknown tags are stripped. Entities (`&amp;`,
 * `&lt;`, `&gt;`, `&quot;`, `&#39;`, `&nbsp;`) are decoded.
 *
 * @param html - The legacy HTML source.
 * @returns A GFM markdown string; empty string when input is nullish or blank.
 *
 * @example
 * ```ts
 * htmlToMarkdown('<b>Hello</b> <em>world</em>'); // "**Hello** *world*"
 * htmlToMarkdown('<a href="https://x.y">link</a>'); // "[link](https://x.y)"
 * ```
 */
/**
 * URL schemes considered safe for anchor hrefs. An empty string covers
 * relative URLs (no scheme at all).
 */
const SAFE_URL_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:', '']);

/**
 * Normalise a raw href string and return its lowercase scheme (e.g. "http:").
 * Handles HTML-entity and percent-encoded colons so that obfuscations like
 * `javascript&#x3a;` or `javascript%3a` are caught.
 */
function extractScheme(href: string): string {
  // Decode percent-encoded colon (%3a / %3A) and HTML entity colon (&#x3a; &#58;)
  const decoded = href
    .replace(/%3a/gi, ':')
    .replace(/&#x3a;/gi, ':')
    .replace(/&#58;/gi, ':')
    .trim()
    .toLowerCase();
  const colonIdx = decoded.indexOf(':');
  if (colonIdx === -1) return '';
  // A scheme contains only letters, digits, +, -, .
  const candidate = decoded.slice(0, colonIdx);
  if (/^[a-z][a-z0-9+\-.]*$/.test(candidate)) return `${candidate}:`;
  return '';
}

export function htmlToMarkdown(html: string | null | undefined): string {
  if (html == null) return '';
  let out = String(html);
  if (!out.trim()) return '';

  // ── Pass 1: remove HTML comments BEFORE script/style so comment-wrapped
  //    scripts (<!-- <script>x</script> -->) cannot survive. ─────────────────
  out = out.replace(/<!--[\s\S]*?-->/g, '');

  // Strip <script> and <style> blocks entirely for safety.
  out = out.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  out = out.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // ── Pass 2: strip inline event-handler attributes from ALL tags. ──────────
  // Handles both quoted (on*="…") and unquoted (on*=value) forms.
  out = out.replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');

  // Normalize <br> to a newline.
  out = out.replace(/<br\s*\/?>/gi, '\n');

  // Headings — map <h1>-<h6> to `#` ... `######`.
  for (let level = 1; level <= 6; level += 1) {
    const prefix = '#'.repeat(level);
    const re = new RegExp(`<h${level}[^>]*>([\\s\\S]*?)<\\/h${level}>`, 'gi');
    out = out.replace(re, (_m, inner: string) => `\n\n${prefix} ${inner.trim()}\n\n`);
  }

  // Paragraphs → double newline boundaries.
  out = out.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, inner: string) => `\n\n${inner.trim()}\n\n`);

  // Inline code before <pre> so `<pre><code>` becomes a fence.
  out = out.replace(
    /<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (_m, inner: string) => `\n\n\`\`\`\n${inner}\n\`\`\`\n\n`,
  );
  out = out.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_m, inner: string) => `\n\n\`\`\`\n${inner}\n\`\`\`\n\n`);
  out = out.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_m, inner: string) => `\`${inner}\``);

  // Strong / bold.
  out = out.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _tag, inner: string) => `**${inner}**`);
  // Emphasis / italic.
  out = out.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _tag, inner: string) => `*${inner}*`);
  // Strikethrough.
  out = out.replace(/<(s|del|strike)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _tag, inner: string) => `~~${inner}~~`);
  // Underline → italic (markdown has no native underline; italic is the conventional fallback).
  out = out.replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, (_m, inner: string) => `*${inner}*`);

  // Links — preserve href only when the scheme is safe.
  out = out.replace(
    /<a\b[^>]*?href\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_m, href: string, text: string) => {
      const scheme = extractScheme(href);
      const safeHref = SAFE_URL_SCHEMES.has(scheme) ? href : '#';
      return `[${text.trim() || safeHref}](${safeHref})`;
    },
  );

  // Lists — ordered and unordered. Flatten nested lists lossily (prefix stays the same).
  out = out.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_m, inner: string) => {
    const items = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map(
      (match) => `- ${(match[1] ?? '').trim()}`,
    );
    return `\n\n${items.join('\n')}\n\n`;
  });
  out = out.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_m, inner: string) => {
    const items = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map(
      (match, i) => `${i + 1}. ${(match[1] ?? '').trim()}`,
    );
    return `\n\n${items.join('\n')}\n\n`;
  });

  // Drop every remaining tag — leftover attributes or unknown elements.
  out = out.replace(/<\/?[a-zA-Z][^>]*>/g, '');

  // Decode the handful of entities the HTML editor produced.
  out = out
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // Collapse excessive whitespace runs and trim surrounding blank lines.
  out = out.replace(/\n{3,}/g, '\n\n').trim();

  return out;
}
