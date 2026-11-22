// Spec 13 round-3 probe: concurrent calls, a user edit during staging, folder-name reuse, large files.
// Temp git repos only. Run: node spec-13-r3-probe.mjs [case]
import { execFileSync, spawnSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const runtime = join(here, '../../../../../payload/.joycraft/runtime/archive.mjs');
const kill = join(here, 'spec-13-r2-kill.preload.mjs');
const editPre = join(here, 'spec-13-r3-edit.preload.mjs');
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', maxBuffer: 1 << 30 }).trim();
const put = (file, body) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const hash = b => createHash('sha256').update(Buffer.from(b)).digest('hex');
// Reads the brief at start (so a later move back does not fail it), then waits PROBE_SLOW ms.
const briefTest = where => `import { readFileSync } from 'node:fs';\nconst brief = readFileSync('${where}/brief.md', 'utf8');\nconst end = () => process.exit(process.env.PROBE_RED ? 1 : 0);\nif (process.env.PROBE_SLOW) setTimeout(end, Number(process.env.PROBE_SLOW)); else end();\n`;
function fixture(features = ['x'], extra = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'r13r3-')));
  git(root, 'init', '-q', '-b', 'main');
  for (const f of features) {
    const source = `docs/features/${f}`, queuePath = `${source}/specs/.joycraft-spec-queue.json`;
    put(join(root, `${source}/brief.md`), '# Brief\n');
    put(join(root, `${source}/specs/01-a.md`), '---\nid: 1\nstatus: done\n---\n# A\n');
    const decision = JSON.stringify({ schemaVersion: 1, kind: 'legacy', queuePath, statement: 'Accept it as it is.', statedAt: '2026-11-21T00:00:00Z', specs: [1], reason: 'Done before the gates.' });
    put(join(root, `${source}/specs/legacy.json`), decision);
    put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: f.replace(/^\d{4}-\d{2}-\d{2}-/, ''), specs: [{ id: 1, file: '01-a.md', status: 'done', mode: 'batch', depends_on: [], verification: { inputs: [] }, ownerAcceptance: { path: `${source}/specs/legacy.json`, sha256: hash(decision), legacy: true } }] }));
    const t = f.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    put(join(root, `tests/${t}-a.test.mjs`), briefTest(source));
    put(join(root, `tests/${t}-b.test.mjs`), briefTest(source));
  }
  put(join(root, 'docs/context/decision-log.md'), '# Decisions\n');
  put(join(root, '.gitignore'), '.joycraft/local/\n');
  put(join(root, '.joycraft/local/attest.json'), JSON.stringify({ schemaVersion: 1, phase: 'session-end', host: { sessionId: 's', quiescent: true, activeWorkers: [], dependentWork: [] }, durableContext: { carried: true, references: ['docs/context/decision-log.md'] } }));
  for (const [k, v] of Object.entries(extra)) put(join(root, k), v);
  put(join(root, 'joycraft.yaml'), `tests:\n  focused: ${JSON.stringify(`${process.execPath} {files}`)}\n`);
  git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'init');
  return root;
}
const base = f => ['archive', '--feature', f, '--phase', 'session-end', '--attestation', '.joycraft/local/attest.json'];
const rw = f => ['--apply', '--rewrite', `tests/${f}-a.test.mjs`, '--rewrite', `tests/${f}-b.test.mjs`];
const parse = (stdout, code, signal, stderr) => { let o = null; try { o = JSON.parse(stdout); } catch {} return { exit: code, signal, status: o?.status, reason: o?.reason, unchanged: o?.unchanged, differences: o?.differences, stderr: String(stderr).trim().slice(0, 500) }; };
function archive(root, f, extra = [], env = {}) {
  const r = spawnSync(process.execPath, [runtime, ...base(f), ...extra], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 1 << 30 });
  return parse(r.stdout, r.status, r.signal, r.stderr + (r.error ? ` ${r.error.message}` : ''));
}
function archiveAsync(root, f, extra = [], env = {}) {
  const c = spawn(process.execPath, [runtime, ...base(f), ...extra], { cwd: root, env: { ...process.env, ...env } });
  let out = '', err = ''; c.stdout.on('data', d => { out += d; }); c.stderr.on('data', d => { err += d; });
  return new Promise(r => c.once('close', (code, signal) => r(parse(out, code, signal, err))));
}
const pendingDir = root => join(root, '.joycraft/local/archive-pending');
const where = (root, f = 'x') => ({ source: existsSync(join(root, `docs/features/${f}/brief.md`)), archived: existsSync(join(root, `docs/archive/${f}/feature/brief.md`)), pending: existsSync(pendingDir(root)) ? readdirSync(pendingDir(root)) : [], archive: existsSync(join(root, 'docs/archive')) ? readdirSync(join(root, 'docs/archive')) : null });
const text = (root, p) => existsSync(join(root, p)) ? readFileSync(join(root, p), 'utf8') : null;
const show = (name, v) => console.log(`\n=== ${name}\n${JSON.stringify(v, null, 1)}`);
const wait = ms => new Promise(r => setTimeout(r, ms));
const which = process.argv[2];

