import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// drift-tidy spec 8: an owner can archive an unfinished feature as is.
const runtime = join(__dirname, '..', 'payload', '.joycraft', 'runtime', 'archive.mjs');
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const hash = (body: string | Buffer) => createHash('sha256').update(body).digest('hex');

const source = 'docs/features/x';
const queuePath = `${source}/specs/.joycraft-spec-queue.json`;
const instruction = 'Archive x as it is; spec 2 was dropped and nobody will review it.';
const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

/** Feature `x`: spec 1 accepted as it is (legacy), spec 2 `in-review` whose report names a receipt that is gone. */
function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-archive-as-is-')));
  dirs.push(root);
  git(root, 'init', '-q', '-b', 'main');
  put(join(root, `${source}/brief.md`), '# Brief\n');
  put(join(root, `${source}/specs/01-a.md`), '---\nid: 1\nstatus: done\n---\n# A\n');
  put(join(root, `${source}/specs/02-b.md`), '---\nid: 2\nstatus: in-review\n---\n# B\n');
  const decision = JSON.stringify({ schemaVersion: 1, kind: 'legacy', queuePath, statement: 'Accept spec 1 as it is.', statedAt: '2026-11-21T00:00:00Z', specs: [1], reason: 'Done before the gates.' });
  put(join(root, `${source}/specs/legacy.json`), decision);
  const report = JSON.stringify({ schemaVersion: 1, verdict: 'UNVERIFIED', flows: [{ observations: [{ receipts: [{ path: 'docs/reviews/x/gone.txt', sha256: hash('gone') }] }] }] });
  put(join(root, 'docs/reviews/x/spec-2.json'), report);
  put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: 'x', specs: [
    { id: 1, file: '01-a.md', status: 'done', mode: 'batch', depends_on: [], verification: { inputs: [] }, ownerAcceptance: { path: `${source}/specs/legacy.json`, sha256: hash(decision), legacy: true } },
    { id: 2, file: '02-b.md', status: 'in-review', mode: 'batch', depends_on: [], verification: { inputs: [], criteria: [{ id: 'b', requirement: { path: `${source}/specs/02-b.md`, anchor: 'b' }, requiredKinds: ['runtime'] }] }, submitted: { at: '2026-11-21T00:00:00Z' } },
  ] }, null, 2));
  put(join(root, 'docs/context/decision-log.md'), '# Decisions\n');
  put(join(root, '.joycraft/local/attest.json'), JSON.stringify({ schemaVersion: 1, phase: 'session-end', host: { sessionId: 's', quiescent: true, activeWorkers: [], dependentWork: [] }, durableContext: { carried: true, references: ['docs/context/decision-log.md'] } }));
  git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'init');
  return { root, report };
}

const archive = (root: string, ...flags: string[]) => spawnSync(process.execPath, [runtime, 'archive', '--feature', 'x', '--phase', 'session-end', '--attestation', '.joycraft/local/attest.json', ...flags], { cwd: root, encoding: 'utf8' });

