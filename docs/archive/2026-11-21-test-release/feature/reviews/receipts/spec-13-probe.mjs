import { execFileSync, spawnSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync, symlinkSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
const runtime = '/Users/compiler/Developer/Joycraft/worktrees/joycraft-drift-research/payload/.joycraft/runtime/archive.mjs';
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8' }).trim();
const put = (file, body) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const hash = b => createHash('sha256').update(Buffer.from(b)).digest('hex');
const source = 'docs/features/x';
const briefTest = where => `import { readFileSync } from 'node:fs';\nconst brief = readFileSync('${where}/brief.md', 'utf8');\nif (brief.includes('fail')) process.exit(1);\n`;
function fixture({ brief = '# Brief\n', extra = {}, focused = `${process.execPath} {files}`, ignoreLocal = true, testBody } = {}) {
  const queuePath = `${source}/specs/.joycraft-spec-queue.json`;
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'r13-')));
  git(root, 'init', '-q', '-b', 'main');
  put(join(root, `${source}/brief.md`), brief);
  put(join(root, `${source}/specs/01-a.md`), '---\nid: 1\nstatus: done\n---\n# A\n');
  const decision = JSON.stringify({ schemaVersion: 1, kind: 'legacy', queuePath, statement: 'Accept it as it is.', statedAt: '2026-11-21T00:00:00Z', specs: [1], reason: 'Done before the gates.' });
  put(join(root, `${source}/specs/legacy.json`), decision);
  put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: 'x', specs: [{ id: 1, file: '01-a.md', status: 'done', mode: 'batch', depends_on: [], verification: { inputs: [] }, ownerAcceptance: { path: `${source}/specs/legacy.json`, sha256: hash(decision), legacy: true } }] }));
  put(join(root, 'docs/context/decision-log.md'), '# Decisions\n');
  put(join(root, '.gitignore'), ignoreLocal ? '.joycraft/local/\n' : 'attest.json\n');
  put(join(root, ignoreLocal ? '.joycraft/local/attest.json' : 'attest.json'), JSON.stringify({ schemaVersion: 1, phase: 'session-end', host: { sessionId: 's', quiescent: true, activeWorkers: [], dependentWork: [] }, durableContext: { carried: true, references: ['docs/context/decision-log.md'] } }));
  put(join(root, 'tests/two-tier.test.mjs'), testBody ?? briefTest(source));
  for (const [k, v] of Object.entries(extra)) put(join(root, k), v);
  put(join(root, 'joycraft.yaml'), `tests:\n  focused: ${JSON.stringify(focused)}\n`);
  git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'init');
  return root;
}
const att = root => existsSync(join(root, 'attest.json')) ? 'attest.json' : '.joycraft/local/attest.json';
const archive = (root, ...extra) => { const r = spawnSync(process.execPath, [runtime, 'archive', '--feature', 'x', '--phase', 'session-end', '--attestation', att(root), ...extra], { cwd: root, encoding: 'utf8' }); let o = null; try { o = JSON.parse(r.stdout); } catch {} return { status: r.status, stderr: r.stderr.trim(), out: o }; };
const state = root => ({ status: git(root, 'status', '--porcelain', '--untracked-files=all'), ignored: git(root, 'status', '--porcelain', '--ignored'), sourceThere: existsSync(join(root, source, 'brief.md')), archiveThere: existsSync(join(root, 'docs/archive')), archiveEntries: existsSync(join(root, 'docs/archive')) ? readdirSync(join(root, 'docs/archive')) : null });
const show = (name, v) => console.log(`\n=== ${name}\n${JSON.stringify(v, null, 1)}`);
const which = process.argv[2];

