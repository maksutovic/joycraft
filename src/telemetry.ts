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
  /** The session's working directory, when the transcript records one (Codex session_meta). */
  cwd?: string;
}

export interface DocCounts {
  reads: number;
  mandatedReads: number;
  voluntaryReads: number;
  writes: number;
  sessions: string[];
  /** Present when any contribution came from a shell-string parse (Codex) — counts are best-effort. */
  fidelity?: 'degraded';
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
  /** Codex transcript directory (rollout-*.jsonl). Defaults to the $HOME-derived path. */
  codexDir?: string;
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

// --- Codex parser (degraded fidelity) ----------------------------------------
//
// Codex rollout-*.jsonl records file operations only as `exec_command` shell
// strings, so this parser tokenizes command text and keeps only high-confidence
// patterns: a recognized command with an explicit literal path argument, or an
// output redirect. Anything with variables, substitutions, or unbalanced quoting
// is dropped rather than guessed — best-effort by design, no parity claim.

const CODEX_READ_COMMANDS = new Set(['cat', 'head', 'tail', 'sed', 'grep', 'less', 'more']);

/** Split a shell string into tokens, honoring quotes. Null on unbalanced quoting. */
function tokenizeShell(cmd: string): string[] | null {
  const tokens: string[] = [];
  let current = '';
  let started = false;
  let quote: '"' | "'" | null = null;
  for (const ch of cmd) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      started = true;
      continue;
    }
    if (/\s/.test(ch)) {
      if (started) tokens.push(current);
      current = '';
      started = false;
      continue;
    }
    current += ch;
    started = true;
  }
  if (quote) return null;
  if (started) tokens.push(current);
  return tokens;
}

/** File ops recognized in one pipeline segment; empty when nothing is high-confidence. */
function opsFromSegment(tokens: string[]): FileOp[] {
  if (tokens.length === 0) return [];
  // Variables and substitutions anywhere make the segment untrustworthy.
  if (tokens.some((t) => t.includes('$') || t.includes('`'))) return [];

  const writes: string[] = [];
  const args: string[] = [];
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    const redirect = token.match(/^\d*(>{1,2})(.*)$/);
    if (redirect) {
      const target = redirect[2] || tokens[++i];
      if (target) writes.push(target);
      continue;
    }
    if (!token.startsWith('-')) args.push(token);
  }

  const ops: FileOp[] = [];
  const command = tokens[0];
  if (CODEX_READ_COMMANDS.has(command)) {
    // grep's first non-flag argument is the pattern, sed's is the script — skip it.
    const paths = command === 'grep' || command === 'sed' ? args.slice(1) : args;
    for (const path of paths) ops.push({ kind: 'read', path });
  }
  for (const path of writes) ops.push({ kind: 'write', path });
  return ops;
}

/**
 * Codex JSONL: `session_meta` carries the id and cwd; `response_item` lines hold
 * `function_call` payloads whose `arguments` is a JSON string with the `cmd` text.
 */
export function parseCodexSessionLine(line: string): ParsedLine | null {
  const record = parseJson(line);
  if (!record || typeof record !== 'object') return null;

  if (record.type === 'session_meta') {
    const payload = record.payload;
    const id = typeof payload?.id === 'string' ? payload.id : null;
    const cwd = typeof payload?.cwd === 'string' ? payload.cwd : undefined;
    if (!id && !cwd) return null;
    return { ops: [], sessionId: id, skill: null, cwd };
  }

  const payload = record.payload;
  if (record.type !== 'response_item' || payload?.type !== 'function_call') return null;
  if (payload.name !== 'exec_command' && payload.name !== 'shell') return null;
  const parsedArgs = typeof payload.arguments === 'string' ? parseJson(payload.arguments) : payload.arguments;
  const cmd = parsedArgs?.cmd ?? (Array.isArray(parsedArgs?.command) ? parsedArgs.command.join(' ') : null);
  if (typeof cmd !== 'string' || !cmd) return null;

  // Compound structures (loops, conditionals) are beyond conservative parsing.
  if (/\b(for|while|if|do|done|fi)\b/.test(cmd)) return result([], null, null);

  const ops: FileOp[] = [];
  for (const segment of cmd.split(/\||&&|;/)) {
    const tokens = tokenizeShell(segment.trim());
    if (!tokens) continue;
    ops.push(...opsFromSegment(tokens));
  }
  return result(ops, null, null);
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

/** Codex sessions are global (date-nested, not per-project) — the scan guards on session_meta cwd. */
export function defaultCodexTranscriptDir(): string {
  const home = process.env.HOME ?? '';
  return join(home, '.codex', 'sessions');
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

/** Recursive rollout-*.jsonl listing for Codex's date-nested layout. Depth-capped. */
function listRolloutFiles(dir: string, depth = 0): string[] {
  if (depth > 4) return [];
  try {
    if (!existsSync(dir)) return [];
    const files: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) files.push(...listRolloutFiles(full, depth + 1));
      else if (entry.name.startsWith('rollout-') && entry.name.endsWith('.jsonl')) files.push(full);
    }
    return files.sort();
  } catch {
    return [];
  }
}

