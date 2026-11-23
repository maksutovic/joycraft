import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// Spec: docs/features/2026-11-21-test-release/specs/23-worker-commands-text.md
const root = join(__dirname, '..');
const raw = (...parts: string[]) => readFileSync(join(root, 'payload', ...parts), 'utf8');
const read = (...parts: string[]) => raw(...parts).replace(/\s+/g, ' ');
const agents = {
  implementer: read('.claude', 'agents', 'joycraft-implementer.md'),
  reviewer: read('.claude', 'agents', 'joycraft-reviewer.md'),
};
const dispatch = read('.joycraft', 'references', 'dispatch.md');
const setup = read('.joycraft', 'references', 'setup.md');
const evidence = join(root, 'payload', '.joycraft', 'runtime', 'evidence.mjs');

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

/** A Git project that ignores .joycraft/local/ and keeps a worker variable in the machine-local env map. */
function fixture() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'jc-worker-commands-')));
  dirs.push(dir);
  const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd: dir, stdio: 'ignore' });
  git('init', '-q', '-b', 'main');
  writeFileSync(join(dir, '.gitignore'), '.joycraft/local/\n');
  git('add', '-A'); git('commit', '-q', '-m', 'init');
  mkdirSync(join(dir, '.joycraft', 'local'), { recursive: true });
  writeFileSync(join(dir, '.joycraft', 'local', 'evidence-env.json'), '{"RUNNER_MAX_WORKERS": "3"}\n');
  return dir;
}

describe('worker commands text', () => {
  it('[AC:spec-23-1] both agent files and dispatch.md name heredoc, source and cd out as forbidden and point to the printed commands', () => {
    for (const text of Object.values(agents)) {
      expect(text).toContain("never `&&`, `;`, `|`, `$(git …)`, a heredoc, `source` or `cd` out of the root, which worktree isolation refuses. Paste the startup output's `commands`.");
    }
    expect(dispatch).toContain("or use `$(git …)`, a heredoc, `source` or `cd` out of the root; a worktree-isolated host refuses these. Paste the startup output's `commands`.");
  });

  it('[AC:spec-23-2] attended setup sends a runner worker variable to the machine-local evidence-env.json, which evidence applies', () => {
    expect(setup).toContain("When the runner config cannot hold a worker cap, put the runner's worker variable in the machine-local `.joycraft/local/evidence-env.json`, which `evidence.mjs` applies to every run, never in a tracked file.");
    const dir = fixture();
    const receipt = '.joycraft/local/receipt.log';
    const run = spawnSync(process.execPath, [evidence, 'run', '--receipt', receipt, '--', process.execPath, '-e', 'console.log("workers=" + process.env.RUNNER_MAX_WORKERS)'], { cwd: dir, encoding: 'utf8' });
    expect(run.status).toBe(0);
    expect(readFileSync(join(dir, receipt), 'utf8')).toContain('workers=3');
  });
});

// Spec: docs/features/2026-11-22-fixes-1-9-3/specs/02-one-worker-home.md
describe('one worker home (1.9.3)', () => {
  const implement = read('.agents', 'skills', 'joycraft-implement', 'SKILL.md');
  const worktrees = read('.joycraft', 'references', 'worktrees.md');

  it('[AC:spec-2-1] parallel workers get a worktrees.mjs tree on every host and never the host isolation as well', () => {
    expect(implement).toContain('own tree and build/cache state, on every host:');
    // [AC:spec-3-1] 1.9.4 adds the agent-type frontmatter to this sentence.
    expect(implement).toContain('Launch its worker without host worktree isolation (Claude Code: no Agent `isolation`, an agent type without `isolation` frontmatter), naming the printed `workerRoot`.');
    expect(implement).not.toContain('when the host has no native worktree isolation');
    expect(worktrees).toContain('`worktrees.mjs` is the one home for worker trees on every host:');
    expect(worktrees).toContain('Never use both:');
    for (const gone of ['isolation: "worktree"', 'worktree.baseRef', '.worktreeinclude', 'WorktreeCreate']) expect(worktrees).not.toContain(gone);
    expect(dispatch).not.toContain('auto-created worktree');
    expect(dispatch).toContain("A parallel spec's startup reads `--coordinator`, `--parallel` and `--access` from its `worktrees.mjs` record or the lease; pass them only to override.");
  });

  it('[AC:spec-2-2] the implementer runs each command in a named worker root with one cd prefix', () => {
    expect(agents.implementer).toContain("When the task names a worker root that is not your shell's folder, run each command as `cd <worker-root> && <one command>`: no worktree isolation is active, so this is the one allowed compound form.");
    expect(agents.implementer).toContain("which worktree isolation refuses. Paste the startup output's `commands`.");
  });

  it('[AC:spec-2-3] each stage update is said once, not again after the dispatch', () => {
    expect(implement).toContain('Give each concise stage update once; never repeat pre-dispatch text after the dispatch.');
  });
});

