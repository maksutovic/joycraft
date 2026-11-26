import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyInstall, planInstall } from '../src/install-v1.js';
// @ts-expect-error The runtime is plain JavaScript.
import { traceSpec } from '../payload/.joycraft/runtime/trace.mjs';

// Spec: docs/features/2026-11-26-review-followups/specs/02-wave-noise.md
// Spec: docs/features/2026-11-26-review-followups/specs/07-archived-tags-fix.md
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const node = (root: string, script: string, args: string[]) => spawnSync(process.execPath, [join(root, '.joycraft/runtime', script), ...args], { cwd: root, encoding: 'utf8' });
const folder = 'docs/features/2026-11-26-f';
const queuePath = `${folder}/specs/.joycraft-spec-queue.json`;

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true, maxRetries: 5 }); });

const specEntry = (id: number, name: string, status: string) => ({
  id, file: `0${id}-${name}.md`, depends_on: [], status, mode: 'checkpoint',
  verification: {
    inputs: [{ path: `${folder}/brief.md`, kind: 'requirement' }, { path: `${folder}/specs/0${id}-${name}.md`, kind: 'requirement' },
      { path: `src/${name}.ts`, kind: 'code' }, { path: `tests/${name}.test.ts`, kind: 'check' }],
    criteria: [{ id: `spec-${id}-1`, requirement: { path: `${folder}/specs/0${id}-${name}.md`, anchor: 'acceptance' }, requiredKinds: ['runtime'] }],
  },
});

/** A git project with the shipped runtime, a two-spec queue (a, b) and one archived feature whose criterion is old-7. */
function fixture({ archive = 'docs/archive', status = 'in-review', archivedIds = ['old-7'] }: { archive?: string; status?: string; archivedIds?: string[] } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-trace-archived-')));
  dirs.push(root);
  git(root, 'init', '-q', '-b', 'main');
  applyInstall(planInstall(root, ['claude']));
  if (archive !== 'docs/archive') put(join(root, 'joycraft.yaml'), `paths:\n  archive: ${archive}\n`);
  put(join(root, '.gitignore'), '.joycraft/local/\n');
  put(join(root, folder, 'brief.md'), '# Brief\n\n## Goal\n\nText.\n');
  for (const [id, name] of [[1, 'a'], [2, 'b']] as const) {
    put(join(root, folder, 'specs', `0${id}-${name}.md`), `---\nid: ${id}\nstatus: ${status}\n---\n# ${name}\n\n## acceptance\n\n- It works.\n`);
    put(join(root, 'src', `${name}.ts`), `export const ${name} = 1;\n`);
  }
  put(join(root, 'tests/a.test.ts'), 'it("[AC:spec-1-1] works", () => {});\nit("[AC:old-7] an old feature", () => {});\nit("[AC:nowhere-9] matches nothing", () => {});\n');
  put(join(root, 'tests/b.test.ts'), 'it("[AC:spec-2-1] works", () => {});\n');
  put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: 'f', specs: [specEntry(1, 'a', status), specEntry(2, 'b', 'todo')] }, null, 2));
  const old = `${archive}/2026-01-01-old/feature/specs`;
  put(join(root, old, '.joycraft-spec-queue.json'), JSON.stringify({ schemaVersion: 1, feature: 'old', specs: [{ id: 7, file: '07-old.md', depends_on: [], status: 'done', mode: 'checkpoint',
    verification: { inputs: [{ path: `${old}/07-old.md`, kind: 'requirement' }], criteria: archivedIds.map(id => ({ id, requirement: { path: `${old}/07-old.md`, anchor: 'acceptance' }, requiredKinds: ['runtime'] })) } }] }, null, 2));
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'init');
  return root;
}

const reviewerStart = (root: string) => {
  const result = node(root, 'dispatch-start.mjs', ['--queue', queuePath, '--spec', '1', '--role', 'reviewer', '--coordinator-session', 'lead-1']);
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
};

