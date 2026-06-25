import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { StackInfo } from './detect.js';

export interface ImproveOptions {
  projectDir?: string;
  /**
   * When true, the project gitignores the harness dirs (`private` profile), so
   * teammates who clone won't get the skill files. A discreet setup note is
   * emitted telling them to run `npx joycraft init` to regenerate them locally.
   */
  privateProfile?: boolean;
}

/**
 * Stable phrase used to detect (and avoid duplicating) the private-mode setup
 * note across re-runs. Kept terse so it lives quietly in the Getting Started
 * footer rather than spending a heading.
 */
export const PRIVATE_SETUP_NOTE_MARKER = 'After cloning, run';

export function generatePrivateSetupNote(): string {
  return `> **Private setup:** The harness dirs (\`.claude/\`, \`.agents/\`, \`.pi/\`) are gitignored in this repo, so they aren't committed. ${PRIVATE_SETUP_NOTE_MARKER} \`npx joycraft init\` to regenerate the skill files locally — it only creates missing files and leaves your committed \`CLAUDE.md\`, \`AGENTS.md\`, and \`docs/\` untouched (use \`--force\` only if you deliberately want to regenerate them).`;
}

interface Section {
  header: string;
  content: string;
}

function parseSections(markdown: string): Section[] {
  const lines = markdown.split('\n');
  const sections: Section[] = [];
  let currentHeader = '';
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentHeader || currentLines.length > 0) {
        sections.push({ header: currentHeader, content: currentLines.join('\n') });
      }
      currentHeader = line;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Push the last section
  if (currentHeader || currentLines.length > 0) {
    sections.push({ header: currentHeader, content: currentLines.join('\n') });
  }

  return sections;
}

function hasSection(sections: Section[], pattern: RegExp): boolean {
  return sections.some(s => pattern.test(s.header));
}

function generateCommandsBlock(stack: StackInfo): string {
  const lines: string[] = ['```bash'];
  if (stack.commands.build) lines.push(`# Build\n${stack.commands.build}`);
  if (stack.commands.test) lines.push(`# Test\n${stack.commands.test}`);
  if (stack.commands.lint) lines.push(`# Lint\n${stack.commands.lint}`);
  if (stack.commands.typecheck) lines.push(`# Type check\n${stack.commands.typecheck}`);
  if (stack.commands.deploy) lines.push(`# Deploy\n${stack.commands.deploy}`);
  lines.push('```');
  return lines.join('\n');
}

export function generateBoundariesSection(): string {
  return `## Behavioral Boundaries

### ALWAYS
- Run tests and type-check before committing
- Run tests before implementing new features -- confirm they fail first, then implement until they pass
- Use \`verb: concise message\` format for commits
- Commit after completing each discrete task (atomic commits)
- Stage specific files by name (not \`git add -A\` or \`git add .\`)
- Read \`docs/context/\` before making infrastructure or config changes
- Follow existing code patterns and style

### ASK FIRST
- Pushing to remote
- Creating or merging pull requests
- Adding new dependencies
- Modifying database schema or data models
- Changing authentication or authorization flows
- Any destructive git operation (force-push, reset --hard, branch deletion)

### NEVER
- Push directly to main/master without approval
- Commit .env files, secrets, or credentials
- Use --no-verify to skip hooks
- Amend commits that have been pushed
- Skip type-checking or linting
- Commit code that doesn't build`;
}

function generateWorkflowSection(stack: StackInfo): string {
  return `## Development Workflow

${generateCommandsBlock(stack)}

**Default execution mode:** batch

_How \`/joycraft-implement\` wraps up after each spec. \`joycraft-decompose\` reads this line (absent ⇒ \`batch\`) and recommends a per-spec mode you approve. Modes: \`batch\` (implement a cluster, wrap once at the end), \`checkpoint\` (commit + status bump after each spec), \`isolated\` (fresh context per spec — on Pi, the \`joycraft-implement-loop\` driver). Change the value above to set your project default._

**Deferred work → \`docs/backlog/\`.** Ideas and follow-ups you surface mid-sprint but can't take on now go to \`docs/backlog/\` (one file per item) so the current spec stays focused without losing the thread. Promote an entry to a Feature Brief under \`docs/features/<slug>/\` when you're ready to build it.`;
}

function generateArchitectureSection(): string {
  return `## Architecture

_TODO: Add a brief description of your project's architecture and key directories._`;
}

function generateKeyFilesSection(): string {
  return `## Key Files

| File | Purpose |
|------|---------|
| _TODO_ | _Add key files and their purposes_ |`;
}

function generateGotchasSection(): string {
  return `## Common Gotchas

_TODO: Add any gotchas, quirks, or non-obvious behaviors that developers should know about._`;
}

function generateGettingStartedSection(): string {
  return `## Getting Started with Joycraft

This project uses [Joycraft](https://github.com/maksutovic/joycraft) for AI development workflow. Available skills:

| Skill | Purpose |
|-------|---------|
| \`/joycraft-setup\` | Start here — the first-run door; sets up and assesses your project |
| \`/joycraft-tune\` | Assess your harness, apply upgrades, see path to Level 5 |
| \`/joycraft-new-feature\` | Interview -> Feature Brief -> Atomic Specs |
| \`/joycraft-interview\` | Lightweight brainstorm — yap about ideas, get a structured summary |
| \`/joycraft-decompose\` | Break a brief into small, testable specs |
| \`/joycraft-session-end\` | Capture discoveries, verify, commit |
| \`/joycraft-implement-level5\` | Set up Level 5 — autofix loop, holdout scenarios, scenario evolution |

Run \`/joycraft-tune\` to see where your project stands and what to improve next.`;
}

