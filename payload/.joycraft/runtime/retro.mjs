import { readFile, lstat, mkdir, writeFile, rename, chmod, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { TextDecoder } from 'node:util';
import { redact } from './redact.mjs';

const PREVIEW_BYTES = 1_024;
const sha256 = value => createHash('sha256').update(value).digest('hex');
const plain = value => typeof value === 'string' ? value : '';
const safeString = value => value === null || value === undefined ? null : redact(String(value));
const at = (object, ...paths) => paths.map(path => path.split('.').reduce((value, key) => value && typeof value === 'object' ? value[key] : undefined, object)).find(value => value !== undefined);
const textBlocks = content => Array.isArray(content) ? content.filter(block => block && typeof block === 'object' && (block.type === 'text' || block.type === 'input_text' || block.type === 'output_text')).map(block => plain(block.text)).join('') : plain(content);
const preview = text => {
  const safe = redact(text); const bytes = Buffer.byteLength(safe); const cut = Buffer.from(safe).subarray(0, PREVIEW_BYTES).toString('utf8');
  return { text: cut, partial: bytes > PREVIEW_BYTES, byteCount: Buffer.byteLength(text) };
};
const stamp = record => at(record, 'timestamp', 'ts', 'time', 'payload.timestamp') ?? null;

function gap(state, kind, line, raw) { state.gaps.push({ kind, line, sha256: sha256(raw) }); }
function addTool(state, kind, value, line, raw, timestamp) {
  const rawCallId = plain(at(value, 'id', 'tool_use_id', 'call_id', 'tool_call_id')) || null;
  const callId = safeString(rawCallId);
  const name = safeString(at(value, 'name', 'function.name'));
  const payload = kind === 'call' ? at(value, 'input', 'arguments', 'function.arguments') : at(value, 'content', 'output', 'result');
  const original = typeof payload === 'string' ? payload : payload === undefined ? '' : JSON.stringify(payload);
  const observedError = at(value, 'is_error', 'isError', 'error');
  const entry = { eventType: safeString(value.type) || (kind === 'call' ? 'tool_call' : 'tool_result'), name, callId, observedAt: safeString(timestamp), source: { line, sha256: sha256(raw) }, isError: typeof observedError === 'boolean' ? observedError : null, exitCode: Number.isInteger(at(value, 'exit_code', 'exitCode')) ? at(value, 'exit_code', 'exitCode') : null, durationMs: typeof at(value, 'duration_ms', 'durationMs') === 'number' ? at(value, 'duration_ms', 'durationMs') : null, ...(kind === 'call' ? { input: preview(original), output: null } : { input: null, output: preview(original) }) };
  if (kind === 'call') { const key = rawCallId || `line:${line}`; const pending = state.calls.get(key) ?? []; pending.push(entry); state.calls.set(key, pending); } else {
    const pending = rawCallId && state.calls.get(rawCallId); const call = pending?.shift();
    if (call) { entry.name ||= call.name; call.output = entry.output; call.resultSource = entry.source; call.resultObservedAt = safeString(timestamp); }
    else state.unmatchedResults++;
    state.tools.push(entry);
  }
  if (kind === 'call') state.tools.push(entry);
}

function message(state, role, text, line, raw, timestamp, transport = 'canonical') {
  if (!text) return;
  state.messages.push({ role, text: redact(text), line, observedAt: safeString(timestamp), source: { line, sha256: sha256(raw) }, transport, _key: text });
}

function consumeClaude(state, record, line, raw) {
  if (!['user', 'assistant'].includes(record.type)) return false;
  const role = plain(at(record, 'message.role', 'role'));
  const content = at(record, 'message.content', 'content');
  if (role !== record.type || content === undefined) { state.unsupported++; gap(state, 'unsupported', line, raw); return true; }
  if (!Array.isArray(content) && typeof content !== 'string') { state.unsupported++; gap(state, 'unsupported', line, raw); return true; }
  const timestamp = stamp(record); const blocks = Array.isArray(content) ? content : [{ type: 'text', text: content }];
  let text = '';
  for (const block of blocks) {
    if (!block || typeof block !== 'object') { state.unsupported++; gap(state, 'unsupported', line, raw); continue; }
    if (block.type === 'tool_use') addTool(state, 'call', block, line, raw, timestamp);
    else if (block.type === 'tool_result') addTool(state, 'result', block, line, raw, timestamp);
    else if (block.type === 'thinking' || block.type === 'redacted_thinking') state.omittedReasoning++;
    else if (block.type === 'text' && typeof block.text === 'string') text += block.text;
    else { state.unsupported++; gap(state, 'unsupported', line, raw); }
  }
  message(state, role, text, line, raw, timestamp); return true;
}

function consumeCodex(state, record, line, raw) {
  const item = record.type === 'response_item' ? (record.payload ?? record.item ?? record.response_item) : null;
  if (!item || typeof item !== 'object') return false;
  const timestamp = stamp(record); const type = item.type;
  if (type === 'function_call') { addTool(state, 'call', item, line, raw, timestamp); return true; }
  if (type === 'function_call_output') { addTool(state, 'result', item, line, raw, timestamp); return true; }
  if (type === 'reasoning') { state.omittedReasoning++; return true; }
  if (type !== 'message') { state.unsupported++; gap(state, 'unsupported', line, raw); return true; }
  const role = plain(item.role); const content = item.content ?? item.input_text ?? item.output_text;
  if (item.channel === 'analysis' && role === 'assistant') { state.omittedReasoning++; return true; }
  if (!['user', 'assistant'].includes(role)) { state.unsupported++; gap(state, 'unsupported', line, raw); return true; }
  if (typeof content === 'string') message(state, role, content, line, raw, timestamp);
  else if (Array.isArray(content)) { if (content.some(block => !block || typeof block !== 'object' || !['text', 'input_text', 'output_text'].includes(block.type) || typeof block.text !== 'string')) { state.unsupported++; gap(state, 'unsupported', line, raw); } message(state, role, textBlocks(content), line, raw, timestamp); }
  else { state.unsupported++; gap(state, 'unsupported', line, raw); }
  return true;
}

function consumeEvent(state, record, line, raw) {
  if (record.type !== 'event_msg') return false;
  const event = record.payload ?? record.event ?? record; const type = plain(event.type);
  if (type === 'agent_reasoning') { state.omittedReasoning++; return true; }
  if (['token_count', 'turn_started', 'turn_completed'].includes(type)) { state.metadata++; return true; }
  if (!['user_message', 'agent_message'].includes(type)) return false;
  const role = type === 'user_message' ? 'user' : 'assistant';
  const candidate = at(event, 'message', 'text', 'content');
  const text = typeof candidate === 'string' ? candidate : textBlocks(at(event, 'message.content', 'content'));
  if (text) message(state, role, text, line, raw, stamp(record), 'event_msg'); else { state.unsupported++; gap(state, 'unsupported', line, raw); }
  return true;
}

function routineMetadata(state, record) {
  // These native envelopes contain delivery/accounting state, not dialogue.
  // Keep their presence visible without treating them as missing conversation.
  if (new Set(['session_meta', 'turn_context', 'token_count', 'rate_limits', 'response_completed', 'turn_completed']).has(record.type)) { state.metadata++; return true; }
  return false;
}

export function prepareRecords(sourceText, { fromLine = 1, toLine, sourceSha256 } = {}) {
  const lines = sourceText.split(/\r?\n/); if (lines.at(-1) === '') lines.pop();
  const last = lines.length;
  if (last === 0 && fromLine === 1 && toLine === undefined) return { messages: [], tools: [], coverage: { schemaVersion: 1, source: { sha256: sourceSha256 ?? sha256(sourceText), totalLines: 0, selectedLines: { from: null, to: null } }, counts: { parsed: 0, skipped: 0, malformed: 0, unknown: 0, unsupported: 0, metadata: 0, omittedReasoning: 0, unmatchedCalls: 0, unmatchedResults: 0, deduplicated: 0 }, gaps: [], complete: true, limits: { previewBytes: PREVIEW_BYTES, scope: 'This is a normalized selected physical-line range from one explicit source file, not full session or worker coverage.', selectedRangeOnly: true, redaction: 'Pattern redaction is applied to messages and previews; it is not comprehensive.', reasoning: 'Thinking/reasoning blocks are omitted.', deduplication: 'Only an event fallback exactly matching role, original text, and timestamp of a canonical message is deduplicated.' } } };
  toLine ??= last;
  if (!Number.isInteger(fromLine) || !Number.isInteger(toLine) || fromLine < 1 || toLine < fromLine || toLine > last) throw new Error('invalid-line-range');
  const state = { messages: [], tools: [], calls: new Map(), parsed: 0, skipped: 0, malformed: 0, unknown: 0, unsupported: 0, metadata: 0, omittedReasoning: 0, unmatchedResults: 0, gaps: [] };
  for (let index = fromLine - 1; index < toLine; index++) {
    const raw = lines[index]; if (!raw.trim()) { state.skipped++; continue; }
    // A UTF-8 BOM is transport framing, but still belongs to the exact source hash.
    let record; try { record = JSON.parse(index === 0 ? raw.replace(/^\uFEFF/, '') : raw); } catch { state.malformed++; gap(state, 'malformed', index + 1, raw); continue; }
    state.parsed++;
    if (!record || typeof record !== 'object' || Array.isArray(record)) { state.unknown++; gap(state, 'unknown', index + 1, raw); continue; }
    const handled = consumeClaude(state, record, index + 1, raw) || consumeCodex(state, record, index + 1, raw) || consumeEvent(state, record, index + 1, raw) || routineMetadata(state, record);
    if (!handled) { state.unknown++; gap(state, 'unknown', index + 1, raw); }
  }
  // An event fallback only yields to an exact canonical transport echo with a
  // shared timestamp. Without that binding, repeated human messages stay visible.
  const canonical = new Set(state.messages.filter(item => item.transport === 'canonical' && item.observedAt !== null).map(item => `${item.role}\u0000${item.observedAt}\u0000${item._key}`));
  const kept = state.messages.filter(item => item.transport !== 'event_msg' || item.observedAt === null || !canonical.has(`${item.role}\u0000${item.observedAt}\u0000${item._key}`));
  const deduplicated = state.messages.length - kept.length;
  const unmatchedCalls = state.tools.filter(tool => tool.input && !tool.output).length;
  const incomplete = state.malformed > 0 || state.unknown > 0 || state.unsupported > 0;
  return { messages: kept.map(({ transport, _key, ...item }) => item), tools: state.tools, coverage: { schemaVersion: 1, source: { sha256: sourceSha256 ?? sha256(sourceText), totalLines: last, selectedLines: { from: fromLine, to: toLine } }, counts: { parsed: state.parsed, skipped: state.skipped, malformed: state.malformed, unknown: state.unknown, unsupported: state.unsupported, metadata: state.metadata, omittedReasoning: state.omittedReasoning, unmatchedCalls, unmatchedResults: state.unmatchedResults, deduplicated }, gaps: state.gaps, complete: !incomplete, limits: { previewBytes: PREVIEW_BYTES, scope: 'This is a normalized selected physical-line range from one explicit source file, not full session or worker coverage.', selectedRangeOnly: true, redaction: 'Pattern redaction is applied to messages and previews; it is not comprehensive.', reasoning: 'Thinking/reasoning blocks are omitted.', deduplication: 'Only an event fallback exactly matching role, original text, and timestamp of a canonical message is deduplicated.' } } };
}

const markdown = messages => messages.map(item => `## ${item.role}\n\n_Source: line ${item.source.line}; sha256 ${item.source.sha256}; observedAt ${item.observedAt ?? 'unknown'}_\n\n${item.text}\n`).join('');
async function refusePath(path, kind) { try { await lstat(path); throw new Error(`${kind}-exists`); } catch (error) { if (error.code !== 'ENOENT') throw error; } }

export async function prepareRetro({ source, out, fromLine = 1, toLine } = {}) {
  if (typeof source !== 'string' || typeof out !== 'string' || !source || !out) throw new Error('source-and-out-required');
  const sourcePath = resolve(source); const outPath = resolve(out); if (sourcePath === outPath) throw new Error('output-must-not-be-source');
  const stat = await lstat(sourcePath); if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('invalid-source');
  await refusePath(outPath, 'output');
  const parent = dirname(outPath); const parentStat = await lstat(parent); if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) throw new Error('invalid-output-parent');
  const sourceBytes = await readFile(sourcePath); let sourceText;
  try { sourceText = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(sourceBytes); } catch { throw new Error('invalid-utf8-source'); }
  const prepared = prepareRecords(sourceText, { fromLine, toLine, sourceSha256: sha256(sourceBytes) });
  const temp = `${outPath}.tmp-${randomUUID()}`; await mkdir(temp, { mode: 0o700 });
  try {
    await writeFile(resolve(temp, 'conversation.md'), markdown(prepared.messages), { mode: 0o600 });
    await writeFile(resolve(temp, 'tools.jsonl'), prepared.tools.map(value => JSON.stringify(value)).join('\n') + (prepared.tools.length ? '\n' : ''), { mode: 0o600 });
    await writeFile(resolve(temp, 'coverage.json'), JSON.stringify(prepared.coverage, null, 2) + '\n', { mode: 0o600 });
    await chmod(temp, 0o700); await rename(temp, outPath);
  } catch (error) { await rm(temp, { recursive: true, force: true }); throw error; }
  return { out: outPath, ...prepared };
}

function cli(argv) {
  const [command, ...parts] = argv; if (command !== 'prepare') throw new Error('Usage: retro.mjs prepare --source <jsonl> --out <new-directory> [--from-line N --to-line N]');
  const flags = {}; for (let index = 0; index < parts.length; index += 2) { if (!['--source', '--out', '--from-line', '--to-line'].includes(parts[index]) || flags[parts[index]] !== undefined || parts[index + 1] === undefined) throw new Error('invalid-arguments'); flags[parts[index]] = parts[index + 1]; }
  return prepareRetro({ source: flags['--source'], out: flags['--out'], fromLine: flags['--from-line'] === undefined ? 1 : Number(flags['--from-line']), toLine: flags['--to-line'] === undefined ? undefined : Number(flags['--to-line']) });
}
if (import.meta.url === new URL(process.argv[1], 'file:').href) cli(process.argv.slice(2)).then(result => process.stdout.write(`${JSON.stringify({ out: result.out, coverage: result.coverage })}\n`)).catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
