import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { basename, join } from 'node:path';

import type { StackInfo } from './detect.js';
import type { ExecutionProfile } from './execution-profile.js';
import { generateAgentsMd } from './agents-md.js';
import {
  generateCLAUDEMd,
  generateClaudeMdPointer,
} from './improve-claude-md.js';
import { generatePermissions } from './permissions.js';
import { planPiExcludedFromTsconfig } from './tsconfig.js';
import type { Harness } from './harness.js';
import {
  rawFileHash,
  type InstallationManifest,
} from './install-manifest.js';
import type { BundleInventoryEntry } from './bundle-inventory.js';
import type { GitignoreProfile } from './version.js';

/** The exact first-run backlog stub retained from the legacy init flow. */
export const BACKLOG_README = `# Backlog

Deferred work lives here — ideas and follow-ups you surface mid-sprint but
can't take on in the current feature. Capturing them keeps the current spec
focused without losing the thread.

- One file per item: \`docs/backlog/YYYY-MM-DD-<short-name>.md\`.
- Joycraft skills (\`/joycraft-interview\`, \`/joycraft-new-feature\`,
  \`/joycraft-design\`) offer to write entries here — always with your
  confirmation, never automatically.
- Promote an item by turning it into a Feature Brief under
  \`docs/features/<slug>/\` when you're ready to build it.
`;

export interface InventoryPatchOperation {
  path: string;
  kind: 'write';
  content: string;
  currentPresent: boolean;
  rawPrecondition?: string;
  reason: string;
}

export interface InventorySetup {
  /** Empty directories the transaction should create after successful apply. */
  directories: string[];
  /** Existing non-Joycraft Claude skill directory names for the generators. */
  existingSkills: string[];
  /** Settings/tsconfig writes that must be converted into transaction actions. */
  patchOperations: InventoryPatchOperation[];
}

export interface FreshInventoryInput {
  root: string;
  entries: readonly BundleInventoryEntry[];
  manifest: InstallationManifest;
  harnesses: readonly Harness[];
  profile: GitignoreProfile;
  stack: StackInfo;
  executionProfile?: ExecutionProfile;
  disableAutoMemory?: boolean;
  /** True only for the fresh-install/setup path. */
  freshInstall?: boolean;
  /** Explicit init/setup request to configure an existing Claude settings file. */
  configureClaude?: boolean;
  /** Explicit legacy init force; only known generated documents are eligible. */
  force?: boolean;
  /** Optional bridge behavior; the unified command may own this action itself. */
  retireLegacyChecker?: boolean;
}

export interface MaterializedInventory {
  entries: BundleInventoryEntry[];
  setup: InventorySetup;
  diagnostics: string[];
}

const CLAUDE_SETTINGS = '.claude/settings.json';
const TS_CONFIG = 'tsconfig.json';
const KNOWN_GENERATED_DOCUMENTS = new Set(['CLAUDE.md', 'AGENTS.md']);
const SAFE_GUARD_HOOK = '.claude/hooks/joycraft/block-dangerous.sh';
const UPDATE_CHECK_HOOK = 'node .claude/hooks/joycraft-version-check.mjs';

function regularFile(root: string, relative: string): boolean {
  try {
    return lstatSync(join(root, ...relative.split('/'))).isFile();
  } catch {
    return false;
  }
}

function existingPath(root: string, relative: string): boolean {
  try {
    lstatSync(join(root, ...relative.split('/')));
    return true;
  } catch {
    return false;
  }
}

function projectName(root: string): string {
  return (root.split(/[\\/]/).filter(Boolean).pop() ?? basename(root)) || 'project';
}

