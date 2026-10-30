import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..');
const payload = join(root, 'payload');

function walk(dir: string): string[] {
  return readdirSync(dir).sort().flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [relative(payload, path).split('\\').join('/')];
  });
}

const files = () => walk(payload).filter(path => path !== 'PIN');
const text = (path: string) => readFileSync(join(payload, path), 'utf8');

describe('vendored payload', () => {
  it('matches its PIN byte for byte', () => {
    const pin = JSON.parse(text('PIN'));
    expect(pin.tag).toMatch(/^field-\d+$/);
    expect(Object.keys(pin.files).sort()).toEqual(files());
    for (const path of files()) expect(createHash('sha256').update(readFileSync(join(payload, path))).digest('hex'), path).toBe(pin.files[path]);
  });

  it('G11: mentions Jev only in docs, and ships no Jev runtime', () => {
    const code = files().filter(path => !/\.(md|d\.ts)$/.test(path));
    expect(code.filter(path => /jev/i.test(text(path)))).toEqual([]);
    expect(files().filter(path => /^\.joycraft\/(runtime\/(hooks|routing|harnesses)\/|hooks-config\.json$)|rank-model\.mjs$/.test(path))).toEqual([]);
  });

  it('D11: ships no trial data collection', () => {
    const banned = [/failure-record/, /failures\.jsonl/, /Joycraft-Spec:/, /jc-impl-/, /jc-rev-/, /callTelemetry/, /provider\.inputTokens/];
    const hits = files().flatMap(path => banned.filter(pattern => pattern.test(path) || pattern.test(text(path))).map(pattern => `${path}: ${pattern}`));
    expect(hits).toEqual([]);
  });

  it('every shipped runtime module loads without a missing import', () => {
    const modules = files().filter(path => path.startsWith('.joycraft/runtime/') && path.endsWith('.mjs')).concat('scripts/export.mjs');
    const script = modules.map(path => `await import(${JSON.stringify(join(payload, path))});`).join('\n');
    const run = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
  });

  it('npm pack includes the payload', () => {
    const [packed] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: root, encoding: 'utf8' }));
    const paths = new Set(packed.files.map((file: { path: string }) => file.path));
    expect(paths.has('payload/PIN')).toBe(true);
    expect(paths.has('payload/.joycraft/runtime/completion.mjs')).toBe(true);
  });

  it.runIf(Boolean(process.env.JOYCRAFT_PROTOTYPE_REPO))('re-vendoring the pinned tag gives identical bytes', async () => {
    const { vendor } = await import('../scripts/vendor-payload.mjs');
    const pin = JSON.parse(text('PIN'));
    const dest = mkdtempSync(join(tmpdir(), 'joycraft-revendor-'));
    try {
      expect(vendor({ source: process.env.JOYCRAFT_PROTOTYPE_REPO, tag: pin.tag, dest: join(dest, 'payload') })).toEqual(pin);
      expect(existsSync(join(dest, 'payload/PIN'))).toBe(true);
    } finally { rmSync(dest, { recursive: true, force: true }); }
  });
});
