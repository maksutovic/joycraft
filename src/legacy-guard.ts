import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import installInventory from './data/install-inventory.json';
import { sha256 } from './payload.js';

// The shell guard 0.7 `harden` wrote for Claude Code. 1.x does not maintain it.
export const GUARD_SCRIPT = '.claude/hooks/joycraft/block-dangerous.sh';
export const GUARD_LIST = '.claude/hooks/joycraft/deny-patterns.txt';
export const GUARD_FILES = [GUARD_SCRIPT, GUARD_LIST];
const SETTINGS = '.claude/settings.json';

export type GuardAnswer = 'remove' | 'keep';

export interface LegacyGuard {
  /** Guard files present in the project. */
  files: string[];
  /** Hook commands in .claude/settings.json that run the guard script. */
  settingsEntries: number;
  /** The script or list differs from every published 0.7 copy. */
  changed: boolean;
}

const known = (installInventory as { files: Record<string, string[]> }).files;

const plainFile = (path: string): boolean => {
  try { return lstatSync(path).isFile(); } catch { return false; }
};

const runsGuard = (hook: any): boolean => typeof hook?.command === 'string' && hook.command.includes(GUARD_SCRIPT);

/** Hook commands that run the guard, in any event. Invalid JSON counts none. */
export function guardEntries(settingsText: string | null): number {
  if (!settingsText) return 0;
  let settings: any;
  try { settings = JSON.parse(settingsText); } catch { return 0; }
  let count = 0;
  for (const groups of Object.values<any>(settings?.hooks ?? {})) {
    if (!Array.isArray(groups)) continue;
    for (const group of groups) for (const hook of group?.hooks ?? []) if (runsGuard(hook)) count += 1;
  }
  return count;
}

/** The settings text without the guard's hook commands; empty groups and events go too. */
export function withoutGuard(settingsText: string): string {
  const settings = JSON.parse(settingsText);
  for (const [event, groups] of Object.entries<any>(settings.hooks ?? {})) {
    if (!Array.isArray(groups)) continue;
    settings.hooks[event] = groups
      .map((group) => (Array.isArray(group?.hooks) ? { ...group, hooks: group.hooks.filter((hook: any) => !runsGuard(hook)) } : group))
      .filter((group) => !Array.isArray(group?.hooks) || group.hooks.length);
    if (!settings.hooks[event].length) delete settings.hooks[event];
  }
  if (settings.hooks && !Object.keys(settings.hooks).length) delete settings.hooks;
  return `${JSON.stringify(settings, null, 2)}\n`;
}

/** The 0.7 guard: its script, its list, or a settings entry that runs it. */
export function detectGuard(dir: string): LegacyGuard | null {
  const root = resolve(dir);
  const files = GUARD_FILES.filter((path) => plainFile(join(root, path)));
  const settingsPath = join(root, SETTINGS);
  const settingsEntries = guardEntries(existsSync(settingsPath) ? readFileSync(settingsPath, 'utf8') : null);
  if (!files.length && !settingsEntries) return null;
  const changed = files.some((path) => !(known[path] ?? []).includes(sha256(readFileSync(join(root, path)))));
  return { files, settingsEntries, changed };
}

export function guardQuestion(guard: LegacyGuard): string {
  return [
    'Joycraft 0.7 installed a shell guard here (.claude/hooks/joycraft/). Joycraft 1.x does not maintain it.',
    'It matches command text. It stops some accidents but is not a security boundary, and it blocks vendor',
    'installers that pipe a script to a shell (curl ... | bash).',
    ...(guard.changed ? ['It has your changes; the backup keeps them.'] : []),
    'Remove it (backed up, undo with rollback) or keep it as your own file?',
  ].join('\n');
}

export const GUARD_FLAG_HINT = 'Answer with --legacy-guard remove or --legacy-guard keep.';
