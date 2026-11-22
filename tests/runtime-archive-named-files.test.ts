import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

const runtime = join(__dirname, '..', 'payload', '.joycraft', 'runtime', 'archive.mjs');
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string | Buffer) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const hash = (body: string) => createHash('sha256').update(Buffer.from(body)).digest('hex');
const source = 'docs/features/x';

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true, maxRetries: 5 }); });

// The test reads the brief and fails when it is missing or says "fail".
const briefTest = (where: string) => `import { readFileSync } from 'node:fs';\n// two-tier\nconst brief = readFileSync('${where}/brief.md', 'utf8');\nif (brief.includes('fail')) process.exit(1);\n`;

/** A done, legacy-accepted feature folder. */
function addFeature(root: string, feature: string, brief = '# Brief\n') {
  const folder = `docs/features/${feature}`, queuePath = `${folder}/specs/.joycraft-spec-queue.json`;
  put(join(root, `${folder}/brief.md`), brief);
  put(join(root, `${folder}/specs/01-a.md`), '---\nid: 1\nstatus: done\n---\n# A\n');
  const decision = JSON.stringify({ schemaVersion: 1, kind: 'legacy', queuePath, statement: 'Accept it as it is.', statedAt: '2026-11-21T00:00:00Z', specs: [1], reason: 'Done before the gates.' });
  put(join(root, `${folder}/specs/legacy.json`), decision);
  put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature, specs: [{ id: 1, file: '01-a.md', status: 'done', mode: 'batch', depends_on: [], verification: { inputs: [] }, ownerAcceptance: { path: `${folder}/specs/legacy.json`, sha256: hash(decision), legacy: true } }] }));
}

/** A done feature `x` (legacy-accepted), a test and a script that name it, and an optional tests.focused. */
function fixture({ focused, brief = '# Brief\n', testBody, extra = {}, more = [] }: { focused?: string; brief?: string; testBody?: string | Buffer; extra?: Record<string, string>; more?: string[] } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-archive-named-')));
  dirs.push(root);
  git(root, 'init', '-q', '-b', 'main');
  addFeature(root, 'x', brief);
  for (const feature of more) addFeature(root, feature);
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

const archiveAs = (feature: string, root: string, extra: string[] = [], env: Record<string, string> = {}) => {
  const result = spawnSync(process.execPath, [runtime, 'archive', '--feature', feature, '--phase', 'session-end', '--attestation', '.joycraft/local/attest.json', ...extra], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } });
  return { status: result.status, signal: result.signal, stderr: result.stderr, output: result.stdout ? JSON.parse(result.stdout) : null };
};
const archive = (root: string, ...extra: string[]) => archiveAs('x', root, extra);

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

// A preload that SIGKILLs archive at one point: between the two renames, or when it starts the test run.
const preloadHome = realpathSync(mkdtempSync(join(tmpdir(), 'jc-archive-kill-')));
afterAll(() => rmSync(preloadHome, { recursive: true, force: true }));
const preload = join(preloadHome, 'kill.mjs');
writeFileSync(preload, `import fs from 'node:fs';
import cp from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
const at = process.env.JC_KILL_AT;
const die = () => process.kill(process.pid, 'SIGKILL');
if (at) {
  const rename = fs.renameSync, spawn = cp.spawn;
  fs.renameSync = function (from, to) { if (at === 'between-renames' && String(from).includes('.staging-') && !String(to).includes('.staging-')) die(); return rename.apply(this, arguments); };
  cp.spawn = function () { if (at === 'test') die(); return spawn.apply(this, arguments); };
  syncBuiltinESMExports();
}
`);
const focused = `${process.execPath} {files}`;
const pendingRecord = (root: string, feature = 'x') => join(root, `.joycraft/local/archive-pending/${feature}.json`);
const status = (root: string) => git(root, 'status', '--porcelain', '--untracked-files=all');
const shared = '// docs/features/x and docs/features/y\nprocess.exit(0);\n';

/** Run --apply --rewrite and SIGKILL it at `at`; the folder is moved and the files rewritten. */
function interrupt(root: string, feature: string, rewrite: string[], at = 'test') {
  const killed = archiveAs(feature, root, ['--apply', ...rewrite.flatMap(file => ['--rewrite', file])], { NODE_OPTIONS: `--import=${preload}`, JC_KILL_AT: at });
  expect(killed.signal).toBe('SIGKILL');
  expect(existsSync(pendingRecord(root, feature))).toBe(true);
}

