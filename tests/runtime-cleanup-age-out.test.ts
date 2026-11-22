import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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
    put(root, 'AGENTS.md', '# A\n\n| `docs/guides/releasing.md` | Releasing |\n[setup](docs/guides/setup.md)\n');
    put(root, 'CLAUDE.md', '@AGENTS.md\n@docs/guides/imported.md\n');
    put(root, 'docs/context/arch.md', '# Arch\n\nSee [deep](../guides/deep.md).\n');
    for (const file of ['guides/releasing.md', 'guides/setup.md', 'guides/imported.md', 'guides/deep.md', 'pkg/AGENTS.md', 'pkg/CLAUDE.md', 'README.md', 'pkg/readme.md',
      'CHANGELOG.md', 'CONTRIBUTING.md', 'LICENSE.md', 'SECURITY.md', 'CODE_OF_CONDUCT.md', 'notes/backlog-ideas.md', 'notes/backlog/item.md', 'notes/old.md']) put(root, `docs/${file}`, '# x\n');
    git(root, ['add', '.'], daysAgo(30)); git(root, ['commit', '-q', '-m', 'old'], daysAgo(30));
    const out = ageOut(root, ['--days', '14']);
    expect(out.docs.map((doc: { path: string }) => doc.path)).toEqual(['docs/notes/old.md']);
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

