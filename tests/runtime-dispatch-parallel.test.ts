import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyInstall, planInstall } from '../src/install-v1.js';

// Spec: docs/archive/2026-11-22-fixes-1-9-3/feature/specs/01-parallel-workspace.md
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const folder = 'docs/features/2026-11-22-p';
const queuePath = `${folder}/specs/.joycraft-spec-queue.json`;
const node = (cwd: string, script: string, ...args: string[]) => spawnSync(process.execPath, [join(cwd, '.joycraft/runtime', script), ...args], { cwd, encoding: 'utf8' });

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true, maxRetries: 5 }); });

/** A Git project with the shipped runtime and a queue of two independent specs marked execution.parallel: true. */
function project() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-parallel-')));
  const pinned = realpathSync(mkdtempSync(join(tmpdir(), 'jc-parallel-pin-')));
  dirs.push(root, pinned);
  git(root, 'init', '-q', '-b', 'main');
  applyInstall(planInstall(root, ['claude']));
  copyFileSync(join(root, '.joycraft/installation.json'), join(pinned, 'installation.json'));
  put(join(root, '.gitignore'), '.joycraft/local/\n');
  put(join(root, folder, 'brief.md'), '# Brief\n\n## Goal\n\nText.\n');
  const specs = [1, 2].map(id => {
    const spec = `${folder}/specs/0${id}-s.md`;
    put(join(root, spec), `---\nid: ${id}\nstatus: todo\n---\n# S${id}\n\n## acceptance\n\n- It works. Check: the test passes.\n`);
    put(join(root, `src/s${id}.ts`), `export const s = ${id};\n`);
    put(join(root, `tests/s${id}.test.ts`), 'test\n');
    return { id, file: `0${id}-s.md`, depends_on: [], status: 'todo', mode: 'checkpoint', execution: { parallel: true },
      verification: { inputs: [{ path: `${folder}/brief.md`, kind: 'requirement' }, { path: spec, kind: 'requirement' }, { path: `src/s${id}.ts`, kind: 'code' }, { path: `tests/s${id}.test.ts`, kind: 'check' }],
        criteria: [{ id: `spec-${id}-1`, requirement: { path: spec, anchor: 'acceptance' }, requiredKinds: ['runtime'] }] } };
  });
  put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: 'p', specs }, null, 2));
  git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'init');
  return { root, manifest: join(pinned, 'installation.json') };
}

/** Implementer startup for one spec, run from its worker root, with no workspace flags unless given. */
function start(worker: string, manifest: string, spec: number, extra: string[] = []) {
  const out = `.joycraft/local/packets/implementer-${spec}-${Math.random().toString(36).slice(2)}.json`;
  const result = node(worker, 'dispatch-start.mjs', '--worker-root', worker, '--expected-manifest', manifest, '--queue', queuePath, '--spec', String(spec),
    '--role', 'implementer', '--implementer-session', `impl-${spec}`, '--out', out, '--capabilities', 'filesystem:read,filesystem:write-report', '--native-session', `impl-${spec}`, ...extra);
  const packet = result.status === 0 ? JSON.parse(readFileSync(join(worker, out), 'utf8')) : null;
  return { ...result, packet };
}

const workspace = (packet: { workspace?: unknown; request?: { workspace?: unknown } }) => JSON.stringify(packet);