// Spec: docs/features/2026-11-22-fixes-1-9-3/specs/04-reviewer-start.md
describe('reviewer start text (1.9.3)', () => {
  it('[AC:spec-4-3] the reviewer gets the start command, --help, the worker-root cd form and its agent ID from the coordinator', () => {
    expect(agents.reviewer).toContain('run `node .joycraft/runtime/dispatch-start.mjs --queue <queue> --spec <id> --role reviewer` from your worker root, adding `--coordinator-session <id>` when the task names one. `--help` lists the defaults.');
    expect(agents.reviewer).toContain("When the task names a worker root that is not your shell's folder, run each command as `cd <worker-root> && <one command>`.");
    expect(dispatch).toContain('A Claude Code child cannot see its own agent ID: the coordinator sends it the ID from the launch result before its startup.');
  });
});

// Spec: docs/features/2026-11-22-fixes-1-9-4/specs/03-field-text.md
describe('field follow-up text (1.9.4)', () => {
  const implement = read('.agents', 'skills', 'joycraft-implement', 'SKILL.md');
  const completionRef = read('.joycraft', 'references', 'completion.md');
  const update = read('.joycraft', 'references', 'update.md');

  it('[AC:spec-3-1] the implement skill names the agent-type frontmatter, the focused rerun after an integration edit, and reopen', () => {
    expect(implement).toContain('an agent type without `isolation` frontmatter');
    expect(implement).toContain('In `checkpoint`, commit each finished spec, integrate it, rerun its focused tests after any integration edit, and review the integrated bytes before continuing.');
    expect(implement).toContain("When `submit` warns that a done spec's accepted input changed, run the printed `completion.mjs reopen` for that spec and review it again.");
  });

  it('[AC:spec-3-2] completion, dispatch and update references describe reopen, the report path and when to update', () => {
    expect(completionRef).toContain('node .joycraft/runtime/completion.mjs reopen --queue <queue-path> --spec <id> --reason <text>');
    expect(completionRef).toContain("`reopen` moves such a spec back to `in-review`, keeps the old report in `reopened`, and restarts its review round count.");
    expect(dispatch).toContain('Each reviewer startup gets a new report path, which wins over any project naming rule.');
    expect(update).toContain('Update only between specs, while no implementer or reviewer runs; finish or park the work in progress first.');
  });
});

// Spec: .joycraft/local/loop/iter2/chair.md, sl2-06 part b (reviewer reading).
describe('reviewer reading (sl2-06b)', () => {
  it('[AC:sl2-06b-reading] the reviewer reads AGENTS.md, the matching map pages and the verify skill only, and skips the update check', () => {
    const text = agents.reviewer;
    expect(text).toContain('Read `AGENTS.md` (or `CLAUDE.md`), each page whose context-map row matches the spec, and `.claude/skills/joycraft-verify/SKILL.md`. Skip the update check. Open another reference only when a command refuses or a step below names it.');
    for (const gone of ['references/completion.md', 'contracts/types.d.ts', 'references/dispatch.md']) expect(agents.reviewer).not.toContain(gone);
  });
});
