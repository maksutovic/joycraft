import type { StackInfo } from './detect.js';

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

function generateBoundariesSection(): string {
  return `## Behavioral Boundaries

### ALWAYS
- Run tests and type-check before committing
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

${generateCommandsBlock(stack)}`;
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
| \`/joycraft-tune\` | Assess your harness, apply upgrades, see path to Level 5 |
| \`/joycraft-new-feature\` | Interview -> Feature Brief -> Atomic Specs |
| \`/joycraft-interview\` | Lightweight brainstorm — yap about ideas, get a structured summary |
| \`/joycraft-decompose\` | Break a brief into small, testable specs |
| \`/joycraft-session-end\` | Capture discoveries, verify, commit |
| \`/joycraft-implement-level5\` | Set up Level 5 — autofix loop, holdout scenarios, scenario evolution |

Run \`/joycraft-tune\` to see where your project stands and what to improve next.`;
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

export function improveCLAUDEMd(existing: string, stack: StackInfo): string {
  const sections = parseSections(existing);
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

  if (!hasSection(sections, /external\s*validation/i)) {
    additions.push(generateExternalValidationSection());
  }

  if (additions.length === 0) {
    return existing;
  }

  // Append missing sections
  const trimmed = existing.trimEnd();
  return trimmed + '\n\n' + additions.join('\n\n') + '\n';
}

export function generateCLAUDEMd(projectName: string, stack: StackInfo): string {
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
    generateGettingStartedSection(),
    '',
  ];

  return lines.join('\n');
}
