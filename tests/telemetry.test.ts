import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import {
  scanTranscripts,
  parseClaudeSessionLine,
  parsePiSessionLine,
  isKnowledgeLayerPath,
} from '../src/telemetry';

const fixtures = join(__dirname, 'fixtures', 'transcripts');
const claudeDir = join(fixtures, 'claude');
const piDir = join(fixtures, 'pi');
const PROJECT = '/repo';

describe('isKnowledgeLayerPath', () => {
  it('accepts the five knowledge-layer shapes', () => {
    expect(isKnowledgeLayerPath('docs/context/decision-log.md')).toBe(true);
    expect(isKnowledgeLayerPath('docs/discoveries/2026-09-01-x.md')).toBe(true);
    expect(isKnowledgeLayerPath('docs/reference/knowledge-lifecycle.md')).toBe(true);
    expect(isKnowledgeLayerPath('AGENTS.md')).toBe(true);
    expect(isKnowledgeLayerPath('CLAUDE.md')).toBe(true);
  });

  it('rejects everything else', () => {
    expect(isKnowledgeLayerPath('src/foo.ts')).toBe(false);
    expect(isKnowledgeLayerPath('docs/features/x/brief.md')).toBe(false);
    expect(isKnowledgeLayerPath('nested/AGENTS.md')).toBe(false);
  });
});

describe('parseClaudeSessionLine', () => {
  it('extracts file_path from a Read tool_use block', () => {
    const line = JSON.stringify({
      type: 'assistant',
      sessionId: 's1',
      message: {
        role: 'assistant',
        content: [{ type: 'tool_use', name: 'Read', input: { file_path: '/repo/AGENTS.md' } }],
      },
    });
    expect(parseClaudeSessionLine(line)).toEqual({
      ops: [{ kind: 'read', path: '/repo/AGENTS.md' }],
      sessionId: 's1',
      skill: null,
    });
  });

  it('extracts writes from Write and Edit blocks', () => {
    const write = JSON.stringify({
      type: 'assistant',
      message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Write', input: { file_path: 'CLAUDE.md' } }] },
    });
    const edit = JSON.stringify({
      type: 'assistant',
      message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Edit', input: { file_path: 'CLAUDE.md' } }] },
    });
    expect(parseClaudeSessionLine(write)?.ops).toEqual([{ kind: 'write', path: 'CLAUDE.md' }]);
    expect(parseClaudeSessionLine(edit)?.ops).toEqual([{ kind: 'write', path: 'CLAUDE.md' }]);
  });

  it('reports a Skill invocation as the active skill', () => {
    const line = JSON.stringify({
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [{ type: 'tool_use', name: 'Skill', input: { skill: 'joycraft-session-end' } }],
      },
    });
    expect(parseClaudeSessionLine(line)?.skill).toBe('joycraft-session-end');
  });

  it('returns null for malformed or irrelevant lines', () => {
    expect(parseClaudeSessionLine('not json {{{')).toBeNull();
    expect(parseClaudeSessionLine('')).toBeNull();
    expect(parseClaudeSessionLine(JSON.stringify({ type: 'summary' }))).toBeNull();
  });

  it('ignores non-file tools such as Bash', () => {
    const line = JSON.stringify({
      type: 'assistant',
      message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Bash', input: { command: 'cat AGENTS.md' } }] },
    });
    expect(parseClaudeSessionLine(line)).toBeNull();
  });
});

