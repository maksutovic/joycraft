import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, existsSync, rmSync, readFileSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { planMigration, applyMigration, runMigration, formatMigrationPlan } from '../src/migration';

function createTmpDir(): string {
  const dir = join(tmpdir(), `joycraft-migration-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function write(p: string, content: string): void {
  mkdirSync(join(p, '..'), { recursive: true });
  writeFileSync(p, content, 'utf-8');
}

describe('planMigration', () => {
  let dir: string;

  beforeEach(() => {
    dir = createTmpDir();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('discovers briefs', () => {
    write(join(dir, 'docs', 'briefs', 'foo.md'), '# foo');
    write(join(dir, 'docs', 'briefs', 'bar.md'), '# bar');

    const plan = planMigration(dir);
    const briefMoves = plan.moves.filter(m => m.kind === 'brief');
    expect(briefMoves).toHaveLength(2);
    expect(briefMoves.map(m => m.to).sort()).toEqual([
      join(dir, 'docs', 'features', 'bar', 'brief.md'),
      join(dir, 'docs', 'features', 'foo', 'brief.md'),
    ]);
  });

  it('matches research to briefs by exact slug', () => {
    write(join(dir, 'docs', 'briefs', '2026-03-23-x.md'), '# brief');
    write(join(dir, 'docs', 'research', '2026-03-23-x.md'), '# research');

    const plan = planMigration(dir);
    const briefMove = plan.moves.find(m => m.kind === 'brief');
    const researchMove = plan.moves.find(m => m.kind === 'research');
    expect(briefMove?.to).toContain(join('docs', 'features', '2026-03-23-x', 'brief.md'));
    expect(researchMove?.to).toContain(join('docs', 'features', '2026-03-23-x', 'research.md'));
  });

  it('matches docs/specs/<feature>/ to brief slug via date-stripped match', () => {
    write(join(dir, 'docs', 'briefs', '2026-03-23-stack-detection.md'), '# brief');
    write(join(dir, 'docs', 'specs', 'stack-detection', 'foo.md'), '# spec');

    const plan = planMigration(dir);
    const specsMove = plan.moves.find(m => m.kind === 'specs-dir');
    expect(specsMove?.to).toBe(join(dir, 'docs', 'features', '2026-03-23-stack-detection', 'specs'));
  });

  it('reports orphan spec dirs not moved', () => {
    write(join(dir, 'docs', 'specs', 'random-bugfix-area', 'foo.md'), '# spec');

    const plan = planMigration(dir);
    expect(plan.orphans.specsDirs).toContain('random-bugfix-area');
    expect(plan.moves.find(m => m.kind === 'specs-dir')).toBeUndefined();
  });

  it('does not move top-level loose .md files in docs/specs/', () => {
    write(join(dir, 'docs', 'specs', 'loose-spec.md'), '# loose');

    const plan = planMigration(dir);
    expect(plan.moves).toHaveLength(0);
    expect(plan.orphans.specsDirs).toHaveLength(0);
  });

  it('handles empty/missing dirs gracefully', () => {
    const plan = planMigration(dir);
    expect(plan.moves).toHaveLength(0);
    expect(plan.orphans.specsDirs).toHaveLength(0);
  });

  it('creates a feature folder for research without a matching brief', () => {
    write(join(dir, 'docs', 'research', '2026-04-01-orphan.md'), '# r');

    const plan = planMigration(dir);
    const researchMove = plan.moves.find(m => m.kind === 'research');
    expect(researchMove?.to).toContain(join('docs', 'features', '2026-04-01-orphan', 'research.md'));
  });

  it('skips files when destination already exists', () => {
    write(join(dir, 'docs', 'briefs', 'foo.md'), '# brief');
    write(join(dir, 'docs', 'features', 'foo', 'brief.md'), '# already there');

    const plan = planMigration(dir);
    expect(plan.skipped).toBeDefined();
    const skipped = plan.skipped!;
    expect(skipped.some(s => s.to.includes(join('features', 'foo', 'brief.md')))).toBe(true);
  });
});

describe('applyMigration', () => {
  let dir: string;

  beforeEach(() => {
    dir = createTmpDir();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('actually moves files', () => {
    write(join(dir, 'docs', 'briefs', 'foo.md'), '# foo content');
    write(join(dir, 'docs', 'research', 'foo.md'), '# foo research');

    const plan = planMigration(dir);
    const result = applyMigration(plan);

    expect(result.applied).toBeGreaterThan(0);
    expect(existsSync(join(dir, 'docs', 'briefs', 'foo.md'))).toBe(false);
    expect(existsSync(join(dir, 'docs', 'features', 'foo', 'brief.md'))).toBe(true);
    expect(existsSync(join(dir, 'docs', 'features', 'foo', 'research.md'))).toBe(true);
    expect(readFileSync(join(dir, 'docs', 'features', 'foo', 'brief.md'), 'utf-8')).toBe('# foo content');
  });

  it('idempotent re-apply records skipped collisions', () => {
    write(join(dir, 'docs', 'briefs', 'foo.md'), '# foo');

    const plan1 = planMigration(dir);
    const result1 = applyMigration(plan1);
    expect(result1.applied).toBe(1);

    // Re-create a brief with the same slug at the source — apply again
    write(join(dir, 'docs', 'briefs', 'foo.md'), '# foo redux');
    const plan2 = planMigration(dir);
    const result2 = applyMigration(plan2);
    // Should be skipped (target already exists from first run)
    expect(result2.skipped).toBeGreaterThanOrEqual(1);
  });

  it('moves spec directories recursively', () => {
    write(join(dir, 'docs', 'briefs', '2026-03-23-foo.md'), '# brief');
    write(join(dir, 'docs', 'specs', 'foo', 'a.md'), '# a');
    write(join(dir, 'docs', 'specs', 'foo', 'sub', 'b.md'), '# b');

    const plan = planMigration(dir);
    const result = applyMigration(plan);
    expect(result.applied).toBeGreaterThan(0);
    expect(existsSync(join(dir, 'docs', 'features', '2026-03-23-foo', 'specs', 'a.md'))).toBe(true);
    expect(existsSync(join(dir, 'docs', 'features', '2026-03-23-foo', 'specs', 'sub', 'b.md'))).toBe(true);
  });

  it('preserves a collision unless the destination is explicitly selected for replacement', () => {
    write(join(dir, 'docs', 'briefs', 'foo.md'), '# source');
    write(join(dir, 'docs', 'features', 'foo', 'brief.md'), '# user document');

    const plan = planMigration(dir);
    const skipped = plan.skipped?.find((move) => move.kind === 'brief');
    expect(skipped).toBeDefined();

    const preserved = applyMigration(plan);
    expect(preserved.status).toBe('complete');
    expect(preserved.preserved).toContain(skipped!.to);
    expect(readFileSync(skipped!.to, 'utf8')).toBe('# user document');

    const replaced = applyMigration(plan, { replaceCollisions: [skipped!.to] });
    expect(replaced.status).toBe('complete');
    expect(replaced.replaced).toContain(skipped!.to);
    expect(readFileSync(skipped!.to, 'utf8')).toBe('# source');
    expect(existsSync(join(dir, 'docs', 'briefs', 'foo.md'))).toBe(false);
  });

  it('reports incomplete work when one selected move fails', () => {
    write(join(dir, 'docs', 'briefs', 'foo.md'), '# foo');
    const plan = planMigration(dir);
    const missing = { from: join(dir, 'docs', 'briefs', 'missing.md'), to: join(dir, 'docs', 'features', 'missing', 'brief.md'), kind: 'brief' as const };
    const result = applyMigration({ ...plan, moves: [...plan.moves, missing] });
    expect(result.status).toBe('incomplete');
    expect(result.applied).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].move).toEqual(missing);
  });

  it('rejects a migration path that traverses a symlink', () => {
    write(join(dir, 'docs', 'briefs', 'foo.md'), '# foo');
    mkdirSync(join(dir, 'outside'), { recursive: true });
    try {
      // Symlink support is available on the Unix CI hosts. If it is not
      // available, the path-safety behavior is covered by update-path tests.
      const link = join(dir, 'docs', 'features');
      symlinkSync(join(dir, 'outside'), link, 'dir');
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'EPERM' || code === 'EACCES' || code === 'ENOTSUP') return;
      throw error;
    }
    const plan = planMigration(dir);
    const result = applyMigration(plan);
    expect(result.status).toBe('incomplete');
    expect(result.errors.some((entry) => /symlink/i.test(entry.error))).toBe(true);
  });
});

describe('runMigration explicit operation', () => {
  let dir: string;

  beforeEach(() => {
    dir = createTmpDir();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns a reviewable plan and applies only established document moves by default', () => {
    write(join(dir, 'docs', 'briefs', '2026-01-01-accounts.md'), '# accounts');
    write(join(dir, 'docs', 'specs', 'unknown-area', 'notes.md'), '# leave me');

    const result = runMigration(dir);
    expect(result.plan.moves.some((move) => move.kind === 'brief')).toBe(true);
    expect(result.plan.moves.some((move) => move.kind === 'bugfix-dir')).toBe(false);
    expect(result.preserved.some((path) => path.endsWith('docs/specs/unknown-area'))).toBe(true);
    expect(existsSync(join(dir, 'docs', 'features', '2026-01-01-accounts', 'brief.md'))).toBe(true);
    expect(existsSync(join(dir, 'docs', 'specs', 'unknown-area', 'notes.md'))).toBe(true);
    expect(formatMigrationPlan(result.plan)).toMatch(/accounts/);
  });
});
