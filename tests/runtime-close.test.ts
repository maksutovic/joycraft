import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyInstall, planInstall } from '../src/install-v1.js';

// sl2-01: close.mjs closes a small job in one command. It refuses once and names
// every problem, or it archives the brief, commits, and prints one line.
const repo = join(__dirname, '..');
const close = join(repo, 'payload/.joycraft/runtime/close.mjs');
// A clean Git environment: no global or system config, so identity comes only from the test.
const home = realpathSync(mkdtempSync(join(tmpdir(), 'jc-close-home-')));
const env = { ...process.env, HOME: home, XDG_CONFIG_HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: join(home, 'none') };
for (const name of ['GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_NAME', 'GIT_COMMITTER_EMAIL', 'EMAIL']) delete env[name];
const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const runClose = (root: string, ...args: string[]) => spawnSync(process.execPath, [close, ...args, '--root', root], { cwd: root, env, encoding: 'utf8' });
const linePattern = /^Path: small job\. (\d+) of (\d+) lines checked(?: \(not checked: ([\d, ]+)\))?\. Look: (.+)\. No code review ran\. (?:Commit ([0-9a-f]{7,})\.|No Git: not committed\.) Brief: (\S+\/brief\.md)\.$/;
const rows = (root: string) => readFileSync(join(root, '.joycraft/local/small-jobs.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));

const dirs: string[] = [home];
afterEach(() => { for (const dir of dirs.splice(1)) rmSync(dir, { recursive: true, force: true }); });

const brief = (lines: string[], look = '- Look: OK') => `# Add a title\n\nAdd a title.\n\n## Done when\n\n${lines.map((line, index) => `${index + 1}. ${line}`).join('\n')}\n\n## Assumptions\n\n- Assumed: the title is short.\n\n${look}\n`;
const marked = ['The page shows the title. test: tests/title.test.ts', 'The title is bold. seen: .tmp/shot.png'];

function project({ withGit = true, commit = true, identity = true } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-close-')));
  dirs.push(root);
  put(join(root, 'AGENTS.md'), '# Demo\n\nPurpose: show a title.\n');
  put(join(root, 'tests/title.test.ts'), 'export {};\n');
  if (withGit) {
    git(root, 'init', '-q', '-b', 'main');
    if (identity) { git(root, 'config', 'user.name', 't'); git(root, 'config', 'user.email', 't@example.com'); }
    if (commit) { git(root, 'add', '.'); git(root, '-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-q', '-m', 'init'); }
  }
  return root;
}

describe('close.mjs', () => {
  it('[AC:sl2-01] archives an untracked brief in a repository with a commit, and the move is in HEAD', () => {
    const root = project();
    put(join(root, 'docs/features/title/brief.md'), brief(marked));
    put(join(root, 'docs/features/title/notes.md'), 'A note.\n');
    put(join(root, 'src/title.ts'), 'export const title = "Hi";\n');
    git(root, 'add', 'src/title.ts');
    const result = runClose(root, 'title', '-m', 'feat: add a title');
    expect(result.status, result.stderr).toBe(0);
    expect(existsSync(join(root, 'docs/features/title'))).toBe(false);
    expect(existsSync(join(root, 'docs/archive/title/brief.md'))).toBe(true);
    expect(git(root, 'ls-tree', '-r', '--name-only', 'HEAD').split('\n')).toEqual(expect.arrayContaining(['docs/archive/title/brief.md', 'docs/archive/title/notes.md', 'src/title.ts']));
    expect(git(root, 'rev-list', '--count', 'HEAD')).toBe('2');
    expect(git(root, 'log', '-1', '--format=%s')).toBe('feat: add a title');
    expect(git(root, 'status', '--porcelain')).toBe('');
    const [line] = result.stdout.trim().split('\n');
    expect(line).toMatch(linePattern);
    expect(line).toBe(`Path: small job. 2 of 2 lines checked. Look: OK. No code review ran. Commit ${git(root, 'rev-parse', '--short', 'HEAD')}. Brief: docs/archive/title/brief.md.`);
  });

  it('[AC:sl2-01] an unborn HEAD gives one commit and sets the first-commit flag', () => {
    const root = project({ commit: false });
    put(join(root, 'docs/features/title/brief.md'), brief(marked));
    git(root, 'add', 'AGENTS.md', 'tests');
    const result = runClose(root, 'title', '-m', 'feat: first');
    expect(result.status, result.stderr).toBe(0);
    expect(git(root, 'rev-list', '--count', 'HEAD')).toBe('1');
    expect(git(root, 'ls-tree', '-r', '--name-only', 'HEAD').split('\n')).toEqual(['AGENTS.md', 'docs/archive/title/brief.md', 'tests/title.test.ts']);
    expect(rows(root).at(-1)).toMatchObject({ event: 'closed', slug: 'title', firstCommit: true, commit: git(root, 'rev-parse', '--short', 'HEAD') });
  });

  it('[AC:sl2-01] no Git: archives, exits 0 and says it did not commit', () => {
    const root = project({ withGit: false });
    put(join(root, 'docs/features/title/brief.md'), brief(marked));
    const result = runClose(root, 'title', '-m', 'feat: add a title');
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout.trim()).toBe('Path: small job. 2 of 2 lines checked. Look: OK. No code review ran. No Git: not committed. Brief: docs/archive/title/brief.md.');
    expect(existsSync(join(root, 'docs/archive/title/brief.md'))).toBe(true);
    expect(existsSync(join(root, 'docs/features/title'))).toBe(false);
    expect(rows(root).at(-1)).toMatchObject({ commit: null, firstCommit: false });
  });

  it('[AC:sl2-01] an unmarked line gives exit 2 and moves nothing; --accept closes and counts it as not checked', () => {
    const root = project();
    put(join(root, 'docs/features/title/brief.md'), brief([...marked, 'The title fits on a phone.', 'The title is red. not checked: no render']));
    const refused = runClose(root, 'title', '-m', 'feat: add a title');
    expect(refused.status).toBe(2);
    expect(refused.stderr).toMatch(/^Close stopped:/);
    expect(refused.stderr).toContain('Line 3 has no mark.');
    expect(refused.stderr).toContain('--accept');
    expect(existsSync(join(root, 'docs/features/title/brief.md'))).toBe(true);
    expect(existsSync(join(root, 'docs/archive'))).toBe(false);
    expect(git(root, 'rev-list', '--count', 'HEAD')).toBe('1');

    const accepted = runClose(root, 'title', '-m', 'feat: add a title', '--accept');
    expect(accepted.status, accepted.stderr).toBe(0);
    const [line, ...notes] = accepted.stdout.trim().split('\n');
    const match = linePattern.exec(line);
    expect(match?.slice(1, 4)).toEqual(['2', '4', '3, 4']);
    expect(notes).toContain('Note: --accept closed past 1 problem.');
    // The jsonl row holds the same counts as the printed line.
    expect(rows(root).at(-1)).toMatchObject({ event: 'closed', slug: 'title', lines: 4, checked: 2, notChecked: 2, notCheckedLines: [3, 4], look: 'OK', refused: 1, accepted: true, firstCommit: false, commit: match?.[5] });
    expect(typeof rows(root).at(-1).briefCreated).toBe('string');
  });

  it('[AC:sl2-01] names every problem together: no look, a missing test file, an existing target', () => {
    const root = project();
    put(join(root, 'docs/features/title/brief.md'), brief(['The page shows the title. test: tests/gone.test.ts'], ''));
    put(join(root, 'docs/archive/title/brief.md'), 'old\n');
    const result = runClose(root, 'title', '-m', 'feat: x', '--accept');
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('docs/archive/title/ already exists.');
    expect(result.stderr).not.toContain('--accept');
    const plain = runClose(root, 'title', '-m', 'feat: x');
    expect(plain.stderr).toContain('Line 1 names the test file tests/gone.test.ts, which does not exist.');
    expect(plain.stderr).toContain('The brief has no `Look:` line');
    expect(plain.stderr).toContain('docs/archive/title/ already exists.');
    expect(existsSync(join(root, 'docs/features/title/brief.md'))).toBe(true);
  });

  it('[AC:sl2-01] a stale "not established" line outside the managed block stops the close; --accept passes it', () => {
    const root = project();
    put(join(root, 'AGENTS.md'), '# Demo\n\nPurpose: not established yet.\n\n<!-- joycraft:managed -->\n- Stack: not established is fine here.\n<!-- /joycraft:managed -->\n');
    git(root, 'add', 'AGENTS.md');
    git(root, 'commit', '-q', '-m', 'agents');
    put(join(root, 'docs/features/title/brief.md'), brief(marked));
    const refused = runClose(root, 'title', '-m', 'feat: x');
    expect(refused.status).toBe(2);
    expect(refused.stderr).toContain('AGENTS.md line 3 says "not established" outside the managed block.');
    expect(refused.stderr).not.toContain('line 6');
    expect(runClose(root, 'title', '-m', 'feat: x', '--accept').status).toBe(0);
  });

  it('[AC:sl2-01] a missing Git identity stops the close, even with --accept', () => {
    const root = project({ commit: false, identity: false });
    put(join(root, 'docs/features/title/brief.md'), brief(marked));
    const result = runClose(root, 'title', '-m', 'feat: x', '--accept');
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Git has no user name and email.');
    expect(existsSync(join(root, 'docs/features/title/brief.md'))).toBe(true);
  });

  it('[AC:sl2-01] no brief stops the close; notes name unstaged files and other open briefs', () => {
    const root = project();
    const none = runClose(root, 'title', '-m', 'feat: x', '--accept');
    expect(none.status).toBe(2);
    expect(none.stderr).toContain('There is no brief at docs/features/title/brief.md.');
    put(join(root, 'docs/features/title/brief.md'), brief(marked));
    put(join(root, 'docs/features/other/brief.md'), brief(marked));
    put(join(root, 'scratch.txt'), 'x\n');
    const result = runClose(root, 'title', '-m', 'feat: x');
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout.trim().split('\n').slice(1)).toEqual([
      'Note: 2 files are not staged and not in this commit.',
      'Note: other open briefs: docs/features/other/brief.md.',
    ]);
  });
});

