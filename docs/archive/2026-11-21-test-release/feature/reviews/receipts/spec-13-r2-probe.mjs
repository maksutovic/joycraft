// Spec 13 round-2 interruption probe. Temp git repos only. Run: node spec-13-r2-probe.mjs [case]
import { execFileSync, spawnSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const runtime = join(here, '../../../../../payload/.joycraft/runtime/archive.mjs');
const preload = join(here, 'spec-13-r2-kill.preload.mjs');
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8' }).trim();
const put = (file, body) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const hash = b => createHash('sha256').update(Buffer.from(b)).digest('hex');
// A test that reads the brief through the path it names; PROBE_SLOW waits, PROBE_RED fails.
const briefTest = where => `import { readFileSync } from 'node:fs';\nconst brief = readFileSync('${where}/brief.md', 'utf8');\nconst end = () => process.exit(process.env.PROBE_RED ? 1 : 0);\nif (process.env.PROBE_SLOW) setTimeout(end, Number(process.env.PROBE_SLOW)); else end();\n`;
function fixture(features = ['x'], extra = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'r13r2-')));
  git(root, 'init', '-q', '-b', 'main');
  for (const f of features) {
    const source = `docs/features/${f}`, queuePath = `${source}/specs/.joycraft-spec-queue.json`;
    put(join(root, `${source}/brief.md`), '# Brief\n');
    put(join(root, `${source}/specs/01-a.md`), '---\nid: 1\nstatus: done\n---\n# A\n');
    const decision = JSON.stringify({ schemaVersion: 1, kind: 'legacy', queuePath, statement: 'Accept it as it is.', statedAt: '2026-11-21T00:00:00Z', specs: [1], reason: 'Done before the gates.' });
    put(join(root, `${source}/specs/legacy.json`), decision);
    put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: f, specs: [{ id: 1, file: '01-a.md', status: 'done', mode: 'batch', depends_on: [], verification: { inputs: [] }, ownerAcceptance: { path: `${source}/specs/legacy.json`, sha256: hash(decision), legacy: true } }] }));
    put(join(root, `tests/${f}-a.test.mjs`), briefTest(source));
    put(join(root, `tests/${f}-b.test.mjs`), briefTest(source));
  }
  put(join(root, 'docs/context/decision-log.md'), '# Decisions\n');
  put(join(root, 'src/keep.txt'), 'user source\n');
  put(join(root, '.gitignore'), '.joycraft/local/\n');
  put(join(root, '.joycraft/local/attest.json'), JSON.stringify({ schemaVersion: 1, phase: 'session-end', host: { sessionId: 's', quiescent: true, activeWorkers: [], dependentWork: [] }, durableContext: { carried: true, references: ['docs/context/decision-log.md'] } }));
  for (const [k, v] of Object.entries(extra)) put(join(root, k), v);
  put(join(root, 'joycraft.yaml'), `tests:\n  focused: ${JSON.stringify(`${process.execPath} {files}`)}\n`);
  git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'init');
  return root;
}
const base = f => ['archive', '--feature', f, '--phase', 'session-end', '--attestation', '.joycraft/local/attest.json'];
const rw = f => ['--apply', '--rewrite', `tests/${f}-a.test.mjs`, '--rewrite', `tests/${f}-b.test.mjs`];
function archive(root, f, extra = [], env = {}) {
  const r = spawnSync(process.execPath, [runtime, ...base(f), ...extra], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } });
  let o = null; try { o = JSON.parse(r.stdout); } catch {}
  return { exit: r.status, signal: r.signal, status: o?.status, reason: o?.reason, unchanged: o?.unchanged, stderr: r.stderr.trim().slice(0, 400) };
}
const pendingDir = root => join(root, '.joycraft/local/archive-pending');
const state = (root, files) => ({ git: git(root, 'status', '--porcelain', '--untracked-files=all'), pending: existsSync(pendingDir(root)) ? readdirSync(pendingDir(root)) : [], archive: existsSync(join(root, 'docs/archive')) ? readdirSync(join(root, 'docs/archive')) : null, filesOriginal: Object.fromEntries(files.map(([p, b]) => [p, Buffer.compare(b, readFileSync(join(root, p))) === 0])) });
const show = (name, v) => console.log(`\n=== ${name}\n${JSON.stringify(v, null, 1)}`);
const which = process.argv[2];
const snap = (root, f) => [`tests/${f}-a.test.mjs`, `tests/${f}-b.test.mjs`].map(p => [p, readFileSync(join(root, p))]);
const wait = ms => new Promise(r => setTimeout(r, ms));

