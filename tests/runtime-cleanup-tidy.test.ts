import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// Spec: docs/features/2026-11-21-drift-tidy/specs/02-tidy-report.md
const cleanup = join(__dirname, '..', 'payload', '.joycraft', 'runtime', 'cleanup.mjs');
const git = (cwd: string, args: string[], env: NodeJS.ProcessEnv = {}) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const tidy = (cwd: string, args: string[] = []) => {
  try { return { status: 0, json: JSON.parse(execFileSync('node', [cleanup, 'tidy', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })) }; }
  catch (error) { const e = error as { status: number; stdout: string }; return { status: e.status, json: JSON.parse(e.stdout) }; }
};

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
const tempDir = () => { const dir = realpathSync(mkdtempSync(join(tmpdir(), 'jc-tidy-'))); dirs.push(dir); return dir; };
const daysAgo = (days: number) => { const at = new Date(Date.now() - days * 86400000).toISOString(); return { GIT_AUTHOR_DATE: at, GIT_COMMITTER_DATE: at }; };
const commit = (root: string, file: string, message: string, env: NodeJS.ProcessEnv = {}) => {
  put(join(root, file), `${message}\n`);
  git(root, ['add', '.'], env); git(root, ['commit', '-q', '-m', message], env);
  return git(root, ['rev-parse', 'HEAD']);
};
function repo() {
  const root = tempDir();
  git(root, ['init', '-q', '-b', 'main']);
  commit(root, 'README.md', 'init', daysAgo(30));
  return root;
}

describe('tidy finds a stateless range', () => {
  it('[AC:spec-2-1] a feature branch uses the merge base with main', () => {
    const root = repo();
    const fork = commit(root, 'a.txt', 'main 1', daysAgo(20));
    git(root, ['checkout', '-q', '-b', 'feature']);
    commit(root, 'b.txt', 'feature 1');
    git(root, ['checkout', '-q', 'main']);
    commit(root, 'c.txt', 'main 2');
    git(root, ['checkout', '-q', 'feature']);
    const head = commit(root, 'd.txt', 'feature 2');
    expect(tidy(root).json).toMatchObject({ base: fork, head, approximate: false });
  });

  it('[AC:spec-2-1] a trunk-only repo uses the last 7 days, approximate', () => {
    const root = repo();
    let last = '';
    for (let index = 0; index < 4; index += 1) last = commit(root, `old${index}.txt`, `old ${index}`, daysAgo(10));
    for (let index = 0; index < 3; index += 1) commit(root, `new${index}.txt`, `new ${index}`, daysAgo(1));
    expect(tidy(root).json).toMatchObject({ base: last, approximate: true });
  });

  it('[AC:spec-2-1] a trunk-only repo uses at most 100 commits when the 7 days hold more', () => {
    const root = repo();
    // 103 empty commits from one fast-import process.
    const at = Math.floor(Date.now() / 1000) - 3600;
    const stream = Array.from({ length: 103 }, (_, index) => `commit refs/heads/main\ncommitter t <t@example.com> ${at + index} +0000\ndata 3\nc${String(index).padStart(2, '0').slice(-2)}\n${index === 0 ? 'from refs/heads/main^0\n' : ''}\n`).join('');
    execFileSync('git', ['fast-import', '--quiet'], { cwd: root, input: stream });
    git(root, ['reset', '-q', '--hard', 'main']);
    const hundredBack = git(root, ['rev-parse', 'HEAD~100']);
    expect(tidy(root).json).toMatchObject({ base: hundredBack, approximate: true });
  });

  it('[AC:spec-2-1] after a squash merge the branch still measures from its fork point; --base overrides', () => {
    const root = repo();
    const fork = commit(root, 'a.txt', 'main 1', daysAgo(20));
    git(root, ['checkout', '-q', '-b', 'feature']);
    commit(root, 'b.txt', 'feature 1');
    git(root, ['checkout', '-q', 'main']);
    git(root, ['merge', '-q', '--squash', 'feature']);
    git(root, ['commit', '-q', '-m', 'squash feature']);
    const squash = git(root, ['rev-parse', 'HEAD']);
    git(root, ['checkout', '-q', 'feature']);
    commit(root, 'e.txt', 'feature 2');
    expect(tidy(root).json).toMatchObject({ base: fork, approximate: false });
    expect(tidy(root, ['--base', squash]).json).toMatchObject({ base: squash, approximate: false });
  });

  it('[AC:spec-2-2] a shallow clone and a plain folder each give one skipped entry and exit 0', () => {
    const source = repo();
    commit(source, 'a.txt', 'two');
    const clone = join(tempDir(), 'clone');
    execFileSync('git', ['clone', '-q', '--depth', '1', `file://${source}`, clone], { stdio: 'ignore' });
    for (const root of [clone, tempDir()]) {
      const out = tidy(root);
      expect(out.status).toBe(0);
      expect(out.json.skipped).toHaveLength(1);
      expect(out.json.skipped[0]).toMatchObject({ check: 'tidy', reason: expect.any(String) });
      expect(out.json.findings).toEqual([]);
    }
  });
});

