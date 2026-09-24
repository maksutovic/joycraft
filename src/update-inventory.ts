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
  insertModelProfilePointer,
} from './improve-claude-md.js';
import { selectsModelProfile } from './model-profile.js';
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

/**
 * The first-run intent inbox README. Editable source of truth:
 * `src/templates/intent/README.md` (a test asserts the two are identical).
 */
export const INTENT_README = `# Intent inbox

An intent is a short note that describes a need before anyone commits to
building it: a customer bug, a product idea, a ticket from another system, or
an alert. Put intents here, one file per intent. Nothing needs to decide on a
feature name first.

- One file per intent: \`docs/intent/YYYY-MM-DD-<short-name>.md\`.
- Use the shape in \`docs/templates/INTENT_TEMPLATE.md\`: Author, Status,
  \`source\`, Problem, Proposed outcome, Affected users and systems,
  Constraints, Open questions.
- A new intent starts with \`Status: untriaged\`. Joycraft skills update that
  line when they triage or consume the intent. The file stays here afterwards.
- \`source:\` records where the intent came from, for example \`human\`,
  \`interview\`, \`linear:<id>\`, or \`alert:<name>\`. It is free text.

## How intents map to Joycraft artifacts

Anthropic's AI-native development playbook names a chain of artifacts. Joycraft
already has most of them under its own names. Nothing is renamed. Use the
Joycraft names below.

| Playbook term | Joycraft artifact | Where it lives |
|---------------|-------------------|----------------|
| intent | intent | \`docs/intent/<name>.md\` |
| spec | brief | \`docs/features/<slug>/brief.md\` |
| plan | design + atomic specs | \`docs/features/<slug>/design.md\` and \`docs/features/<slug>/specs/\` |

An intent becomes a brief through \`/joycraft-new-feature\`, or a bugfix spec
through \`/joycraft-bugfix\`. The brief, design, and specs keep their current
names and folders.
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

function isDirectory(root: string, relative: string): boolean {
  try {
    return lstatSync(join(root, ...relative.split('/'))).isDirectory();
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

/**
 * Any non-Claude harness makes AGENTS.md the shared memory file and CLAUDE.md
 * an `@AGENTS.md` import pointer; a Claude-only selection keeps CLAUDE.md.
 */
function sharesAgentsMd(harnesses: readonly Harness[]): boolean {
  return harnesses.some((harness) => harness !== 'claude');
}

/** The one memory file this selection designates (see generatorContent). */
function memoryFilePath(harnesses: readonly Harness[]): 'CLAUDE.md' | 'AGENTS.md' {
  return sharesAgentsMd(harnesses) ? 'AGENTS.md' : 'CLAUDE.md';
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
  const multiTool = sharesAgentsMd(harnesses);
  const modelProfilePointer = selectsModelProfile(harnesses);
  if (path === 'CLAUDE.md') {
    return multiTool
      ? generateClaudeMdPointer()
      : generateCLAUDEMd(projectName(root), stack, existingSkills, {
          privateProfile: profile === 'private',
          projectDir: root,
          modelProfilePointer,
        });
  }
  if (path === 'AGENTS.md') {
    // Claude-only: CLAUDE.md is the memory file and carries the pointer, so the
    // companion AGENTS.md stays without it (one pointer per project).
    return multiTool
      ? generateCLAUDEMd(projectName(root), stack, existingSkills, {
          privateProfile: profile === 'private',
          multiTool: true,
          executionProfile,
          projectDir: root,
          modelProfilePointer,
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

    // A bundled create-once file stays declared even when it exists: the
    // planner preserves it, and dropping it would make an older vendor row
    // for the same path look like an orphan that the planner may delete.
    if (entry.content !== undefined) return [entry];

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

function freshIntentEntry(input: FreshInventoryInput): BundleInventoryEntry | undefined {
  if (!input.freshInstall) return undefined;
  // Never write into a docs/intent that is a regular file or any other non-directory.
  if (existingPath(input.root, 'docs/intent') && !isDirectory(input.root, 'docs/intent')) return undefined;
  if (existingPath(input.root, 'docs/intent/README.md')) return undefined;
  return {
    path: 'docs/intent/README.md',
    harness: 'shared',
    kind: 'create-once',
    ownership: 'managed',
    active: true,
    installable: true,
    content: INTENT_README,
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
 * Insert the one model-profile Context Map row into an existing memory file
 * (D14). Only the selection's designated file is read; the operation exists
 * only when the bytes would change, so a second run reports nothing. It never
 * creates or resurrects the file, and never removes a row (D14 keeps cleanup
 * advisory).
 */
function contextMapPointerPatch(
  input: FreshInventoryInput,
  entries: readonly BundleInventoryEntry[],
  diagnostics: string[],
): InventoryPatchOperation | undefined {
  if (!selectsModelProfile(input.harnesses)) return undefined;
  const memory = memoryFilePath(input.harnesses);
  if (!regularFile(input.root, memory)) return undefined;
  // A generated document written in this same run already carries the row.
  if (entries.some((entry) => entry.path === memory && entry.content !== undefined)) return undefined;
  let raw: string;
  try {
    raw = readFileSync(join(input.root, memory), 'utf8');
  } catch {
    diagnostics.push(`${memory} could not be read; add the model profile row to its Context Map manually.`);
    return undefined;
  }
  const next = insertModelProfilePointer(raw);
  if (next === raw) return undefined;
  return {
    path: memory,
    kind: 'write',
    content: next,
    currentPresent: true,
    rawPrecondition: rawFileHash(raw),
    reason: 'Add one Context Map row pointing at the Claude Fable 5.1 model profile; every other byte is preserved.',
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
  const intent = freshIntentEntry(input);
  if (intent && !known.has(intent.path)) entries.push(intent);
  const settings = freshSettingsEntry(input);
  if (settings && !known.has(settings.path)) entries.push(settings);

  const directories: string[] = [];
  if (input.freshInstall) {
    for (const relative of ['docs/context', 'docs/backlog', 'docs/intent']) {
      if (!existingPath(input.root, relative)) directories.push(relative);
      else {
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

  const patchOperations = [
    settingsPatch(input, diagnostics),
    tsconfigPatch(input, diagnostics),
    contextMapPointerPatch(input, entries, diagnostics),
  ]
    .filter((operation): operation is InventoryPatchOperation => operation !== undefined);
  return {
    entries,
    setup: { directories, existingSkills, patchOperations },
    diagnostics,
  };
}