describe('parsePiSessionLine', () => {
  it('extracts a read from a typed toolCall event', () => {
    const line = JSON.stringify({
      type: 'message',
      message: {
        role: 'assistant',
        content: [{ type: 'toolCall', name: 'read', arguments: { path: '/repo/docs/context/decision-log.md' } }],
      },
    });
    expect(parsePiSessionLine(line)?.ops).toEqual([
      { kind: 'read', path: '/repo/docs/context/decision-log.md' },
    ]);
  });

  it('extracts writes from write and edit toolCalls', () => {
    const w = JSON.stringify({
      type: 'message',
      message: { role: 'assistant', content: [{ type: 'toolCall', name: 'write', arguments: { path: 'CLAUDE.md' } }] },
    });
    const e = JSON.stringify({
      type: 'message',
      message: { role: 'assistant', content: [{ type: 'toolCall', name: 'edit', arguments: { path: 'CLAUDE.md' } }] },
    });
    expect(parsePiSessionLine(w)?.ops).toEqual([{ kind: 'write', path: 'CLAUDE.md' }]);
    expect(parsePiSessionLine(e)?.ops).toEqual([{ kind: 'write', path: 'CLAUDE.md' }]);
  });

  it('expands batch_read into one read per entry', () => {
    const line = JSON.stringify({
      type: 'message',
      message: {
        role: 'assistant',
        content: [
          {
            type: 'toolCall',
            name: 'batch_read',
            arguments: { o: [{ o: 'read', p: 'AGENTS.md' }, { o: 'read', p: 'src/x.ts' }] },
          },
        ],
      },
    });
    expect(parsePiSessionLine(line)?.ops).toEqual([
      { kind: 'read', path: 'AGENTS.md' },
      { kind: 'read', path: 'src/x.ts' },
    ]);
  });

  it('reports the session id from a session event', () => {
    const line = JSON.stringify({ type: 'session', version: 3, id: 'pi-sess-one', cwd: '/repo' });
    expect(parsePiSessionLine(line)?.sessionId).toBe('pi-sess-one');
  });

  it('reports a /skill: user message as the active skill', () => {
    const line = JSON.stringify({
      type: 'message',
      message: { role: 'user', content: [{ type: 'text', text: '/skill:joycraft-add-fact' }] },
    });
    expect(parsePiSessionLine(line)?.skill).toBe('joycraft-add-fact');
  });

  it('returns null for malformed lines', () => {
    expect(parsePiSessionLine('}{ garbage')).toBeNull();
  });
});

