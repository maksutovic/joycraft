// Reviewer probe for test-release spec 9 (evidence.mjs run --patch).
// Usage: node spec-09-probe.mjs <project-root>
// Drives payload/.joycraft/runtime/evidence.mjs as a CLI against temp Git fixtures only,
// trying to leave a fixture tree changed. Prints one line per probe: SAFE, LEAK or NOTE.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const repo = path.resolve(process.argv[2] ?? '.');
const script = path.join(repo, 'payload/.joycraft/runtime/evidence.mjs');
const dirs = [];
let leaks = 0;
const line = (tag, name, detail = '') => { if (tag === 'LEAK') leaks++; console.log(`${tag} ${name}${detail ? ` :: ${detail}` : ''}`); };
const sha = file => (existsSync(file) ? createHash('sha256').update(readFileSync(file)).digest('hex') : null);
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const status = root => git(root, 'status', '--porcelain', '--ignored=no');
const node = (...args) => [process.execPath, ...args];

/** Snapshot every file under root except .git (path -> sha256 + mode), plus HEAD, index entries and stash. */
function snapshot(root) {
  const files = {};
  const walk = dir => { for (const name of readdirSync(dir)) { const full = path.join(dir, name); const rel = path.relative(root, full); if (rel === '.git' || rel.split('/').includes('receipts')) continue; const st = statSync(full, { throwIfNoEntry: false }) ?? null; if (st?.isDirectory()) { files[`${rel}/`] = 'dir'; walk(full); } else files[rel] = `${sha(full)}:${st ? (st.mode & 0o777).toString(8) : 'link'}`; } };
  walk(root);
  let stash = ''; try { stash = git(root, 'stash', 'list'); } catch {}
  return JSON.stringify({ files, head: git(root, 'rev-parse', 'HEAD').trim(), index: git(root, 'ls-files', '-s'), stash, gitconfig: sha(path.join(root, '.git/config')) });
}

/** A committed fixture. setup(root) edits files after the commit; the diff becomes receipts/fault.diff; then the tree is reset. */
function fixture(files, setup, diffArgs = []) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'jc-r9-probe-')));
  dirs.push(root);
  git(root, 'init', '-q');
  writeFileSync(path.join(root, '.gitignore'), 'receipts/\n');
  for (const [name, body] of Object.entries(files)) { mkdirSync(path.dirname(path.join(root, name)), { recursive: true }); writeFileSync(path.join(root, name), body); }
  git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'init');
  mkdirSync(path.join(root, 'receipts'));
  if (setup) {
    setup(root);
    git(root, 'add', '-A');
    writeFileSync(path.join(root, 'receipts/fault.diff'), git(root, 'diff', '--cached', ...diffArgs));
    git(root, 'reset', '-q', '--hard'); git(root, 'clean', '-fdq', '-e', 'receipts');
  }
  return root;
}
let n = 0;
const run = (root, command, extra = [], patch = 'receipts/fault.diff', env = process.env) => spawnSync(process.execPath, [script, 'run', '--receipt', `receipts/r${++n}.log`, '--patch', patch, ...extra, '--', ...command], { cwd: root, encoding: 'utf8', env });
const parse = out => { try { return JSON.parse(out.stdout); } catch { return null; } };

/** Run once and judge: restored tree equals the before snapshot, git status empty. */
function probe(name, root, command, { extra = [], expectExit, patch, env, after } = {}) {
  const before = snapshot(root);
  const result = run(root, command, extra, patch, env);
  if (after) after(root);
  const out = parse(result);
  const same = snapshot(root) === before;
  const clean = status(root) === '';
  const detail = `exit=${result.status} restored=${out?.patch?.restored} exitCode=${out?.command?.exitCode} timedOut=${out?.timedOut} clean=${clean} byteEqual=${same}${result.status === 2 ? ` refusal="${result.stderr.trim().split('\n')[0].slice(0, 110)}"` : ''}`;
  const exitOk = expectExit === undefined || result.status === expectExit;
  if (same && clean && exitOk) line('SAFE', name, detail);
  else if (!same && out?.patch?.restored === false && result.status === 1) line('NOTE', `${name} (changed, but reported restored:false exit 1)`, detail);
  else line('LEAK', name, detail);
  return { result, out, root };
}

