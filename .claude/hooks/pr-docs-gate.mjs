// PreToolUse hook (Bash): block `gh pr create` until docs are synced.
// Delegates to scripts/check-docs-sync.mjs — same logic CI runs, so what
// passes here passes there. Exit 2 blocks the command and feeds stderr to Claude.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

let input = '';
try { input = readFileSync(0, 'utf-8'); } catch {}
let command = '';
try { command = JSON.parse(input)?.tool_input?.command ?? ''; } catch {}

// Match `gh pr create` only in command position (line start, or after ; && || | $( ),
// not inside a quoted string that merely mentions it.
if (!/(?:^|[;&|]\s*|\(\s*)gh\s+pr\s+create\b/m.test(command)) process.exit(0);

// Body text: inline --body/-b, or a --body-file/-F path. Heredoc bodies show
// up inline in the command string, which is what we want.
const args = ['scripts/check-docs-sync.mjs'];
const fileMatch = command.match(/(?:--body-file|-F)\s+(["']?)([^\s"']+)\1/);
if (fileMatch && existsSync(fileMatch[2])) args.push('--body-file', fileMatch[2]);
else args.push('--body', command);

const res = spawnSync(process.execPath, args, { encoding: 'utf-8' });
if (res.status === 0) process.exit(0);
process.stderr.write(res.stderr || res.stdout || 'docs-sync gate failed');
process.exit(2);
