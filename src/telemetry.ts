// Read-telemetry scanner for the knowledge layer.
//
// Parses AI-harness session transcripts into per-document read/write counts so
// optimize's Reaper pass can cite evidence instead of judgment. Read-only and
// network-free: nothing here writes a file, and no transcript content ever
// reaches the result — paths and counters only.
//
// Transcript layouts (derived at runtime from $HOME + dash-encoded cwd, never
// shipped as literal absolute paths — the src/frontmatter.ts defaultMemoryDir idiom):
//   Claude Code: $HOME/.claude/projects/<cwd-with-slashes-as-dashes>/*.jsonl
//   Pi:          $HOME/.pi/agent/sessions/--<cwd-with-slashes-as-dashes>--/*.jsonl

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, isAbsolute, sep } from 'node:path';

export type FileOpKind = 'read' | 'write';

export interface FileOp {
  kind: FileOpKind;
  path: string;
}

/** What one transcript line contributes: file ops, a session id, an active-skill change. */
export interface ParsedLine {
  ops: FileOp[];
  sessionId: string | null;
  skill: string | null;
}

export interface DocCounts {
  reads: number;
  mandatedReads: number;
  voluntaryReads: number;
  writes: number;
  sessions: string[];
}

export interface ScanResult {
  docs: Record<string, DocCounts>;
  sessions: string[];
}

export interface ScanOptions {
  /** Claude Code transcript directory. Defaults to the $HOME-derived path. */
  claudeDir?: string;
  /** Pi transcript directory. Defaults to the $HOME-derived path. */
  piDir?: string;
}

// --- knowledge-layer filter -------------------------------------------------

const KNOWLEDGE_PREFIXES = ['docs/context/', 'docs/discoveries/', 'docs/reference/'];
const KNOWLEDGE_FILES = ['AGENTS.md', 'CLAUDE.md'];

/** True for the five knowledge-layer shapes, given a repo-relative POSIX path. */
export function isKnowledgeLayerPath(relPath: string): boolean {
  if (KNOWLEDGE_FILES.includes(relPath)) return true;
  return KNOWLEDGE_PREFIXES.some((prefix) => relPath.startsWith(prefix) && relPath.length > prefix.length);
}

// --- mandated/voluntary classification --------------------------------------

// A read is `mandated` when the active skill's own text opens that doc: session-end
// Step 1b routes to the context docs, add-fact Step 2b overlap-greps them, optimize's
// Reaper pass reads the whole knowledge layer. Everything else is `voluntary` — the
// agent followed a pointer mid-task, which is the only evidence that earns keep/retire.
const MANDATING_SKILLS: Record<string, (relPath: string) => boolean> = {
  'joycraft-session-end': (p) => p.startsWith('docs/context/') || p.startsWith('docs/discoveries/'),
  'joycraft-add-fact': (p) => p.startsWith('docs/context/'),
  'joycraft-optimize': () => true,
};

function isMandated(activeSkill: string | null, relPath: string): boolean {
  if (!activeSkill) return false;
  const predicate = MANDATING_SKILLS[activeSkill];
  return predicate ? predicate(relPath) : false;
}

// --- per-harness line parsers -----------------------------------------------

function parseJson(line: string): any | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function result(ops: FileOp[], sessionId: string | null, skill: string | null): ParsedLine | null {
  if (ops.length === 0 && !sessionId && !skill) return null;
  return { ops, sessionId, skill };
}

const CLAUDE_READ_TOOLS = new Set(['Read', 'NotebookRead']);
const CLAUDE_WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

/**
 * Claude Code JSONL: `tool_use` blocks inside `message.content`, with the path on
 * `input.file_path`, and skill invocations as a `Skill` tool_use.
 */
export function parseClaudeSessionLine(line: string): ParsedLine | null {
  const record = parseJson(line);
  if (!record || typeof record !== 'object') return null;

  const sessionId = typeof record.sessionId === 'string' ? record.sessionId : null;
  const content = record.message?.content;
  const ops: FileOp[] = [];
  let skill: string | null = null;

  if (Array.isArray(content)) {
    for (const block of content) {
      if (!block || typeof block !== 'object' || block.type !== 'tool_use') continue;
      const name = block.name;
      if (name === 'Skill') {
        const invoked = block.input?.skill;
        if (typeof invoked === 'string') skill = invoked;
        continue;
      }
      const filePath = block.input?.file_path;
      if (typeof filePath !== 'string' || !filePath) continue;
      if (CLAUDE_READ_TOOLS.has(name)) ops.push({ kind: 'read', path: filePath });
      else if (CLAUDE_WRITE_TOOLS.has(name)) ops.push({ kind: 'write', path: filePath });
    }
  }

  return result(ops, sessionId, skill);
}

const PI_READ_TOOLS = new Set(['read']);
const PI_WRITE_TOOLS = new Set(['write', 'edit', 'multi_edit']);
const PI_SKILL_RE = /^\s*\/skill:([A-Za-z0-9._-]+)/;

/**
 * Pi JSONL: typed events. `session` carries the id; `message` events hold
 * `toolCall` blocks whose path lives on `arguments.path` (or `arguments.o[].p`
 * for `batch_read`). Skills are invoked by a `/skill:<name>` user message.
 */
