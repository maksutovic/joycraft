import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// Bugfix: docs/bugfixes/archive/merge-commit-brief-amendment.md
const runtime = join(__dirname, '..', 'payload', '.joycraft', 'runtime', 'archive.mjs');
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const hash = (body: string) => createHash('sha256').update(Buffer.from(body)).digest('hex');

const source = 'docs/features/f';
const brief = `${source}/brief.md`;
const header = '---\ndecisions: [{"id":"D1","status":"clarified","answer":"yes"}]\n---\n';
const v1 = `${header}# Brief v1\n`, v2 = `${header}# Brief v2\n`, v3 = `${header}# Brief v3\n`;

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

/** main lacks the brief; the feature branch adds it (accepted) and amends it once. */
function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-archive-merge-')));
  dirs.push(root);
  git(root, 'init', '-q', '-b', 'main');
  put(join(root, 'README.md'), 'x\n');
  git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'init');
  git(root, 'checkout', '-q', '-b', 'feature');
  put(join(root, brief), v1);
  git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'accepted brief');
  const accepted = git(root, 'rev-parse', 'HEAD');
  put(join(root, brief), v2);
  git(root, 'commit', '-q', '-am', 'amend brief');
  const amendment = git(root, 'rev-parse', 'HEAD');
  git(root, 'checkout', '-q', 'main');
  put(join(root, 'other.txt'), 'main moved on\n');
  git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'main work');
  return { root, accepted, amendment };
}

function writeRecord(root: string, amendments: Array<{ commit: string; from: string; to: string }>) {
  put(join(root, source, 'brief-amendments.json'), JSON.stringify({ schemaVersion: 1, kind: 'joycraft-brief-amendments', brief,
    amendments: amendments.map(({ commit, from, to }) => ({ commit, fromSha256: hash(from), toSha256: hash(to), decisions: ['D1'], summary: 'Owner-directed change.' })) }));
}

describe('archive brief amendments across a merge commit', () => {
  it('[AC:merge-keeps-parent-brief] a --no-ff merge into a main without the brief needs no amendment record', async () => {
    const { root, accepted, amendment } = fixture();
    git(root, 'merge', '-q', '--no-ff', '-m', 'merge feature', 'feature');
    const merge = git(root, 'rev-parse', 'HEAD');
    writeRecord(root, [{ commit: amendment, from: v1, to: v2 }]);
    const { historicalRequirement } = await import(runtime);
    const record = historicalRequirement(root, source, { path: brief, kind: 'requirement', sha256: hash(v1) }, (bytes: Buffer) => bytes);
    expect(record.acceptedCommit).toBe(accepted);
    expect(record.laterCommits).toEqual([amendment, merge]);
    expect(record.amendments.map((item: { commit: string }) => item.commit)).toEqual([amendment]);
  });

  it('[AC:merge-changes-brief] a merge whose brief differs from every parent still needs its own record', async () => {
    const { root, amendment } = fixture();
    git(root, 'merge', '-q', '--no-ff', '--no-commit', 'feature');
    put(join(root, brief), v3);
    git(root, 'add', brief); git(root, 'commit', '-q', '-m', 'merge feature with an edit');
    const merge = git(root, 'rev-parse', 'HEAD');
    writeRecord(root, [{ commit: amendment, from: v1, to: v2 }]);
    const { historicalRequirement } = await import(runtime);
    const check = () => historicalRequirement(root, source, { path: brief, kind: 'requirement', sha256: hash(v1) }, (bytes: Buffer) => bytes);
    expect(check).toThrow(`commit ${merge} has no single amendment record`);
    writeRecord(root, [{ commit: amendment, from: v1, to: v2 }, { commit: merge, from: '', to: v3 }]);
    expect(check).toThrow(`Brief amendment ${merge} does not match its commit's brief bytes`);
  });

  // Spec: docs/features/2026-11-22-fixes-1-9-3/specs/05-amendment-message.md
  it('[AC:spec-5-1] a missing amendment record names each later commit with its hashes and the reference that shows the record', async () => {
    const { root, amendment } = fixture();
    git(root, 'checkout', '-q', 'feature');
    const { historicalRequirement } = await import(runtime);
    const check = () => historicalRequirement(root, source, { path: brief, kind: 'requirement', sha256: hash(v1) }, (bytes: Buffer) => bytes);
    const entry = `${amendment} (fromSha256 ${hash(v1)}, toSha256 ${hash(v2)})`;
    expect(check).toThrow(`no ${source}/brief-amendments.json records its amendments; add one entry for each later brief commit, with the answered owner decision that authorized it, as .joycraft/references/archive.md shows for brief-amendments.json: ${entry})`);
    put(join(root, source, 'brief-amendments.json'), JSON.stringify({ schemaVersion: 1, kind: 'joycraft-brief-amendments', brief, amendments: [] }));
    expect(check).toThrow(`commit ${amendment} has no single amendment record; add one entry with the answered owner decision that authorized it, as .joycraft/references/archive.md shows for brief-amendments.json: ${entry})`);
    // The named hashes are the ones the record must carry.
    writeRecord(root, [{ commit: amendment, from: v1, to: v2 }]);
    expect(check().amendments.map((item: { commit: string }) => item.commit)).toEqual([amendment]);
  });
});
