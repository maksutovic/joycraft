import { PRIVATE_DIRS_DISPLAY } from './gitignore.js';
import { formatUpdateOutcome, update, type ExecutingBundle, type UpdateOutcome } from './update.js';
import type { ExecutionProfile } from './execution-profile.js';
import type { Harness } from './harness.js';

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
  executionProfile?: ExecutionProfile;
  disableAutoMemory?: boolean;
}

/** Compatibility alias for the unified update engine. */
export async function init(dir: string, options: InitOptions = {}): Promise<UpdateOutcome> {
  return update(dir, {
    legacyInit: true,
    force: options.force ?? false,
    gitignore: options.gitignore,
    harnesses: options.harnesses,
    yes: options.yes,
    nonInteractive: options.nonInteractive,
    replaceCustomized: options.replaceCustomized,
    json: options.json,
    bundle: options.bundle,
    executionProfile: options.executionProfile,
    disableAutoMemory: options.disableAutoMemory,
  });
}

/** Human-facing init summary; JSON remains a single formatter output. */
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
