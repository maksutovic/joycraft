import { readFile } from 'node:fs/promises';

const asset = name => readFile(new URL(`../../assets/artifacts/${name}`, import.meta.url), 'utf8');
const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const embeddedJSON = value => JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');

/** Assembly copies runtime bytes; the author only supplies the small view data. */
export async function renderArtifact(model, { token } = {}) {
  if (!['local', 'claude', 'portable'].includes(model.mode)) throw new Error('Unknown artifact mode');
  if (model.mode === 'local' && !/^[a-f0-9]{48}$/.test(token ?? '')) throw new Error('Local artifact needs a request token');
  const theme = model.theme ?? 'light';
  if (!['light', 'dark'].includes(theme)) throw new Error('Artifact theme must be light or dark');
  const [css, kit, transports] = await Promise.all([asset('kit.css'), asset('kit.js'), asset('transports.js')]);
  const nonce = token ? ` nonce="${token}"` : '';
  const init = `const model = JSON.parse(document.getElementById('artifact-data').textContent);\nconst transport = JoycraftArtifactTransports.${model.mode}(model, ${model.mode === 'local' ? `{token:${JSON.stringify(token)}}` : '{}'});\nJoycraftArtifacts.mount({element:document.getElementById('artifact'),model,transport});`;
  return `<!doctype html>\n<html lang="en" data-jca-theme="${theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(model.title)}</title><style>${css}</style></head><body><main id="artifact"></main><noscript>This interactive page needs JavaScript. Read the source brief for current decisions.</noscript><script type="application/json" id="artifact-data"${nonce}>${embeddedJSON(model)}</script><script${nonce}>${kit}</script><script${nonce}>${transports}</script><script${nonce}>${init}</script></body></html>\n`;
}
