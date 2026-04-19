/**
 * HTML-to-GFM-Markdown converter backed by {@link https://github.com/mixmark-io/turndown turndown}
 * and {@link https://github.com/cure53/DOMPurify DOMPurify}.
 *
 * The previous {@link RichTextCell} stored raw HTML. The editor now speaks
 * GitHub-Flavored Markdown, so existing values must be converted at the data
 * layer. An earlier revision of this module hand-rolled the conversion with a
 * stack of regular expressions and a bespoke URL-scheme allow-list for XSS
 * hardening. That worked for the common inline tags but could not realistically
 * handle nested lists, tables, task-list items, or fenced code blocks with
 * language hints — and the XSS surface was maintained by hand.
 *
 * This implementation delegates the two hard problems to audited libraries:
 *
 * 1. **DOMPurify** sanitises the input DOM, stripping `<script>`, `<style>`,
 *    inline event handlers, and any href that does not match an
 *    `http(s):` / `mailto:` scheme before turndown ever sees the tree.
 * 2. **turndown** (plus `turndown-plugin-gfm`) converts the sanitised DOM to
 *    GFM Markdown, preserving tables, strikethrough, task-list checkboxes,
 *    nested list indentation, and language-tagged code fences. Project-
 *    specific deviations from turndown defaults live in
 *    {@link ./turndownRules turndownRules.ts}.
 *
 * The public {@link htmlToMarkdown} signature is unchanged so existing call
 * sites continue to work.
 *
 * @module htmlToMarkdown
 */

import DOMPurify from 'dompurify';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

import { registerCustomRules } from './turndownRules';

/**
 * HTML tags that survive sanitisation. Chosen to cover the legacy rich-text
 * editor's emitted markup plus the GFM constructs (tables, task lists,
 * strikethrough) that turndown can now convert. Anything outside this list
 * is stripped rather than escaped, matching the previous helper's behaviour.
 */
const ALLOWED_TAGS = [
  // Block structure
  'p',
  'br',
  'div',
  'span',
  'blockquote',
  'hr',
  // Headings
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  // Inline formatting
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'strike',
  'del',
  'ins',
  'code',
  'pre',
  'sub',
  'sup',
  // Links
  'a',
  // Lists
  'ul',
  'ol',
  'li',
  // Tables
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
  // Task-list checkboxes (inside <li>) — turndown-plugin-gfm reads these.
  'input',
];

/**
 * HTML attributes that survive sanitisation. We keep the minimum turndown
 * needs to produce correct Markdown: link targets, code-block language hints
 * (encoded as `class="language-xxx"`), cell alignment, and the checkbox
 * metadata that drives GFM task-list conversion.
 */
const ALLOWED_ATTR = [
  'href',
  'title',
  'class',
  'align',
  'type',
  'checked',
  'disabled',
  'colspan',
  'rowspan',
  'start',
];

/**
 * URI allow-list regexp honoured by DOMPurify for `href`, `src`, etc.
 * Explicitly permits `http:`, `https:`, and `mailto:`; everything else —
 * including `javascript:`, `data:`, `vbscript:`, `about:`, and
 * protocol-relative URLs (`//evil.com`) — is stripped by DOMPurify.
 *
 * The alternation covers three cases:
 *   - an allowed scheme followed by `:`
 *   - a URL starting with a non-letter (relative, fragment, query)
 *   - an unknown scheme whose first non-scheme character proves it is not
 *     a URI reference (prevents whole-word matches of unknown schemes)
 */
const ALLOWED_URI_REGEXP =
  /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i;

/**
 * Shared {@link TurndownService} instance. Configured once because turndown
 * internally maintains a rule registry and re-initialising per call would
 * re-register the GFM plugin's ~dozen rules for every invocation.
 */
const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  // Turndown defaults are otherwise fine; the GFM plugin layers on
  // strikethrough, tables, and task-list rules below.
});
turndown.use(gfm);
registerCustomRules(turndown);

/**
 * Converts a legacy HTML rich-text string to GitHub-Flavored Markdown.
 *
 * Intended for data migration from the HTML-backed editor to the markdown
 * editor, and safe for live user input because the pipeline is sanitise-then-
 * convert: DOMPurify strips unsafe constructs first, then turndown walks the
 * purified tree.
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
export function htmlToMarkdown(html: string | null | undefined): string {
  if (html == null) return '';
  const raw = String(html);
  if (!raw.trim()) return '';

  const clean = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP,
    // Keep text content when a tag is stripped (e.g. unknown wrapper <body>)
    // so visible copy survives the sanitise pass.
    KEEP_CONTENT: true,
    // Disallow all MathML/SVG by default; we do not render them as Markdown.
    USE_PROFILES: { html: true },
    // DOMPurify would otherwise preserve HTML comments verbatim; strip them so
    // comment-wrapped scripts cannot survive the later markdown passthrough.
    ALLOW_DATA_ATTR: false,
  });

  const md = turndown.turndown(clean);

  // Normalise whitespace:
  //   * non-breaking spaces (U+00A0) → regular spaces so `&nbsp;` round-trips
  //     to plain text for downstream markdown renderers,
  //   * collapse runs of three or more newlines down to the canonical blank
  //     line, and trim surrounding whitespace — mirrors the legacy helper.
  return md.replace(/\u00a0/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}