interface Accumulator {
  docs: Map<string, DocCounts>;
  sessions: Set<string>;
}

function record(
  acc: Accumulator,
  sessionId: string,
  relPath: string,
  op: FileOp,
  mandated: boolean,
  fidelity?: 'degraded',
): void {
  let counts = acc.docs.get(relPath);
  if (!counts) {
    counts = { reads: 0, mandatedReads: 0, voluntaryReads: 0, writes: 0, sessions: [] };
    acc.docs.set(relPath, counts);
  }
  if (fidelity) counts.fidelity = fidelity;
  if (op.kind === 'write') {
    counts.writes += 1;
  } else {
    counts.reads += 1;
    if (mandated) counts.mandatedReads += 1;
    else counts.voluntaryReads += 1;
  }
  if (!counts.sessions.includes(sessionId)) counts.sessions.push(sessionId);
}

interface SourceProfile {
  /** Codex: skill attribution is unavailable from shell strings — default reads to mandated. */
  forceMandated?: boolean;
  fidelity?: 'degraded';
  /** Codex: sessions are global, so count a file only when its session_meta cwd names this project. */
  requireCwdMatch?: boolean;
}

function scanFile(
  acc: Accumulator,
  projectDir: string,
  filePath: string,
  parse: (line: string) => ParsedLine | null,
  source: SourceProfile = {},
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
  let cwdMatched = !source.requireCwdMatch;
  const pending: Array<{ op: FileOp; mandated: boolean }> = [];

  for (const line of content.split('\n')) {
    const parsed = parse(line);
    if (!parsed) continue;
    if (parsed.sessionId) sessionId = parsed.sessionId;
    if (parsed.skill) activeSkill = parsed.skill;
    if (source.requireCwdMatch && parsed.cwd) {
      if (parsed.cwd !== projectDir) return;
      cwdMatched = true;
    }

    for (const op of parsed.ops) {
      const rel = toRepoRelative(projectDir, op.path);
      if (!rel || !isKnowledgeLayerPath(rel)) continue;
      const mandated = source.forceMandated ? op.kind === 'read' : isMandated(activeSkill, rel);
      pending.push({ op: { kind: op.kind, path: rel }, mandated });
    }
  }

  if (pending.length === 0 || !cwdMatched) return;
  const id = sessionId ?? fallbackId;
  acc.sessions.add(id);
  for (const { op, mandated } of pending) {
    record(acc, id, op.path, op, mandated, source.fidelity);
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

  const codexDir = opts.codexDir ?? defaultCodexTranscriptDir();
  for (const file of listRolloutFiles(codexDir)) {
    scanFile(acc, projectDir, file, parseCodexSessionLine, {
      forceMandated: true,
      fidelity: 'degraded',
      requireCwdMatch: true,
    });
  }

  const docs: Record<string, DocCounts> = {};
  for (const key of [...acc.docs.keys()].sort()) {
    docs[key] = acc.docs.get(key)!;
  }
  return { docs, sessions: [...acc.sessions] };
}
