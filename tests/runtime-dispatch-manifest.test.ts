import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyInstall, planInstall } from '../src/install-v1.js';

// Spec: docs/features/2026-11-28-runtime-fixes-restate/specs/02-dispatch-manifest.md
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'core.autocrlf=false', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const folder = 'docs/features/2026-11-28-m';
const queuePath = `${folder}/specs/.joycraft-spec-queue.json`;
const roleSkill = '.claude/skills/joycraft-implement/SKILL.md';
const unrelated = ['.claude/skills/joycraft-session-end/SKILL.md', '.agents/skills/joycraft-session-end/SKILL.md'];

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true, maxRetries: 5 }); });

/** A Git project with Claude and Codex installs, one todo spec, and a pinned copy of the manifest. `edit` changes installed files before the commit. */
function project(edit: (root: string) => void = () => {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-manifest-')));
  const pinned = realpathSync(mkdtempSync(join(tmpdir(), 'jc-manifest-pin-')));
  dirs.push(root, pinned);
  git(root, 'init', '-q', '-b', 'main');
  applyInstall(planInstall(root, ['claude', 'codex']));
  copyFileSync(join(root, '.joycraft/installation.json'), join(pinned, 'installation.json'));
  put(join(root, '.gitignore'), '.joycraft/local/\n');
  put(join(root, folder, 'brief.md'), '# Brief\n\n## Goal\n\nText.\n');
  const spec = `${folder}/specs/01-a.md`;
  put(join(root, spec), '---\nid: 1\nstatus: todo\n---\n# A\n\n## acceptance\n\n- It works. Check: the test passes.\n');
  put(join(root, 'src/a.ts'), 'export const a = 1;\n');
  put(join(root, 'tests/a.test.ts'), 'test\n');
  put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: 'm', specs: [{ id: 1, file: '01-a.md', depends_on: [], status: 'todo', mode: 'checkpoint',
    verification: { inputs: [{ path: `${folder}/brief.md`, kind: 'requirement' }, { path: spec, kind: 'requirement' }, { path: 'src/a.ts', kind: 'code' }, { path: 'tests/a.test.ts', kind: 'check' }],
      criteria: [{ id: 'spec-1-1', requirement: { path: spec, anchor: 'acceptance' }, requiredKinds: ['runtime'] }] } }] }, null, 2));
  edit(root);
  git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'init');
  return { root, manifest: join(pinned, 'installation.json') };
}

/** Implementer startup; with `counter`, a preload counts readFileSync calls per absolute path into that file. */
function start({ root, manifest }: { root: string; manifest: string }, counter?: string) {
  const env = { ...process.env };
  if (counter) {
    const preload = join(dirname(counter), 'count-reads.mjs');
    writeFileSync(preload, `import fs from 'node:fs';\nimport { syncBuiltinESMExports } from 'node:module';\nconst original = fs.readFileSync;\nconst counts = {};\nfs.readFileSync = function (file, ...rest) { const key = String(file); counts[key] = (counts[key] ?? 0) + 1; return original.call(this, file, ...rest); };\nsyncBuiltinESMExports();\nprocess.on('exit', () => fs.writeFileSync(${JSON.stringify(counter)}, JSON.stringify(counts)));\n`);
    env.NODE_OPTIONS = `${env.NODE_OPTIONS ?? ''} --import ${preload}`.trim();
  }
  const result = spawnSync(process.execPath, [join(root, '.joycraft/runtime/dispatch-start.mjs'), '--worker-root', root, '--expected-manifest', manifest,
    '--queue', queuePath, '--spec', '1', '--role', 'implementer', '--implementer-session', 'impl-1', '--out', `.joycraft/local/packets/implementer-${Date.now()}.json`,
    '--capabilities', 'filesystem:read,filesystem:write-report', '--native-session', 'impl-1'], { cwd: root, encoding: 'utf8', env });
  return { status: result.status, stderr: result.stderr, stdout: result.stdout };
}

describe('dispatch installed-manifest check', () => {
  it('[AC:spec-2-1] a blank line added to an unrelated installed skill (Claude and Codex copies) does not refuse implementer dispatch', () => {
    const fixture = project(root => { for (const file of unrelated) writeFileSync(join(root, file), `${readFileSync(join(root, file), 'utf8')}\n`); });
    const result = start(fixture);
    expect(result.stderr).not.toContain('Installed file differs from manifest');
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).ready).toBe(true);
  });

  it('[AC:spec-2-2] a role file whose only change is LF to CRLF does not refuse', () => {
    const fixture = project(root => { const file = join(root, roleSkill); writeFileSync(file, readFileSync(file, 'utf8').replace(/\r?\n/g, '\r\n')); });
    expect(readFileSync(join(fixture.root, roleSkill), 'utf8')).toContain('\r\n');
    const result = start(fixture);
    expect(result.stderr).not.toContain('Installed file differs from manifest');
    expect(result.status, result.stderr).toBe(0);
  });

  it('[AC:spec-2-3] a real content edit to a role file still refuses with the message naming the file', () => {
    const fixture = project(root => { const file = join(root, roleSkill); writeFileSync(file, `${readFileSync(file, 'utf8')}\nExtra rule.\n`); });
    const result = start(fixture);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(`Installed file differs from manifest: ${roleSkill}`);
  });

  it('[AC:spec-2-4] the installation manifest is read once per dispatch and unrelated files are not hashed', () => {
    const fixture = project();
    const counter = join(fixture.root, '..', `${fixture.root.split('/').pop()}-reads.json`);
    dirs.push(counter, join(dirname(counter), 'count-reads.mjs'));
    const result = start(fixture, counter);
    expect(result.status, result.stderr).toBe(0);
    const counts: Record<string, number> = JSON.parse(readFileSync(counter, 'utf8'));
    expect(counts[join(fixture.root, '.joycraft/installation.json')]).toBe(1);
    expect(counts[join(fixture.root, roleSkill)]).toBe(1);
    for (const file of unrelated) expect(counts[join(fixture.root, file)] ?? 0).toBe(0);
  });
});
