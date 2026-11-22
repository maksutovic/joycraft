import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const runtime = join(__dirname, '..', 'payload', '.joycraft', 'runtime', 'queue-check.mjs');
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const folder = 'docs/features/2026-11-21-f';
const queuePath = `${folder}/specs/.joycraft-spec-queue.json`;

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

type Fixture = { tests?: Record<string, string>; acceptance: string; scope?: string; status?: string };

function fixture({ tests, acceptance, scope = '- Files: `src/a.ts`.', status = 'todo' }: Fixture) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-queue-gate-')));
  dirs.push(root);
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root });
  if (tests) put(join(root, 'joycraft.yaml'), `tests:\n${Object.entries(tests).map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`).join('\n')}\n`);
  put(join(root, folder, 'brief.md'), '# Brief\n\n## Goal\n\nText.\n');
  put(join(root, folder, 'specs', '01-a.md'), `---\nid: 1\nstatus: ${status}\n---\n# A\n\n## acceptance\n\n${acceptance}\n\n## Implementation and verification scope\n\n${scope}\n`);
  const spec = `${folder}/specs/01-a.md`;
  put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: 'f', specs: [{ id: 1, file: '01-a.md', depends_on: [], status, mode: 'checkpoint',
    verification: { inputs: [{ path: spec, kind: 'requirement' }, { path: 'tests/x.test.ts', kind: 'check' }],
      criteria: [{ id: 'spec-1-1', requirement: { path: spec, anchor: 'acceptance' }, requiredKinds: ['runtime'] }] } }] }));
  return root;
}

function check(root: string) {
  const result = spawnSync(process.execPath, [runtime, '--queue', queuePath, '--root', root], { encoding: 'utf8' });
  const gates = result.stderr.split('\n').filter(line => line.includes('gate or full command'));
  return { status: result.status, stderr: result.stderr, gates };
}

describe('queue-check gate-in-spec', () => {
  it('[AC:spec-4-1] an acceptance bullet naming the recorded gate gives one gate-in-spec gap and exit 2', () => {
    for (const acceptance of ['- The suite passes. Check: run `pnpm verify`.', '- The suite passes. Check: run pnpm verify.']) {
      const result = check(fixture({ tests: { gate: 'pnpm verify' }, acceptance }));
      expect(result.status).toBe(2);
      expect(result.gates).toHaveLength(1);
      expect(result.gates[0]).toContain('spec 1');
      expect(result.gates[0]).toContain('01-a.md:9');
      expect(result.gates[0]).toContain('`pnpm verify`');
    }
  });

  it('[AC:spec-4-2] a command with more arguments is not the gate; the full command matches the same way', () => {
    const focused = check(fixture({ tests: { gate: 'pnpm test && pnpm typecheck' }, acceptance: '- It works. Check: `pnpm test tests/x.test.ts` passes.' }));
    expect(focused.gates).toHaveLength(0);
    expect(focused.status).toBe(0);
    const full = check(fixture({ tests: { gate: 'pnpm test && pnpm typecheck', full: 'pnpm test:all' }, acceptance: '- It works. Check: `pnpm   test:all` passes.' }));
    expect(full.gates).toHaveLength(1);
    expect(full.gates[0]).toContain('`pnpm test:all`');
    expect(full.status).toBe(2);
  });

  it('[AC:spec-4-3] the gate outside acceptance, a project with no gate, and a done spec give no gap', () => {
    const inScope = check(fixture({ tests: { gate: 'pnpm verify' }, acceptance: '- It works. Check: `pnpm test tests/x.test.ts`.', scope: '- Gate: `pnpm verify`.' }));
    const noGate = check(fixture({ acceptance: '- It works. Check: `pnpm verify`.' }));
    const done = check(fixture({ tests: { gate: 'pnpm verify' }, acceptance: '- It works. Check: `pnpm verify`.', status: 'done' }));
    for (const result of [inScope, noGate, done]) { expect(result.gates).toHaveLength(0); expect(result.stderr).not.toContain('gate-in-spec'); }
    expect(inScope.status).toBe(0);
    expect(noGate.status).toBe(0);
  });
});

describe('queue-check gate matching in prose (spec 27)', () => {
  it('[AC:spec-27-1] plain text followed by a word or a dash, and a fenced line holding only the gate, name it; argument forms do not', () => {
    const named = [
      '- The suite passes. Check: run pnpm verify before merging.',
      '- The suite passes. Check: pnpm verify — then read the log.',
      '- The suite passes. Check: run this:\n\n  ```\n  pnpm verify\n  ```',
    ];
    for (const acceptance of named) {
      const result = check(fixture({ tests: { gate: 'pnpm verify' }, acceptance }));
      expect(result.gates, acceptance).toHaveLength(1);
      expect(result.status).toBe(2);
    }
    const notNamed = [
      '- It works. Check: `pnpm test tests/x.test.ts` passes.',
      '- It works. Check: pnpm test tests/x.test.ts passes.',
      '- It works. Check: pnpm test -- --run passes.',
    ];
    for (const acceptance of notNamed) {
      const result = check(fixture({ tests: { gate: 'pnpm test' }, acceptance }));
      expect(result.gates, acceptance).toHaveLength(0);
      expect(result.stderr).not.toContain('gate-in-spec');
    }
  });

  it('[review-27-1] an argument holding a dot or colon is a different command; a spaced or unspaced dash after the gate names it [review-27-2]', async () => {
    const { namesCommand } = await import('../payload/.joycraft/runtime/queue-check.mjs');
    const args: Array<[string, string]> = [
      ['pnpm test', 'Check: pnpm test x.test.ts'],
      ['pnpm test', 'Check: pnpm test add.test.ts passes.'],
      ['cargo test', 'Check: cargo test a::b'],
      ['cargo test', 'Check: cargo test parser::tests passes.'],
      ['pytest', 'Check: pytest tests.py passes.'],
    ];
    for (const [gate, text] of args) expect(namesCommand(text, gate), text).toBe(false);
    const named: Array<[string, string]> = [
      ['pnpm verify', 'Check: run pnpm verify before merging.'],
      ['pnpm verify', 'Check: pnpm verify — then read the log.'],
      ['pnpm verify', 'Check: pnpm verify—then read.'],
      ['pnpm verify', 'Check: pnpm verify–then read.'],
      ['pnpm verify', 'Check: run pnpm verify first.'],
    ];
    for (const [gate, text] of named) expect(namesCommand(text, gate), text).toBe(true);
    const result = check(fixture({ tests: { gate: 'pnpm test' }, acceptance: '- It works. Check: pnpm test add.test.ts passes.' }));
    expect(result.gates).toHaveLength(0);
    expect(result.stderr).not.toContain('gate-in-spec');
  });

  it('[AC:spec-27-2] the gate gap ends with the spec-command next step; a missing-check gap still asks the user', () => {
    const gate = check(fixture({ tests: { gate: 'pnpm verify' }, acceptance: '- It works. Check: run pnpm verify before merging.' }));
    expect(gate.gates).toHaveLength(1);
    expect(gate.gates[0].trimEnd().endsWith("Use the spec's own test command instead.")).toBe(true);
    expect(gate.gates[0]).not.toContain('ask the user');
    const missing = check(fixture({ acceptance: '- It works with no check.' }));
    const line = missing.stderr.split('\n').find(item => item.includes('has no `Check:`'));
    expect(line?.trimEnd().endsWith('ask the user now.')).toBe(true);
  });
});
