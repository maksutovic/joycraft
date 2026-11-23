import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// Spec: docs/features/2026-11-21-drift-tidy/specs/11-start-advice.md
const wiring = join(__dirname, '..', 'payload', '.joycraft', 'runtime', 'wiring.mjs');
const git = (cwd: string, args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const run = (root: string) => {
  const result = spawnSync('node', [wiring, '--root', root], { cwd: root, encoding: 'utf8' });
  return { status: result.status, stderr: result.stderr, json: JSON.parse(result.stdout) as { advice: { check: string; lines?: string[] }[] } };
};
const tidyAdvice = (root: string) => run(root).json.advice.filter(item => item.check === 'tidy');

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
const tempDir = () => { const dir = realpathSync(mkdtempSync(join(tmpdir(), 'jc-advice-'))); dirs.push(dir); return dir; };
const save = (root: string, message: string) => { git(root, ['add', '-A']); git(root, ['commit', '-q', '-m', message]); };

/** A main branch with code and a guide that names it, then a feature branch. */
function project({ removeSymbol }: { removeSymbol: boolean }) {
  const root = tempDir();
  git(root, ['init', '-q', '-b', 'main']);
  put(join(root, 'AGENTS.md'), '# P\n\n## Context Map\n\n| Document | Read it when |\n|---|---|\n| `docs/context/guide.md` | Always |\n');
  put(join(root, 'src/widget.ts'), 'export function getWidget() { return 1; }\nexport function keepMe() { return 2; }\n');
  put(join(root, 'docs/context/guide.md'), '# Guide\n\nCall `getWidget` to get one.\n');
  save(root, 'init');
  git(root, ['checkout', '-q', '-b', 'feature']);
  put(join(root, 'src/widget.ts'), removeSymbol ? 'export function keepMe() { return 2; }\n' : 'export function getWidget() { return 1; }\nexport function keepMe() { return 3; }\n');
  save(root, 'change widget');
  return root;
}

describe('session start advice from the tidy range', () => {
  it('[AC:spec-11-1] a gone-symbol finding gives at most 3 lines, the last naming cleanup.mjs tidy; a clean fixture gives none', () => {
    const advice = tidyAdvice(project({ removeSymbol: true }));
    expect(advice).toHaveLength(1);
    const lines = advice[0].lines ?? [];
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThanOrEqual(3);
    expect(lines.at(-1)).toContain('cleanup.mjs tidy');
    expect(lines.join('\n')).toContain('docs/context/guide.md:3');
    expect(tidyAdvice(project({ removeSymbol: false }))).toEqual([]);
  });

  it('[AC:spec-11-2] advice does not change the exit code and edits no file', () => {
    const stale = project({ removeSymbol: true });
    const clean = project({ removeSymbol: false });
    const withFinding = run(stale);
    expect(withFinding.json.advice.some(item => item.check === 'tidy')).toBe(true);
    expect(withFinding.status).toBe(run(clean).status);
    expect(git(stale, ['status', '--porcelain'])).toBe('');
  });

  it('[AC:spec-11-3] a depth-1 clone gives no tidy advice and no error', () => {
    const source = project({ removeSymbol: true });
    const clone = join(tempDir(), 'clone');
    execFileSync('git', ['clone', '-q', '--depth', '1', '--branch', 'feature', `file://${source}`, clone], { stdio: 'ignore' });
    const result = run(clone);
    expect(result.stderr).toBe('');
    expect(result.json.advice.filter(item => item.check === 'tidy')).toEqual([]);
  });
});

describe('start advice polish (spec 27)', () => {
  it('[AC:spec-27-17] an entry-check.mjs that throws on import gives the same wiring result with no tidy advice', () => {
    const root = project({ removeSymbol: true });
    const copy = join(tempDir(), 'runtime');
    cpSync(dirname(wiring), copy, { recursive: true });
    writeFileSync(join(copy, 'entry-check.mjs'), "throw new Error('broken entry-check');\n");
    const normal = run(root);
    const broken = spawnSync('node', [join(copy, 'wiring.mjs'), '--root', root], { cwd: root, encoding: 'utf8' });
    const json = JSON.parse(broken.stdout) as { wired: boolean; advice: { check: string }[] };
    expect(broken.status).toBe(normal.status);
    expect(json.wired).toBe((normal.json as unknown as { wired: boolean }).wired);
    expect(json.advice.filter(item => item.check === 'tidy')).toEqual([]);
    expect(broken.stderr).toBe('');
    expect(broken.stdout).not.toContain('broken entry-check');
  });

  it('[AC:spec-27-17] on the default branch the advice says recent commits removed the symbol', () => {
    const root = tempDir();
    git(root, ['init', '-q', '-b', 'main']);
    put(join(root, 'AGENTS.md'), '# P\n\n## Context Map\n\n| Document | Read it when |\n|---|---|\n| `docs/context/guide.md` | Always |\n');
    put(join(root, 'src/widget.ts'), 'export function getWidget() { return 1; }\nexport function keepMe() { return 2; }\n');
    put(join(root, 'docs/context/guide.md'), '# Guide\n\nCall `getWidget` to get one.\n');
    // The first commit is older than the 7-day window, so the range starts after it.
    git(root, ['add', '-A']);
    const old = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-q', '-m', 'init'], { cwd: root, env: { ...process.env, GIT_AUTHOR_DATE: old, GIT_COMMITTER_DATE: old } });
    put(join(root, 'src/widget.ts'), 'export function keepMe() { return 2; }\n');
    save(root, 'remove getWidget');
    const advice = tidyAdvice(root);
    expect(advice).toHaveLength(1);
    const lines = advice[0].lines ?? [];
    expect(lines.some(line => line.includes('recent commits removed'))).toBe(true);
    expect(lines.some(line => line.includes('this branch'))).toBe(false);
  });
});

// Spec: .joycraft/local/loop/iter1/chair.md, sl1-03 (Git settled at setup).
describe('no-git start advice (sl1-03)', () => {
  const kickoff = join(__dirname, '..', 'payload', '.joycraft', 'runtime', 'kickoff.mjs');
  const agents = '# P\n\n## Context Map\n\n| Document | Read it when |\n|---|---|\n| `docs/context/guide.md` | Always |\n';
  const plain = () => {
    const root = tempDir();
    put(join(root, 'AGENTS.md'), agents);
    put(join(root, 'docs/context/guide.md'), '# Guide\n');
    return root;
  };
  const gitAdvice = (root: string) => run(root).json.advice.filter(item => item.check === 'no-git');

  it('[AC:sl1-03-detect] kickoff detect prints "git": false with no Git and true in a repository', () => {
    const root = plain();
    const detect = (dir: string) => JSON.parse(execFileSync('node', [kickoff, 'detect', '--root', dir], { encoding: 'utf8' })) as { git: boolean };
    expect(execFileSync('node', [kickoff, 'detect', '--root', root], { encoding: 'utf8' })).toContain('"git": false');
    git(root, ['init', '-q', '-b', 'main']);
    expect(detect(root).git).toBe(true);
  });

  it('[AC:sl1-03-advice] no Git gives no-git advice, never a finding, and wiring keeps its exit code', () => {
    const bare = plain();
    const repo = plain();
    git(repo, ['init', '-q', '-b', 'main']);
    save(repo, 'init');
    const without = run(bare);
    const withGit = run(repo);
    expect(gitAdvice(bare)).toHaveLength(1);
    const findings = (without.json as unknown as { findings: { check: string }[] }).findings;
    expect(findings.map(item => item.check)).not.toContain('no-git');
    expect(findings).toEqual((withGit.json as unknown as { findings: unknown[] }).findings);
    expect(without.status).toBe(withGit.status);
    expect(gitAdvice(repo)).toEqual([]);
    // A repository with no commit still gets the advice: submit needs a commit.
    const empty = plain();
    git(empty, ['init', '-q', '-b', 'main']);
    expect(gitAdvice(empty)).toHaveLength(1);
  });

  it('[AC:sl1-03-declined] a `- No Git` rule in AGENTS.md stops the advice', () => {
    const root = plain();
    put(join(root, 'AGENTS.md'), `${agents}\n## Rules\n\n- No Git: keep this folder out of version control.\n`);
    expect(gitAdvice(root)).toEqual([]);
  });

  it('[AC:sl1-03-setup] setup settles Git once: init on a bare project, ask once otherwise, record a no', () => {
    const setup = readFileSync(join(__dirname, '..', 'payload', '.joycraft', 'references', 'setup.md'), 'utf8').replace(/\s+/g, ' ');
    expect(setup).toContain('On a bare project, run `git init`, say so, and say that deleting the `.git` folder undoes it.');
    expect(setup).toContain('On a project with files, ask once, yes or no');
    expect(setup).toContain('On no, write `- No Git:` and the user\'s words under `## Rules` in `AGENTS.md`');
    expect(setup).toContain('When the folder is bare or has an ignore file, commit what is there as `chore: set up Joycraft`.');
    expect(setup).toContain('When `detect` prints `"git": false`, run `git init` first');
  });
});
