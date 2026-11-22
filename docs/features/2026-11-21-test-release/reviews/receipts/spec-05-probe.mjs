// Spec 5 reviewer probe: install the payload into fixture projects, run task
// startup, then run each printed command exactly as printed through /bin/sh
// from the worker root. Usage: node spec-05-probe.mjs <repo-root>
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const repo = process.argv[2];
const folder = 'docs/features/2026-11-21-f';
const queuePath = `${folder}/specs/.joycraft-spec-queue.json`;
const forbidden = /&&|;|\||\$\(|<<|\bsource\b|\bcd\b/;
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8' });
const put = (file, body) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const cleanup = [];

function fixture(label, parentName, checks) {
  const parent = realpathSync(mkdtempSync(join(tmpdir(), 'jc-spec5-')));
  cleanup.push(parent);
  const root = join(parent, parentName);
  mkdirSync(root, { recursive: true });
  git(root, 'init', '-q', '-b', 'main');
  execFileSync(process.execPath, [join(repo, 'dist/cli.js'), 'init', '.', '--yes'], { cwd: root, encoding: 'utf8' });
  const pinned = join(parent, 'pin.json');
  copyFileSync(join(root, '.joycraft/installation.json'), pinned);
  put(join(root, 'joycraft.yaml'), 'tests:\n  focused: "node {files}"\n');
  put(join(root, '.gitignore'), '.joycraft/local/\n');
  put(join(root, folder, 'brief.md'), '# Brief\n\n## Goal\n\nText.\n');
  const spec = `${folder}/specs/01-a.md`;
  put(join(root, spec), '---\nid: 1\nstatus: in-review\n---\n# A\n\n## acceptance\n\n- It works. Check: the tests pass.\n');
  for (const file of checks) put(join(root, file), 'console.log("ran", process.argv.slice(1).join(","));\n');
  put(join(root, 'src/a.ts'), 'export const a = 1;\n');
  put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: 'f', specs: [{ id: 1, file: '01-a.md', depends_on: [], status: 'in-review', mode: 'checkpoint',
    verification: { inputs: [{ path: `${folder}/brief.md`, kind: 'requirement' }, { path: spec, kind: 'requirement' }, { path: 'src/a.ts', kind: 'code' }, ...checks.map(path => ({ path, kind: 'check' }))],
      criteria: [{ id: 'spec-1-1', requirement: { path: spec, anchor: 'acceptance' }, requiredKinds: ['runtime'] }] } }] }, null, 2));
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'init');
  console.log(`\n=== fixture ${label}: root=${JSON.stringify(root)} checks=${JSON.stringify(checks)}`);
  return { root, pinned };
}

function start({ root, pinned }, role) {
  const caps = ['filesystem:read', 'filesystem:write-report', ...(role === 'reviewer' ? ['agent:separate-context'] : [])].join(',');
  const r = spawnSync(process.execPath, ['.joycraft/runtime/dispatch-start.mjs', '--worker-root', root, '--expected-manifest', pinned,
    '--queue', queuePath, '--spec', '1', '--role', role, '--implementer-session', 'impl-1', '--out', `.joycraft/local/packets/${role}.json`,
    '--capabilities', caps, '--native-session', role === 'reviewer' ? 'review-1' : 'impl-1'], { cwd: root, encoding: 'utf8' });
  console.log(`startup ${role}: exit ${r.status}${r.stderr ? ` stderr=${r.stderr.trim()}` : ''}`);
  return r.stdout ? JSON.parse(r.stdout).commands : null;
}

function runAsPrinted(root, name, command) {
  const r = spawnSync('/bin/sh', ['-c', command], { cwd: root, encoding: 'utf8' });
  const out = `${r.stdout}${r.stderr}`.trim().split('\n').slice(0, 3).join(' | ');
  console.log(`  ${name}: forbidden=${forbidden.test(command)} exit=${r.status}\n    printed: ${command}\n    output: ${out}`);
}

for (const [label, parentName, checks] of [
  ['plain', 'proj', ['tests/a.mjs', 'tests/b.mjs']],
  ['space-in-root', 'my proj', ['tests/a.mjs', 'tests/b.mjs']],
  ['space-in-check', 'proj', ['tests/a b.mjs']],
]) {
  const project = fixture(label, parentName, checks);
  for (const role of ['reviewer', 'implementer']) {
    const commands = start(project, role);
    if (!commands) continue;
    console.log(`  focused: ${JSON.stringify(commands.focused)}`);
    for (const [name, command] of Object.entries(commands)) {
      if (name === 'focused' || name === 'note') continue;
      runAsPrinted(project.root, `${role}.${name}`, command);
    }
  }
}
for (const dir of cleanup) rmSync(dir, { recursive: true, force: true });
