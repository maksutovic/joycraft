import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import installInventory from './data/install-inventory.json';
import { applyInstall, BACKUP_ROOT, formatPlan, planInstall, recoverInstall, type ApplyResult, type Plan } from './install-v1.js';
import { sha256, type Host } from './payload.js';

export const MIGRATE_JOURNAL = '.joycraft/local/migrate-journal.json';
export const MIGRATION_RECORD = 'migration.json';
export const GUIDE_URL = 'https://github.com/maksutovic/joycraft/blob/main/docs/guides/migrate-from-0-7.md';
export const STAY_COMMAND = 'npx joycraft@0.7.17 update';

// Folders a 0.7 install wrote Joycraft-owned files into.
const ownedRoots = [/^\.(claude|agents|pi|github|omp|codex)\/skills\/joycraft-[^/]+\//, /^\.(pi|omp)\/(extensions|scripts)\/joycraft[^/]*/,
  /^\.claude\/hooks\/joycraft-version-check\.mjs$/, /^docs\/templates\//, /^docs\/\.joycraft\/(check\.mjs|manifest\.json|state\.json|telemetry\.json)$/,
  /^\.claude\/\.joycraft\/state\.json$/];
// Bookkeeping of the old installer itself: archived, never asked about.
const bookkeeping = /^(docs\/\.joycraft\/(check\.mjs|manifest\.json|state\.json|telemetry\.json)|\.claude\/\.joycraft\/state\.json)$/;
// Project knowledge and the user's safeguard stay exactly where they are.
export const KEPT = ['AGENTS.md', 'CLAUDE.md', 'docs/context/', 'docs/features/', 'docs/.joycraft/local/', '.claude/hooks/joycraft/block-dangerous.sh',
  '.claude/hooks/joycraft/deny-patterns.txt', '.claude/settings.json'];
const LEGACY_ONLY_SKILLS = ['add-context', 'add-fact', 'bugfix', 'collaborative-setup', 'decide', 'design', 'gather-context', 'harden', 'implement-feature',
  'implement-level5', 'interview', 'lockdown', 'new-feature', 'optimize', 'research', 'setup', 'spec-done', 'tune'];

// Every file each published 0.7.x release writes, by path (scripts/build-install-inventory.mjs).
const knownHashes = (): { files: Record<string, string[]> } => installInventory;

function inside(root: string, path: string): string {
  const full = resolve(root, path);
  if (full !== root && !full.startsWith(root + sep)) throw new Error(`Path escapes the project: ${path}`);
  return full;
}

function walk(root: string, dir = ''): string[] {
  let names: string[];
  try { names = readdirSync(join(root, dir)); } catch { return []; }
  return names.sort().flatMap((name) => {
    const rel = dir ? `${dir}/${name}` : name;
    if (rel === '.git' || rel === 'node_modules' || rel === BACKUP_ROOT) return [];
    const stat = lstatSync(join(root, rel));
    if (stat.isSymbolicLink()) return [];
    return stat.isDirectory() ? walk(root, rel) : [rel];
  });
}

const readJson = (root: string, path: string): any => {
  try { return JSON.parse(readFileSync(join(root, path), 'utf8')); } catch { return null; }
};

export interface Legacy {
  version: string | null;
  hosts: Host[];
  signals: string[];
}

/** A 0.7 install: its state or manifest, its version-check hook, or a 0.7-only skill. */
export function detectLegacy(dir: string): Legacy | null {
  const root = resolve(dir);
  const signals: string[] = [];
  const manifest = readJson(root, 'docs/.joycraft/manifest.json');
  const state = readJson(root, 'docs/.joycraft/state.json') ?? readJson(root, '.claude/.joycraft/state.json');
  if (manifest) signals.push('docs/.joycraft/manifest.json');
  if (state) signals.push('0.7 state.json');
  if (existsSync(join(root, '.claude/hooks/joycraft-version-check.mjs'))) signals.push('.claude/hooks/joycraft-version-check.mjs');
  for (const tree of ['.claude', '.agents', '.pi', '.github', '.omp']) {
    for (const name of LEGACY_ONLY_SKILLS) if (existsSync(join(root, tree, 'skills', `joycraft-${name}`))) { signals.push(`${tree}/skills (0.7 skills)`); break; }
  }
  if (!signals.length) return null;
  const hosts = ((manifest?.harnesses ?? state?.harnesses ?? ['claude']) as string[])
    .map((name) => (name === 'github-copilot' ? 'copilot' : name))
    .filter((name): name is Host => ['claude', 'codex', 'pi', 'omp', 'copilot', 'opencode'].includes(name));
  return { version: manifest?.targetVersion ?? state?.version ?? null, hosts: hosts.length ? hosts : ['claude'], signals: [...new Set(signals)] };
}

