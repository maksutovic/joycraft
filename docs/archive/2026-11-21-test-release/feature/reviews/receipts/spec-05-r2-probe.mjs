// Spec 5 round-2 reviewer probe. Installs the payload of a given tree (the
// committed HEAD bytes, extracted to a temp copy) into fixture projects, runs
// task startup for both roles, then runs each printed command exactly as
// printed through /bin/sh -c from the worker root and checks what the shell
// passed on. Adds odd characters in the root and in check paths, {files}
// template edge cases and Windows-style paths.
// Usage: node spec-05-r2-probe.mjs <tree-root>
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const tree = process.argv[2];
const folder = 'docs/features/2026-11-21-f';
const queuePath = `${folder}/specs/.joycraft-spec-queue.json`;
const forbidden = /&&|;|\||\$\(|<<|\bsource\b|\bcd\b/;
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8' });
const put = (file, body) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const cleanup = [];
let failures = 0;
let startCount = 0;
// Cases outside the spec's criteria (INFO mode) print their outcome but do not set the exit code.
let infoMode = false;
const check = (ok, label, detail = '') => { if (!ok && !infoMode) failures += 1; console.log(`  ${ok ? 'ok  ' : infoMode ? 'INFO-NOT-OK' : 'FAIL'} ${label}${detail ? ` :: ${detail}` : ''}`); };
// A check file prints a marker plus its own argv (JSON) so the shell's word split is visible.
const checkBody = 'console.log("ARGV" + JSON.stringify(process.argv.slice(1).map(p => p.split("/").slice(-2).join("/"))));\n';

function fixture(label, parentName, checks, focused = 'node {files}') {
  const parent = realpathSync(mkdtempSync(join(tmpdir(), 'jc-spec5r2-')));
  cleanup.push(parent);
  const root = join(parent, parentName);
  mkdirSync(root, { recursive: true });
  git(root, 'init', '-q', '-b', 'main');
  execFileSync(process.execPath, [join(tree, 'dist/cli.js'), 'init', '.', '--yes'], { cwd: root, encoding: 'utf8' });
  const pinned = join(parent, 'pin.json');
  copyFileSync(join(root, '.joycraft/installation.json'), pinned);
  put(join(root, 'joycraft.yaml'), `tests:\n  focused: ${JSON.stringify(focused)}\n`);
  put(join(root, '.gitignore'), '.joycraft/local/\n');
  put(join(root, folder, 'brief.md'), '# Brief\n\n## Goal\n\nText.\n');
  const spec = `${folder}/specs/01-a.md`;
  put(join(root, spec), '---\nid: 1\nstatus: in-review\n---\n# A\n\n## acceptance\n\n- It works. Check: the tests pass.\n');
  for (const file of checks) put(join(root, file), checkBody);
  put(join(root, 'src/a.ts'), 'export const a = 1;\n');
  put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: 'f', specs: [{ id: 1, file: '01-a.md', depends_on: [], status: 'in-review', mode: 'checkpoint',
    verification: { inputs: [{ path: `${folder}/brief.md`, kind: 'requirement' }, { path: spec, kind: 'requirement' }, { path: 'src/a.ts', kind: 'code' }, ...checks.map(path => ({ path, kind: 'check' }))],
      criteria: [{ id: 'spec-1-1', requirement: { path: spec, anchor: 'acceptance' }, requiredKinds: ['runtime'] }] } }] }, null, 2));
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'init');
  console.log(`\n=== fixture ${label}: root=${JSON.stringify(root)} checks=${JSON.stringify(checks)} focused=${JSON.stringify(focused)}`);
  return { root, pinned };
}

