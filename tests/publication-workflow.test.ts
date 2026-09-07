import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const roots: string[] = [];
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));

describe('production publication workflow', () => {
  it.each([false, true])('publishes once and resumes with retained identity (first verification fails: %s)', async (failFirstVerification) => {
    const root = mkdtempSync(join(tmpdir(), 'joycraft-publish-step-'));
    roots.push(root);
    const bin = join(root, 'bin');
    mkdirSync(bin);
    mkdirSync(join(root, 'release-artifact'));
    mkdirSync(join(root, 'scripts'));
    for (const name of ['verify-publication.mjs', 'release-verification.mjs', 'release-preparation.mjs']) {
      copyFileSync(join('scripts', name), join(root, 'scripts', name));
    }
    const integrity = `sha512-${Buffer.alloc(64, 1).toString('base64')}`;
    writeFileSync(join(root, 'release-artifact/release-artifact.json'), JSON.stringify({ packageName: 'joycraft', version: '0.7.14', integrity }));
    const state = join(root, 'state.json');
    writeFileSync(state, JSON.stringify({ published: false, publications: 0, observations: 0, integrity, failFirstVerification }));
    const npm = join(bin, 'npm');
    writeFileSync(npm, `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
const path = process.env.PUBLICATION_FIXTURE_STATE;
const state = JSON.parse(fs.readFileSync(path, 'utf8'));
if (args[0] === 'publish') {
  if (state.published || args[1] !== process.env.TARBALL || !args.includes('latest')) throw new Error('unexpected publication');
  state.published = true;
  state.publications++;
  console.log('+ joycraft@0.7.14');
} else if (args[0] === 'view' && args[1] === 'joycraft@0.7.14' && args[2] === 'dist.integrity') {
  if (!state.published) { console.error('E404 Not Found'); process.exit(1); }
  console.log(JSON.stringify(state.integrity));
} else if (args[0] === 'view' && args[1] === 'joycraft' && args[2] === 'dist-tags.latest') {
  state.observations++;
  console.log(state.observations < 2 ? '0.7.13' : '0.7.14');
} else if (args[0] === 'view' && args[1] === 'joycraft@0.7.14' && args[2] === 'name') {
  if (!args.includes('--prefer-online') || !args.includes('--fetch-retries=0')) throw new Error('metadata reads must revalidate');
  state.observations++;
  const name = state.failFirstVerification && state.observations === 1 ? 'conflicting-metadata' : 'joycraft';
  console.log(JSON.stringify({ name, version: '0.7.14', 'dist.integrity': state.integrity, 'dist-tags.latest': state.observations < 2 ? '0.7.13' : '0.7.14' }));
} else { throw new Error('unexpected npm arguments: ' + JSON.stringify(args)); }
fs.writeFileSync(path, JSON.stringify(state));
`);
    chmodSync(npm, 0o755);
    const workflow = readFileSync('.github/workflows/publish.yml', 'utf8');
    const step = workflow.split('      - name: Publish verified tarball to latest using OIDC\n')[1].split('\n      - name:')[0];
    const script = step.split('        run: |\n')[1].split('\n').map(line => line.replace(/^ {10}/, '')).join('\n');
    const options = { cwd: root, env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, PUBLICATION_FIXTURE_STATE: state, VERSION: '0.7.14', TARBALL: join(root, 'retained.tgz') }, timeout: 25_000 };

    if (failFirstVerification) {
      await expect(exec('bash', ['-e', '-o', 'pipefail', '-c', script], options)).rejects.toThrow(/Published name mismatch/);
      expect(JSON.parse(readFileSync(state, 'utf8'))).toMatchObject({ published: true, publications: 1 });
    } else {
      const first = await exec('bash', ['-e', '-o', 'pipefail', '-c', script], options);
      expect(first.stdout).toContain('observed latest=0.7.13');
      expect(first.stdout).toContain('observed latest=0.7.14');
    }
    await exec('bash', ['-e', '-o', 'pipefail', '-c', script], options);
    expect(JSON.parse(readFileSync(state, 'utf8'))).toMatchObject({ published: true, publications: 1 });
  }, 30_000);
});