/** A held result that changed nothing: what differs and the manual steps, never archived. */
function expectUnverified(result: ReturnType<typeof archive>) {
  expect(result.status, result.stderr).toBe(2);
  expect(result.output).toMatchObject({ status: 'held', reason: 'interrupted-unverified' });
  expect(result.output.differences.length).toBeGreaterThan(0);
  expect(result.output.steps.join('\n')).toMatch(/Delete \.joycraft\/local\/archive-pending\/x\.json, then archive again/);
  return result.output;
}

describe('archive review 13 round 2 fixes', () => {
  it('[review-13-r2-1] a user note added in the archive folder holds and keeps everything', () => {
    const root = fixture({ focused });
    interrupt(root, 'x', ['tests/two-tier.test.mjs']);
    writeFileSync(join(root, 'docs/archive/x/NOTES.md'), 'my notes\n');
    const before = status(root), test = readFileSync(join(root, 'tests/two-tier.test.mjs'));
    const held = expectUnverified(archive(root));
    expect(held.differences).toContain('docs/archive/x/NOTES.md was not placed there by archive');
    expect(readFileSync(join(root, 'docs/archive/x/NOTES.md'), 'utf8')).toBe('my notes\n');
    expect(Buffer.compare(test, readFileSync(join(root, 'tests/two-tier.test.mjs')))).toBe(0);
    expect(status(root)).toBe(before);
    expect(existsSync(pendingRecord(root))).toBe(true);
    // An apply holds the same way and archives nothing.
    expect(archive(root, '--apply', '--rewrite', 'tests/two-tier.test.mjs').output.reason).toBe('interrupted-unverified');
    expect(status(root)).toBe(before);
  });

  it('[review-13-r2-1] a test edited after the interruption keeps the edit and holds', () => {
    const root = fixture({ focused });
    interrupt(root, 'x', ['tests/two-tier.test.mjs']);
    const edited = `${readFileSync(join(root, 'tests/two-tier.test.mjs'), 'utf8')}// my edit\n`;
    writeFileSync(join(root, 'tests/two-tier.test.mjs'), edited);
    const before = status(root);
    expect(expectUnverified(archive(root)).differences).toContain('tests/two-tier.test.mjs changed after archive rewrote it');
    expect(readFileSync(join(root, 'tests/two-tier.test.mjs'), 'utf8')).toBe(edited);
    expect(existsSync(join(root, 'docs/archive/x/feature/brief.md'))).toBe(true);
    expect(status(root)).toBe(before);
  });

  it('[review-13-r2-1] after git restore, an edit in the archived copy is kept and the call holds', () => {
    const root = fixture({ focused });
    interrupt(root, 'x', ['tests/two-tier.test.mjs']);
    git(root, 'restore', '.');
    writeFileSync(join(root, 'docs/archive/x/feature/brief.md'), '# Brief\nmy edit\n');
    const before = status(root);
    expect(expectUnverified(archive(root)).differences.join('\n')).toMatch(/exactly one of docs\/features\/x/);
    expect(readFileSync(join(root, 'docs/archive/x/feature/brief.md'), 'utf8')).toBe('# Brief\nmy edit\n');
    expect(existsSync(join(root, source, 'brief.md'))).toBe(true);
    expect(status(root)).toBe(before);
  });

  it("[review-13-r2-1] a sibling feature's later green rewrite of a shared test is kept", () => {
    const root = fixture({ focused, more: ['y'], extra: { 'tests/shared.test.mjs': shared } });
    interrupt(root, 'x', ['tests/two-tier.test.mjs', 'tests/shared.test.mjs']);
    const y = archiveAs('y', root, ['--apply', '--rewrite', 'tests/shared.test.mjs']);
    expect(y.output.status, y.stderr).toBe('archived');
    const afterY = readFileSync(join(root, 'tests/shared.test.mjs'), 'utf8');
    expect(afterY).toBe('// docs/archive/x/feature and docs/archive/y/feature\nprocess.exit(0);\n');
    const before = status(root);
    expect(expectUnverified(archive(root)).differences).toContain('tests/shared.test.mjs changed after archive rewrote it');
    expect(readFileSync(join(root, 'tests/shared.test.mjs'), 'utf8')).toBe(afterY);
    expect(existsSync(join(root, 'docs/archive/y/feature/brief.md'))).toBe(true);
    expect(status(root)).toBe(before);
  });

  it('[review-13-r2-1] two interrupted features sharing a test: the wrong order holds, the right order restores all', () => {
    const root = fixture({ focused, more: ['y'], extra: { 'tests/shared.test.mjs': shared } });
    interrupt(root, 'x', ['tests/two-tier.test.mjs', 'tests/shared.test.mjs']);
    interrupt(root, 'y', ['tests/shared.test.mjs']);
    const before = status(root);
    expect(expectUnverified(archive(root)).differences).toContain('tests/shared.test.mjs changed after archive rewrote it');
    expect(status(root)).toBe(before);
    expect(archiveAs('y', root).output).toMatchObject({ status: 'held', reason: 'interrupted' });
    expect(archive(root).output).toMatchObject({ status: 'held', reason: 'interrupted' });
    expect(readFileSync(join(root, 'tests/shared.test.mjs'), 'utf8')).toBe(shared);
    expect(status(root)).toBe('');
    expect(existsSync(join(root, 'docs/archive'))).toBe(false);
  });

  it('[review-13-r2-1] a hand-edited record pointing at src is refused and touches nothing', () => {
    for (const edit of [{ destination: 'src' }, { stage: 'src' }, { source: 'src' }, { createdHome: ['src'] }, { files: 'src/keep.txt' }]) {
      const root = fixture({ focused, extra: { 'src/keep.txt': 'user source\n' } });
      interrupt(root, 'x', ['tests/two-tier.test.mjs']);
      const record = JSON.parse(readFileSync(pendingRecord(root), 'utf8'));
      if ('files' in edit) record.files[0].path = edit.files; else Object.assign(record, edit);
      writeFileSync(pendingRecord(root), JSON.stringify(record));
      const before = status(root);
      const held = expectUnverified(archive(root));
      expect(held.differences.join('\n'), JSON.stringify(edit)).toMatch(/the pending record is refused/);
      expect(readFileSync(join(root, 'src/keep.txt'), 'utf8')).toBe('user source\n');
      expect(existsSync(join(root, 'docs/archive/x/feature/brief.md'))).toBe(true);
      expect(status(root)).toBe(before);
    }
  });

  it('[review-13-r2-2] a kill between the two renames is recovered from the staging folder', () => {
    const root = fixture({ focused });
    interrupt(root, 'x', ['tests/two-tier.test.mjs'], 'between-renames');
    expect(existsSync(join(root, source))).toBe(false);
    const recovered = archive(root);
    expect(recovered.status, recovered.stderr).toBe(2);
    expect(recovered.output).toMatchObject({ status: 'held', reason: 'interrupted' });
    expect(existsSync(join(root, source, 'brief.md'))).toBe(true);
    expect(existsSync(join(root, 'docs/archive'))).toBe(false);
    expect(existsSync(pendingRecord(root))).toBe(false);
    expect(status(root)).toBe('');
    expect(archive(root, '--apply', '--rewrite', 'tests/two-tier.test.mjs').output.status).toBe('archived');
  });

  it('[review-13-r2-3] a truncated record holds with recovery steps and changes nothing', () => {
    const root = fixture({ focused });
    interrupt(root, 'x', ['tests/two-tier.test.mjs']);
    writeFileSync(pendingRecord(root), '{"kind":"joycraft-archive-pending", trunc');
    const before = status(root);
    const held = expectUnverified(archive(root));
    expect(held.differences[0]).toMatch(/is not a readable JSON record/);
    expect(held.steps.join('\n')).toMatch(/git restore -- <file>/);
    expect(held.steps.join('\n')).toMatch(/move the feature folder back to it from docs\/archive\/x\/feature/);
    expect(status(root)).toBe(before);
    expect(existsSync(pendingRecord(root))).toBe(true);
  });

  it('[review-13-r2-4] a green rewrite keeps bytes that are not UTF-8', () => {
    const tail = Buffer.from([0x2f, 0x2f, 0x20, 0xe9, 0xff, 0xfe, 0x0a]);
    const root = fixture({ focused, testBody: Buffer.concat([Buffer.from(briefTest(source)), tail]) });
    const result = archive(root, '--apply', '--rewrite', 'tests/two-tier.test.mjs');
    expect(result.output.status, result.stderr).toBe('archived');
    expect(Buffer.compare(readFileSync(join(root, 'tests/two-tier.test.mjs')), Buffer.concat([Buffer.from(briefTest('docs/archive/x/feature')), tail]))).toBe(0);
  });
});