export function generateContextMapSection(): string {
  return `## Context Map

Keep this file lean — link out, don't inline. Long-form reference docs live in \`docs/context/reference/\`; this table points to what to read on demand.

| Document | Read it when… |
|----------|---------------|`;
}

function generateExternalValidationSection(): string {
  return `## External Validation

This project uses holdout scenario tests in a separate private repo.

### NEVER
- Access, read, or reference the scenarios repo
- Mention scenario test names or contents
- Modify the scenarios dispatch workflow to leak test information

The scenarios repo is deliberately invisible to you. This is the holdout guarantee — like a validation set in ML.`;
}

function generateAreasSection(): string {
  return `## Areas

This project organizes some work by area. When working on a specific area, read its README first; check for area-specific boundaries.

- For each area: see \`docs/areas/<area-name>/README.md\`
- Area-level boundaries (when present): \`docs/areas/<area-name>/boundaries.md\``;
}

function projectHasAreas(opts?: ImproveOptions): boolean {
  if (!opts?.projectDir) return false;
  return existsSync(join(opts.projectDir, 'docs', 'areas'));
}

function stripAreasSection(content: string): string {
  // Remove an existing "## Areas" section (header + body up to next "## " header or EOF).
  return content.replace(/\n##\s+Areas\b[\s\S]*?(?=\n##\s|\n*$)/, '').trimEnd() + '\n';
}

function generateProjectToolsSection(existingSkills: string[]): string {
  const MAX_LISTED = 10;
  let skillList: string;
  if (existingSkills.length <= MAX_LISTED) {
    skillList = existingSkills.join(', ');
  } else {
    skillList = existingSkills.slice(0, MAX_LISTED).join(', ') +
      `, and ${existingSkills.length - MAX_LISTED} more — see .claude/skills/`;
  }
  return `## Project Tools

This project has additional tools beyond Joycraft. Always check \`.claude/skills/\` for available skills: ${skillList}`;
}

export function improveCLAUDEMd(
  existing: string,
  stack: StackInfo,
  existingSkills: string[] = [],
  opts?: ImproveOptions,
): string {
  // Areas pointer: idempotent in both directions.
  // Always strip an existing "## Areas" section first so we re-evaluate cleanly.
  let working = stripAreasSection(existing);
  const sections = parseSections(working);
  const additions: string[] = [];

  if (!hasSection(sections, /behavioral\s*boundar/i)) {
    additions.push(generateBoundariesSection());
  }

  if (!hasSection(sections, /development\s*workflow/i) && !hasSection(sections, /workflow/i)) {
    additions.push(generateWorkflowSection(stack));
  }

  if (!hasSection(sections, /architecture/i)) {
    additions.push(generateArchitectureSection());
  }

  if (!hasSection(sections, /key\s*files/i)) {
    additions.push(generateKeyFilesSection());
  }

  if (!hasSection(sections, /common\s*gotchas/i) && !hasSection(sections, /gotchas/i)) {
    additions.push(generateGotchasSection());
  }

  if (!hasSection(sections, /getting\s*started.*joycraft/i) && !hasSection(sections, /joycraft.*skills/i)) {
    additions.push(generateGettingStartedSection());
  }

  if (!hasSection(sections, /context\s*map/i)) {
    additions.push(generateContextMapSection());
  }

  if (!hasSection(sections, /external\s*validation/i)) {
    additions.push(generateExternalValidationSection());
  }

  // Private-mode setup note: independent of the Getting Started check above so
  // it gets added on a re-run even when Getting Started already exists. Matched
  // on its stable phrase, not a heading, so it's idempotent across upgrades.
  if (opts?.privateProfile && !existing.includes(PRIVATE_SETUP_NOTE_MARKER)) {
    additions.push(generatePrivateSetupNote());
  }

  if (existingSkills.length > 0 && !hasSection(sections, /project\s*tools/i)) {
    additions.push(generateProjectToolsSection(existingSkills));
  }

  if (projectHasAreas(opts)) {
    additions.push(generateAreasSection());
  }

  if (additions.length === 0) {
    return working === existing ? existing : working;
  }

  const trimmed = working.trimEnd();
  return trimmed + '\n\n' + additions.join('\n\n') + '\n';
}

export function generateCLAUDEMd(
  projectName: string,
  stack: StackInfo,
  existingSkills: string[] = [],
  opts?: ImproveOptions,
): string {
  const frameworkNote = stack.framework ? ` (${stack.framework})` : '';
  const langLabel = stack.language === 'unknown' ? '' : ` | **Stack:** ${stack.language}${frameworkNote}`;

  const lines: string[] = [
    `# ${projectName}`,
    '',
    `**Component:** _TODO: describe what this project is_${langLabel}`,
    '',
    '---',
    '',
    generateBoundariesSection(),
    '',
    generateWorkflowSection(stack),
    '',
    generateArchitectureSection(),
    '',
    generateKeyFilesSection(),
    '',
    generateGotchasSection(),
    '',
    generateContextMapSection(),
    '',
    generateGettingStartedSection(),
    '',
  ];

  if (opts?.privateProfile) {
    lines.push(generatePrivateSetupNote(), '');
  }

  if (existingSkills.length > 0) {
    lines.push(generateProjectToolsSection(existingSkills), '');
  }

  if (projectHasAreas(opts)) {
    lines.push(generateAreasSection(), '');
  }

  return lines.join('\n');
}
