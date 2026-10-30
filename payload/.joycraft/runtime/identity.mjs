import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { captureChangeScope, validateChangeScope } from './scope.mjs';

const statuses = ['todo', 'in-review', 'done'];
const kinds = ['code', 'requirement', 'check', 'fixture'];
const evidenceKinds = ['runtime', 'visual', 'structural'];
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const nonempty = value => typeof value === 'string' && value.trim().length > 0;
export const isSha256 = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

const nativeIdentityMaxLength = 512;

function nativeIdentityString(value, label) {
  requireValue(typeof value === 'string' && value.length > 0 && value.length <= nativeIdentityMaxLength && value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value), `${label} must be a nonempty, bounded, trim-stable string without control characters`);
}

/**
 * Native identity is host-adapter attestation. The runtime validates record
 * shape only; it does not establish authenticity or classify opaque IDs.
 */
export function validateNativeActor(actor, label = 'Native actor') {
  requireValue(isObject(actor), `${label} must be an object`);
  nativeIdentityString(actor.host, `${label} host`);
  nativeIdentityString(actor.sessionId, `${label} sessionId`);
  if (actor.agentId !== undefined) {
    nativeIdentityString(actor.agentId, `${label} agentId`);
  }
  return actor.agentId === undefined
    ? { host: actor.host, sessionId: actor.sessionId }
    : { host: actor.host, sessionId: actor.sessionId, agentId: actor.agentId };
}

/** Root actors omit agentId; a child actor must carry the host-issued ID. */
export function nativeActorTuple(actor) {
  const valid = validateNativeActor(actor);
  // Host adapters identify themselves case-insensitively. Session and child
  // identities remain opaque host-provided values and are never normalized.
  return [valid.host.toLowerCase(), valid.sessionId, valid.agentId ?? null];
}

export function sameNativeActor(left, right) {
  return canonical(nativeActorTuple(left)) === canonical(nativeActorTuple(right));
}

/**
 * Validate the role-attested independent-review identity shared by completion
 * and session-end archival. This is intentionally an integrity check, not a
 * cryptographic authentication service.
 */
