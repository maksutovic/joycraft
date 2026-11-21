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

describe('age-out review fixes', () => {
  const ageOutRaw = (root: string, args: string[]) => {
    try { return { status: 0, json: ageOut(root, args) }; }
    catch (error) { const e = error as { status: number; stderr: string }; return { status: e.status, json: null, stderr: e.stderr }; }
  };

  it('[review-a-1] about 3 MB of log names does not overflow the Git buffer', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-age-out-big-')));
    dirs.push(root);
    git(root, ['init', '-q', '-b', 'main']);
    const names = Array.from({ length: 2500 }, (_, index) => `docs/research/some-long-topic-folder/2026-10-01-research-note-number-${index}.md`);
    for (let round = 0; round < 12; round += 1) {
      for (const name of names) put(root, name, `# note ${round}\n`);
      git(root, ['add', '.'], daysAgo(30)); git(root, ['commit', '-q', '-m', `c${round}`], daysAgo(30));
    }
    const out = ageOutRaw(root, ['--days', '14']);
    expect(out.status).toBe(0);
    expect(out.json.count).toBe(2500);
  }, 60000);

  it('[review-a-2] entry files, project files, mapped pages and backlog files are not working docs', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-age-out-map-')));
    dirs.push(root);
    git(root, ['init', '-q', '-b', 'main']);
    put(root, 'joycraft.yaml', 'paths:\n  features: features\n  archive: archive\n  context: context\n');
    put(root, 'AGENTS.md', '# A\n\n| `guides/releasing.md` | Releasing |\n[setup](guides/setup.md)\n');
    put(root, 'CLAUDE.md', '@AGENTS.md\n@guides/imported.md\n');
    put(root, 'context/arch.md', '# Arch\n\nSee [deep](../guides/deep.md).\n');
    for (const file of ['guides/releasing.md', 'guides/setup.md', 'guides/imported.md', 'guides/deep.md', 'pkg/AGENTS.md', 'pkg/CLAUDE.md', 'README.md', 'pkg/readme.md',
      'CHANGELOG.md', 'CONTRIBUTING.md', 'LICENSE.md', 'SECURITY.md', 'CODE_OF_CONDUCT.md', 'notes/backlog-ideas.md', 'notes/backlog/item.md', 'notes/old.md']) put(root, file, '# x\n');
    git(root, ['add', '.'], daysAgo(30)); git(root, ['commit', '-q', '-m', 'old'], daysAgo(30));
    const out = ageOut(root, ['--days', '14']);
    expect(out.docs.map((doc: { path: string }) => doc.path)).toEqual(['notes/old.md']);
  });

  it('[review-a-2] a dirty or missing doc is skipped, every other doc moves, and non-ASCII names work', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-age-out-dirty-')));
    dirs.push(root);
    git(root, ['init', '-q', '-b', 'main']);
    for (const file of ['docs/research/a.md', 'docs/research/b.md', 'docs/research/café.md', 'docs/research/c.md']) put(root, file, '# x\n');
    put(root, 'docs/context/guide.md', '# g\n');
    git(root, ['add', '.'], daysAgo(30)); git(root, ['commit', '-q', '-m', 'old'], daysAgo(30));
    put(root, 'docs/research/a.md', '# edited\n');
    rmSync(join(root, 'docs/research/b.md'));
    const out = ageOutRaw(root, ['--days', '14', '--apply']);
    expect(out.status).toBe(0);
    expect(out.json.docs.map((doc: { path: string }) => doc.path).sort()).toEqual(['docs/research/c.md', 'docs/research/café.md']);
    expect(out.json.skipped.map((item: { path: string }) => item.path).sort()).toEqual(['docs/research/a.md', 'docs/research/b.md']);
    expect(existsSync(join(root, 'docs/archive/working/research/café.md'))).toBe(true);
    expect(existsSync(join(root, 'docs/research/a.md'))).toBe(true);
  });

  it('[review-a-2] cleanup.md runs age-out before the final checks of the attended pass', () => {
    const reference = readFileSync(join(payload, '.joycraft', 'references', 'cleanup.md'), 'utf8');
    expect(reference.indexOf('cleanup.mjs age-out --days 14')).toBeGreaterThan(-1);
    expect(reference.indexOf('cleanup.mjs age-out --days 14')).toBeLessThan(reference.indexOf('6. **Check.**'));
  });
});
