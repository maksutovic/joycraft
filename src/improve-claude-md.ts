import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { StackInfo } from './detect.js';
import { renderFolderMap, ensureFolderMapSection, FOLDER_MAP_OPEN } from './folder-map.js';
import {
  ensureExecutionProfileSection,
  renderExecutionProfileSection,
  type ExecutionProfile,
} from './execution-profile.js';

export interface ImproveOptions {
  projectDir?: string;
  /**
   * When true, the project gitignores the harness dirs (`private` profile), so
   * teammates who clone won't get the skill files. A discreet setup note is
   * emitted telling them to run `npx joycraft init` to regenerate them locally.
   */
  privateProfile?: boolean;
  /**
   * When true, the generated document is the single shared AGENTS.md for a
   * multi-tool install (Codex, Pi, and/or Copilot selected alongside or instead of
   * Claude Code). Adds the External API Safety rules and a per-tool skill
   * invocation note, since the one document serves every harness. CLAUDE.md
   * then becomes an `@AGENTS.md` import pointer (see generateClaudeMdPointer).
   */
  multiTool?: boolean;
  /**
   * The project's Execution Profile (D6). When supplied, a sentinel-delimited
   * `## Execution Profile` section is written (generate) or inserted-if-absent
   * (improve). An existing region is never rewritten — it's the user's data.
   * Only meaningful for documents that serve as AGENTS.md.
   */
  executionProfile?: ExecutionProfile;
  /**
   * Elicited directional content (D5). When supplied and non-empty, one
   * `## Product Identity` section is appended — never a TODO stub, so the
   * section only exists once gather-context/interview collected real answers.
   */
  identity?: ProductIdentity;
}

/**
 * Directional content for the `## Product Identity` section. Every field is
 * optional; only non-empty ones become subsections.
 */
export interface ProductIdentity {
  values?: string[];
  glossary?: Record<string, string>;
  taste?: string[];
}

export const PRODUCT_IDENTITY_HEADER_PATTERN = /product\s*identity/i;

function nonEmptyLines(items?: string[]): string[] {
  return (items ?? []).map(s => s.trim()).filter(s => s.length > 0);
}

function glossaryEntries(glossary?: Record<string, string>): [string, string][] {
  return Object.entries(glossary ?? [])
    .map(([term, def]) => [term.trim(), def.trim()] as [string, string])
    .filter(([term, def]) => term.length > 0 && def.length > 0);
}

/**
 * Renders the identity section, or `null` when there is nothing to say.
 * Dated so D5's pre-committed optimize review is self-announcing.
 */