function existingClaudeSkills(root: string, selected: readonly Harness[]): string[] {
  if (!selected.includes('claude')) return [];
  const directory = join(root, '.claude', 'skills');
  try {
    return readdirSync(directory, { withFileTypes: true })
      .filter((entry) => !entry.name.startsWith('joycraft-') && !entry.name.startsWith('.'))
      .filter((entry) => {
        try {
          return statSync(join(directory, entry.name)).isDirectory();
        } catch {
          return false;
        }
      })
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

function generatorContent(
  root: string,
  path: string,
  harnesses: readonly Harness[],
  profile: GitignoreProfile,
  stack: StackInfo,
  existingSkills: string[],
  executionProfile: ExecutionProfile | undefined,
): string | undefined {
  const multiTool = harnesses.some((harness) => harness !== 'claude');
  if (path === 'CLAUDE.md') {
    return multiTool
      ? generateClaudeMdPointer()
      : generateCLAUDEMd(projectName(root), stack, existingSkills, {
          privateProfile: profile === 'private',
          projectDir: root,
        });
  }
  if (path === 'AGENTS.md') {
    return multiTool
      ? generateCLAUDEMd(projectName(root), stack, existingSkills, {
          privateProfile: profile === 'private',
          multiTool: true,
          executionProfile,
          projectDir: root,
        })
      : generateAgentsMd(projectName(root), stack, profile === 'private', executionProfile, undefined, root);
  }
  return undefined;
}

function materializeDocuments(
  input: FreshInventoryInput,
  existingSkills: string[],
): BundleInventoryEntry[] {
  return input.entries.flatMap((entry) => {
    // Config patches for settings are converted into one transaction operation
    // below. Keeping them out of the planner avoids ambiguous same-path
    // selector composition while preserving the rest of the supplied bundle.
    if (entry.path === CLAUDE_SETTINGS && entry.kind === 'config-patch') return [];
    if (entry.kind !== 'create-once') return [entry];

    const exists = regularFile(input.root, entry.path);
    const recorded = input.manifest.files[entry.path] !== undefined;
    const forceKnown = input.force === true && KNOWN_GENERATED_DOCUMENTS.has(entry.path);

    if (entry.content !== undefined) {
      if (!exists || forceKnown) return [entry];
      return [];
    }

    const content = generatorContent(
      input.root,
      entry.path,
      input.harnesses,
      input.profile,
      input.stack,
      existingSkills,
      input.executionProfile,
    );
    if (content === undefined) return [];
    // Preserve a previously-created document, including a local deletion. A
    // force run can review only the two generated boundary documents.
    if ((!exists && !recorded) || forceKnown) {
      return [{ ...entry, installable: true, content }];
    }
    return [];
  });
}

function freshSettingsEntry(input: FreshInventoryInput): BundleInventoryEntry | undefined {
  if (!input.freshInstall || !input.harnesses.includes('claude') || existingPath(input.root, CLAUDE_SETTINGS)) return undefined;
  const permissions = generatePermissions(input.stack);
  const settings: Record<string, unknown> = {
    env: { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1' },
    hooks: {
      SessionStart: [{
        matcher: '',
        hooks: [{ type: 'command', command: UPDATE_CHECK_HOOK }],
      }],
      PreToolUse: [{
        matcher: 'Bash',
        hooks: [{ type: 'command', command: SAFE_GUARD_HOOK }],
      }],
    },
    permissions,
  };
  if (input.disableAutoMemory === true) settings.autoMemoryEnabled = false;
  return {
    path: CLAUDE_SETTINGS,
    harness: 'claude',
    kind: 'create-once',
    ownership: 'managed',
    active: true,
    installable: true,
    content: JSON.stringify(settings, null, 2) + '\n',
  };
}

function freshBacklogEntry(input: FreshInventoryInput): BundleInventoryEntry | undefined {
  if (!input.freshInstall || regularFile(input.root, 'docs/backlog/README.md')) return undefined;
  if (existingPath(input.root, 'docs/backlog/README.md')) return undefined;
  return {
    path: 'docs/backlog/README.md',
    harness: 'shared',
    kind: 'create-once',
    ownership: 'managed',
    active: true,
    installable: true,
    content: BACKLOG_README,
  };
}

function parseSettings(raw: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : undefined;
  } catch {
    return undefined;
  }
}

function arraySetting(value: unknown): string[] | undefined {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) return undefined;
  return [...value] as string[];
}

function addIfMissing(target: string[], values: readonly string[]): boolean {
  let changed = false;
  for (const value of values) {
    if (!target.includes(value)) {
      target.push(value);
      changed = true;
    }
  }
  return changed;
}

function safeguardHookPresent(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some((record) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return false;
    const hooks = (record as Record<string, unknown>).hooks;
    return Array.isArray(hooks) && hooks.some((hook) =>
      hook && typeof hook === 'object' && !Array.isArray(hook)
      && (hook as Record<string, unknown>).command === SAFE_GUARD_HOOK,
    );
  });
}

function updateCheckHookPresent(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some((record) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return false;
    const hooks = (record as Record<string, unknown>).hooks;
    return Array.isArray(hooks) && hooks.some((hook) =>
      hook && typeof hook === 'object' && !Array.isArray(hook)
      && (hook as Record<string, unknown>).command === UPDATE_CHECK_HOOK,
    );
  });
}

