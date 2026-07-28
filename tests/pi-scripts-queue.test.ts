import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const SCRIPTS = join(repoRoot, 'src', 'templates', 'pi-scripts');

/**
 * The queue scripts parse `.joycraft-spec-queue.json` with line-oriented sed
 * and `grep -o '{[^}]*}'`. `joycraft-decompose` documents a compact
 * one-object-per-line manifest, but real manifests are frequently
 * pretty-printed one key per line — and against that layout every script
 * silently misbehaved (mark-done no-op'd while reporting success, next-spec
 * reported "Pipeline complete" with specs still todo).
 *
 * Every case runs against BOTH layouts. The compact cases are the regression
 * guard: the fix must widen support, never swap one format for the other.
 */

const SPECS = [
  { id: 1, file: 'first.md', depends_on: [] as number[], status: 'todo', mode: 'batch' },
  { id: 2, file: 'second.md', depends_on: [1], status: 'todo', mode: 'checkpoint' },
  { id: 3, file: 'third.md', depends_on: [] as number[], status: 'todo', mode: 'batch' },
];

/** One object per line — the format `joycraft-decompose` documents. */
function compact(specs = SPECS): string {
  const rows = specs
    .map(
      (s) =>
        `    { "id": ${s.id}, "file": "${s.file}", "depends_on": [${s.depends_on.join(', ')}], ` +
        `"status": "${s.status}", "mode": "${s.mode}" }`,
    )
    .join(',\n');
  return `{\n  "feature": "fixture",\n  "specs": [\n${rows}\n  ]\n}\n`;
}

/** One key per line — what real manifests on disk look like. */
function pretty(specs = SPECS): string {
  return JSON.stringify({ feature: 'fixture', specs }, null, 2) + '\n';
}

const LAYOUTS: Array<[string, (s?: typeof SPECS) => string]> = [
  ['compact', compact],
  ['pretty-printed', pretty],
];

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'joycraft-queue-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function writeManifest(content: string): void {
  writeFileSync(join(dir, '.joycraft-spec-queue.json'), content);
}

function readManifest(): string {
  return readFileSync(join(dir, '.joycraft-spec-queue.json'), 'utf-8');
}

function run(
  script: string,
  args: string[],
): { stdout: string; status: number; stderr: string } {
  try {
    const stdout = execFileSync(join(SCRIPTS, script), args, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { stdout, status: 0, stderr: '' };
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; status?: number };
    return { stdout: err.stdout ?? '', stderr: err.stderr ?? '', status: err.status ?? 1 };
  }
}

/** Read a spec's status straight out of the manifest, layout-independent. */
function statusOf(id: number): string | undefined {
  return JSON.parse(readManifest()).specs.find((s: { id: number }) => s.id === id)?.status;
}

describe.each(LAYOUTS)('joycraft-mark-done (%s manifest)', (_label, layout) => {
  it('flips the target spec status', () => {
    writeManifest(layout());
    const r = run('joycraft-mark-done', ['1', '--to', 'in-review', dir]);
    expect(r.status).toBe(0);
    expect(statusOf(1)).toBe('in-review');
  });

  it('leaves every other spec untouched', () => {
    writeManifest(layout());
    run('joycraft-mark-done', ['2', '--to', 'done', dir]);
    expect(statusOf(1)).toBe('todo');
    expect(statusOf(2)).toBe('done');
    expect(statusOf(3)).toBe('todo');
  });

  it('supports the in-review -> done transition', () => {
    writeManifest(layout());
    run('joycraft-mark-done', ['3', '--to', 'in-review', dir]);
    run('joycraft-mark-done', ['3', '--to', 'done', dir]);
    expect(statusOf(3)).toBe('done');
  });

  it('keeps the manifest valid JSON', () => {
    writeManifest(layout());
    run('joycraft-mark-done', ['1', '--to', 'done', dir]);
    expect(() => JSON.parse(readManifest())).not.toThrow();
  });

  it('errors on an unknown spec id instead of no-oping', () => {
    writeManifest(layout());
    const r = run('joycraft-mark-done', ['99', '--to', 'done', dir]);
    expect(r.status).not.toBe(0);
  });

  it('never reports success without changing the status', () => {
    // The core defect: exit 0 plus "Spec #N marked ..." while the file is
    // unchanged. Success must imply the write landed.
    writeManifest(layout());
    const before = readManifest();
    const r = run('joycraft-mark-done', ['1', '--to', 'in-review', dir]);
    if (r.status === 0) {
      expect(readManifest(), 'exit 0 must mean the manifest changed').not.toBe(before);
      expect(statusOf(1)).toBe('in-review');
    }
  });
});

