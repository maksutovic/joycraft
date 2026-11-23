import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { workPaths } from './config.mjs';
import { gitState } from './kickoff.mjs';
import { managedClose, managedOpen } from './wiring.mjs';

// The small-job close as one command. It reads the brief's "Done when" lines,
// refuses once (exit 2) and names every problem, or it moves the brief folder to
// the archive, commits what is staged with the move, and prints one line.
// It never amends and never pushes.
const usage = 'Usage: close.mjs <slug> -m "<message>" [--accept] [--root <project>]';
const queueName = 'specs/.joycraft-spec-queue.json';
const logFile = '.joycraft/local/small-jobs.jsonl';

class Refusal extends Error {}

export function parseArgs(argv) {
  const options = { accept: false, root: '.', slug: null, message: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--accept') options.accept = true;
    else if (arg === '--root' || arg === '-m') {
      const value = argv[index += 1];
      if (value === undefined) throw new Error(usage);
      if (arg === '--root') options.root = value; else options.message = value;
    } else if (!arg.startsWith('-') && options.slug === null) options.slug = arg;
    else throw new Error(usage);
  }
  if (!options.slug || !options.message?.trim()) throw new Error(usage);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(options.slug)) throw new Error(`The slug must be one folder name: ${options.slug}`);
  return options;
}

const itemStart = /^\s*(?:[-*+]|\d+[.)])\s+/;
const doneWhenText = /^(?:\*\*)?done when\b/i;

/** The "Done when" lines: the items under a "Done when" heading, and any line that starts with "Done when". */
export function doneWhenLines(brief) {
  const lines = [];
  let inSection = false;
  let current = null;
  for (const raw of brief.split('\n')) {
    const heading = /^\s*#{1,6}\s+(.*)$/.exec(raw);
    if (heading) {
      inSection = /^done when\b/i.test(heading[1].trim());
      current = null;
      continue;
    }
    if (!raw.trim()) { if (!inSection) current = null; continue; }
    const body = raw.replace(itemStart, '').trim();
    const isItem = itemStart.test(raw);
    if ((inSection && isItem) || doneWhenText.test(body)) {
      current = { text: body };
      lines.push(current);
    } else if (current && (inSection || /^\s/.test(raw))) current.text += ` ${raw.trim()}`;
    else current = null;
  }
  return lines.map(({ text }, index) => {
    const number = index + 1;
    const mark = /\bnot checked:/i.test(text) ? 'not checked' : /\b(?:test|seen):/i.test(text) ? 'checked' : 'unmarked';
    const tests = [...text.matchAll(/\btest:\s*`?([^\s`;,]+)/gi)].map(match => match[1].replace(/[.)]+$/, ''));
    return { number, text, mark, tests };
  });
}

