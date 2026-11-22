import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// Spec: docs/features/2026-11-21-test-release/specs/15-wave-gate-text.md
const root = join(__dirname, '..');
const raw = (path: string) => readFileSync(join(root, 'payload', path), 'utf8');
const flat = (path: string) => raw(path).replace(/\s+/g, ' ');
const IMPLEMENT = '.agents/skills/joycraft-implement/SKILL.md';
const VERIFY = '.agents/skills/joycraft-verify/SKILL.md';
const TESTING = '.joycraft/references/testing.md';
const DELIVERY = '.joycraft/references/delivery.md';

/** The implement skill's delivery paragraph: from "Workers run focused tests only." to the CI stop. */
const deliveryParagraph = () => {
  const text = flat(IMPLEMENT);
  const start = text.indexOf('Workers run focused tests only.');
  const end = text.indexOf('After a second red CI run, stop and report.', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return text.slice(start, end + 'After a second red CI run, stop and report.'.length);
};

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

/** A Git project with the installed skill and delivery page, so the text is read as a project sees it. */
function installed() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'jc-wave-gate-text-')));
  dirs.push(dir);
  const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd: dir, stdio: 'ignore' });
  git('init', '-q', '-b', 'main');
  writeFileSync(join(dir, 'SKILL.md'), raw(IMPLEMENT));
  writeFileSync(join(dir, 'delivery.md'), raw(DELIVERY));
  git('add', '-A'); git('commit', '-q', '-m', 'init');
  return dir;
}

describe('wave-gate and CI-once text', () => {
  it('[AC:spec-15-1] the implement skill names gate-plan, gate-owner, evidence.mjs and --gate-receipt in its delivery paragraph', () => {
    const paragraph = deliveryParagraph();
    expect(paragraph).toContain('Workers run focused tests only.');
    expect(paragraph).toMatch(/The coordinator runs the recorded gate alone through `evidence\.mjs` at each point `coordinator\.mjs gate-plan` prints/);
    expect(paragraph).toContain('No push without a green gate receipt (`delivery.mjs push --gate-receipt`');
    expect(paragraph).toMatch(/On red, `coordinator\.mjs gate-owner` picks the spec for the fix round, else bisect only the failing file, newest commit first; a second red holds the push\./);
    expect(paragraph).toContain('Unless `AGENTS.md` says otherwise');
    const project = readFileSync(join(installed(), 'SKILL.md'), 'utf8');
    for (const name of ['gate-plan', 'gate-owner', '--gate-receipt']) expect(project).toContain(name);
  });

  it('[AC:spec-15-2] CI is read once, on the PR, after session end\'s push; a second red CI run stops the run', () => {
    expect(flat(IMPLEMENT)).not.toContain('read CI after each push');
    expect(deliveryParagraph()).toMatch(/read CI once, on the PR, after session end's push\. After a second red CI run, stop and report\./);
  });

  it('[AC:spec-29-7] the delivery paragraph leaves the PR to session end and names the verifier form without tests.gate', () => {
    const paragraph = deliveryParagraph();
    expect(paragraph).not.toContain('open one PR');
    expect(paragraph).toContain("session end's one push opens the PR");
    expect(paragraph).toContain('`-- <verifier>` without `tests.gate`');
  });

  // Decision cap-raise: the implement skill cannot grow. 1315 is its `wc -w` before spec 29;
  // retire this constant with the other per-spec word tests once the feature is accepted.
  it('[AC:spec-29-9] the implement skill is no longer than before spec 29', () => {
    expect(raw(IMPLEMENT).split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(1315);
  });

  it('[AC:spec-15-3] in wave mode the verifier states the gate is not run, and the project-gate tier names tests.gateRuns', () => {
    expect(flat(VERIFY)).toContain('in wave mode, state "gate not run; due at wave end"');
    const tier = flat(TESTING).match(/\*\*Project gate:\*\*[^*]*/)?.[0] ?? '';
    expect(tier).toContain('`tests.gateRuns`');
    expect(tier).toMatch(/the coordinator runs it at each `gate-plan` point/);
    expect(tier).toMatch(/workers and reviewers run focused tests only/);
  });

  it('[AC:spec-15-5] the gate receipt comes from a clean tree: a git-ignored path, or pending files committed first', () => {
    expect(deliveryParagraph()).toContain('with the receipt at a git-ignored path or after committing pending files');
    const page = readFileSync(join(installed(), 'delivery.md'), 'utf8').replace(/\s+/g, ' ');
    expect(page).toMatch(/rejects a receipt whose footer says `dirty: true` as stale/);
    expect(page).toMatch(/Write the receipt to a git-ignored path, or commit pending files first/);
    expect(page).toContain('`tests.gateRuns: spec` (the default)');
  });

  it('[AC:spec-28-7] the installed delivery page names where a receipt may live and the docs-only ancestor rule', () => {
    const page = readFileSync(join(installed(), 'delivery.md'), 'utf8').replace(/\s+/g, ' ');
    expect(page).toContain('git-ignored or in a feature folder');
    expect(page).toMatch(/A receipt on an earlier revision still counts when every path changed since is under the docs root.*Any other changed path needs the gate again\./);
  });
});