describe('tidy reports', () => {
  it('[AC:spec-2-3] new-doc groups added Markdown by folder, outside features and archive', () => {
    const root = repo();
    git(root, ['checkout', '-q', '-b', 'feature']);
    for (const file of ['docs/research/x/a.md', 'docs/research/x/b.md', 'docs/research/x/c.md', 'docs/notes/n.md', 'docs/features/f/brief.md', 'docs/archive/a/old.md', 'docs/backlog/item.md']) put(join(root, file), '# x\n');
    git(root, ['add', '.']); git(root, ['commit', '-q', '-m', 'docs']);
    const docs = tidy(root).json.findings.filter((item: { check: string }) => item.check === 'new-doc');
    expect(docs.map((item: { path: string; count: number }) => [item.path, item.count])).toEqual([['docs/notes', 1], ['docs/research/x', 3]]);
  });

  it('[AC:spec-2-4] at most 10 findings, context pages first, then more', () => {
    const root = repo();
    git(root, ['checkout', '-q', '-b', 'feature']);
    for (let index = 0; index < 13; index += 1) put(join(root, `docs/r${String(index).padStart(2, '0')}/a.md`), '# x\n');
    put(join(root, 'docs/context/new.md'), '# x\n');
    git(root, ['add', '.']); git(root, ['commit', '-q', '-m', 'docs']);
    const out = tidy(root);
    expect(Object.keys(out.json)).toEqual(expect.arrayContaining(['base', 'head', 'approximate', 'findings', 'more', 'skipped']));
    expect(out.json.findings).toHaveLength(10);
    expect(out.json.more).toBe(4);
    expect(out.json.findings[0].path).toBe('docs/context');
  });
});

describe('tidy review fixes', () => {
  it('[review-a-1] removing a 2.4 MB lockfile and a 2.4 MB source file does not overflow the Git buffer', () => {
    const root = repo();
    const big = Array.from({ length: 60000 }, (_, index) => `"package-${index}": "1.0.${index}",`).join('\n');
    put(join(root, 'package-lock.json'), `${big}\n`);
    put(join(root, 'src/data.ts'), `${big.replace(/"/g, "'")}\n`);
    git(root, ['add', '.']); git(root, ['commit', '-q', '-m', 'big files']);
    git(root, ['checkout', '-q', '-b', 'feature']);
    git(root, ['rm', '-q', 'package-lock.json', 'src/data.ts']); git(root, ['commit', '-q', '-m', 'drop them']);
    const out = tidy(root);
    expect(out.json.base).toBe(git(root, ['merge-base', 'main', 'HEAD']));
    expect(out.json.skipped).toEqual([]);
  });

  it('[review-a-7] a detached HEAD at the trunk tip reads the recent window, like the trunk', () => {
    const root = repo();
    commit(root, 'a.txt', 'main 1');
    const head = commit(root, 'b.txt', 'main 2');
    git(root, ['checkout', '-q', '--detach', 'main']);
    const out = tidy(root).json;
    expect(out.approximate).toBe(true);
    expect(out.head).toBe(head);
    expect(out.base).not.toBe(head);
  });
});

// Spec: docs/features/2026-11-22-fixes-1-9-1/specs/03-cleanup-fixes.md
describe('tidy 1.9.1 cleanup fixes', () => {
  it('[AC:spec-3-1] new-doc skips a backlog* file under the docs root, in any case; other new docs still count', () => {
    const root = repo();
    git(root, ['checkout', '-q', '-b', 'feature']);
    for (const file of ['docs/backlog.md', 'docs/Backlog-2026.md', 'docs/guides/x.md']) put(join(root, file), '# x\n');
    git(root, ['add', '.']); git(root, ['commit', '-q', '-m', 'docs']);
    const docs = tidy(root).json.findings.filter((item: { check: string }) => item.check === 'new-doc');
    expect(docs.map((item: { path: string; files: string[] }) => [item.path, item.files])).toEqual([['docs/guides', ['docs/guides/x.md']]]);
  });

  it('[AC:spec-3-5] tidy run from a subfolder finds the project root: same findings, and its checks: run', () => {
    const root = repo();
    put(join(root, '.joycraft/runtime/.keep'), '');
    put(join(root, 'joycraft.yaml'), 'checks:\n  - name: lint\n    run: sh lint.sh\n');
    put(join(root, 'lint.sh'), 'echo "docs/guides/x.md:2: Use the active voice."\n');
    git(root, ['add', '.']); git(root, ['commit', '-q', '-m', 'setup']);
    git(root, ['checkout', '-q', '-b', 'feature']);
    put(join(root, 'docs/guides/x.md'), '# x\n');
    git(root, ['add', '.']); git(root, ['commit', '-q', '-m', 'docs']);
    const fromRoot = tidy(root).json;
    const fromSub = tidy(join(root, 'docs/guides')).json;
    expect(fromRoot.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ check: 'lint', path: 'docs/guides/x.md', line: 2 }),
      expect.objectContaining({ check: 'new-doc', path: 'docs/guides' }),
    ]));
    expect(fromSub).toEqual(fromRoot);
  });
});
