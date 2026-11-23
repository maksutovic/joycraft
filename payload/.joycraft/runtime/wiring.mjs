import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { workPaths } from './config.mjs';

// A report-only check that the project's entry files carry Joycraft: Joycraft's
// lines (the managed block), a context map with at least one project row, and (when
// Claude Code is installed) a CLAUDE.md that imports AGENTS.md, unless AGENTS.md
// itself imports CLAUDE.md. It never edits a file; the agent writes the missing
// pieces after talking with the person. `findings` decide the exit code;
// `advice` (areas setup has not mapped yet; at session start, tidy and no-git) never does.
const read = (root, file) => { try { return readFileSync(path.join(root, file), 'utf8'); } catch { return null; } };

// Joycraft's own lines in AGENTS.md: one block between markers, the same for
// every project. This is the one definition. The runtime prints it
// (entry-check.mjs block) and checks it; the agent places it. A release that
// changes Joycraft's lines changes this text and nothing else in the file.
// An entry can hold indented sub-items on its own lines (the `Work` line).
export const managedOpen = '<!-- joycraft:managed -->';
export const managedClose = '<!-- /joycraft:managed -->';
const managedLines = [
  'First action in each session: run `node .joycraft/runtime/update-check.mjs check`. If it prints JSON, follow `.joycraft/references/update.md`.',
  'Ask a person to answer or approve anything only through Joycraft\'s decision artifact (`node .joycraft/runtime/artifacts/cli.mjs`, see `.joycraft/references/artifacts.md#asking-questions`), in the project\'s question style. Every page that shows a person a document, a question or a decision comes from that engine: never write your own HTML page for one. Show every other document a person must read (a plan, spec set, report or review) as an engine page (`--doc`), never only as Markdown in chat, where the person works (see `.joycraft/references/artifacts.md#showing-a-page`), and say where it is.',
  'A Context Map row that matches your next step binds: read that page first, and again after a compaction or in a new agent. A record (a log or history) is an audit trail: search it to learn why or when; do not read it at the start.',
  'When a fact here disagrees with the code, trust the code and report it. A rule holds even when the code breaks it.',
  'Search the mapped pages first. A doc that no map row reaches is working material, not current truth.',
  [
    'Work: before you change code, say `Path: small job` or `Path: feature`.',
    '  - Small job: it fits one session, needs no owner answer you cannot assume, and has no migration, auth, payment, deploy or public-API change. A time limit from the user means this path. When Git has no commit yet, first commit what is there as `chore: set up Joycraft`. Write `docs/features/<slug>/brief.md` (the features folder in `joycraft.yaml` when set): the user\'s request word for word, then a "Done when" list. Each line is a state or input with its expected result and its check (`test: <file>` or `seen: <render>`). Write one line for each thing the user asked for, in their words, with how it must feel, and one for a missing input. The first line gives the one answer that the screen or output shows, and that each repeated item in it shows, when its inputs disagree. Every other statement there is a reason for that answer. Test a line about an outside source where the source enters, with the source stubbed. Write each guess as an `Assumed:` line. Do not ask. Build no page for this brief. Build, and check each line.',
    '  - Look, before you close: give a fresh agent (Claude Code: agent type `joycraft-look`) only the user\'s words and renders of the default state and of a state where the inputs of the first line disagree. Save the renders in `.joycraft/local/looks/<slug>/`. A switch that fakes data says so on the screen. Give it no brief and no code. Ask: "Quote any two statements on this screen that disagree about the main answer, or reply OK. At most 8 lines." Two such quotes block the close: fix, then look again one time. Its other remarks are notes. With no separate agent, read the renders yourself and say the look was not independent.',
    '  - Close: mark each line `test: <file>`, `seen: <render>` or `not checked: <why>`, and add a `Look:` line with the result. Update what the change makes stale, in this file (purpose, commands, map rows) and in the mapped page, with how to run and look at the result. Add a trap (it cost you a retry) to `docs/context/traps.md`, with a map row. Put a standing instruction from the user under `## Rules` in their words. Stage your work, then run `node .joycraft/runtime/close.mjs <slug> -m "<message>"`, which archives the brief and commits. Final message, at most 120 words: how to run the result, each guess that changes the answer, then the line that the command printed.',
    '  - Feature: all other work, or when the user asks for the full loop: use the `joycraft-entry` skill. A small job becomes a feature when it needs an owner answer, meets one of those changes, or fails the same check twice: keep the brief and add specs.',
  ].join('\n'),
];
export const managedBlock = [managedOpen, ...managedLines.map(line => `- ${line}`), managedClose].join('\n');
// The command that every version of Joycraft's first-action line names.
const firstAction = 'update-check.mjs check';
// Words of the older loose lines that the block replaced.
const olderLines = [firstAction, 'never only as Markdown in chat'];

