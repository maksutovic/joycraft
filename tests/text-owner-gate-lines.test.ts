import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// Spec: docs/features/2026-11-21-test-release/specs/16-owner-lines-text.md
const root = join(__dirname, '..');
const read = (...parts: string[]) => readFileSync(join(root, 'payload', ...parts), 'utf8').replace(/\s+/g, ' ');
const skill = read('.agents', 'skills', 'joycraft-cleanup', 'SKILL.md');
const update = read('.joycraft', 'references', 'update.md');
const cleanupPage = read('.joycraft', 'references', 'cleanup.md');
const entryCheck = join(root, 'payload', '.joycraft', 'runtime', 'entry-check.mjs');

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

/** A Git project whose AGENTS.md names the recorded gate in a rule and in its Commands table. */
function fixture() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'jc-owner-gate-lines-')));
  dirs.push(dir);
  const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd: dir, stdio: 'ignore' });
  git('init', '-q', '-b', 'main');
  writeFileSync(join(dir, 'AGENTS.md'), ['# App', '', 'Run `pnpm verify` after every change.', '', '| Check | Command |', '|---|---|', '| Project gate | pnpm verify |', ''].join('\n'));
  writeFileSync(join(dir, 'joycraft.yaml'), 'tests:\n  gate: "pnpm verify"\n');
  git('add', '-A'); git('commit', '-q', '-m', 'init');
  return dir;
}

describe('owner gate lines', () => {
  it('[AC:spec-16-1] attended cleanup offers every gate-rule finding as one before-and-after decision, never rewriting unattended', () => {
    expect(skill).toContain('gate-rule');
    expect(skill).toMatch(/all `gate-rule` findings into one decision/);
    expect(skill).toMatch(/the before \(the line as it is\) and the after/);
    expect(skill).toMatch(/gate runs once on the integrated revision, and each spec runs its focused tests/);
    expect(skill).toMatch(/only on the owner's yes; never unattended/);
    expect(skill).toMatch(/Change no rule and no other line, a `gate-rule` line included/);
  });

  it('[AC:spec-16-2] update shows the entry-check gate-rule finding once and records the answer; cleanup.md names the check', () => {
    const findings = JSON.parse(spawnSync(process.execPath, [entryCheck, '--root', fixture()], { encoding: 'utf8' }).stdout).findings;
    expect(findings.filter((item: { check: string }) => item.check === 'gate-rule')).toHaveLength(1);
    expect(update).toMatch(/When it reports `gate-rule` and `\.joycraft\/preferences\.json` has no `cleanup\.gateRule`, show the findings once/);
    expect(update).toMatch(/Record the answer as `cleanup\.gateRule`: `rewritten` or `kept`, keeping the other keys, so no later update asks again/);
    expect(cleanupPage).toMatch(/`gate-rule` names an entry-file rule line/);
  });

  it('[AC:spec-16-3] the three edited files are on-demand text, so every-spec words cannot grow', () => {
    // The guard's EVERY_SPEC_FILES block, read as text: importing a test file would rerun its tests here.
    const guard = readFileSync(join(root, 'tests', 'payload-guard.test.ts'), 'utf8');
    const block = guard.slice(guard.indexOf('export const EVERY_SPEC_FILES'), guard.indexOf('export const EVERY_SPEC_CAP'));
    expect(block).toContain('joycraft-implement/SKILL.md');
    for (const file of ['joycraft-cleanup/SKILL.md', 'references/update.md', 'references/cleanup.md']) expect(block).not.toContain(file);
  });
});
