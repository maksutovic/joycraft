import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const runtime = join(__dirname, '..', 'payload', '.joycraft', 'runtime', 'archive.mjs');
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const hash = (body: string) => createHash('sha256').update(Buffer.from(body)).digest('hex');
const source = 'docs/features/x';

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true, maxRetries: 5 }); });

// The test reads the brief and fails when it is missing or says "fail".
const briefTest = (where: string) => `import { readFileSync } from 'node:fs';\n// two-tier\nconst brief = readFileSync('${where}/brief.md', 'utf8');\nif (brief.includes('fail')) process.exit(1);\n`;

/** A done feature `x` (legacy-accepted), a test and a script that name it, and an optional tests.focused. */
function fixture({ focused, brief = '# Brief\n' }: { focused?: string; brief?: string } = {}) {
  const queuePath = `${source}/specs/.joycraft-spec-queue.json`;
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-archive-named-')));
  dirs.push(root);
  git(root, 'init', '-q', '-b', 'main');
  put(join(root, `${source}/brief.md`), brief);
  put(join(root, `${source}/specs/01-a.md`), '---\nid: 1\nstatus: done\n---\n# A\n');
  const decision = JSON.stringify({ schemaVersion: 1, kind: 'legacy', queuePath, statement: 'Accept it as it is.', statedAt: '2026-11-21T00:00:00Z', specs: [1], reason: 'Done before the gates.' });
  put(join(root, `${source}/specs/legacy.json`), decision);
  put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: 'x', specs: [{ id: 1, file: '01-a.md', status: 'done', mode: 'batch', depends_on: [], verification: { inputs: [] }, ownerAcceptance: { path: `${source}/specs/legacy.json`, sha256: hash(decision), legacy: true } }] }));
  put(join(root, 'docs/context/decision-log.md'), '# Decisions\n');
  put(join(root, '.gitignore'), '.joycraft/local/\n');
  put(join(root, '.joycraft/local/attest.json'), JSON.stringify({ schemaVersion: 1, phase: 'session-end', host: { sessionId: 's', quiescent: true, activeWorkers: [], dependentWork: [] }, durableContext: { carried: true, references: ['docs/context/decision-log.md'] } }));
  put(join(root, 'tests/two-tier.test.mjs'), briefTest(source));
  put(join(root, 'scripts/x.mjs'), `export const folder = '${source}';\n`);
  put(join(root, 'docs/notes.md'), `See ${source}.\n`);
  if (focused) put(join(root, 'joycraft.yaml'), `tests:\n  focused: ${JSON.stringify(focused)}\n`);
  git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'init');
  return root;
}

const archive = (root: string, ...extra: string[]) => {
  const result = spawnSync(process.execPath, [runtime, 'archive', '--feature', 'x', '--phase', 'session-end', '--attestation', '.joycraft/local/attest.json', ...extra], { cwd: root, encoding: 'utf8' });
  return { status: result.status, stderr: result.stderr, output: result.stdout ? JSON.parse(result.stdout) : null };
};

describe('archive lists files that name the feature folder', () => {
  it('[AC:spec-13-1] the preview, strict and as-is, lists the test first and the script, and moves nothing', () => {
    const root = fixture();
    for (const extra of [[], ['--as-is', '--owner-instruction', 'Archive it as it is.']]) {
      const preview = archive(root, ...extra);
      expect(preview.status, preview.stderr).toBe(0);
      expect(preview.output.plan.namedFiles).toEqual([{ path: 'tests/two-tier.test.mjs', line: 3, test: true }, { path: 'scripts/x.mjs', line: 1, test: false }]);
    }
    expect(existsSync(join(root, source, 'brief.md'))).toBe(true);
    expect(git(root, 'status', '--porcelain')).toBe('');
  });

  it('[AC:spec-13-2] --apply --rewrite rewrites the test to the archive path, runs it green and archives', () => {
    const root = fixture({ focused: `${process.execPath} {files}` });
    const result = archive(root, '--apply', '--rewrite', 'tests/two-tier.test.mjs');
    expect(result.status, result.stderr).toBe(0);
    expect(result.output.status).toBe('archived');
    expect(result.output.test.exitCode).toBe(0);
    expect(readFileSync(join(root, 'tests/two-tier.test.mjs'), 'utf8')).toBe(briefTest('docs/archive/x/feature'));
    expect(existsSync(join(root, 'docs/archive/x/feature/brief.md'))).toBe(true);
    expect(git(root, 'diff', '--name-only').split('\n')).toContain('tests/two-tier.test.mjs');
  });

  it('[AC:spec-13-3] a red rewritten test is held and restored; an unlisted file or no tests.focused refuses before any edit', () => {
    const red = fixture({ focused: `${process.execPath} {files}`, brief: '# Brief: fail\n' });
    const held = archive(red, '--apply', '--rewrite', 'tests/two-tier.test.mjs');
    expect(held.output.status).toBe('held');
    expect(held.output.test.exitCode).toBe(1);
    expect(existsSync(join(red, held.output.test.receipt))).toBe(true);
    expect(existsSync(join(red, source, 'brief.md'))).toBe(true);
    expect(existsSync(join(red, 'docs/archive/x'))).toBe(false);
    expect(git(red, 'status', '--porcelain')).toBe('');
    const unlisted = fixture({ focused: `${process.execPath} {files}` });
    expect(archive(unlisted, '--apply', '--rewrite', 'docs/notes.md').status).toBe(2);
    const noFocused = fixture();
    expect(archive(noFocused, '--apply', '--rewrite', 'tests/two-tier.test.mjs').status).toBe(2);
    for (const root of [unlisted, noFocused]) { expect(git(root, 'status', '--porcelain')).toBe(''); expect(existsSync(join(root, source, 'brief.md'))).toBe(true); }
  });
});
