import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isObject, relativePath, requireValue } from './identity.mjs';

// joycraft.yaml is project-owned: Joycraft reads it and never rewrites it. The
// parser accepts a small YAML subset (maps, lists, scalars, flow lists) and names
// the line of anything else, so a typo never silently changes behavior.
export const configFile = 'joycraft.yaml';
export const defaults = Object.freeze({
  paths: Object.freeze({ features: 'docs/features', archive: 'docs/archive', context: 'docs/context' }),
  hooks: Object.freeze({}),
  cleanup: Object.freeze({ impact: Object.freeze([]), entryWords: 1000 }),
});

function scalar(text, line) {
  const value = text.trim();
  if (value === '') return null;
  if (/^"(?:[^"\\]|\\.)*"$/.test(value)) {
    try { return JSON.parse(value); } catch { throw new Error(`${configFile} line ${line}: a double-quoted value has an escape YAML does not allow here: ${value}`); }
  }
  if (/^'(?:[^']|'')*'$/.test(value)) return value.slice(1, -1).replaceAll("''", "'");
  requireValue(!/^["']/.test(value), `${configFile} line ${line}: a quoted value must end with its closing quote and nothing after it: ${value}`);
  if (/^\[.*\]$/.test(value)) {
    const inner = value.slice(1, -1).trim();
    return inner === '' ? [] : splitFlow(inner, line).map(item => scalar(item, line));
  }
  requireValue(!/^[{&*!|>%@`]/.test(value), `${configFile} line ${line}: unsupported YAML syntax: ${value}`);
  if (value === 'true' || value === 'false') return value === 'true';
  if (value === 'null' || value === '~') return null;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function splitFlow(inner, line) {
  const items = [];
  let current = '', quote = null;
  for (const char of inner) {
    if (quote) { current += char; if (char === quote) quote = null; continue; }
    if (char === '"' || char === "'") { quote = char; current += char; continue; }
    requireValue(char !== '[' && char !== '{', `${configFile} line ${line}: nested flow collections are not supported`);
    if (char === ',') { items.push(current); current = ''; continue; }
    current += char;
  }
  requireValue(quote === null, `${configFile} line ${line}: unterminated quote`);
  items.push(current);
  return items;
}

const stripComment = text => {
  let quote = null;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote === '"' && char === '\\') { index += 1; continue; }
    if (quote) { if (char === quote) quote = null; continue; }
    if (char === '"' || char === "'") quote = char;
    else if (char === '#' && (index === 0 || /\s/.test(text[index - 1]))) return text.slice(0, index);
  }
  return text;
};

/** Parse the supported YAML subset into plain objects. */
export function parseYaml(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((raw, index) => ({ raw: stripComment(raw).replace(/\s+$/, ''), number: index + 1 }))
    .filter(entry => entry.raw.trim() !== '');
  if (lines[0]?.raw.trim() === '---') lines.shift();
  for (const entry of lines) requireValue(entry.raw.trim() !== '---' && entry.raw.trim() !== '...', `${configFile} line ${entry.number}: only one YAML document is supported`);
  for (const entry of lines) requireValue(!entry.raw.includes('\t'), `${configFile} line ${entry.number}: use spaces, not tabs`);
  let position = 0;
  const indentOf = entry => entry.raw.length - entry.raw.trimStart().length;

  function block(indent) {
    const first = lines[position];
    return first.raw.trimStart().startsWith('- ') || first.raw.trim() === '-' ? list(indent) : map(indent);
  }

  function map(indent, target = {}) {
    while (position < lines.length && indentOf(lines[position]) === indent && !lines[position].raw.trimStart().startsWith('-')) {
      const { raw, number } = lines[position];
      const match = /^([A-Za-z0-9_.-]+):(?:\s+(.*))?$/.exec(raw.trim());
      requireValue(match, `${configFile} line ${number}: expected "key: value"`);
      const [, key, rest] = match;
      requireValue(!Object.hasOwn(target, key), `${configFile} line ${number}: duplicate key ${key}`);
      position += 1;
      if (rest !== undefined && rest.trim() !== '') target[key] = scalar(rest, number);
      else if (position < lines.length && indentOf(lines[position]) > indent) target[key] = block(indentOf(lines[position]));
      else if (position < lines.length && indentOf(lines[position]) === indent && /^-(\s|$)/.test(lines[position].raw.trimStart())) target[key] = list(indent);
      else target[key] = null;
    }
    requireValue(position >= lines.length || indentOf(lines[position]) <= indent, `${configFile} line ${lines[position]?.number}: unexpected indentation`);
    return target;
  }

  function list(indent) {
    const items = [];
    while (position < lines.length && indentOf(lines[position]) === indent && /^-(\s|$)/.test(lines[position].raw.trimStart())) {
      const { raw, number } = lines[position];
      const rest = raw.trimStart().slice(1);
      if (rest.trim() === '') {
        position += 1;
        requireValue(position < lines.length && indentOf(lines[position]) > indent, `${configFile} line ${number}: empty list item`);
        items.push(block(indentOf(lines[position])));
      } else if (/^\s+[A-Za-z0-9_.-]+:(\s|$)/.test(rest)) {
        // "- key: value" starts a map whose remaining keys align with the first key.
        const itemIndent = indent + 1 + (rest.length - rest.trimStart().length);
        lines[position] = { raw: `${' '.repeat(itemIndent)}${rest.trimStart()}`, number };
        items.push(map(itemIndent));
      } else { items.push(scalar(rest, number)); position += 1; }
    }
    return items;
  }

  if (lines.length === 0) return {};
  requireValue(indentOf(lines[0]) === 0, `${configFile} line ${lines[0].number}: the first key must not be indented`);
  const result = block(0);
  requireValue(position === lines.length, `${configFile} line ${lines[position]?.number}: unexpected content`);
  return result;
}

const known = { paths: ['features', 'archive', 'context'], hooks: ['afterArchive'], cleanup: ['impact', 'entryWords'] };

/** Read joycraft.yaml (or return defaults) and validate every known field. */
export function readConfig(root = process.cwd()) {
  const file = path.join(root, configFile);
  if (!existsSync(file)) return { source: null, ...structuredClone(defaults) };
  const parsed = parseYaml(readFileSync(file, 'utf8'));
  requireValue(isObject(parsed), `${configFile} must be a map of settings`);
  for (const [section, value] of Object.entries(parsed)) {
    requireValue(Object.hasOwn(known, section), `${configFile}: unknown section ${section}; known sections are ${Object.keys(known).join(', ')}`);
    requireValue(value === null || isObject(value), `${configFile}: ${section} must be a map`);
    for (const key of Object.keys(value ?? {})) requireValue(known[section].includes(key), `${configFile}: unknown setting ${section}.${key}`);
  }
  const paths = { ...defaults.paths };
  for (const [key, value] of Object.entries(parsed.paths ?? {})) {
    requireValue(typeof value === 'string', `${configFile}: paths.${key} must be a project-relative folder`);
    paths[key] = relativePath(value.replace(/\/+$/, ''));
  }
  const folders = Object.values(paths);
  requireValue(new Set(folders).size === folders.length, `${configFile}: paths.features, paths.archive and paths.context must differ`);
  // The work folders may sit inside the context home (e.g. context: docs); nothing else may nest.
  for (const [ak, a] of Object.entries(paths)) for (const [bk, b] of Object.entries(paths)) {
    requireValue(a === b || !b.startsWith(`${a}/`) || (ak === 'context' && bk !== 'context'), `${configFile}: ${b} cannot sit inside ${a}`);
  }
  const hooks = {};
  if (parsed.hooks?.afterArchive != null) {
    requireValue(typeof parsed.hooks.afterArchive === 'string' && parsed.hooks.afterArchive.trim(), `${configFile}: hooks.afterArchive must be a command`);
    hooks.afterArchive = parsed.hooks.afterArchive;
  }
  const impact = parsed.cleanup?.impact ?? [];
  requireValue(Array.isArray(impact), `${configFile}: cleanup.impact must be a list`);
  for (const [index, entry] of impact.entries()) {
    requireValue(isObject(entry) && typeof entry.source === 'string' && Array.isArray(entry.docs) && entry.docs.every(doc => typeof doc === 'string'),
      `${configFile}: cleanup.impact item ${index + 1} needs source (a glob) and docs (a list of files)`);
    checkGlob(entry.source, `cleanup.impact item ${index + 1} source`);
  }
  const entryWords = parsed.cleanup?.entryWords ?? defaults.cleanup.entryWords;
  requireValue(Number.isInteger(entryWords) && entryWords > 0, `${configFile}: cleanup.entryWords must be a positive whole number of words`);
  return { source: configFile, paths, hooks, cleanup: { impact: impact.map(entry => ({ source: entry.source, docs: entry.docs.map(relativePath) })), entryWords } };
}

/** Project-relative work folders for a project. */
export const workPaths = root => readConfig(root).paths;

/** Globs support only *, ** and ?, which Git pathspecs and globToRegExp read the same way. */
export function checkGlob(glob, label = 'glob') {
  requireValue(typeof glob === 'string' && glob.trim() && !/[[\]{}!\\]/.test(glob), `${configFile}: ${label} may use only *, ** and ? as wildcards: ${glob}`);
  return glob;
}

/** Convert a path glob (`*` within a segment, `**` across segments) to a RegExp. */
export function globToRegExp(glob) {
  let pattern = '';
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    if (char === '*' && glob[index + 1] === '*') {
      index += 1;
      if (glob[index + 1] === '/') { index += 1; pattern += '(?:.*/)?'; } else pattern += '.*';
    } else if (char === '*') pattern += '[^/]*';
    else if (char === '?') pattern += '[^/]';
    else pattern += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${pattern}$`);
}

export async function main(argv = process.argv.slice(2)) {
  const index = argv.indexOf('--root');
  requireValue(argv.length === 0 || (argv.length === 2 && index === 0), 'Usage: config.mjs [--root <project>]');
  const result = readConfig(path.resolve(index === 0 ? argv[1] : '.'));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`Config stopped: ${error.message}\n`); process.exitCode = 1; });
}