describe('parallel worker startup', () => {
  it('[AC:spec-1-1] both parallel specs start in their worktrees.mjs trees with no workspace flags, from a main or a linked coordinator', () => {
    for (const linked of [false, true]) {
      const { root, manifest } = project();
      let coordinator = root;
      if (linked) {
        coordinator = join(root, '..', `${root.split('/').pop()}-coord`);
        dirs.push(coordinator);
        git(root, 'worktree', 'add', '-q', '-b', 'coord', coordinator);
        coordinator = realpathSync(coordinator);
      }
      const claim = node(coordinator, 'coordinator.mjs', 'claim', '--queue', queuePath, '--session', 'coord-1', '--host', 'claude');
      expect(claim.status, claim.stderr).toBe(0);
      for (const spec of [1, 2]) {
        const created = node(coordinator, 'worktrees.mjs', 'create', '--queue', queuePath, '--spec', String(spec), '--session', 'coord-1');
        expect(created.status, created.stderr).toBe(0);
        const tree = JSON.parse(created.stdout);
        expect(tree.coordinatorRoot).toBe(linked ? `../${coordinator.split('/').pop()}` : '.');
        expect(tree.workerRoot).toBe(join(root, `.joycraft/local/worktrees/p-${spec}`));
        expect(tree.next).toContain('without host worktree isolation');
        const worker = realpathSync(tree.workerRoot);
        const started = start(worker, manifest, spec, ['--coordinator-session', 'coord-1']);
        expect(started.status, started.stderr).toBe(0);
        expect(JSON.parse(started.stdout).ready).toBe(true);
        const text = workspace(started.packet);
        expect(text).toContain('"kind":"git-worktree"');
        expect(text).toContain(`"coordinatorRoot":${JSON.stringify(coordinator)}`);
        expect(text).toContain('"parallel":true');
      }
    }
  }, 60000);

  it('[AC:spec-1-2] a tree with no worktrees.mjs record takes its coordinator from the lease; explicit flags still win', () => {
    const { root, manifest } = project();
    const worker = join(root, '..', `${root.split('/').pop()}-w1`);
    dirs.push(worker);
    git(root, 'worktree', 'add', '-q', '-b', 'w1', worker);
    const real = realpathSync(worker);
    expect(node(root, 'coordinator.mjs', 'claim', '--queue', queuePath, '--session', 'coord-1').status).toBe(0);
    const fromLease = start(real, manifest, 1, ['--coordinator-session', 'coord-1']);
    expect(fromLease.status, fromLease.stderr).toBe(0);
    expect(workspace(fromLease.packet)).toContain(`"coordinatorRoot":${JSON.stringify(root)}`);
    // An explicit workspace is used as given: here it names the worker itself, which preflight refuses.
    const explicit = start(real, manifest, 1, ['--coordinator-session', 'coord-1', '--coordinator', real, '--parallel', 'true', '--access', 'mutating']);
    expect(explicit.status).toBe(1);
    expect(explicit.stderr).toContain('distinct linked worker worktree');
  }, 60000);

  it('[AC:spec-1-3] with neither a record nor a lease, startup refuses and prints the exact startup with the workspace flags added', () => {
    const { root, manifest } = project();
    const worker = join(root, '..', `${root.split('/').pop()}-w2`);
    dirs.push(worker);
    git(root, 'worktree', 'add', '-q', '-b', 'w2', worker);
    const real = realpathSync(worker);
    const refused = start(real, manifest, 2);
    expect(refused.status).toBe(1);
    expect(refused.stderr).toContain('Spec 2 runs in parallel');
    const command = refused.stderr.trim().split('\n').pop()!;
    expect(command).toMatch(/^node \.joycraft\/runtime\/dispatch-start\.mjs --worker-root \S+ .* --spec 2 .* --coordinator '<coordinator-root>' --parallel true --access mutating$/);
    // The printed command, with the root filled in, starts.
    const args = command.split(' ').slice(2).map(word => word === "'<coordinator-root>'" ? root : word);
    const out = args.indexOf('--out');
    args[out + 1] = `${args[out + 1]}.again.json`;
    const rerun = spawnSync(process.execPath, [join(real, '.joycraft/runtime/dispatch-start.mjs'), ...args], { cwd: real, encoding: 'utf8' });
    expect(rerun.status, rerun.stderr).toBe(0);
  }, 60000);

  // Spec: docs/archive/2026-11-22-fixes-1-9-4/feature/specs/02-isolation-warning.md
  it('[AC:spec-2-1] worktrees.mjs create warns when a project agent type sets isolation: worktree', () => {
    const { root } = project();
    put(join(root, '.claude/agents/opus-implementer.md'), '---\nname: opus-implementer\nmodel: opus\nisolation: worktree\n---\nImplement.\n');
    put(join(root, '.claude/agents/plain.md'), '---\nname: plain\n---\nMentions isolation: worktree in the body only.\n');
    const created = node(root, 'worktrees.mjs', 'create', '--queue', queuePath, '--spec', '1', '--session', 'coord-1');
    expect(created.status, created.stderr).toBe(0);
    expect(JSON.parse(created.stdout).warnings).toEqual(['.claude/agents/opus-implementer.md sets isolation: worktree, so a worker launched as that agent type gets its own host worktree and cannot use this tree. Launch this worker as an agent type without it, such as joycraft-implementer or general-purpose.']);
    rmSync(join(root, '.claude/agents/opus-implementer.md'));
    const quiet = node(root, 'worktrees.mjs', 'create', '--queue', queuePath, '--spec', '2', '--session', 'coord-1');
    expect(JSON.parse(quiet.stdout).warnings).toBeUndefined();
  }, 60000);

  // Spec: docs/archive/2026-11-22-fixes-1-9-4/feature/specs/06-agents-folder.md
  it('[AC:spec-6-1] the isolation warning skips a directory named *.md and reads agent files in subfolders', () => {
    const { root } = project();
    mkdirSync(join(root, '.claude/agents/team.md'), { recursive: true });
    put(join(root, '.claude/agents/opus-implementer.md'), '---\nname: opus-implementer\nisolation: worktree\n---\nImplement.\n');
    put(join(root, '.claude/agents/team/reviewer.md'), '---\nname: team-reviewer\nisolation: worktree\n---\nReview.\n');
    put(join(root, '.claude/agents/team/plain.md'), '---\nname: team-plain\n---\nPlain.\n');
    const created = node(root, 'worktrees.mjs', 'create', '--queue', queuePath, '--spec', '1', '--session', 'coord-1');
    expect(created.status, created.stderr).toBe(0);
    const warnings: string[] = JSON.parse(created.stdout).warnings;
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/^\.claude\/agents\/opus-implementer\.md, \.claude\/agents\/team\/reviewer\.md set isolation: worktree,/);
  }, 60000);
});

