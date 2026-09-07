import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { getBundleInventory } from './bundle-inventory.js';
import { resolveAutoMemoryOffer } from './auto-memory.js';
import { resolveExecutionProfile, type ExecutionProfile } from './execution-profile.js';
import { HARNESSES, parseHarnessSelection, resolveHarnesses, sanitizeHarnesses, type Harness } from './harness.js';
import { readInstallationManifestInfo } from './install-manifest.js';
import { PRIVATE_DIRS_DISPLAY, resolveGitignoreProfile } from './gitignore.js';
import { formatUpdateOutcome, update, type ExecutingBundle, type UpdateOutcome } from './update.js';
import {
  LEGACY_CLAUDE_STATE_PATH,
  LEGACY_VERSION_FILE,
  STATE_PATH,
  parseGitignoreProfile,
  type GitignoreProfile,
} from './version.js';

/** Options retained by the legacy init entry point and forwarded to update. */
export interface InitOptions {
  force?: boolean;
  gitignore?: string;
  harnesses?: readonly Harness[] | string;
  yes?: boolean;
  nonInteractive?: boolean;
  replaceCustomized?: readonly string[];
  json?: boolean;
  bundle?: ExecutingBundle;
  /** Captured by the init boundary and written by the shared update engine. */
  executionProfile?: ExecutionProfile;
  /** Captured by the init boundary and written by the shared update engine. */
  disableAutoMemory?: boolean;
}

interface RecordedInitChoices {
  present: boolean;
  harnesses?: Harness[];
  profile?: GitignoreProfile;
}

const RECORDED_STATE_PATHS = [STATE_PATH, LEGACY_CLAUDE_STATE_PATH, LEGACY_VERSION_FILE];

function readRecordedInitChoices(root: string): RecordedInitChoices {
  const choices: RecordedInitChoices = { present: false };

  // A valid new manifest is the strongest source for both choices. Reading both
  // authorities also makes a corrupt/duplicate installation stay non-interactive
  // so init cannot mask the attention outcome returned by update().
  for (const profile of ['shared', 'private'] as const) {
    const info = readInstallationManifestInfo(root, profile);
    if (info.status !== 'missing') choices.present = true;
    if (info.manifest) {
      choices.harnesses ??= [...info.manifest.harnesses];
      choices.profile ??= info.manifest.profile;
    }
  }

  for (const relative of RECORDED_STATE_PATHS) {
    const path = join(root, ...relative.split('/'));
    if (!existsSync(path)) continue;
    choices.present = true;
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
      if (!choices.harnesses && Array.isArray(parsed.harnesses)) {
        choices.harnesses = sanitizeHarnesses(parsed.harnesses) ?? undefined;
      }
      choices.profile ??= parseGitignoreProfile(parsed.gitignoreProfile) ?? undefined;
    } catch {
      // update() owns malformed-state diagnosis and preservation; this read is
      // only a prompt gate and must never turn a parse error into a write.
    }
  }

  // Legacy installs can predate state selection entirely. Recognizing one of
  // the actual harness artifacts is enough to treat a rerun as established.
  if (!choices.present) {
    const inventory = getBundleInventory(HARNESSES);
    choices.present = inventory.some((entry) => (
      entry.harness !== 'shared'
      && entry.content !== undefined
      && existsSync(join(root, ...entry.path.split('/')))
    ));
  }
  return choices;
}

function canPrompt(options: InitOptions): boolean {
  return process.stdin.isTTY === true
    && options.yes !== true
    && options.nonInteractive !== true
    && options.json !== true;
}

function isEmptySelection(value: InitOptions['harnesses']): boolean {
  if (Array.isArray(value)) return value.length === 0;
  return typeof value === 'string' && parseHarnessSelection(value)?.length === 0;
}

function noHarnessOutcome(result: UpdateOutcome): UpdateOutcome {
  return {
    ...result,
    status: 'noop',
    exitCode: 0,
    harnesses: [],
    applied: [],
    preserved: [],
    conflicts: [],
    diagnostics: [
      'No harness selected — Joycraft will not install any skills.',
      `Please run init again and select at least one harness (${HARNESSES.join(', ')}).`,
    ],
  };
}

/**
 * Capture fresh-init choices, then hand all filesystem work to update().
 * Existing installations reuse their recorded authority and harnesses without
 * reopening the interactive interview on every ordinary rerun.
 */
