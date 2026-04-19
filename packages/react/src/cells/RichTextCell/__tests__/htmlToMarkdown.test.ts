import { htmlToMarkdown } from '../htmlToMarkdown';

describe('htmlToMarkdown', () => {
  it('returns empty string for nullish and blank inputs', () => {
    expect(htmlToMarkdown(null)).toBe('');
    expect(htmlToMarkdown(undefined)).toBe('');
    expect(htmlToMarkdown('')).toBe('');
    expect(htmlToMarkdown('   ')).toBe('');
  });

  it('converts <b> and <strong> to **bold**', () => {
    expect(htmlToMarkdown('<b>Hello</b>')).toBe('**Hello**');
    expect(htmlToMarkdown('<strong>World</strong>')).toBe('**World**');
  });

  it('converts <i> and <em> to *italic*', () => {
    expect(htmlToMarkdown('<i>Hello</i>')).toBe('*Hello*');
    expect(htmlToMarkdown('<em>World</em>')).toBe('*World*');
  });

  it('converts <s>, <del>, <strike> to ~~strikethrough~~', () => {
    expect(htmlToMarkdown('<s>x</s>')).toBe('~~x~~');
    expect(htmlToMarkdown('<del>y</del>')).toBe('~~y~~');
    expect(htmlToMarkdown('<strike>z</strike>')).toBe('~~z~~');
  });

  it('converts anchors to markdown links', () => {
    expect(htmlToMarkdown('<a href="https://ex.com">site</a>')).toBe('[site](https://ex.com)');
  });

  it('converts lists to markdown', () => {
    const html = '<ul><li>one</li><li>two</li></ul>';
    expect(htmlToMarkdown(html)).toBe('- one\n- two');
    const ol = '<ol><li>a</li><li>b</li><li>c</li></ol>';
    expect(htmlToMarkdown(ol)).toBe('1. a\n2. b\n3. c');
  });

  it('converts headings to `#` prefixes', () => {
    expect(htmlToMarkdown('<h1>Title</h1>')).toBe('# Title');
    expect(htmlToMarkdown('<h3>Sub</h3>')).toBe('### Sub');
  });

  it('converts <pre><code> to a fenced code block', () => {
    expect(htmlToMarkdown('<pre><code>const x = 1;</code></pre>')).toContain('```');
    expect(htmlToMarkdown('<pre><code>const x = 1;</code></pre>')).toContain('const x = 1;');
  });

  it('converts inline <code> to backticks', () => {
    expect(htmlToMarkdown('use <code>npm</code>')).toBe('use `npm`');
  });

  it('drops <script> and <style> blocks', () => {
    expect(htmlToMarkdown('<script>alert(1)</script>clean')).toBe('clean');
    expect(htmlToMarkdown('<style>p{color:red}</style>hello')).toBe('hello');
  });

  it('decodes common HTML entities', () => {
    expect(htmlToMarkdown('Tom &amp; Jerry')).toBe('Tom & Jerry');
    expect(htmlToMarkdown('&lt;x&gt;')).toBe('<x>');
    expect(htmlToMarkdown('a&nbsp;b')).toBe('a b');
  });

  it('converts the legacy story sample to equivalent markdown', () => {
    // Mirrors the payload used by stories/CellTypes.stories.tsx prior to this change.
    const html = '<b>Bold 1</b> and <em>italic</em> text';
    expect(htmlToMarkdown(html)).toBe('**Bold 1** and *italic* text');
  });
});
