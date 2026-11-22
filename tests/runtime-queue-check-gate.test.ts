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