// 1. SIGKILL at each stage, then: next call (preview), then a clean green apply.
for (const at of ['before-move', 'between-renames', 'before-rewrite', 'mid-rewrite', 'mid-test', 'after-green', 'after-clear']) {
  if (which && which !== 'stages' && which !== at) continue;
  const root = fixture();
  const orig = snap(root, 'x');
  const killed = archive(root, 'x', rw('x'), { NODE_OPTIONS: `--import=${preload}`, PROBE_KILL_AT: at, PROBE_SLOW: '1500' });
  await wait(2000); // let an orphaned test finish
  show(`${at}: killed run`, { killed, after: state(root, orig) });
  const next = archive(root, 'x');
  show(`${at}: next call (preview)`, { next, after: state(root, orig) });
  const again = archive(root, 'x', rw('x'));
  show(`${at}: apply after recovery`, { again, test: readFileSync(join(root, 'tests/x-a.test.mjs'), 'utf8').match(/readFileSync\('([^']+)/)?.[1], git: git(root, 'status', '--porcelain', '--untracked-files=all').split('\n').length });
}

// 2. Corrupted record and hand-edited records.
if (!which || which === 'records') {
  const kill = { NODE_OPTIONS: `--import=${preload}`, PROBE_KILL_AT: 'mid-test', PROBE_SLOW: '1500' };
  {
    const root = fixture(); const orig = snap(root, 'x');
    archive(root, 'x', rw('x'), kill); await wait(2000);
    writeFileSync(join(pendingDir(root), 'x.json'), '{"kind":"joycraft-archive-pending", trunc');
    show('corrupt record: preview', { r: archive(root, 'x'), after: state(root, orig) });
    show('corrupt record: apply', { r: archive(root, 'x', rw('x')), after: state(root, orig) });
  }
  {
    const root = fixture(); const orig = snap(root, 'x');
    archive(root, 'x', rw('x'), kill); await wait(2000);
    const file = join(pendingDir(root), 'x.json'); const rec = JSON.parse(readFileSync(file, 'utf8'));
    rec.files[0].sha256 = '0'.repeat(64); writeFileSync(file, JSON.stringify(rec));
    show('bad sha record: preview', { r: archive(root, 'x'), after: state(root, orig) });
  }
  {
    // Hand-edited destination: a record whose source is in place (killed before the move) and whose destination names src/.
    const root = fixture(); const orig = snap(root, 'x');
    archive(root, 'x', rw('x'), { ...kill, PROBE_KILL_AT: 'before-move' });
    const file = join(pendingDir(root), 'x.json'); const rec = JSON.parse(readFileSync(file, 'utf8'));
    rec.destination = 'src'; writeFileSync(file, JSON.stringify(rec));
    show('edited destination=src: preview', { r: archive(root, 'x'), srcKeepExists: existsSync(join(root, 'src/keep.txt')), after: state(root, orig) });
  }
  {
    // Hand-edited file path: the record's bytes land on another tracked file.
    const root = fixture(); const orig = snap(root, 'x');
    archive(root, 'x', rw('x'), { ...kill, PROBE_KILL_AT: 'before-move' });
    const file = join(pendingDir(root), 'x.json'); const rec = JSON.parse(readFileSync(file, 'utf8'));
    rec.files[0].path = 'src/keep.txt'; writeFileSync(file, JSON.stringify(rec));
    show('edited file path=src/keep.txt: preview', { r: archive(root, 'x'), keep: readFileSync(join(root, 'src/keep.txt'), 'utf8').slice(0, 40), after: state(root, orig) });
  }
}

