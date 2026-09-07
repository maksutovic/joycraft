/** The one fragment of a file that an update is allowed to replace. */
export interface PatchSelector {
  /** A dotted path through JSON objects, such as `env.generated`. */
  ownedKey?: string;
  /** An exact marker identifier, such as `joycraft:managed`. */
  ownedRegion?: string;
}

export type OwnedContentResult =
  | { status: 'present'; content: string }
  | { status: 'missing' }
  | { status: 'invalid'; reason: string };

export type OwnedContentApplication =
  | { ok: true; content: string }
  | { ok: false; reason: string };

type SelectorKind =
  | { kind: 'key'; value: string }
  | { kind: 'region'; value: string }
  | { kind: 'invalid'; reason: string };

const FORBIDDEN_JSON_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const REGION_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;

function selectorKind(selector: PatchSelector | null | undefined): SelectorKind {
  if (!selector || typeof selector !== 'object') {
    return { kind: 'invalid', reason: 'Patch selector must be an object' };
  }

  const hasKey = selector.ownedKey !== undefined;
  const hasRegion = selector.ownedRegion !== undefined;
  if (hasKey === hasRegion) {
    return { kind: 'invalid', reason: 'Patch selector must contain exactly one ownedKey or ownedRegion' };
  }

  if (hasKey) {
    if (typeof selector.ownedKey !== 'string') {
      return { kind: 'invalid', reason: 'ownedKey must be a string' };
    }
    const parts = selector.ownedKey.split('.');
    if (parts.length === 0 || parts.some((part) => part.length === 0 || FORBIDDEN_JSON_KEYS.has(part))) {
      return { kind: 'invalid', reason: 'ownedKey contains an empty or prototype key segment' };
    }
    return { kind: 'key', value: selector.ownedKey };
  }

  if (typeof selector.ownedRegion !== 'string' || !REGION_IDENTIFIER.test(selector.ownedRegion)) {
    return { kind: 'invalid', reason: 'ownedRegion is not a valid marker identifier' };
  }
  return { kind: 'region', value: selector.ownedRegion };
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonObject(content: string): { value: Record<string, unknown> } | { reason: string } {
  let value: unknown;
  try {
    value = JSON.parse(content) as unknown;
  } catch {
    return { reason: 'Current content is not valid JSON' };
  }
  if (!isJsonObject(value)) {
    return { reason: 'JSON patch paths require an object at the root' };
  }
  return { value };
}

function own(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function readJsonValue(root: Record<string, unknown>, path: string): OwnedContentResult {
  const parts = path.split('.');
  let parent: unknown = root;
  for (let index = 0; index < parts.length - 1; index += 1) {
    if (!isJsonObject(parent)) {
      return { status: 'invalid', reason: `JSON path parent is not an object at ${parts[index]}` };
    }
    const part = parts[index];
    if (!own(parent, part)) return { status: 'missing' };
    parent = parent[part];
  }

  if (!isJsonObject(parent)) {
    return { status: 'invalid', reason: 'JSON path parent is not an object' };
  }
  const finalPart = parts[parts.length - 1];
  if (!own(parent, finalPart)) return { status: 'missing' };
  const serialized = JSON.stringify(parent[finalPart]);
  // A parsed JSON value cannot be undefined, but retain a defensive guard if
  // this helper is ever reused with a non-JSON object.
  return serialized === undefined
    ? { status: 'invalid', reason: 'Owned JSON value cannot be serialized' }
    : { status: 'present', content: serialized };
}

function newlineOf(content: string): '\n' | '\r\n' {
  return content.includes('\r\n') ? '\r\n' : '\n';
}

function hasFinalNewline(content: string): boolean {
  return content.endsWith('\n') || content.endsWith('\r');
}

function normalizeNewlines(content: string, newline: '\n' | '\r\n'): string {
  return content.replace(/\r\n?|\n/g, newline);
}

function jsonIndent(content: string): string | undefined {
  // The first indented JSON line establishes the existing document style.
  // Passing a string to JSON.stringify preserves tabs as well as spaces.
  const match = content.match(/(?:^|\r?\n)([ \t]+)(?=["}\]])/);
  return match?.[1];
}

function serializePatchedJson(
  value: Record<string, unknown>,
  current: string,
): string {
  const indentation = jsonIndent(current);
  const serialized = JSON.stringify(value, null, indentation);
  const newline = newlineOf(current);
  const withNewlines = normalizeNewlines(serialized, newline);
  return hasFinalNewline(current) ? `${withNewlines}${newline}` : withNewlines;
}

function parseTarget(target: string): { value: unknown } | { reason: string } {
  try {
    return { value: JSON.parse(target) as unknown };
  } catch {
    return { reason: 'Target content is not valid JSON' };
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface MarkerBounds {
  openEnd: number;
  closeStart: number;
  body: string;
  newline: '\n' | '\r\n';
  hasLeadingBoundary: boolean;
  hasTrailingBoundary: boolean;
}

function markerBounds(current: string, identifier: string): MarkerBounds | { status: 'missing' } | { status: 'invalid'; reason: string } {
  const opening = `<!-- ${identifier} -->`;
  const closing = `<!-- /${identifier} -->`;
  const openCount = countOccurrences(current, opening);
  const closeCount = countOccurrences(current, closing);
  const mentionPattern = new RegExp(`<!--\\s*/?\\s*${escapeRegExp(identifier)}\\s*-->`, 'g');
  const mentions = current.match(mentionPattern) ?? [];

  if (mentions.length === 0) return { status: 'missing' };
  if (openCount !== 1 || closeCount !== 1 || mentions.length !== 2) {
    return { status: 'invalid', reason: 'Owned region markers are duplicated or malformed' };
  }

  const openEnd = current.indexOf(opening) + opening.length;
  const closeStart = current.indexOf(closing);
  if (closeStart <= openEnd) {
    return { status: 'invalid', reason: 'Owned region markers are in the wrong order' };
  }

  const newline = newlineOf(current);
  const body = current.slice(openEnd, closeStart);
  const hasLeadingBoundary = body.startsWith(newline);
  const withoutLeading = hasLeadingBoundary ? body.slice(newline.length) : body;
  const hasTrailingBoundary = withoutLeading.endsWith(newline);
  return {
    openEnd,
    closeStart,
    body: withoutLeading,
    newline,
    hasLeadingBoundary,
    hasTrailingBoundary,
  };
}

function countOccurrences(content: string, needle: string): number {
  let count = 0;
  let offset = 0;
  while (true) {
    const found = content.indexOf(needle, offset);
    if (found < 0) return count;
    count += 1;
    offset = found + needle.length;
  }
}

export function readOwnedContent(current: string, selector: PatchSelector): OwnedContentResult {
  const selected = selectorKind(selector);
  if (selected.kind === 'invalid') return { status: 'invalid', reason: selected.reason };

  if (selected.kind === 'key') {
    const parsed = parseJsonObject(current);
    if ('reason' in parsed) return { status: 'invalid', reason: parsed.reason };
    return readJsonValue(parsed.value, selected.value);
  }

  const markers = markerBounds(current, selected.value);
  if ('status' in markers) {
    return markers.status === 'missing'
      ? { status: 'missing' }
      : { status: 'invalid', reason: markers.reason };
  }
  return { status: 'present', content: markers.body };
}

export function applyOwnedContent(
  current: string | undefined,
  selector: PatchSelector,
  target: string,
): OwnedContentApplication {
  const selected = selectorKind(selector);
  if (selected.kind === 'invalid') return { ok: false, reason: selected.reason };
  if (current === undefined) return { ok: false, reason: 'Current content is missing' };

  if (selected.kind === 'key') {
    const parsed = parseJsonObject(current);
    if ('reason' in parsed) return { ok: false, reason: parsed.reason };
    const parsedTarget = parseTarget(target);
    if ('reason' in parsedTarget) return { ok: false, reason: parsedTarget.reason };

    const parts = selected.value.split('.');
    let parent: unknown = parsed.value;
    for (let index = 0; index < parts.length - 1; index += 1) {
      if (!isJsonObject(parent)) {
        return { ok: false, reason: `JSON path parent is not an object at ${parts[index]}` };
      }
      const part = parts[index];
      if (!own(parent, part)) return { ok: false, reason: `JSON path does not exist: ${selected.value}` };
      parent = parent[part];
    }
    if (!isJsonObject(parent)) return { ok: false, reason: 'JSON path parent is not an object' };
    parent[parts[parts.length - 1]] = parsedTarget.value;
    return { ok: true, content: serializePatchedJson(parsed.value, current) };
  }

  const markers = markerBounds(current, selected.value);
  if ('status' in markers) {
    return {
      ok: false,
      reason: markers.status === 'missing' ? 'Owned region markers are missing' : markers.reason,
    };
  }

  const markerPattern = new RegExp(`<!--\\s*/?\\s*${escapeRegExp(selected.value)}\\s*-->`);
  if (markerPattern.test(target)) {
    return { ok: false, reason: 'Target content contains an owned region marker' };
  }

  let normalizedTarget = normalizeNewlines(target, markers.newline);
  if (markers.hasLeadingBoundary && normalizedTarget.startsWith(markers.newline)) {
    normalizedTarget = normalizedTarget.slice(markers.newline.length);
  }
  if (markers.hasTrailingBoundary && !normalizedTarget.endsWith(markers.newline)) {
    normalizedTarget += markers.newline;
  }
  const content = `${current.slice(0, markers.openEnd)}${markers.hasLeadingBoundary ? markers.newline : ''}${normalizedTarget}${current.slice(markers.closeStart)}`;
  return { ok: true, content };
}