export interface LegacyPlan {
  legacy: Legacy;
  archive: string[];
  customized: string[];
  kept: string[];
  install: Plan;
  settings: { versionHookRemoved: number; safeguardResolved: number } | null;
}

function isKnown(path: string, bytes: Buffer, manifest: any, state: any): boolean {
  if (bookkeeping.test(path)) return true;
  const hash = sha256(bytes);
  if (knownHashes().files[path]?.includes(hash)) return true;
  if (manifest?.files?.[path]?.vendorHash === hash) return true;
  const recorded = state?.files?.[path];
  return typeof recorded === 'string' && recorded.length >= 12 && hash.startsWith(recorded);
}

function migratedSettings(text: string): { text: string; versionHookRemoved: number; safeguardResolved: number } {
  const settings = JSON.parse(text);
  let versionHookRemoved = 0; let safeguardResolved = 0;
  for (const [event, groups] of Object.entries<any>(settings.hooks ?? {})) {
    if (!Array.isArray(groups)) continue;
    settings.hooks[event] = groups.map((group) => ({
      ...group,
      hooks: (group.hooks ?? []).filter((hook: any) => {
        const drop = typeof hook?.command === 'string' && hook.command.includes('joycraft-version-check.mjs');
        if (drop) versionHookRemoved += 1;
        return !drop;
      }).map((hook: any) => {
        // A relative safeguard path exits 127 from a subdirectory or worktree.
        const match = typeof hook?.command === 'string' && /^(?:\.\/)?(\.claude\/hooks\/joycraft\/[\w.-]+)$/.exec(hook.command.trim());
        if (!match) return hook;
        safeguardResolved += 1;
        return { ...hook, command: `"$CLAUDE_PROJECT_DIR"/${match[1]}` };
      }),
    })).filter((group) => group.hooks.length);
    if (!settings.hooks[event].length) delete settings.hooks[event];
  }
  return { text: `${JSON.stringify(settings, null, 2)}\n`, versionHookRemoved, safeguardResolved };
}

/** What a migration would do. Reads only. */
export function planLegacy(dir: string, hosts?: readonly Host[]): LegacyPlan {
  const root = resolve(dir);
  const legacy = detectLegacy(root);
  if (!legacy) throw new Error('No Joycraft 0.7 install found');
  const manifest = readJson(root, 'docs/.joycraft/manifest.json');
  const state = readJson(root, 'docs/.joycraft/state.json') ?? readJson(root, '.claude/.joycraft/state.json');
  const archive: string[] = []; const customized: string[] = [];
  for (const path of walk(root)) {
    if (!ownedRoots.some((pattern) => pattern.test(path))) continue;
    (isKnown(path, readFileSync(join(root, path)), manifest, state) ? archive : customized).push(path);
  }
  const kept = walk(root).filter((path) => KEPT.some((entry) => (entry.endsWith('/') ? path.startsWith(entry) : path === entry)));
  const settingsText = existsSync(join(root, '.claude/settings.json')) ? readFileSync(join(root, '.claude/settings.json'), 'utf8') : null;
  let settings: LegacyPlan['settings'] = null;
  if (settingsText) {
    try { const next = migratedSettings(settingsText); if (next.versionHookRemoved || next.safeguardResolved) settings = { versionHookRemoved: next.versionHookRemoved, safeguardResolved: next.safeguardResolved }; }
    catch { throw new Error('.claude/settings.json is not valid JSON; fix it before migrating'); }
  }
  // Plan the 1.0 install as if the 0.7 files were already archived.
  const install = planInstall(root, hosts?.length ? hosts : legacy.hosts);
  const moving = new Set(archive.concat(customized));
  install.actions = install.actions.map((action) => (action.kind === 'conflict' && moving.has(action.path) ? { kind: 'add', path: action.path } : action));
  return { legacy, archive, customized, kept, install, settings };
}

export function formatLegacyPlan(plan: LegacyPlan, nextStep = true): string {
  const lines = [
    `Joycraft ${plan.legacy.version ?? '0.7'} found (${plan.legacy.signals.join(', ')}). Nothing has changed.`,
    '',
    `Archive to ${BACKUP_ROOT}/ (untouched 0.7 files): ${plan.archive.length}`,
    `Customized 0.7 files (you choose keep or archive; never lost): ${plan.customized.length}`,
    ...plan.customized.map((path) => `  ${path}`),
    `Kept as they are: ${plan.kept.length} (AGENTS.md, CLAUDE.md, docs/context/, docs/features/, your safeguard and settings)`,
    ...(plan.settings ? [`.claude/settings.json: remove ${plan.settings.versionHookRemoved} 0.7 version-check hook(s); resolve ${plan.settings.safeguardResolved} safeguard path(s) from the project root`] : []),
    `Install 1.0: ${formatPlan(plan.install).split('\n').slice(1).join(' ').trim()}`,
  ];
  if (nextStep) {
    lines.push('', 'Choose one:',
      '  Migrate:   npx joycraft@latest update --migrate   (add --keep-custom or --archive-custom to skip the questions)',
      `  Stay:      ${STAY_COMMAND}`,
      `  Read:      ${GUIDE_URL}`);
  }
  return lines.join('\n');
}