if (!which || which === 'other-feature') {
  const body = `const a = 'docs/features/x/brief.md';\nconst b = 'docs/features/x-two/brief.md';\nconst c = 'packages/app/docs/features/x/y';\nconst d = 'docs/features/x.old';\n`;
  const root = fixture({ extra: { 'tests/multi.test.mjs': body + "process.exit(0);\n" } });
  const p = archive(root); show('other-feature preview', p.out?.plan?.namedFiles);
  const r = archive(root, '--apply', '--rewrite', 'tests/multi.test.mjs'); show('other-feature apply', { status: r.status, s: r.out?.status, err: r.stderr });
  show('other-feature rewritten', readFileSync(join(root, 'tests/multi.test.mjs'), 'utf8'));
}
if (!which || which === 'edits-files') {
  const t = `import { writeFileSync, appendFileSync } from 'node:fs';\nappendFileSync('docs/archive/x/feature/brief.md', 'touched by test\\n');\nwriteFileSync('scripts/other.mjs', 'changed\\n');\nwriteFileSync('newfile.txt', 'x');\n// docs/features/x\nprocess.exit(1);\n`;
  const root = fixture({ testBody: t, extra: { 'scripts/other.mjs': 'orig\n' } });
  const r = archive(root, '--apply', '--rewrite', 'tests/two-tier.test.mjs'); show('edits-files result', { status: r.status, s: r.out?.status, err: r.stderr });
  show('edits-files state', state(root));
}
if (!which || which === 'migration') {
  const root = fixture({ extra: { 'db/migrations/0001_init.sql': `-- seeded from docs/features/x/brief.md\nCREATE TABLE t (id int);\n` } });
  const p = archive(root); show('migration preview', p.out?.plan?.namedFiles);
  const r = archive(root, '--apply', '--rewrite', 'tests/two-tier.test.mjs', '--rewrite', 'db/migrations/0001_init.sql'); show('migration apply', { status: r.status, s: r.out?.status, rewritten: r.out?.rewritten, cmd: r.out?.test?.command });
}
if (!which || which === 'crlf') {
  const t = briefTest(source).replace(/\n/g, '\r\n') + '// café\r\n';
  const red = fixture({ testBody: t, brief: '# fail\n' });
  const before = readFileSync(join(red, 'tests/two-tier.test.mjs'));
  const r = archive(red, '--apply', '--rewrite', 'tests/two-tier.test.mjs');
  show('crlf red', { s: r.out?.status, same: Buffer.compare(before, readFileSync(join(red, 'tests/two-tier.test.mjs'))) === 0, st: state(red) });
  const green = fixture({ testBody: t });
  const g = archive(green, '--apply', '--rewrite', 'tests/two-tier.test.mjs');
  show('crlf green', { s: g.out?.status, crlfKept: readFileSync(join(green, 'tests/two-tier.test.mjs'), 'utf8').includes('\r\n'), diff: git(green, 'diff', '--stat') });
}
if (!which || which === 'latin1') {
  const t = Buffer.concat([Buffer.from(briefTest(source)), Buffer.from([0x2f, 0x2f, 0x20, 0xe9, 0x0a])]);
  const root = fixture({ testBody: t });
  const before = readFileSync(join(root, 'tests/two-tier.test.mjs'));
  const g = archive(root, '--apply', '--rewrite', 'tests/two-tier.test.mjs');
  const after = readFileSync(join(root, 'tests/two-tier.test.mjs'));
  show('latin1 green', { s: g.out?.status, lastBytesBefore: [...before.subarray(-3)], lastBytesAfter: [...after.subarray(-5)] });
}
if (!which || which === 'symlink') {
  const root = fixture({ extra: {} });
  symlinkSync('two-tier.test.mjs', join(root, 'tests/link.test.mjs'));
  symlinkSync('../docs/features/x/brief.md', join(root, 'tests/brief-link.txt'));
  git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'links');
  const p = archive(root); show('symlink preview', p.out?.plan?.namedFiles);
  const r = archive(root, '--apply', '--rewrite', 'tests/link.test.mjs'); show('symlink rewrite', { status: r.status, err: r.stderr });
  const red = fixture({ brief: '# fail\n' });
  symlinkSync('two-tier.test.mjs', join(red, 'tests/link.test.mjs')); git(red, 'add', '.'); git(red, 'commit', '-q', '-m', 'l');
  const h = archive(red, '--apply', '--rewrite', 'tests/two-tier.test.mjs'); show('symlink red', { s: h.out?.status, st: state(red) });
}
if (!which || which === 'receipt') {
  const root = fixture({ ignoreLocal: false, brief: '# fail\n' });
  const r = archive(root, '--apply', '--rewrite', 'tests/two-tier.test.mjs');
  show('receipt no-local red', { status: r.status, s: r.out?.status, test: r.out?.test, st: state(root) });
  const root2 = fixture({ ignoreLocal: false, brief: '# fail\n', extra: { '.joycraft/local/keep.txt': 'tracked\n' } });
  const r2 = archive(root2, '--apply', '--rewrite', 'tests/two-tier.test.mjs');
  show('receipt tracked-local red', { status: r2.status, s: r2.out?.status, test: r2.out?.test, st: state(root2) });
}
if (!which || which === 'unrewritten-also-names') {
  // green but a non-rewritten listed test still names the old folder
  const root = fixture({ extra: { 'tests/b.test.mjs': briefTest(source) } });
  const r = archive(root, '--apply', '--rewrite', 'tests/two-tier.test.mjs'); show('partial rewrite', { s: r.out?.status, cmd: r.out?.test?.command });
}
if (!which || which === 'noflag-refusals') {
  const root = fixture();
  show('rewrite no apply', archive(root, '--rewrite', 'tests/two-tier.test.mjs').status);
  show('rewrite bad path', archive(root, '--apply', '--rewrite', '../x').status);
  show('rewrite dir', archive(root, '--apply', '--rewrite', 'tests').status);
  show('state', state(root));
}
if (which === 'interrupt') {
  const sig = process.argv[3] ?? 'SIGTERM';
  const t = `// docs/features/x\nsetTimeout(() => process.exit(1), 4000);\n`;
  const root = fixture({ testBody: t });
  const child = spawn(process.execPath, [runtime, 'archive', '--feature', 'x', '--phase', 'session-end', '--attestation', att(root), '--apply', '--rewrite', 'tests/two-tier.test.mjs'], { cwd: root, detached: true, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1500));
  if (process.argv[4] === 'group') process.kill(-child.pid, sig); else child.kill(sig);
  await new Promise(r => setTimeout(r, 4500));
  show(`interrupt ${sig} ${process.argv[4] ?? 'parent'} state`, { ...state(root), test: readFileSync(join(root, 'tests/two-tier.test.mjs'), 'utf8') });
  const again = archive(root); show('rerun preview', { status: again.status, s: again.out?.status, unchanged: again.out?.unchanged, err: again.stderr });
  const again2 = archive(root, '--apply', '--rewrite', 'tests/two-tier.test.mjs'); show('rerun apply', { status: again2.status, s: again2.out?.status, unchanged: again2.out?.unchanged, err: again2.stderr });
}
