import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { planMigration, applyMigration } from '../src/migration';
import { upgrade } from '../src/upgrade';
import { init } from '../src/init';

function write(file: string, content: string): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

let dir: string;
beforeEach(() => {
  dir = join(tmpdir(), `joycraft-bugfixmig-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('orphan spec dirs become bugfix moves', () => {
  it('plans a Move from docs/specs/<area>/ to docs/bugfixes/<area>/', () => {
    write(join(dir, 'docs', 'specs', 'auth', 'fix-login.md'), '# spec');

    const plan = planMigration(dir);
    const move = plan.moves.find((m) => m.kind === 'bugfix-dir');
    expect(move).toBeDefined();
    expect(move?.from).toBe(join(dir, 'docs', 'specs', 'auth'));
    expect(move?.to).toBe(join(dir, 'docs', 'bugfixes', 'auth'));
  });

  it('still records the reclassified area for introspection', () => {
    write(join(dir, 'docs', 'specs', 'auth', 'fix-login.md'), '# spec');
    const plan = planMigration(dir);
    expect(plan.orphans.specsDirs).toContain('auth');
  });

  it('feature-matched spec dirs are unaffected (still specs-dir moves)', () => {
    write(join(dir, 'docs', 'briefs', '2026-03-23-stack-detection.md'), '# brief');
    write(join(dir, 'docs', 'specs', 'stack-detection', 'foo.md'), '# spec');

    const plan = planMigration(dir);
    expect(plan.moves.find((m) => m.kind === 'specs-dir')).toBeDefined();
    expect(plan.moves.find((m) => m.kind === 'bugfix-dir')).toBeUndefined();
  });
});

describe('bugfix move application + guards', () => {
  it('applies the move (no interactive gate)', () => {
    write(join(dir, 'docs', 'specs', 'auth', 'fix-login.md'), '# spec');
    const plan = planMigration(dir);
    const result = applyMigration(plan);
    expect(result.applied).toBeGreaterThanOrEqual(1);
    expect(existsSync(join(dir, 'docs', 'bugfixes', 'auth', 'fix-login.md'))).toBe(true);
    expect(existsSync(join(dir, 'docs', 'specs', 'auth'))).toBe(false);
  });

  it('skips when docs/bugfixes/<area>/ already exists (no clobber)', () => {
    write(join(dir, 'docs', 'specs', 'auth', 'fix-login.md'), '# spec');
    write(join(dir, 'docs', 'bugfixes', 'auth', 'existing.md'), '# existing');

    const plan = planMigration(dir);
    const result = applyMigration(plan);
    // The auth move must have been planned-as-skipped or skipped at apply time.
    expect(existsSync(join(dir, 'docs', 'specs', 'auth', 'fix-login.md'))).toBe(true);
    expect(existsSync(join(dir, 'docs', 'bugfixes', 'auth', 'existing.md'))).toBe(true);
    expect(result.skipped).toBeGreaterThanOrEqual(1);
  });
});

describe('upgrade preview text for bugfix migration', () => {
  it('previews under "Migrating bugfix areas" and no longer says "Left in place"', async () => {
    await init(dir, { force: false });
    write(join(dir, 'docs', 'specs', 'auth', 'fix-login.md'), '# spec');

    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));
    try {
      await upgrade(dir, { yes: true });
    } finally {
      console.log = origLog;
    }
    const joined = logs.join('\n');
    expect(joined).toMatch(/Migrating bugfix areas/i);
    expect(joined).not.toContain('Left in place — area-level specs');
    // The move actually happened (no interactive gate).
    expect(existsSync(join(dir, 'docs', 'bugfixes', 'auth', 'fix-login.md'))).toBe(true);
  });
});
