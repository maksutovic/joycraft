#!/usr/bin/env node
// One check for a project's entry files (AGENTS.md, CLAUDE.md). It reports and
// never edits. It is silent when the files are clean, and it does not read the
// update policy. It works the same in every checkout: a linked worktree is a
// place where a person works, not a sign of a worker.
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { cleanupReport, tidyReport } from './cleanup.mjs';
import { managedBlock, missingBlockPages } from './wiring.mjs';

// Entry files by name: the root pair, an AGENTS.md in a folder below, and the Codex override file.
const entryFiles = ['AGENTS.md', 'CLAUDE.md', 'AGENTS.override.md'];
// A gate finding fails the command and CI. Every other check is advisory.
export const gateChecks = ['missing-path', 'broken-link', 'script-name', 'codex-bytes', 'import'];
// Findings about a context page that the entry check also reports: what an entry file lacks.
const pageChecks = ['unmapped', 'orphan'];

/** The cleanup findings that are about an entry file, each with its level. */
export function entryReport({ root = process.cwd(), now = Date.now() } = {}) {
  const report = cleanupReport({ root, now });
  // block-page: a page that Joycraft's block in AGENTS.md names and the project lacks.
  // The block should name none; this catches a release that names one again.
  let agents = null;
  try { agents = readFileSync(path.join(root, 'AGENTS.md'), 'utf8'); } catch { /* no AGENTS.md */ }
  const blockPages = agents === null ? [] : missingBlockPages(root, agents).map(({ page, line }) => ({
    check: 'block-page', path: 'AGENTS.md', line, detail: `Joycraft's block names ${page}, which this project does not have.`,
    fix: 'Map that kind of page to the page the project already has, or make it with a map row; then report the block line to Joycraft.',
  }));
  const findings = [...report.findings, ...blockPages]
    .filter(item => entryFiles.includes(path.posix.basename(item.path)) || pageChecks.includes(item.check))
    .map(item => ({ level: gateChecks.includes(item.check) ? 'gate' : 'advisory', ...item }))
    // In file order, so a reader can go down the file once.
    .sort((a, b) => a.path.localeCompare(b.path) || (a.line ?? Infinity) - (b.line ?? Infinity));
  return { gate: findings.filter(item => item.level === 'gate').length, advisory: findings.filter(item => item.level === 'advisory').length, findings };
}

/**
 * Start advice: at most 3 lines when the tidy range left fixable findings in
 * map-reached pages, the last naming the tidy command. It never edits a file and
 * never throws: a skipped or failed tidy gives null.
 */
export function tidyAdvice({ root = process.cwd(), now = Date.now() } = {}) {
  let report, fixable;
  try { report = tidyReport({ root, now, quick: true, limit: 0 }); fixable = report.all.filter(item => item.fixable); } catch { return null; }
  if (fixable.length === 0) return null;
  // On the default branch the range is the recent commits (approximate), not a branch.
  const remover = report.approximate ? 'which recent commits removed' : 'which this branch removed';
  const lines = fixable.slice(0, 2).map(item => `${item.path}:${item.line} names ${item.symbol ?? item.check}, ${remover} from the code.`);
  const count = fixable.length === 1 ? '1 mapped doc line names' : `${fixable.length} mapped doc lines name`;
  lines.push(`${count} removed code: run \`node .joycraft/runtime/cleanup.mjs tidy\` now or at session end.`);
  return { check: 'tidy', path: fixable[0].path, lines, detail: lines.join(' '), fix: 'Run `node .joycraft/runtime/cleanup.mjs tidy` and fix the lines it names. Do not fix them at session start.' };
}

const git = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024 });

/**
 * The lines of each Markdown file that changed since `base` which no Markdown
 * file that changed or was added since then holds now, as `{ path, line, text }`. A cleanup moves
 * text between files; this lists what it dropped, so each drop is a choice.
 * It compares trimmed lines and reads no meaning.
 */
export function lostLines({ root = process.cwd(), base = 'HEAD' } = {}) {
  // Changed, removed or renamed since the base, in any folder: a mapped page can live outside the context folder.
  const changed = git(root, ['diff', '--name-only', '--no-renames', '-z', base, '--', '*.md']).split('\0').filter(Boolean);
  const before = changed
    .filter(file => { try { git(root, ['cat-file', '-e', `${base}:${file}`]); return true; } catch { return false; } });
  if (before.length === 0) return [];
  const now = new Set();
  // Each file as one line of single-spaced text, so a paragraph that was only re-wrapped is not lost.
  let flowed = '';
  // Only a file that the pass changed or made can hold moved text: an older copy elsewhere (an archive snapshot) is not where a line went.
  const touched = new Set([...changed, ...git(root, ['ls-files', '-z', '--others', '--exclude-standard', '--', '*.md']).split('\0').filter(Boolean)]);
  for (const file of touched) {
    let text;
    try { text = readFileSync(path.join(root, file), 'utf8'); } catch { continue; }
    for (const line of text.split('\n')) if (line.trim()) now.add(line.trim());
    flowed += `${text.replace(/\s+/g, ' ')}\n`;
  }
  const lost = [];
  for (const file of before) {
    git(root, ['show', `${base}:${file}`]).split('\n').forEach((line, index) => {
      const text = line.trim();
      // A line with no letter or digit (a rule, a table border) carries no statement.
      if (text && /[\p{L}\p{N}]/u.test(text) && !now.has(text) && !flowed.includes(text.replace(/\s+/g, ' '))) lost.push({ path: file, line: index + 1, text });
    });
  }
  return lost;
}

const usage = 'Usage: entry-check.mjs [block | lost [--base <rev>]] [--ci] [--root <project>]';

export async function main(argv = process.argv.slice(2)) {
  const flags = { ci: false, root: '.', command: null, base: 'HEAD' };
  for (let index = 0; index < argv.length; index += 1) {
    if (index === 0 && ['block', 'lost'].includes(argv[index])) flags.command = argv[index];
    else if (argv[index] === '--ci') flags.ci = true;
    else if (argv[index] === '--root' && argv[index + 1]) { flags.root = argv[index + 1]; index += 1; }
    else if (flags.command === 'lost' && argv[index] === '--base' && argv[index + 1]) { flags.base = argv[index + 1]; index += 1; }
    else throw new Error(usage);
  }
  const root = path.resolve(flags.root);
  if (flags.command && flags.ci) throw new Error(usage);
  // block: Joycraft's own lines for AGENTS.md. The agent places them; the text is the same for every project.
  if (flags.command === 'block') { process.stdout.write(`${managedBlock}\n`); return managedBlock; }
  // lost: after a cleanup moved text, the lines that landed nowhere. A report, never a failure.
  if (flags.command === 'lost') { const lost = lostLines({ root, base: flags.base }); process.stdout.write(`${JSON.stringify(lost, null, 2)}\n`); return lost; }
  const report = entryReport({ root });
  if (flags.ci) {
    for (const item of report.findings.filter(item => item.level === 'gate')) process.stdout.write(`${item.path}${item.line ? `:${item.line}` : ''} ${item.check} ${item.detail}\n`);
  } else if (report.findings.length) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.gate) process.exitCode = 2;
  return report;
}

// Node runs the main module from its real path; the project path may be a symlink.
const invoked = (() => { try { return realpathSync(process.argv[1]); } catch { return null; } })();
if (invoked && import.meta.url === pathToFileURL(invoked).href) {
  main().catch(error => { process.stderr.write(`Entry check stopped: ${error.message}\n`); process.exitCode = 1; });
}
