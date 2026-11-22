// Reviewer probe for test-release spec 7 (delivery gate receipt; gate-plan; gate-owner).
// Usage: node spec-07-probe.mjs <project-root>
// Builds temp Git repos with a bare remote, writes receipts with payload evidence.mjs (genuine)
// or by hand (forged), runs payload delivery.mjs push, and prints one line per case:
// the observed exit/stderr and whether the remote ref moved.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync, appendFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const repo = path.resolve(process.argv[2] ?? '.');
const rt = path.join(repo, 'payload/.joycraft/runtime');
const dirs = [];
const git = (cwd, ...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...a], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (f, b) => { mkdirSync(path.dirname(f), { recursive: true }); writeFileSync(f, b); };

function fixture(gateBody = "console.log('gate ok');\n") {
  const base = realpathSync(mkdtempSync(path.join(tmpdir(), 'jc-r7-probe-'))); dirs.push(base);
  const remote = path.join(base, 'remote.git'); const root = path.join(base, 'work');
  git(base, 'init', '-q', '--bare', remote); mkdirSync(root); git(root, 'init', '-q', '-b', 'main');
  put(path.join(root, '.gitignore'), 'receipts/\n');
  put(path.join(root, 'joycraft.yaml'), 'tests:\n  gate: node gate.mjs\n');
  put(path.join(root, 'gate.mjs'), gateBody);
  put(path.join(root, 'other.mjs'), "console.log('other');\n");
  git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'one');
  const first = git(root, 'rev-parse', 'HEAD');
  put(path.join(root, 'b.txt'), 'b\n'); git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'two');
  git(root, 'remote', 'add', 'origin', remote);
  return { root, remote, first };
}
const evidence = (root, receipt, argv) => spawnSync(process.execPath, [path.join(rt, 'evidence.mjs'), 'run', '--receipt', receipt, '--', ...argv], { cwd: root, encoding: 'utf8' });
const push = (root, first, receipt) => spawnSync(process.execPath, [path.join(rt, 'delivery.mjs'), 'push', '--root', root, '--base', first, '--remote', 'origin', '--branch', 'feature', '--gate-receipt', receipt], { cwd: root, encoding: 'utf8' });
const ref = remote => spawnSync('git', ['rev-parse', '--verify', '-q', 'refs/heads/feature'], { cwd: remote, encoding: 'utf8' }).stdout.trim();
const head = root => git(root, 'rev-parse', 'HEAD');
const show = (name, r, remote, root) => {
  const moved = ref(remote); const err = r.stderr.trim().split('\n').at(-1) ?? '';
  console.log(`${name} :: exit=${r.status} stderr=${JSON.stringify(err)} remoteRef=${moved ? (moved === head(root) ? 'HEAD' : moved) : 'none'}`);
};
const fakeFooter = (root, name, value) => put(path.join(root, 'receipts', name), `hand written, gate never ran\njoycraft-evidence: ${JSON.stringify(value)}\n`);