export async function init(dir: string, options: InitOptions = {}): Promise<UpdateOutcome> {
  const root = resolve(dir);
  const recorded = readRecordedInitChoices(root);
  const prompting = canPrompt(options) && !recorded.present;

  let harnesses = options.harnesses;
  if (prompting && harnesses === undefined) {
    harnesses = await resolveHarnesses(true);
  } else if (!prompting && harnesses === undefined && recorded.harnesses !== undefined) {
    // An empty recorded selection is meaningful too: preserve it as the
    // user's deliberate no-op rather than falling through to legacyInit's
    // all-harness compatibility default.
    harnesses = [...recorded.harnesses];
  }

  // An empty answer is an intentional clean no-op. Calling update with the
  // empty selection keeps the shared validation/delegation boundary in charge;
  // update returns before it can create or modify any project file.
  if (isEmptySelection(harnesses)) {
    const result = await update(root, {
      legacyInit: true,
      force: options.force ?? false,
      harnesses,
      yes: options.yes,
      nonInteractive: options.nonInteractive,
      replaceCustomized: options.replaceCustomized,
      bundle: options.bundle,
    });
    return result.status === 'invalid' ? noHarnessOutcome(result) : result;
  }

  const selectedForProfile = typeof harnesses === 'string'
    ? parseHarnessSelection(harnesses)
    : harnesses === undefined
      ? recorded.harnesses
      : sanitizeHarnesses(harnesses);
  const profileHarnesses = selectedForProfile ?? [...HARNESSES];

  let executionProfile = options.executionProfile;
  if (prompting && executionProfile === undefined) {
    executionProfile = await resolveExecutionProfile(profileHarnesses, true);
  }

  let gitignore = options.gitignore;
  if (prompting && gitignore === undefined) {
    const resolved = await resolveGitignoreProfile({
      persisted: recorded.profile,
      interactive: true,
      promptIntro: '\nHow should Joycraft files be tracked in git?',
    });
    gitignore = resolved.profile;
  } else if (gitignore === undefined && recorded.profile !== undefined) {
    // Legacy state does not participate in update()'s authority lookup, so
    // forward its recorded profile explicitly during migration.
    gitignore = recorded.profile;
  }

  let disableAutoMemory = options.disableAutoMemory;
  if (prompting && disableAutoMemory === undefined && profileHarnesses.includes('claude')) {
    disableAutoMemory = await resolveAutoMemoryOffer(true);
  }

  return update(root, {
    legacyInit: true,
    force: options.force ?? false,
    harnesses,
    yes: options.yes,
    nonInteractive: options.nonInteractive,
    replaceCustomized: options.replaceCustomized,
    bundle: options.bundle,
    executionProfile,
    disableAutoMemory,
    gitignore,
  });
}

/**
 * Human-facing init summary. The initializer itself remains side-effect free
 * at the output boundary and returns the same structured result as update;
 * Commander calls this formatter after the transaction completes.
 */
export function formatInitOutcome(result: UpdateOutcome, json = false): string {
  if (json) return formatUpdateOutcome(result, true);
  const lines = [formatUpdateOutcome(result, false)];
  if (result.harnesses?.length) lines.push(`  Installed harnesses: ${result.harnesses.join(', ')}`);
  if (result.profile === 'private') {
    lines.push(`  Gitignore profile: private (${PRIVATE_DIRS_DISPLAY} are gitignored — only CLAUDE.md, AGENTS.md, docs/ are tracked)`);
  } else if (result.profile) {
    lines.push('  Gitignore profile: shared (skills and docs are tracked for your team)');
  }
  if (result.existingSkills?.length) {
    lines.push(`  Found existing skills: ${result.existingSkills.join(', ')}. These are preserved — Joycraft is additive.`);
  }
  lines.push('  Next steps:');
  lines.push('    1. Run Claude Code and try /joycraft-setup — the first-run door that sets up and assesses your project');
  lines.push('    2. Try /joycraft-new-feature to start building with the spec-driven workflow');
  lines.push('       (feature artifacts are written to docs/features/<slug>/ as you go)');
  if (result.profile === 'private') {
    lines.push('    3. Commit CLAUDE.md, AGENTS.md, and docs/ — harness directories stay local (gitignored)');
  } else {
    lines.push('    3. Commit .claude/skills/ and docs/ so your team gets the same workflow');
  }
  if (result.harnesses?.includes('omp')) lines.push('    omp: Skills installed to .omp/skills/. Use /skill:joycraft-* to invoke.');
  return lines.join('\n');
}
