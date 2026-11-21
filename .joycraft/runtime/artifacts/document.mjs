// Markdown to the kit's HTML, for a document a person only reads. Every byte of
// the source is escaped: raw HTML in the Markdown shows as text and never runs.
const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const fence = /^ {0,3}(`{3,}|~{3,})[ \t]*([^`]*)$/;
const heading = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const rule = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const quote = /^ {0,3}>[ \t]?/;
const item = /^([ \t]*)([-*+]|\d{1,9}[.)])(?:[ \t]+(.*))?$/;
const divider = /^[ \t]*\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;

const indentOf = line => line.match(/^[ \t]*/)[0].replaceAll('\t', '    ').length;
const dedent = (line, width) => { const indent = indentOf(line); return ' '.repeat(Math.max(0, indent - width)) + line.trimStart(); };
const cells = row => row.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '').split(/(?<!\\)\|/).map(cell => cell.trim().replaceAll('\\|', '|'));
const tableAt = (lines, i) => lines[i].includes('|') && i + 1 < lines.length && divider.test(lines[i + 1]) && lines[i + 1].includes('-') && cells(lines[i]).length === cells(lines[i + 1]).length;
const startsBlock = (lines, i) => fence.test(lines[i]) || heading.test(lines[i]) || rule.test(lines[i]) || quote.test(lines[i]) || item.test(lines[i]) || tableAt(lines, i);

