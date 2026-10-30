import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { loadArtifact, localState, saveLocal } from './model.mjs';
import { renderArtifact } from './render.mjs';

export async function startArtifact({ root = process.cwd(), brief, view, theme, port = 0 }) {
  const args = { root, brief, view, theme };
  await loadArtifact(args);
  const token = randomBytes(24).toString('hex');
  let url;
  const server = createServer(async (request, response) => {
    const send = (status, data, type = 'application/json') => {
      response.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
      response.end(type === 'application/json' ? JSON.stringify(data) : data);
    };
    try {
      if (request.headers.host !== new URL(url).host) return send(403, { error: 'Invalid host' });
      const path = new URL(request.url, url).pathname;
      if (request.method === 'GET' && path === '/') {
        response.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'nonce-${token}'; style-src 'unsafe-inline'; connect-src 'self'; img-src data:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`);
        return send(200, await renderArtifact((await loadArtifact(args)).model, { token }), 'text/html');
      }
      if (request.method === 'GET' && path === '/state') return send(200, localState((await loadArtifact(args)).model));
      if (request.method === 'POST' && path === '/answers') {
        if (request.headers.origin !== url || request.headers['x-artifact-token'] !== token) return send(403, { error: 'Invalid origin or token' });
        if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] ?? '')) return send(415, { error: 'Send application/json' });
        let body = '';
        for await (const part of request) {
          body += part;
          if (Buffer.byteLength(body) > 500_000) return send(413, { error: 'Answer request too large' });
        }
        return send(200, await saveLocal({ ...args, request: JSON.parse(body) }));
      }
      return send(404, { error: 'Not found' });
    } catch (error) { return send(409, { error: error.message }); }
  });
  await new Promise((accept, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', accept); });
  url = `http://127.0.0.1:${server.address().port}`;
  return { server, url, close: () => new Promise((accept, reject) => server.close(error => error ? reject(error) : accept())) };
}
