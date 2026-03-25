import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface SafeguardConfig {
  denyPatterns: string[];
}

/**
 * Generate default deny patterns from common dangerous operations.
 */
export function getDefaultDenyPatterns(): string[] {
  return [
    'rm\\s+-rf\\s+/',          // rm -rf with absolute path
    'rm\\s+-rf\\s+\\.',        // rm -rf . or ./
    'git\\s+push\\s+--force',  // force push
    'git\\s+push\\s+-f\\b',    // force push shorthand
    'git\\s+reset\\s+--hard',  // hard reset
    'DROP\\s+TABLE',           // SQL drop
    'DROP\\s+DATABASE',        // SQL drop
    'TRUNCATE',                // SQL truncate
    'chmod\\s+777',            // wide-open permissions
    'curl.*\\|.*sh',           // pipe curl to shell
    'wget.*\\|.*sh',           // pipe wget to shell
  ];
}

/**
 * Generate the hook script that blocks dangerous Bash commands.
 */
export function generateHookScript(): string {
  return `#!/bin/bash
# Joycraft Safeguard — PreToolUse hook
# Blocks dangerous Bash commands. Exit 2 = block the action.
# Edit deny-patterns.txt to customize what's blocked.

TOOL_NAME="$1"
# Read the full tool input from stdin
INPUT=$(cat)

# Only check Bash commands
if [ "$TOOL_NAME" != "Bash" ]; then
  exit 0
fi

# Extract the command from the JSON input
COMMAND=$(echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | sed 's/"command":"//;s/"$//')

if [ -z "$COMMAND" ]; then
  exit 0
fi

PATTERNS_FILE="$(dirname "$0")/deny-patterns.txt"

if [ ! -f "$PATTERNS_FILE" ]; then
  exit 0
fi

while IFS= read -r pattern || [ -n "$pattern" ]; do
  # Skip empty lines and comments
  [ -z "$pattern" ] && continue
  [[ "$pattern" == \\#* ]] && continue

  if echo "$COMMAND" | grep -qEi "$pattern"; then
    echo "Blocked by Joycraft Safeguard: command matches deny pattern '$pattern'"
    echo "Edit .claude/hooks/joycraft/deny-patterns.txt to modify blocked patterns."
    exit 2
  fi
done < "$PATTERNS_FILE"

exit 0
`;
}

/**
 * Generate deny-patterns.txt content from default patterns + custom patterns.
 */
export function generateDenyPatternsFile(customPatterns: string[] = []): string {
  const lines = [
    '# Joycraft Safeguard — Deny Patterns',
    '# One regex pattern per line. Lines starting with # are comments.',
    '# Commands matching any pattern will be blocked (exit 2).',
    '# Edit this file to customize what\'s blocked.',
    '',
    '# Destructive file operations',
    'rm\\s+-rf\\s+/',
    'rm\\s+-rf\\s+\\.',
    '',
    '# Dangerous git operations',
    'git\\s+push\\s+--force',
    'git\\s+push\\s+-f\\b',
    'git\\s+reset\\s+--hard',
    '',
    '# SQL destruction',
    'DROP\\s+TABLE',
    'DROP\\s+DATABASE',
    'TRUNCATE',
    '',
    '# System security',
    'chmod\\s+777',
    'curl.*\\|.*sh',
    'wget.*\\|.*sh',
  ];

  if (customPatterns.length > 0) {
    lines.push('');
    lines.push('# Project-specific patterns (from risk interview)');
    for (const p of customPatterns) {
      lines.push(p);
    }
  }

  return lines.join('\n') + '\n';
}

/**
 * Install safeguard hooks into a project.
 */
export function installSafeguardHooks(
  targetDir: string,
  customPatterns: string[] = [],
  force: boolean = false
): { created: string[]; skipped: string[] } {
  const result = { created: [] as string[], skipped: [] as string[] };
  const hooksDir = join(targetDir, '.claude', 'hooks', 'joycraft');

  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, { recursive: true });
  }

  // Write hook script
  const hookPath = join(hooksDir, 'block-dangerous.sh');
  if (!existsSync(hookPath) || force) {
    writeFileSync(hookPath, generateHookScript(), { mode: 0o755 });
    result.created.push(hookPath);
  } else {
    result.skipped.push(hookPath);
  }

  // Write deny patterns
  const patternsPath = join(hooksDir, 'deny-patterns.txt');
  if (!existsSync(patternsPath) || force) {
    writeFileSync(patternsPath, generateDenyPatternsFile(customPatterns));
    result.created.push(patternsPath);
  } else {
    result.skipped.push(patternsPath);
  }

  // Register hook in settings.json
  const settingsPath = join(targetDir, '.claude', 'settings.json');
  let settings: Record<string, unknown> = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    } catch {}
  }

  if (!settings.hooks) settings.hooks = {};
  const hooks = settings.hooks as Record<string, unknown[]>;
  if (!hooks.PreToolUse) hooks.PreToolUse = [];

  const preToolUse = hooks.PreToolUse as Array<Record<string, unknown>>;
  const hasJoycraftHook = preToolUse.some(h => {
    const innerHooks = h.hooks as Array<Record<string, unknown>> | undefined;
    return innerHooks?.some(ih => typeof ih.command === 'string' && ih.command.includes('joycraft'));
  });

  if (!hasJoycraftHook) {
    preToolUse.push({
      matcher: 'Bash',
      hooks: [{
        type: 'command',
        command: '.claude/hooks/joycraft/block-dangerous.sh',
      }],
    });
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
  }

  return result;
}
