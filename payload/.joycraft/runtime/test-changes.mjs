import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { workPaths } from './config.mjs';
import { readQueue, relativePath, requireValue } from './identity.mjs';

// The test files a spec changed since its base, split by the spec's own
// `## Test changes` section into declared (with class) and undeclared. Joycraft
// names no test runner, so a test file is found by convention: a check input of
// the spec, a file with an [AC: tag, or a common test name. It reports; the
// reviewer decides what blocks.

const testSegments = new Set(['test', 'tests', 'spec', '__tests__']);

/** Whether a project path looks like a test by common naming conventions. */
export function isTestPath(file) {
  const parts = String(file).split('/');
  const name = parts.at(-1);
  return parts.slice(0, -1).some(part => testSegments.has(part))
    || /\.(?:test|spec)\./.test(name) || /_test\./.test(name) || name.startsWith('test_');
}

const git = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
const nulList = text => text.split('\0').filter(Boolean);

/** The bullets of a `## Test changes` section: `path`, class 1, 2 or 3, and the requiring line. "none" means none. */
export function declaredTestChanges(text) {
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
    if (file && cls) declared.push({ path: relativePath(file[1]), class: Number(cls[1]) });
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
  const changed = [...new Set([...nulList(git(root, ['diff', '--name-only', '-z', base, '--'])), ...nulList(git(root, ['ls-files', '--others', '--exclude-standard', '-z']))])].sort();
  const read = file => { const full = path.join(root, file); return existsSync(full) ? readFileSync(full, 'utf8') : ''; };
  const tests = changed.filter(file => checks.has(file) || isTestPath(file) || read(file).includes('[AC:'));
  const declaredList = declaredTestChanges(readFileSync(path.join(root, specPath), 'utf8'));
  const byPath = new Map(declaredList.map(item => [item.path, item]));
  const features = workPaths(root).features;
  const featurePaths = tests.flatMap(file => read(file).split(/\r?\n/).flatMap((text, index) => (text.includes(`${features}/`) ? [{ path: file, line: index + 1, text: text.trim() }] : [])));
  return {
    base, specId: spec.id, testFiles: tests,
    declared: tests.filter(file => byPath.has(file)).map(file => byPath.get(file)),
    undeclared: tests.filter(file => !byPath.has(file)),
    featurePaths,
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
