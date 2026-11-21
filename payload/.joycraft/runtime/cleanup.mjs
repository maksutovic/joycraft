import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseYaml, readConfig } from './config.mjs';
import { requireValue } from './identity.mjs';
import { projectStatus } from './status.mjs';
import { managedState } from './wiring.mjs';
import { listWorktrees } from './worktrees.mjs';

// A report-only sweep for stale project knowledge. Every check is deterministic:
// files, links, frontmatter and Git history. It never edits a file; the
// joycraft-cleanup skill tidies the entry files and audits the other docs.
const entryFiles = ['AGENTS.md', 'CLAUDE.md'];

function markdownFiles(root, folder, skip = []) {
  const out = [];
  const walk = relative => {
    if (skip.includes(relative)) return;
    let entries;
    try { entries = readdirSync(path.join(root, relative), { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const child = `${relative}/${entry.name}`;
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile() && entry.name.endsWith('.md')) out.push(child);
    }
  };
  walk(folder);
  return out.sort();
}

const read = (root, file) => { try { return readFileSync(path.join(root, file), 'utf8'); } catch { return null; } };

/**
 * Files named `names` anywhere in the project, as project-relative paths. Git
 * lists them when it can, so ignored folders are skipped; otherwise a walk
 * that skips dot folders and node_modules does.
 */
function filesNamed(root, names) {
  try {
    const listed = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...names.map(name => `:(glob)**/${name}`)],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
    return listed.split('\0').filter(file => file && existsSync(path.join(root, file))).sort();
  } catch { /* not a Git repository: walk */ }
  const out = [];
  const walk = (relative, depth) => {
    let entries;
    try { entries = readdirSync(path.join(root, relative), { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) { if (depth < 6 && !entry.name.startsWith('.') && entry.name !== 'node_modules') walk(child, depth + 1); }
      else if (entry.isFile() && names.includes(entry.name)) out.push(child);
    }
  };
  walk('', 0);
  return out.sort();
}

// A fence opens with three or more backticks or tildes at any indent (list items
// indent theirs) and closes on a line of the same character, at least as long.
// An unclosed fence runs to the end of the file, as in CommonMark.
function blankFences(text) {
  let fence = null;
  return text.split('\n').map(line => {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (!fence) {
      // A backtick fence's info string has no backtick; ```npm test``` is inline code.
      if (!marker || (marker[0] === '`' && line.trimStart().slice(marker.length).includes('`'))) return line;
      fence = marker;
    } else if (marker && marker[0] === fence[0] && marker.length >= fence.length && /^\s*[`~]+\s*$/.test(line)) {
      fence = null;
    }
    return ' '.repeat(line.length);
  }).join('\n');
}

// An ISO date, YYYY-MM-DD. Month names and version numbers do not match.
const isoDate = /(?<![\d.])(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])(?!\d)/;
// Codex stops reading instruction files at this many bytes (project_doc_max_bytes).
export const codexBytes = 32768;
// Words after `pnpm`, `yarn` or `bun` that are the tool's own commands, not package scripts.
const managerCommands = new Set(['add', 'audit', 'bin', 'build', 'cache', 'ci', 'config', 'create', 'dedupe', 'deploy', 'dlx', 'doctor', 'env', 'exec', 'fetch',
  'help', 'i', 'import', 'info', 'init', 'install', 'link', 'list', 'login', 'logout', 'ls', 'outdated', 'pack', 'patch', 'pm', 'prune', 'publish', 'rebuild',
  'remove', 'rm', 'root', 'run', 'set', 'setup', 'store', 'uninstall', 'unlink', 'up', 'update', 'upgrade', 'version', 'why', 'workspace', 'workspaces', 'x']);

/** The package script a code span runs, or null: `npm run x`, `npm test`, `pnpm x`, `yarn x`, `bun run x`. */
function scriptName(span) {
  const match = /^(npm|pnpm|yarn|bun)\s+(?:(run|run-script)\s+)?([A-Za-z0-9][A-Za-z0-9:_.-]*)(?:\s|$)/.exec(span.trim());
  if (!match) return null;
  const [, manager, run, name] = match;
  if (run) return name;
  if (manager === 'npm') return name === 'test' ? name : null;
  if (manager === 'bun' && name === 'test') return null;
  return managerCommands.has(name) ? null : name;
}

// File types a backticked name with a slash is read as a path for; a name with a
// slash and no extension counts only when it ends in / or its first folder exists.
const pathExtensions = new Set(['md', 'mdx', 'txt', 'json', 'jsonl', 'yaml', 'yml', 'toml', 'js', 'mjs', 'cjs', 'ts', 'mts', 'cts', 'tsx', 'jsx',
  'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift', 'c', 'h', 'cpp', 'cs', 'php', 'sh', 'sql', 'html', 'css', 'scss', 'svg', 'png', 'lock', 'env', 'xml', 'csv']);

/**
 * A backticked span that names a project path, normalized, or null. Skipped:
 * anything with spaces, globs, placeholders (<slug>, [slug], {x}, $VAR, ...),
 * URLs and other colon forms, absolute, home, parent and flag-like spans, and
 * names without a slash (a bare file name could live in any folder).
 */
export function projectPath(span, exists = () => true) {
  let value = span.trim().replace(/#.*$/, '').replace(/:\d+(?::\d+)?$/, '');
  if (!value || /\s/.test(value) || /[*?<>[\]{}$%:@`'"|\\]/.test(value) || value.includes('...')) return null;
  if (/^[-/~.]/.test(value) && !value.startsWith('./') && !/^\.[A-Za-z0-9_]/.test(value)) return null;
  if (!value.includes('/')) return null;
  value = path.posix.normalize(value);
  if (value.startsWith('../') || value === '..' || value === '.') return null;
  const extension = /\.([A-Za-z0-9]+)$/.exec(value.replace(/\/$/, ''))?.[1]?.toLowerCase();
  if (span.trim().endsWith('/') || pathExtensions.has(extension) || exists(value.split('/')[0])) return value;
  return null;
}

/**
 * Markdown links (checked for existence), backticked project paths and
 * `@path` import lines (references only). Imports resolve from the file's folder,
 * as Claude Code reads them.
 */
export function references(file, text) {
  const dir = path.posix.dirname(file);
  const links = [], mentions = [], nearby = [], imports = [], importLines = [];
  // Blank out fenced code so examples are not read as links; keep line numbers.
  text = blankFences(text);
  // Offsets where each line starts, built once; a lookup is a binary search.
  const starts = [0];
  for (let index = text.indexOf('\n'); index !== -1; index = text.indexOf('\n', index + 1)) starts.push(index + 1);
  const lineOf = index => {
    let low = 0, high = starts.length - 1;
    while (low < high) { const mid = (low + high + 1) >> 1; if (starts[mid] <= index) low = mid; else high = mid - 1; }
    return low + 1;
  };
  const add = (raw, index) => {
    const target = raw.split('#')[0];
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('/')) return;
    let decoded = target;
    try { decoded = decodeURI(target); } catch { /* keep the raw text when an escape is malformed */ }
    links.push({ target: path.posix.normalize(path.posix.join(dir, decoded)), line: lineOf(index) });
  };
  for (const match of text.matchAll(/\[[^\]]*\]\((?:<([^>]+)>|([^)\s]+))(?:\s+"[^"]*")?\)/g)) add(match[1] ?? match[2], match.index);
  for (const match of text.matchAll(/^ {0,3}\[[^\]]+\]:\s+(?:<([^>]+)>|(\S+))/gm)) add(match[1] ?? match[2], match.index);
  for (const match of text.matchAll(/`([A-Za-z0-9_.\/-]+\.md)`/g)) {
    if (match[1].includes('/')) mentions.push({ target: path.posix.normalize(match[1]), line: lineOf(match.index) });
    // A page names a sibling as a reader would: from its own folder. An entry file at the root has no other reading.
    if (dir !== '.') nearby.push({ target: path.posix.normalize(path.posix.join(dir, match[1])), line: lineOf(match.index) });
  }
  for (const match of text.matchAll(/^[ \t]*@(\S+)[ \t]*$/gm)) {
    const target = match[1];
    importLines.push({ raw: target, line: lineOf(match.index) });
    if (/^[~/]/.test(target) || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    imports.push({ target: path.posix.normalize(path.posix.join(dir, target)), line: lineOf(match.index) });
  }
  // Single-backtick spans on one line; fenced blocks are already blank.
  const spans = [];
  for (const match of text.matchAll(/(?<!`)`([^`\n]+)`(?!`)/g)) spans.push({ span: match[1], line: lineOf(match.index) });
  return { links, mentions, nearby, imports, importLines, spans };
}

function frontmatter(text) {
  const block = /^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!block) return null;
  try { return parseYaml(block[1]); } catch (error) { return { unreadable: error.message.replace(/^joycraft\.yaml /, '') }; }
}

/** A page that records the past: `type: log|history` frontmatter, a decision log or a shipped ledger. */
function historyPage(file, text) {
  const name = path.posix.basename(file);
  if (name === 'decision-log.md' || /^shipped.*\.md$/.test(name)) return true;
  const type = frontmatter(text)?.type;
  return type === 'log' || type === 'history';
}

const inside = (file, folder) => file === folder || file.startsWith(`${folder}/`);

/** The paths of `paths` that Git ignores, from one `git check-ignore --stdin` call. */
function gitIgnored(root, paths) {
  if (paths.length === 0) return new Set();
  const result = spawnSync('git', ['check-ignore', '-z', '--stdin'], { cwd: root, input: paths.join('\0'), encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
  return new Set(result.status === 0 ? result.stdout.split('\0').filter(Boolean) : []);
}

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/** Context pages whose mapped code changed in commits after the page last changed. */
function impactDrift(root, impact, findings, skipped) {
  if (impact.length === 0) return;
  try { git(root, ['rev-parse', '--verify', 'HEAD']); } catch { skipped.push({ check: 'impact-drift', reason: 'Not a Git repository with commits.' }); return; }
  for (const entry of impact) {
    for (const doc of entry.docs) {
      if (!existsSync(path.join(root, doc))) { findings.push({ check: 'impact-drift', path: doc, detail: `Mapped to ${entry.source} in joycraft.yaml, but the page does not exist.`, fix: 'Create the page or remove it from cleanup.impact.' }); continue; }
      const last = git(root, ['log', '-1', '--format=%H', '--', doc]);
      if (!last) { skipped.push({ check: 'impact-drift', path: doc, reason: 'The page has no commit yet.' }); continue; }
      const commits = git(root, ['log', '--format=%h', `${last}..HEAD`, '--', `:(glob)${entry.source}`]).split('\n').filter(Boolean);
      if (commits.length) {
        const files = [...new Set(git(root, ['diff', '--name-only', last, 'HEAD', '--', `:(glob)${entry.source}`]).split('\n').filter(Boolean))];
        findings.push({ check: 'impact-drift', path: doc, detail: `${commits.length} commit(s) changed ${entry.source} after this page last changed: ${files.slice(0, 8).join(', ')}${files.length > 8 ? ', …' : ''}.`, fix: 'Read the changed code and update the page, or, if it is still true, add a `verified: <today>` line to it.', commits });
      }
    }
  }
}

// Every check this script runs: id, kind, what it finds. `mechanical` means a
// script can check the fix (session end may make it); `report` waits for a person.
export const checkList = [
  ['unarchived', 'report', 'A feature whose specs are all done, still in paths.features'],
  ['status-drift', 'mechanical', 'A spec whose queue status and frontmatter status differ (status.mjs --fix)'],
  ['frontmatter-unreadable', 'report', 'Context-page frontmatter that cleanup cannot parse'],
  ['stale-after', 'report', 'A context page whose stale_after date has passed'],
  ['working-link', 'report', 'A guide or entry file linking a feature or archive folder'],
  ['deprecated-link', 'report', 'A link to a page marked status: deprecated'],
  ['broken-link', 'report', 'A Markdown link to a file that does not exist'],
  ['missing-path', 'mechanical', 'A backticked project path that does not exist and Git does not ignore (fixed when Git shows one rename)'],
  ['unmapped', 'report', 'A context page that only other context pages mention'],
  ['entry-size', 'report', 'An entry file over cleanup.entryWords words (default 1000)'],
  ['temporal', 'report', 'A date or a link to a dated file in an entry file, outside code spans'],
  ['script-name', 'report', 'A package script that an entry file names and no package.json defines'],
  ['codex-bytes', 'report', 'AGENTS.md files from the root to one folder over 32,768 bytes, the Codex limit'],
  ['managed-block', 'mechanical', "Joycraft's AGENTS.md block differs from entry-check.mjs block"],
  ['import', 'report', 'An @path line in an entry file (not @AGENTS.md in CLAUDE.md), or AGENTS.override.md'],
  ['orphan', 'report', 'A context page that nothing links to'],
  ['impact-drift', 'report', 'A page in cleanup.impact whose mapped code changed after the page last changed'],
  ['unknown-worktree', 'report', 'A linked worktree that worktrees.mjs did not create'],
];

/** Report stale working material, link problems, unmapped pages and code drift. */
export function cleanupReport({ root = process.cwd(), now = Date.now() } = {}) {
  const config = readConfig(root);
  const { features, archive, context } = config.paths;
  const findings = [], skipped = [];

  const status = projectStatus({ root });
  for (const item of status.readyToArchive) {
    findings.push({ check: 'unarchived', path: item.folder, detail: `Every spec is done, but the feature is still in ${features}.${item.openDecisions.length ? ` Open decisions: ${item.openDecisions.join(', ')}.` : ''}`, fix: 'Archive it at session end (archive.mjs), after carrying durable facts into the context home.' });
  }
  for (const item of status.drift) findings.push({ check: 'status-drift', path: item.file, detail: `Queue says ${item.queue}, frontmatter says ${item.frontmatter}.`, fix: item.fixable ? 'Run status.mjs --fix.' : item.reason });

  const pages = markdownFiles(root, context, [features, archive]);
  const authorities = [...entryFiles.filter(file => existsSync(path.join(root, file))), ...pages];
  const referenced = new Set();
  const deprecated = new Set();
  for (const page of pages) {
    const meta = frontmatter(read(root, page) ?? '');
    if (meta?.unreadable) { findings.push({ check: 'frontmatter-unreadable', path: page, detail: `Frontmatter uses YAML that cleanup cannot read (${meta.unreadable}), so its status and stale_after are not checked.`, fix: 'Use plain key: value lines, lists and quoted strings in the frontmatter.' }); continue; }
    if (meta?.status === 'deprecated') deprecated.add(page);
    const staleAfter = meta?.stale_after == null ? NaN : Date.parse(String(meta.stale_after));
    if (Number.isFinite(staleAfter) && staleAfter <= now) findings.push({ check: 'stale-after', path: page, detail: `stale_after ${meta.stale_after} has passed.`, fix: 'Recheck the page against its sources, then move stale_after forward or mark it deprecated.' });
  }
  // Read and parse each file once; the checks below share the result.
  const parsed = new Map(authorities.map(file => {
    const text = read(root, file) ?? '';
    return [file, { text, ...references(file, text) }];
  }));
  for (const file of authorities) {
    const { links, mentions, nearby, imports } = parsed.get(file);
    for (const ref of nearby) if (ref.target !== file) referenced.add(ref.target);
    for (const ref of [...links, ...mentions, ...imports]) {
      if (ref.target !== file) referenced.add(ref.target);
      // A record rightly links the brief or the archive that it records.
      if (!historyPage(file, parsed.get(file).text) && (inside(ref.target, features) || inside(ref.target, archive))) {
        findings.push({ check: 'working-link', path: file, line: ref.line, detail: `Links to ${ref.target}, which is ${inside(ref.target, archive) ? 'history' : 'working material'}, not current knowledge.`, fix: `Move the fact it relies on into ${context}/ and link that instead.` });
      }
      if (deprecated.has(ref.target)) findings.push({ check: 'deprecated-link', path: file, line: ref.line, detail: `Links to ${ref.target}, which is marked status: deprecated.`, fix: 'Link the current page instead, or drop the link.' });
    }
    for (const ref of links) {
      if (!existsSync(path.join(root, ref.target))) findings.push({ check: 'broken-link', path: file, line: ref.line, detail: `Links to ${ref.target}, which does not exist.`, fix: 'Fix the link or remove it.' });
    }
  }
  // missing-path: a backticked project path that names nothing in the project,
  // read from the root or, in a context page, from the page's own folder.
  // History pages (a decision log, a shipped ledger) rightly name removed paths.
  const exists = relative => existsSync(path.join(root, relative));
  const missing = [];
  for (const file of authorities) {
    const { text, spans } = parsed.get(file);
    if (historyPage(file, text)) continue;
    const seen = new Set();
    for (const { span, line } of spans) {
      const target = projectPath(span, exists);
      if (!target || seen.has(target)) continue;
      seen.add(target);
      const local = path.posix.normalize(path.posix.join(path.posix.dirname(file), target));
      if (!exists(target) && !exists(local)) missing.push({ file, line, target });
    }
  }
  // A path that Git ignores is local or made at run time: its absence here says nothing.
  const ignored = gitIgnored(root, [...new Set(missing.map(item => item.target))]);
  for (const { file, line, target } of missing) {
    if (!ignored.has(target)) findings.push({ check: 'missing-path', path: file, line, detail: `Names ${target}, which does not exist.`, fix: 'Point it at the current path, or remove the line if the thing is gone.' });
  }
  // unmapped: a context page that only other context pages reference. An entry
  // file must link, name or @-import it, or agents reach it only by chance. Pages nothing
  // references at all are reported once, as orphan.
  const mapped = new Set();
  for (const file of authorities.filter(file => entryFiles.includes(file))) {
    const { links, mentions, imports } = parsed.get(file);
    for (const ref of [...links, ...mentions, ...imports]) mapped.add(ref.target);
  }
  // History is kept for lookup and needs no row. A log has a row in the records part of the map.
  const record = page => frontmatter(parsed.get(page).text)?.type === 'history';
  for (const page of pages) {
    if (referenced.has(page) && !mapped.has(page) && !record(page)) findings.push({ check: 'unmapped', path: page, detail: `Only other ${context}/ pages mention this page; ${entryFiles.join(' and ')} do not, so agents may not know when to read it.`, fix: 'Add a context-map row with a "read when", or merge it into a mapped page.' });
  }
  // entry-size: entry files load into every session; keep them within budget.
  const entries = authorities.filter(file => entryFiles.includes(file));
  for (const file of entries) {
    const { text } = parsed.get(file);
    const words = text.split(/\s+/).filter(Boolean).length;
    if (words > config.cleanup.entryWords) findings.push({ check: 'entry-size', path: file, detail: `${words} words; the budget is ${config.cleanup.entryWords} (cleanup.entryWords).`, fix: 'Move reference detail into context pages and leave a map row that says when to read each.', words });
  }
  // temporal: an entry file is a lasting entry point. A date, or a pointer to a
  // dated file, outside a code span does not last. The record that owns it keeps it.
  const dated = target => target.split('/').some(part => isoDate.exec(part)?.index === 0);
  for (const file of entries) {
    const { text, mentions } = parsed.get(file);
    const lines = blankFences(text).split('\n');
    const pointers = new Map(mentions.filter(ref => dated(ref.target)).map(ref => [ref.line, ref.target]));
    lines.forEach((line, index) => {
      const date = isoDate.exec(line.replace(/`[^`\n]*`/g, ''))?.[0];
      const pointer = line ? pointers.get(index + 1) : undefined;
      if (!date && !pointer) return;
      findings.push({ check: 'temporal', path: file, line: index + 1, detail: date ? `Has the date ${date}; an entry file holds nothing temporal.` : `Points at ${pointer}, a dated file; an entry file holds nothing temporal.`, fix: 'Move it to the record that owns it: a decision to the decision log, an operation or a status to its log, open work to the backlog or a handoff. A hold in force stays as one rule, without its date.' });
    });
  }
  // script-name: a package script that an entry file tells agents to run and no package.json defines.
  const named = entries.flatMap(file => {
    const seen = new Set();
    return parsed.get(file).spans.map(({ span, line }) => ({ file, line, span: span.trim(), script: scriptName(span) })).filter(item => item.script && !seen.has(item.script) && seen.add(item.script));
  });
  if (named.length) {
    const manifests = filesNamed(root, ['package.json']);
    const scripts = new Set(manifests.flatMap(file => { try { return Object.keys(JSON.parse(read(root, file)).scripts ?? {}); } catch { return []; } }));
    if (manifests.length === 0) skipped.push({ check: 'script-name', reason: 'No package.json; script names in other manifests are not checked.' });
    else for (const item of named) {
      if (!scripts.has(item.script)) findings.push({ check: 'script-name', path: item.file, line: item.line, detail: `Names the package script ${item.script} (\`${item.span}\`), which no package.json defines.`, fix: 'Name a script that exists, or remove the command.' });
    }
  }
  // codex-bytes: Codex joins AGENTS.md from the root down to the working folder and stops at its byte limit.
  const sizes = new Map(filesNamed(root, ['AGENTS.md']).map(file => [path.posix.dirname(file), statSync(path.join(root, file)).size]));
  const chain = folder => {
    let bytes = sizes.get('.') ?? 0;
    if (folder === '.') return bytes;
    const parts = folder.split('/');
    for (let depth = 1; depth <= parts.length; depth += 1) bytes += sizes.get(parts.slice(0, depth).join('/')) ?? 0;
    return bytes;
  };
  for (const folder of sizes.keys()) {
    const bytes = chain(folder);
    const parent = folder === '.' ? 0 : chain(path.posix.dirname(folder));
    if (bytes > codexBytes && parent <= codexBytes) findings.push({ check: 'codex-bytes', path: folder === '.' ? 'AGENTS.md' : `${folder}/AGENTS.md`, detail: `The AGENTS.md files from the root to this folder have ${bytes} bytes together; Codex reads at most ${codexBytes}.`, fix: 'Move reference detail into context pages until the files fit.', bytes });
  }
  // managed-block: Joycraft's own lines in AGENTS.md are the block that this version generates.
  // A file with no Joycraft line at all is the wiring check's finding.
  if (parsed.has('AGENTS.md')) {
    const block = managedState(parsed.get('AGENTS.md').text);
    const command = '`node .joycraft/runtime/entry-check.mjs block`';
    if (block.state === 'changed') findings.push({ check: 'managed-block', path: 'AGENTS.md', line: block.line, detail: "Joycraft's block differs from the one this version generates.", fix: `Replace the block with the output of ${command}.` });
    if (block.state === 'block' && block.loose) findings.push({ check: 'managed-block', path: 'AGENTS.md', line: block.loose, detail: "An older Joycraft line is beside the managed block.", fix: 'Remove the older line; the block replaces it.' });
    if (block.state === 'loose') findings.push({ check: 'managed-block', path: 'AGENTS.md', line: block.line, detail: "Joycraft's lines are loose text, not the managed block.", fix: `Replace those lines with the output of ${command}.` });
  }
  // import: `@path` imports and AGENTS.override.md work in one host only.
  for (const file of entries) {
    for (const { raw, line } of parsed.get(file).importLines) {
      if (file === 'CLAUDE.md' && /^(?:\.\/)?AGENTS\.md$/.test(raw)) continue;
      findings.push({ check: 'import', path: file, line, detail: `Imports ${raw} with an @ line, which only Claude Code reads.`, fix: 'Name the page in the context map with a "read when" and remove the import.' });
    }
  }
  // Only at the root: a file of that name in a fixture or an example folder is not the project's own.
  if (exists('AGENTS.override.md')) {
    const file = 'AGENTS.override.md';
    findings.push({ check: 'import', path: file, detail: 'AGENTS.override.md replaces AGENTS.md in Codex only, so hosts get different instructions.', fix: 'Move its text into AGENTS.md and remove the file.' });
  }
  for (const page of pages) {
    if (!referenced.has(page) && !record(page)) findings.push({ check: 'orphan', path: page, detail: `Nothing in ${entryFiles.join(', ')} or ${context}/ links to this page, so agents may never read it.`, fix: 'Add it to the context map with a "read when", or merge it into a linked page.' });
  }

  impactDrift(root, config.cleanup.impact, findings, skipped);

  try {
    for (const tree of listWorktrees({ root, sizes: false }).trees.filter(tree => tree.owner !== 'joycraft')) {
      findings.push({ check: 'unknown-worktree', path: tree.path, detail: `A linked worktree${tree.branch ? ` on ${tree.branch}` : ''} that worktrees.mjs did not create.`, fix: 'Check it for unmerged work, then remove it with git worktree remove.' });
    }
  } catch { skipped.push({ check: 'unknown-worktree', reason: 'Not a Git repository.' }); }

  const counts = Object.fromEntries([...new Set(findings.map(item => item.check))].map(check => [check, findings.filter(item => item.check === check).length]));
  return { config: config.source ?? 'defaults', paths: config.paths, counts, findings, skipped };
}

const usage = 'Usage: cleanup.mjs [--checks] [--root <project>]';

export async function main(argv = process.argv.slice(2)) {
  const args = [...argv];
  const take = flag => { const at = args.indexOf(flag); if (at === -1) return undefined; const value = args[at + 1]; requireValue(value && !value.startsWith('--'), usage); args.splice(at, 2); return value; };
  const has = flag => { const at = args.indexOf(flag); if (at !== -1) args.splice(at, 1); return at !== -1; };
  const root = path.resolve(take('--root') ?? '.');
  if (has('--checks')) {
    requireValue(args.length === 0, usage);
    const { gateChecks } = await import('./entry-check.mjs');
    for (const [id, kind, finds] of checkList) process.stdout.write(`${id}\t${kind}${gateChecks.includes(id) ? ' gate' : ''}\t${finds}\n`);
    return checkList;
  }
  requireValue(args.length === 0, usage);
  const result = cleanupReport({ root });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.findings.length) process.exitCode = 2;
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`Cleanup stopped: ${error.message}\n`); process.exitCode = 1; });
}