// 1. Concurrency on one feature.
if (!which || which === 'concurrent') {
  {
    // A: --apply --rewrite with a 3 s green test; B: a plain preview 1 s later.
    const root = fixture();
    const a = archiveAsync(root, 'x', rw('x'), { PROBE_SLOW: '3000' });
    await wait(1000);
    const b = archive(root, 'x');
    const mid = where(root);
    const ra = await a;
    show('concurrent apply + preview', { preview: b, stateAfterPreview: mid, apply: ra, final: where(root), testA: text(root, 'tests/x-a.test.mjs').split('\n')[1], git: git(root, 'status', '--porcelain') });
  }
  {
    // Two --apply --rewrite started 50 ms apart.
    const root = fixture();
    const a = archiveAsync(root, 'x', rw('x'), { PROBE_SLOW: '2000' });
    await wait(50);
    const b = archiveAsync(root, 'x', rw('x'), { PROBE_SLOW: '2000' });
    const [ra, rb] = await Promise.all([a, b]);
    show('two concurrent applies (50 ms)', { a: ra, b: rb, final: where(root), testA: text(root, 'tests/x-a.test.mjs').split('\n')[1], git: git(root, 'status', '--porcelain') });
  }
  {
    // Two --apply --rewrite started 600 ms apart (the first is in its test run).
    const root = fixture();
    const a = archiveAsync(root, 'x', rw('x'), { PROBE_SLOW: '2500' });
    await wait(600);
    const b = archiveAsync(root, 'x', rw('x'), { PROBE_SLOW: '500' });
    const [ra, rb] = await Promise.all([a, b]);
    show('two concurrent applies (600 ms)', { a: ra, b: rb, final: where(root), testA: text(root, 'tests/x-a.test.mjs').split('\n')[1], git: git(root, 'status', '--porcelain') });
  }
}

// 2. A user saves a listed test while archive stages.
if (!which || which === 'edit-race') {
  for (const red of [false, true]) {
    const root = fixture();
    const env = { NODE_OPTIONS: `--import=${editPre}`, PROBE_EDIT_AT: 'staging', PROBE_EDIT_FILE: join(root, 'tests/x-a.test.mjs'), ...(red ? { PROBE_RED: '1' } : {}) };
    const r = archive(root, 'x', rw('x'), env);
    show(`edit during staging, ${red ? 'red' : 'green'}`, { r, userEditKept: text(root, 'tests/x-a.test.mjs').includes('user edit saved'), state: where(root) });
  }
}

