import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// Spec: docs/features/2026-11-21-test-release/specs/25-session-end-pr.md
const root = join(__dirname, '..');
const skill = readFileSync(join(root, 'payload', '.agents', 'skills', 'joycraft-session-end', 'SKILL.md'), 'utf8');
const flat = skill.replace(/\s+/g, ' ');

describe('session end rides the PR', () => {
  it('[AC:spec-25-1] opens with the clean-tree check, before the first runtime command, and commits nothing of the user\'s', () => {
    const check = skill.indexOf('git status --porcelain');
    const firstRuntime = skill.indexOf('.joycraft/runtime/');
    expect(check).toBeGreaterThan(-1);
    expect(firstRuntime).toBeGreaterThan(check);
    expect(flat).toMatch(/fix nothing, commit nothing of the user's/);
  });

  it('[AC:spec-25-2] runs records, the one tidy commit, prune, archive last, then one push', () => {
    const steps = ['status.mjs', 'tidy --verify', 'worktrees.mjs prune', 'archive.mjs archive', 'one push that carries'];
    const at = steps.map(step => flat.indexOf(step));
    for (const [i, step] of steps.entries()) expect(at[i], step).toBeGreaterThan(-1);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(flat).toContain('Never archive a feature whose question the user asked to wait');
  });

  it('[AC:spec-25-3] after merge it only says the next session start checks, read-only; no post-merge machinery', () => {
    expect(flat).toMatch(/next session start checks, read-only, that the change deployed and works/);
    expect(flat).not.toMatch(/post-merge|merged-PR detector|sessionEnd\.commits/i);
  });

  it('[AC:spec-25-4] the session-end skill is on-demand text, so the reorder cannot grow every-spec words', () => {
    // The guard's EVERY_SPEC_FILES block, read as text: importing a test file would rerun its tests here.
    const guard = readFileSync(join(root, 'tests', 'payload-guard.test.ts'), 'utf8');
    const block = guard.slice(guard.indexOf('export const EVERY_SPEC_FILES'), guard.indexOf('export const EVERY_SPEC_CAP'));
    expect(block).toContain('joycraft-implement/SKILL.md');
    expect(block).not.toContain('joycraft-session-end');
  });
});

// Review 25: docs/features/2026-11-21-test-release/specs/review-25.report.json
describe('session end review-25 fixes', () => {
  it('[review-25-1] commits the records in their own commit before tidy; the tidy commit carries only tidy fixes', () => {
    const records = flat.indexOf('docs: session-end records');
    expect(records).toBeGreaterThan(-1);
    expect(records).toBeLessThan(flat.indexOf('cleanup.mjs tidy --verify'));
    expect(flat).toContain('it carries only the tidy fixes');
    expect(flat).not.toContain('it carries the records');
    expect(flat).toContain('docs: archive <slug>');
    expect(flat).toContain('one push can carry up to three commits');
    expect(flat).toContain('Never archive a feature whose question the user asked to wait');
  });

  it('[review-25-2] names the read-only form of each step on a dirty tree', () => {
    const dirty = flat.slice(flat.indexOf('git status --porcelain'), flat.indexOf('The steps run in this order'));
    for (const form of ['`status.mjs` without `--fix`', '`cleanup.mjs tidy` to report', 'prune preview without `--apply`', 'archive preview without `--apply`']) expect(dirty, form).toContain(form);
  });

  it('[review-25-3] with no remote it makes the same commits, skips the push and says the work is local', () => {
    expect(flat).toContain('With no remote, make the same commits, skip the push and say the work is local');
  });
});

describe('session end names a commit for every edit', () => {
  const sentence = (marker: string) => {
    const at = flat.indexOf(marker);
    expect(at, marker).toBeGreaterThan(-1);
    return flat.slice(flat.lastIndexOf('. ', at) + 2, flat.indexOf('. ', at) + 1);
  };

  it('[AC:spec-29-8] the archive commit takes every archive edit, cleanup fixes go in the records commit, and a dirty tree holds gate messages, cleanup fixes and the lease', () => {
    const archive = sentence('That commit takes every archive edit');
    expect(archive).toContain('relinked');
    expect(archive).toContain('preview listed');
    expect(flat).not.toContain('--rewrite');
    const records = sentence('`docs: session-end records`, before tidy');
    expect(records).toContain('cleanup');
    expect(flat.indexOf('joycraft-cleanup')).toBeLessThan(flat.indexOf('`docs: session-end records`'));
    const dirty = flat.slice(flat.indexOf('git status --porcelain'), flat.indexOf('The steps run in this order'));
    for (const words of ['gate messages', 'cleanup fixes', 'lease']) expect(dirty.toLowerCase(), words).toContain(words);
  });
});

const cleanup = join(root, 'payload', '.joycraft', 'runtime', 'cleanup.mjs');
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (dir: string, file: string, body: string) => { mkdirSync(dirname(join(dir, file)), { recursive: true }); writeFileSync(join(dir, file), body); };
const save = (dir: string, message: string) => { git(dir, 'add', '-A'); git(dir, 'commit', '-q', '-m', message); };
const verify = (dir: string) => {
  try { return { status: 0, json: JSON.parse(execFileSync('node', [cleanup, 'tidy', '--verify'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })) }; }
  catch (error) { const e = error as { status: number; stdout: string }; return { status: e.status, json: JSON.parse(e.stdout) }; }
};
const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

describe('session end review-25 runtime', () => {
  it('[review-25-1] a records commit, then the tidy fix: tidy --verify passes on the new HEAD', () => {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'jc-session-end-')));
    dirs.push(dir);
    const guide = '# Guide\n\nThe widget loader.\n\nCall `getWidget()` to load one.\n';
    git(dir, 'init', '-q', '-b', 'main');
    put(dir, 'src/widget.ts', 'export function getWidget() {\n  return 1;\n}\nexport const keep = 2;\n');
    put(dir, 'docs/context/guide.md', guide);
    put(dir, 'docs/context/decision-log.md', '# Decision log\n');
    put(dir, 'AGENTS.md', '# A\n\n[guide](docs/context/guide.md)\n[log](docs/context/decision-log.md)\n');
    save(dir, 'init');
    git(dir, 'checkout', '-q', '-b', 'feature');
    put(dir, 'src/widget.ts', 'export const keep = 2;\n');
    save(dir, 'remove getWidget');
    // The Records step writes a decision; the tidy fix replaces the named line.
    put(dir, 'docs/context/decision-log.md', '# Decision log\n\n- keep: answered.\n');
    put(dir, 'docs/context/guide.md', guide.replace('Call `getWidget()` to load one.', 'Read `keep` for the value.'));
    const mixed = verify(dir);
    expect(mixed.status).toBe(2);
    expect(mixed.json.refused.map((item: { path: string }) => item.path)).toContain('docs/context/decision-log.md');
    // The records go in their own commit first; the tree then holds only the tidy fix.
    git(dir, 'add', 'docs/context/decision-log.md');
    git(dir, 'commit', '-q', '-m', 'docs: session-end records');
    const result = verify(dir);
    expect(result.status).toBe(0);
    expect(result.json.status).toBe('pass');
    expect(result.json.message).toMatch(/^docs: tidy 1 doc line after /);
    git(dir, 'commit', '-q', '-a', '-m', result.json.message);
    expect(git(dir, 'status', '--porcelain')).toBe('');
  });
});
