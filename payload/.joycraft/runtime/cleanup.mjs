import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseYaml, readConfig } from './config.mjs';
import { requireValue } from './identity.mjs';
import { projectStatus } from './status.mjs';
import { listWorktrees } from './worktrees.mjs';

// A report-only sweep for stale project knowledge. Every check is deterministic:
// files, links, frontmatter and Git history. It never edits a file; the
// joycraft-cleanup skill proposes fixes and applies only the approved ones.
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
  const links = [], mentions = [], imports = [];
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
  }
  for (const match of text.matchAll(/^[ \t]*@(\S+)[ \t]*$/gm)) {
    const target = match[1];
    if (/^[~/]/.test(target) || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    imports.push({ target: path.posix.normalize(path.posix.join(dir, target)), line: lineOf(match.index) });
  }
  // Single-backtick spans on one line; fenced blocks are already blank.
  const spans = [];
  for (const match of text.matchAll(/(?<!`)`([^`\n]+)`(?!`)/g)) spans.push({ span: match[1], line: lineOf(match.index) });
  return { links, mentions, imports, spans };
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
        findings.push({ check: 'impact-drift', path: doc, detail: `${commits.length} commit(s) changed ${entry.source} after this page last changed: ${files.slice(0, 8).join(', ')}${files.length > 8 ? ', …' : ''}.`, fix: 'Read the changed code and update the page, or commit the page unchanged if it is still true.', commits });
      }
    }
  }
}

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
    const { links, mentions, imports } = parsed.get(file);
    for (const ref of [...links, ...mentions, ...imports]) {
      if (ref.target !== file) referenced.add(ref.target);
      if (inside(ref.target, features) || inside(ref.target, archive)) {
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
  for (const file of authorities) {
    const { text, spans } = parsed.get(file);
    if (historyPage(file, text)) continue;
    const seen = new Set();
    for (const { span, line } of spans) {
      const target = projectPath(span, exists);
      if (!target || seen.has(target)) continue;
      seen.add(target);
      const local = path.posix.normalize(path.posix.join(path.posix.dirname(file), target));
      if (exists(target) || exists(local)) continue;
      findings.push({ check: 'missing-path', path: file, line, detail: `Names ${target}, which does not exist.`, fix: 'Point it at the current path, or remove the line if the thing is gone.' });
    }
  }
  // unmapped: a context page that only other context pages reference. An entry
  // file must link, name or @-import it, or agents reach it only by chance. Pages nothing
  // references at all are reported once, as orphan.
  const mapped = new Set();
  for (const file of authorities.filter(file => entryFiles.includes(file))) {
    const { links, mentions, imports } = parsed.get(file);
    for (const ref of [...links, ...mentions, ...imports]) mapped.add(ref.target);
  }
  for (const page of pages) {
    if (referenced.has(page) && !mapped.has(page)) findings.push({ check: 'unmapped', path: page, detail: `Only other ${context}/ pages mention this page; ${entryFiles.join(' and ')} do not, so agents may not know when to read it.`, fix: 'Add a context-map row with a "read when", or merge it into a mapped page.' });
  }
  // entry-size: entry files load into every session; keep them within budget.
  for (const file of authorities.filter(file => entryFiles.includes(file))) {
    const words = parsed.get(file).text.split(/\s+/).filter(Boolean).length;
    if (words > config.cleanup.entryWords) findings.push({ check: 'entry-size', path: file, detail: `${words} words; the budget is ${config.cleanup.entryWords} (cleanup.entryWords).`, fix: 'Move reference detail into context pages and leave a map row that says when to read each.', words });
  }
  for (const page of pages) {
    if (!referenced.has(page)) findings.push({ check: 'orphan', path: page, detail: `Nothing in ${entryFiles.join(', ')} or ${context}/ links to this page, so agents may never read it.`, fix: 'Add it to the context map with a "read when", or merge it into a linked page.' });
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

export async function main(argv = process.argv.slice(2)) {
  const index = argv.indexOf('--root');
  requireValue(argv.length === 0 || (argv.length === 2 && index === 0), 'Usage: cleanup.mjs [--root <project>]');
  const result = cleanupReport({ root: path.resolve(index === 0 ? argv[1] : '.') });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.findings.length) process.exitCode = 2;
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`Cleanup stopped: ${error.message}\n`); process.exitCode = 1; });
}