// 3. Folder name reused after an interruption.
if (!which || which === 'reuse') {
  {
    const root = fixture();
    archive(root, 'x', rw('x'), { NODE_OPTIONS: `--import=${kill}`, PROBE_KILL_AT: 'between-renames' });
    // The user does not see the staging folder and starts a new feature x.
    put(join(root, 'docs/features/x/brief.md'), '# New brief for a new feature x\n');
    const r = archive(root, 'x');
    show('reuse after between-renames kill', { r, newBrief: text(root, 'docs/features/x/brief.md'), stage: readdirSync(join(root, 'docs/archive')).map(d => [d, existsSync(join(root, 'docs/archive', d, 'feature/brief.md'))]), state: where(root) });
  }
  {
    const root = fixture();
    archive(root, 'x', rw('x'), { NODE_OPTIONS: `--import=${kill}`, PROBE_KILL_AT: 'mid-test', PROBE_SLOW: '1500' }); await wait(2000);
    // The user cleans up by hand but leaves the record, then reuses the name with new work and the same tests.
    rmSync(join(root, 'docs/archive'), { recursive: true }); git(root, 'restore', '.');
    writeFileSync(join(root, 'docs/features/x/brief.md'), '# Brief\nnew work after reuse\n');
    const r = archive(root, 'x');
    show('reuse after manual cleanup with the record left', { r, brief: text(root, 'docs/features/x/brief.md'), state: where(root) });
    const again = archive(root, 'x', rw('x'));
    show('reuse: archive again', { again, state: where(root), test: text(root, 'tests/x-a.test.mjs').split('\n')[1] });
  }
  {
    // A dated folder's record and a later dated folder of the same feature name.
    const root = fixture(['2026-11-01-x']);
    archive(root, 'x', rw('x'), { NODE_OPTIONS: `--import=${kill}`, PROBE_KILL_AT: 'mid-test', PROBE_SLOW: '1500' }); await wait(2000);
    writeFileSync(join(root, 'tests/x-a.test.mjs'), text(root, 'tests/x-a.test.mjs') + '// user edit\n');
    const r = archive(root, 'x');
    show('dated record x, user edit', { r: { ...r, differences: r.differences }, state: where(root, '2026-11-01-x') });
    const full = archive(root, '2026-11-01-x');
    show('dated record, full name', { full: { status: full.status, reason: full.reason, exit: full.exit } });
  }
}

// 4. Very large rewritten files.
if (!which || which === 'large') {
  for (const mb of [100, 420]) {
    const line = `// docs/features/x/brief.md\n`;
    const root = fixture(['x'], { 'tests/fixtures/big.json': '' });
    const big = Buffer.alloc(mb * 1024 * 1024, 0x61); Buffer.from(line).copy(big, 0); big[big.length - 1] = 0x0a;
    writeFileSync(join(root, 'tests/fixtures/big.json'), big); git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'big');
    const before = hash(big);
    const t0 = Date.now();
    const preview = spawnSync(process.execPath, [runtime, ...base('x')], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 30 });
    let listed = null; try { listed = JSON.parse(preview.stdout).plan.namedFiles.map(f => f.path); } catch {}
    const killed = archive(root, 'x', [...rw('x'), '--rewrite', 'tests/fixtures/big.json'], { NODE_OPTIONS: `--import=${kill}`, PROBE_KILL_AT: 'mid-test', PROBE_SLOW: '1500' }); await wait(2000);
    const pendingSize = existsSync(join(pendingDir(root), 'x.json')) ? statSync(join(pendingDir(root), 'x.json')).size : null;
    const r = archive(root, 'x');
    const after = hash(readFileSync(join(root, 'tests/fixtures/big.json')));
    const green = archive(root, 'x', [...rw('x'), '--rewrite', 'tests/fixtures/big.json']);
    show(`large ${mb} MB`, { previewExit: preview.status, previewErr: preview.stderr.slice(0, 300), listed, killed, pendingSize, recover: r, restoredExact: before === after, green, state: where(root), seconds: (Date.now() - t0) / 1000 });
    rmSync(root, { recursive: true, force: true });
  }
}
