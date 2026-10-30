import { createHash } from 'node:crypto';

const states = new Set(['open', 'clarified', 'backlogged', 'discarded', 'assigned']);
const digest = value => createHash('sha256').update(value).digest('hex');
const nonempty = value => typeof value === 'string' && value.trim().length > 0;

/** Maximum UTF-16 code units accepted for a human decision note. */
export const MAX_NOTE_LENGTH = 4_000;

function readValueEnd(text, start, limit) {
  let quoted = false, escaped = false, depth = 0;
  for (let index = start; index < limit; index += 1) {
    const char = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === '{' || char === '[') depth += 1;
    else if (char === '}' || char === ']') {
      depth -= 1;
      if (depth === 0) return index + 1;
    } else if (depth === 0 && (char === ',' || /\s/.test(char))) return index;
  }
  return limit;
}

function decisionSpans(text, start, end) {
  const spans = [];
  let index = start + 1;
  while (index < end - 1) {
    while (/\s/.test(text[index])) index += 1;
    if (text[index] === ']') break;
    const valueStart = index;
    const valueEnd = readValueEnd(text, valueStart, end);
    spans.push({ start: valueStart, end: valueEnd });
    index = valueEnd;
    while (/\s/.test(text[index])) index += 1;
    if (text[index] === ',') index += 1;
    else if (text[index] !== ']') throw new Error('Malformed decisions array');
  }
  return spans;
}

/** Read the documented JSON flow array without interpreting/reformatting other YAML. */
export function readBrief(text) {
  if (typeof text !== 'string') throw new Error('Brief text must be a string');
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!frontmatter) throw new Error('Brief needs YAML frontmatter');
  const body = frontmatter[1];
  const keys = [...body.matchAll(/^decisions:[ \t]*/gm)];
  if (keys.length !== 1) throw new Error('Expected one top-level decisions: JSON flow array');
  const start = frontmatter[0].indexOf(body) + keys[0].index + keys[0][0].length;
  if (text[start] !== '[') throw new Error('decisions: must use the documented JSON flow array');
  let depth = 0, quoted = false, escaped = false, end = -1;
  for (let index = start; index < frontmatter[0].length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === '[') depth += 1;
    else if (char === ']' && --depth === 0) { end = index + 1; break; }
  }
  if (end < 0 || !/^[ \t]*(?:\r?\n|$)/.test(text.slice(end))) throw new Error('Malformed decisions array');
  let decisions;
  try { decisions = JSON.parse(text.slice(start, end)); }
  catch { throw new Error('Malformed decisions JSON'); }
  if (!Array.isArray(decisions)) throw new Error('decisions: must be a JSON array');
  const spans = decisionSpans(text, start, end);
  if (spans.length !== decisions.length) throw new Error('Malformed decisions array');
  const ids = new Set();
  for (const decision of decisions) {
    if (!decision || typeof decision !== 'object' || Array.isArray(decision) || !nonempty(decision.id) || ids.has(decision.id) || !states.has(decision.status)) {
      throw new Error('Invalid or duplicate decision ID/status');
    }
    ids.add(decision.id);
  }
  return { text, decisions, start, end, spans, revision: digest(text) };
}

function validateOptionalString(value, name) {
  if (value !== undefined && typeof value !== 'string') throw new Error(`${name} must be a string`);
}

function displayedDecision(brief, id) {
  const index = brief.decisions.findIndex(item => item.id === id);
  const decision = brief.decisions[index];
  if (!decision || !nonempty(decision.question) || !Array.isArray(decision.options) || decision.options.length < 2 ||
      !Array.isArray(decision.affected) || !decision.affected.every(nonempty)) {
    throw new Error('Displayed decision needs question, options and affected references');
  }
  for (const field of ['why', 'context', 'details']) validateOptionalString(decision[field], `Decision ${field}`);
  const values = new Set();
  for (const option of decision.options) {
    if (!option || typeof option !== 'object' || Array.isArray(option) || !nonempty(option.value) || !nonempty(option.label) || values.has(option.value)) {
      throw new Error('Invalid decision options');
    }
    validateOptionalString(option.description, 'Option description');
    if (option.requiresNote !== undefined && typeof option.requiresNote !== 'boolean') throw new Error('Option requiresNote must be boolean');
    values.add(option.value);
  }
  if (!(decision.answer === null || values.has(decision.answer)) || (decision.status === 'clarified' && decision.answer === null)) {
    throw new Error('Invalid decision answer');
  }
  validateOptionalString(decision.note, 'Decision note');
  if (decision.note !== undefined && decision.note.length > MAX_NOTE_LENGTH) throw new Error('Decision note is too long');
  return { decision, index };
}

