// Explicit migration of the pre-feature docs layout. Routine bundle updates
// deliberately do not call this module: moving project documents is a
// separate, reviewable operation.

import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { resolveUpdatePath } from './update-paths.js';

export type MoveKind = 'brief' | 'research' | 'design' | 'specs-dir' | 'bugfix-dir';

export interface Move {
  from: string;
  to: string;
  kind: MoveKind;
}

export interface MigrationPlan {
  /** Canonical project root, present on plans produced by planMigration. */
  projectDir?: string;
  moves: Move[];
  slugs: string[];
  orphans: { specsDirs: string[] };
  /** Existing destinations. They are retained for compatibility and are not overwritten by default. */
  skipped?: Move[];
  /** Candidates deliberately retained because ownership was not established. */
  preserved?: Move[];
}

export interface MigrationApplyOptions {
  /** Destination (or source) paths selected for explicit replacement. */
  replaceCollisions?: readonly string[];
  /** Test and integration seam for a deterministic filesystem failure. */
  move?: (from: string, to: string) => void;
}

export interface MigrationResult {
  status: 'complete' | 'incomplete';
  applied: number;
  skipped: number;
  replaced: string[];
  preserved: string[];
  errors: Array<{ move: Move; error: string }>;
}

export interface MigrationOptions extends MigrationApplyOptions {
  /** Explicitly establish ownership for orphan/area directories. */
  includeUnknown?: boolean | readonly string[];
  /** Do not mutate; return the selected plan and a complete no-op result. */
  dryRun?: boolean;
}

export interface MigrationOutcome extends MigrationResult {
  plan: MigrationPlan;
}

const DATE_PREFIX_RE = /^\d{4}-\d{2}-\d{2}-(.+)$/;

function deriveSlug(filename: string): string { return filename.replace(/\.md$/, ''); }
function slugWithoutDate(slug: string): string | null {
  const m = slug.match(DATE_PREFIX_RE);
  return m ? m[1] : null;
}

function listMdFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  try { return readdirSync(dir).filter((f) => f.endsWith('.md')); } catch { return []; }
}

function listSubdirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir).filter((name) => {
      try { return lstatSync(join(dir, name)).isDirectory(); } catch { return false; }
    });
  } catch { return []; }
}

function destinationMove(from: string, to: string, kind: MoveKind): Move { return { from, to, kind }; }

export function planMigration(projectDir: string): MigrationPlan {
  const root = resolve(projectDir);
  const briefsDir = join(root, 'docs', 'briefs');
  const researchDir = join(root, 'docs', 'research');
  const designsDir = join(root, 'docs', 'designs');
  const specsDir = join(root, 'docs', 'specs');
  const moves: Move[] = [];
  const skipped: Move[] = [];
  const slugSet = new Set<string>();
  const addFileMoves = (dir: string, kind: 'brief' | 'research' | 'design', targetName: string): void => {
    for (const file of listMdFiles(dir)) {
      const slug = deriveSlug(file);
      slugSet.add(slug);
      const move = destinationMove(join(dir, file), join(root, 'docs', 'features', slug, targetName), kind);
      (existsSync(move.to) ? skipped : moves).push(move);
    }
  };
  addFileMoves(briefsDir, 'brief', 'brief.md');
  addFileMoves(researchDir, 'research', 'research.md');
  addFileMoves(designsDir, 'design', 'design.md');

  // Matching a discovered brief establishes feature ownership. Orphans stay
  // visible in the low-level plan for compatibility; runMigration requires an
  // explicit includeUnknown selection before moving them.
  const briefSlugs = Array.from(slugSet);
  const orphanSpecsDirs: string[] = [];
  for (const subdir of listSubdirs(specsDir)) {
    const matchedSlug = briefSlugs.includes(subdir)
      ? subdir
      : (briefSlugs.find((slug) => slugWithoutDate(slug) === subdir) ?? null);
    const kind: MoveKind = matchedSlug ? 'specs-dir' : 'bugfix-dir';
    const target = matchedSlug
      ? join(root, 'docs', 'features', matchedSlug, 'specs')
      : join(root, 'docs', 'bugfixes', subdir);
    const move = destinationMove(join(specsDir, subdir), target, kind);
    if (!matchedSlug) orphanSpecsDirs.push(subdir);
    (existsSync(move.to) ? skipped : moves).push(move);
  }
  const plan: MigrationPlan = { projectDir: root, moves, slugs: Array.from(slugSet), orphans: { specsDirs: orphanSpecsDirs } };
  if (skipped.length > 0) plan.skipped = skipped;
  return plan;
}

