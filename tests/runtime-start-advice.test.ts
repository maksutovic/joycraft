import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
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
