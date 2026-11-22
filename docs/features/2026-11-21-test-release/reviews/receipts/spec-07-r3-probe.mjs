// Reviewer probe, round 3, for test-release spec 7 (gate receipt). New bypass attempts after e1ced9f.
// Usage: node spec-07-r3-probe.mjs <project-root>
// Genuine receipts come from payload evidence.mjs run; hand-written ones are marked "hand".
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const repo = path.resolve(process.argv[2] ?? '.');
const rt = path.join(repo, 'payload/.joycraft/runtime');
const git = (cwd, ...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...a], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (f, b) => { mkdirSync(path.dirname(f), { recursive: true }); writeFileSync(f, b); };
const RED = 'console.error("gate red"); process.exit(1);\n';

function fixture({ gate = 'node gate.mjs', gateBody = "console.log('gate ok');\n", extra = {} } = {}) {
  const base = realpathSync(mkdtempSync(path.join(tmpdir(), 'jc-r7r3-')));
  const remote = path.join(base, 'remote.git'); const root = path.join(base, 'work');
  git(base, 'init', '-q', '--bare', remote); mkdirSync(root); git(root, 'init', '-q', '-b', 'main');
  put(path.join(root, '.gitignore'), 'receipts/\n');
  put(path.join(root, 'joycraft.yaml'), `tests:\n  gate: ${JSON.stringify(gate)}\n`);
  put(path.join(root, 'gate.mjs'), gateBody);
  put(path.join(root, 'gate2.mjs'), RED);
  for (const [name, body] of Object.entries(extra)) { put(path.join(root, name), body); if (body.startsWith('#!')) chmodSync(path.join(root, name), 0o755); }
  git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'one');
  const first = git(root, 'rev-parse', 'HEAD');
  put(path.join(root, 'b.txt'), 'b\n'); git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'two');
  git(root, 'remote', 'add', 'origin', remote);
  return { base, root, remote, first, head: git(root, 'rev-parse', 'HEAD') };
}
const evidence = (root, receipt, argv, env = process.env) => spawnSync(process.execPath, [path.join(rt, 'evidence.mjs'), 'run', '--receipt', receipt, '--', ...argv], { cwd: root, encoding: 'utf8', env });
const push = (f, receipt) => spawnSync(process.execPath, [path.join(rt, 'delivery.mjs'), 'push', '--root', f.root, '--base', f.first, '--remote', 'origin', '--branch', 'feature', '--gate-receipt', receipt], { cwd: f.root, encoding: 'utf8' });
const ref = remote => spawnSync('git', ['rev-parse', '--verify', '-q', 'refs/heads/feature'], { cwd: remote, encoding: 'utf8' }).stdout.trim();
const show = (name, r, f) => { const moved = ref(f.remote); console.log(`${name} :: exit=${r.status} stderr=${JSON.stringify(r.stderr.trim().split('\n').at(-1) ?? '')} remoteRef=${moved ? (moved === f.head ? 'HEAD' : moved) : 'none'}`); };
const hand = (f, name, argv) => put(path.join(f.root, 'receipts', name), `hand written\njoycraft-evidence: ${JSON.stringify({ argv, exitCode: 0, revision: f.head, dirty: false })}\n`);
const genuine = (label, argv, opts = {}, envFor) => { const f = fixture(opts); const e = evidence(f.root, 'receipts/r.log', typeof argv === 'function' ? argv(f) : argv, envFor ? envFor(f) : process.env); console.log(`${label} evidence exit=${e.status}`); show(label, push(f, 'receipts/r.log'), f); return f; };
const handCase = (label, argv, opts = {}) => { const f = fixture(opts); hand(f, 'h.log', argv); show(`${label} [hand]`, push(f, 'receipts/h.log'), f); };