function relativePath(root: string, path: string): string {
  return relative(root, path).split('\\').join('/') || '.';
}

function pathSelection(root: string, selection: string): string {
  return isAbsolute(selection) ? resolve(selection) : resolve(root, selection);
}

function selectedCollision(root: string, move: Move, selections: readonly string[]): boolean {
  return selections.some((selection) => {
    const selected = pathSelection(root, selection);
    return selected === resolve(move.to) || selected === resolve(move.from)
      || selection === relativePath(root, move.to) || selection === relativePath(root, move.from);
  });
}

function isInside(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

function inspectPath(root: string, path: string, allowMissing: boolean): void {
  const rootAbsolute = resolve(root);
  const candidate = resolve(path);
  if (!isInside(rootAbsolute, candidate)) throw new Error(`Migration path escapes the project root: '${path}'.`);
  const rel = relativePath(rootAbsolute, candidate);
  if (rel === '.') return;
  resolveUpdatePath(rootAbsolute, rel);
  if (!allowMissing && !existsSync(candidate)) throw new Error(`Migration source is missing: '${path}'.`);
}

function unsafeTreeReason(path: string): string | undefined {
  let stat;
  try { stat = lstatSync(path); } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code === 'ENOENT' ? undefined : `Unable to inspect migration path '${path}': ${String(error)}`;
  }
  if (stat.isSymbolicLink()) return `Migration path traverses a symlink: '${path}'.`;
  if (!stat.isDirectory()) return undefined;
  let names: string[];
  try { names = readdirSync(path); } catch (error) {
    return `Unable to inspect migration directory '${path}': ${String(error)}`;
  }
  for (const name of names) {
    const reason = unsafeTreeReason(join(path, name));
    if (reason) return reason;
  }
  return undefined;
}

function moveFsItem(from: string, to: string): void {
  mkdirSync(dirname(to), { recursive: true });
  try {
    renameSync(from, to);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EXDEV') throw err;
    // Remove the source only after the copy has completed.
    cpSync(from, to, { recursive: true, force: false, errorOnExist: true });
    rmSync(from, { recursive: true, force: false });
  }
}

function replaceMove(from: string, to: string, move: (from: string, to: string) => void): void {
  const displaced = `${to}.joycraft-migration-${randomUUID()}`;
  let movedAside = false;
  if (existsSync(to)) {
    renameSync(to, displaced);
    movedAside = true;
  }
  try {
    move(from, to);
  } catch (error) {
    if (movedAside && existsSync(displaced)) {
      if (existsSync(to)) {
        throw new Error(`${String(error)}; original destination retained at '${displaced}', interrupted move content retained at '${to}'.`);
      }
      try {
        renameSync(displaced, to);
      } catch (restoreError) {
        throw new Error(`${error instanceof Error ? error.message : String(error)}; original destination retained at '${displaced}' (${String(restoreError)}).`);
      }
    }
    throw error;
  }
  if (movedAside) {
    try { rmSync(displaced, { recursive: true, force: false }); }
    catch (error) { throw new Error(`Move applied; previous destination backup remains at '${displaced}': ${String(error)}`); }
  }
}

function emptyResult(): MigrationResult {
  return { status: 'complete', applied: 0, skipped: 0, replaced: [], preserved: [], errors: [] };
}

