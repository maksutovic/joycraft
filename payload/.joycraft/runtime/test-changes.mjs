import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { workPaths } from './config.mjs';
import { readQueue, relativePath, requireValue } from './identity.mjs';
import { tag } from './trace.mjs';

// The test files a spec changed since its base, split by the spec's own
// `## Test changes` section into declared (with class) and undeclared. Joycraft
// names no test runner, so a test file is found by convention: a check input of
// the spec, a code file outside the work folders that holds an AC tag (the
// pattern trace.mjs reads), or a common test name. It reports; the reviewer
// decides what blocks.

// Prose and data files are never tests by name or tag: a spec, a review log or
// a report quotes test names and tags without being a test.
const proseExtensions = new Set(['md', 'mdx', 'markdown', 'txt', 'rst', 'adoc', 'log']);
const dataExtensions = new Set(['json', 'jsonl', 'yaml', 'yml', 'toml', 'csv', 'tsv', 'xml', 'html', 'htm', 'svg', 'lock', 'ini', 'cfg']);
const extensionOf = name => (name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '');

// Folder names that hold tests across stacks, compared case-insensitively
// (Swift Tests/, Kotlin and Android source sets such as androidTest and jvmTest,
// C# App.Tests projects).
const testSegments = new Set(['test', 'tests', 'spec', '__tests__', 'androidtest']);
const isTestSegment = part => testSegments.has(part.toLowerCase()) || /^[a-z]+Test$/.test(part) || /\.Tests?$/.test(part);

/** Whether a project path looks like a test by common naming conventions. */
export function isTestPath(file) {
  const parts = String(file).split('/');
  const name = parts.at(-1);
  if (proseExtensions.has(extensionOf(name))) return false;
  return parts.slice(0, -1).some(isTestSegment)
    || /\.(?:test|spec|e2e|cy)\./.test(name) || /_(?:test|spec)\.[^.]+$/.test(name)
    || /[a-z0-9](?:Test|Tests|Spec)\.(?:java|kt|kts|scala|groovy|cs|fs|vb|swift)$/.test(name)
    || name === 'tests.py' || name === 'conftest.py'
    || (/^test_/.test(name) && !/^test_(?:helpers?|utils?|support|data|fixtures?)(?:[._-]|$)/.test(name));
}

const under = (file, folder) => file === folder || file.startsWith(`${folder}/`);

/** Whether the AC tag rule applies: a code file outside Joycraft's own files (work folders are left out before). */
function taggable(file) {
  const ext = extensionOf(file.split('/').at(-1));
  return !proseExtensions.has(ext) && !dataExtensions.has(ext) && !file.split('/').includes('.joycraft');
}

const git = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
const nulList = text => text.split('\0').filter(Boolean);

