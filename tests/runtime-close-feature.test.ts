import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

// sl3-05: close.mjs --feature ends the session of a queue whose specs are all done.
const runtime = join(__dirname, '..', 'payload', '.joycraft', 'runtime');
const closeScript = join(runtime, 'close.mjs');
const home = realpathSync(mkdtempSync(join(tmpdir(), 'jc-close-feature-home-')));
const env = { ...process.env, HOME: home, XDG_CONFIG_HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: join(home, 'none') };
const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const hash = (body: string) => createHash('sha256').update(Buffer.from(body)).digest('hex');
const folder = 'docs/features/x';
const queuePath = `${folder}/specs/.joycraft-spec-queue.json`;
const context = 'docs/context/decision-log.md';

const dirs: string[] = [home];
afterEach(() => { vi.useRealTimers(); for (const dir of dirs.splice(1)) rmSync(dir, { recursive: true, force: true, maxRetries: 5 }); });

/** A feature `x` with two legacy-accepted done specs; spec 2's frontmatter lags (status --fix repairs it). */
function fixture({ inReview = false } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-close-feature-')));
  dirs.push(root);
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'user.name', 't');
  git(root, 'config', 'user.email', 't@example.com');
  put(join(root, 'AGENTS.md'), '# Demo\n\nSee [decisions](docs/context/decision-log.md).\n');
  put(join(root, context), '# Decisions\n');
  put(join(root, `${folder}/brief.md`), '# Brief\n');
  const decision = JSON.stringify({ schemaVersion: 1, kind: 'legacy', queuePath, statement: 'Accept it as it is.', statedAt: '2026-11-21T00:00:00Z', specs: [1, 2], reason: 'Done before the gates.' });
  put(join(root, `${folder}/specs/legacy.json`), decision);
  const owner = { path: `${folder}/specs/legacy.json`, sha256: hash(decision), legacy: true };
  put(join(root, `${folder}/specs/01-a.md`), '---\nid: 1\nstatus: done\n---\n# A\n');
  put(join(root, `${folder}/specs/02-b.md`), '---\nid: 2\nstatus: in-review\n---\n# B\n');
  const spec = (id: number, file: string, done: boolean) => ({ id, file, status: done ? 'done' : 'in-review', mode: 'batch', depends_on: [], verification: { inputs: [] }, ...(done ? { ownerAcceptance: owner } : {}) });
  put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: 'x', specs: [spec(1, '01-a.md', true), spec(2, '02-b.md', !inReview)] }, null, 2));
  git(root, 'add', '.');
  git(root, 'commit', '-q', '-m', 'init');
  const claim = spawnSync(process.execPath, [join(runtime, 'coordinator.mjs'), 'claim', '--queue', queuePath, '--session', 's1'], { cwd: root, env, encoding: 'utf8' });
  expect(claim.status, claim.stderr).toBe(0);
  return root;
}

const lease = (root: string) => join(root, '.joycraft/local/coordinators/x.json');
const runClose = (root: string, ...args: string[]) => spawnSync(process.execPath, [closeScript, '--feature', 'x', '--session', 's1', ...args, '--root', root], { cwd: root, env, encoding: 'utf8' });
const files = (dir: string, base = dir): string[] => readdirSync(dir).flatMap(name => {
  const full = join(dir, name);
  return statSync(full).isDirectory() ? files(full, base) : [full.slice(base.length + 1)];
}).sort();