const good = 'export const add = (a, b) => a + b;\n';
const bad = 'export const add = (a, b) => a - b;\n';
const check = "import { add } from './add.mjs';\nif (add(2, 2) !== 4) { console.log('add is wrong'); process.exit(1); }\nconsole.log('ok');\n";
const base = { 'add.mjs': good, 'check.mjs': check };
const w = (root, f, body) => { mkdirSync(path.dirname(path.join(root, f)), { recursive: true }); writeFileSync(path.join(root, f), body); };

try {
  // 1. File creation in a new directory.
  probe('create file in new dir', fixture(base, r => w(r, 'new/deep/made.mjs', 'x\n')), node('-e', "process.exit(require('fs').existsSync('new/deep/made.mjs') ? 1 : 0)"), { expectExit: 1 });
  // 2. File deletion.
  probe('delete file', fixture(base, r => unlinkSync(path.join(r, 'add.mjs'))), node('check.mjs'), { expectExit: 1 });
  // 3. Rename (with -M) plus a content change.
  probe('rename + edit', fixture({ ...base, 'big.txt': 'line\n'.repeat(50) }, r => { git(r, 'mv', 'big.txt', 'moved.txt'); writeFileSync(path.join(r, 'moved.txt'), `${'line\n'.repeat(50)}tail\n`); }, ['-M']), node('-e', "process.exit(require('fs').existsSync('moved.txt') ? 1 : 0)"), { expectExit: 1 });
  // 4. Binary patch.
  const bin = Buffer.from(Array.from({ length: 512 }, (_, i) => (i * 37) % 256));
  probe('binary edit', fixture({ ...base, 'blob.bin': bin }, r => { const b = Buffer.from(bin); b[7] ^= 0xff; b[300] = 0; writeFileSync(path.join(r, 'blob.bin'), b); }, ['--binary']), node('-e', 'process.exit(1)'), { expectExit: 1 });
  probe('binary create', fixture(base, r => writeFileSync(path.join(r, 'new.bin'), bin), ['--binary']), node('-e', "process.exit(require('fs').existsSync('new.bin') ? 1 : 0)"), { expectExit: 1 });
  // 5. Mode change only, and mode + content.
  probe('mode change only', fixture(base, r => chmodSync(path.join(r, 'add.mjs'), 0o755)), node('-e', "process.exit((require('fs').statSync('add.mjs').mode & 0o100) ? 1 : 0)"), { expectExit: 1 });
  probe('mode + content', fixture(base, r => { writeFileSync(path.join(r, 'add.mjs'), bad); chmodSync(path.join(r, 'add.mjs'), 0o755); }), node('check.mjs'), { expectExit: 1 });
  // 6. CRLF file, and a patch that applies at an offset.
  const crlf = 'a\r\nb\r\nc\r\nd\r\n';
  probe('CRLF file', fixture({ ...base, 'w.txt': crlf }, r => writeFileSync(path.join(r, 'w.txt'), crlf.replace('b\r\n', 'B\r\n'))), node('-e', 'process.exit(1)'), { expectExit: 1 });
  {
    const long = Array.from({ length: 30 }, (_, i) => `l${i}\n`).join('');
    const root = fixture({ ...base, 'o.txt': long }, r => writeFileSync(path.join(r, 'o.txt'), long.replace('l20\n', 'L20\n')));
    // Move the target lines down: commit 5 new lines at the top so the patch applies with an offset.
    writeFileSync(path.join(root, 'o.txt'), `x\nx\nx\nx\nx\n${long}`); git(root, 'commit', '-qam', 'shift');
    probe('patch applies at an offset', root, node('-e', "process.exit(require('fs').readFileSync('o.txt','utf8').includes('L20') ? 1 : 0)"), { expectExit: 1 });
  }
  // 7. apply.whitespace=fix in the user's config, with a fault that adds trailing whitespace.
  {
    const root = fixture(base, r => writeFileSync(path.join(r, 'add.mjs'), 'export const add = (a, b) => a - b;   \n'));
    git(root, 'config', 'apply.whitespace', 'fix');
    probe('apply.whitespace=fix + trailing-space fault', root, node('check.mjs'));
  }
  {
    const root = fixture({ ...base, 'ws.txt': 'keep  \nx\n' }, r => writeFileSync(path.join(r, 'ws.txt'), 'keep  \ny\n'));
    git(root, 'config', 'apply.whitespace', 'fix');
    probe('apply.whitespace=fix + context with trailing space', root, node('-e', 'process.exit(1)'));
  }
  {
    const root = fixture({ ...base, 'ws.txt': 'a\nb\nc\n' }, r => writeFileSync(path.join(r, 'ws.txt'), 'a\nB\nc\n'));
    git(root, 'config', 'apply.ignoreWhitespace', 'change');
    writeFileSync(path.join(root, 'ws.txt'), 'a \nb\nc \n'); git(root, 'commit', '-qam', 'ws ctx');
    probe('apply.ignoreWhitespace=change + context drift', root, node('-e', 'process.exit(1)'));
  }
  // 8. The command edits the patched file, an unpatched tracked file, commits, stashes, or resets.
  probe('command rewrites patched file', fixture(base, r => w(r, 'add.mjs', bad)), node('-e', "require('fs').writeFileSync('add.mjs','mangled\\n')"));
  probe('command appends to patched file', fixture(base, r => w(r, 'add.mjs', bad)), node('-e', "require('fs').appendFileSync('add.mjs','// more\\n')"));
  probe('command edits an unpatched tracked file', fixture(base, r => w(r, 'add.mjs', bad)), node('-e', "require('fs').appendFileSync('check.mjs','// x\\n')"));
  probe('command deletes the patched file', fixture(base, r => w(r, 'add.mjs', bad)), node('-e', "require('fs').unlinkSync('add.mjs')"));
  probe('command runs git commit -am', fixture(base, r => w(r, 'add.mjs', bad)), ['git', '-c', 'user.name=t', '-c', 'user.email=t@e', 'commit', '-qam', 'oops']);
  probe('command runs git stash', fixture(base, r => w(r, 'add.mjs', bad)), ['git', 'stash', '-q']);
  probe('command runs git checkout -- .', fixture(base, r => w(r, 'add.mjs', bad)), ['git', 'checkout', '--', '.']);
  probe('command deletes the patch file', fixture(base, r => w(r, 'add.mjs', bad)), node('-e', "require('fs').unlinkSync('receipts/fault.diff')"));
  probe('command edits the patch file', fixture(base, r => w(r, 'add.mjs', bad)), node('-e', "require('fs').writeFileSync('receipts/fault.diff','garbage\\n')"));
  // 9. Timeout, and a grandchild that escapes the process group and writes after the run.
  probe('timeout 500ms', fixture(base, r => w(r, 'add.mjs', bad)), node('-e', 'setTimeout(()=>{},60000)'), { extra: ['--timeout-ms', '500'], expectExit: 1 });
  probe('timeout, child ignores SIGTERM', fixture(base, r => w(r, 'add.mjs', bad)), node('-e', "process.on('SIGTERM',()=>{});setTimeout(()=>{},60000)"), { extra: ['--timeout-ms', '500'], expectExit: 1 });
  probe('escaped grandchild writes after restore', fixture(base, r => w(r, 'add.mjs', bad)),
    node('-e', "require('child_process').spawn(process.execPath,['-e',\"setTimeout(()=>require('fs').writeFileSync('add.mjs','late\\\\n'),1500)\"],{detached:true,stdio:'ignore'}).unref()"),
    { after: () => spawnSync('sleep', ['2.5']) });
  // 10. Paths: .git and outside the project.
  const raw = (root, body) => writeFileSync(path.join(root, 'receipts/fault.diff'), body);
  const newFile = p => `diff --git a/${p} b/${p}\nnew file mode 100644\n--- /dev/null\n+++ b/${p}\n@@ -0,0 +1 @@\n+x\n`;
  for (const p of ['.git/hooks/pre-commit', '.GIT/hooks/pre-commit', '.Git/x', 'sub/.git/config', '.git', '../outside.txt', 'a/../../outside.txt', '.git/../.git/hooks/x']) {
    const root = fixture(base); raw(root, newFile(p));
    probe(`new-file patch at ${p}`, root, node('-e', 'process.exit(0)'), { expectExit: 2 });
    if (existsSync(path.join(path.dirname(root), 'outside.txt'))) line('LEAK', `outside.txt written for ${p}`);
  }
  { // modify .git/config via a patch
    const root = fixture(base); const cfg = readFileSync(path.join(root, '.git/config'), 'utf8').split('\n');
    raw(root, `diff --git a/.git/config b/.git/config\n--- a/.git/config\n+++ b/.git/config\n@@ -1,1 +1,2 @@\n ${cfg[0]}\n+\thooksPath = /tmp\n`);
    probe('modify .git/config', root, node('-e', 'process.exit(0)'), { expectExit: 2 });
  }
  { // absolute path in the patch header
    const root = fixture(base); raw(root, `--- /dev/null\n+++ ${path.join(path.dirname(root), 'abs-outside.txt')}\n@@ -0,0 +1 @@\n+x\n`);
    probe('absolute path header (git apply strips it to a project path)', root, node('-e', 'process.exit(0)'));
    if (existsSync(path.join(path.dirname(root), 'abs-outside.txt'))) line('LEAK', 'abs-outside.txt written');
  }
  { // symlink in the repo pointing outside, patch writes through it
    const outside = realpathSync(mkdtempSync(path.join(tmpdir(), 'jc-r9-out-'))); dirs.push(outside);
    writeFileSync(path.join(outside, 'victim.txt'), 'safe\n');
    const root = fixture(base); symlinkSync(outside, path.join(root, 'link')); git(root, 'add', 'link'); git(root, 'commit', '-qm', 'link');
    raw(root, 'diff --git a/link/victim.txt b/link/victim.txt\n--- a/link/victim.txt\n+++ b/link/victim.txt\n@@ -1 +1 @@\n-safe\n+pwned\n');
    probe('write through committed symlink', root, node('-e', 'process.exit(0)'), { expectExit: 2 });
    line(readFileSync(path.join(outside, 'victim.txt'), 'utf8') === 'safe\n' ? 'SAFE' : 'LEAK', 'outside victim.txt untouched (symlink)');
    raw(root, `diff --git a/evil b/evil\nnew file mode 120000\n--- /dev/null\n+++ b/evil\n@@ -0,0 +1 @@\n+${outside}\n\\ No newline at end of file\ndiff --git a/evil/victim.txt b/evil/victim.txt\n--- a/evil/victim.txt\n+++ b/evil/victim.txt\n@@ -1 +1 @@\n-safe\n+pwned\n`);
    probe('patch creates a symlink then writes through it', root, node('-e', 'process.exit(0)'), { expectExit: 2 });
    line(readFileSync(path.join(outside, 'victim.txt'), 'utf8') === 'safe\n' ? 'SAFE' : 'LEAK', 'outside victim.txt untouched (new symlink)');
  }
  { // patch that only creates a symlink pointing outside (a fault, not an escape)
    const root = fixture(base); raw(root, `diff --git a/evil b/evil\nnew file mode 120000\n--- /dev/null\n+++ b/evil\n@@ -0,0 +1 @@\n+/etc\n\\ No newline at end of file\n`);
    probe('patch creates a symlink only', root, node('-e', 'process.exit(0)'));
  }
  // 11. Dirty-tree variants and a patch file that is not ignored.
  { const root = fixture(base, r => w(r, 'add.mjs', bad)); writeFileSync(path.join(root, 'stray.txt'), 'x'); const b = sha(path.join(root, 'add.mjs')); const r = run(root, node('check.mjs')); line(r.status === 2 && sha(path.join(root, 'add.mjs')) === b ? 'SAFE' : 'LEAK', 'untracked file refuses', `exit=${r.status}`); }
  { const root = fixture(base, r => w(r, 'add.mjs', bad)); writeFileSync(path.join(root, 'check.mjs'), `${check}//s\n`); git(root, 'add', 'check.mjs'); git(root, 'checkout', 'HEAD', '--', 'check.mjs'); git(root, 'reset', '-q'); writeFileSync(path.join(root, 'check.mjs'), `${check}//s\n`); git(root, 'add', 'check.mjs'); const r = run(root, node('check.mjs')); line(r.status === 2 ? 'SAFE' : 'LEAK', 'staged-only change refuses', `exit=${r.status}`); }
  { const root = fixture(base, r => w(r, 'add.mjs', bad)); writeFileSync(path.join(root, '.gitignore'), ''); git(root, 'commit', '-qam', 'unignore'); const r = run(root, node('check.mjs')); line('NOTE', 'patch file in a tracked, non-ignored folder', `exit=${r.status} :: ${r.stderr.trim().split('\n').slice(0, 2).join(' | ')}`); }
  { // fault and receipts in a tracked feature folder: the first run's receipt makes the second run refuse
    const root = fixture(base, r => w(r, 'add.mjs', bad)); const dir = 'docs/features/demo/proof'; mkdirSync(path.join(root, dir), { recursive: true });
    writeFileSync(path.join(root, dir, 'fault.diff'), readFileSync(path.join(root, 'receipts/fault.diff'))); git(root, 'add', dir); git(root, 'commit', '-qm', 'fault');
    const one = spawnSync(process.execPath, [script, 'run', '--receipt', `${dir}/old.log`, '--patch', `${dir}/fault.diff`, '--', ...node('check.mjs')], { cwd: root, encoding: 'utf8' });
    const two = spawnSync(process.execPath, [script, 'run', '--receipt', `${dir}/new.log`, '--patch', `${dir}/fault.diff`, '--', ...node('check.mjs')], { cwd: root, encoding: 'utf8' });
    line('NOTE', 'old-then-new fault runs with a tracked receipt folder', `first exit=${one.status} restored=${parse(one)?.patch?.restored} second exit=${two.status} :: ${two.stderr.trim().split('\n').slice(0, 2).join(' | ')}`);
  }
  // 12. Project root is a subdirectory of the repository (cleanup.mjs supports this layout via --show-prefix).
  for (const [label, command] of [['passing command', node('check.mjs')], ['command rewrites the patched file', node('-e', "require('fs').writeFileSync('add.mjs','mangled\\n')")]]) {
    const root = fixture({ 'pkg/add.mjs': good, 'pkg/check.mjs': check, 'other.txt': 'o\n' }, r => { w(r, 'pkg/add.mjs', bad); w(r, 'other.txt', 'O\n'); });
    mkdirSync(path.join(root, 'pkg/receipts'));
    writeFileSync(path.join(root, 'pkg/receipts/fault.diff'), readFileSync(path.join(root, 'receipts/fault.diff')));
    const before = snapshot(root);
    const r = spawnSync(process.execPath, [script, 'run', '--receipt', 'receipts/sub.log', '--patch', 'receipts/fault.diff', '--', ...command], { cwd: path.join(root, 'pkg'), encoding: 'utf8' });
    const out = parse(r);
    const same = snapshot(root) === before; const clean = status(root) === '';
    const otherApplied = readFileSync(path.join(root, 'other.txt'), 'utf8');
    const truthful = (same && clean) || (out?.patch?.restored === false && r.status === 1);
    line(truthful ? 'SAFE' : 'LEAK', `subdirectory root, ${label}; patch also touches ../other.txt (outside the project)`, `exit=${r.status} restored=${out?.patch?.restored} exitCode=${out?.command?.exitCode} clean=${clean} byteEqual=${same} other.txt-during-run-untouched=${otherApplied === 'o\n'} refusedOutside=${r.status === 2} status="${status(root).trim()}"`);
  }
  // 13. Paths with spaces and non-ASCII.
  probe('path with space and unicode', fixture({ ...base, 'dir x/é ü.txt': 'a\n' }, r => w(r, 'dir x/é ü.txt', 'b\n')), node('-e', 'process.exit(1)'), { expectExit: 1 });
  // 14. Signals mid-run: SIGINT, SIGTERM, SIGHUP to the runner; SIGKILL leaves the fault and the next run refuses.
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGKILL']) {
    const root = fixture(base, r => w(r, 'add.mjs', bad));
    const before = snapshot(root);
    const child = spawn(process.execPath, [script, 'run', '--receipt', `receipts/sig-${signal}.log`, '--patch', 'receipts/fault.diff', '--', ...node('-e', "console.log('started');setTimeout(()=>{},60000)")], { cwd: root, stdio: 'ignore' });
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline && !(existsSync(path.join(root, `receipts/sig-${signal}.log`)) && readFileSync(path.join(root, `receipts/sig-${signal}.log`), 'utf8').includes('started'))) spawnSync('sleep', ['0.05']);
    const faultIn = readFileSync(path.join(root, 'add.mjs'), 'utf8') === bad;
    const code = await new Promise(resolve => { child.on('exit', (c, s) => resolve(`${c}/${s}`)); child.kill(signal); });
    const same = snapshot(root) === before; const clean = status(root) === '';
    if (signal === 'SIGKILL') {
      const next = run(root, node('check.mjs'));
      line('NOTE', 'SIGKILL to the runner (decision tradeoff: fault may stay)', `faultWasIn=${faultIn} exit=${code} clean=${clean} byteEqual=${same} nextRunExit=${next.status}`);
    } else line(same && clean && faultIn ? 'SAFE' : 'LEAK', `${signal} to the runner mid-run`, `faultWasIn=${faultIn} exit=${code} clean=${clean} byteEqual=${same}`);
  }
  // 15. SIGINT to the whole foreground process group (Ctrl-C in a terminal) via a wrapper group.
  {
    const root = fixture(base, r => w(r, 'add.mjs', bad));
    const before = snapshot(root);
    const child = spawn(process.execPath, [script, 'run', '--receipt', 'receipts/grp.log', '--patch', 'receipts/fault.diff', '--', ...node('-e', "console.log('started');setTimeout(()=>{},60000)")], { cwd: root, stdio: 'ignore', detached: true });
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline && !(existsSync(path.join(root, 'receipts/grp.log')) && readFileSync(path.join(root, 'receipts/grp.log'), 'utf8').includes('started'))) spawnSync('sleep', ['0.05']);
    const code = await new Promise(resolve => { child.on('exit', (c, s) => resolve(`${c}/${s}`)); process.kill(-child.pid, 'SIGINT'); });
    line(snapshot(root) === before && status(root) === '' ? 'SAFE' : 'LEAK', 'SIGINT to the runner process group', `exit=${code}`);
  }
  // 16. Early SIGINT: sent as soon as the runner starts (before or during apply/spawn).
  for (const delay of [30, 60, 90, 120, 150, 180, 210, 240]) {
    const root = fixture(base, r => w(r, 'add.mjs', bad));
    const before = snapshot(root);
    const child = spawn(process.execPath, [script, 'run', '--receipt', 'receipts/early.log', '--patch', 'receipts/fault.diff', '--', ...node('-e', 'setTimeout(()=>{},60000)')], { cwd: root, stdio: 'ignore' });
    spawnSync('sleep', [String(delay / 1000)]);
    const code = await new Promise(resolve => { child.on('exit', (c, s) => resolve(`${c}/${s}`)); child.kill('SIGTERM'); });
    const ok = snapshot(root) === before && status(root) === '';
    line(ok ? 'SAFE' : 'LEAK', `SIGTERM ${delay}ms after start`, `exit=${code} clean=${status(root) === ''}`);
  }
} finally {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
}
console.log(leaks === 0 ? 'probe: no tree left changed without a report' : `probe: ${leaks} probe(s) left a tree changed without restored:false`);
