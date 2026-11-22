// Reviewer probe, round 2, for test-release spec 7 (gate receipt). New bypass attempts after f4e1df8.
// Usage: node spec-07-r2-probe.mjs <project-root>
// Genuine receipts come from payload evidence.mjs run; hand-written ones are marked "hand".
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const repo = path.resolve(process.argv[2] ?? '.');
const rt = path.join(repo, 'payload/.joycraft/runtime');
const git = (cwd, ...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...a], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (f, b) => { mkdirSync(path.dirname(f), { recursive: true }); writeFileSync(f, b); };

function fixture({ gate = 'node gate.mjs', gateBody = "console.log('gate ok');\n", extra = {} } = {}) {
  const base = realpathSync(mkdtempSync(path.join(tmpdir(), 'jc-r7r2-')));
  const remote = path.join(base, 'remote.git'); const root = path.join(base, 'work');
  git(base, 'init', '-q', '--bare', remote); mkdirSync(root); git(root, 'init', '-q', '-b', 'main');
  put(path.join(root, '.gitignore'), 'receipts/\n');
  put(path.join(root, 'joycraft.yaml'), `tests:\n  gate: ${JSON.stringify(gate)}\n`);
  put(path.join(root, 'gate.mjs'), gateBody);
  put(path.join(root, 'gate2.mjs'), "console.error('gate2 red'); process.exit(1);\n");
  for (const [name, body] of Object.entries(extra)) { put(path.join(root, name), body); if (body.startsWith('#!')) chmodSync(path.join(root, name), 0o755); }
  git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'one');
  const first = git(root, 'rev-parse', 'HEAD');
  put(path.join(root, 'b.txt'), 'b\n'); git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'two');
  git(root, 'remote', 'add', 'origin', remote);
  return { base, root, remote, first, head: git(root, 'rev-parse', 'HEAD') };
}
const evidence = (root, receipt, argv) => spawnSync(process.execPath, [path.join(rt, 'evidence.mjs'), 'run', '--receipt', receipt, '--', ...argv], { cwd: root, encoding: 'utf8' });
const push = (f, receipt) => spawnSync(process.execPath, [path.join(rt, 'delivery.mjs'), 'push', '--root', f.root, '--base', f.first, '--remote', 'origin', '--branch', 'feature', '--gate-receipt', receipt], { cwd: f.root, encoding: 'utf8' });
const ref = remote => spawnSync('git', ['rev-parse', '--verify', '-q', 'refs/heads/feature'], { cwd: remote, encoding: 'utf8' }).stdout.trim();
const show = (name, r, f) => { const moved = ref(f.remote); console.log(`${name} :: exit=${r.status} stderr=${JSON.stringify(r.stderr.trim().split('\n').at(-1) ?? '')} remoteRef=${moved ? (moved === f.head ? 'HEAD' : moved) : 'none'}`); };
const hand = (f, name, value) => put(path.join(f.root, 'receipts', name), `hand written\njoycraft-evidence: ${JSON.stringify({ argv: ['node', 'gate.mjs'], exitCode: 0, revision: f.head, dirty: false, ...value })}\n`);
const genuine = (label, argv, opts) => { const f = fixture(opts); const e = evidence(f.root, 'receipts/r.log', argv); console.log(`${label} evidence exit=${e.status}`); show(label, push(f, 'receipts/r.log'), f); };

