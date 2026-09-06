// Persistence for the read-telemetry scanner (src/telemetry.ts).
//
// Accumulates scan results into a machine-local, gitignored store at
// docs/.joycraft/telemetry.json — repo-relative doc paths, counters, and
// namespaced scanned-session ids only, never transcript content. Sessions
// already in the scanned list are skipped, so each transcript file is parsed
// once and counters accumulate across invocations.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  scanTranscripts,
  defaultClaudeTranscriptDir,
  defaultPiTranscriptDir,
  defaultCodexTranscriptDir,
  defaultOmpTranscriptDir,
  type DocCounts,
} from './telemetry.js';

/** Repo-relative store location, beside docs/.joycraft/state.json. Gitignored under every profile. */
export const TELEMETRY_PATH = 'docs/.joycraft/telemetry.json';

export interface TelemetryStore {
  version: 1;
  /** Namespaced ids (`claude:<id>`, `pi:<id>`, `codex:<id>`, `omp:<id>`) of sessions already counted. */
  scannedSessions: string[];
  docs: Record<string, DocCounts>;
}

export interface TelemetryScanOptions {
  claudeDir?: string;
  piDir?: string;
  codexDir?: string;
  ompDir?: string;
  /** Store file location. Defaults to `<projectDir>/docs/.joycraft/telemetry.json`. */
  storePath?: string;
}

export interface TelemetryScanResult {
  status: 'ok' | 'nothing-to-scan';
  newSessions: number;
  docCount: number;
  storePath: string;
  /** True when an existing store was unreadable and replaced. */
  rebuiltStore?: boolean;
}

/** Parse an existing store, or null when absent or malformed. */
export function loadTelemetryStore(storePath: string): TelemetryStore | null {
  try {
    const parsed = JSON.parse(readFileSync(storePath, 'utf-8'));
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version !== 1 || !Array.isArray(parsed.scannedSessions) || typeof parsed.docs !== 'object') {
      return null;
    }
    return parsed as TelemetryStore;
  } catch {
    return null;
  }
}

function emptyStore(): TelemetryStore {
  return { version: 1, scannedSessions: [], docs: {} };
}

function mergeDocCounts(into: TelemetryStore, docs: Record<string, DocCounts>): void {
  for (const [path, counts] of Object.entries(docs)) {
    const existing = into.docs[path];
    if (!existing) {
      into.docs[path] = {
        reads: counts.reads,
        mandatedReads: counts.mandatedReads,
        voluntaryReads: counts.voluntaryReads,
        writes: counts.writes,
        sessions: [...counts.sessions],
        ...(counts.fidelity ? { fidelity: counts.fidelity } : {}),
      };
      continue;
    }
    existing.reads += counts.reads;
    existing.mandatedReads += counts.mandatedReads;
    existing.voluntaryReads += counts.voluntaryReads;
    existing.writes += counts.writes;
    for (const session of counts.sessions) {
      if (!existing.sessions.includes(session)) existing.sessions.push(session);
    }
    if (counts.fidelity) existing.fidelity = counts.fidelity;
  }
}

/** Write temp + rename so concurrent runs are last-writer-wins, never torn JSON. */
function saveStore(storePath: string, store: TelemetryStore): void {
  mkdirSync(dirname(storePath), { recursive: true });
  const sortedDocs: Record<string, DocCounts> = {};
  for (const key of Object.keys(store.docs).sort()) sortedDocs[key] = store.docs[key];
  const payload = { version: store.version, scannedSessions: [...store.scannedSessions].sort(), docs: sortedDocs };
  const tmp = `${storePath}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(payload, null, 2) + '\n', 'utf-8');
  renameSync(tmp, storePath);
}

/**
 * Scan this project's transcripts and accumulate the result into the store.
 * Missing transcript dirs report `nothing-to-scan`; a malformed store is
 * rebuilt rather than crashed on.
 */
export async function runTelemetryScan(
  projectDir: string,
  opts: TelemetryScanOptions = {},
): Promise<TelemetryScanResult> {
  const storePath = opts.storePath ?? join(projectDir, TELEMETRY_PATH);

  const claudeDir = opts.claudeDir ?? defaultClaudeTranscriptDir(projectDir);
  const piDir = opts.piDir ?? defaultPiTranscriptDir(projectDir);
  const codexDir = opts.codexDir ?? defaultCodexTranscriptDir();
  const ompDir = opts.ompDir ?? defaultOmpTranscriptDir(projectDir);

  const existing = loadTelemetryStore(storePath);
  const rebuiltStore = existing === null && existsSync(storePath);
  const store = existing ?? emptyStore();

  if (![claudeDir, piDir, codexDir, ompDir].some((dir) => existsSync(dir))) {
    return { status: 'nothing-to-scan', newSessions: 0, docCount: Object.keys(store.docs).length, storePath };
  }

  const scan = await scanTranscripts(projectDir, {
    claudeDir,
    piDir,
    codexDir,
    ompDir,
    namespaceSessions: true,
    excludeSessions: new Set(store.scannedSessions),
  });

  mergeDocCounts(store, scan.docs);
  for (const session of scan.sessions) {
    if (!store.scannedSessions.includes(session)) store.scannedSessions.push(session);
  }
  saveStore(storePath, store);

  return {
    status: 'ok',
    newSessions: scan.sessions.length,
    docCount: Object.keys(store.docs).length,
    storePath,
    ...(rebuiltStore ? { rebuiltStore: true } : {}),
  };
}

/** One-line summary for the CLI. */
export function formatTelemetrySummary(result: TelemetryScanResult): string {
  if (result.status === 'nothing-to-scan') {
    return 'Telemetry: nothing to scan — no transcript directories found for this project.';
  }
  const rebuilt = result.rebuiltStore ? ' (previous store was malformed and rebuilt)' : '';
  return `Telemetry: ${result.newSessions} new session(s) scanned, ${result.docCount} doc(s) tracked → ${TELEMETRY_PATH}${rebuilt}`;
}