describe('scanTranscripts', () => {
  it('returns per-doc counts keyed by repo-relative path', async () => {
    const result = await scanTranscripts(PROJECT, { claudeDir, piDir });

    expect(result.docs['docs/context/decision-log.md']).toBeDefined();
    const dl = result.docs['docs/context/decision-log.md'];
    // sess-alpha: 1 voluntary read (pre-skill), 1 mandated read (post session-end), 1 write.
    // pi-sess-one: 1 voluntary read.
    expect(dl.writes).toBe(1);
    expect(dl.mandatedReads).toBe(1);
    expect(dl.voluntaryReads).toBe(2);
    expect(dl.sessions.sort()).toEqual(['pi-sess-one', 'sess-alpha']);
  });

  it('tags every read either mandated or voluntary', async () => {
    const result = await scanTranscripts(PROJECT, { claudeDir, piDir });
    for (const [path, counts] of Object.entries(result.docs)) {
      expect(counts.mandatedReads + counts.voluntaryReads, `untagged reads for ${path}`).toBe(
        counts.reads
      );
      expect(counts.mandatedReads).toBeGreaterThanOrEqual(0);
      expect(counts.voluntaryReads).toBeGreaterThanOrEqual(0);
    }
  });

  it('tags a read under an active mandating skill as mandated', async () => {
    const result = await scanTranscripts(PROJECT, { claudeDir, piDir });
    // add-fact mandates the context docs it overlap-greps (Pi fixture, post /skill:joycraft-add-fact).
    expect(result.docs['docs/context/institutional-knowledge.md'].mandatedReads).toBe(1);
    expect(result.docs['docs/context/institutional-knowledge.md'].voluntaryReads).toBe(0);
  });

  it('excludes non-knowledge-layer paths', async () => {
    const result = await scanTranscripts(PROJECT, { claudeDir, piDir });
    expect(result.docs['src/foo.ts']).toBeUndefined();
    expect(result.docs['src/detect.ts']).toBeUndefined();
    expect(result.docs['src/init.ts']).toBeUndefined();
    expect(Object.keys(result.docs).every((p) => isKnowledgeLayerPath(p))).toBe(true);
  });

  it('counts Claude Write/Edit ops as writes', async () => {
    const result = await scanTranscripts(PROJECT, { claudeDir, piDir: join(fixtures, 'no-pi') });
    expect(result.docs['docs/discoveries/2026-09-01-thing.md'].writes).toBe(1);
  });

  it('parses Pi transcripts (edit of a bare relative path)', async () => {
    const result = await scanTranscripts(PROJECT, { claudeDir: join(fixtures, 'no-claude'), piDir });
    expect(result.docs['CLAUDE.md'].writes).toBe(1);
  });

  it('normalizes absolute paths inside the project to repo-relative keys', async () => {
    const result = await scanTranscripts(PROJECT, { claudeDir, piDir: join(fixtures, 'no-pi') });
    expect(result.docs['docs/context/decision-log.md']).toBeDefined();
    expect(Object.keys(result.docs).some((p) => p.startsWith('/'))).toBe(false);
  });

  it('ignores paths outside the project directory', async () => {
    const result = await scanTranscripts(PROJECT, { claudeDir, piDir: join(fixtures, 'no-pi') });
    expect(Object.keys(result.docs).some((p) => p.includes('elsewhere'))).toBe(false);
  });

  it('skips malformed and truncated lines without throwing', async () => {
    const result = await scanTranscripts(PROJECT, { claudeDir, piDir: join(fixtures, 'no-pi') });
    // sess-beta has a garbage line and a truncated final line; the good lines still count.
    expect(result.docs['AGENTS.md'].reads).toBe(1);
    expect(result.docs['docs/reference/knowledge-lifecycle.md'].reads).toBe(1);
  });

  it('records session ids and counts each session file once', async () => {
    const result = await scanTranscripts(PROJECT, { claudeDir, piDir });
    expect(result.sessions.sort()).toEqual(['pi-sess-one', 'sess-alpha', 'sess-beta']);
  });

  it('returns an empty result when a transcript dir is missing', async () => {
    const result = await scanTranscripts(PROJECT, {
      claudeDir: join(fixtures, 'does-not-exist'),
      piDir: join(fixtures, 'also-missing'),
    });
    expect(result.docs).toEqual({});
    expect(result.sessions).toEqual([]);
  });

  it('does not touch $HOME when both dirs are injected', async () => {
    const originalHome = process.env.HOME;
    process.env.HOME = '/nonexistent-home-for-telemetry-test';
    try {
      const result = await scanTranscripts(PROJECT, { claudeDir, piDir });
      expect(Object.keys(result.docs).length).toBeGreaterThan(0);
    } finally {
      process.env.HOME = originalHome;
    }
  });

  it('skips unreadable session files rather than throwing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'joycraft-telemetry-'));
    writeFileSync(join(dir, 'broken.jsonl'), '  not-jsonl\n');
    const result = await scanTranscripts(PROJECT, { claudeDir: dir, piDir: join(fixtures, 'no-pi') });
    expect(result.docs).toEqual({});
  });

  it('counts repeated reads of the same doc but records its session once', async () => {
    const result = await scanTranscripts(PROJECT, { claudeDir, piDir: join(fixtures, 'no-pi') });
    const dl = result.docs['docs/context/decision-log.md'];
    expect(dl.reads).toBe(2);
    expect(dl.sessions).toEqual(['sess-alpha']);
  });

  it('carries no transcript content in the result', async () => {
    const result = await scanTranscripts(PROJECT, { claudeDir, piDir });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('wrap up the session');
    expect(serialized).not.toContain('old_string');
  });
});