export function generateProductIdentitySection(identity?: ProductIdentity): string | null {
  if (!identity) return null;

  const values = nonEmptyLines(identity.values);
  const taste = nonEmptyLines(identity.taste);
  const glossary = glossaryEntries(identity.glossary);
  if (values.length === 0 && taste.length === 0 && glossary.length === 0) return null;

  const today = new Date().toISOString().slice(0, 10);
  const parts: string[] = ['## Product Identity', '', `_Added ${today} — review at next optimize run_`];

  if (values.length > 0) {
    parts.push('', '### Values', '', ...values.map(v => `- ${v}`));
  }
  if (glossary.length > 0) {
    parts.push('', '### Glossary', '', ...glossary.map(([term, def]) => `- **${term}** — ${def}`));
  }
  if (taste.length > 0) {
    parts.push('', '### Taste', '', ...taste.map(t => `- ${t}`));
  }

  return parts.join('\n');
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

export function generateExternalApiSafetySection(): string {
  return '### External API Safety\n- Read official docs and type definitions before writing code against a third-party SDK\n- Add third-party SDKs as devDependencies so typecheck runs against real types, not stubs\n- Critical integration paths should have a smoke test that validates against the real runtime';
}

/**
 * The CLAUDE.md written for a multi-tool install, following Anthropic's
 * documented pattern for repos that use AGENTS.md with other coding agents:
 * a single shared AGENTS.md imported via `@AGENTS.md`, with a section for
 * Claude-specific additions. Claude Code does not read AGENTS.md natively —
 * the import line is what makes both tools read the same instructions.
 * https://code.claude.com/docs/en/memory ("AGENTS.md")
 */
export function generateClaudeMdPointer(): string {
  return `@AGENTS.md

## Claude Code

_Shared project instructions — boundaries, workflow, architecture — live in \`AGENTS.md\`, imported above so every AI tool reads the same source. Add Claude Code–specific instructions in this section only._
`;
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

function generateArchitectureSection(projectDir?: string): string {
  // With a real directory, emit the check-shaped folder map (D6) — a walk of
  // the actual tree — instead of a hand-maintained prose tree that only drifts.
  if (projectDir) {
    return `## Architecture\n\n${renderFolderMap(projectDir)}`;
  }
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

function generateGettingStartedSection(multiTool = false): string {
  const invocationNote = multiTool
    ? '\n\nSkill names are shared across tools; only the invocation prefix differs: `/joycraft-*` (Claude Code), `$joycraft-*` (Codex), `/skill:joycraft-*` (Pi).'
    : '';
  return `## Getting Started with Joycraft

This project uses [Joycraft](https://github.com/maksutovic/joycraft) for AI development workflow. Available skills:

| Skill | Purpose |
|-------|---------|
| \`/joycraft-setup\` | Start here — the first-run door; sets up and assesses your project |
| \`/joycraft-tune\` | Assess your harness, apply upgrades, see your maturity roadmap |
| \`/joycraft-new-feature\` | Interview -> Feature Brief -> Atomic Specs |
| \`/joycraft-interview\` | Lightweight brainstorm — yap about ideas, get a structured summary |
| \`/joycraft-decompose\` | Break a brief into small, testable specs |
| \`/joycraft-session-end\` | Capture discoveries, verify, commit |
| \`/joycraft-implement-level5\` | Experimental — Level 5 autofix loop, holdout scenarios, scenario evolution |

Run \`/joycraft-tune\` to see where your project stands and what to improve next.${invocationNote}`;
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
  // A folder-map block is machine-owned structure: regenerate it in place
  // (human wording preserved) whenever we know the real directory.
  if (opts?.projectDir && working.includes(FOLDER_MAP_OPEN)) {
    working = ensureFolderMapSection(working, opts.projectDir);
  }
  const sections = parseSections(working);
  const additions: string[] = [];

  if (!hasSection(sections, /behavioral\s*boundar/i)) {
    additions.push(generateBoundariesSection());
  }

  if (!hasSection(sections, /development\s*workflow/i) && !hasSection(sections, /workflow/i)) {
    additions.push(generateWorkflowSection(stack));
  }

  if (!hasSection(sections, /architecture/i)) {
    additions.push(generateArchitectureSection(opts?.projectDir));
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

  if (!hasSection(sections, PRODUCT_IDENTITY_HEADER_PATTERN)) {
    const identitySection = generateProductIdentitySection(opts?.identity);
    if (identitySection) additions.push(identitySection);
  }

  if (existingSkills.length > 0 && !hasSection(sections, /project\s*tools/i)) {
    additions.push(generateProjectToolsSection(existingSkills));
  }

  if (projectHasAreas(opts)) {
    additions.push(generateAreasSection());
  }

  if (additions.length === 0) {
    const unchanged = working === existing ? existing : working;
    return ensureExecutionProfileSection(unchanged, opts?.executionProfile);
  }

  const trimmed = working.trimEnd();
  const merged = trimmed + '\n\n' + additions.join('\n\n') + '\n';
  return ensureExecutionProfileSection(merged, opts?.executionProfile);
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
  ];

  if (opts?.multiTool) {
    lines.push(generateExternalApiSafetySection(), '');
  }

  lines.push(
    generateWorkflowSection(stack),
    '',
    generateArchitectureSection(opts?.projectDir),
    '',
    generateKeyFilesSection(),
    '',
    generateGotchasSection(),
    '',
    generateContextMapSection(),
    '',
    generateGettingStartedSection(opts?.multiTool ?? false),
    '',
  );

  const identitySection = generateProductIdentitySection(opts?.identity);
  if (identitySection) {
    lines.push(identitySection, '');
  }

  if (opts?.executionProfile) {
    lines.push(renderExecutionProfileSection(opts.executionProfile), '');
  }

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
