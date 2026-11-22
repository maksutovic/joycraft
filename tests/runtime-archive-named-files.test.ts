import { execFileSync, spawn, spawnSync } from 'node:child_process';
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
function fixture({ focused, brief = '# Brief\n', testBody, extra = {} }: { focused?: string; brief?: string; testBody?: string; extra?: Record<string, string> } = {}) {
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
  put(join(root, 'tests/two-tier.test.mjs'), testBody ?? briefTest(source));
  put(join(root, 'scripts/x.mjs'), `export const folder = '${source}';\n`);
  put(join(root, 'docs/notes.md'), `See ${source}.\n`);
  for (const [file, body] of Object.entries(extra)) put(join(root, file), body);
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

// A red test that records its pid (it leads its own process group) and fails after a pause.
const slowRed = `import { writeFileSync } from 'node:fs';\n// docs/features/x\nwriteFileSync('.joycraft/local/test.pid', String(process.pid));\nsetTimeout(() => process.exit(1), 4000);\n`;
const until = async (check: () => boolean, ms = 10000) => { for (const end = Date.now() + ms; Date.now() < end;) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 50)); } throw new Error('timed out'); };

/** Start --apply --rewrite in its own process group and wait until the slow test is running. */
async function startSlowArchive(root: string) {
  const child = spawn(process.execPath, [runtime, 'archive', '--feature', 'x', '--phase', 'session-end', '--attestation', '.joycraft/local/attest.json', '--apply', '--rewrite', 'tests/two-tier.test.mjs'], { cwd: root, detached: true, stdio: 'ignore' });
  const exited = new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal })));
  await until(() => existsSync(join(root, '.joycraft/local/test.pid')));
  return { child, exited, testPid: Number(readFileSync(join(root, '.joycraft/local/test.pid'), 'utf8')) };
}