describe('joycraft-mark-done fails loudly rather than silently', () => {
  it('exits non-zero and leaves the file untouched when the entry has no status key', () => {
    // The guard that makes the whole fix trustworthy: if the rewrite cannot
    // land, the script must say so instead of printing success. A silent no-op
    // desyncs the queue from the spec frontmatter.
    const manifest = JSON.stringify(
      { feature: 'fixture', specs: [{ id: 1, file: 'a.md', depends_on: [] }] },
      null,
      2,
    );
    writeManifest(manifest);
    const r = run('joycraft-mark-done', ['1', '--to', 'done', dir]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).not.toBe('');
    expect(readManifest()).toBe(manifest);
  });

  it('does not print a success line when it fails', () => {
    writeManifest(
      JSON.stringify({ feature: 'fixture', specs: [{ id: 1, file: 'a.md' }] }, null, 2),
    );
    const r = run('joycraft-mark-done', ['1', '--to', 'done', dir]);
    expect(r.stdout).not.toContain('marked');
  });
});

describe.each(LAYOUTS)('joycraft-spec-status (%s manifest)', (_label, layout) => {
  it('lists every spec', () => {
    writeManifest(layout());
    const { stdout } = run('joycraft-spec-status', [dir]);
    for (const s of SPECS) expect(stdout).toContain(s.file);
  });

  it('renders the todo glyph', () => {
    writeManifest(layout());
    expect(run('joycraft-spec-status', [dir]).stdout).toContain('[ ]');
  });

  it('reflects a status change', () => {
    writeManifest(layout());
    run('joycraft-mark-done', ['1', '--to', 'done', dir]);
    expect(run('joycraft-spec-status', [dir]).stdout).toContain('[✓]');
  });
});

describe.each(LAYOUTS)('joycraft-next-spec (%s manifest)', (_label, layout) => {
  it('serves the first ready spec', () => {
    writeManifest(layout());
    const { stdout } = run('joycraft-next-spec', [dir]);
    expect(stdout).toContain('first.md');
  });

  it('does not claim completion while specs remain todo', () => {
    // The dangerous failure: "Pipeline complete" ends an autonomous loop before
    // any spec runs, and looks identical to a genuinely finished queue.
    writeManifest(layout());
    expect(run('joycraft-next-spec', [dir]).stdout).not.toContain('Pipeline complete');
  });

  it('does not serve a spec whose dependency is unmet', () => {
    writeManifest(layout());
    expect(run('joycraft-next-spec', [dir]).stdout).not.toContain('second.md');
  });

  it('serves a dependent spec once its dependency is satisfied', () => {
    const specs = SPECS.map((s) => (s.id === 1 ? { ...s, status: 'in-review' } : s));
    writeManifest(layout(specs));
    expect(run('joycraft-next-spec', [dir]).stdout).toContain('second.md');
  });

  it('reports completion when nothing is left', () => {
    const specs = SPECS.map((s) => ({ ...s, status: 'done' }));
    writeManifest(layout(specs));
    expect(run('joycraft-next-spec', [dir]).stdout).toContain('Pipeline complete');
  });
});