/** The look result from the brief's `Look:` line, or null. */
export function lookResult(brief) {
  for (const raw of brief.split('\n')) {
    const match = /^\s*(?:[-*+]\s+|#{1,6}\s+)?(?:\*\*)?Look\b(?:\s*\([^)\n]*\))?(?:\*\*)?\s*:\s*(?:\*\*)?\s*(.*)$/i.exec(raw);
    if (match) {
      const result = match[1].replace(/\*\*/g, '').trim().replace(/\.$/, '');
      if (result) return result;
    }
  }
  return null;
}

/** Lines of AGENTS.md outside the managed block that still say "not established". */
export function notEstablished(root) {
  let text;
  try { text = readFileSync(path.join(root, 'AGENTS.md'), 'utf8'); } catch { return []; }
  const found = [];
  let managed = false;
  text.split('\n').forEach((line, index) => {
    if (line.includes(managedOpen)) managed = true;
    if (!managed && /not established/i.test(line)) found.push(index + 1);
    if (line.includes(managedClose)) managed = false;
  });
  return found;
}

const run = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const tryRun = (root, args) => { try { return run(root, args); } catch { return null; } };

/** Git refuses to guess an identity here, so a commit by the runtime never carries a made-up author. */
const hasIdentity = root => ['GIT_AUTHOR_IDENT', 'GIT_COMMITTER_IDENT'].every(name => tryRun(root, ['-c', 'user.useConfigOnly=true', 'var', name]) !== null);

function briefCreated(root, briefPath, git) {
  const added = git ? tryRun(root, ['log', '--diff-filter=A', '--format=%aI', '--', briefPath]) : null;
  if (added) return new Date(added.split('\n').at(-1)).toISOString();
  const stat = statSync(path.join(root, briefPath));
  return (stat.birthtimeMs > 0 ? stat.birthtime : stat.mtime).toISOString();
}

function otherOpenBriefs(root, featuresHome, slug) {
  const home = path.join(root, featuresHome);
  if (!existsSync(home)) return [];
  return readdirSync(home, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name !== slug && existsSync(path.join(home, entry.name, 'brief.md')) && !existsSync(path.join(home, entry.name, queueName)))
    .map(entry => `${featuresHome}/${entry.name}/brief.md`).sort();
}

function logRow(root, row) {
  const local = path.join(root, '.joycraft/local');
  if (!existsSync(local)) {
    mkdirSync(local, { recursive: true });
    writeFileSync(path.join(local, '.gitignore'), '*\n');
  }
  appendFileSync(path.join(root, logFile), `${JSON.stringify(row)}\n`);
}

function refusedRuns(root, slug) {
  try {
    return readFileSync(path.join(root, logFile), 'utf8').split('\n').filter(Boolean)
      .map(line => { try { return JSON.parse(line); } catch { return null; } })
      .filter(row => row?.event === 'refused' && row.slug === slug).length;
  } catch { return 0; }
}

/** Every reason to stop, found before any change. `hard` problems stop even with --accept. */
function problems(root, { slug, accept }, paths, git) {
  const briefPath = `${paths.features}/${slug}/brief.md`;
  const target = `${paths.archive}/${slug}`;
  const hard = [];
  const soft = [];
  let lines = [];
  let look = null;
  if (!existsSync(path.join(root, briefPath))) hard.push(`There is no brief at ${briefPath}.`);
  else {
    const brief = readFileSync(path.join(root, briefPath), 'utf8');
    lines = doneWhenLines(brief);
    look = lookResult(brief);
    if (!lines.length) soft.push('The brief has no "Done when" line.');
    for (const line of lines) {
      if (line.mark === 'unmarked') soft.push(`Line ${line.number} has no mark. Add \`test: <file>\`, \`seen: <render>\` or \`not checked: <why>\`.`);
      for (const file of line.tests) if (!existsSync(path.join(root, file))) soft.push(`Line ${line.number} names the test file ${file}, which does not exist.`);
    }
    if (!look) soft.push('The brief has no `Look:` line with the look result.');
  }
  if (existsSync(path.join(root, target))) hard.push(`${target}/ already exists.`);
  if (git && !hasIdentity(root)) hard.push('Git has no user name and email. Set them with `git config user.name` and `git config user.email`.');
  for (const number of notEstablished(root)) soft.push(`AGENTS.md line ${number} says "not established" outside the managed block. Update it.`);
  return { hard, soft: accept ? [] : soft, accepted: accept ? soft : [], lines, look, briefPath, target };
}

export function close(argv) {
  const options = parseArgs(argv);
  const root = path.resolve(options.root);
  const paths = workPaths(root);
  const { git, commit: born } = gitState(root);
  const found = problems(root, options, paths, git);
  const stops = [...found.hard, ...found.soft];
  if (stops.length) {
    if (existsSync(path.join(root, found.briefPath))) logRow(root, { event: 'refused', slug: options.slug, at: new Date().toISOString(), problems: stops });
    const hint = found.hard.length ? '' : '\nFix these, or run again with --accept to close anyway.';
    throw new Refusal(`Close stopped: nothing was moved or committed.\n${stops.map(problem => `- ${problem}`).join('\n')}${hint}`);
  }

  const created = briefCreated(root, found.briefPath, git);
  const source = `${paths.features}/${options.slug}`;
  mkdirSync(path.dirname(path.join(root, found.target)), { recursive: true });
  renameSync(path.join(root, source), path.join(root, found.target));
  if (existsSync(path.join(root, source)) || !existsSync(path.join(root, found.target, 'brief.md'))) {
    throw new Error(`the move of ${source} to ${found.target} did not complete. Check both folders.`);
  }

  let hash = null;
  let unstaged = 0;
  if (git) {
    run(root, ['rm', '-r', '-q', '--cached', '--ignore-unmatch', '--', source]);
    run(root, ['add', '-A', '--', found.target]);
    try { run(root, ['commit', '-q', '-m', options.message]); } catch (error) {
      throw new Error(`git commit failed. The brief is in ${found.target}/ and staged. Fix the cause, then run git commit.\n${String(error.stderr ?? error.message).trim()}`);
    }
    hash = run(root, ['rev-parse', '--short', 'HEAD']);
    if (tryRun(root, ['cat-file', '-e', `HEAD:./${found.target}/brief.md`]) === null) throw new Error(`commit ${hash} does not hold ${found.target}/brief.md.`);
    unstaged = run(root, ['status', '--porcelain', '--untracked-files=all']).split('\n').filter(Boolean).length;
  }

  const lines = found.lines;
  const notChecked = lines.filter(line => line.mark !== 'checked').map(line => line.number);
  const checked = lines.length - notChecked.length;
  const look = found.look ?? 'none';
  const counts = `${checked} of ${lines.length} lines checked${notChecked.length ? ` (not checked: ${notChecked.join(', ')})` : ''}.`;
  const committed = git ? `Commit ${hash}.` : 'No Git: not committed.';
  const out = [`Path: small job. ${counts} Look: ${look}. No code review ran. ${committed} Brief: ${found.target}/brief.md.`];
  if (unstaged) out.push(`Note: ${unstaged} ${unstaged === 1 ? 'file is' : 'files are'} not staged and not in this commit.`);
  const open = otherOpenBriefs(root, paths.features, options.slug);
  if (open.length) out.push(`Note: other open briefs: ${open.join(', ')}.`);
  if (found.accepted.length) out.push(`Note: --accept closed past ${found.accepted.length} ${found.accepted.length === 1 ? 'problem' : 'problems'}.`);

  logRow(root, { event: 'closed', slug: options.slug, briefCreated: created, closedAt: new Date().toISOString(), lines: lines.length, checked, notChecked: notChecked.length, notCheckedLines: notChecked,
    look, refused: refusedRuns(root, options.slug), accepted: options.accept, commit: hash, firstCommit: git && !born });
  return out.join('\n');
}

export function main(argv = process.argv.slice(2)) {
  try {
    process.stdout.write(`${close(argv)}\n`);
  } catch (error) {
    if (error instanceof Refusal) { process.stderr.write(`${error.message}\n`); process.exitCode = 2; return; }
    process.stderr.write(`Close stopped: ${error.message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
