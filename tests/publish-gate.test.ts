import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as preparation from '../scripts/release-preparation.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const roots: string[] = [];
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', ['-c', 'tag.gpgSign=false', '-c', 'commit.gpgSign=false', ...args], { cwd, encoding: 'utf8' }).trim();
}

function commit(cwd: string, files: Record<string, string>, message: string): string {
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(cwd, path)), { recursive: true });
    writeFileSync(join(cwd, path), body);
  }
  git(cwd, 'add', '-A');
  git(cwd, '-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-q', '-m', message);
  return git(cwd, 'rev-parse', 'HEAD');
}

function repo({ tagged = true } = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'joycraft-publish-gate-'));
  roots.push(root);
  git(root, 'init', '-q');
  commit(root, { 'package.json': '{"version":"1.0.0"}\n', 'payload/a.md': 'a\n', 'docs/a.md': 'a\n' }, 'release');
  if (tagged) git(root, 'tag', 'v1.0.0');
  return root;
}

describe('publish gate', () => {
  it('[AC:docs-only-skips] a push that changes only docs and tests does not publish', async () => {
    const root = repo();
    const sha = commit(root, { 'docs/a.md': 'b\n', 'tests/a.test.ts': 'x\n', '.github/workflows/x.yml': 'x\n' }, 'docs');
    const gate = await preparation.resolvePublishGate({ cwd: root, currentSha: sha });
    expect(gate).toMatchObject({ shouldPublish: false, baseline: 'v1.0.0', productFiles: [] });
  });

  it('[AC:product-publishes] a push that changes payload or src publishes and names the files', async () => {
    const root = repo();
    commit(root, { 'docs/a.md': 'b\n' }, 'docs');
    const sha = commit(root, { 'payload/a.md': 'b\n', 'src/cli.ts': 'x\n' }, 'product');
    const gate = await preparation.resolvePublishGate({ cwd: root, currentSha: sha });
    expect(gate).toMatchObject({ shouldPublish: true, baseline: 'v1.0.0', productFiles: ['payload/a.md', 'src/cli.ts'] });
  });

  it('[AC:product-publishes] an unpublished product change still publishes on a later docs-only push', async () => {
    const root = repo();
    commit(root, { 'payload/a.md': 'b\n' }, 'product whose publish failed');
    const sha = commit(root, { 'docs/a.md': 'b\n' }, 'docs');
    const gate = await preparation.resolvePublishGate({ cwd: root, currentSha: sha });
    expect(gate).toMatchObject({ shouldPublish: true, productFiles: ['payload/a.md'] });
  });

  it('[AC:no-tag-publishes] a repository without a release tag publishes', async () => {
    const root = repo({ tagged: false });
    const sha = commit(root, { 'docs/a.md': 'b\n' }, 'docs');
    const gate = await preparation.resolvePublishGate({ cwd: root, currentSha: sha });
    expect(gate).toMatchObject({ shouldPublish: true, reason: 'no-release-tag' });
  });

  it('[AC:workflow-gate] pack runs only when the gate says a push changed the product', () => {
    const publish = readFileSync(join(ROOT, '.github/workflows/publish.yml'), 'utf8');
    const gate = publish.slice(publish.indexOf('\n  gate:\n'), publish.indexOf('\n  pack:\n'));
    expect(gate).toContain('should_publish: ${{ steps.gate.outputs.should_publish }}');
    expect(gate).toContain('node scripts/release-preparation.mjs publish-gate');
    expect(gate).toContain('fetch-depth: 0');
    const pack = publish.slice(publish.indexOf('\n  pack:\n'), publish.indexOf('\n  compatibility:\n'));
    expect(pack).toContain('needs: gate');
    expect(pack).toContain("needs.gate.outputs.should_publish == 'true'");
    expect(publish).toMatch(/compatibility:[\s\S]*?needs: pack/);
    expect(publish).toContain('needs: [pack, compatibility]');
  });
});