export function validateIndependentReview(report) {
  requireValue(nonempty(report?.implementerSessionId) && isObject(report?.reviewer) && nonempty(report.reviewer.sessionId), 'Report needs implementer and reviewer session IDs');
  const hasImplementerActor = report.implementerActor !== undefined;
  const hasReviewerActor = report.reviewer.actor !== undefined;
  requireValue(hasImplementerActor === hasReviewerActor, 'Native implementer and reviewer actors must be reported together');
  if (hasImplementerActor) {
    const implementerActor = validateNativeActor(report.implementerActor, 'Implementer actor');
    const reviewerActor = validateNativeActor(report.reviewer.actor, 'Reviewer actor');
    requireValue(implementerActor.sessionId === report.implementerSessionId, 'Implementer actor sessionId must match implementerSessionId');
    requireValue(reviewerActor.sessionId === report.reviewer.sessionId, 'Reviewer actor sessionId must match reviewer.sessionId');
    requireValue(!sameNativeActor(implementerActor, reviewerActor), 'An independent reviewer must have a distinct native actor');
    if (implementerActor.host.toLowerCase() === reviewerActor.host.toLowerCase() && implementerActor.sessionId === reviewerActor.sessionId) {
      requireValue(reviewerActor.agentId !== undefined, 'A reviewer sharing the implementer root session needs its host-issued child identity');
      requireValue(implementerActor.agentId !== reviewerActor.agentId, 'A reviewer sharing the implementer root session needs a distinct child identity');
    }
  } else {
    requireValue(report.reviewer.sessionId !== report.implementerSessionId, 'An independent reviewer with a distinct session ID is required');
  }
  requireValue(report.reviewer.independent === true, 'An independent reviewer is required');
  requireValue(report.reviewer.scopeReviewed === true, 'Independent reviewer must attest scope completeness');
}

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (isObject(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

export function relativePath(value) {
  requireValue(nonempty(value) && !value.includes('\\') && !value.includes('\0'), 'Expected a nonempty project-relative path such as docs/features/example/brief.md');
  requireValue(!path.posix.isAbsolute(value) && !/^[a-z]:/i.test(value), `Expected a project-relative path; use a path relative to the project root, such as docs/features/example/brief.md, not absolute path: ${value}`);
  requireValue(!value.split('/').includes('..'), `Parent traversal is not allowed: ${value}`);
  const normalized = path.posix.normalize(value);
  requireValue(normalized !== '.' && !normalized.endsWith('/'), `Expected a file path: ${value}`);
  return normalized;
}

// Reject symlinks on either read or write paths; the helper only owns local files.
export function localPath(root, value, allowMissing = false) {
  const relative = relativePath(value);
  let current = realpathSync(root);
  const parts = relative.split('/');
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    let stat;
    try { stat = lstatSync(current); } catch (error) {
      if (allowMissing && error.code === 'ENOENT') return path.join(realpathSync(root), relative);
      throw error;
    }
    requireValue(!stat.isSymbolicLink(), `Symlink paths are not supported: ${relative}`);
    requireValue(i === parts.length - 1 ? stat.isFile() : stat.isDirectory(), `Not a plain ${i === parts.length - 1 ? 'file' : 'directory'}: ${relative}`);
  }
  return current;
}

export function readLocal(root, value) {
  return readFileSync(localPath(root, value));
}

/** Validate an intentionally absent local input without relaxing path safety. */
export function requireAbsent(root, value) {
  const relative = relativePath(value);
  localPath(root, relative, true);
  requireValue(!existsSync(path.join(root, relative)), `Verification input declared absent exists: ${relative}`);
}

export function parseJson(bytes, label) {
  try { return JSON.parse(bytes.toString('utf8')); } catch { throw new Error(`Invalid JSON: ${label}`); }
}

export function validateCriteria(criteria) {
  requireValue(Array.isArray(criteria) && criteria.length > 0, 'Verification needs at least one criterion');
  const ids = new Set();
  for (const criterion of criteria) {
    requireValue(isObject(criterion) && nonempty(criterion.id) && !ids.has(criterion.id), 'Criterion IDs must be nonempty and unique');
    ids.add(criterion.id);
    requireValue(isObject(criterion.requirement) && nonempty(criterion.requirement.anchor), `Criterion ${criterion.id} needs a requirement anchor`);
    relativePath(criterion.requirement.path);
    requireValue(Array.isArray(criterion.requiredKinds) && criterion.requiredKinds.length > 0 && criterion.requiredKinds.every(kind => evidenceKinds.includes(kind)) && new Set(criterion.requiredKinds).size === criterion.requiredKinds.length, `Invalid required evidence kinds: ${criterion.id}`);
  }
}

function validateScope(scope, label) {
  requireValue(isObject(scope), `${label} scope must be an object`);
  requireValue(Object.keys(scope).every(key => key === 'anchors' || key === 'decisionIds'), `${label} scope has an unknown selector key`);
  const anchors = scope.anchors;
  const decisionIds = scope.decisionIds;
  requireValue((anchors === undefined || (Array.isArray(anchors) && anchors.length > 0 && anchors.every(nonempty) && new Set(anchors).size === anchors.length)) &&
    (decisionIds === undefined || (Array.isArray(decisionIds) && decisionIds.length > 0 && decisionIds.every(nonempty) && new Set(decisionIds).size === decisionIds.length)) &&
    (anchors !== undefined || decisionIds !== undefined), `${label} scope needs nonempty unique anchors or decisionIds`);
  return {
    ...(anchors === undefined ? {} : { anchors: [...anchors] }),
    ...(decisionIds === undefined ? {} : { decisionIds: [...decisionIds] }),
  };
}

/** `select` limits criteria checks to the specs being worked on, so a sibling
 * spec's unfinished criteria never block dispatch or review of another spec. */
export function validateQueue(queue, { select } = {}) {
  requireValue(isObject(queue) && queue.schemaVersion === 1, 'Unsupported or missing queue schemaVersion');
  requireValue(nonempty(queue.feature) && Array.isArray(queue.specs) && queue.specs.length > 0, 'Queue needs a feature and specs');
  const ids = new Set();
  const files = new Set();
  for (const spec of queue.specs) {
    requireValue(isObject(spec) && Number.isSafeInteger(spec.id) && spec.id >= 0 && !ids.has(spec.id), 'Spec IDs must be unique nonnegative integers');
    ids.add(spec.id);
    const file = relativePath(spec.file);
    requireValue(!files.has(file), `Duplicate spec file: ${file}`);
    files.add(file);
    requireValue(statuses.includes(spec.status), `Invalid status for spec ${spec.id}`);
    requireValue(['batch', 'checkpoint', 'isolated'].includes(spec.mode), `Invalid mode for spec ${spec.id}`);
    if (spec.execution !== undefined) {
      requireValue(isObject(spec.execution) && Object.keys(spec.execution).every(key => key === 'parallel') && typeof spec.execution.parallel === 'boolean', `Invalid execution plan for spec ${spec.id}; parallel must be a boolean`);
    }
    requireValue(Array.isArray(spec.depends_on) && spec.depends_on.every(Number.isSafeInteger) && !spec.depends_on.includes(spec.id) && new Set(spec.depends_on).size === spec.depends_on.length, `Invalid dependencies for spec ${spec.id}`);
    requireValue(isObject(spec.verification) && Array.isArray(spec.verification.inputs), `Missing verification scope for spec ${spec.id}`);
    if (!select || select(spec)) validateCriteria(spec.verification.criteria);
    const inputs = new Set();
    for (const [inputIndex, input] of spec.verification.inputs.entries()) {
      requireValue(isObject(input) && kinds.includes(input.kind), `Invalid verification input at index ${inputIndex} for spec ${spec.id}: kind must be one of code, requirement, check, fixture; got ${JSON.stringify(input?.kind)}`);
      const inputPath = relativePath(input.path);
      requireValue(!inputs.has(inputPath), `Duplicate verification input: ${inputPath}`);
      inputs.add(inputPath);
      if (input.scope !== undefined) {
        requireValue(input.kind === 'requirement', `Only requirement inputs may have a scope: ${inputPath}`);
        validateScope(input.scope, `Verification input ${inputPath}`);
      }
      if (input.state !== undefined) requireValue(input.state === 'absent' && input.kind !== 'requirement', `Verification input ${inputPath} at index ${inputIndex} may use state: absent only for code, check or fixture inputs`);
    }
    if (spec.verification.changeScope !== undefined) validateChangeScope(spec.verification.changeScope, relativePath);
    if (spec.acceptedReport !== undefined) {
      requireValue(isObject(spec.acceptedReport) && isSha256(spec.acceptedReport.sha256), `Invalid accepted report for spec ${spec.id}`);
      relativePath(spec.acceptedReport.path);
    }
    if (spec.ownerAcceptance !== undefined) {
      requireValue(spec.acceptedReport === undefined, `Spec ${spec.id} cannot have both a PASS acceptance and an owner acceptance`);
      requireValue(isObject(spec.ownerAcceptance) && isSha256(spec.ownerAcceptance.sha256), `Invalid owner acceptance for spec ${spec.id}`);
      relativePath(spec.ownerAcceptance.path);
    }
  }
  for (const spec of queue.specs) requireValue(spec.depends_on.every(id => ids.has(id)), `Unknown dependency for spec ${spec.id}`);
}

export function specStatus(bytes) {
  const text = bytes.toString('utf8');
  const frontmatter = /^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  requireValue(frontmatter, 'Spec needs YAML frontmatter');
  const entries = [...frontmatter[1].matchAll(/^status:[ \t]*(?:([a-z-]+)|'([a-z-]+)'|"([a-z-]+)")([ \t]*(?:#[^\r\n]*)?)\r?$/gm)];
  const declarations = [...frontmatter[1].matchAll(/^status\s*:/gm)];
  requireValue(entries.length === 1 && declarations.length === 1, 'Spec needs exactly one plain top-level status');
  const entry = entries[0];
  const status = entry[1] ?? entry[2] ?? entry[3];
  requireValue(statuses.includes(status), `Invalid spec frontmatter status: ${status}`);
  const valueIndex = frontmatter.index + frontmatter[0].indexOf(frontmatter[1]) + entry.index + entry[0].indexOf(status);
  return { status, replace: value => text.slice(0, valueIndex) + value + text.slice(valueIndex + status.length) };
}

export function readQueue({ root = process.cwd(), queuePath, specId }) {
  queuePath = relativePath(queuePath);
  const queueBytes = readLocal(root, queuePath);
  const queue = parseJson(queueBytes, queuePath);
  validateQueue(queue, { select: item => item.id === specId });
  const spec = queue.specs.find(item => item.id === specId);
  requireValue(spec, `Spec ${specId} does not exist in queue`);
  const specPath = path.posix.join(path.posix.dirname(queuePath), spec.file);
  const specBytes = readLocal(root, specPath);
  const status = specStatus(specBytes);
  requireValue(status.status === spec.status, `Queue/spec status disagreement for spec ${specId}; restore consistency before proceeding`);
  return { queuePath, queue, queueBytes, spec, specPath, specBytes, status };
}

export function subjectIdentity(subject) {
  const { identity, ...fields } = subject;
  return sha256(canonical(fields));
}

/** Queue status and completion receipt metadata do not change reviewed requirements. */
function queueSpecRequirements(spec) {
  const requirements = { ...spec };
  delete requirements.status;
  delete requirements.acceptedReport;
  delete requirements.ownerAcceptance;
  return requirements;
}

export function normalizedQueueForSubject(queue) {
  return canonical({ ...queue, specs: queue.specs.map(queueSpecRequirements) });
}

export function boundQueueForSubject(queue, specId) {
  const byId = new Map(queue.specs.map(spec => [spec.id, spec]));
  const included = new Set();
  const include = id => {
    requireValue(byId.has(id), `Unknown dependency ${id}`);
    if (included.has(id)) return;
    included.add(id);
    for (const dependency of byId.get(id).depends_on) include(dependency);
  };
  include(specId);
  const specIds = [...included].sort((left, right) => left - right);
  const specs = queue.specs.filter(spec => included.has(spec.id)).map(queueSpecRequirements);
  return { specIds, value: canonical({ ...queue, specs }) };
}

function markdownHeadingId(line) {
  const match = /^(#{1,6})[ \t]+(.+?)[ \t]*$/.exec(line);
  if (!match) return null;
  const explicit = /\s+\{#([^}\s]+)\}\s*$/.exec(match[2]);
  const title = (explicit ? match[2].slice(0, explicit.index) : match[2]).trim();
  const slug = title.toLowerCase().replace(/[`*_~]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return { level: match[1].length, id: explicit?.[1] ?? slug, line };
}

function markdownHeadings(lines, cursor, inputPath) {
  const headings = [];
  let fence = null;
  for (let index = cursor; index < lines.length; index += 1) {
    const line = lines[index].replace(/\r?\n$/, '');
    const marker = /^(?: {0,3})(`{3,}|~{3,})/.exec(line);
    if (fence) {
      if (marker && marker[1][0] === fence.character && marker[1].length >= fence.length) fence = null;
      continue;
    }
    if (marker) { fence = { character: marker[1][0], length: marker[1].length }; continue; }
    const heading = markdownHeadingId(line);
    if (heading) headings.push({ ...heading, index });
  }
  requireValue(fence === null, `Unclosed fenced code block in scoped requirement: ${inputPath}`);
  return headings;
}

function jsonArrayAt(text, offset, inputPath) {
  let start = offset;
  while (/\s/.test(text[start] ?? '')) start += 1;
  requireValue(text[start] === '[', `decisions must be a JSON array in ${inputPath}`);
  let depth = 0, quote = false, escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quote = false;
      continue;
    }
    if (char === '"') quote = true;
    else if (char === '[') depth += 1;
    else if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        const raw = text.slice(start, index + 1);
        try { return { records: JSON.parse(raw), end: index + 1 }; } catch { throw new Error(`Invalid decisions JSON array in ${inputPath}`); }
      }
    }
  }
  throw new Error(`Unclosed decisions JSON array in ${inputPath}`);
}

/** The `decisions` JSON array in a Markdown brief's frontmatter, or [] when it declares none. */
export function briefDecisionRecords(bytes, inputPath) {
  const text = Buffer.from(bytes).toString('utf8');
  const frontmatter = /^(?:﻿)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!frontmatter) return [];
  const markers = [...frontmatter[1].matchAll(/^decisions\s*:/gm)];
  if (markers.length === 0) return [];
  requireValue(markers.length === 1, `decisions is duplicated in ${inputPath}`);
  const offset = markers[0].index + markers[0][0].length;
  const { records } = jsonArrayAt(frontmatter[1], offset, inputPath);
  requireValue(Array.isArray(records), `decisions must be a JSON array in ${inputPath}`);
  return records;
}

function selectDecisionRecords(records, ids, inputPath) {
  requireValue(Array.isArray(records), `decisions must be a JSON array in ${inputPath}`);
  return ids.map(id => {
    const matches = records.filter(record => isObject(record) && record.id === id);
    requireValue(matches.length === 1, `Decision ${id} is missing or ambiguous in ${inputPath}`);
    return matches[0];
  });
}

function markdownScope(bytes, scope, inputPath) {
  const text = bytes.toString('utf8');
  const lines = text.split(/(?<=\n)/);
  let cursor = 0;
  let frontmatter = '';
  let selectedDecisions;
  if (/^(?:\uFEFF)?---\r?\n/.test(text)) {
    const end = lines.findIndex((line, index) => index > 0 && /^---\r?\n?$/.test(line));
    requireValue(end > 0, `Unclosed frontmatter in scoped requirement: ${inputPath}`);
    const rawFrontmatter = lines.slice(1, end).join('');
    const markers = [...rawFrontmatter.matchAll(/^decisions\s*:/gm)];
    if (scope.decisionIds === undefined) {
      // Without an explicit selector, decisions are part of the conservative
      // whole-requirement context and cannot be silently ignored.
      frontmatter = `${lines[0]}${rawFrontmatter}${lines[end]}`;
    } else {
      requireValue(markers.length === 1, `decisions is missing or duplicated in ${inputPath}`);
      const marker = markers[0];
      const parsed = jsonArrayAt(rawFrontmatter, marker.index + marker[0].length, inputPath);
      selectedDecisions = selectDecisionRecords(parsed.records, scope.decisionIds, inputPath);
      frontmatter = `${lines[0]}${rawFrontmatter.slice(0, marker.index)}${rawFrontmatter.slice(parsed.end)}${lines[end]}`;
    }
    cursor = end + 1;
  }
  if (scope.decisionIds !== undefined) requireValue(frontmatter !== '', `Decision-scoped Markdown requirement needs frontmatter: ${inputPath}`);
  // The supported subset is ATX (`#`) headings outside fenced code blocks.
  // Setext/linked headings are deliberately not selectors.
  const headings = markdownHeadings(lines, cursor, inputPath);
  const firstHeading = headings[0]?.index ?? lines.length;
  const selected = [];
  for (const anchor of scope.anchors ?? []) {
    const matches = headings.filter(heading => heading.id === anchor);
    requireValue(matches.length === 1, `Requirement anchor ${anchor} is missing or ambiguous in ${inputPath}`);
    selected.push(matches[0]);
  }
  const chunks = [frontmatter, lines.slice(cursor, firstHeading).join('')];
  const ancestorIndexes = new Set();
  for (const heading of selected) {
    for (const candidate of headings) {
      if (candidate.index >= heading.index || candidate.level >= heading.level) continue;
      const nextAtLevel = headings.find(next => next.index > candidate.index && next.level <= candidate.level);
      if (!nextAtLevel || nextAtLevel.index > heading.index) ancestorIndexes.add(candidate.index);
    }
  }
  for (const index of [...ancestorIndexes].sort((a, b) => a - b)) {
    const heading = headings.find(item => item.index === index);
    const next = headings.find(item => item.index > index && item.level <= heading.level)?.index ?? lines.length;
    const directChild = headings.find(item => item.index > index && item.index < next)?.index ?? next;
    chunks.push(lines.slice(index, directChild).join(''));
  }
  for (const heading of [...selected].sort((a, b) => a.index - b.index)) {
    const end = headings.find(next => next.index > heading.index && next.level <= heading.level)?.index ?? lines.length;
    chunks.push(lines.slice(heading.index, end).join(''));
  }
  const value = { frontmatterAndPreamble: chunks.slice(0, 2) };
  if (scope.anchors === undefined) value.fullBody = lines.slice(cursor).join('');
  else {
    value.ancestorDirectText = chunks.slice(2, 2 + ancestorIndexes.size);
    value.selectedSubtrees = chunks.slice(2 + ancestorIndexes.size);
  }
  if (selectedDecisions !== undefined) value.decisionRecords = selectedDecisions;
  return canonical(value);
}

function decisionRecords(value) {
  if (Array.isArray(value)) return value;
  if (isObject(value) && Array.isArray(value.decisions)) return value.decisions;
  throw new Error('Decision-scoped requirement JSON needs a top-level array or decisions array');
}

export function scopedRequirementForSubject(bytes, scope, inputPath) {
  const normalized = validateScope(scope, `Verification input ${inputPath}`);
  if (normalized.decisionIds !== undefined) {
    try {
      const value = parseJson(bytes, inputPath);
      requireValue(normalized.anchors === undefined, `anchors are not supported for a JSON decision requirement: ${inputPath}`);
      const records = decisionRecords(value);
      const selected = selectDecisionRecords(records, normalized.decisionIds, inputPath);
      if (Array.isArray(value)) return canonical({ decisionRecords: selected });
      const { decisions, ...nondecisionMetadata } = value;
      return canonical({ nondecisionMetadata, decisionRecords: selected });
    } catch (error) {
      if (!String(error.message).startsWith('Invalid JSON:')) throw error;
      return markdownScope(bytes, normalized, inputPath);
    }
  }
  return markdownScope(bytes, normalized, inputPath);
}

function criterionCoveredByScope(scope, anchor) {
  if (scope === undefined) return true;
  const decision = /^frontmatter\.decisions\.([^\.\s]+)$/.exec(anchor);
  if (decision) return scope.decisionIds === undefined || scope.decisionIds.includes(decision[1]);
  return scope.anchors === undefined || scope.anchors.includes(anchor);
}

export function snapshot({ root = process.cwd(), queuePath, specId, implementationRevision, bindingVersion = 1, artifactPaths = [] }) {
  requireValue(bindingVersion === 0 || bindingVersion === 1, 'Unsupported binding version');
  const state = readQueue({ root, queuePath, specId });
  const { queue, spec, specPath } = state;
  queuePath = state.queuePath;
  const briefPath = path.posix.join(path.posix.dirname(path.posix.dirname(queuePath)), 'brief.md');
  const declared = spec.verification.inputs.map(input => ({ path: relativePath(input.path), kind: input.kind, ...(input.state === undefined ? {} : { state: input.state }), ...(input.scope === undefined ? {} : { scope: validateScope(input.scope, `Verification input ${input.path}`) }) }));
  for (const required of [specPath, briefPath, ...spec.verification.criteria.map(criterion => relativePath(criterion.requirement.path))]) {
    requireValue(declared.some(input => input.path === required && input.kind === 'requirement'), `Verification inputs must explicitly bind required ${required === briefPath ? 'brief' : 'requirement'}: ${required}; queues belong at docs/features/<feature>/specs/.joycraft-spec-queue.json, with the brief at docs/features/<feature>/brief.md. Current queue: ${queuePath}`);
  }
  const queueInput = declared.find(input => input.path === queuePath);
  requireValue(!queueInput || queueInput.kind === 'requirement', `The queue input ${queuePath} must use kind requirement; got ${queueInput?.kind}`);
  if (!queueInput) declared.push({ path: queuePath, kind: 'requirement' });
  const specPaths = new Set(queue.specs.map(item => path.posix.join(path.posix.dirname(queuePath), item.file)));
  const queueBinding = bindingVersion === 1 ? boundQueueForSubject(queue, specId) : null;
  const governing = bindingVersion === 1 ? declared.filter(input => input.kind === 'requirement' && input.scope !== undefined).map(input => ({ path: input.path, ...input.scope })) : [];
  for (const criterion of spec.verification.criteria) {
    const input = declared.find(candidate => candidate.path === criterion.requirement.path);
    requireValue(criterionCoveredByScope(input?.scope, criterion.requirement.anchor), `Criterion anchor ${criterion.requirement.anchor} is omitted by requirement scope: ${input.path}`);
  }
  // Scope is checked before any input snapshotting, so an undeclared change
  // cannot be hidden behind a later review or completion artifact.
  const changeScope = spec.verification.changeScope === undefined ? undefined : captureChangeScope({ root, changeScope: spec.verification.changeScope, relativePath, inputs: declared, artifactPaths, topologyIgnoredPaths: [queuePath, ...specPaths] });
  const inputs = declared.sort((a, b) => a.path.localeCompare(b.path, 'en')).map(input => {
    requireValue(!(input.path === queuePath || input.path === specPath) || input.scope === undefined, `Queue and own spec inputs cannot narrow their binding: ${input.path}`);
    const absent = input.state === 'absent';
    if (absent) requireAbsent(root, input.path);
    const bytes = absent ? Buffer.from(`joycraft:absent:${input.path}\n`) : readLocal(root, input.path);
    let normalized = bytes;
    let normalization = absent ? 'absent' : 'none';
    if (!absent && input.path === queuePath) {
      normalized = bindingVersion === 1 ? queueBinding.value : normalizedQueueForSubject(queue);
      normalization = bindingVersion === 1 ? 'queue-scope' : 'queue-status';
    } else if (!absent && specPaths.has(input.path)) {
      normalized = specStatus(bytes).replace('__review_status__');
      normalization = 'spec-status';
    } else if (!absent && input.scope !== undefined) {
      normalized = scopedRequirementForSubject(bytes, input.scope, input.path);
      normalization = 'requirement-scope';
    }
    return { ...input, sha256: sha256(normalized), normalization };
  });
  if (implementationRevision === undefined) {
    implementationRevision = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  }
  requireValue(typeof implementationRevision === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(implementationRevision), 'Invalid implementation revision');
  let objectType;
  try {
    objectType = execFileSync('git', ['cat-file', '-t', implementationRevision], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch { throw new Error('Implementation revision is not available in this repository'); }
  requireValue(objectType === 'commit', 'Implementation revision must name a commit');
  const subject = { schemaVersion: 1, implementationRevision, queuePath, specId, specPath, criteria: spec.verification.criteria, inputs, ...(bindingVersion === 1 ? { binding: { version: 1, queue: { specIds: queueBinding.specIds }, governing, ...(changeScope === undefined ? {} : { changeScope }) } } : {}) };
  return { ...subject, identity: subjectIdentity(subject) };
}