/** The bullets of a `## Test changes` section: `path`, class 1, 2 or 3, and the requiring line. "none" means none. */
export function declaredTestChanges(text, skipped = []) {
  const lines = String(text).replace(/^﻿/, '').split(/\r?\n/);
  const start = lines.findIndex(line => /^#{1,6}\s+Test changes\s*$/i.test(line));
  if (start < 0) return [];
  const level = /^#+/.exec(lines[start])[0].length;
  const declared = [];
  let fenced = false;
  for (const line of lines.slice(start + 1)) {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; continue; }
    if (fenced) continue;
    const heading = /^(#{1,6})\s/.exec(line);
    if (heading && heading[1].length <= level) break;
    const item = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (!item) continue;
    const file = /`([^`\s]+)`/.exec(item[1]);
    const cls = /\bclass\s*([123])\b/i.exec(item[1]);
    if (!file || !cls) continue;
    try { declared.push({ path: relativePath(file[1]), class: Number(cls[1]) }); }
    catch (error) { skipped.push({ path: file[1], reason: `declared path refused: ${error.message}` }); }
  }
  return declared;
}

export function testChanges({ root = process.cwd(), queuePath, specId, base }) {
  root = realpathSync(root);
  requireValue(typeof base === 'string' && /^[0-9a-f]{7,64}$/i.test(base), 'test-changes needs --base <sha>, the captured revision before dispatch');
  try { git(root, ['rev-parse', '--verify', '--quiet', `${base}^{commit}`]); }
  catch { throw new Error(`Base ${base} is not a commit in this repository`); }
  const { spec, specPath } = readQueue({ root, queuePath, specId });
  const checks = new Set(spec.verification.inputs.filter(input => input.kind === 'check').map(input => relativePath(input.path)));
  // --no-renames: a rename is its old path deleted and its new path added, so
  // a declaration under either path matches and a deleted test stays visible.
  const changed = [...new Set([...nulList(git(root, ['diff', '--name-only', '--no-renames', '-z', base, '--'])), ...nulList(git(root, ['ls-files', '--others', '--exclude-standard', '-z']))])].sort();
  const skipped = [];
  // A file's current text, or its base text when it was deleted. Null for a
  // path that is not a readable file (a submodule, a directory): it is skipped.
  const contents = new Map();
  const read = file => {
    if (contents.has(file)) return contents.get(file);
    let text = null;
    try {
      const stat = lstatSync(path.join(root, file));
      if (stat.isFile()) text = readFileSync(path.join(root, file), 'utf8');
      else skipped.push({ path: file, reason: stat.isDirectory() ? 'not a file (a submodule or directory)' : 'not a regular file' });
    } catch (error) {
      if (error.code !== 'ENOENT') skipped.push({ path: file, reason: `unreadable: ${error.code ?? error.message}` });
      else {
        try { text = git(root, ['show', `${base}:${file}`]); }
        catch { skipped.push({ path: file, reason: 'deleted, and its base content is not a file' }); }
      }
    }
    contents.set(file, text);
    return text;
  };
  const folders = workPaths(root);
  const tagged = new RegExp(tag.source);
  const tests = changed.filter(file => {
    const text = read(file);
    if (text === null) return false;
    if (checks.has(file)) return true;
    // The work folders hold specs, reviews and receipts, never the project's tests.
    if (under(file, folders.features) || under(file, folders.archive)) return false;
    return isTestPath(file) || (taggable(file) && tagged.test(text));
  });
  const declaredList = declaredTestChanges(readFileSync(path.join(root, specPath), 'utf8'), skipped);
  const byPath = new Map(declaredList.map(item => [item.path, item]));
  const present = file => { try { return lstatSync(path.join(root, file)).isFile(); } catch { return false; } };
  const featurePaths = tests.filter(present).flatMap(file => read(file).split(/\r?\n/).flatMap((text, index) => (text.includes(`${folders.features}/`) ? [{ path: file, line: index + 1, text: text.trim() }] : [])));
  return {
    base, specId: spec.id, testFiles: tests,
    declared: tests.filter(file => byPath.has(file)).map(file => byPath.get(file)),
    undeclared: tests.filter(file => !byPath.has(file)),
    featurePaths,
    skipped,
  };
}

export function main(argv = process.argv.slice(2)) {
  const usage = 'Usage: test-changes.mjs --queue <queue> --spec <id> --base <sha> [--root <project>]';
  const flags = {};
  for (let index = 0; index < argv.length; index += 2) {
    const [name, value] = [argv[index], argv[index + 1]];
    requireValue(['--queue', '--spec', '--base', '--root'].includes(name) && flags[name] === undefined && typeof value === 'string' && value && !value.startsWith('--'), usage);
    flags[name] = value;
  }
  requireValue(flags['--queue'] && flags['--base'] && /^(?:0|[1-9]\d*)$/.test(flags['--spec'] ?? ''), usage);
  const result = testChanges({ root: path.resolve(flags['--root'] ?? '.'), queuePath: flags['--queue'], specId: Number(flags['--spec']), base: flags['--base'] });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

const invoked = (() => { try { return realpathSync(process.argv[1]); } catch { return null; } })();
if (invoked && import.meta.url === pathToFileURL(invoked).href) {
  try { main(); } catch (error) { process.stderr.write(`Test changes stopped: ${error.message}\n`); process.exitCode = 1; }
}