describe('archive as is', () => {
  it('[AC:spec-8-1] a feature with one in-review spec is refused by default and archived with --as-is --owner-instruction', () => {
    const { root } = fixture();
    const refused = archive(root, '--apply');
    expect(refused.status).toBe(1);
    expect(refused.stderr).toBe('Archive stopped: Spec 2 is not accepted\n');
    expect(existsSync(join(root, source))).toBe(true);
    const result = archive(root, '--as-is', '--owner-instruction', instruction, '--apply');
    expect([result.status, result.stderr]).toEqual([0, '']);
    expect(JSON.parse(result.stdout)).toMatchObject({ status: 'archived', unverified: 'docs/archive/x/unverified.md', historical: { currentAcceptanceRenewed: false, archivedAsIs: true } });
    expect(existsSync(join(root, source))).toBe(false);
    expect(existsSync(join(root, 'docs/archive/x/feature/specs/02-b.md'))).toBe(true);
  });

  it('[AC:spec-8-2] unverified.md names the spec, the missing receipt and the instruction; queue and report bytes are preserved; nothing claims acceptance', () => {
    const { root, report } = fixture();
    const queueBytes = readFileSync(join(root, queuePath));
    const specBytes = readFileSync(join(root, `${source}/specs/02-b.md`));
    expect(archive(root, '--as-is', '--owner-instruction', instruction, '--apply').status).toBe(0);
    const note = readFileSync(join(root, 'docs/archive/x/unverified.md'), 'utf8');
    expect(note).toContain('- Spec 2 (`02-b.md`): status in-review');
    expect(note).not.toContain('Spec 1 (');
    expect(note).toContain(`> ${instruction}`);
    expect(note).toContain('Nothing here says that it was accepted or verified.');
    expect(readFileSync(join(root, 'docs/archive/x/feature/specs/.joycraft-spec-queue.json')).equals(queueBytes)).toBe(true);
    expect(readFileSync(join(root, 'docs/archive/x/feature/specs/02-b.md')).equals(specBytes)).toBe(true);
    expect(readFileSync(join(root, 'docs/reviews/x/spec-2.json'), 'utf8')).toBe(report);
    const manifest = JSON.parse(readFileSync(join(root, 'docs/archive/x/archive-replay.json'), 'utf8'));
    expect(manifest.evidence.map((item: { kind: string }) => item.kind)).toEqual(['legacy-acceptance']);
    expect(manifest.asIs).toMatchObject({ ownerInstruction: instruction, unverified: [{ id: 2, status: 'in-review' }] });
    // A repeat of the same command is idempotent and still verifies the note.
    expect(JSON.parse(archive(root, '--as-is', '--owner-instruction', instruction, '--apply').stdout)).toMatchObject({ status: 'archived', unchanged: true });
  });

  it('[AC:spec-8-2] a done spec whose report receipt is missing is listed with that receipt', () => {
    const { root } = fixture();
    const queue = JSON.parse(readFileSync(join(root, queuePath), 'utf8'));
    queue.specs[1] = { ...queue.specs[1], status: 'done', acceptedReport: { path: 'docs/reviews/x/spec-2.json', sha256: hash(readFileSync(join(root, 'docs/reviews/x/spec-2.json'))) } };
    delete queue.specs[1].submitted;
    put(join(root, queuePath), JSON.stringify(queue, null, 2));
    put(join(root, `${source}/specs/02-b.md`), '---\nid: 2\nstatus: done\n---\n# B\n');
    expect(archive(root, '--as-is', '--owner-instruction', instruction, '--apply').status).toBe(0);
    const note = readFileSync(join(root, 'docs/archive/x/unverified.md'), 'utf8');
    expect(note).toMatch(/- Spec 2 \(`02-b\.md`\): .+/);
    expect(note).toContain('  - Missing or changed: `docs/reviews/x/gone.txt`');
  });

  it('[AC:spec-8-3] --as-is without --owner-instruction exits non-zero naming the missing flag', () => {
    const { root } = fixture();
    const result = archive(root, '--as-is', '--apply');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('--owner-instruction');
    expect(existsSync(join(root, source))).toBe(true);
  });

  it('[review-b-4] --as-is on a fully accepted feature is the normal archive: no unverified.md, not archived as is', () => {
    const { root } = fixture();
    const queue = JSON.parse(readFileSync(join(root, queuePath), 'utf8'));
    queue.specs = queue.specs.slice(0, 1);
    put(join(root, queuePath), JSON.stringify(queue, null, 2));
    rmSync(join(root, `${source}/specs/02-b.md`));
    const result = archive(root, '--as-is', '--owner-instruction', instruction, '--apply');
    expect([result.status, result.stderr]).toEqual([0, '']);
    const out = JSON.parse(result.stdout);
    expect(out).toMatchObject({ status: 'archived', asIs: 'not-needed' });
    expect(out.unverified).toBeUndefined();
    expect(out.historical.archivedAsIs).toBeUndefined();
    expect(existsSync(join(root, 'docs/archive/x/unverified.md'))).toBe(false);
    const manifest = JSON.parse(readFileSync(join(root, 'docs/archive/x/archive-replay.json'), 'utf8'));
    expect(manifest.asIs).toBeUndefined();
    expect(manifest.historical.archivedAsIs).toBeUndefined();
  });

  it('[review-b-5] a repeat archive of an as-is archive names the unverified note', () => {
    const { root } = fixture();
    expect(archive(root, '--as-is', '--owner-instruction', instruction, '--apply').status).toBe(0);
    expect(JSON.parse(archive(root, '--apply').stdout)).toMatchObject({ status: 'archived', unchanged: true, unverified: 'docs/archive/x/unverified.md' });
  });

  it('[review-b-9] --owner-instruction followed by a value that starts with -- stops with a message', () => {
    const { root } = fixture();
    const result = archive(root, '--as-is', '--owner-instruction', '--apply');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('cannot start with --');
    expect(existsSync(join(root, source))).toBe(true);
  });
});
