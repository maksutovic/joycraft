import { afterEach, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { applyMigration, planMigration, runMigration } from '../src/migration.js';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function project(): string {
  const root = mkdtempSync(join(tmpdir(), 'joycraft-migration-safety-'));
  roots.push(root);
  return root;
}
function write(root: string, path: string, content: string): void {
  mkdirSync(join(root, path, '..'), { recursive: true });
  writeFileSync(join(root, path), content);
}

it('keeps unowned colliding directories out of the selected migration plan', () => {
  const root = project();
  write(root, 'docs/specs/unknown-area/notes.md', 'source notes');
  write(root, 'docs/bugfixes/unknown-area/notes.md', 'destination notes');
  const result = runMigration(root, { replaceCollisions: ['docs/bugfixes/unknown-area'] });
  expect(result.applied).toBe(0);
  expect(result.plan.moves).toEqual([]);
  expect(result.plan.skipped).toEqual([]);
  expect(result.preserved).toContain(join(root, 'docs/specs/unknown-area'));
  expect(readFileSync(join(root, 'docs/specs/unknown-area/notes.md'), 'utf8')).toBe('source notes');
  expect(readFileSync(join(root, 'docs/bugfixes/unknown-area/notes.md'), 'utf8')).toBe('destination notes');
});

it('retains both documents and reports the backup if a replacement fails after moving its source', () => {
  const root = project();
  write(root, 'docs/briefs/accounts.md', 'source document');
  write(root, 'docs/features/accounts/brief.md', 'original destination');
  const result = applyMigration(planMigration(root), {
    replaceCollisions: ['docs/features/accounts/brief.md'],
    move: (from, to) => { renameSync(from, to); throw new Error('injected late failure'); },
  });
  expect(result.status).toBe('incomplete');
  expect(readFileSync(join(root, 'docs/features/accounts/brief.md'), 'utf8')).toBe('source document');
  const backup = readdirSync(join(root, 'docs/features/accounts')).find(name => name.startsWith('brief.md.joycraft-migration-'));
  expect(backup).toBeDefined();
  expect(readFileSync(join(root, 'docs/features/accounts', backup!), 'utf8')).toBe('original destination');
  expect(result.errors[0].error).toContain(backup);
});