export function applyMigration(plan: MigrationPlan, options: MigrationApplyOptions = {}): MigrationResult {
  const root = resolve(plan.projectDir ?? inferProjectDir(plan));
  const result = emptyResult();
  const replacements = options.replaceCollisions ?? [];
  const mover = options.move ?? moveFsItem;
  const allMoves = [...plan.moves, ...(plan.skipped ?? [])];
  for (const move of plan.preserved ?? []) {
    result.skipped++;
    result.preserved.push(move.from);
  }
  const seen = new Set<string>();
  for (const move of allMoves) {
    const key = `${move.from}\0${move.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      inspectPath(root, move.from, false);
      inspectPath(root, move.to, true);
      const unsafeSource = unsafeTreeReason(move.from);
      const unsafeDestination = existsSync(move.to) ? unsafeTreeReason(move.to) : undefined;
      if (unsafeSource || unsafeDestination) throw new Error(unsafeSource ?? unsafeDestination);
      const collides = existsSync(move.to);
      if (collides && !selectedCollision(root, move, replacements)) {
        result.skipped++;
        result.preserved.push(move.to);
        continue;
      }
      if (collides) {
        replaceMove(move.from, move.to, mover);
        result.replaced.push(move.to);
      } else {
        mover(move.from, move.to);
      }
      result.applied++;
    } catch (error) {
      result.errors.push({ move, error: error instanceof Error ? error.message : String(error) });
    }
  }
  result.status = result.errors.length > 0 ? 'incomplete' : 'complete';
  return result;
}

function inferProjectDir(plan: MigrationPlan): string {
  const first = plan.moves[0] ?? plan.skipped?.[0];
  if (!first) return process.cwd();
  const marker = join('docs', '');
  const index = first.from.lastIndexOf(marker);
  return index >= 0 ? first.from.slice(0, index) : dirname(first.from);
}

function selectedPlan(root: string, raw: MigrationPlan, includeUnknown: MigrationOptions['includeUnknown']): MigrationPlan {
  const selections: readonly string[] = Array.isArray(includeUnknown) ? includeUnknown : [];
  const unknownCandidates = [...raw.moves, ...(raw.skipped ?? [])].filter((move) => move.kind === 'bugfix-dir');
  const acceptedUnknown = unknownCandidates.filter((move) =>
    includeUnknown === true || selectedCollision(root, move, selections));
  const unknown = unknownCandidates.filter((move) => !acceptedUnknown.includes(move));
  const moves = [...raw.moves.filter((move) => move.kind !== 'bugfix-dir'), ...acceptedUnknown];
  const skipped = [...(raw.skipped ?? []).filter((move) => move.kind !== 'bugfix-dir')];
  return { ...raw, moves, skipped, preserved: [...(raw.preserved ?? []), ...unknown] };
}

/** Execute the deliberate project migration operation. */
export function runMigration(projectDir: string, options: MigrationOptions = {}): MigrationOutcome {
  const root = resolve(projectDir);
  const plan = selectedPlan(root, planMigration(root), options.includeUnknown);
  if (options.dryRun) return { ...emptyResult(), skipped: (plan.skipped?.length ?? 0) + (plan.preserved?.length ?? 0), preserved: [...(plan.skipped ?? []).map((move) => move.to), ...(plan.preserved ?? []).map((move) => move.from)], plan };
  return { ...applyMigration(plan, options), plan };
}

export function formatMigrationPlan(plan: MigrationPlan): string {
  const root = plan.projectDir ?? inferProjectDir(plan);
  const lines = ['Joycraft migration plan:'];
  if (plan.moves.length === 0 && !plan.skipped?.length && !plan.preserved?.length) lines.push('  No migration candidates found.');
  for (const move of plan.moves) lines.push(`  ${relativePath(root, move.from)} → ${relativePath(root, move.to)}`);
  for (const move of plan.skipped ?? []) lines.push(`  Preserve collision: ${relativePath(root, move.to)} (source: ${relativePath(root, move.from)})`);
  for (const move of plan.preserved ?? []) lines.push(`  Preserve unowned document: ${relativePath(root, move.from)} (candidate: ${relativePath(root, move.to)})`);
  return lines.join('\n');
}

export function formatMigrationOutcome(result: MigrationOutcome, json = false, includePlan = true): string {
  if (json) return JSON.stringify({ status: result.status, exitCode: result.status === 'complete' ? 0 : 1, applied: result.applied, skipped: result.skipped, replaced: result.replaced, preserved: result.preserved, errors: result.errors, plan: result.plan });
  const lines = [ ...(includePlan ? [formatMigrationPlan(result.plan)] : []), `Migration ${result.status}.`];
  if (result.applied) lines.push(`  Applied: ${result.applied}`);
  if (result.skipped) lines.push(`  Preserved collisions: ${result.skipped}`);
  for (const entry of result.errors) lines.push(`  ⚠ ${entry.error}`);
  return lines.join('\n');
}
