import { readFile } from 'node:fs/promises';
import { colorTokens } from './preferences.mjs';

const asset = name => readFile(new URL(`../../assets/artifacts/${name}`, import.meta.url), 'utf8');
const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const embeddedJSON = value => JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');

/** Assembly copies runtime bytes; the author only supplies the small view data. */
export async function renderArtifact(model, { token } = {}) {
  if (!['local', 'claude', 'portable'].includes(model.mode)) throw new Error('Unknown artifact mode');
  if (model.mode === 'local' && model.source && !/^[a-f0-9]{48}$/.test(token ?? '')) throw new Error('Local artifact needs a request token');
  const theme = model.theme ?? 'light';
  if (!['light', 'dark'].includes(theme)) throw new Error('Artifact theme must be light or dark');
  const colors = Object.entries(model.colors ?? {});
  for (const [token, value] of colors) if (!colorTokens.includes(token) || !/^#[\da-f]{6}$/i.test(value)) throw new Error('Artifact colors must be known tokens with #rrggbb values');
  const palette = colors.length ? `[data-jca-theme="${theme}"]{${colors.map(([token, value]) => `--${token}:${value}`).join(';')}}` : '';
  const [css, kit, transports] = await Promise.all([asset('kit.css'), asset('kit.js'), asset('transports.js')]);
  // A document is static HTML that the engine rendered from Markdown. It needs no script,
  // so a page with only documents has none, unless one has a diagram.
  const { documents = [], ...data } = model;
  const nonce = token ? ` nonce="${token}"` : '';
  // The diagram script is small: it loads Mermaid from a CDN, and only a page with a
  // Mermaid block (in a document or in a decision's details) gets it.
  const diagrams = documents.some(document => document.diagrams) || (model.questions ?? []).some(question => /^```mermaid[ \t]*$/m.test(question.details ?? ''));
  const drawing = diagrams ? `<script${nonce}>${await asset('diagrams.js')}</script>` : '';
  const reading = documents.map(document => `<article class="joycraft-artifact jca-doc" data-jca-theme="${theme}"><p class="jca-eyebrow">Document</p><div class="jca-doc-body">${document.html}</div><footer class="jca-footer">Source: ${escape(document.path)}</footer></article>`).join('');
  const head = `<!doctype html>\n<html lang="en" data-jca-theme="${theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(model.title)}</title><style>${css}${palette}</style></head><body>${reading}`;
  if (documents.length && !model.source) return `${head}${drawing}</body></html>\n`;
  const init = `const model = JSON.parse(document.getElementById('artifact-data').textContent);\nconst transport = JoycraftArtifactTransports.${model.mode}(model, ${model.mode === 'local' ? `{token:${JSON.stringify(token)}}` : '{}'});\nJoycraftArtifacts.mount({element:document.getElementById('artifact'),model,transport});`;
  return `${head}<main id="artifact"></main><noscript>This interactive page needs JavaScript. Read the source brief for current decisions.</noscript><script type="application/json" id="artifact-data"${nonce}>${embeddedJSON(data)}</script><script${nonce}>${kit}</script><script${nonce}>${transports}</script><script${nonce}>${init}</script>${drawing}</body></html>\n`;
}