describe('age-out review 9 fixes', () => {
  const repo = (files: Record<string, string>, config?: string) => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-age-out-r9-')));
    dirs.push(root);
    git(root, ['init', '-q', '-b', 'main']);
    if (config) put(root, 'joycraft.yaml', config);
    for (const [file, body] of Object.entries(files)) put(root, file, body);
    git(root, ['add', '-A'], daysAgo(30)); git(root, ['commit', '-q', '-m', 'old'], daysAgo(30));
    return root;
  };
  const listed = (out: { docs: { path: string }[] }) => out.docs.map(doc => doc.path).sort();

  // Spec 29: config now refuses a docs root of `.` before age-out runs.
  it('[review-9-1] a docs root of `.` exits 1 from config, naming the docs root, and moves nothing', () => {
    const root = repo({ 'context/a.md': '# a\n', 'notes/old.md': '# x\n', '.claude/skills/s/SKILL.md': '# s\n', '.joycraft/references/cleanup.md': '# r\n', 'src/lib/design.md': '# d\n' },
      'paths:\n  features: features\n  archive: archive\n  context: context\n');
    const result = spawnSync('node', [cleanup, 'age-out', '--days', '14', '--apply'], { cwd: root, encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('docs root');
    expect(git(root, ['status', '--porcelain'])).toBe('');
    expect(existsSync(join(root, '.claude/skills/s/SKILL.md'))).toBe(true);
  });

  it('[review-9-1] dot segments and installed files are never working docs', () => {
    const root = repo({
      'docs/context/a.md': '# a\n', 'docs/.joycraft/notes.md': '# n\n', 'docs/research/.drafts/d.md': '# d\n', 'docs/tools/installed.md': '# i\n', 'docs/research/x.md': '# x\n',
      '.joycraft/installation.json': JSON.stringify({ files: [{ path: 'docs/tools/installed.md', sha256: 'x' }] }),
    });
    expect(listed(ageOut(root, ['--days', '14']))).toEqual(['docs/research/x.md']);
  });

  it('[review-9-2] a backticked name with #anchor, :line or a docs-root-relative path is map-reached', () => {
    const root = repo({
      'docs/context/guide.md': '# G\n\nSee `docs/research/anchor.md#part`, `docs/research/line.md:12` and `research/rel.md`.\n',
      'docs/research/anchor.md': '', 'docs/research/line.md': '', 'docs/research/rel.md': '', 'docs/research/plain.md': '',
    });
    expect(listed(ageOut(root, ['--days', '14']))).toEqual(['docs/research/plain.md']);
  });

  it('[review-9-3] a doc changed in a merge counts as changed', () => {
    const root = repo({ 'docs/context/a.md': '', 'docs/research/m.md': 'base\n' });
    git(root, ['checkout', '-q', '-b', 'side']); put(root, 'docs/research/m.md', 'side\n'); git(root, ['commit', '-q', '-am', 'side'], daysAgo(25));
    git(root, ['checkout', '-q', 'main']); put(root, 'docs/research/m.md', 'main\n'); git(root, ['commit', '-q', '-am', 'main'], daysAgo(25));
    try { git(root, ['merge', '-q', 'side']); } catch { /* the conflict is expected */ }
    put(root, 'docs/research/m.md', 'resolved\n'); git(root, ['add', '.']); git(root, ['commit', '-q', '-m', 'merge']);
    expect(listed(ageOut(root, ['--days', '14']))).toEqual([]);
  });

  it('[review-9-4] CLAUDE.local.md is never a working doc', () => {
    const root = repo({ 'docs/context/a.md': '', 'docs/research/CLAUDE.local.md': '# local\n', 'docs/research/x.md': '' });
    expect(listed(ageOut(root, ['--days', '14']))).toEqual(['docs/research/x.md']);
  });

  const dotDocs = 'paths:\n  features: .docs/features\n  archive: .docs/archive\n  context: .docs/context\n';

  // Spec 29: config now refuses a hidden docs root before age-out runs.
  it('[review-9-r2-1] a dot-folder docs root exits 1 from config, naming the docs root', () => {
    const root = repo({ '.docs/context/a.md': '# a\n', '.docs/research/old.md': '# x\n', '.docs/.drafts/x.md': '# d\n' }, dotDocs);
    const result = spawnSync('node', [cleanup, 'age-out', '--days', '14'], { cwd: root, encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('docs root');
    expect(git(root, ['status', '--porcelain'])).toBe('');
  });

  it('[review-9-r2-2] a symlinked docs root, or a symlink on the way to it, gives one skipped entry', () => {
    const root = repo({ 'shared/research/old.md': '# x\n', 'shared/context/a.md': '# a\n', 'site/real/research/old.md': '# y\n' },
      'paths:\n  features: site/docs/features\n  archive: site/docs/archive\n  context: site/docs/context\n');
    symlinkSync('../shared', join(root, 'site/docs'));
    git(root, ['add', '-A'], daysAgo(30)); git(root, ['commit', '-q', '-m', 'link'], daysAgo(30));
    expect(ageOut(root, ['--days', '14', '--apply'])).toMatchObject({ count: 0, docs: [], applied: false, skipped: [{ path: 'site/docs', reason: 'site/docs is a symlink: age-out reads only a real docs folder' }] });
    const parent = repo({ 'real/docs/research/old.md': '# x\n', 'real/docs/context/a.md': '# a\n' },
      'paths:\n  features: link/docs/features\n  archive: link/docs/archive\n  context: link/docs/context\n');
    symlinkSync('real', join(parent, 'link'));
    git(parent, ['add', '-A'], daysAgo(30)); git(parent, ['commit', '-q', '-m', 'link'], daysAgo(30));
    expect(ageOut(parent, ['--days', '14']).skipped).toEqual([{ path: 'link/docs', reason: 'link is a symlink: age-out reads only a real docs folder' }]);
    expect(git(parent, ['status', '--porcelain'])).toBe('');
  });

  it('[review-9-r2-3] a tracked symlink doc is never listed or moved; it is skipped with a reason', () => {
    const root = repo({ 'docs/context/a.md': '# a\n', 'shared/real.md': '# r\n', 'docs/research/plain.md': '# p\n' });
    symlinkSync('../../shared/real.md', join(root, 'docs/research/link.md'));
    git(root, ['add', '-A'], daysAgo(30)); git(root, ['commit', '-q', '-m', 'link'], daysAgo(30));
    const out = ageOut(root, ['--days', '14', '--apply']);
    expect(listed(out)).toEqual(['docs/research/plain.md']);
    expect(out.skipped).toEqual([{ path: 'docs/research/link.md', reason: 'It is a symlink: moving it would break its link.' }]);
    expect(lstatSync(join(root, 'docs/research/link.md')).isSymbolicLink()).toBe(true);
    expect(existsSync(join(root, 'docs/archive/working/research/link.md'))).toBe(false);
  });

  it('[review-9-r2-4] a docs root with no tracked file gives one skipped entry instead of an empty list', () => {
    const root = repo({ 'notes/a.md': '# a\n' });
    expect(ageOut(root, ['--days', '14'])).toMatchObject({ count: 0, docs: [], skipped: [{ path: 'docs', reason: 'Git tracks no file under docs' }] });
  });

  it('[review-9-r2-5] a project in a subfolder of its repository lists its old docs and skips a dirty one', () => {
    const top = repo({ 'app/docs/context/a.md': '# a\n', 'app/docs/research/old.md': '# x\n', 'app/docs/research/dirty.md': '# d\n' });
    put(top, 'app/docs/research/dirty.md', '# edited\n');
    const out = ageOut(join(top, 'app'), ['--days', '14', '--apply']);
    expect(listed(out)).toEqual(['docs/research/old.md']);
    expect(out.skipped).toEqual([{ path: 'docs/research/dirty.md', reason: 'It has uncommitted changes.' }]);
    expect(existsSync(join(top, 'app/docs/archive/working/research/old.md'))).toBe(true);
  });
});

// Spec: docs/features/2026-11-22-fixes-1-9-1/specs/03-cleanup-fixes.md
describe('age-out 1.9.1 cleanup fixes', () => {
  const repo = (files: Record<string, string>, config?: string) => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-age-out-191-')));
    dirs.push(root);
    git(root, ['init', '-q', '-b', 'main']);
    if (config) put(root, 'joycraft.yaml', config);
    for (const [file, body] of Object.entries(files)) put(root, file, body);
    git(root, ['add', '-A'], daysAgo(20)); git(root, ['commit', '-q', '-m', 'old'], daysAgo(20));
    return root;
  };

  it('[AC:spec-3-2] a doc whose name holds a double quote or a tab gets its real age', () => {
    const names = ['docs/research/say "hi".md', ...(process.platform === 'win32' ? [] : ['docs/research/tab\there.md'])];
    const root = repo({ 'docs/context/a.md': '# a\n', ...Object.fromEntries(names.map(name => [name, '# x\n'])) });
    const out = ageOut(root, ['--days', '14']);
    expect(out.skipped).toEqual([]);
    expect(out.docs.map((doc: { path: string; days: number }) => [doc.path, doc.days]).sort()).toEqual(names.map(name => [name, 20]).sort());
  });

  it('[AC:spec-3-3] a docs root in a case Git does not track names both cases; with no folder the message stays', () => {
    const none = repo({ 'notes/a.md': '# a\n' }, 'paths:\n  features: Docs/features\n  archive: Docs/archive\n  context: Docs/context\n');
    expect(ageOut(none, ['--days', '14']).skipped).toEqual([{ path: 'Docs', reason: 'Git tracks no file under Docs' }]);
    const root = repo({ 'docs/context/a.md': '# a\n', 'docs/research/old.md': '# x\n' }, 'paths:\n  features: Docs/features\n  archive: Docs/archive\n  context: Docs/context\n');
    // The mismatch shows only where the temp disk ignores case.
    if (!existsSync(join(root, 'DOCS'))) return;
    const out = ageOut(root, ['--days', '14']);
    expect(out).toMatchObject({ count: 0, docs: [] });
    expect(out.skipped).toHaveLength(1);
    expect(out.skipped[0].path).toBe('Docs');
    expect(out.skipped[0].reason).toMatch(/differs in case/);
    expect(out.skipped[0].reason).toContain('Docs');
    expect(out.skipped[0].reason).toContain('docs');
  });
});
