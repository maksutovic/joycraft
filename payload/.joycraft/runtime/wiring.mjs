import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { workPaths } from './config.mjs';

// A report-only check that the project's entry files carry Joycraft: the
// update-check line, a context map with at least one project row, and (when
// Claude Code is installed) a CLAUDE.md that imports AGENTS.md, unless AGENTS.md
// itself imports CLAUDE.md. It never edits a file; the agent writes the missing
// pieces after talking with the person. `findings` decide the exit code;
// `advice` (areas setup has not mapped yet) never does.
const read = (root, file) => { try { return readFileSync(path.join(root, file), 'utf8'); } catch { return null; } };

function claudeInstalled(root) {
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
export function checkWiring(root) {
  const findings = [];
  const agents = read(root, 'AGENTS.md');
  if (agents === null) {
    findings.push({ check: 'no-agents-md', path: 'AGENTS.md', detail: 'The project has no AGENTS.md, so agents get no Joycraft lines and no context map.', fix: "Ask the agent to set up Joycraft's context map (see .joycraft/references/setup.md)." });
  } else {
    if (!agents.includes('update-check.mjs check')) {
      findings.push({ check: 'no-joycraft-lines', path: 'AGENTS.md', detail: 'AGENTS.md has no `node .joycraft/runtime/update-check.mjs check` line, so sessions do not start with Joycraft.', fix: 'Add the Joycraft lines from .joycraft/references/setup.md with a targeted edit.' });
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
  if (claudeInstalled(root)) {
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

export async function main(argv = process.argv.slice(2)) {
  const index = argv.indexOf('--root');
  if (!(argv.length === 0 || (argv.length === 2 && index === 0))) throw new Error('Usage: wiring.mjs [--root <project>]');
  const result = checkWiring(path.resolve(index === 0 ? argv[1] : '.'));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.wired) process.exitCode = 2;
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`Wiring check stopped: ${error.message}\n`); process.exitCode = 1; });
}
