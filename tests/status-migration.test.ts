import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, type Dirent } from 'node:fs';
import { join } from 'node:path';
import { parseFrontmatter } from '../src/frontmatter';

const ROOT = join(__dirname, '..');
const FEATURES_DIR = join(ROOT, 'docs', 'features');
const BUGFIXES_DIR = join(ROOT, 'docs', 'bugfixes');

/** The unified vocabulary from docs/reference/spec-status-lifecycle.md. */
const ALLOWED = new Set(['todo', 'in-review', 'done']);

/** Recursively collect files under `dir` matching `predicate`. Skips docs/archive. */
function walk(dir: string, predicate: (name: string, full: string) => boolean): string[] {
  const out: string[] = [];
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true }) as Dirent[];
  } catch {
    return out; // dir absent — fine
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'archive') continue; // out of scope per spec
      out.push(...walk(full, predicate));
    } else if (predicate(entry.name, full)) {
      out.push(full);
    }
  }
  return out;
}

/** Every spec markdown: docs/features/<slug>/specs/<name>.md */
function specMarkdownFiles(): string[] {
  return walk(
    FEATURES_DIR,
    (name, full) => name.endsWith('.md') && full.split(/[\\/]/).includes('specs'),
  );
}

/** Every bugfix markdown under docs/bugfixes. */
function bugfixMarkdownFiles(): string[] {
  return walk(BUGFIXES_DIR, (name) => name.endsWith('.md'));
}

/** Every spec queue manifest. */
function queueJsonFiles(): string[] {
  return walk(FEATURES_DIR, (name) => name === '.joycraft-spec-queue.json');
}

describe('status migration: spec frontmatter uses the unified vocabulary', () => {
  const files = [...specMarkdownFiles(), ...bugfixMarkdownFiles()];

  it('scans a non-empty set of markdown files (guard cannot pass vacuously)', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const rel = file.slice(ROOT.length + 1);
    it(`${rel} frontmatter status is todo|in-review|done (or absent)`, () => {
      const { frontmatter } = parseFrontmatter(readFileSync(file, 'utf-8'));
      const status = frontmatter?.status;
      // Files without a top-level status field are out of scope (spec edge case).
      if (status === undefined) return;
      expect(ALLOWED.has(status), `${rel} has disallowed status: ${status}`).toBe(true);
    });
  }
});

describe('status migration: queue JSON uses the unified vocabulary', () => {
  const files = queueJsonFiles();

  it('scans a non-empty set of queue manifests (guard cannot pass vacuously)', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const rel = file.slice(ROOT.length + 1);
    it(`${rel} every entry status is todo|in-review|done`, () => {
      const parsed = JSON.parse(readFileSync(file, 'utf-8')) as {
        specs?: Array<{ status?: string; id?: number | string }>;
      };
      const specs = parsed.specs ?? [];
      for (const entry of specs) {
        if (entry.status === undefined) continue;
        expect(
          ALLOWED.has(entry.status),
          `${rel} entry ${entry.id} has disallowed status: ${entry.status}`,
        ).toBe(true);
      }
    });
  }
});