function start({ root, pinned }, role) {
  const caps = ['filesystem:read', 'filesystem:write-report', ...(role === 'reviewer' ? ['agent:separate-context'] : [])].join(',');
  const r = spawnSync(process.execPath, ['.joycraft/runtime/dispatch-start.mjs', '--worker-root', root, '--expected-manifest', pinned,
    '--queue', queuePath, '--spec', '1', '--role', role, '--implementer-session', 'impl-1', '--out', `.joycraft/local/packets/${role}-${startCount += 1}.json`,
    '--capabilities', caps, '--native-session', role === 'reviewer' ? 'review-1' : 'impl-1'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
  console.log(`startup ${role}: exit ${r.status}${r.stderr ? ` stderr=${r.stderr.trim().split('\n').slice(0, 8).join(' | ')}` : ''}`);
  return { status: r.status, commands: r.status === 0 && r.stdout ? JSON.parse(r.stdout).commands : null };
}

const sh = (root, command) => spawnSync('/bin/sh', ['-c', command], { cwd: root, encoding: 'utf8' });
const shortArgv = checks => checks.map(p => p.split('/').slice(-2).join('/'));

function runRoles(project, checks, { expectArgv = true } = {}) {
  for (const role of ['reviewer', 'implementer']) {
    const { commands } = start(project, role);
    if (!commands) { check(false, `${role} startup`); continue; }
    console.log(`  focused: ${JSON.stringify(commands.focused)}`);
    for (const [name, command] of Object.entries(commands)) {
      if (name === 'focused' || name === 'note') continue;
      console.log(`  ${role}.${name} printed: ${command}`);
      check(!forbidden.test(command), `${role}.${name} has no forbidden form`);
    }
    if (commands.focused && expectArgv) {
      const r = sh(project.root, commands.focused.command);
      const line = r.stdout.split('\n').find(l => l.startsWith('ARGV')) ?? '';
      const expected = `ARGV${JSON.stringify(shortArgv(checks))}`;
      check(r.status === 0 && line === expected, `${role}.focused runs as printed and the shell passes the exact paths`, `exit=${r.status} got=${line || (r.stderr.trim().split('\n')[0])}`);
      const ev = sh(project.root, commands.evidence);
      check(ev.status === 0, `${role}.evidence runs as printed`, `exit=${ev.status} ${ev.status ? ev.stderr.trim().split('\n')[0] : ''}`);
      const receiptDir = join(project.root, folder, role === 'reviewer' ? 'reviews/receipts' : 'receipts');
      let receipts = [];
      try { receipts = readdirSync(receiptDir); } catch {}
      check(receipts.some(f => f.startsWith(`spec-1-${role}-focused-`)), `${role} receipt written under ${role === 'reviewer' ? 'reviews/receipts' : 'receipts'}`, receipts.join(','));
    }
    if (role === 'implementer') {
      const r = sh(project.root, commands.submit);
      check(r.status === 0, 'implementer.submit runs as printed', `exit=${r.status} ${r.stderr.trim().split('\n')[0] ?? ''}`);
    } else {
      for (const name of ['checkReport', 'finalizeReview']) {
        const r = sh(project.root, commands[name]);
        const reportAbs = join(project.root, folder, 'specs/review-1.report.json');
        check(r.status === 1 && r.stderr.includes('ENOENT') && r.stderr.includes(reportAbs) && !r.stderr.includes('Invalid or duplicate argument'),
          `reviewer.${name} parses as printed and stops only on the absent report`, `exit=${r.status} ${r.stderr.trim().split('\n')[0]}`);
      }
    }
  }
}

// 1. Round-1 probe cases, rerun.
const plainChecks = ['tests/a.mjs', 'tests/b.mjs'];
runRoles(fixture('r1-plain', 'proj', plainChecks), plainChecks);
runRoles(fixture('r1-space-in-root', 'my proj', plainChecks), plainChecks);
runRoles(fixture('r1-space-in-check', 'proj', ['tests/a b.mjs']), ['tests/a b.mjs']);

// 2. Odd characters in the worker root (no newline).
for (const [label, name] of [
  ['single-quote-root', "it's proj"],
  ['double-quote-root', 'a"b proj'],
  ['dollar-root', 'd$HOME x'],
  ['backtick-root', 'b`id`t'],
  ['unicode-root', 'projé 日本 ü'],
  ['glob-hash-tilde-root', '~p #h *?[x] !b (p) {c,d} &a'],
]) runRoles(fixture(label, name, plainChecks), plainChecks);
infoMode = true;
console.log('\n--- INFO (outside the criteria): Windows-style root');
runRoles(fixture('backslash-root', 'C:\\Users\\Max Smith', plainChecks), plainChecks);
infoMode = false;

// 3. Odd characters in check paths.
for (const [label, checks] of [
  ['quotes-in-check', ["tests/it's.mjs", 'tests/q"u.mjs']],
  ['dollar-backtick-in-check', ['tests/$HOME.mjs', 'tests/`id`.mjs']],
  ['unicode-in-check', ['tests/日本 é.mjs']],
  ['glob-in-check', ['tests/*.mjs', 'tests/[ab].mjs', 'tests/~t #c.mjs']],
]) runRoles(fixture(label, 'proj', checks), checks);
infoMode = true;
console.log('\n--- INFO (outside the criteria): Windows-style check inputs, and $( inside a check path');
for (const [label, checks] of [['windows-style-check', ['tests\\win\\a.mjs', 'C:\\proj\\tests\\b.mjs']], ['dollar-paren-in-check', ['tests/$(x).mjs']]]) runRoles(fixture(label, 'proj', checks), checks);
infoMode = false;

// 4. Combined: odd root and odd check paths together.
const combinedChecks = ["tests/o'k $x `y`.mjs"];
runRoles(fixture('combined', "r'oot $x `y` é", combinedChecks), combinedChecks);

// 5. {files} template edge cases (focusedCommand via startup, and the exported helpers).
const mod = await import(pathToFileURL(join(tree, 'payload/.joycraft/runtime/dispatch-start.mjs')).href);
const spec = checks => ({ verification: { inputs: checks.map(path => ({ path, kind: 'check' })) } });
console.log('\n=== {files} edge cases via focusedCommand (files present in a temp root)');
const fcRoot = realpathSync(mkdtempSync(join(tmpdir(), 'jc-spec5r2-fc-')));
cleanup.push(fcRoot);
for (const f of ['tests/a.mjs', 'tests/b.mjs', 'tests/{files}.mjs']) put(join(fcRoot, f), checkBody);
const fc = (template, checks = ['tests/a.mjs', 'tests/b.mjs']) => {
  try { return mod.focusedCommand({ root: fcRoot, spec: spec(checks), config: { tests: { focused: template } } }); }
  catch (error) { return { error: String(error.message ?? error).slice(0, 160) }; }
};
for (const template of [
  'node {files}', '{files}', 'vitest --dir={files} --run', 'x --a={files}=z', 'x pre{files}post',
  'x {files} --and {files}', 'x {files}{files}', "x '{files}'", 'x "{files}"', 'x \\{files\\}',
  'x {file}', 'x {FILES}', 'pnpm test $VAR {files}', 'pnpm test `id` {files}', 'a && b {files}', 'a; b {files}',
  'x "unclosed {files}', "x 'unclosed {files}", 'x trailing\\', '   ', 'node "C:\\Program Files\\n.js" {files}', 'node C:\\tools\\run.js {files}',
]) console.log(`  ${JSON.stringify(template)} -> ${JSON.stringify(fc(template))}`);
console.log(`  one file "x --dir={files}/" -> ${JSON.stringify(fc('x --dir={files}/', ['tests/a.mjs']))}`);
console.log(`  file named {files}: "node {files}" -> ${JSON.stringify(fc('node {files}', ['tests/{files}.mjs']))}`);
console.log(`  file named {files}, appended: "node" -> ${JSON.stringify(fc('node', ['tests/{files}.mjs']))}`);
console.log('\n=== shellQuote round-trip through /bin/sh (printf %s\\0)');
for (const word of ["it's", 'a"b', '$HOME', '`id`', '$(x)', 'é日本', 'C:\\Users\\Max Smith', '*', '~', '#c', '', '-n', "''", '\\', '!x', 'a;b', 'a|b', 'a&&b']) {
  const r = spawnSync('/bin/sh', ['-c', `printf '%s\\0' ${mod.shellQuote(word)}`], { encoding: 'utf8' });
  check(r.stdout === `${word}\0`, `shellQuote(${JSON.stringify(word)}) = ${mod.shellQuote(word)}`, `forbidden=${forbidden.test(mod.shellQuote(word))}`);
}

// 6. Receipt freshness: two startups in a row.
console.log('\n=== receipt freshness');
const fresh = fixture('fresh', 'proj', plainChecks);
const a = start(fresh, 'implementer').commands.evidence;
const b = start(fresh, 'implementer').commands.evidence;
check(a !== b, 'two consecutive startups print different receipt paths', `${a.split(' ')[4]} vs ${b.split(' ')[4]}`);

// 7. A ; or | inside a path: quoted, but the textual forbidden scan still matches.
const semi = fixture('semicolon-root', 'a;b|c', plainChecks);
const semiCommands = start(semi, 'reviewer').commands;
console.log(`  checkReport printed: ${semiCommands.checkReport}`);
console.log(`  forbidden regex matches checkReport: ${forbidden.test(semiCommands.checkReport)}`);
const semiRun = sh(semi.root, semiCommands.checkReport);
console.log(`  checkReport as printed: exit=${semiRun.status} ${semiRun.stderr.trim().split('\n')[0]}`);

for (const dir of cleanup) rmSync(dir, { recursive: true, force: true });
console.log(`\nprobe checks failed: ${failures}`);
process.exitCode = failures ? 1 : 0;
