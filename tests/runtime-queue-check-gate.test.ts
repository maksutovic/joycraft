import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
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
  it('[gate-base-1] an acceptance bullet naming the recorded gate gives one gate-in-spec gap and exit 2', () => {
    for (const acceptance of ['- The suite passes. Check: run `pnpm verify`.', '- The suite passes. Check: run pnpm verify.']) {
      const result = check(fixture({ tests: { gate: 'pnpm verify' }, acceptance }));
      expect(result.status).toBe(2);
      expect(result.gates).toHaveLength(1);
      expect(result.gates[0]).toContain('spec 1');
      expect(result.gates[0]).toContain('01-a.md:9');
      expect(result.gates[0]).toContain('`pnpm verify`');
    }
  });

  it('[gate-base-2] a command with more arguments is not the gate; the full command matches the same way', () => {
    const focused = check(fixture({ tests: { gate: 'pnpm test && pnpm typecheck' }, acceptance: '- It works. Check: `pnpm test tests/x.test.ts` passes.' }));
    expect(focused.gates).toHaveLength(0);
    expect(focused.status).toBe(0);
    const full = check(fixture({ tests: { gate: 'pnpm test && pnpm typecheck', full: 'pnpm test:all' }, acceptance: '- It works. Check: `pnpm   test:all` passes.' }));
    expect(full.gates).toHaveLength(1);
    expect(full.gates[0]).toContain('`pnpm test:all`');
    expect(full.status).toBe(2);
  });

  it('[gate-base-3] the gate outside acceptance and scope, a project with no gate, and a done spec give no gap', () => {
    const inScope = check(fixture({ tests: { gate: 'pnpm verify' }, acceptance: '- It works. Check: `pnpm test tests/x.test.ts`.\n\n## Notes\n\n- Gate: `pnpm verify`.' }));
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

describe('queue-check gate matching in prose (spec 31)', () => {
  it('[AC:spec-31-1] prose words with apostrophes, hyphens, abbreviations, numbers, a bracket, & or an arrow after the gate name it', async () => {
    const { namesCommand } = await import('../payload/.joycraft/runtime/queue-check.mjs');
    const named = ["pnpm verify doesn't fail.", "pnpm verify isn't optional", 'pnpm verify e.g. twice', 'pnpm verify (the full suite)',
      'pnpm verify → done', 'pnpm verify & lint', 'pnpm verify won’t pass', 'pnpm verify re-runs it', 'pnpm verify 2 times'];
    for (const text of named) expect(namesCommand(text, 'pnpm verify'), text).toBe(true);
  });

  it('[AC:spec-31-2] a dash stuck to an argument stays an argument; the spec 4 and 27 argument forms still do not name the gate', async () => {
    const { namesCommand } = await import('../payload/.joycraft/runtime/queue-check.mjs');
    const args: Array<[string, string]> = [
      ['pnpm test', 'pnpm test —run'], ['pnpm test', 'pnpm test–run'], ['pnpm test', 'pnpm test—tests/a.test.ts'],
      ['pnpm test', 'Check: `pnpm test tests/x.test.ts` passes.'], ['pnpm test', 'Check: pnpm test tests/x.test.ts passes.'],
      ['pnpm test', 'Check: pnpm test -- --run passes.'], ['pnpm test', 'Check: pnpm test x.test.ts'],
      ['pnpm test', 'Check: pnpm test add.test.ts passes.'], ['cargo test', 'Check: cargo test a::b'],
      ['cargo test', 'Check: cargo test parser::tests passes.'], ['pytest', 'Check: pytest tests.py passes.'],
    ];
    for (const [gate, text] of args) expect(namesCommand(text, gate), text).toBe(false);
  });
});

describe('queue-check gate-in-spec chains, scope and comment (1.9.1 spec 4)', () => {
  it('[AC:spec-4-1] &&, ||, | and 2>&1 followed by whitespace end the command; a glued hyphen, a path or --run do not', async () => {
    const { namesCommand } = await import('../payload/.joycraft/runtime/queue-check.mjs');
    const named = ['pnpm verify && pnpm lint pass.', 'pnpm verify | tee gate.log', 'pnpm verify 2>&1 | tee log', 'pnpm verify || true'];
    for (const text of named) expect(namesCommand(text, 'pnpm verify'), text).toBe(true);
    const notNamed = ['pnpm verify-all', 'pnpm verify tests/a.test.ts', 'pnpm verify --run'];
    for (const text of notNamed) expect(namesCommand(text, 'pnpm verify'), text).toBe(false);
    const chained = check(fixture({ tests: { gate: 'pnpm verify' }, acceptance: '- It works. Check: pnpm verify && pnpm lint pass.' }));
    expect(chained.gates).toHaveLength(1);
    expect(chained.status).toBe(2);
  });

  it('[AC:spec-4-2] a scope bullet naming the recorded gate gets one gate-in-spec gap at its line; "the recorded gate" gets none; a done spec is skipped', async () => {
    const { checkQueue } = await import('../payload/.joycraft/runtime/queue-check.mjs');
    const acceptance = '- It works. Check: `pnpm test tests/x.test.ts`.';
    const named = check(fixture({ tests: { gate: 'pnpm verify' }, acceptance, scope: '- Files: `src/a.ts`.\n- Run `pnpm verify` once, before review.' }));
    expect(named.status).toBe(2);
    expect(named.gates).toHaveLength(1);
    // 01-a.md: frontmatter 1-4, title 5, acceptance 7-9, scope heading 11, bullets 13-14.
    expect(named.gates[0]).toContain('01-a.md:14');
    expect(named.gates[0]).toContain('`pnpm verify`');
    expect(named.gates[0]).toContain('write "the recorded gate" instead');
    const kinds = checkQueue({ root: fixture({ tests: { gate: 'pnpm verify' }, acceptance, scope: '- Files: `src/a.ts`.\n- Run `pnpm verify` once, before review.' }), queuePath }).gaps
      .map((item: { kind: string; item: unknown }) => [item.kind, item.item]);
    expect(kinds).toEqual([['gate-in-spec', 14]]);
    const fenced = check(fixture({ tests: { gate: 'pnpm verify' }, acceptance, scope: '- Files: `src/a.ts`.\n\n```\npnpm verify\n```' }));
    expect(fenced.gates).toHaveLength(1);
    expect(fenced.gates[0]).toContain('01-a.md:16');
    const clean = check(fixture({ tests: { gate: 'pnpm verify' }, acceptance, scope: '- Files: `src/a.ts`.\n- Run the recorded gate once, before review.' }));
    expect(clean.gates).toHaveLength(0);
    expect(clean.stderr).not.toContain('gate-in-spec');
    expect(clean.status).toBe(0);
    const done = check(fixture({ tests: { gate: 'pnpm verify' }, acceptance, scope: '- Run `pnpm verify` once, before review.', status: 'done' }));
    expect(done.gates).toHaveLength(0);
  });

  it('[AC:spec-4-3] the namesCommand comment says a word starting with - is an argument, re-runs is prose, and lists the chain endings', () => {
    const source = readFileSync(runtime, 'utf8');
    const at = source.indexOf('export function namesCommand');
    const comment = source.slice(source.lastIndexOf('/**', at), at).replace(/\n \* ?/g, ' ').replace(/\s+/g, ' ');
    expect(comment).toContain('starts with `-`');
    expect(comment).toContain('re-runs');
    for (const ending of ['`&&`', '`||`', '`|`', '`2>&1`']) expect(comment).toContain(ending);
    expect(comment).not.toContain('`:`, `-` or `=`');
  });
});

// sl1-05: one refusal names every bad kind with the word to use; the template shows each kind.
describe('queue-check verification input kinds (sl1-05)', () => {
  const template = join(__dirname, '..', 'payload', '.joycraft', 'templates', 'queue.json');
  const templateFolder = 'docs/features/example-feature';
  const templateQueue = `${templateFolder}/specs/.joycraft-spec-queue.json`;
  function templated(edit: (body: string) => string) {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-queue-kinds-')));
    dirs.push(root);
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root });
    put(join(root, templateFolder, 'brief.md'), '# Brief\n\n## Goal\n\nText.\n');
    put(join(root, templateFolder, 'specs', '01-outcome.md'), '---\nid: 1\nstatus: todo\n---\n# Outcome\n\n## acceptance\n\n- It works. Check: `pnpm test tests/example.test.ts`.\n');
    put(join(root, templateQueue), edit(readFileSync(template, 'utf8')));
    return spawnSync(process.execPath, [runtime, '--queue', templateQueue, '--root', root], { encoding: 'utf8' });
  }

  it('[AC:sl1-05-kind] the template queue passes and shows one input of each kind', () => {
    const result = templated(body => body);
    expect(result.status, result.stderr).toBe(0);
    const kinds = JSON.parse(readFileSync(template, 'utf8')).specs[0].verification.inputs.map((input: { kind: string }) => input.kind);
    expect(new Set(kinds)).toEqual(new Set(['requirement', 'code', 'check', 'fixture']));
  });

  it('[AC:sl1-05-kind] two bad kinds give one message that names both, each with a suggestion', () => {
    const result = templated(body => body.replace('"kind": "code"', '"kind": "implementation"').replace('"kind": "check"', '"kind": "tests"'));
    expect(result.status).not.toBe(0);
    const lines = result.stderr.trim().split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('kind "implementation" is not valid; use "code"');
    expect(lines[0]).toContain('kind "tests" is not valid; use "check"');
    expect(lines[0]).toContain('src/example.ts');
    expect(lines[0]).toContain('tests/example.test.ts');
  });
});

describe('decompose names the four kind words (sl1-05)', () => {
  it('[AC:sl1-05-kind] the decompose skill lists requirement, code, check and fixture', () => {
    const skill = readFileSync(join(__dirname, '..', 'payload', '.agents', 'skills', 'joycraft-decompose', 'SKILL.md'), 'utf8');
    expect(skill).toMatch(/kind` is one\s+of four words: `requirement` \(brief, spec\), `code`, `check` \(test,\s+configuration\) or `fixture`/);
  });
});