describe('archive review 13 fixes', () => {
  it('[review-13-1] SIGTERM during the test run restores and moves back; a rerun is held', async () => {
    const root = fixture({ focused: `${process.execPath} {files}`, testBody: slowRed });
    const before = readFileSync(join(root, 'tests/two-tier.test.mjs'));
    const { child, exited } = await startSlowArchive(root);
    expect(existsSync(join(root, 'docs/archive/x/feature/brief.md'))).toBe(true);
    child.kill('SIGTERM');
    expect(await exited).toEqual({ code: 128 + 15, signal: null });
    expect(Buffer.compare(before, readFileSync(join(root, 'tests/two-tier.test.mjs')))).toBe(0);
    expect(existsSync(join(root, source, 'brief.md'))).toBe(true);
    expect(existsSync(join(root, 'docs/archive'))).toBe(false);
    expect(existsSync(join(root, '.joycraft/local/archive-pending/x.json'))).toBe(false);
    expect(git(root, 'status', '--porcelain')).toBe('');
    const rerun = archive(root, '--apply', '--rewrite', 'tests/two-tier.test.mjs');
    expect(rerun.status).toBe(2);
    expect(rerun.output.status).toBe('held');
    expect(existsSync(join(root, source, 'brief.md'))).toBe(true);
    expect(git(root, 'status', '--porcelain')).toBe('');
  }, 30000);

  it('[review-13-1] SIGKILL of the archive and its test leaves a pending record; any rerun restores it and is held', async () => {
    const root = fixture({ focused: `${process.execPath} {files}`, testBody: slowRed });
    const before = readFileSync(join(root, 'tests/two-tier.test.mjs'));
    const { child, exited, testPid } = await startSlowArchive(root);
    process.kill(-testPid, 'SIGKILL');
    process.kill(-child.pid!, 'SIGKILL');
    await exited;
    // Nothing could run: the folder is moved and the test rewritten.
    expect(existsSync(join(root, 'docs/archive/x/feature/brief.md'))).toBe(true);
    expect(Buffer.compare(before, readFileSync(join(root, 'tests/two-tier.test.mjs')))).not.toBe(0);
    expect(existsSync(join(root, '.joycraft/local/archive-pending/x.json'))).toBe(true);
    const preview = archive(root);
    expect(preview.status).toBe(2);
    expect(preview.output).toMatchObject({ status: 'held', reason: 'interrupted', rewritten: ['tests/two-tier.test.mjs'] });
    expect(Buffer.compare(before, readFileSync(join(root, 'tests/two-tier.test.mjs')))).toBe(0);
    expect(existsSync(join(root, source, 'brief.md'))).toBe(true);
    expect(existsSync(join(root, 'docs/archive'))).toBe(false);
    expect(existsSync(join(root, '.joycraft/local/archive-pending/x.json'))).toBe(false);
    expect(git(root, 'status', '--porcelain')).toBe('');
    expect(archive(root).output.status).toBe('preview');
  }, 30000);

  it('[review-13-2] only the features home path with a path boundary names the folder', () => {
    const body = `const a = './docs/features/x/brief.md';\nconst b = 'packages/app/docs/features/x/y';\nconst c = 'docs/features/x.old';\nconst d = 'docs/features/x-two';\nprocess.exit(0);\n`;
    const root = fixture({ focused: `${process.execPath} {files}`, extra: { 'tests/multi.test.mjs': body, 'scripts/nested.mjs': "export const p = 'packages/app/docs/features/x/y';\n", 'scripts/old.mjs': "export const p = 'docs/features/x.old';\n" } });
    const listed = archive(root).output.plan.namedFiles.map((file: { path: string }) => file.path);
    expect(listed).toContain('tests/multi.test.mjs');
    expect(listed).not.toContain('scripts/nested.mjs');
    expect(listed).not.toContain('scripts/old.mjs');
    const result = archive(root, '--apply', '--rewrite', 'tests/multi.test.mjs');
    expect(result.output.status, result.stderr).toBe('archived');
    expect(readFileSync(join(root, 'tests/multi.test.mjs'), 'utf8')).toBe(body.replace('./docs/features/x/brief.md', './docs/archive/x/feature/brief.md'));
  });

  it('[review-13-4] [review-13-5] a red run reports what the test itself changed and leaves no empty archive home', () => {
    const red = `import { writeFileSync } from 'node:fs';\n// docs/features/x\nwriteFileSync('scripts/x.mjs', 'changed\\n');\nwriteFileSync('newfile.txt', 'x');\nprocess.exit(1);\n`;
    const root = fixture({ focused: `${process.execPath} {files}`, testBody: red });
    const held = archive(root, '--apply', '--rewrite', 'tests/two-tier.test.mjs');
    expect(held.output.status).toBe('held');
    expect(held.output.testChanged.sort()).toEqual(['newfile.txt', 'scripts/x.mjs']);
    expect(existsSync(join(root, 'docs/archive'))).toBe(false);
    expect(readFileSync(join(root, 'tests/two-tier.test.mjs'), 'utf8')).toBe(red);
  });

  it('[review-13-6] a migration is listed report-only and --rewrite of it refuses before any edit', () => {
    const root = fixture({ focused: `${process.execPath} {files}`, extra: { 'db/migrations/0001_init.sql': `-- from ${source}/brief.md\nCREATE TABLE t (id int);\n` } });
    expect(archive(root).output.plan.namedFiles).toContainEqual({ path: 'db/migrations/0001_init.sql', line: 1, test: false, reportOnly: true });
    const refused = archive(root, '--apply', '--rewrite', 'tests/two-tier.test.mjs', '--rewrite', 'db/migrations/0001_init.sql');
    expect(refused.status).toBe(2);
    expect(refused.stderr).toMatch(/migration/);
    expect(git(root, 'status', '--porcelain')).toBe('');
    expect(existsSync(join(root, source, 'brief.md'))).toBe(true);
  });

  it('[review-13-7] tests.focused is split into shell words, so a quoted argument stays one word', () => {
    const root = fixture({ focused: `${process.execPath} --title "joycraft archive" {files}` });
    const result = archive(root, '--apply', '--rewrite', 'tests/two-tier.test.mjs');
    expect(result.output.status, result.stderr).toBe('archived');
    expect(result.output.test.exitCode).toBe(0);
  });
});