const AND = 'node gate.mjs && node gate2.mjs';
// Q. Quotes and spacing in the shell form of a gate with shell syntax.
genuine('Q1 gate with && run via sh -c with double spaces (gate2 red)', ['sh', '-c', 'node gate.mjs  &&  node gate2.mjs'], { gate: AND });
genuine('Q2 gate with && via sh -c with tab instead of space', ['sh', '-c', 'node gate.mjs\t&& node gate2.mjs'], { gate: AND });
genuine('Q3 quoted gate node -e "process.exit(0)" run via sh -c with single quotes', ['sh', '-c', "node -e 'process.exit(0)'"], { gate: 'node -e "process.exit(0)"' });
genuine('Q4 quoted gate run via sh -c exactly (green)', ['sh', '-c', 'node -e "process.exit(0)"'], { gate: 'node -e "process.exit(0)"' });
genuine('Q5 quoted gate run as split words [node,-e,"process.exit(0)"] (quotes kept)', ['node', '-e', '"process.exit(0)"'], { gate: 'node -e "process.exit(0)"' });
// P. A plain gate whose words look like shell text, and line separators inside the -c argument.
genuine('P1 plain gate "node gate.mjs true", sh -c "node gate.mjs\\ntrue" (gate red, last line true)', ['sh', '-c', 'node gate.mjs\ntrue'], { gate: 'node gate.mjs true', gateBody: RED });
genuine('P2 plain gate "pnpm test"-style "node gate.mjs test" via sh -c "node gate.mjs\\ntest"', ['sh', '-c', 'node gate.mjs\ntest'], { gate: 'node gate.mjs test', gateBody: RED });
genuine('P3 plain gate run via sh -c with a tab between words (same command)', ['sh', '-c', 'node\tgate.mjs'], {});
genuine('P4 plain gate with words if/then/time: "time node gate.mjs" as exact words', ['time', 'node', 'gate.mjs'], { gate: 'time node gate.mjs' });
genuine('P5 plain gate with @ + , : words as exact words', ['node', 'gate.mjs', '@x', '+y', ',z', 'a:b'], { gate: 'node gate.mjs @x +y ,z a:b' });
genuine('P6 plain gate via sh -c "node gate.mjs #"', ['sh', '-c', 'node gate.mjs #'], {});
genuine('P7 plain gate via sh -c with NBSP between words (sh sees one word)', ['sh', '-c', 'node\u00a0gate.mjs'], {});
// E. env prefixes.
genuine('E1 env node gate.mjs', ['env', 'node', 'gate.mjs']);
genuine('E2 env sh -c gate', ['env', 'sh', '-c', 'node gate.mjs']);
genuine('E3 env CI=1 sh -c gate', ['/usr/bin/env', 'CI=1', 'sh', '-c', 'node gate.mjs']);
genuine('E4 gate "env CI=1 node gate.mjs" (has =) as exact words', ['env', 'CI=1', 'node', 'gate.mjs'], { gate: 'env CI=1 node gate.mjs' });
genuine('E5 gate "env CI=1 node gate.mjs" via sh -c', ['sh', '-c', 'env CI=1 node gate.mjs'], { gate: 'env CI=1 node gate.mjs' });
// W. bash -c with leading/trailing whitespace in the gate string or the -c argument.
genuine('W1 recorded gate has surrounding spaces, bash -c trimmed gate (gate2 red)', ['bash', '-c', AND], { gate: `  ${AND}  ` });
genuine('W2 bash -c "  <gate>\\n" (gate2 red)', ['bash', '-c', `  ${AND}\n`], { gate: AND });
genuine('W3 bash -c "\\uFEFF<gate>" (BOM trimmed by JS, not by bash)', ['bash', '-c', `\uFEFF${AND}`], { gate: AND, extra: { 'gate2.mjs': 'process.exit(0);\n' } });
genuine('W4 bash -c "<gate>\\u00a0" (NBSP trimmed by JS, not by bash)', ['bash', '-c', `${AND}\u00a0`], { gate: AND, extra: { 'gate2.mjs': 'process.exit(0);\n' } });
// C. Windows absolute paths and POSIX lookalikes.
handCase('C1 C:\\x\\notbash.exe -c gate', ['C:\\x\\notbash.exe', '-c', 'node gate.mjs']);
handCase('C2 C:\\x\\bash.exe -c gate', ['C:\\x\\bash.exe', '-c', 'node gate.mjs']);
handCase('C3 \\\\server\\share\\sh.exe -c gate (UNC)', ['\\\\server\\share\\sh.exe', '-c', 'node gate.mjs']);
genuine('C4 C:/x/bash -c gate on POSIX: relative dir "C:" with a committed no-op script, real gate red', ['C:/x/bash', '-c', 'node gate.mjs'], { gateBody: RED, extra: { 'C:/x/bash': '#!/bin/sh\nexit 0\n' } });
genuine('C5 absolute path to a committed no-op project script tools/bash, real gate red', f => [path.join(f.root, 'tools/bash'), '-c', 'node gate.mjs'], { gateBody: RED, extra: { 'tools/bash': '#!/bin/sh\nexit 0\n' } });
// S. Symlinked shells.
genuine('S1 PATH dir with bash -> /bin/echo, bash -c gate, real gate red', ['bash', '-c', 'node gate.mjs'], { gateBody: RED },
  f => { const bin = path.join(f.base, 'fakebin'); mkdirSync(bin); symlinkSync('/bin/echo', path.join(bin, 'bash')); return { ...process.env, PATH: `${bin}:${process.env.PATH}` }; });
genuine('S2 PATH dir with sh -> /bin/sh (real shell via symlink), real gate green', ['sh', '-c', 'node gate.mjs'], {},
  f => { const bin = path.join(f.base, 'realbin'); mkdirSync(bin); symlinkSync('/bin/sh', path.join(bin, 'sh')); return { ...process.env, PATH: `${bin}:${process.env.PATH}` }; });
genuine('S3 absolute symlink outside project named bash -> /usr/bin/true, real gate red', f => { const l = path.join(f.base, 'bash'); symlinkSync('/usr/bin/true', l); return [l, '-c', 'node gate.mjs']; }, { gateBody: RED });
// X. The gate as a prefix of a longer -c line.
genuine('X1 sh -c "<gate>; true" (plain gate red)', ['sh', '-c', 'node gate.mjs; true'], { gateBody: RED });
genuine('X2 sh -c "<gate> || true" (&& gate, gate2 red)', ['sh', '-c', `${AND} || true`], { gate: AND });
genuine('X3 sh -c "<gate>\\ntrue" (&& gate, gate2 red)', ['sh', '-c', `${AND}\ntrue`], { gate: AND });
genuine('X4 sh -c "<gate>;" (&& gate, gate2 red)', ['sh', '-c', `${AND};`], { gate: AND });
// F. Other flag forms on a POSIX shell.
genuine('F1 sh /c gate (sh reads script file /c)', ['sh', '/c', 'node gate.mjs']);
genuine('F2 bash -Command gate', ['bash', '-Command', 'node gate.mjs']);
