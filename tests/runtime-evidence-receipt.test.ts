import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const script = join(__dirname, '..', 'payload', '.joycraft', 'runtime', 'evidence.mjs');
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const run = (cwd: string, receipt: string) => spawnSync(process.execPath, [script, 'run', '--receipt', receipt, '--', process.execPath, '-e', 'console.log("ok")'], { cwd, encoding: 'utf8' });

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function project(withGit: boolean) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-evidence-')));
  dirs.push(root);
  mkdirSync(join(root, 'docs/features/x'), { recursive: true });
  writeFileSync(join(root, 'docs/features/x/spec.md'), 'spec\n');
  if (withGit) {
    git(root, 'init', '-q');
    git(root, 'add', '.');
    git(root, 'commit', '-q', '-m', 'init');
  }
  return root;
}

describe('evidence.mjs run receipts', () => {
  it('[AC:receipt-refuses-json] refuses a .json or .jsonl receipt with exit 2 and writes nothing', () => {
    const root = project(true);
    for (const receipt of ['docs/features/x/receipts/a.json', 'docs/features/x/receipts/a.jsonl']) {
      const result = run(root, receipt);
      expect(result.status).toBe(2);
      expect(result.stderr).toContain('.log');
      expect(result.stdout).toBe('');
      expect(existsSync(join(root, 'docs/features/x/receipts'))).toBe(false);
    }
  });

  it('[AC:receipt-usage-log] usage text names a .log receipt', () => {
    const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('--receipt <path>.log');
  });

  it('[AC:receipt-revision] a run prints the HEAD commit and a dirty flag', () => {
    const root = project(true);
    const head = git(root, 'rev-parse', 'HEAD').trim();
    const clean = run(root, 'docs/features/x/receipts/a.log');
    expect(clean.status).toBe(0);
    expect(JSON.parse(clean.stdout).revision).toEqual({ commit: head, dirty: false });
    expect(head).toMatch(/^[0-9a-f]{40}$/);
    writeFileSync(join(root, 'docs/features/x/spec.md'), 'changed\n');
    const dirty = run(root, 'docs/features/x/receipts/b.log');
    expect(dirty.status).toBe(0);
    expect(JSON.parse(dirty.stdout).revision).toEqual({ commit: head, dirty: true });
  });

  it('[AC:receipt-revision-outside-git] outside Git the commit is null', () => {
    const root = project(false);
    const result = run(root, 'docs/features/x/receipts/a.log');
    expect(result.status).toBe(0);
    const { revision } = JSON.parse(result.stdout);
    expect(revision.commit).toBeNull();
    expect(typeof revision.dirty).toBe('boolean');
  });
});

describe('evidence.mjs receipt tail and long footer (spec 27)', () => {
  const readFooter = (file: string) => JSON.parse(spawnSync(process.execPath, ['--input-type=module', '-e',
    `import { readFooter } from ${JSON.stringify(pathToFileURL(script).href)}; process.stdout.write(JSON.stringify(readFooter(${JSON.stringify(file)})));`], { encoding: 'utf8' }).stdout);

  it('[AC:spec-27-5] readFooter returns a footer longer than 64 KiB; the failing tail starts at a line start', () => {
    const root = project(true);
    const long = 'x'.repeat(70000);
    const result = spawnSync(process.execPath, [script, 'run', '--receipt', 'docs/features/x/receipts/long.log', '--', process.execPath, '-e', '0', long], { cwd: root, encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
    expect(readFooter(join(root, 'docs/features/x/receipts/long.log')).argv).toEqual([process.execPath, '-e', '0', long]);

    // A 300 KiB line of two-byte characters, so a window inside it could also split a character.
    const code = "process.stdout.write('\u00e9'.repeat(150 * 1024) + '\\na\\nb\\n'); process.exit(1)";
    const failing = spawnSync(process.execPath, [script, 'run', '--receipt', 'docs/features/x/receipts/tail.log', '--', process.execPath, '-e', code], { cwd: root, encoding: 'utf8' });
    expect(failing.status).toBe(1);
    expect(JSON.parse(failing.stdout).tail).toBe('a\nb');
  });
});

// Spec: docs/features/2026-11-22-fixes-1-9-3/specs/04-reviewer-start.md
describe('report receipt refusal (1.9.3)', () => {
  it('[AC:spec-4-2] an observation without receipts is refused with the field to add and its shape', async () => {
    const { validateEvidence } = await import(pathToFileURL(script).href);
    const criteria = [{ id: 'c-1', requirement: { path: 'docs/features/x/spec.md', anchor: 'acceptance' }, requiredKinds: ['runtime'] }];
    const report = { schemaVersion: 1, subject: { identity: 'a'.repeat(64) }, flows: [{ id: 'f', criteria: ['c-1'],
      observations: [{ kind: 'runtime', method: 'test', result: 'PASS', actual: '3 passed', command: 'pnpm test x' }] }] };
    const { errors } = validateEvidence(report, criteria);
    expect(errors.join('\n')).toContain('flows[0].observations[0] needs supporting receipt references: add "receipts": [{ "path": "<project-relative receipt path>", "sha256": "<its SHA-256>" }] for the receipt that evidence.mjs run --receipt wrote for this check');
  });
});
