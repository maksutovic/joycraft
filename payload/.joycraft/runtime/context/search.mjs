import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, sep } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
export const MAX_FILE_BYTES = 512 * 1024;
export const MAX_SNIPPET_BYTES = 1800;
const stopWords = new Set('a an and are as at be by can do for from how i in is it me my of on or our that the this to we what when where which with'.split(' '));

export function safeRelativePath(path) {
  return typeof path === 'string' && path.length > 0 && !isAbsolute(path)
    && !path.includes('\\') && !path.includes('\0')
    && !path.split('/').some(part => part === '..' || part === '.' || part === '')
    && !/^[a-z]:/i.test(path);
}

export function excludedReason(path) {
  if (!safeRelativePath(path)) return 'unsafe-path';
  const parts = path.toLowerCase().split('/');
  if (parts.some(part => ['.git', 'node_modules', '.ssh', '.aws', '.gnupg', '.venv', 'venv'].includes(part))) return 'excluded-directory';
  if (parts.some(part => /^\.env($|[._-])/.test(part))) return 'sensitive-path';
  if (parts.some(part => /transcripts?|sessions?|chat[-_]?logs?/.test(part))) return 'private-transcript-path';
  if (parts.some(part => /(^|[._-])(secrets?|credentials?|tokens?|passwords?)([._-]|$)/.test(part))) return 'sensitive-path';
  const name = parts.at(-1);
  if (/^\.npmrc$|^\.netrc$|^\.pypirc$|^id_(rsa|dsa|ecdsa|ed25519)($|\.)|\.(env|pem|key|p12|pfx|jks|keystore|keychain|keychain-db)$/.test(name)) return 'sensitive-path';
  return null;
}

function archivedReason(path, includeArchive) {
  return !includeArchive && (path === 'docs/archive' || path.startsWith('docs/archive/')) ? 'archived-context' : null;
}

function keywords(query) {
  return [...new Set((query.toLowerCase().match(/[\p{L}\p{N}_-]{2,}/gu) ?? [])
    .filter(word => !stopWords.has(word)))];
}

function clipped(text, bytes) {
  let result = '';
  let used = 0;
  for (const char of text) {
    const size = Buffer.byteLength(char);
    if (used + size > bytes) break;
    result += char;
    used += size;
  }
  return result;
}

function excerpt(text, terms) {
  const lines = text.split('\n');
  const hit = lines.findIndex(line => terms.some(term => line.toLowerCase().includes(term)));
  const start = Math.max(0, (hit < 0 ? 0 : hit) - 2);
  const snippet = clipped(lines.slice(start).join('\n'), MAX_SNIPPET_BYTES);
  return { text: snippet, startLine: start + 1, endLine: start + snippet.split('\n').length,
    truncated: start > 0 || Buffer.byteLength(lines.slice(start).join('\n')) > MAX_SNIPPET_BYTES };
}

async function readSafeFile(root, path) {
  const parts = path.split('/');
  const observed = [];
  for (let index = 1; index <= parts.length; index += 1) {
    const stat = await lstat(join(root, ...parts.slice(0, index)));
    if (stat.isSymbolicLink()) return { reason: 'symlink-not-read' };
    if (index < parts.length && !stat.isDirectory()) return { reason: 'non-directory-parent' };
    if (index === parts.length && !stat.isFile()) return { reason: 'not-a-regular-file' };
    observed.push(stat);
  }
  const resolved = await realpath(join(root, path));
  const distance = relative(root, resolved);
  if (distance.startsWith(`..${sep}`) || distance === '..' || isAbsolute(distance)) return { reason: 'outside-project' };
  const file = await open(resolved, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    if (!stat.isFile()) return { reason: 'not-a-regular-file' };
    if (stat.dev !== observed.at(-1).dev || stat.ino !== observed.at(-1).ino) return { reason: 'file-changed-during-open' };
    for (let index = 1; index <= parts.length; index += 1) {
      const current = await lstat(join(root, ...parts.slice(0, index)));
      if (current.isSymbolicLink() || current.dev !== observed[index - 1].dev || current.ino !== observed[index - 1].ino) return { reason: 'path-changed-during-open' };
    }
    if (stat.size > MAX_FILE_BYTES) return { reason: 'file-exceeds-512-kib', bytes: stat.size };
    const buffer = Buffer.alloc(MAX_FILE_BYTES + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await file.read(buffer, length, buffer.length - length, null);
      if (bytesRead === 0) break;
      length += bytesRead;
    }
    if (length > MAX_FILE_BYTES) return { reason: 'file-exceeds-512-kib', bytes: length };
    const bytes = buffer.subarray(0, length);
    if (bytes.includes(0)) return { reason: 'binary-file' };
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { return { reason: 'non-utf8-file' }; }
    return { text, bytes: length, sha256: createHash('sha256').update(bytes).digest('hex') };
  } finally { await file.close(); }
}

