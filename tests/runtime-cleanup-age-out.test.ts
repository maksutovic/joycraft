import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// Spec: docs/features/2026-11-21-drift-tidy/specs/09-age-out.md
const payload = join(__dirname, '..', 'payload');
const cleanup = join(payload, '.joycraft', 'runtime', 'cleanup.mjs');
const git = (cwd: string, args: string[], env: NodeJS.ProcessEnv = {}) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (root: string, file: string, body: string) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), body); };
const daysAgo = (days: number) => { const at = new Date(Date.now() - days * 86400000).toISOString(); return { GIT_AUTHOR_DATE: at, GIT_COMMITTER_DATE: at }; };
const ageOut = (root: string, args: string[]) => JSON.parse(execFileSync('node', [cleanup, 'age-out', ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-age-out-')));
  dirs.push(root);
  git(root, ['init', '-q', '-b', 'main']);
  // Old docs in every folder: only the working doc counts.
  for (const file of ['docs/research/old.md', 'docs/context/guide.md', 'docs/features/f/brief.md', 'docs/archive/a/brief.md', 'docs/backlog/item.md']) put(root, file, '# x\n');
  git(root, ['add', '.'], daysAgo(20)); git(root, ['commit', '-q', '-m', 'old docs'], daysAgo(20));
  put(root, 'docs/notes/new.md', '# y\n');
  git(root, ['add', '.'], daysAgo(5)); git(root, ['commit', '-q', '-m', 'new doc'], daysAgo(5));
  return root;
}

describe('age-out', () => {
  it('[AC:spec-9-1] --days 14 lists only the working doc last committed 20 days ago, with count and age', () => {
    const root = fixture();
    const out = ageOut(root, ['--days', '14']);
    expect(out.count).toBe(1);
    expect(out.docs).toMatchObject([{ path: 'docs/research/old.md', days: 20 }]);
  });

  it('[AC:spec-9-2] --apply moves the doc under the archive with git mv and commits nothing', () => {
    const root = fixture();
    const head = git(root, ['rev-parse', 'HEAD']);
    const out = ageOut(root, ['--days', '14', '--apply']);
    expect(out.docs[0].to).toBe('docs/archive/working/research/old.md');
    expect(existsSync(join(root, 'docs/archive/working/research/old.md'))).toBe(true);
    expect(existsSync(join(root, 'docs/research/old.md'))).toBe(false);
    expect(git(root, ['status', '--porcelain'])).toBe('R  docs/research/old.md -> docs/archive/working/research/old.md');
    expect(git(root, ['rev-parse', 'HEAD'])).toBe(head);
  });

  it('[AC:spec-9-3] cleanup.md asks it in the attended pass only; the session-end skill does not name it', () => {
    const reference = readFileSync(join(payload, '.joycraft', 'references', 'cleanup.md'), 'utf8');
    const steps = reference.slice(reference.indexOf('## The steps'), reference.indexOf('\n## ', reference.indexOf('## The steps') + 1));
    expect(steps).toContain('cleanup.mjs age-out --days 14');
    expect(steps).toMatch(/never at session end/);
    expect(readFileSync(join(payload, '.agents', 'skills', 'joycraft-session-end', 'SKILL.md'), 'utf8')).not.toContain('age-out');
  });
});
