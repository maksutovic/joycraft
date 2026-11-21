import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { lstatSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  readBrief,
  saveAnswer,
  selectPreviewDecision
} from '../../../../.joycraft/runtime/artifacts/decisions.mjs';

export { readBrief, saveAnswer, selectPreviewDecision };

function plainFile(path) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Brief and slice must be plain files');
  return stat;
}

function replaceBrief(path, original, updated) {
  if (updated === original) return;
  const stat = plainFile(path);
  const temporary = join(dirname(path), `.slice-answer-${randomBytes(8).toString('hex')}`);
  try {
    writeFileSync(temporary, updated, { flag: 'wx', mode: stat.mode });
    if (readFileSync(path, 'utf8') !== original) throw new Error('Brief changed. Reload before choosing.');
    renameSync(temporary, path);
  } finally {
    try { unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

/** Serve only one author-selected brief and self-contained slice on loopback. */
export async function startPreview({ briefPath, slicePath, decisionId, port = 0 }) {
  const briefFile = resolve(briefPath), sliceFile = resolve(slicePath);
  plainFile(briefFile); plainFile(sliceFile);
  if (decisionId) selectPreviewDecision(readBrief(readFileSync(briefFile, 'utf8')), decisionId);
  const token = randomBytes(24).toString('hex');
  const template = readFileSync(fileURLToPath(new URL('../../../../.joycraft/templates/ui-slice.html', import.meta.url)), 'utf8');
  let origin;
  const state = () => {
    const brief = readBrief(readFileSync(briefFile, 'utf8'));
    const decision = decisionId ? selectPreviewDecision(brief, decisionId) : selectPreviewDecision(brief);
    return { decision, revision: brief.revision, settled: decision === null };
  };
  const server = createServer(async (request, response) => {
    const send = (status, value, type = 'application/json') => {
      response.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(type === 'application/json' ? JSON.stringify(value) : value);
    };
    try {
      if (request.headers.host !== new URL(origin).host) return send(403, { error: 'Invalid host' });
      const url = new URL(request.url, origin);
      if (request.method === 'GET' && url.pathname === '/') {
        response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-src 'self'; base-uri 'none'; frame-ancestors 'none'");
        return send(200, template.replace('__REQUEST_TOKEN__', JSON.stringify(token)), 'text/html');
      }
      if (request.method === 'GET' && url.pathname === '/state') return send(200, state());
      if (request.method === 'GET' && url.pathname === '/slice') {
        response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'");
        return send(200, readFileSync(sliceFile, 'utf8'), 'text/html');
      }
      if (request.method === 'POST' && url.pathname === '/answer') {
        if (request.headers.origin !== origin || request.headers['x-slice-token'] !== token) return send(403, { error: 'Invalid origin or token' });
        let body = '';
        for await (const part of request) {
          body += part;
          if (body.length > 8192) return send(413, { error: 'Answer too large' });
        }
        const answer = JSON.parse(body);
        const current = state();
        if (!current.decision) return send(409, { error: 'All choices are settled' });
        if (answer.id !== current.decision.id) return send(409, { error: 'This preview is bound to another decision' });
        const original = readFileSync(briefFile, 'utf8');
        replaceBrief(briefFile, original, saveAnswer(original, answer));
        return send(200, state());
      }
      return send(404, { error: 'Not found' });
    } catch (error) { return send(409, { error: error.message }); }
  });
  await new Promise((accept, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', accept); });
  origin = `http://127.0.0.1:${server.address().port}`;
  return { server, url: origin, close: () => new Promise((accept, reject) => server.close(error => error ? reject(error) : accept())) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2), values = {};
    for (let index = 0; index < args.length; index += 2) {
      if (!['--brief', '--slice', '--decision'].includes(args[index]) || !args[index + 1] || values[args[index]]) throw new Error('Expected --brief <file> --slice <file> [--decision <id>]');
      values[args[index]] = args[index + 1];
    }
    if (!values['--brief'] || !values['--slice']) throw new Error('Expected --brief <file> --slice <file> [--decision <id>]');
    const preview = await startPreview({ briefPath: values['--brief'], slicePath: values['--slice'], decisionId: values['--decision'] });
    console.log(`Preview: ${preview.url}\nAnswers save directly to ${values['--brief']}. Stop with Ctrl-C.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
