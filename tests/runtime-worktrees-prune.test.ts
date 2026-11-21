import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const runtime = join(__dirname, '..', 'payload', '.joycraft', 'runtime', 'worktrees.mjs');
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

const receipt = 'docs/features/f/receipts/a.log';
const report = 'docs/features/f/reports/review.json';

async function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-prune-')));
  dirs.push(root);
  git(root, 'init', '-q', '-b', 'main');
  put(join(root, '.gitignore'), '*.log\n');
  put(join(root, 'docs/features/f/queue.json'), JSON.stringify({
    schemaVersion: 1, feature: 'f',
    specs: [{ id: 1, file: 'specs/01.md', status: 'done', mode: 'batch', depends_on: [], verification: { inputs: [] }, acceptedReport: { path: report, sha256: 'a'.repeat(64) } }],
  }));
  put(join(root, report), JSON.stringify({ schemaVersion: 1, flows: [{ id: 'f1', observations: [{ kind: 'runtime', receipts: [{ path: receipt, sha256: 'b'.repeat(64) }] }] }] }));
  git(root, 'add', '.');
  git(root, 'commit', '-q', '-m', 'init');
  const { createWorktree, pruneWorktrees } = await import(runtime);
  const tree = createWorktree({ root, queuePath: 'docs/features/f/queue.json', specId: 1, session: 's' });
  return { root, tree: join(root, tree.path), pruneWorktrees };
}

describe('worktrees prune and cited receipts', () => {
  it('[AC:prune-keeps-cited-receipt] keeps a tree holding an ignored receipt the accepted report cites', async () => {
    const { root, tree, pruneWorktrees } = await fixture();
    put(join(tree, receipt), 'PASS\n');
    expect(git(tree, 'check-ignore', receipt).trim()).toBe(receipt);
    const result = pruneWorktrees({ root, apply: true });
    expect(result.plan).toHaveLength(1);
    expect(result.plan[0].action).toBe('keep');
    expect(result.plan[0].reason).toContain(receipt);
    expect(git(root, 'worktree', 'list')).toContain('f-1');
  });

  it('[AC:prune-without-cited-receipt] prunes a tree with no such file as before', async () => {
    const { root, tree, pruneWorktrees } = await fixture();
    const result = pruneWorktrees({ root, apply: true });
    expect(result.plan[0].action).toBe('remove');
    expect(git(root, 'worktree', 'list')).not.toContain(tree);
  });

  it('[AC:prune-receipt-copied] prunes once the cited receipt also exists in the main checkout', async () => {
    const { root, tree, pruneWorktrees } = await fixture();
    put(join(tree, receipt), 'PASS\n');
    put(join(root, receipt), 'PASS\n');
    expect(pruneWorktrees({ root }).plan[0].action).toBe('remove');
  });
});