/** One render of one document: headings get ids, and `#fragment` links point at them. */
function renderer(images) {
  const slugs = new Map();
  const referenced = new Set();
  let title;
  let diagrams = 0;
  // An image the caller embedded shows as itself. Every other image target stays as text.
  const image = (alt, target) => {
    referenced.add(target);
    const src = images.get(target);
    return src ? `<img class="jca-doc-image" src="${escape(src)}" alt="${escape(alt)}">` : `<span class="jca-doc-ref" title="${escape(target)}">[image: ${escape(alt || target)}]</span>`;
  };
  const slug = text => text.toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, '').trim().replace(/\s+/g, '-');
  const headingId = text => {
    const base = slug(text) || 'section';
    const seen = slugs.get(base) ?? 0;
    slugs.set(base, seen + 1);
    return `doc-${base}${seen ? `-${seen}` : ''}`;
  };

  function inline(source) {
    const kept = [];
    const keep = html => `\u0000${kept.push(html) - 1}\u0000`;
    // Escape and mark emphasis in plain text; kept spans (code, links) stay as placeholders.
    const plain = text => escape(text)
      .replace(/\*\*(?=\S)([\s\S]+?)(?<=\S)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<![\w_])__(?=\S)([\s\S]+?)(?<=\S)__(?!\w)/g, '<strong>$1</strong>')
      .replace(/\*(?=\S)([^*]+?)(?<=\S)\*/g, '<em>$1</em>')
      .replace(/(?<![\w_])_(?=\S)([^_]+?)(?<=\S)_(?!\w)/g, '<em>$1</em>')
      .replace(/~~(?=\S)([\s\S]+?)(?<=\S)~~/g, '<del>$1</del>')
      .replace(/(?: {2,}|\\)\n/g, '<br>\n');
    const anchor = (url, label) => {
      if (/^(?:https?:\/\/|mailto:)/i.test(url)) return `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
      if (url.startsWith('#')) return `<a href="#doc-${escape(slug(decodeFragment(url.slice(1))))}">${label}</a>`;
      // A project path or an unknown scheme is not a working link on this page: keep the label, show the target on hover.
      return `<span class="jca-doc-ref" title="${escape(url)}">${label}</span>`;
    };
    const text = source.replaceAll('\u0000', '')
      .replace(/(`+)(?!`)([\s\S]*?[^`])\1(?!`)/g, (_, _ticks, code) => keep(`<code>${escape(code.replace(/\n/g, ' ').replace(/^ (.*\S.*) $/, '$1'))}</code>`))
      .replace(/\\([!-/:-@[-`{-~])/g, (_, character) => keep(escape(character)))
      .replace(/!\[([^\]]*)\]\(\s*(?:<([^<>\n]*)>|((?:[^()\s<>]|\([^()\s]*\))*))(?:\s+"[^"]*")?\s*\)/g, (_, alt, bracketed, bare) => keep(image(alt, bracketed ?? bare)))
      .replace(/\[((?:[^[\]]|\[[^[\]]*\])*)\]\(\s*<?((?:[^()\s<>]|\([^()\s]*\))*)>?(?:\s+"[^"]*")?\s*\)/g, (_, label, url) => keep(anchor(url, plain(label))))
      .replace(/<((?:https?:\/\/|mailto:)[^\s<>]+)>/g, (_, url) => keep(anchor(url, escape(url))));
    const restore = html => html.replace(/\u0000(\d+)\u0000/g, (_, index) => restore(kept[Number(index)]));
    return restore(plain(text));
  }
  // Heading text for an id or the page title: the words, without the Markdown marks.
  const words = source => inline(source).replace(/<[^>]+>/g, '').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&amp;', '&');

  function code(lines, info) {
    const language = info.trim().split(/\s+/)[0] ?? '';
    // The page's diagram script draws this figure. Until then, and when it cannot, the source shows.
    if (language === 'mermaid') { diagrams += 1; return `<figure class="jca-diagram"><pre><code>${escape(lines.join('\n'))}</code></pre></figure>`; }
    if (language !== 'diff') return `<pre><code>${escape(lines.join('\n'))}</code></pre>`;
    const kind = line => /^(?:\+\+\+ |--- |diff |index )/.test(line) ? 'file' : line.startsWith('@@') ? 'hunk' : line.startsWith('+') ? 'add' : line.startsWith('-') ? 'del' : '';
    return `<pre class="jca-doc-diff"><code>${lines.map(line => `<span${kind(line) ? ` class="jca-doc-${kind(line)}"` : ''}>${escape(line) || '\n'}</span>`).join('')}</code></pre>`;
  }

  function table(lines, start) {
    const align = cells(lines[start + 1]).map(cell => cell.startsWith(':') && cell.endsWith(':') ? 'center' : cell.endsWith(':') ? 'right' : '');
    const row = (line, tag) => `<tr>${align.map((side, column) => `<${tag}${side ? ` class="jca-doc-${side}"` : ''}>${inline(cells(line)[column] ?? '')}</${tag}>`).join('')}</tr>`;
    let i = start + 2;
    const body = [];
    while (i < lines.length && lines[i].trim() && lines[i].includes('|')) body.push(row(lines[i++], 'td'));
    return { next: i, html: `<div class="jca-doc-table"><table><thead>${row(lines[start], 'th')}</thead>${body.length ? `<tbody>${body.join('')}</tbody>` : ''}</table></div>` };
  }

  function list(lines, start) {
    const first = lines[start].match(item);
    const base = indentOf(first[1]);
    const ordered = /\d/.test(first[2]);
    const sibling = line => { const match = line.match(item); const indent = match ? indentOf(match[1]) : -1; return match && indent >= base && indent < base + 2 && /\d/.test(match[2]) === ordered ? match : null; };
    const items = [];
    let loose = false;
    let i = start;
    while (i < lines.length) {
      const match = sibling(lines[i]);
      if (!match) break;
      const content = base + match[2].length + 1;
      const body = [match[3] ?? ''];
      i += 1;
      while (i < lines.length) {
        const line = lines[i];
        if (!line.trim()) {
          let next = i + 1;
          while (next < lines.length && !lines[next].trim()) next += 1;
          if (next < lines.length && indentOf(lines[next]) >= base + 2) { body.push(''); i += 1; continue; }
          if (next < lines.length && sibling(lines[next])) { loose = true; i = next; }
          break;
        }
        if (indentOf(line) >= base + 2) body.push(dedent(line, Math.min(content, indentOf(line))));
        else if (!sibling(line) && body.at(-1).trim() && !startsBlock(lines, i)) body.push(line.trim());
        else break;
        i += 1;
      }
      items.push(body);
    }
    const tag = ordered ? 'ol' : 'ul';
    const number = ordered ? Number.parseInt(first[2], 10) : 1;
    return { next: i, html: `<${tag}${number !== 1 ? ` start="${number}"` : ''}>${items.map(body => `<li>${blocks(body, !loose)}</li>`).join('')}</${tag}>` };
  }

  /** `tight`: the content of an item in a list with no blank line between items; its first paragraph has no `<p>`. */
  function blocks(lines, tight = false) {
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i += 1; continue; }
      const fenced = line.match(fence);
      if (fenced) {
        const close = new RegExp(`^ {0,3}${fenced[1][0]}{${fenced[1].length},}[ \\t]*$`);
        const body = [];
        i += 1;
        while (i < lines.length && !close.test(lines[i])) body.push(lines[i++]);
        i += 1;
        out.push(code(body, fenced[2]));
        continue;
      }
      const head = line.match(heading);
      if (head) {
        const source = head[2] ?? '';
        const level = head[1].length;
        if (level === 1 && title === undefined) title = words(source);
        out.push(`<h${level} id="${escape(headingId(words(source)))}">${inline(source)}</h${level}>`);
        i += 1;
        continue;
      }
      if (rule.test(line)) { out.push('<hr>'); i += 1; continue; }
      if (quote.test(line)) {
        const body = [];
        while (i < lines.length && lines[i].trim() && (quote.test(lines[i]) || !startsBlock(lines, i))) body.push(lines[i++].replace(quote, ''));
        out.push(`<blockquote>${blocks(body)}</blockquote>`);
        continue;
      }
      if (tableAt(lines, i)) { const result = table(lines, i); out.push(result.html); i = result.next; continue; }
      if (item.test(line)) { const result = list(lines, i); out.push(result.html); i = result.next; continue; }
      const paragraph = [line.trimStart()];
      i += 1;
      while (i < lines.length && lines[i].trim() && !startsBlock(lines, i)) paragraph.push(lines[i++].replace(/^[ \t]+/, ''));
      out.push(tight && !out.length ? inline(paragraph.join('\n')) : `<p>${inline(paragraph.join('\n'))}</p>`);
    }
    return out.join('\n');
  }

  return { blocks, title: () => title, images: () => [...referenced], diagrams: () => diagrams };
}

function decodeFragment(fragment) {
  try { return decodeURIComponent(fragment); }
  catch { return fragment; }
}

/** Render Markdown `text` to `{ title, html, images, diagrams }`. `title` is the first level-1
 * heading, if any. `images` lists every image target in the text; the caller reads the files it
 * accepts and renders again with `images`, a Map from target to a `data:` URI. `diagrams`
 * counts the Mermaid blocks. */
export function renderDocument(text, { images = new Map() } = {}) {
  const lines = String(text).replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  const { blocks, title, images: referenced, diagrams } = renderer(images);
  let meta = '';
  // Front matter is part of the document (a spec's status, a brief's decisions): show it as it is.
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    if (end > 0) meta = `<pre class="jca-doc-meta"><code>${escape(lines.splice(0, end + 1).slice(1, -1).join('\n'))}</code></pre>\n`;
  }
  const html = meta + blocks(lines);
  return { title: title(), html, images: referenced(), diagrams: diagrams() };
}
