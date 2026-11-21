import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// The kickoff captures a founder's context in a bare project. The agent runs the
// conversation; this helper keeps the parts that must not drift: detection, the
// verbatim notes, the question budget, and the write rules.
export const notesPath = 'docs/context/kickoff-notes.md';
export const statePath = '.joycraft/local/kickoff.json';
export const topics = ['users-and-purpose', 'first-outcome', 'constraints', 'stack', 'non-goals', 'undecided'];
export const questionsPerRound = 3;
// Files a kickoff may create: knowledge homes and host entry files, never a manifest or source.
const knowledgeFile = /^(docs\/.+\.md|AGENTS\.md|CLAUDE\.md|GEMINI\.md|\.github\/copilot-instructions\.md)$/;
const skipDirs = new Set(['node_modules', '.git']);

const read = file => { try { return readFileSync(file, 'utf8'); } catch { return null; } };

function files(root, dir = '') {
  const out = [];
  let entries;
  try { entries = readdirSync(path.join(root, dir), { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    if (skipDirs.has(entry.name)) continue;
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...files(root, rel));
    else out.push(rel);
  }
  return out.sort();
}

/** Bare: nothing outside docs/, README*, LICENSE*, host entry files and dotfiles. */
export function detectBare(root) {
  const source = files(root).filter(file => !file.split('/').some(part => part.startsWith('.'))
    && !file.startsWith('docs/') && !/^(README|LICENSE|AGENTS\.md$|CLAUDE\.md$|GEMINI\.md$)/i.test(file));
  return { bare: source.length === 0, source: source.slice(0, 5) };
}

/** Offer automatically only on a bare project; an explicit request works anywhere. */
export function shouldOffer(root, { requested = false } = {}) {
  return requested || detectBare(root).bare;
}

const hash = text => createHash('sha256').update(text).digest('hex');
const readState = root => JSON.parse(read(path.join(root, statePath)) ?? 'null');
function writeState(root, state) {
  const dir = path.join(root, path.dirname(statePath));
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    writeFileSync(path.join(dir, '.gitignore'), '*\n', { flag: 'wx', mode: 0o600 });
  }
  writeFileSync(path.join(root, statePath), `${JSON.stringify(state, null, 2)}\n`);
}

/** Record what exists before the kickoff writes anything, so the check can prove what changed. */
export function startKickoff(root) {
  const before = Object.fromEntries(files(root).map(file => [file, hash(readFileSync(path.join(root, file)))]));
  const agents = read(path.join(root, 'AGENTS.md'));
  const state = { schemaVersion: 1, before, agentsLines: agents ? agents.split('\n').filter(line => line.trim()) : [], answered: [], rounds: 0, done: false };
  writeState(root, state);
  return state;
}

/** Append one user message verbatim; summarizing happens elsewhere, at the end. */
export function appendNote(root, text) {
  const file = path.join(root, notesPath);
  if (!existsSync(file)) {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, '# Kickoff notes\n\nThe user\'s own words from the project kickoff, verbatim and in order. Summaries live in the linked context files.\n');
  }
  appendFileSync(file, `\n---\n\n${text.replace(/\s+$/, '')}\n`);
}

/** Mark topics the user has answered and return the next round: at most three open topics, none repeated. */
export function nextRound(root, { answered = [], enough = false } = {}) {
  const state = readState(root) ?? startKickoff(root);
  for (const topic of answered) {
    if (!topics.includes(topic)) throw new Error(`Unknown kickoff topic: ${topic}; use ${topics.join(', ')}`);
    if (!state.answered.includes(topic)) state.answered.push(topic);
  }
  const open = topics.filter(topic => !state.answered.includes(topic));
  state.done = enough || open.length === 0;
  const ask = state.done ? [] : open.slice(0, questionsPerRound);
  if (ask.length) state.rounds += 1;
  writeState(root, state);
  return { ask, open, done: state.done, rounds: state.rounds };
}

function links(text) {
  return [...text.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)].map(match => match[1]).filter(link => !/^[a-z]+:/i.test(link));
}