/** Discover references without following symlinks or reading ignored/private paths. */
export async function findCandidates({ query, paths, includeArchive = false }, { root = process.cwd() } = {}) {
  if (typeof query !== 'string' || !query.trim() || Buffer.byteLength(query) > 4000) throw new Error('invalid-query: supply 1–4000 UTF-8 bytes');
  if (paths !== undefined && (!Array.isArray(paths) || !paths.length || paths.some(path => !safeRelativePath(path)))) throw new Error('invalid-paths: use project-relative files or directories');
  if (typeof includeArchive !== 'boolean') throw new Error('invalid-include-archive: use a boolean');
  const project = await realpath(root);
  let stdout;
  try {
    ({ stdout } = await exec('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
      cwd: project, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    }));
  } catch { throw new Error('inventory-unavailable: run from a readable Git project'); }
  const inventory = [...new Set(stdout.split('\0').filter(Boolean))].sort();
  const terms = keywords(query);
  const candidates = [], omitted = [], unreadable = [];
  const selections = paths && [...new Set(paths)];
  for (const path of inventory) {
    const archive = archivedReason(path, includeArchive);
    if (archive) { omitted.push({ path, reason: archive }); continue; }
    const exclusion = excludedReason(path);
    if (exclusion) { omitted.push({ path, reason: exclusion }); continue; }
    if (selections && !selections.some(selected => path === selected || path.startsWith(`${selected}/`))) {
      omitted.push({ path, reason: 'outside-selected-paths' }); continue;
    }
    let file;
    try { file = await readSafeFile(project, path); }
    catch (error) { unreadable.push({ path, reason: error?.code === 'ENOENT' ? 'file-missing' : 'file-unreadable' }); continue; }
    if (file.reason) { omitted.push({ path, reason: file.reason, ...(file.bytes === undefined ? {} : { bytes: file.bytes }) }); continue; }
    const lowerPath = path.toLowerCase(), lowerText = file.text.toLowerCase();
    const pathMatches = terms.filter(term => lowerPath.includes(term));
    const contentMatches = terms.filter(term => lowerText.includes(term));
    const localScore = pathMatches.length * 3 + contentMatches.length;
    if (!selections && localScore === 0) { omitted.push({ path, reason: 'no-keyword-match' }); continue; }
    candidates.push({ path, sha256: file.sha256, bytes: file.bytes, localScore,
      matches: { path: pathMatches, content: contentMatches }, snippet: excerpt(file.text, terms) });
  }
  if (selections) {
    for (const path of selections) {
      if (!inventory.some(entry => entry === path || entry.startsWith(`${path}/`))) omitted.push({ path, reason: excludedReason(path) ?? 'not-in-git-inventory' });
    }
  }
  candidates.sort((a, b) => b.localScore - a.localScore || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { candidates, omitted, unreadable, discovery: { method: 'git-keyword-path', terms,
    paths: selections ?? null, inventoryCount: inventory.length, maxFileBytes: MAX_FILE_BYTES,
    maxSnippetBytes: MAX_SNIPPET_BYTES, exhaustive: false,
    includeArchive,
    limitation: 'Local keyword/path selection can miss paraphrases; excluded, unreadable and unmatched files are not scored.' } };
}