function mergeOwnedSettings(
  raw: string,
  input: FreshInventoryInput,
  allowGenerated: boolean,
  diagnostics: string[],
): string | undefined {
  const settings = parseSettings(raw);
  if (!settings) {
    diagnostics.push('settings.json is malformed or not an object; preserving it without generated setup changes.');
    return undefined;
  }
  let changed = false;

  if (allowGenerated) {
    const env = settings.env === undefined
      ? (settings.env = {}, settings.env as Record<string, unknown>)
      : settings.env && typeof settings.env === 'object' && !Array.isArray(settings.env)
        ? settings.env as Record<string, unknown>
        : undefined;
    if (!env) {
      diagnostics.push('settings.json has a non-object env value; preserving it without generated setup changes.');
      return undefined;
    }
    if (!Object.prototype.hasOwnProperty.call(env, 'CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS')) {
      env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = '1';
      changed = true;
    }

    const permissions = settings.permissions === undefined
      ? (settings.permissions = {}, settings.permissions as Record<string, unknown>)
      : settings.permissions && typeof settings.permissions === 'object' && !Array.isArray(settings.permissions)
        ? settings.permissions as Record<string, unknown>
        : undefined;
    if (!permissions) {
      diagnostics.push('settings.json has a non-object permissions value; preserving it without generated setup changes.');
      return undefined;
    }
    const allow = arraySetting(permissions.allow);
    const deny = arraySetting(permissions.deny);
    if (!allow || !deny) {
      diagnostics.push('settings.json has a non-array permissions list; preserving it without generated setup changes.');
      return undefined;
    }
    changed = addIfMissing(allow, generatePermissions(input.stack).allow) || changed;
    changed = addIfMissing(deny, generatePermissions(input.stack).deny) || changed;
    permissions.allow = allow;
    permissions.deny = deny;

    const hooks = settings.hooks === undefined
      ? (settings.hooks = {}, settings.hooks as Record<string, unknown>)
      : settings.hooks && typeof settings.hooks === 'object' && !Array.isArray(settings.hooks)
        ? settings.hooks as Record<string, unknown>
        : undefined;
    if (!hooks) {
      diagnostics.push('settings.json has a non-object hooks value; preserving it without generated setup changes.');
      return undefined;
    }
    const preToolUse = hooks.PreToolUse === undefined
      ? (hooks.PreToolUse = [], hooks.PreToolUse as unknown[])
      : hooks.PreToolUse;
    if (!Array.isArray(preToolUse)) {
      diagnostics.push('settings.json has a non-array hooks.PreToolUse value; preserving it without generated setup changes.');
      return undefined;
    }
    if (!safeguardHookPresent(preToolUse)) {
      preToolUse.push({ matcher: 'Bash', hooks: [{ type: 'command', command: SAFE_GUARD_HOOK }] });
      changed = true;
    }

    const sessionStart = hooks.SessionStart === undefined
      ? (hooks.SessionStart = [], hooks.SessionStart as unknown[])
      : hooks.SessionStart;
    if (!Array.isArray(sessionStart)) {
      diagnostics.push('settings.json has a non-array hooks.SessionStart value; preserving it without generated setup changes.');
      return undefined;
    }
    if (!updateCheckHookPresent(sessionStart)) {
      sessionStart.push({ matcher: '', hooks: [{ type: 'command', command: UPDATE_CHECK_HOOK }] });
      changed = true;
    }
  }

  if (input.disableAutoMemory === true && !Object.prototype.hasOwnProperty.call(settings, 'autoMemoryEnabled')) {
    settings.autoMemoryEnabled = false;
    changed = true;
  }
  if (!changed) return undefined;
  const newline = raw.includes('\r\n') ? '\r\n' : '\n';
  const serialized = JSON.stringify(settings, null, 2).replace(/\r?\n/g, newline);
  return raw.endsWith('\n') || raw.endsWith('\r') ? serialized + newline : serialized;
}