describe('close.mjs --feature', () => {
  it('[AC:sl3-05-close] a done, accepted queue closes with at most 2 commits, an archived folder, a released lease and the one line', () => {
    const root = fixture();
    const before = Number(git(root, 'rev-list', '--count', 'HEAD'));
    expect(existsSync(lease(root))).toBe(true);
    const result = runClose(root, '--context', context);
    expect(result.status, result.stderr).toBe(0);
    const lines = result.stdout.trim().split('\n');
    expect(lines).toHaveLength(1);
    const added = Number(git(root, 'rev-list', '--count', 'HEAD')) - before;
    expect(added).toBeGreaterThan(0);
    expect(added).toBeLessThanOrEqual(2);
    const hashes = git(root, 'log', `-${added}`, '--format=%h').split('\n').reverse();
    expect(lines[0]).toBe(`Path: feature. 2 of 2 specs done. Commits: ${hashes.join(', ')}. Archive: docs/archive/x.`);
    expect(git(root, 'log', `-${added}`, '--format=%s').split('\n').reverse()).toEqual(['docs: session-end records', 'docs: archive x']);
    expect(existsSync(join(root, folder))).toBe(false);
    expect(existsSync(join(root, 'docs/archive/x/feature/brief.md'))).toBe(true);
    expect(readFileSync(join(root, 'docs/archive/x/feature/specs/02-b.md'), 'utf8')).toContain('status: done');
    expect(existsSync(lease(root))).toBe(false);
    expect(git(root, 'status', '--porcelain')).toBe('');
  });

  it('[AC:sl3-05-refuse] an in-review spec, a dirty tree and a missing context page give exit 2, all three named, nothing changed', () => {
    const root = fixture({ inReview: true });
    put(join(root, 'scratch.txt'), 'work in progress\n');
    const state = () => ({ head: git(root, 'rev-parse', 'HEAD'), status: git(root, 'status', '--porcelain', '--untracked-files=all'), files: files(root).filter(file => !file.startsWith('.git/')), lease: readFileSync(lease(root), 'utf8') });
    const before = state();
    const result = runClose(root, '--context', `${context},docs/context/missing.md`);
    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/^Close stopped: nothing was changed\./);
    expect(result.stderr).toContain('Spec 2 (02-b.md) is in-review, not done.');
    expect(result.stderr).toMatch(/The tree has 1 uncommitted change/);
    expect(result.stderr).toContain('Context page docs/context/missing.md does not exist.');
    expect(state()).toEqual(before);
  });

  it('[AC:sl3-05-refuse] another session\'s lease stops the close', () => {
    const root = fixture();
    const result = spawnSync(process.execPath, [closeScript, '--feature', 'x', '--session', 's2', '--context', context, '--root', root], { cwd: root, env, encoding: 'utf8' });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Queue x is coordinated by session s1, not s2.');
    expect(existsSync(join(root, folder))).toBe(true);
  });

  it('[AC:sl3-05-same-checks] [AC:spec-10-1] the archive is byte-equal to the one the manual session-end steps write', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-23T12:00:00Z'));
    const load = async (name: string) => import(join(runtime, name));
    const [{ close }, { projectStatus }, { checkGates }, { tidyVerify }, { pruneWorktrees }, { release }, { archiveFeature }] = await Promise.all(
      ['close.mjs', 'status.mjs', 'gate.mjs', 'cleanup.mjs', 'worktrees.mjs', 'coordinator.mjs', 'archive.mjs'].map(load));

    const command = fixture();
    close(['--feature', 'x', '--session', 's1', '--context', context, '--root', command]);

    // The session-end skill's steps, one by one.
    const manual = fixture();
    projectStatus({ root: manual, fix: true });
    expect(checkGates(manual).failures).toEqual([]);
    git(manual, 'commit', '-q', '-a', '-m', 'docs: session-end records');
    expect(tidyVerify({ root: manual }).message).toBeNull();
    pruneWorktrees({ root: manual, apply: true });
    release({ root: manual, queuePath, session: 's1' });
    put(join(manual, '.joycraft/local/attestation.json'), JSON.stringify({ schemaVersion: 1, phase: 'session-end', host: { sessionId: 's1', quiescent: true, activeWorkers: [], dependentWork: [] }, durableContext: { carried: true, references: [context] } }));
    archiveFeature({ root: manual, feature: 'x', phase: 'session-end', attestation: '.joycraft/local/attestation.json', apply: true });

    const archived = (root: string) => join(root, 'docs/archive/x');
    expect(files(archived(command))).toEqual(files(archived(manual)));
    expect(files(archived(command)).length).toBeGreaterThan(3);
    for (const file of files(archived(manual))) {
      expect(readFileSync(join(archived(command), file)).equals(readFileSync(join(archived(manual), file))), file).toBe(true);
    }
  }, 20000);
});
