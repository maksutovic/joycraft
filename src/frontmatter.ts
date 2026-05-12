// Frontmatter helpers for Joycraft artifacts.
// Memory-dir layout follows the Claude Code auto-memory convention:
// $HOME/.claude/projects/<encoded-cwd>/memory/joycraft-owner.txt
// where encoded-cwd is the working directory with slashes replaced by dashes.

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';

export type PersonalStatus = 'active' | 'shipped' | 'deprecated' | 'superseded' | 'draft';
export type BacklogStatus = 'backlog' | 'promoted' | 'pruned';

export interface PersonalFrontmatterInput {
  feature?: string;
  createdISO?: string;
  status?: PersonalStatus;
  owner?: string;
}

export interface SharedFrontmatterInput {
  lastUpdatedISO?: string;
  lastUpdatedBy?: string;
}

export interface BacklogFrontmatterInput {
  source?: string;
  createdISO?: string;
  status?: BacklogStatus;
  owner?: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function quoteIfNeeded(value: string): string {
  // Quote if contains ': ', '#', or has leading/trailing whitespace.
  if (/^\s|\s$/.test(value) || value.includes(': ') || value.includes('#')) {
    // Use double quotes; escape internal double quotes.
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}

function emitYaml(fields: Array<[string, string | undefined]>): string {
  const lines = ['---'];
  for (const [key, value] of fields) {
    if (value === undefined) continue;
    lines.push(`${key}: ${quoteIfNeeded(value)}`);
  }
  lines.push('---');
  return lines.join('\n') + '\n';
}

export function emitPersonalFrontmatter(input: PersonalFrontmatterInput): string {
  return emitYaml([
    ['status', input.status ?? 'active'],
    ['owner', input.owner ?? '<resolved name>'],
    ['created', input.createdISO ?? todayISO()],
    ['feature', input.feature],
  ]);
}

export function emitSharedFrontmatter(input: SharedFrontmatterInput): string {
  return emitYaml([
    ['last_updated', input.lastUpdatedISO ?? todayISO()],
    ['last_updated_by', input.lastUpdatedBy ?? '<resolved name>'],
  ]);
}

export function emitBacklogFrontmatter(input: BacklogFrontmatterInput): string {
  return emitYaml([
    ['status', input.status ?? 'backlog'],
    ['owner', input.owner ?? '<resolved name>'],
    ['created', input.createdISO ?? todayISO()],
    ['source', input.source],
  ]);
}

export interface ParsedFrontmatter {
  frontmatter: Record<string, string> | null;
  body: string;
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

export function parseFrontmatter(content: string): ParsedFrontmatter {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return { frontmatter: null, body: content };
  const block = match[1];
  const fields: Record<string, string> = {};
  for (const line of block.split('\n')) {
    if (!line.trim()) continue;
    const idx = line.indexOf(': ');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 2).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    fields[key] = value;
  }
  const body = content.slice(match[0].length);
  return { frontmatter: fields, body };
}

export interface ResolveOwnerOptions {
  memoryDir?: string;
  // Injectable for testing — defaults to spawning `git config user.name`.
  // Should return the trimmed name on success, or null on any failure / empty result.
  gitConfigName?: () => string | null;
}

function defaultMemoryDir(): string {
  const home = process.env.HOME ?? '';
  const cwd = process.cwd();
  // Match Claude Code auto-memory dir-name encoding: replace slashes with dashes,
  // and prepend a single dash. e.g. /Users/foo/repo → -Users-foo-repo
  const encoded = cwd.replace(/\//g, '-');
  return join(home, '.claude', 'projects', encoded, 'memory');
}

function tryGitConfigName(): string | null {
  try {
    const out = execSync('git config user.name', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
    const name = out.toString().trim();
    return name.length > 0 ? name : null;
  } catch {
    return null;
  }
}

export async function resolveOwner(opts: ResolveOwnerOptions = {}): Promise<string> {
  const memoryDir = opts.memoryDir ?? defaultMemoryDir();
  const memoryFile = join(memoryDir, 'joycraft-owner.txt');

  // 1. git config user.name
  const gitFn = opts.gitConfigName ?? tryGitConfigName;
  const fromGit = gitFn();
  if (fromGit) return fromGit;

  // 2. memory file
  if (existsSync(memoryFile)) {
    const stored = readFileSync(memoryFile, 'utf-8').trim();
    if (stored.length > 0) return stored;
  }

  // 3. prompt user (only if interactive)
  if (!process.stdin.isTTY) {
    throw new Error(
      'Cannot resolve owner non-interactively. Set `git config --global user.name "Your Name"` ' +
      `or pre-populate ${memoryFile}.`
    );
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question('Joycraft owner name (used in artifact frontmatter): ')).trim();
  rl.close();
  if (!answer) {
    throw new Error('Owner name is required.');
  }

  // Persist to memory file.
  mkdirSync(dirname(memoryFile), { recursive: true });
  writeFileSync(memoryFile, answer + '\n', 'utf-8');

  // Nudge to stderr.
  process.stderr.write('tip: set "git config --global user.name" so this doesn\'t ask again.\n');

  return answer;
}