describe('close.mjs in the sl1-01 fixture', () => {
  const runtime = (root: string, script: string, ...args: string[]) =>
    spawnSync(process.execPath, [join(root, '.joycraft/runtime', script), ...args], { cwd: root, env, encoding: 'utf8' });
  const reports = (root: string) => [
    runtime(root, 'wiring.mjs', '--root', root),
    runtime(root, 'status.mjs', '--root', root),
    runtime(root, 'cleanup.mjs', '--root', root),
    runtime(root, 'gate.mjs', 'check', '--root', root),
  ].map(result => ({ status: result.status, stdout: result.stdout }));

  it('[AC:sl2-01] wiring, status, cleanup and gate check report nothing new after a close', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-close-fixture-')));
    dirs.push(root);
    git(root, 'init', '-q', '-b', 'main');
    git(root, 'config', 'user.name', 't');
    git(root, 'config', 'user.email', 't@example.com');
    applyInstall(planInstall(root, ['claude']));
    const printed = runtime(root, 'entry-check.mjs', 'block').stdout.trimEnd();
    put(join(root, 'AGENTS.md'), `# Demo\n\n${printed}\n\n## Context map\n\n| Read when | Document |\n|---|---|\n| Finding what the project is | \`docs/context/project.md\` |\n`);
    put(join(root, 'CLAUDE.md'), '@AGENTS.md\n');
    put(join(root, 'docs/context/project.md'), '# Demo\n\nA small page.\n');
    put(join(root, 'tests/title.test.ts'), 'export {};\n');
    git(root, 'add', '.');
    git(root, 'commit', '-q', '-m', 'init');
    const before = reports(root);
    expect(before.map(report => report.status)).toEqual([0, 0, 0, 0]);
    put(join(root, 'docs/features/x/brief.md'), '# Add a title\n\nAdd a title.\n\n## Goals\n\n- Done when: the page shows a title. test: `tests/title.test.ts`\n- Assumed: the title is short.\n- Look: OK\n');
    const result = runtime(root, 'close.mjs', 'x', '-m', 'feat: add a title', '--root', root);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout.trim()).toMatch(linePattern);
    expect(reports(root)).toEqual(before);
  });
});