function retireLegacyChecker(raw: string, diagnostics: string[]): string | undefined {
  const settings = parseSettings(raw);
  if (!settings) {
    diagnostics.push('settings.json is malformed or not an object; preserving it without legacy checker retirement.');
    return undefined;
  }
  const hooks = settings.hooks;
  if (!hooks || typeof hooks !== 'object' || Array.isArray(hooks)) return undefined;
  const sessionStart = (hooks as Record<string, unknown>).SessionStart;
  if (!Array.isArray(sessionStart)) return undefined;
  const checker = 'node .claude/hooks/joycraft-version-check.mjs';
  let found = false;
  const nextSessionStart = sessionStart.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [entry];
    const record = entry as Record<string, unknown>;
    if (!Array.isArray(record.hooks)) return [entry];
    const nextHooks = record.hooks.filter((hook) => {
      const command = hook && typeof hook === 'object' && !Array.isArray(hook)
        ? (hook as Record<string, unknown>).command
        : undefined;
      if (command === checker) {
        found = true;
        return false;
      }
      return true;
    });
    return nextHooks.length ? [{ ...record, hooks: nextHooks }] : [];
  });
  if (!found) return undefined;
  const nextSettings = { ...settings, hooks: { ...(hooks as Record<string, unknown>), SessionStart: nextSessionStart } };
  const newline = raw.includes('\r\n') ? '\r\n' : '\n';
  const serialized = JSON.stringify(nextSettings, null, 2).replace(/\r?\n/g, newline);
  return raw.endsWith('\n') || raw.endsWith('\r') ? serialized + newline : serialized;
}

function settingsPatch(input: FreshInventoryInput, diagnostics: string[]): InventoryPatchOperation | undefined {
  if (!input.harnesses.includes('claude') || !regularFile(input.root, CLAUDE_SETTINGS)) return undefined;
  const path = join(input.root, ...CLAUDE_SETTINGS.split('/'));
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    diagnostics.push('settings.json could not be read; preserving it without generated setup changes.');
    return undefined;
  }
  const allowGenerated = input.freshInstall === true || input.configureClaude === true;
  let next = mergeOwnedSettings(raw, input, allowGenerated, diagnostics);
  if (next === undefined) next = raw;
  if (input.retireLegacyChecker === true) {
    const retired = retireLegacyChecker(next, diagnostics);
    if (retired !== undefined) next = retired;
  }
  if (next === raw) return undefined;
  return {
    path: CLAUDE_SETTINGS,
    kind: 'write',
    content: next,
    currentPresent: true,
    rawPrecondition: rawFileHash(raw),
    reason: allowGenerated
      ? 'Apply the selected initial Claude setup while preserving unrelated settings.'
      : 'Apply the explicitly selected auto-memory preference while preserving unrelated Claude settings.',
  };
}

function tsconfigPatch(input: FreshInventoryInput, diagnostics: string[]): InventoryPatchOperation | undefined {
  if (!input.freshInstall || !input.harnesses.includes('pi') || !regularFile(input.root, TS_CONFIG)) return undefined;
  const path = join(input.root, TS_CONFIG);
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    diagnostics.push('tsconfig.json could not be read; add ".pi" to its exclude array manually.');
    return undefined;
  }
  const planned = planPiExcludedFromTsconfig(raw);
  if (planned.status === 'already-present') return undefined;
  if (planned.status === 'skipped') {
    diagnostics.push(planned.reason);
    return undefined;
  }
  return {
    path: TS_CONFIG,
    kind: 'write',
    content: planned.content,
    currentPresent: true,
    rawPrecondition: rawFileHash(raw),
    reason: 'Exclude the installed Pi runtime from the project TypeScript program while preserving the existing tsconfig bytes.',
  };
}

/**
 * Read current project bytes and turn fresh-install setup into inventory
 * entries plus transaction-ready operations. This function performs no writes,
 * prompts, registry access, or mutation of the supplied inventory/manifest.
 */
export function materializeFreshInstallInventory(input: FreshInventoryInput): MaterializedInventory {
  const diagnostics: string[] = [];
  const existingSkills = existingClaudeSkills(input.root, input.harnesses);
  const entries = materializeDocuments(input, existingSkills);
  const known = new Set(entries.map((entry) => entry.path));
  const backlog = freshBacklogEntry(input);
  if (backlog && !known.has(backlog.path)) entries.push(backlog);
  const settings = freshSettingsEntry(input);
  if (settings && !known.has(settings.path)) entries.push(settings);

  const directories: string[] = [];
  if (input.freshInstall) {
    for (const relative of ['docs/context', 'docs/backlog']) {
      if (!existingPath(input.root, relative)) directories.push(relative);
      else if (!regularFile(input.root, relative)) {
        try {
          if (!lstatSync(join(input.root, ...relative.split('/'))).isDirectory()) {
            diagnostics.push(`${relative} exists but is not a directory; preserving it.`);
          }
        } catch {
          diagnostics.push(`${relative} could not be inspected; preserving it.`);
        }
      }
    }
  }

  const patchOperations = [settingsPatch(input, diagnostics), tsconfigPatch(input, diagnostics)]
    .filter((operation): operation is InventoryPatchOperation => operation !== undefined);
  return {
    entries,
    setup: { directories, existingSkills, patchOperations },
    diagnostics,
  };
}
