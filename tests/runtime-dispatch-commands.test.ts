import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyInstall, planInstall } from '../src/install-v1.js';

const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const folder = 'docs/features/2026-11-21-f';
const queuePath = `${folder}/specs/.joycraft-spec-queue.json`;
const forbidden = /&&|;|\||\$\(|<<|\bsource\b|\bcd\b/;

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true, maxRetries: 5 }); });

/** A git project with the shipped runtime installed and one spec whose check inputs are tests/a and tests/b. */
function fixture({ focused, checks = ['tests/a.test.ts', 'tests/b.test.ts'], status = 'todo' }: { focused?: string; checks?: string[]; status?: string }) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-dispatch-commands-')));
  const pinned = realpathSync(mkdtempSync(join(tmpdir(), 'jc-dispatch-pin-')));
  dirs.push(root, pinned);
  git(root, 'init', '-q', '-b', 'main');
  applyInstall(planInstall(root, ['claude']));
  copyFileSync(join(root, '.joycraft/installation.json'), join(pinned, 'installation.json'));
  if (focused) put(join(root, 'joycraft.yaml'), `tests:\n  focused: ${JSON.stringify(focused)}\n`);
  put(join(root, '.gitignore'), '.joycraft/local/\n');
  put(join(root, folder, 'brief.md'), '# Brief\n\n## Goal\n\nText.\n');
  const spec = `${folder}/specs/01-a.md`;
  put(join(root, spec), `---\nid: 1\nstatus: ${status}\n---\n# A\n\n## acceptance\n\n- It works. Check: the tests pass.\n`);
  for (const file of checks) put(join(root, file), 'test\n');
  put(join(root, 'src/a.ts'), 'export const a = 1;\n');
  put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: 'f', specs: [{ id: 1, file: '01-a.md', depends_on: [], status, mode: 'checkpoint',
    verification: { inputs: [{ path: `${folder}/brief.md`, kind: 'requirement' }, { path: spec, kind: 'requirement' }, { path: 'src/a.ts', kind: 'code' }, ...checks.map(path => ({ path, kind: 'check' }))],
      criteria: [{ id: 'spec-1-1', requirement: { path: spec, anchor: 'acceptance' }, requiredKinds: ['runtime'] }] } }] }, null, 2));
  git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'init');
  return { root, manifest: join(pinned, 'installation.json') };
}

function start({ root, manifest }: { root: string; manifest: string }, role: 'implementer' | 'reviewer') {
  const capabilities = ['filesystem:read', 'filesystem:write-report', ...(role === 'reviewer' ? ['agent:separate-context'] : [])].join(',');
  const result = spawnSync(process.execPath, [join(root, '.joycraft/runtime/dispatch-start.mjs'), '--worker-root', root, '--expected-manifest', manifest,
    '--queue', queuePath, '--spec', '1', '--role', role, '--implementer-session', 'impl-1', '--out', `.joycraft/local/packets/${role}-${Date.now()}.json`,
    '--capabilities', capabilities, '--native-session', role === 'reviewer' ? 'review-1' : 'impl-1'], { cwd: root, encoding: 'utf8' });
  return { status: result.status, stderr: result.stderr, output: result.stdout ? JSON.parse(result.stdout) : null };
}

describe('task startup commands', () => {
  it('[AC:spec-5-1] implementer and reviewer startup print the focused command built from the check inputs', () => {
    const project = fixture({ focused: 'pnpm test {files}' });
    const implementer = start(project, 'implementer');
    expect(implementer.status, implementer.stderr).toBe(0);
    expect(implementer.output.commands.focused).toEqual({ command: 'pnpm test tests/a.test.ts tests/b.test.ts', argv: ['pnpm', 'test', 'tests/a.test.ts', 'tests/b.test.ts'] });
    const reviewer = start(fixture({ focused: 'pnpm test {files}', status: 'in-review' }), 'reviewer');
    expect(reviewer.status, reviewer.stderr).toBe(0);
    expect(reviewer.output.commands.focused.command).toBe('pnpm test tests/a.test.ts tests/b.test.ts');
    const appended = start(fixture({ focused: 'npx vitest run' }), 'implementer');
    expect(appended.output.commands.focused.command).toBe('npx vitest run tests/a.test.ts tests/b.test.ts');
  });

  it('[AC:spec-5-2] each step is one plain command with literal paths', () => {
    const implementer = start(fixture({ focused: 'pnpm test {files}' }), 'implementer').output.commands;
    expect(implementer.evidence).toMatch(new RegExp(`^node \\.joycraft/runtime/evidence\\.mjs run --receipt ${folder}/receipts/spec-1-implementer-focused-\\S+\\.log -- pnpm test tests/a\\.test\\.ts tests/b\\.test\\.ts$`));
    expect(implementer.submit).toBe(`node .joycraft/runtime/completion.mjs submit --queue ${queuePath} --spec 1`);
    const project = fixture({ focused: 'pnpm test {files}', status: 'in-review' });
    const reviewer = start(project, 'reviewer').output.commands;
    expect(reviewer.checkReport).toBe(`node .joycraft/runtime/dispatch-preflight.mjs check-report --worker-root ${project.root} --queue ${queuePath} --spec 1 --report ${folder}/specs/review-1.report.json`);
    expect(reviewer.finalizeReview).toBe(`node .joycraft/runtime/completion.mjs finalize-review --queue ${queuePath} --spec 1 --report ${folder}/specs/review-1.report.json`);
    expect(reviewer.evidence).toContain('evidence.mjs run --receipt');
    for (const command of [implementer.evidence, implementer.submit, reviewer.evidence, reviewer.checkReport, reviewer.finalizeReview]) expect(command).not.toMatch(forbidden);
    // The receipt path is one evidence.mjs accepts: it runs and writes there.
    const receipt = reviewer.evidence.split(' ')[4];
    const run = spawnSync(process.execPath, ['.joycraft/runtime/evidence.mjs', 'run', '--receipt', receipt, '--', process.execPath, '-e', '0'], { cwd: project.root, encoding: 'utf8' });
    expect(run.status, run.stderr).toBe(0);
  });

  it('[AC:spec-5-3] without tests.focused or without check inputs, focused is null with a note and startup succeeds', () => {
    const noConfig = start(fixture({}), 'implementer');
    expect(noConfig.status).toBe(0);
    expect(noConfig.output.commands.focused).toBeNull();
    expect(noConfig.output.commands.note).toContain('tests.focused');
    const noChecks = start(fixture({ focused: 'pnpm test {files}', checks: [] }), 'implementer');
    expect(noChecks.status).toBe(0);
    expect(noChecks.output.commands.focused).toBeNull();
    expect(noChecks.output.commands.note).toContain('check input');
  });
});