/** The write rules: no scaffold or manifest, no empty file, no dangling link, existing guidance kept. */
export function checkKickoff(root) {
  const state = readState(root);
  if (!state) throw new Error('No kickoff in progress; run start first');
  const problems = [];
  const now = files(root);
  for (const file of now) {
    if (file.split('/').some(part => part.startsWith('.'))) continue;
    if (!(file in state.before) && !knowledgeFile.test(file)) problems.push(`created ${file}: the kickoff writes knowledge files only, no scaffold or manifest`);
    if (file in state.before && state.before[file] !== hash(readFileSync(path.join(root, file))) && !knowledgeFile.test(file)) problems.push(`changed ${file}`);
  }
  for (const file of now.filter(name => knowledgeFile.test(name) && !(name in state.before && state.before[name] === hash(readFileSync(path.join(root, name)))))) {
    const text = readFileSync(path.join(root, file), 'utf8');
    if (!text.trim() || !text.split('\n').some(line => line.trim() && !line.startsWith('#'))) problems.push(`${file} is empty`);
    for (const link of links(text)) {
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), link));
      if (target.startsWith('..') || !existsSync(path.join(root, target))) problems.push(`${file} links to missing ${link}`);
    }
  }
  const agents = read(path.join(root, 'AGENTS.md'));
  if (state.agentsLines.length) {
    const kept = agents ? agents.split('\n') : [];
    let at = 0;
    for (const line of state.agentsLines) {
      const found = kept.indexOf(line, at);
      if (found < 0) { problems.push(`AGENTS.md lost an existing line: ${line.slice(0, 60)}`); break; }
      at = found + 1;
    }
  }
  return problems;
}

/** One screen: each written file and what it holds. */
export function summary(root) {
  const state = readState(root);
  if (!state) throw new Error('No kickoff in progress; run start first');
  const lines = ['Captured in the kickoff:'];
  for (const file of files(root).filter(name => knowledgeFile.test(name))) {
    const text = readFileSync(path.join(root, file), 'utf8');
    if (state.before[file] === hash(text)) continue;
    const headings = [...text.matchAll(/^#{2,3} (.+)$/gm)].map(match => match[1]).filter(heading => heading !== 'Sources');
    const what = file === notesPath ? [`${text.split('\n---\n').length - 1} message(s), verbatim`]
      : headings.length ? [headings.slice(0, 6).join(', ')] : [text.split('\n').find(line => line.trim() && !line.startsWith('#'))?.slice(0, 100) ?? ''];
    lines.push(`- ${file}${file in state.before ? ' (edited)' : ' (new)'}: ${what.join(' ')}`);
  }
  const open = topics.filter(topic => !state.answered.includes(topic));
  if (open.length) lines.push(`Still open: ${open.join(', ')}.`);
  lines.push('What should I correct before the first brief?');
  return lines.join('\n');
}

export async function main(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;
  const flags = {};
  for (let index = 0; index < rest.length; index += 1) {
    if (['--enough', '--requested'].includes(rest[index])) { flags[rest[index]] = true; continue; }
    flags[rest[index]] = rest[index + 1]; index += 1;
  }
  const root = path.resolve(flags['--root'] ?? '.');
  requireDir(root);
  let result;
  if (command === 'detect') result = { ...detectBare(root), offer: shouldOffer(root, { requested: flags['--requested'] === true }) };
  else if (command === 'start') { startKickoff(root); result = { started: true, notes: notesPath }; }
  else if (command === 'note') { appendNote(root, readFileSync(0, 'utf8')); result = { appended: notesPath }; }
  else if (command === 'round') result = nextRound(root, { answered: (flags['--answered'] ?? '').split(',').filter(Boolean), enough: flags['--enough'] === true });
  else if (command === 'check') {
    const problems = checkKickoff(root);
    result = { ok: problems.length === 0, problems };
    if (problems.length) process.exitCode = 2;
  } else if (command === 'summary') { process.stdout.write(`${summary(root)}\n`); return null; }
  else throw new Error('Usage: kickoff.mjs detect|start|note|round|check|summary --root <project> [--requested] [--answered topics] [--enough]');
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

function requireDir(root) {
  if (!lstatSync(root).isDirectory()) throw new Error(`Not a directory: ${root}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`Kickoff stopped: ${error.message}\n`); process.exitCode = 1; });
}