// A. shell names with paths and odd case (genuine runs).
genuine('A1 /usr/bin/BASH -c gate (case-insensitive FS runs bash)', ['/usr/bin/BASH', '-c', 'node gate.mjs']);
genuine('A2 /bin/Sh -c gate', ['/bin/Sh', '-c', 'node gate.mjs']);
genuine('A3 bash -c gate with red gate', ['bash', '-c', 'node gate.mjs'], { gateBody: 'process.exit(1);\n' });
// A4: a committed project script named sh that never runs the gate (real gate red).
genuine('A4 ./sh -c gate, ./sh is a committed no-op script, real gate red', ['./sh', '-c', 'node gate.mjs'], { gateBody: 'process.exit(1);\n', extra: { sh: '#!/bin/sh\nexit 0\n' } });
genuine('A5 tools/bash -c gate, committed no-op script, real gate red', ['tools/bash', '-c', 'node gate.mjs'], { gateBody: 'process.exit(1);\n', extra: { 'tools/bash': '#!/bin/sh\nexit 0\n' } });
genuine('A6 /bin/echo.exe-style name: sh.exe absent -> spawn error', ['sh.exe', '-c', 'node gate.mjs']);
genuine('A7 bash -lc gate (refused form)', ['bash', '-lc', 'node gate.mjs']);
genuine('A8 bash -c gate extraArg', ['bash', '-c', 'node gate.mjs', 'x']);
genuine('A9 env bash -c gate', ['/usr/bin/env', 'bash', '-c', 'node gate.mjs']);
{ const f = fixture(); hand(f, 'bash.log', { argv: ['/usr/bin/BASH', '-c', 'node gate.mjs'] }); show('A1b hand /usr/bin/BASH -c gate', push(f, 'receipts/bash.log'), f); }
// B. cmd.exe /c and powershell -Command (not on this mac: hand-written footers, plus a genuine attempt).
{ const f = fixture(); hand(f, 'cmd.log', { argv: ['C:\\Windows\\System32\\CMD.EXE', '/c', 'node gate.mjs'] }); show('B1 hand CMD.EXE /c gate', push(f, 'receipts/cmd.log'), f); }
{ const f = fixture(); hand(f, 'ps.log', { argv: ['powershell.exe', '-Command', 'node gate.mjs'] }); show('B2 hand powershell.exe -Command gate', push(f, 'receipts/ps.log'), f); }
{ const f = fixture(); hand(f, 'ps2.log', { argv: ['pwsh', '-command', 'node gate.mjs'] }); show('B3 hand pwsh -command (lowercase flag)', push(f, 'receipts/ps2.log'), f); }
{ const f = fixture(); hand(f, 'cmdc.log', { argv: ['cmd', '-c', 'node gate.mjs'] }); show('B4 hand cmd -c gate', push(f, 'receipts/cmdc.log'), f); }
genuine('B5 genuine cmd.exe /c gate on mac', ['cmd.exe', '/c', 'node gate.mjs']);
genuine('B6 genuine pwsh -Command gate on mac (pwsh absent?)', ['pwsh', '-Command', 'node gate.mjs']);
// C. symlinked receipt paths.
{ const f = fixture(); const out = path.join(f.base, 'outside.log'); put(out, `x\njoycraft-evidence: ${JSON.stringify({ argv: ['node', 'gate.mjs'], exitCode: 0, revision: f.head, dirty: false })}\n`);
  mkdirSync(path.join(f.root, 'receipts'), { recursive: true }); symlinkSync(out, path.join(f.root, 'receipts/link.log'));
  show('C1 receipts/link.log -> file outside project', push(f, 'receipts/link.log'), f);
  symlinkSync(f.base, path.join(f.root, 'receipts/up'));
  show('C2 receipts/up/outside.log via dir symlink', push(f, 'receipts/up/outside.log'), f);
  show('C3 receipt path is the project root itself', push(f, '.'), f);
  show('C4 receipt path is a missing file', push(f, 'receipts/missing.log'), f);
  evidence(f.root, 'receipts/real.log', ['node', 'gate.mjs']); symlinkSync(path.join(f.root, 'receipts/real.log'), path.join(f.root, 'receipts/inner.log'));
  show('C5 symlink inside project -> genuine green receipt inside', push(f, 'receipts/inner.log'), f); }
{ const f = fixture(); evidence(f.root, 'receipts/g.log', ['node', 'gate.mjs']); const alias = path.join(f.base, 'alias'); symlinkSync(f.root, alias);
  const r = spawnSync(process.execPath, [path.join(rt, 'delivery.mjs'), 'push', '--root', alias, '--base', f.first, '--remote', 'origin', '--branch', 'feature', '--gate-receipt', path.join(alias, 'receipts/g.log')], { cwd: alias, encoding: 'utf8' });
  show('C6 --root via symlinked alias, absolute receipt under alias', r, f); }
// D. footer revision matches but dirty missing / wrong type.
{ const f = fixture(); hand(f, 'd1.log', { dirty: undefined }); show('D1 dirty missing', push(f, 'receipts/d1.log'), f);
  hand(f, 'd2.log', { dirty: 'false' }); show('D2 dirty "false" string', push(f, 'receipts/d2.log'), f);
  hand(f, 'd3.log', { dirty: 0 }); show('D3 dirty 0', push(f, 'receipts/d3.log'), f);
  hand(f, 'd4.log', { exitCode: '0' }); show('D4 exitCode "0" string', push(f, 'receipts/d4.log'), f);
  hand(f, 'd5.log', { revision: f.head.toUpperCase() }); show('D5 revision upper-case', push(f, 'receipts/d5.log'), f);
  hand(f, 'd6.log', { revision: f.head.slice(0, 12) }); show('D6 short revision', push(f, 'receipts/d6.log'), f); }
// E. exact-words form with a gate that holds a shell operator: evidence.mjs runs without a shell.
genuine('E1 gate "node gate.mjs && node gate2.mjs" run as exact words (gate2 red never runs)', ['node', 'gate.mjs', '&&', 'node', 'gate2.mjs'], { gate: 'node gate.mjs && node gate2.mjs' });
genuine('E2 same gate via sh -c (gate2 red runs)', ['sh', '-c', 'node gate.mjs && node gate2.mjs'], { gate: 'node gate.mjs && node gate2.mjs' });
genuine('E3 single argv element "node gate.mjs" (no such program)', ['node gate.mjs']);
