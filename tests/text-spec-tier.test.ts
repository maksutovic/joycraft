import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// Spec: docs/features/2026-11-21-test-release/specs/14-tier-text.md
const root = join(__dirname, '..');
const raw = (...parts: string[]) => readFileSync(join(root, 'payload', ...parts), 'utf8');
const read = (...parts: string[]) => raw(...parts).replace(/\s+/g, ' ');
const template = read('.joycraft', 'templates', 'spec.md');
const decompose = read('.agents', 'skills', 'joycraft-decompose', 'SKILL.md');
const verify = read('.agents', 'skills', 'joycraft-verify', 'SKILL.md');
const implementer = read('.claude', 'agents', 'joycraft-implementer.md');
const testingReview = read('.joycraft', 'references', 'testing-review.md');
const setup = read('.joycraft', 'references', 'setup.md');
const settings = read('.joycraft', 'references', 'settings.md');
const config = join(root, 'payload', '.joycraft', 'runtime', 'config.mjs');

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

/** A Git project whose joycraft.yaml holds the tests section setup writes for a slow gate. */
function fixture() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'jc-spec-tier-')));
  dirs.push(dir);
  const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd: dir, stdio: 'ignore' });
  git('init', '-q', '-b', 'main');
  writeFileSync(join(dir, 'joycraft.yaml'), 'tests:\n  focused: "pnpm test {files}"\n  gate: "pnpm verify"\n  full: "pnpm test:all"\n  gateRuns: wave\n');
  git('add', '-A'); git('commit', '-q', '-m', 'init');
  return dir;
}

const sentence = "Each `Check:` names the spec's own test file or filter, never the project gate or full suite.";

// Every-spec word counts of the three every-spec files this spec edits, at the commit before it (28ee6ed).
// Later growth, each a class-1 change: spec 22 grew the implementer by 11 words, paid for by the implement skill;
// spec 18 (fault-proof) added a test-only pointer to verify (5) and the implementer (5).
const before = { decompose: 694, verify: 1370 + 5, implementer: 324 + 11 + 5 };
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

describe('spec tier text', () => {
  it('[AC:spec-14-1] the spec template and decompose ask each Check: for the spec\'s own test file, never the gate', () => {
    expect(template).toContain(sentence);
    expect(decompose).toContain(sentence);
    expect(decompose).toMatch(/fixture paths as verification inputs, updated as implementation reveals more\. Each `Check:`/);
    expect(template).not.toContain('the command or test');
  });

  it('[AC:spec-14-2] verify takes runtime evidence from commands.focused; the implementer never runs the gate one time', () => {
    expect(verify).toMatch(/Take runtime evidence once from the spec's own tests \(the packet's `commands\.focused`\), never the project gate/);
    expect(verify).not.toMatch(/Take evidence with the package's recorded tool/);
    expect(implementer).not.toContain('project gate one time');
    expect(implementer).toContain("Run only the spec's focused tests, never the project gate.");
  });

  it('[AC:spec-14-3] testing-review recommends test selection from declared test files', () => {
    expect(testingReview).not.toContain('Do not recommend test selection');
    expect(testingReview).toContain("Recommend test selection from each spec's declared test files");
  });

  it('[AC:spec-14-4] setup records tests.focused, tests.gate, tests.full and gateRuns; settings documents tests:, and config reads it', () => {
    for (const text of ['`tests.focused` (with `{files}`)', '`tests.gate`', '`tests.full`', 'Commands table', 'Time the gate once: over about 60 s, record `gateRuns: wave`, else `gateRuns: spec`']) {
      expect(setup).toContain(text);
    }
    expect(settings).toContain('`tests:`');
    const tests = JSON.parse(execFileSync(process.execPath, [config, '--root', fixture()], { encoding: 'utf8' })).tests;
    expect(tests).toEqual({ focused: 'pnpm test {files}', gate: 'pnpm verify', full: 'pnpm test:all', gateRuns: 'wave' });
  });

  it('[AC:spec-14-5] the every-spec files this spec edits grow by at most 5 words in all', () => {
    const now = {
      decompose: words(raw('.agents', 'skills', 'joycraft-decompose', 'SKILL.md')),
      verify: words(raw('.agents', 'skills', 'joycraft-verify', 'SKILL.md')),
      implementer: words(raw('.claude', 'agents', 'joycraft-implementer.md')),
    };
    const growth = Object.values(now).reduce((a, b) => a + b, 0) - Object.values(before).reduce((a, b) => a + b, 0);
    expect(growth).toBeLessThanOrEqual(5);
    // The template, testing-review, setup and settings are on-demand: the guard's EVERY_SPEC_FILES does not list them.
    const guard = readFileSync(join(root, 'tests', 'payload-guard.test.ts'), 'utf8');
    const block = guard.slice(guard.indexOf('export const EVERY_SPEC_FILES'), guard.indexOf('export const EVERY_SPEC_CAP'));
    for (const file of ['testing-review.md', 'references/setup.md', 'references/settings.md', 'templates/spec.md']) expect(block).not.toContain(file);
  });
});