function move(root: string, from: string, to: string): void {
  mkdirSync(dirname(inside(root, to)), { recursive: true });
  renameSync(inside(root, from), inside(root, to));
}

function pruneEmpty(root: string, path: string, stop = new Set(['.claude', '.agents', '.pi', '.github', '.omp', '.codex', 'docs', '.joycraft'])): void {
  for (let dir = dirname(path); dir !== '.' && !stop.has(dir); dir = dirname(dir)) {
    try { rmdirSync(inside(root, dir)); } catch { return; }
  }
}

export interface MigrationResult { backup: string; archived: string[]; keptCustom: string[]; install: ApplyResult }

/**
 * Migrate in one recoverable step. A journal lists every move before it happens;
 * `recoverLegacy` puts an interrupted migration back. Files are moved, never
 * deleted; the 1.0 manifest is written last.
 */
export function migrateLegacy(plan: LegacyPlan, { keep = [] as string[], stamp = new Date().toISOString().replace(/[:.]/g, '-') } = {}): MigrationResult {
  const root = plan.install.root;
  if (existsSync(join(root, MIGRATE_JOURNAL))) throw new Error('An interrupted migration is pending; run `joycraft update --recover` first');
  const install = new Set(plan.install.actions.map((action) => action.path));
  // A customized file at a path 1.0 installs is archived: keeping it would block the 1.0 skill.
  const keptCustom = plan.customized.filter((path) => keep.includes(path) && !install.has(path));
  const moves = [...plan.archive, ...plan.customized.filter((path) => !keptCustom.includes(path))]
    .map((path) => ({ from: path, to: join(BACKUP_ROOT, `migrate-${stamp}`, 'archive', path) }));
  const backup = join(BACKUP_ROOT, `migrate-${stamp}`);
  const settingsBackup = plan.settings ? join(backup, 'files', '.claude/settings.json') : null;
  mkdirSync(inside(root, backup), { recursive: true });
  writeFileSync(join(root, backup, '.gitignore'), '*\n');
  mkdirSync(dirname(join(root, MIGRATE_JOURNAL)), { recursive: true });
  writeFileSync(join(root, MIGRATE_JOURNAL), `${JSON.stringify({ schemaVersion: 1, backup, moves, settingsBackup }, null, 2)}\n`);
  if (settingsBackup) {
    const original = readFileSync(join(root, '.claude/settings.json'), 'utf8');
    mkdirSync(dirname(join(root, settingsBackup)), { recursive: true });
    writeFileSync(join(root, settingsBackup), original);
    writeFileSync(join(root, '.claude/settings.json'), migratedSettings(original).text);
  }
  for (const { from, to } of moves) { move(root, from, to); pruneEmpty(root, from); }
  const fresh = planInstall(root, plan.install.hosts);
  const result = applyInstall(fresh, { backupName: `migrate-${stamp}/install` });
  writeFileSync(join(root, backup, MIGRATION_RECORD), `${JSON.stringify({
    schemaVersion: 1, from: plan.legacy.version, to: fresh.to, moves, settingsBackup, installBackup: result.backup, created: result.written.filter((path) => !fresh.actions.some((action) => action.path === path && action.kind !== 'add')),
  }, null, 2)}\n`);
  rmSync(join(root, MIGRATE_JOURNAL));
  return { backup, archived: moves.map((item) => item.from), keptCustom, install: result };
}

/** Put an interrupted migration back to the tree it started from. */
export function recoverLegacy(dir: string): boolean {
  const root = resolve(dir);
  if (!existsSync(join(root, MIGRATE_JOURNAL))) return false;
  recoverInstall(root);
  const journal = JSON.parse(readFileSync(join(root, MIGRATE_JOURNAL), 'utf8')) as { backup: string; moves: { from: string; to: string }[]; settingsBackup: string | null };
  for (const { from, to } of journal.moves) if (existsSync(inside(root, to)) && !existsSync(inside(root, from))) move(root, to, from);
  if (journal.settingsBackup && existsSync(inside(root, journal.settingsBackup))) writeFileSync(join(root, '.claude/settings.json'), readFileSync(inside(root, journal.settingsBackup)));
  rmSync(join(root, MIGRATE_JOURNAL));
  pruneEmpty(root, MIGRATE_JOURNAL, new Set());
  return true;
}