function publicQuestion(decision) {
  const question = {
    id: decision.id,
    question: decision.question,
    options: decision.options.map(option => {
      const result = { value: option.value, label: option.label };
      if (option.description !== undefined) result.description = option.description;
      if (option.requiresNote !== undefined) result.requiresNote = option.requiresNote;
      return result;
    }),
    affected: [...decision.affected],
    status: decision.status,
    answer: decision.answer
  };
  for (const field of ['why', 'context', 'details']) if (decision[field] !== undefined) question[field] = decision[field];
  if (decision.note !== undefined) question.note = decision.note;
  return question;
}

/** Return a render-safe view of requested decisions, including settled choices. */
export function questionsFromBrief(text, ids) {
  const brief = readBrief(text);
  if (ids !== undefined && (!Array.isArray(ids) || ids.some(id => !nonempty(id)) || new Set(ids).size !== ids.length)) {
    throw new Error('Question IDs must be unique non-empty strings');
  }
  const requested = ids === undefined ? brief.decisions.map(decision => decision.id) : ids;
  const questions = requested.map(id => publicQuestion(displayedDecision(brief, id).decision));
  return { revision: brief.revision, questions };
}

/** Select an explicitly requested decision, or the first unanswered choice. */
export function selectPreviewDecision(brief, id) {
  if (!brief || !Array.isArray(brief.decisions)) throw new Error('Invalid brief');
  if (id) return displayedDecision(brief, id).decision;
  const decision = brief.decisions.find(item => ['open', 'assigned'].includes(item.status) && item.answer === null);
  return decision ? displayedDecision(brief, decision.id).decision : null;
}

function responseNote(response) {
  if (!Object.hasOwn(response, 'note') || response.note === undefined) return undefined;
  if (typeof response.note !== 'string') throw new Error('Decision note must be a string');
  if (response.note.length > MAX_NOTE_LENGTH) throw new Error('Decision note is too long');
  return response.note;
}

function sameAnswer(decision, answer, note) {
  return decision.answer === answer && decision.note === note;
}

/**
 * Atomically save one or more canonical decision answers. Every response is
 * validated before the JSON spans are replaced, so failures leave `text` intact.
 */
export function saveAnswers(text, request) {
  const brief = readBrief(text);
  if (!request || typeof request !== 'object' || Array.isArray(request) || request.revision !== brief.revision || !Array.isArray(request.answers) || request.answers.length === 0) {
    throw new Error(request?.revision !== brief.revision ? 'Brief changed. Reload before choosing.' : 'Answers must be a non-empty array');
  }
  const ids = new Set();
  const changes = [];
  for (const response of request.answers) {
    if (!response || typeof response !== 'object' || Array.isArray(response) || !nonempty(response.id) || !nonempty(response.answer) || ids.has(response.id)) {
      throw new Error('Responses need unique decision IDs and choices');
    }
    ids.add(response.id);
    const { decision, index } = displayedDecision(brief, response.id);
    const option = decision.options.find(item => item.value === response.answer);
    if (!option) throw new Error('Unknown choice');
    const note = responseNote(response);
    if (option.requiresNote && !nonempty(note)) throw new Error('This choice requires a note');
    if (sameAnswer(decision, response.answer, note)) continue;
    if (!['open', 'assigned'].includes(decision.status)) throw new Error('Reopen the decision explicitly before changing its answer.');
    const updated = { ...decision, answer: response.answer, status: 'clarified' };
    if (note === undefined) delete updated.note;
    else updated.note = note;
    changes.push({ index, updated });
  }
  if (changes.length === 0) return text;
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  let updatedText = text;
  for (const change of changes.sort((left, right) => right.index - left.index)) {
    const span = brief.spans[change.index];
    const json = JSON.stringify(change.updated, null, 2).replaceAll('\n', newline);
    updatedText = updatedText.slice(0, span.start) + json + updatedText.slice(span.end);
  }
  return updatedText;
}

/** Legacy single-answer convenience API. */
export function saveAnswer(text, { id, answer, revision, note } = {}) {
  const response = { id, answer };
  if (note !== undefined) response.note = note;
  const updated = saveAnswers(text, { revision, answers: [response] });
  if (updated === text) return text;
  // Preserve the established preview writer's stable, whole-array formatting.
  // New batch callers use saveAnswers and retain every untouched decision span.
  const brief = readBrief(updated);
  const newline = updated.includes('\r\n') ? '\r\n' : '\n';
  const json = JSON.stringify(brief.decisions, null, 2).replaceAll('\n', newline);
  return updated.slice(0, brief.start) + json + updated.slice(brief.end);
}
