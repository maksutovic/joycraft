import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// drift-tidy spec 7: archive rewrites live links to the moved feature.
const runtime = join(__dirname, '..', 'payload', '.joycraft', 'runtime', 'archive.mjs');
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const hash = (body: string) => createHash('sha256').update(Buffer.from(body)).digest('hex');

const source = 'docs/features/x';
const queuePath = `${source}/specs/.joycraft-spec-queue.json`;
const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

/** A done feature `x` with one spec accepted as it is (legacy), plus live files that `extra` adds. */
function fixture(extra: Record<string, string>) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-archive-links-')));
  dirs.push(root);
  git(root, 'init', '-q', '-b', 'main');
  put(join(root, `${source}/brief.md`), '# Brief\n');
  put(join(root, `${source}/specs/01-a.md`), '---\nid: 1\nstatus: done\n---\n# A\n');
  const decision = JSON.stringify({ schemaVersion: 1, kind: 'legacy', queuePath, statement: 'Accept it as it is.', statedAt: '2026-11-21T00:00:00Z', specs: [1], reason: 'Done before the gates.' });
  put(join(root, `${source}/specs/legacy.json`), decision);
  put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: 'x', specs: [{ id: 1, file: '01-a.md', status: 'done', mode: 'batch', depends_on: [], verification: { inputs: [] }, ownerAcceptance: { path: `${source}/specs/legacy.json`, sha256: hash(decision), legacy: true } }] }));
  put(join(root, 'docs/context/decision-log.md'), '# Decisions\n');
  put(join(root, '.joycraft/local/attest.json'), JSON.stringify({ schemaVersion: 1, phase: 'session-end', host: { sessionId: 's', quiescent: true, activeWorkers: [], dependentWork: [] }, durableContext: { carried: true, references: ['docs/context/decision-log.md'] } }));
  for (const [file, body] of Object.entries(extra)) put(join(root, file), body);
  git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'init');
  return root;
}

function apply(root: string) {
  const result = spawnSync(process.execPath, [runtime, 'archive', '--feature', 'x', '--phase', 'session-end', '--attestation', '.joycraft/local/attest.json', '--apply'], { cwd: root, encoding: 'utf8' });
  expect([result.status, result.stderr]).toEqual([0, '']);
  return JSON.parse(result.stdout);
}

describe('archive rewrites live links', () => {
  it('[AC:spec-7-1] a context page link into the feature points at its archive path after apply, and resolves', () => {
    const root = fixture({ 'docs/context/page.md': '# Page\n\nSee [the brief](../features/x/brief.md#goals) and [specs][s].\n\n[s]: ../features/x/specs/\n' });
    const result = apply(root);
    const page = readFileSync(join(root, 'docs/context/page.md'), 'utf8');
    expect(page).toBe('# Page\n\nSee [the brief](../archive/x/feature/brief.md#goals) and [specs][s].\n\n[s]: ../archive/x/feature/specs/\n');
    expect(existsSync(join(root, 'docs/context', '../archive/x/feature/brief.md'))).toBe(true);
    expect(result.links.rewritten).toEqual([
      { path: 'docs/context/page.md', line: 3, from: '../features/x/brief.md#goals', to: '../archive/x/feature/brief.md#goals' },
      { path: 'docs/context/page.md', line: 5, from: '../features/x/specs/', to: '../archive/x/feature/specs/' },
    ]);
  });

  it('[AC:spec-7-2] live Markdown naming the folder in prose and a tracked non-Markdown file are listed and unchanged', () => {
    const code = "export const brief = 'docs/features/x/brief.md';\n";
    const note = 'The work in `docs/features/x` is done; docs/features/x was big.\n';
    const root = fixture({ 'src/a.ts': code, 'docs/notes/n.md': note, 'docs/notes/other.md': 'Nothing about docs/features/xy here.\n' });
    const result = apply(root);
    expect(result.links.namedInMarkdown).toEqual(['docs/notes/n.md']);
    expect(result.links.namedInOtherFiles).toEqual(['src/a.ts']);
    expect(readFileSync(join(root, 'src/a.ts'), 'utf8')).toBe(code);
    expect(readFileSync(join(root, 'docs/notes/n.md'), 'utf8')).toBe(note);
  });

  it('[AC:spec-7-3] a page inside the archive that links the feature folder is byte-identical after apply', () => {
    const old = '# Old\n\nSee [x](../../../features/x/brief.md).\n';
    const root = fixture({ 'docs/archive/old/feature/brief.md': old });
    const result = apply(root);
    expect(readFileSync(join(root, 'docs/archive/old/feature/brief.md'), 'utf8')).toBe(old);
    expect(result.links.rewritten).toEqual([]);
  });
});