describe('a reviewer is not shown its siblings\' work or archived tags as its own', () => {
  it('[AC:spec-2-1] a tag of an archived feature is an archived tag, not unknown; reviewer startup carries it', () => {
    for (const archive of ['docs/archive', 'docs/old']) {
      const root = fixture({ archive });
      const trace = traceSpec({ root, queuePath, specId: 1 });
      expect(trace.archivedTags).toEqual([{ id: 'old-7', file: 'tests/a.test.ts', line: 2 }]);
      expect(trace.unknownTags).toEqual([{ id: 'nowhere-9', file: 'tests/a.test.ts', line: 3 }]);
      expect(trace.untraced).toEqual([]);
      expect(node(root, 'coordinator.mjs', ['claim', '--queue', queuePath, '--session', 'lead-1', '--host', 'claude']).status).toBe(0);
      const started = reviewerStart(root);
      expect(started.trace.archivedTags).toEqual([{ id: 'old-7', file: 'tests/a.test.ts', line: 2 }]);
      expect(started.trace.unknownTags).toEqual([{ id: 'nowhere-9', file: 'tests/a.test.ts', line: 3 }]);
    }
  }, 60_000);

  it('[AC:spec-2-2] reviewer startup lists a sibling spec\'s changed files as siblings, apart from outside', () => {
    const root = fixture();
    expect(node(root, 'coordinator.mjs', ['claim', '--queue', queuePath, '--session', 'lead-1', '--host', 'claude']).status).toBe(0);
    // Both specs of the queue changed their files in the same wave.
    put(join(root, 'src/a.ts'), 'export const a = 2;\n');
    put(join(root, 'src/b.ts'), 'export const b = 2;\n');
    git(root, 'add', '-A');
    git(root, 'commit', '-q', '-m', 'wave');
    const first = reviewerStart(root).scope;
    expect([...first.changed].sort()).toEqual(['src/a.ts', 'src/b.ts']);
    expect(first.siblings).toEqual(['src/b.ts']);
    expect(first).not.toHaveProperty('outside');
    expect(first).not.toHaveProperty('note');
    // A changed file no spec declares stays outside, with the note.
    put(join(root, 'src/stray.ts'), 'export const stray = 1;\n');
    git(root, 'add', '-A');
    git(root, 'commit', '-q', '-m', 'stray');
    const second = reviewerStart(root).scope;
    expect(second.siblings).toEqual(['src/b.ts']);
    expect(second.outside).toEqual(['src/stray.ts']);
    expect(second.note).toMatch(/`note`/);
    expect(second.note).toMatch(/not file `siblings`|`siblings`.*not/i);
  }, 60_000);

  it('[AC:spec-2-3] the verify skill says not to file siblings or archived tags, and a hang is UNVERIFIED, never FAIL', () => {
    const text = readFileSync(join(__dirname, '..', 'payload', '.agents', 'skills', 'joycraft-verify', 'SKILL.md'), 'utf8').replace(/\s+/g, ' ');
    expect(text).toMatch(/Do not file `siblings` or `archivedTags`/);
    expect(text).toMatch(/hang is `UNVERIFIED` with its receipt, never `FAIL`/);
  });

  it('[AC:spec-7-1] a tag naming a current spec\'s criterion stays unknown even when an archived queue reuses its ID', () => {
    const root = fixture({ archivedIds: ['old-7', 'spec-1-1'] });
    const trace = traceSpec({ root, queuePath, specId: 2, tests: ['tests/a.test.ts'] });
    expect(trace.archivedTags).toEqual([{ id: 'old-7', file: 'tests/a.test.ts', line: 2 }]);
    expect(trace.unknownTags).toEqual([{ id: 'spec-1-1', file: 'tests/a.test.ts', line: 1 }, { id: 'nowhere-9', file: 'tests/a.test.ts', line: 3 }]);
  });

  it('[AC:spec-7-2] the verify skill never files startup\'s siblings or archivedTags, and notes only what startup did not list', () => {
    const text = readFileSync(join(__dirname, '..', 'payload', '.agents', 'skills', 'joycraft-verify', 'SKILL.md'), 'utf8').replace(/\s+/g, ' ');
    const rule = text.slice(text.indexOf('Findings rule:'));
    expect(rule).toMatch(/Do not file `siblings` or `archivedTags`/);
    expect(rule).toMatch(/another spec's file or an archived feature's tag that startup did not list/);
    expect(rule).not.toMatch(/a changed file of another spec, a test tag of an archived feature/);
  });
});
