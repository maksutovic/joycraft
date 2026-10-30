import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { BACKUP_ROOT, MANIFEST_PATH, readManifest } from './install-v1.js';
import { MIGRATION_RECORD } from './legacy-07.js';
import { sha256 } from './payload.js';

interface Record07 { moves: { from: string; to: string }[]; settingsBackup: string | null; installBackup: string | null }

export interface RollbackPlan {
  root: string;
  backup: string;
  restore: string[];
  remove: string[];
  edited: string[];
  blocked: string[];
}

function inside(root: string, path: string): string {
  const full = resolve(root, path);
  if (full !== root && !full.startsWith(root + sep)) throw new Error(`Path escapes the project: ${path}`);
  return full;
}

function filesUnder(root: string, dir: string): string[] {
  const full = inside(root, dir);
  if (!existsSync(full)) return [];
  return readdirSync(full).flatMap((name) => {
    const path = join(dir, name);
    return statSync(inside(root, path)).isDirectory() ? filesUnder(root, path) : [path];
  });
}

/** Migration backups, newest last. */
export function listMigrations(dir: string): string[] {
  const root = resolve(dir);
  const base = join(root, BACKUP_ROOT);
  if (!existsSync(base)) return [];
  return readdirSync(base).filter((name) => name.startsWith('migrate-') && existsSync(join(base, name, MIGRATION_RECORD))).sort();
}

/** What a rollback would do. Reads only. */
export function planRollback(dir: string, stamp?: string, { force = false } = {}): RollbackPlan {
  const root = resolve(dir);
  const all = listMigrations(root);
  const name = stamp ? all.find((item) => item === stamp || item === `migrate-${stamp}`) : all.at(-1);
  if (!name) throw new Error(stamp ? `No migration backup ${stamp} in ${BACKUP_ROOT}/` : `No migration backup in ${BACKUP_ROOT}/`);
  const backup = join(BACKUP_ROOT, name);
  const record = JSON.parse(readFileSync(join(root, backup, MIGRATION_RECORD), 'utf8')) as Record07;
  const restore: string[] = []; const blocked: string[] = []; const remove: string[] = []; const edited: string[] = [];
  const manifest = readManifest(root);
  for (const file of manifest?.files ?? []) {
    const full = inside(root, file.path);
    if (!existsSync(full)) continue;
    if (sha256(readFileSync(full)) === file.sha256 || force) remove.push(file.path);
    else edited.push(file.path);
  }
  if (manifest) remove.push(MANIFEST_PATH);
  const removing = new Set(remove);
  for (const { from } of record.moves) {
    if (existsSync(inside(root, from)) && !removing.has(from)) blocked.push(from);
    else restore.push(from);
  }
  return { root, backup, restore, remove, edited, blocked };
}

export function formatRollback(plan: RollbackPlan): string {
  return [
    `Roll back to before ${plan.backup}:`,
    `  restore ${plan.restore.length} 0.7 file(s) · remove ${plan.remove.length} 1.0 file(s)`,
    ...plan.edited.map((path) => `  kept, edited after the migration (use --force to remove): ${path}`),
    ...plan.blocked.map((path) => `  not restored, a file is already there: ${path}`),
    `  The backup stays in ${plan.backup}.`,
  ].join('\n');
}

function prune(root: string, path: string): void {
  for (let dir = dirname(path); dir !== '.'; dir = dirname(dir)) {
    try { rmdirSync(inside(root, dir)); } catch { return; }
  }
}

/** Restore the migration backup and remove the 1.0 install. The backup is never deleted. */
export function applyRollback(plan: RollbackPlan): void {
  const { root } = plan;
  const record = JSON.parse(readFileSync(join(root, plan.backup, MIGRATION_RECORD), 'utf8')) as Record07;
  for (const path of plan.remove) { rmSync(inside(root, path), { force: true }); prune(root, path); }
  // Files the 1.0 install replaced (for example .gitignore) come back from its own backup.
  if (record.installBackup) {
    const files = join(record.installBackup, 'files');
    for (const path of filesUnder(root, files)) {
      const target = relative(files, path);
      mkdirSync(dirname(inside(root, target)), { recursive: true });
      writeFileSync(inside(root, target), readFileSync(inside(root, path)));
    }
  }
  if (record.settingsBackup) writeFileSync(join(root, '.claude/settings.json'), readFileSync(inside(root, record.settingsBackup)));
  const restoring = new Set(plan.restore);
  for (const { from, to } of record.moves) {
    if (!restoring.has(from) || !existsSync(inside(root, to))) continue;
    mkdirSync(dirname(inside(root, from)), { recursive: true });
    // Copy back rather than move, so the backup stays complete.
    writeFileSync(inside(root, from), readFileSync(inside(root, to)));
  }
  // The install's empty local-state folder goes too, when nothing else lives there.
  for (const dir of ['.joycraft/local', '.joycraft']) { try { rmdirSync(join(root, dir)); } catch { /* not empty */ } }
}