// Spec: docs/features/2026-11-28-runtime-fixes-restate/specs/01-linked-coordinator.md
describe('a coordinator in a linked worktree ahead of main', () => {
  /** The project plus a linked coordinator tree with one commit main does not have. */
  function ahead() {
    const { root } = project();
    const coordinator = join(root, '..', `${root.split('/').pop()}-coord`);
    dirs.push(coordinator);
    git(root, 'worktree', 'add', '-q', '-b', 'coord', coordinator);
    const real = realpathSync(coordinator);
    put(join(real, 'src/extra.ts'), 'export const extra = 1;\n');
    git(real, 'add', '-A'); git(real, 'commit', '-q', '-m', 'coordinator-only commit');
    return { root, coordinator: real, head: git(real, 'rev-parse', 'HEAD'), mainHead: git(root, 'rev-parse', 'HEAD') };
  }
  const create = (cwd: string, spec: number) => {
    const created = node(cwd, 'worktrees.mjs', 'create', '--queue', queuePath, '--spec', String(spec), '--session', 'coord-1');
    expect(created.status, created.stderr).toBe(0);
    return JSON.parse(created.stdout);
  };

  it('[AC:spec-1-1] the worker tree starts from the coordinator HEAD, not main', () => {
    const { coordinator, head, mainHead } = ahead();
    expect(head).not.toBe(mainHead);
    const tree = create(coordinator, 1);
    expect(tree.baseRevision).toBe(head);
    expect(git(tree.workerRoot, 'rev-parse', 'HEAD')).toBe(head);
  }, 60000);

  it('[AC:spec-1-2] create succeeds when the queue exists only on the coordinator branch', () => {
    const { root, coordinator, head } = ahead();
    git(root, 'rm', '-q', '-r', folder); git(root, 'commit', '-q', '-m', 'main drops the feature');
    const tree = create(coordinator, 1);
    expect(tree.baseRevision).toBe(head);
    expect(tree.queuePath).toBe(queuePath);
  }, 60000);

  it('[AC:spec-1-3] prune with no --into removes the done, merged tree and keeps the unfinished one', () => {
    const { coordinator } = ahead();
    const one = create(coordinator, 1);
    create(coordinator, 2);
    put(join(one.workerRoot, 'src/s1.ts'), 'export const s = 11;\n');
    git(one.workerRoot, 'commit', '-q', '-am', 'spec 1');
    git(coordinator, 'merge', '-q', '--no-edit', 'joycraft/p-1');
    const queue = JSON.parse(readFileSync(join(coordinator, queuePath), 'utf8'));
    queue.specs[0].status = 'done';
    put(join(coordinator, queuePath), JSON.stringify(queue, null, 2));
    git(coordinator, 'commit', '-q', '-am', 'spec 1 done');
    const pruned = node(coordinator, 'worktrees.mjs', 'prune', '--apply');
    expect(pruned.status, pruned.stderr).toBe(0);
    const plan: { specId: number; action: string; reason: string }[] = JSON.parse(pruned.stdout).plan;
    expect(plan.find(item => item.specId === 1)).toMatchObject({ action: 'remove' });
    expect(plan.find(item => item.specId === 2)).toMatchObject({ action: 'keep', reason: 'Spec 2 is todo; keep the tree until it is done.' });
  }, 60000);

  it('[AC:spec-1-4] a coordinator in the main checkout still bases trees on main and prunes against main', () => {
    const { root } = project();
    const tree = create(root, 1);
    expect(tree.baseRevision).toBe(git(root, 'rev-parse', 'HEAD'));
    expect(tree.coordinatorRoot).toBe('.');
    const queue = JSON.parse(readFileSync(join(root, queuePath), 'utf8'));
    queue.specs[0].status = 'done';
    put(join(root, queuePath), JSON.stringify(queue, null, 2));
    git(root, 'commit', '-q', '-am', 'spec 1 done');
    const pruned = node(root, 'worktrees.mjs', 'prune', '--apply');
    expect(pruned.status, pruned.stderr).toBe(0);
    expect(JSON.parse(pruned.stdout).plan).toMatchObject([{ specId: 1, action: 'remove' }]);
  }, 60000);
});