try {
  // 1. fake footer: hand-written, green, HEAD, clean; the gate never ran.
  { const f = fixture("process.exit(1);\n"); fakeFooter(f.root, 'fake.log', { argv: ['node', 'gate.mjs'], exitCode: 0, revision: head(f.root), dirty: false });
    show('1 forged footer (gate would be red)', push(f.root, f.first, 'receipts/fake.log'), f.remote, f.root); }
  // 2. red receipt: genuine evidence.mjs run of a failing gate.
  { const f = fixture("process.exit(1);\n"); const e = evidence(f.root, 'receipts/red.log', ['node', 'gate.mjs']);
    console.log(`2 evidence exit=${e.status}`); show('2 genuine red receipt', push(f.root, f.first, 'receipts/red.log'), f.remote, f.root); }
  // 3. receipt for another revision: genuine green run, then a new commit.
  { const f = fixture(); evidence(f.root, 'receipts/green.log', ['node', 'gate.mjs']);
    put(path.join(f.root, 'c.txt'), 'c\n'); git(f.root, 'add', '.'); git(f.root, 'commit', '-q', '-m', 'three');
    show('3 genuine green receipt for previous commit', push(f.root, f.first, 'receipts/green.log'), f.remote, f.root); }
  // 3b. receipt for another branch's revision (checkout away and back is the same commit; use a sibling commit).
  { const f = fixture(); git(f.root, 'checkout', '-q', '-b', 'side'); put(path.join(f.root, 's.txt'), 's\n'); git(f.root, 'add', '.'); git(f.root, 'commit', '-q', '-m', 'side');
    evidence(f.root, 'receipts/side.log', ['node', 'gate.mjs']); git(f.root, 'checkout', '-q', 'main');
    show('3b genuine green receipt for a sibling commit', push(f.root, f.first, 'receipts/side.log'), f.remote, f.root); }
  // 4. dirty receipt: genuine run with an untracked file, then the file is removed so the tree is clean at push.
  { const f = fixture(); put(path.join(f.root, 'scratch.txt'), 'x\n'); evidence(f.root, 'receipts/dirty.log', ['node', 'gate.mjs']); unlinkSync(path.join(f.root, 'scratch.txt'));
    show('4 genuine dirty receipt (tree clean at push)', push(f.root, f.first, 'receipts/dirty.log'), f.remote, f.root); }
  // 4b. footer dirty:null (git could not say) and missing dirty.
  { const f = fixture(); fakeFooter(f.root, 'null.log', { argv: ['node', 'gate.mjs'], exitCode: 0, revision: head(f.root), dirty: null });
    fakeFooter(f.root, 'nodirty.log', { argv: ['node', 'gate.mjs'], exitCode: 0, revision: head(f.root) });
    show('4b dirty:null', push(f.root, f.first, 'receipts/null.log'), f.remote, f.root);
    show('4c dirty missing', push(f.root, f.first, 'receipts/nodirty.log'), f.remote, f.root); }
  // 5. receipt of a different command: genuine green runs.
  { const f = fixture();
    evidence(f.root, 'receipts/other.log', ['node', 'other.mjs']); show('5 genuine other command', push(f.root, f.first, 'receipts/other.log'), f.remote, f.root);
    evidence(f.root, 'receipts/extra.log', ['node', 'gate.mjs', '--only', 'x']); show('5b gate plus extra args', push(f.root, f.first, 'receipts/extra.log'), f.remote, f.root);
    evidence(f.root, 'receipts/shor.log', ['sh', '-c', 'node gate.mjs || true']); show('5c sh -c gate || true', push(f.root, f.first, 'receipts/shor.log'), f.remote, f.root);
    evidence(f.root, 'receipts/echo.log', ['/bin/echo', '-c', 'node gate.mjs']); show('5d /bin/echo -c "node gate.mjs" (gate never ran)', push(f.root, f.first, 'receipts/echo.log'), f.remote, f.root); }
  // 5e. a different-command receipt on a fresh fixture, so 5d's push does not mask it: node -c (syntax check) wrapper.
  { const f = fixture("process.exit(1);\n"); const e = evidence(f.root, 'receipts/nodec.log', [process.execPath, '-e', '0', '-c', 'node gate.mjs']);
    console.log(`5e evidence exit=${e.status}`); show('5e node -e 0 -c "node gate.mjs" (red gate never ran)', push(f.root, f.first, 'receipts/nodec.log'), f.remote, f.root); }
  // 6. old receipt: genuine green on HEAD, then output appended after the footer (footer no longer last line).
  { const f = fixture(); evidence(f.root, 'receipts/old.log', ['node', 'gate.mjs']); appendFileSync(path.join(f.root, 'receipts/old.log'), 'later output\n');
    show('6 footer not on last line', push(f.root, f.first, 'receipts/old.log'), f.remote, f.root); }
  // 6b. two old green receipts concatenated: last footer is for the previous commit.
  { const f = fixture(); const h = head(f.root);
    fakeFooter(f.root, 'cat.log', { argv: ['node', 'gate.mjs'], exitCode: 0, revision: f.first, dirty: false });
    show('6b old receipt (previous revision)', push(f.root, f.first, 'receipts/cat.log'), f.remote, f.root); void h; }
  // 7. positive: genuine green gate receipt on HEAD pushes.
  { const f = fixture(); evidence(f.root, 'receipts/ok.log', ['node', 'gate.mjs']);
    show('7 genuine green receipt on HEAD', push(f.root, f.first, 'receipts/ok.log'), f.remote, f.root); }
  // 8. receipt path outside the project (absolute).
  { const f = fixture(); const outside = path.join(path.dirname(f.root), 'outside.log');
    writeFileSync(outside, `x\njoycraft-evidence: ${JSON.stringify({ argv: ['node', 'gate.mjs'], exitCode: 0, revision: head(f.root), dirty: false })}\n`);
    show('8 absolute receipt path outside project', push(f.root, f.first, outside), f.remote, f.root); }
  // 9. gate-plan with done specs and a dependency on a done spec; gate-owner normalisation.
  { const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'jc-r7-plan-'))); dirs.push(root); git(root, 'init', '-q');
    put(path.join(root, 'joycraft.yaml'), 'tests:\n  gate: pnpm verify\n  gateRuns: wave\n');
    const q = 'docs/features/demo/specs/.joycraft-spec-queue.json';
    const spec = (id, deps, status, check) => ({ id, file: `0${id}-s.md`, depends_on: deps, status, mode: 'batch', verification: { inputs: [{ path: `docs/features/demo/specs/0${id}-s.md`, kind: 'requirement' }, { path: check, kind: 'check' }], criteria: [{ id: 'a', requirement: { path: `docs/features/demo/specs/0${id}-s.md`, anchor: 'a' }, requiredKinds: ['runtime'] }] } });
    for (const id of [1, 2, 3, 4]) put(path.join(root, `docs/features/demo/specs/0${id}-s.md`), `---\nid: ${id}\nstatus: todo\n---\n# S\n`);
    put(path.join(root, q), JSON.stringify({ schemaVersion: 1, feature: 'demo', specs: [spec(1, [], 'done', 'tests/a.test.ts'), spec(2, [1], 'todo', 'tests/shared.test.ts'), spec(3, [2], 'in-review', 'tests/shared.test.ts'), spec(4, [1], 'todo', 'tests/d.test.ts')] }));
    const co = args => spawnSync(process.execPath, [path.join(rt, 'coordinator.mjs'), ...args], { cwd: root, encoding: 'utf8' });
    const p = co(['gate-plan', '--queue', q]); console.log(`9 gate-plan exit=${p.status} ${JSON.stringify(JSON.parse(p.stdout || '{}'))}`);
    const o = co(['gate-owner', '--queue', q, '--file', 'tests/shared.test.ts', '--file', 'tests/a.test.ts', '--file', 'tests//d.test.ts']); console.log(`9b gate-owner exit=${o.status} ${o.stdout.replace(/\s+/g, ' ')}`);
    const n = co(['gate-owner', '--queue', q]); console.log(`9c gate-owner no --file exit=${n.status} stderr=${JSON.stringify(n.stderr.trim().split('\n')[0])}`); }
} finally { for (const d of dirs) rmSync(d, { recursive: true, force: true }); }
