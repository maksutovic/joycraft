// Reviewer probe for test-release spec 15 (wave-gate text + CI read once).
// Usage: node spec-15-probe.mjs <project-root>
// Walks a coordinator through a two-wave queue using only what the implement skill,
// testing.md and delivery.md say, against the real payload runtime:
// coordinator.mjs gate-plan / gate-owner, evidence.mjs run, delivery.mjs push --gate-receipt.
// Prints one line per step: the observed result and whether the remote ref moved.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const repo = path.resolve(process.argv[2] ?? '.');
const rt = path.join(repo, 'payload/.joycraft/runtime');
const dirs = [];
const git = (cwd, ...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...a], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (f, b) => { mkdirSync(path.dirname(f), { recursive: true }); writeFileSync(f, b); };
const node = (root, script, args) => spawnSync(process.execPath, [path.join(rt, script), ...args], { cwd: root, encoding: 'utf8' });
const last = text => (text.trim().split('\n').at(-1) ?? '');
const head = root => git(root, 'rev-parse', 'HEAD');
const ref = remote => spawnSync('git', ['rev-parse', '--verify', '-q', 'refs/heads/feature'], { cwd: remote, encoding: 'utf8' }).stdout.trim();
const footer = (root, receipt) => { const line = readFileSync(path.join(root, receipt), 'utf8').trim().split('\n').at(-1); return JSON.parse(line.replace(/^joycraft-evidence: /, '')); };

// A gate with shell syntax (&&), as many projects record (`pnpm test && pnpm typecheck`).
const GATE = 'node gate.mjs && node lint.mjs';
const queue = 'docs/features/f/specs/.joycraft-spec-queue.json';
const spec = (id, deps, inputs) => ({ id, file: `0${id}-s.md`, depends_on: deps, status: 'todo', mode: 'checkpoint',
  verification: { inputs: inputs.map(p => ({ path: p, kind: 'code' })), criteria: [] } });

function fixture(gateRuns) {
  const base = realpathSync(mkdtempSync(path.join(tmpdir(), 'jc-r15-probe-'))); dirs.push(base);
  const remote = path.join(base, 'remote.git'); const root = path.join(base, 'work');
  git(base, 'init', '-q', '--bare', remote); mkdirSync(root); git(root, 'init', '-q', '-b', 'main');
  put(path.join(root, '.gitignore'), '.joycraft/local/\n');
  put(path.join(root, 'joycraft.yaml'), `tests:\n  gate: ${JSON.stringify(GATE)}\n${gateRuns ? `  gateRuns: ${gateRuns}\n` : ''}`);
  put(path.join(root, 'gate.mjs'), "import './src/a.mjs'; import './src/b.mjs'; console.log('gate ok');\n");
  put(path.join(root, 'lint.mjs'), "console.log('lint ok');\n");
  put(path.join(root, 'src/a.mjs'), 'export const a = 1;\n');
  put(path.join(root, 'src/b.mjs'), 'export const b = 1;\n');
  // Two waves: specs 1 and 2 are independent (wave 1); spec 3 depends on both (wave 2).
  put(path.join(root, queue), JSON.stringify({ schemaVersion: 1, feature: 'f', specs: [
    spec(1, [], ['src/a.mjs']), spec(2, [], ['src/b.mjs']), spec(3, [1, 2], ['src/c.mjs']) ] }, null, 2));
  for (const id of [1, 2, 3]) put(path.join(root, `docs/features/f/specs/0${id}-s.md`), `---\nid: ${id}\nstatus: todo\n---\n# s${id}\n`);
  git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'base');
  const first = head(root);
  git(root, 'remote', 'add', 'origin', remote);
  return { root, remote, first };
}
const evidence = (root, receipt, argv) => { mkdirSync(path.join(root, path.dirname(receipt)), { recursive: true }); const r = node(root, 'evidence.mjs', ['run', '--receipt', receipt, '--', ...argv]); if (r.status === 2) console.log(`  evidence refused: ${last(r.stderr)}`); return r; };
const push = (f, receipt) => node(f.root, 'delivery.mjs', ['push', '--root', f.root, '--base', f.first, '--remote', 'origin', '--branch', 'feature', '--gate-receipt', receipt]);
const show = (name, r, f) => {
  const moved = ref(f.remote);
  console.log(`${name} :: exit=${r.status} ${r.status === 0 ? `stdout.ok=${JSON.parse(r.stdout).ok}` : `stderr=${JSON.stringify(last(r.stderr))}`} remoteRef=${moved ? (moved === head(f.root) ? 'HEAD' : moved.slice(0, 8)) : 'none'}`);
};
const commitSpec = (f, file, body, msg) => { put(path.join(f.root, file), body); git(f.root, 'add', '.'); git(f.root, 'commit', '-q', '-m', msg); };