function claudeInstalled(root, hosts) {
  if (Array.isArray(hosts)) return hosts.includes('claude');
  const text = read(root, '.joycraft/installation.json');
  if (text === null) return false;
  try {
    const manifest = JSON.parse(text);
    const hosts = Array.isArray(manifest?.hosts) ? manifest.hosts : [manifest?.harness];
    return hosts.includes('claude');
  } catch { return false; }
}

// Lines outside fenced code, so an example in a fence is not read as the map.
function proseLines(text) {
  let fence = null;
  return text.split(/\r?\n/).map(line => {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (!fence) {
      if (!marker || (marker[0] === '`' && line.trimStart().slice(marker.length).includes('`'))) return line;
      fence = marker;
    } else if (marker && marker[0] === fence[0] && marker.length >= fence.length && /^\s*[`~]+\s*$/.test(line)) fence = null;
    return '';
  });
}

/** The lines under the context map heading, up to the next heading of the same or a higher level; null when there is none. */
function contextMap(text) {
  const lines = proseLines(text);
  // Any heading whose text starts with "context map": `## Context Map (read only what you need)`.
  const start = lines.findIndex(line => /^ {0,3}#{1,6}\s+context map\b/i.test(line));
  if (start === -1) return null;
  const level = /^ {0,3}(#+)/.exec(lines[start])[1].length;
  const end = lines.findIndex((line, index) => index > start && (/^ {0,3}(#+)\s/.exec(line)?.[1].length ?? 7) <= level);
  return lines.slice(start + 1, end === -1 ? undefined : end);
}

/** Reference-link definitions (`[label]: target`) outside code, keyed by lowercased label. */
function linkDefinitions(lines) {
  const out = new Map();
  for (const line of lines) {
    const match = /^ {0,3}\[([^\]]+)\]:\s+(?:<([^>]+)>|(\S+))/.exec(line);
    const label = match?.[1].trim().toLowerCase();
    if (label && !out.has(label)) out.set(label, match[2] ?? match[3]);
  }
  return out;
}

/**
 * Project-relative targets of a table row: inline links, full and collapsed
 * reference links (`[p][ref]`, `[p][]`) and backticked paths. A leading `/` means
 * the project root.
 */
function rowTargets(row, definitions = new Map()) {
  const raw = [
    ...[...row.matchAll(/\[[^\]]*\]\((?:<([^>]+)>|([^)\s]+))[^)]*\)/g)].map(match => match[1] ?? match[2]),
    ...[...row.matchAll(/\[([^\]]*)\]\[([^\]]*)\]/g)].map(match => definitions.get((match[2] || match[1]).trim().toLowerCase())).filter(Boolean),
    ...[...row.matchAll(/`([^`\s]+)`/g)].map(match => match[1]).filter(value => value.includes('/') || /\.[a-z0-9]+$/i.test(value)),
  ];
  return raw.map(target => target.split('#')[0])
    .filter(target => target && !/^[a-z][a-z0-9+.-]*:/i.test(target) && !target.startsWith('//'))
    .map(target => target.replace(/^\/+/, ''))
    .filter(Boolean)
    .map(target => path.posix.normalize(target));
}

/**
 * Where Joycraft's lines are in an entry file: `block` (the exact block),
 * `changed` (markers with other text between them, or one marker), `loose`
 * (the older lines with no markers) or `none`. `line` is the 1-based line of
 * the opening marker or of the loose first-action line.
 */
export function managedState(text) {
  const lines = proseLines(text ?? '').map(line => line.trimEnd());
  const open = lines.indexOf(managedOpen), close = lines.indexOf(managedClose);
  if (open !== -1 || close !== -1) {
    const exact = open !== -1 && close > open && lines.slice(open, close + 1).join('\n') === managedBlock;
    // An older loose line outside the markers says the same thing twice.
    const beside = lines.findIndex((line, index) => (index < open || index > close) && olderLines.some(words => line.includes(words)));
    return { state: exact ? 'block' : 'changed', line: (open === -1 ? close : open) + 1, ...(beside === -1 ? {} : { loose: beside + 1 }) };
  }
  const loose = lines.findIndex(line => line.includes(firstAction));
  return loose === -1 ? { state: 'none', line: null } : { state: 'loose', line: loose + 1 };
}

const imports = (text, file) => text !== null && proseLines(text).some(line => new RegExp(`^\\s*@(\\./)?${file.replace('.', '\\.')}\\s*$`).test(line));

/** True when AGENTS.md is CLAUDE.md (a symlink) or imports it, so Claude Code reads both without a reciprocal import. */
function agentsDefersToClaude(root, agents) {
  try { if (realpathSync(path.join(root, 'AGENTS.md')) === realpathSync(path.join(root, 'CLAUDE.md'))) return true; } catch { /* either file missing */ }
  return imports(agents, 'CLAUDE.md');
}

/** Items of the `## Not yet mapped` list in the project context page: areas setup has not read yet. */
export function unmappedAreas(text) {
  if (text === null) return [];
  const lines = proseLines(text);
  const start = lines.findIndex(line => /^ {0,3}#{1,6}\s+not yet mapped\b/i.test(line));
  if (start === -1) return [];
  const level = /^ {0,3}(#+)/.exec(lines[start])[1].length;
  const areas = [];
  for (const line of lines.slice(start + 1)) {
    if ((/^ {0,3}(#+)\s/.exec(line)?.[1].length ?? 7) <= level) break;
    const item = /^\s*[-*+]\s+(.+?)\s*$/.exec(line)?.[1];
    if (item) areas.push(item);
  }
  return areas;
}

function contextPage(root) {
  try { return `${workPaths(root).context}/project.md`; } catch { return 'docs/context/project.md'; }
}

const outsideJoycraft = target => target !== '.joycraft' && !target.startsWith('.joycraft/') && !target.startsWith('../');

/** Report what is missing for the project to be wired up. Reads files only. */
export function checkWiring(root, { hosts } = {}) {
  const findings = [];
  const agents = read(root, 'AGENTS.md');
  if (agents === null) {
    findings.push({ check: 'no-agents-md', path: 'AGENTS.md', detail: 'The project has no AGENTS.md, so agents get no Joycraft lines and no context map.', fix: "Ask the agent to set up Joycraft's context map (see .joycraft/references/setup.md)." });
  } else {
    if (managedState(agents).state === 'none') {
      findings.push({ check: 'no-joycraft-lines', path: 'AGENTS.md', detail: "AGENTS.md has no Joycraft block, so sessions do not start with Joycraft.", fix: 'Put the output of `node .joycraft/runtime/entry-check.mjs block` in AGENTS.md with a targeted edit.' });
    }
    const map = contextMap(agents);
    if (map === null) {
      findings.push({ check: 'no-context-map', path: 'AGENTS.md', detail: 'AGENTS.md has no `## Context Map` heading, so agents cannot find project knowledge.', fix: 'Add a context map table that links project documents, each with a "read when".' });
    } else {
      const rows = map.filter(line => /^\s*\|/.test(line));
      const definitions = linkDefinitions(proseLines(agents));
      if (!rows.some(row => rowTargets(row, definitions).some(outsideJoycraft))) {
        findings.push({ check: 'empty-context-map', path: 'AGENTS.md', detail: 'The context map has no row that points to a project document outside .joycraft/.', fix: 'Add rows for the project documents agents should read, each with a "read when".' });
      }
    }
  }
  if (claudeInstalled(root, hosts)) {
    const claude = read(root, 'CLAUDE.md');
    // An @AGENTS.md line inside a code fence is an example, not an import.
    if (!imports(claude, 'AGENTS.md') && !(claude !== null && agentsDefersToClaude(root, agents))) {
      findings.push({ check: 'no-claude-import', path: 'CLAUDE.md', detail: claude === null ? 'Claude Code is installed, but there is no CLAUDE.md, so Claude Code does not read AGENTS.md.' : 'Claude Code is installed, but CLAUDE.md has no `@AGENTS.md` line, so Claude Code does not read AGENTS.md.', fix: 'Add a line `@AGENTS.md` to CLAUDE.md, creating the file if needed.' });
    }
  }
  const advice = [];
  const page = contextPage(root);
  const areas = unmappedAreas(read(root, page));
  if (areas.length) {
    advice.push({ check: 'unmapped-areas', path: page, areas, detail: `Setup has not read ${areas.length === 1 ? 'one area' : `${areas.length} areas`} yet: ${areas.join('; ')}.`, fix: 'When a request touches a listed area, map that area first (read it, propose rows, write on yes) and remove it from the list.' });
  }
  return { wired: findings.length === 0, findings, advice };
}

const noGitRule = /^\s*[-*] No Git\b/m;

export async function main(argv = process.argv.slice(2)) {
  const index = argv.indexOf('--root');
  if (!(argv.length === 0 || (argv.length === 2 && index === 0))) throw new Error('Usage: wiring.mjs [--root <project>]');
  const root = path.resolve(index === 0 ? argv[1] : '.');
  const result = checkWiring(root);
  // Start advice from the tidy range. Loaded here, so install and doctor stay file-only.
  // Advice is optional: a broken import or tidy run gives the same wiring result with no advice.
  try {
    const { tidyAdvice } = await import('./entry-check.mjs');
    const tidy = tidyAdvice({ root });
    if (tidy) result.advice.push(tidy);
  } catch { /* no tidy advice */ }
  // Git advice: submit and the small-job close need a commit. Advice only, never a finding.
  // A `- No Git` line in AGENTS.md records the user's no, so the advice stops.
  try {
    const { gitState } = await import('./kickoff.mjs');
    if (!noGitRule.test(read(root, 'AGENTS.md') ?? '') && !gitState(root).commit) result.advice.push({ check: 'no-git', path: '.', detail: 'This folder is not a Git repository with a commit, so submit stops and a small job cannot close in one commit.', fix: 'Settle Git once, as step 2 of .joycraft/references/setup.md says.' });
  } catch { /* no Git advice */ }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.wired) process.exitCode = 2;
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`Wiring check stopped: ${error.message}\n`); process.exitCode = 1; });
}