// 3. Two features interrupted at once; a shared test names both folders.
if (!which || which === 'two') {
  const shared = `// docs/features/x and docs/features/y\n`;
  for (const order of [['x', 'y'], ['y', 'x']]) {
    const root = fixture(['x', 'y'], { 'tests/shared.test.mjs': shared });
    const orig = [...snap(root, 'x'), ...snap(root, 'y'), ['tests/shared.test.mjs', readFileSync(join(root, 'tests/shared.test.mjs'))]];
    const env = { ...process.env, NODE_OPTIONS: `--import=${preload}`, PROBE_KILL_AT: 'mid-test', PROBE_SLOW: '3000' };
    const start = f => spawn(process.execPath, [runtime, ...base(f), ...rw(f), '--rewrite', 'tests/shared.test.mjs'], { cwd: root, env, stdio: 'ignore' });
    const a = start('x'); await wait(150); const b = start('y');
    await Promise.all([a, b].map(c => new Promise(r => c.once('exit', (code, signal) => r(signal)))));
    await wait(3500);
    show(`two ${order}: after both killed`, { after: state(root, orig), shared: readFileSync(join(root, 'tests/shared.test.mjs'), 'utf8') });
    const r1 = archive(root, order[0]); const r2 = archive(root, order[1]);
    show(`two ${order}: recover ${order[0]} then ${order[1]}`, { r1, r2, after: state(root, orig), shared: readFileSync(join(root, 'tests/shared.test.mjs'), 'utf8') });
  }
  {
    // Sequential: x interrupted, then y archived (green) while x is pending, then x recovered.
    const root = fixture(['x', 'y'], { 'tests/shared.test.mjs': shared });
    archive(root, 'x', [...rw('x'), '--rewrite', 'tests/shared.test.mjs'], { NODE_OPTIONS: `--import=${preload}`, PROBE_KILL_AT: 'mid-test', PROBE_SLOW: '1500' }); await wait(2000);
    const y = archive(root, 'y', [...rw('y'), '--rewrite', 'tests/shared.test.mjs']);
    const x = archive(root, 'x');
    show('sequential x killed, y green, x recovered', { y, x, shared: readFileSync(join(root, 'tests/shared.test.mjs'), 'utf8'), git: git(root, 'status', '--porcelain', '--untracked-files=all') });
  }
}

// 4. A pending record whose destination the user edited after the interruption.
if (!which || which === 'user-edits') {
  const kill = { NODE_OPTIONS: `--import=${preload}`, PROBE_KILL_AT: 'mid-test', PROBE_SLOW: '1500' };
  const root = fixture(); const orig = snap(root, 'x');
  archive(root, 'x', rw('x'), kill); await wait(2000);
  writeFileSync(join(root, 'docs/archive/x/feature/brief.md'), '# Brief\nuser edit in the archived copy\n');
  writeFileSync(join(root, 'docs/archive/x/NOTES.md'), 'user notes written next to the archive\n');
  writeFileSync(join(root, 'tests/x-a.test.mjs'), readFileSync(join(root, 'tests/x-a.test.mjs'), 'utf8') + '// user edit after the interruption\n');
  const r = archive(root, 'x');
  show('user edits: next call', { r, briefKeptEdit: readFileSync(join(root, 'docs/features/x/brief.md'), 'utf8').includes('user edit'), notesExists: existsSync(join(root, 'docs/archive/x/NOTES.md')), testKeptEdit: readFileSync(join(root, 'tests/x-a.test.mjs'), 'utf8').includes('user edit'), after: state(root, orig) });
  // The user restored by hand (git restore) and kept working in the archived copy.
  const root2 = fixture(); const orig2 = snap(root2, 'x');
  archive(root2, 'x', rw('x'), kill); await wait(2000);
  git(root2, 'restore', '.');
  writeFileSync(join(root2, 'docs/archive/x/feature/brief.md'), '# Brief\nuser edit in the archived copy\n');
  const r2 = archive(root2, 'x');
  show('git restore then edit archived copy: next call', { r2, archivedCopyExists: existsSync(join(root2, 'docs/archive/x/feature/brief.md')), sourceHasEdit: readFileSync(join(root2, 'docs/features/x/brief.md'), 'utf8').includes('user edit'), after: state(root2, orig2) });
}