export function parsePiSessionLine(line: string): ParsedLine | null {
  const record = parseJson(line);
  if (!record || typeof record !== 'object') return null;

  if (record.type === 'session') {
    const id = typeof record.id === 'string' ? record.id : null;
    return result([], id, null);
  }
  if (record.type !== 'message') return null;

  const message = record.message;
  const content = message?.content;
  const ops: FileOp[] = [];
  let skill: string | null = null;

  if (Array.isArray(content)) {
    for (const block of content) {
      if (!block || typeof block !== 'object') continue;

      if (block.type === 'text' && message?.role === 'user' && typeof block.text === 'string') {
        const match = block.text.match(PI_SKILL_RE);
        if (match) skill = match[1];
        continue;
      }

      if (block.type !== 'toolCall') continue;
      const name = block.name;
      const args = block.arguments;

      if (name === 'batch_read' && Array.isArray(args?.o)) {
        for (const entry of args.o) {
          if (entry && typeof entry === 'object' && typeof entry.p === 'string' && entry.p) {
            ops.push({ kind: entry.o === 'write' || entry.o === 'edit' ? 'write' : 'read', path: entry.p });
          }
        }
        continue;
      }

      const filePath = args?.path;
      if (typeof filePath !== 'string' || !filePath) continue;
      if (PI_READ_TOOLS.has(name)) ops.push({ kind: 'read', path: filePath });
      else if (PI_WRITE_TOOLS.has(name)) ops.push({ kind: 'write', path: filePath });
    }
  }

  return result(ops, null, skill);
}

// --- default transcript locations -------------------------------------------

function encodedCwd(projectDir: string): string {
  return projectDir.replace(/\//g, '-');
}

export function defaultClaudeTranscriptDir(projectDir: string): string {
  const home = process.env.HOME ?? '';
  return join(home, '.claude', 'projects', encodedCwd(projectDir));
}

export function defaultPiTranscriptDir(projectDir: string): string {
  const home = process.env.HOME ?? '';
  return join(home, '.pi', 'agent', 'sessions', `-${encodedCwd(projectDir)}--`);
}

// --- scan -------------------------------------------------------------------

/** Repo-relative POSIX path, or null when the op is outside the project. */
function toRepoRelative(projectDir: string, filePath: string): string | null {
  const absolute = isAbsolute(filePath) ? filePath : join(projectDir, filePath);
  const rel = relative(projectDir, absolute);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null;
  return rel.split(sep).join('/');
}

function listSessionFiles(dir: string): string[] {
  try {
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((name) => name.endsWith('.jsonl'))
      .sort()
      .map((name) => join(dir, name));
  } catch {
    return [];
  }
}

interface Accumulator {
  docs: Map<string, DocCounts>;
  sessions: Set<string>;
}

function record(acc: Accumulator, sessionId: string, relPath: string, op: FileOp, mandated: boolean): void {
  let counts = acc.docs.get(relPath);
  if (!counts) {
    counts = { reads: 0, mandatedReads: 0, voluntaryReads: 0, writes: 0, sessions: [] };
    acc.docs.set(relPath, counts);
  }
  if (op.kind === 'write') {
    counts.writes += 1;
  } else {
    counts.reads += 1;
    if (mandated) counts.mandatedReads += 1;
    else counts.voluntaryReads += 1;
  }
  if (!counts.sessions.includes(sessionId)) counts.sessions.push(sessionId);
}

function scanFile(
  acc: Accumulator,
  projectDir: string,
  filePath: string,
  parse: (line: string) => ParsedLine | null,
): void {
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return;
  }

  // Fall back to the file's own name as the session id — Pi names its files
  // <timestamp>_<uuid>.jsonl and Claude names them <sessionId>.jsonl, so a
  // transcript whose id line is missing or truncated still attributes.
  const fallbackId = filePath.split(sep).pop()!.replace(/\.jsonl$/, '');
  let sessionId: string | null = null;
  let activeSkill: string | null = null;
  const pending: Array<{ op: FileOp; mandated: boolean }> = [];

  for (const line of content.split('\n')) {
    const parsed = parse(line);
    if (!parsed) continue;
    if (parsed.sessionId) sessionId = parsed.sessionId;
    if (parsed.skill) activeSkill = parsed.skill;

    for (const op of parsed.ops) {
      const rel = toRepoRelative(projectDir, op.path);
      if (!rel || !isKnowledgeLayerPath(rel)) continue;
      pending.push({ op: { kind: op.kind, path: rel }, mandated: isMandated(activeSkill, rel) });
    }
  }

  if (pending.length === 0) return;
  const id = sessionId ?? fallbackId;
  acc.sessions.add(id);
  for (const { op, mandated } of pending) {
    record(acc, id, op.path, op, mandated);
  }
}

/**
 * Scan a project's Claude and Pi transcripts into per-document counts for the
 * knowledge layer. Missing transcript directories yield an empty contribution;
 * malformed lines and unreadable files are skipped, never thrown.
 */
export async function scanTranscripts(projectDir: string, opts: ScanOptions = {}): Promise<ScanResult> {
  const acc: Accumulator = { docs: new Map(), sessions: new Set() };

  const claudeDir = opts.claudeDir ?? defaultClaudeTranscriptDir(projectDir);
  for (const file of listSessionFiles(claudeDir)) {
    scanFile(acc, projectDir, file, parseClaudeSessionLine);
  }

  const piDir = opts.piDir ?? defaultPiTranscriptDir(projectDir);
  for (const file of listSessionFiles(piDir)) {
    scanFile(acc, projectDir, file, parsePiSessionLine);
  }

  const docs: Record<string, DocCounts> = {};
  for (const key of [...acc.docs.keys()].sort()) {
    docs[key] = acc.docs.get(key)!;
  }
  return { docs, sessions: [...acc.sessions] };
}