try {
  // A. gate-plan: default (spec) vs wave.
  for (const mode of [undefined, 'spec', 'wave']) {
    const f = fixture(mode); const r = node(f.root, 'coordinator.mjs', ['gate-plan', '--queue', queue]);
    const plan = JSON.parse(r.stdout);
    console.log(`A gate-plan gateRuns=${mode ?? '(unset)'} :: exit=${r.status} gateRuns=${plan.gateRuns} waves=${JSON.stringify(plan.waves)} gatePoints=${JSON.stringify(plan.gatePoints)}`);
  }

  // B. Two-wave walk in wave mode.
  const f = fixture('wave');
  // Wave 1: specs 1 and 2 integrated.
  commitSpec(f, 'src/a.mjs', 'export const a = 2;\n', 'spec 1');
  commitSpec(f, 'src/b.mjs', 'export const b = 2;\n', 'spec 2');
  // B1. Gate point 1, run naively as plain argv (what "run the gate through evidence.mjs" might suggest without delivery.md).
  const naive = evidence(f.root, '.joycraft/local/g1-naive.log', GATE.split(' '));
  console.log(`B1 evidence plain argv of shell gate :: exit=${naive.status} footerArgv=${JSON.stringify(footer(f.root, '.joycraft/local/g1-naive.log').argv)}`);
  show('B1 push with plain-argv receipt', push(f, '.joycraft/local/g1-naive.log'), f);
  // B2. Shell form, as delivery.md says, but with a pending uncommitted file and receipt in the feature folder (a non-ignored path evidence.mjs allows).
  put(path.join(f.root, 'notes.txt'), 'pending\n');
  const dirty = evidence(f.root, 'docs/features/f/receipts/g1-dirty.log', ['sh', '-c', GATE]);
  console.log(`B2 evidence shell form, pending file, tracked feature-folder receipt :: exit=${dirty.status} dirty=${footer(f.root, 'docs/features/f/receipts/g1-dirty.log').dirty}`);
  show('B2 push with dirty-tree receipt', push(f, 'docs/features/f/receipts/g1-dirty.log'), f);
  // B3. Commit pending files first, receipt at a non-ignored path: clean at run time.
  git(f.root, 'add', 'notes.txt'); git(f.root, 'commit', '-q', '-m', 'pending notes');
  rmSync(path.join(f.root, 'docs/features/f/receipts'), { recursive: true, force: true });
  const committed = evidence(f.root, 'docs/features/f/receipts/g1-clean.log', ['sh', '-c', GATE]);
  console.log(`B3 evidence shell form after committing pending :: exit=${committed.status} dirty=${footer(f.root, 'docs/features/f/receipts/g1-clean.log').dirty}`);
  show('B3 push with clean receipt at non-ignored path', push(f, 'docs/features/f/receipts/g1-clean.log'), f);
  rmSync(path.join(f.root, 'docs/features/f/receipts'), { recursive: true, force: true });
  // B4. Receipt at a git-ignored path: green, pushes.
  const ignored = evidence(f.root, '.joycraft/local/g1.log', ['sh', '-c', GATE]);
  console.log(`B4 evidence shell form, ignored receipt :: exit=${ignored.status} dirty=${footer(f.root, '.joycraft/local/g1.log').dirty}`);
  show('B4 push with ignored green receipt', push(f, '.joycraft/local/g1.log'), f);

  // Wave 2: spec 3 adds src/c.mjs and breaks src/a.mjs (a file in spec 1's inputs).
  commitSpec(f, 'src/c.mjs', 'export const c = 1;\n', 'spec 3 part 1');
  commitSpec(f, 'src/a.mjs', 'throw new Error("a broke");\n', 'spec 3 part 2');
  const red = evidence(f.root, '.joycraft/local/g2-red.log', ['sh', '-c', GATE]);
  console.log(`B5 evidence wave-2 gate :: exit=${red.status} footerExit=${footer(f.root, '.joycraft/local/g2-red.log').exitCode}`);
  show('B5 push with red receipt', push(f, '.joycraft/local/g2-red.log'), f);
  const owner = node(f.root, 'coordinator.mjs', ['gate-owner', '--queue', queue, '--file', 'src/a.mjs', '--file', './src/zzz.mjs']);
  console.log(`B6 gate-owner src/a.mjs + unowned :: exit=${owner.status} ${owner.stdout.trim().replace(/\s+/g, ' ')}`);
  // B7. Fix round, second gate green, push.
  commitSpec(f, 'src/a.mjs', 'export const a = 3;\n', 'fix round');
  const green2 = evidence(f.root, '.joycraft/local/g2.log', ['sh', '-c', GATE]);
  console.log(`B7 evidence wave-2 gate after fix :: exit=${green2.status}`);
  show('B7 push with green receipt', push(f, '.joycraft/local/g2.log'), f);
  // B8. Session end adds a records-only commit (testing.md: needs no test run), then pushes with the last receipt.
  commitSpec(f, 'docs/features/f/specs/01-s.md', '---\nid: 1\nstatus: done\n---\n# s1\n', 'records');
  show('B8 session-end push after records commit, previous receipt', push(f, '.joycraft/local/g2.log'), f);
  // B9. No receipt at all.
  show('B9 push without --gate-receipt', node(f.root, 'delivery.mjs', ['push', '--root', f.root, '--base', f.first, '--remote', 'origin', '--branch', 'feature']), f);
  console.log(`gate runs in wave walk (green or red at a gate point, shell form): ${['g1', 'g2-red', 'g2'].length} for 2 gate points + 1 fix-round rerun`);
} finally {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
}
