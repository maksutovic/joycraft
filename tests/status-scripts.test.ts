import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = join(__dirname, '..');
const SRC_DIR = join(ROOT, 'src', 'templates', 'pi-scripts');
const PI_DIR = join(ROOT, '.pi', 'scripts', 'joycraft');

const NEXT_SPEC = join(SRC_DIR, 'joycraft-next-spec');
const MARK_DONE = join(SRC_DIR, 'joycraft-mark-done');
const SPEC_STATUS = join(SRC_DIR, 'joycraft-spec-status');

const SCRIPTS = ['joycraft-next-spec', 'joycraft-mark-done', 'joycraft-spec-status'];

/** Result of running a script: captured stdout, and whether it exited zero. */
interface RunResult {
  stdout: string;
  ok: boolean;
  status: number | null;
}

/** Run a script under bash against a specs dir; never throws on non-zero exit. */
function run(script: string, args: string[]): RunResult {
  try {
    const stdout = execFileSync('bash', [script, ...args], { encoding: 'utf-8' });
    return { stdout, ok: true, status: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: Buffer | string; status?: number | null };
    return {
      stdout: e.stdout ? e.stdout.toString() : '',
      ok: false,
      status: e.status ?? null,
    };
  }
}

let dir: string;

/**
 * Write a queue manifest into the temp specs dir, matching the REAL
 * decompose-emitted format: one compact spec object per line (the scripts'
 * grep -o '{[^}]*}' parser is line-oriented and never sees multi-line objects).
 */
function writeQueue(specs: Array<{ id: number; file: string; depends_on?: number[]; status: string }>): void {
  const lines = specs.map((s) => {
    const deps = JSON.stringify(s.depends_on ?? []);
    return `    { "id": ${s.id}, "file": ${JSON.stringify(s.file)}, "depends_on": ${deps}, "status": ${JSON.stringify(s.status)} }`;
  });
  const content = `{\n  "feature": "temp-test",\n  "specs": [\n${lines.join(',\n')}\n  ]\n}\n`;
  writeFileSync(join(dir, '.joycraft-spec-queue.json'), content);
}

function readQueueStatus(id: number): string | undefined {
  const parsed = JSON.parse(readFileSync(join(dir, '.joycraft-spec-queue.json'), 'utf-8')) as {
    specs: Array<{ id: number; status: string }>;
  };
  return parsed.specs.find((s) => s.id === id)?.status;
}

beforeEach(() => {
  dir = join(tmpdir(), `joycraft-scripts-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('joycraft-next-spec: serves todo, respects deps', () => {
  it('serves the first todo spec whose deps are met', () => {
    writeQueue([{ id: 1, file: 'a.md', status: 'todo' }]);
    const r = run(NEXT_SPEC, [dir]);
    expect(r.ok).toBe(true);
    expect(r.stdout.trim()).toBe(join(dir, 'a.md'));
  });

  it('prints "Pipeline complete" when all specs are in-review or done', () => {
    writeQueue([
      { id: 1, file: 'a.md', status: 'in-review' },
      { id: 2, file: 'b.md', status: 'done' },
    ]);
    const r = run(NEXT_SPEC, [dir]);
    expect(r.stdout).toContain('Pipeline complete');
  });

  it('never serves an in-review or done spec', () => {
    writeQueue([
      { id: 1, file: 'a.md', status: 'done' },
      { id: 2, file: 'b.md', status: 'in-review' },
    ]);
    const r = run(NEXT_SPEC, [dir]);
    expect(r.stdout).not.toContain('a.md');
    expect(r.stdout).not.toContain('b.md');
  });

  it('does NOT serve a todo spec whose dependency is still todo', () => {
    writeQueue([
      { id: 1, file: 'a.md', status: 'todo' },
      { id: 2, file: 'b.md', depends_on: [1], status: 'todo' },
    ]);
    const r = run(NEXT_SPEC, [dir]);
    // spec 1 is eligible and served first; spec 2 must not be the answer
    expect(r.stdout.trim()).toBe(join(dir, 'a.md'));
  });

  it('treats an in-review dependency as satisfied (checkpoint chains progress)', () => {
    writeQueue([
      { id: 1, file: 'a.md', status: 'in-review' },
      { id: 2, file: 'b.md', depends_on: [1], status: 'todo' },
    ]);
    const r = run(NEXT_SPEC, [dir]);
    expect(r.stdout.trim()).toBe(join(dir, 'b.md'));
  });
});

describe('joycraft-mark-done: --to transitions', () => {
  it('--to in-review flips status to in-review', () => {
    writeQueue([{ id: 1, file: 'a.md', status: 'todo' }]);
    const r = run(MARK_DONE, ['1', '--to', 'in-review', dir]);
    expect(r.ok).toBe(true);
    expect(readQueueStatus(1)).toBe('in-review');
  });

  it('--to done flips status to done', () => {
    writeQueue([{ id: 1, file: 'a.md', status: 'in-review' }]);
    const r = run(MARK_DONE, ['1', '--to', 'done', dir]);
    expect(r.ok).toBe(true);
    expect(readQueueStatus(1)).toBe('done');
  });

  it('defaults to in-review when --to is omitted', () => {
    writeQueue([{ id: 1, file: 'a.md', status: 'todo' }]);
    const r = run(MARK_DONE, ['1', dir]);
    expect(r.ok).toBe(true);
    expect(readQueueStatus(1)).toBe('in-review');
  });

  it('rejects an unknown --to value with a non-zero exit', () => {
    writeQueue([{ id: 1, file: 'a.md', status: 'todo' }]);
    const r = run(MARK_DONE, ['1', '--to', 'frobnicate', dir]);
    expect(r.ok).toBe(false);
    expect(readQueueStatus(1)).toBe('todo'); // unchanged
  });

  it('rejects a valid-but-miscased --to value (exact lowercase match)', () => {
    writeQueue([{ id: 1, file: 'a.md', status: 'todo' }]);
    const r = run(MARK_DONE, ['1', '--to', 'In-Review', dir]);
    expect(r.ok).toBe(false);
  });

  it('errors (non-zero) when the spec id is not in the manifest', () => {
    writeQueue([{ id: 1, file: 'a.md', status: 'todo' }]);
    const r = run(MARK_DONE, ['999', '--to', 'done', dir]);
    expect(r.ok).toBe(false);
  });
});

describe('joycraft-spec-status: three glyphs', () => {
  it('renders [ ] / [~] / [✓] for todo / in-review / done', () => {
    writeQueue([
      { id: 1, file: 'a.md', status: 'todo' },
      { id: 2, file: 'b.md', status: 'in-review' },
      { id: 3, file: 'c.md', status: 'done' },
    ]);
    const r = run(SPEC_STATUS, [dir]);
    expect(r.stdout).toContain('[ ]');
    expect(r.stdout).toContain('[~]');
    expect(r.stdout).toContain('[✓]');
  });
});

describe('script parity and executable bit', () => {
  for (const name of SCRIPTS) {
    it(`${name} is byte-identical between src/templates and .pi`, () => {
      const a = readFileSync(join(SRC_DIR, name), 'utf-8');
      const b = readFileSync(join(PI_DIR, name), 'utf-8');
      expect(a).toBe(b);
    });

    it(`${name} retains its executable bit in both locations`, () => {
      for (const base of [SRC_DIR, PI_DIR]) {
        const mode = statSync(join(base, name)).mode;
        // owner-execute bit set
        expect(mode & 0o100, `${join(base, name)} not executable`).toBeGreaterThan(0);
      }
    });
  }
});
