#!/usr/bin/env node
// The standing reviewer benchmark (sl3-07). Not shipped: package `files` is
// `dist` and `payload`. It reruns past review subjects against the reviewer
// text in this tree and prints PASS or FAIL against a bar written before any run.
//
// Reviewer under test: the reviewer agent (its body as the appended system
// prompt), the verify skill, testing-review.md and testing.md, copied to
// <out>/today/. Each subject gets one fresh `claude -p` review, then a text-only
// scorer run against the answer key. A blocking finding on a control is false
// unless one reproduction run reproduces it. Each missed defect is tagged with
// the cheapest level that could catch it (runtime-command, static-check or
// reviewer-prose), so later work can move it out of prose.
//
// The subjects folder is outside the repository and is only read. Its layout:
//   control/subjects.json, control/work/inputs-<n>/{prompt.md,diff.patch}
//   replay/replay-catalogue.json, replay/score-prompt.md
//   r6/subjects/<name>/, r6/prompts/request.md, r6/seeds/seed-list.md, r6/bases.txt (optional)
//   control/part2/subjects/<name>/, control/part2/seed.md
//
// `JOYCRAFT_BENCH_CLAUDE` names another binary (the tests use a stub). Each
// call gets JOYCRAFT_BENCH_ROLE (review, score, repro, level) and
// JOYCRAFT_BENCH_SUBJECT in its environment.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const USAGE = 'usage: node scripts/trial/reviewer-bench.mjs --subjects <dir> [--effort medium] [--model <id>] [--only replay,r6,controls,vacuous] [--jobs 4] [--budget-usd 35] [--out <dir>] [--record] [--help]';
export const HELP = `${USAGE}

Reruns past review subjects against the reviewer text in this tree and prints
PASS (exit 0), FAIL (exit 1) or incomplete (exit 3). Usage errors exit 2.

  --subjects <dir>   the subjects folder (required; it is outside the repository)
  --effort <level>   reviewer effort (default medium)
  --model <id>       reviewer model (default claude-opus-5-5); scoring stays on the default
  --only <groups>    run only these groups; a partial run is incomplete
  --jobs <n>         reviews at a time (default 4)
  --budget-usd <n>   cap: each call reserves its budget when it starts; a call waits while spent plus
                     reserved plus its budget passes this, and the run stops when spent alone does (default 35)
  --out <dir>        where runs, prompts and results.json go (default .joycraft/local/reviewer-bench/<stamp>/)
  --record           write scripts/trial/reviewer-bench.json from this run (refused for an incomplete run)
  --from <file>      print the verdict of a saved results.json (with --record: record it)
  --no-checkout      tests only: skip the replay checkout and install`;

/** The pass bar, written before any run. */
export const BAR = { replayCaught: 12, r6Found: 5, controlsFalseMax: 1, vacuousFound: true };
export const GROUPS = ['replay', 'r6', 'controls', 'vacuous'];
/** The reviewer files under test, in hash order: [name in <out>/today, path in the repo]. */
export const REVIEWER_FILES = [
  ['joycraft-reviewer.md', 'payload/.claude/agents/joycraft-reviewer.md'],
  ['SKILL.md', 'payload/.agents/skills/joycraft-verify/SKILL.md'],
  ['testing-review.md', 'payload/.joycraft/references/testing-review.md'],
  ['testing.md', 'payload/.joycraft/references/testing.md'],
];
/** `--max-budget-usd` per call, by role. */
export const BUDGETS = { review: 3, score: 0.5, repro: 1, level: 0.5 };
export const LEVELS = ['runtime-command', 'static-check', 'reviewer-prose'];
export const RECORD_FILE = path.join(repo, 'scripts/trial/reviewer-bench.json');
const MODEL = 'claude-opus-5-5';
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
const CALL_TIMEOUT_MS = 30 * 60 * 1000;
const R6_CHANGE = "-- . ':!docs' ':!.joycraft' ':!.claude' ':!.agents'";

class UsageError extends Error {}

/** Parsed options. Throws UsageError on a bad or missing value. */
export function parseArgs(argv) {
  const options = { model: MODEL, effort: 'medium', only: [...GROUPS], jobs: 4, budgetUsd: 35, record: false, help: false, noCheckout: false };
  const value = (index, flag) => {
    const next = argv[index + 1];
    if (next === undefined || next.startsWith('--')) throw new UsageError(`${flag} needs a value`);
    return next;
  };
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === '--help' || flag === '-h') options.help = true;
    else if (flag === '--record') options.record = true;
    else if (flag === '--no-checkout') options.noCheckout = true;
    else if (flag === '--subjects') options.subjects = path.resolve(value(index++, flag));
    else if (flag === '--out') options.out = path.resolve(value(index++, flag));
    else if (flag === '--model') options.model = value(index++, flag);
    else if (flag === '--from') options.from = path.resolve(value(index++, flag));
    else if (flag === '--effort') {
      options.effort = value(index++, flag);
      if (!EFFORTS.includes(options.effort)) throw new UsageError(`--effort must be one of ${EFFORTS.join(', ')}`);
    } else if (flag === '--only') {
      options.only = value(index++, flag).split(',').map(group => group.trim()).filter(Boolean);
      const bad = options.only.filter(group => !GROUPS.includes(group));
      if (bad.length || !options.only.length) throw new UsageError(`--only takes ${GROUPS.join(',')}`);
    } else if (flag === '--jobs' || flag === '--budget-usd') {
      const number = Number(value(index++, flag));
      if (!(number > 0) || (flag === '--jobs' && !Number.isInteger(number))) throw new UsageError(`${flag} needs a positive number`);
      options[flag === '--jobs' ? 'jobs' : 'budgetUsd'] = number;
    } else throw new UsageError(`unknown argument: ${flag}`);
  }
  if (!options.help && !options.subjects && !options.from) throw new UsageError('--subjects is required');
  return options;
}

/** One sha256 over the four reviewer files, in REVIEWER_FILES order. */
export function textSha256(root = repo) {
  const hash = createHash('sha256');
  for (const [, file] of REVIEWER_FILES) hash.update(readFileSync(path.join(root, file)));
  return hash.digest('hex');
}

/** Byte copies of the four reviewer files in <out>/today/. */
export function copyToday(todayDir, root = repo) {
  mkdirSync(todayDir, { recursive: true });
  for (const [name, file] of REVIEWER_FILES) copyFileSync(path.join(root, file), path.join(todayDir, name));
}

/** The agent file without its frontmatter. */
export function agentBody(text) {
  return text.replace(/^---\n[\s\S]*?\n---\n/, '').trim() + '\n';
}

/** Every path that ends in `/control/today/<file>`, pointed at <todayDir>/<file>. */
export function rewriteToday(prompt, todayDir) {
  return prompt.replace(/[^\s`'"()<>]*\/control\/today\/([\w.-]+)/g, (_, file) => path.join(todayDir, file));
}

/** The object a reply ends with: the whole text, or from the first `{` that parses to the last `}`. */
export function extractJson(text) {
  if (typeof text !== 'string') return null;
  const body = text.replace(/```(?:json)?/g, '').trim();
  const end = body.lastIndexOf('}');
  for (let start = body.indexOf('{'); start !== -1 && start < end; start = body.indexOf('{', start + 1)) {
    try {
      const parsed = JSON.parse(body.slice(start, end + 1));
      if (parsed && typeof parsed === 'object') return parsed;
    } catch { /* try the next brace */ }
  }
  return null;
}

/** Rows of a Markdown table whose first cell is an ID such as S1 or R1: { id, subject, at, text }. */
export function parseSeedList(text) {
  return text.split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('|'))
    .map(line => line.replace(/^\||\|$/g, '').split('|').map(cell => cell.trim()))
    .filter(cells => cells.length >= 5 && /^[A-Z]\d+$/.test(cells[0]))
    .map(([id, , subject, at, ...rest]) => ({ id, subject, at, text: rest.join(' | ') }));
}

const listDirs = dir => existsSync(dir) ? readdirSync(dir).filter(name => statSync(path.join(dir, name)).isDirectory()).sort() : [];

function need(subjectsDir, relative) {
  const file = path.join(subjectsDir, relative);
  if (!existsSync(file)) throw new UsageError(`the subjects folder has no ${relative}`);
  return file;
}

const todayLines = todayDir => [
  `- verify skill: \`${path.join(todayDir, 'SKILL.md')}\` (use it in place of \`.claude/skills/joycraft-verify/SKILL.md\`)`,
  `- test review reference: \`${path.join(todayDir, 'testing-review.md')}\` (in place of \`.joycraft/references/testing-review.md\`)`,
  `- running tests: \`${path.join(todayDir, 'testing.md')}\` (in place of \`.joycraft/references/testing.md\`)`,
].join('\n');

const OUTPUT_SHAPE = '{"verdict":"PASS|FAIL|UNVERIFIED","criteria":[{"spec":"<spec>","id":"<criterion id>","verdict":"pass|fail|unverified","evidence":{"command":"<command>","exit":<exit status>,"saw":"<what you saw>"}}],"findings":[{"class":"blocking|follow-up|decision-needed","origin":"<origin>","at":"<file>:<line> or criterion id","text":"<the failure and what a user sees>"}]}';

/** The prompt for an R6 or vacuous subject: the request, the subject, the current copies and the output shape. */
export function renderCopyPrompt({ request, workDir, base, todayDir }) {
  const quoted = request.trim().split('\n').map(line => `> ${line}`.trimEnd()).join('\n');
  return `You are dispatched as the independent reviewer for one finished change. The checkout in your working directory is the subject: \`${workDir}\`.

The user's request:

${quoted}

The change: \`git diff ${base} HEAD ${R6_CHANGE}\`. The brief and spec files for this request are under \`docs/\`; their acceptance bullets are the criteria.

## Replay adaptation (read first)

Your instructions are the current Joycraft reviewer's. The checkout may hold other copies of Joycraft's skills and references, so use the current copies instead:

${todayLines(todayDir)}

The Joycraft runtime machinery is not part of this review. Do not run \`dispatch-start.mjs\`, \`evidence.mjs\`, \`check-report\`, \`finalize-review\` or any queue command, do not write a report file, and do not commit or edit tracked files. Put any probe or fixture in a new temporary directory outside this checkout.

## Output

Your final message is one JSON object and nothing else (it stands in for the schema-v1 report):

${OUTPUT_SHAPE}
`;
}

/** Every subject of the chosen groups, with its prompt source and answer key. */
export function loadSubjects(subjectsDir, groups) {
  const subjects = [];
  if (groups.includes('replay') || groups.includes('controls')) {
    const list = JSON.parse(readFileSync(need(subjectsDir, 'control/subjects.json'), 'utf8'));
    const catalogue = groups.includes('replay') ? JSON.parse(readFileSync(need(subjectsDir, 'replay/replay-catalogue.json'), 'utf8')) : [];
    for (const entry of list) {
      const group = entry.kind === 'control' ? 'controls' : 'replay';
      if (!groups.includes(group)) continue;
      const inputs = path.join('control', 'work', `inputs-${entry.n}`);
      need(subjectsDir, path.join(inputs, 'prompt.md'));
      const subject = { id: `${group === 'controls' ? 'control' : 'replay'}-${entry.n}`, group, kind: 'checkout', revision: entry.revision, promptFile: path.join(subjectsDir, inputs, 'prompt.md'), inputsDir: path.join(subjectsDir, inputs) };
      if (group === 'replay') {
        const match = catalogue.find(item => item.feature === entry.feature && item.spec === entry.spec && item.round === entry.round);
        if (!match) throw new UsageError(`replay/replay-catalogue.json has no answer for subject ${entry.n}`);
        subject.reference = match.blocking.map(item => ({ id: item.id, at: item.at, text: item.text }));
      }
      subjects.push(subject);
    }
  }
  if (groups.includes('r6') || groups.includes('controls')) {
    const seeds = parseSeedList(readFileSync(need(subjectsDir, 'r6/seeds/seed-list.md'), 'utf8'));
    const request = readFileSync(need(subjectsDir, 'r6/prompts/request.md'), 'utf8');
    const bases = readBases(path.join(subjectsDir, 'r6/bases.txt'));
    for (const name of listDirs(need(subjectsDir, 'r6/subjects'))) {
      const reference = seeds.filter(seed => seed.subject === name);
      const group = reference.length ? 'r6' : 'controls';
      if (!groups.includes(group)) continue;
      subjects.push({ id: `r6-${name}`, group, kind: 'copy', source: path.join(subjectsDir, 'r6/subjects', name), request, base: bases[name] ?? 'HEAD~1', reference: reference.length ? reference : undefined });
    }
  }
  if (groups.includes('vacuous')) {
    const seed = readFileSync(need(subjectsDir, 'control/part2/seed.md'), 'utf8');
    const request = readFileSync(need(subjectsDir, 'r6/prompts/request.md'), 'utf8');
    const bases = readBases(path.join(subjectsDir, 'r6/bases.txt'));
    const names = listDirs(need(subjectsDir, 'control/part2/subjects'));
    if (!names.length) throw new UsageError('the subjects folder has no subject in control/part2/subjects/');
    for (const name of names) {
      const text = seed.replace(/^#.*\n/, '').trim().replace(/\s+/g, ' ');
      subjects.push({ id: `vacuous-${name}`, group: 'vacuous', kind: 'copy', source: path.join(subjectsDir, 'control/part2/subjects', name), request, base: bases[name] ?? 'HEAD~1', reference: [{ id: 'V1', at: name, text }] });
    }
  }
  return subjects;
}

function readBases(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(readFileSync(file, 'utf8').split('\n').map(line => line.trim().split(/\s+/)).filter(parts => parts.length === 2));
}

/** Run a command; resolve { code, stdout, stderr, seconds }. */
function run(command, args, { cwd, env, timeout } = {}) {
  return new Promise(resolve => {
    const started = Date.now();
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    const timer = timeout ? setTimeout(() => child.kill('SIGTERM'), timeout) : null;
    child.on('error', error => { stderr += String(error); });
    child.on('close', code => {
      if (timer) clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr, seconds: Math.round((Date.now() - started) / 1000) });
    });
  });
}

/** A fresh folder for one subject: a checkout that borrows this repo's objects, or a copy. */
async function prepare(context, subject, label) {
  const dir = path.join(context.out, 'work', `${subject.id}-${label}`);
  rmSync(dir, { recursive: true, force: true });
  const log = [];
  const step = async (command, args, cwd) => {
    const result = await run(command, args, { cwd });
    log.push(`$ ${command} ${args.join(' ')}\n${result.stdout}${result.stderr}exit ${result.code}`);
    return result.code === 0;
  };
  let ok = true;
  if (subject.kind === 'copy') {
    mkdirSync(path.dirname(dir), { recursive: true });
    // Node's own copy: the `cp` on PATH may be GNU or BSD, whose flags differ. A clone where the disk allows it.
    try {
      await cp(subject.source, dir, { recursive: true, verbatimSymlinks: true, mode: constants.COPYFILE_FICLONE });
      log.push(`copy ${subject.source} -> ${dir}\nok`);
    } catch (error) {
      log.push(`copy ${subject.source} -> ${dir}\n${error}`);
      ok = false;
    }
  } else {
    mkdirSync(dir, { recursive: true });
    if (!context.noCheckout) {
      ok = await step('git', ['init', '-q', dir]);
      if (ok) {
        writeFileSync(path.join(dir, '.git', 'objects', 'info', 'alternates'), `${context.objects}\n`);
        ok = await step('git', ['-C', dir, '-c', 'advice.detachedHead=false', 'checkout', '-q', '--detach', subject.revision])
          && await step('git', ['-C', dir, 'config', 'user.email', 'reviewer@example.invalid'])
          && await step('git', ['-C', dir, 'config', 'user.name', 'reviewer'])
          && await step('pnpm', ['install', '--frozen-lockfile', '--prefer-offline'], dir)
          && await step('pnpm', ['build'], dir);
      }
    }
  }
  writeFileSync(path.join(context.out, 'runs', `${subject.id}.${label}.setup.log`), log.join('\n'));
  return { dir, ok };
}

/**
 * Reserve one call's budget before it starts. A call that cannot fit even with nothing in flight stops the run;
 * one that fits only after in-flight calls finish waits for them. Returns false when the run is stopped.
 */
export async function reserve(context, budget) {
  for (;;) {
    if (context.stopped || context.spent + budget > context.budgetUsd) {
      context.stopped = true;
      return false;
    }
    if (context.spent + context.reserved + budget <= context.budgetUsd) {
      context.reserved += budget;
      return true;
    }
    await new Promise(resolve => context.waiters.push(resolve));
  }
}

/** Release a finished call's reservation, count what it cost, and wake the waiting calls. */
export function release(context, budget, cost) {
  context.reserved -= budget;
  context.spent += cost;
  for (const wake of context.waiters.splice(0)) wake();
}

/** One `claude -p` call, or null when the cap guard stops it. */
async function callClaude(context, { role, subject, cwd, prompt, budget, effort, model = MODEL, extra = [] }) {
  if (!await reserve(context, budget)) return null;
  const name = `${subject.id}.${role}`;
  writeFileSync(path.join(context.out, 'prompts', `${name}.md`), prompt);
  const args = ['-p', prompt, '--model', model, '--effort', effort, '--setting-sources', 'project,local', '--output-format', 'json', '--max-budget-usd', String(budget), ...extra];
  const env = { ...process.env, JOYCRAFT_BENCH_ROLE: role, JOYCRAFT_BENCH_SUBJECT: subject.id };
  const result = await run(context.claude, args, { cwd, env, timeout: CALL_TIMEOUT_MS });
  writeFileSync(path.join(context.out, 'runs', `${name}.json`), result.stdout);
  if (result.stderr) writeFileSync(path.join(context.out, 'runs', `${name}.err`), result.stderr);
  let reply = {};
  try { reply = JSON.parse(result.stdout); } catch { /* no JSON envelope */ }
  const cost = Number(reply.total_cost_usd) || 0;
  release(context, budget, cost);
  return { exit: result.code, seconds: result.seconds, cost, text: typeof reply.result === 'string' ? reply.result : '' };
}

const referenceList = reference => reference.map(item => `- id ${item.id}, at ${item.at}: ${item.text}`).join('\n');

function reproPrompt(blocking) {
  return `A code review of this checkout reported the blocking finding(s) below. Spend at most 5 minutes trying to reproduce each one on the real code. Do not edit tracked files; put any fixture in a new temporary directory outside this checkout.

${blocking.map(finding => `- at ${finding.at}: ${finding.text}`).join('\n')}

Reply with one JSON object and nothing else: {"findings":[{"at":"<at>","reproduced":true|false,"command":"<what you ran>","saw":"<what you saw>"}]}`;
}

function levelPrompt(misses) {
  return `A code review missed each defect below. For each one, name the cheapest level that could have caught it:

- \`runtime-command\`: a command the project's runtime or test run already executes on every change.
- \`static-check\`: a static check (a lint rule, a type, a grep or schema check) that needs no judgment.
- \`reviewer-prose\`: only a reviewer who reads and runs the code.

Use only the text below. Do not run anything.

${referenceList(misses)}

Reply with one JSON object and nothing else: {"levels":[{"id":"<defect id>","level":"${LEVELS.join('|')}","why":"<one sentence>"}]}`;
}

/** Review one subject, then score it (or reproduce a control's blocking findings) and tag its misses. */
async function runSubject(context, subject) {
  const record = { id: subject.id, group: subject.group };
  const work = await prepare(context, subject, 'review');
  record.setupOk = work.ok;
  // A subject whose folder could not be made is not reviewed, and the run cannot pass or fail on it.
  if (!work.ok) {
    rmSync(work.dir, { recursive: true, force: true });
    return { ...record, incomplete: true, why: 'setup' };
  }
  const prompt = subject.kind === 'checkout'
    ? rewriteToday(readFileSync(subject.promptFile, 'utf8'), context.todayDir)
    : renderCopyPrompt({ request: subject.request, workDir: work.dir, base: subject.base, todayDir: context.todayDir });
  const addDirs = [context.todayDir, ...(subject.inputsDir ? [subject.inputsDir] : [])].flatMap(dir => ['--add-dir', dir]);
  const review = await callClaude(context, {
    role: 'review', subject, cwd: work.dir, prompt, budget: BUDGETS.review, effort: context.effort, model: context.model,
    extra: ['--append-system-prompt', context.system, '--dangerously-skip-permissions', ...addDirs],
  });
  rmSync(work.dir, { recursive: true, force: true });
  if (!review) return { ...record, incomplete: true, why: 'cap' };
  const output = extractJson(review.text);
  const blocking = (Array.isArray(output?.findings) ? output.findings : []).filter(finding => finding?.class === 'blocking');
  Object.assign(record, { exit: review.exit, seconds: review.seconds, cost: review.cost, parsed: Boolean(output), blocking: blocking.length });
  if (review.exit !== 0 && !output) return { ...record, incomplete: true, why: 'review failed' };

  if (subject.group === 'controls') {
    record.falseBlocking = 0;
    if (!blocking.length) return record;
    const reproWork = await prepare(context, subject, 'repro');
    if (!reproWork.ok) {
      rmSync(reproWork.dir, { recursive: true, force: true });
      return { ...record, incomplete: true, why: 'setup' };
    }
    const repro = await callClaude(context, {
      role: 'repro', subject, cwd: reproWork.dir, prompt: reproPrompt(blocking), budget: BUDGETS.repro, effort: 'medium',
      extra: ['--dangerously-skip-permissions'],
    });
    rmSync(reproWork.dir, { recursive: true, force: true });
    if (!repro) return { ...record, incomplete: true, why: 'cap' };
    record.cost += repro.cost;
    const answers = extractJson(repro.text)?.findings;
    const reproduced = Array.isArray(answers) ? answers.filter(answer => answer?.reproduced === true).length : 0;
    record.reproduced = Math.min(reproduced, blocking.length);
    record.falseBlocking = blocking.length - record.reproduced;
    return record;
  }

  const scorePrompt = context.scoreTemplate.replace('{{REFERENCE}}', referenceList(subject.reference)).replace('{{REPLAY}}', review.text || '(no output)');
  const score = await callClaude(context, { role: 'score', subject, cwd: context.scoresDir, prompt: scorePrompt, budget: BUDGETS.score, effort: 'low', extra: ['--tools', ''] });
  if (!score) return { ...record, incomplete: true, why: 'cap' };
  record.cost += score.cost;
  const scores = extractJson(score.text)?.findings;
  // A scorer that failed or gave no findings has not judged the review: the subject is not scored, not missed.
  if (score.exit !== 0 || !Array.isArray(scores)) return { ...record, incomplete: true, why: 'score failed' };
  const scoreOf = id => scores.find(item => item?.id === id)?.score ?? 'missed';
  // `partly` counts as missed.
  record.defects = subject.reference.map(item => ({ id: item.id, score: scoreOf(item.id), caught: scoreOf(item.id) === 'caught' }));
  record.found = record.defects.filter(item => item.caught).length;
  record.caught = record.found > 0;
  const misses = subject.reference.filter(item => !record.defects.find(defect => defect.id === item.id).caught);
  if (misses.length) {
    const level = await callClaude(context, { role: 'level', subject, cwd: context.scoresDir, prompt: levelPrompt(misses), budget: BUDGETS.level, effort: 'low', extra: ['--tools', ''] });
    if (level) {
      record.cost += level.cost;
      const levels = extractJson(level.text)?.levels;
      for (const defect of record.defects.filter(item => !item.caught)) {
        const tag = Array.isArray(levels) ? levels.find(item => item?.id === defect.id)?.level : undefined;
        defect.level = LEVELS.includes(tag) ? tag : 'untagged';
      }
    } else {
      for (const defect of record.defects.filter(item => !item.caught)) defect.level = 'untagged';
    }
  }
  return record;
}

const median = values => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/** The counts the bar judges, from the subject records. */
export function summarize(records, groupsRun, stopped = false) {
  const of = group => records.filter(record => record.group === group);
  const replay = of('replay');
  const r6 = of('r6');
  const missLevels = {};
  for (const record of records) for (const defect of record.defects ?? []) if (!defect.caught) missLevels[defect.level ?? 'untagged'] = (missLevels[defect.level ?? 'untagged'] ?? 0) + 1;
  return {
    groups: groupsRun,
    replay: { caught: replay.filter(record => record.caught).length, of: replay.length },
    r6: { found: r6.reduce((sum, record) => sum + (record.found ?? 0), 0), of: r6.reduce((sum, record) => sum + (record.defects?.length ?? 0), 0) },
    controlsFalse: of('controls').reduce((sum, record) => sum + (record.falseBlocking ?? 0), 0),
    vacuousFound: of('vacuous').length > 0 && of('vacuous').every(record => record.caught),
    incomplete: stopped || records.some(record => record.incomplete) || GROUPS.some(group => !groupsRun.includes(group)),
    costUsd: Math.round(records.reduce((sum, record) => sum + (record.cost ?? 0), 0) * 100) / 100,
    medianSeconds: median(records.filter(record => record.seconds !== undefined).map(record => record.seconds)),
    missLevels,
  };
}

/** The four rule lines and the verdict: PASS, FAIL or incomplete. */
export function judge(summary) {
  const ran = group => (summary.groups ?? GROUPS).includes(group);
  const rules = [
    { name: 'replay', holds: ran('replay') && summary.replay.caught >= BAR.replayCaught, line: `Replay: at least ${BAR.replayCaught} of 18 caught (caught ${summary.replay.caught} of ${summary.replay.of})` },
    { name: 'r6', holds: ran('r6') && summary.r6.found >= BAR.r6Found, line: `R6: at least ${BAR.r6Found} of 8 found (found ${summary.r6.found} of ${summary.r6.of})` },
    { name: 'controls', holds: ran('controls') && summary.controlsFalse <= BAR.controlsFalseMax, line: `Controls: at most ${BAR.controlsFalseMax} false blocking finding (false ${summary.controlsFalse})` },
    { name: 'vacuous', holds: ran('vacuous') && summary.vacuousFound === BAR.vacuousFound, line: `Vacuous test found as a blocking finding (${summary.vacuousFound ? 'found' : 'not found'})` },
  ];
  const verdict = summary.incomplete ? 'incomplete' : rules.every(rule => rule.holds) ? 'PASS' : 'FAIL';
  return { rules, verdict };
}

export const EXIT = { PASS: 0, FAIL: 1, incomplete: 3 };

/** The printed result: a table per group, misses by level, the four rule lines, cost, then the verdict. */
export function report(records, summary, { rules, verdict }) {
  const lines = [];
  for (const group of GROUPS) {
    const rows = records.filter(record => record.group === group);
    if (!rows.length) continue;
    lines.push(`## ${group}`, '', '| subject | result | blocking | seconds | cost |', '|---|---|---|---|---|');
    for (const record of rows) {
      const result = record.incomplete ? `not run (${record.why ?? 'cap'})`
        : group === 'controls' ? `${record.falseBlocking} false of ${record.blocking}`
        : group === 'r6' ? `found ${record.found} of ${record.defects.length}`
        : record.caught ? 'caught' : 'missed';
      lines.push(`| ${record.id} | ${result} | ${record.blocking ?? '-'} | ${record.seconds ?? '-'} | ${record.cost?.toFixed(2) ?? '-'} |`);
    }
    lines.push('');
  }
  const levels = Object.entries(summary.missLevels);
  if (levels.length) lines.push('Misses by cheapest level: ' + levels.map(([level, count]) => `${level} ${count}`).join(', '), '');
  for (const [index, rule] of rules.entries()) lines.push(`${index + 1}. ${rule.line}: holds: ${rule.holds ? 'yes' : 'no'}`);
  lines.push('', `cost $${summary.costUsd.toFixed(2)}, median ${summary.medianSeconds} s per review`, '', verdict);
  return lines.join('\n');
}

/** Run `jobs` tasks at a time. */
async function pool(items, jobs, task) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(jobs, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  }));
  return results;
}

function writeRecord(result) {
  const { summary } = result;
  if (result.verdict === 'incomplete' || summary.incomplete) return 'not recorded: the run is incomplete, so scripts/trial/reviewer-bench.json keeps its last complete run';
  const record = {
    textSha256: result.textSha256, effort: result.effort, date: result.date,
    replay: summary.replay, r6: summary.r6, controlsFalse: summary.controlsFalse, vacuousFound: summary.vacuousFound,
    verdict: result.verdict,
  };
  writeFileSync(RECORD_FILE, JSON.stringify(record, null, 2) + '\n');
  return `recorded scripts/trial/reviewer-bench.json (${result.verdict})`;
}

async function bench(options) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const out = options.out ?? path.join(repo, '.joycraft', 'local', 'reviewer-bench', stamp);
  const subjects = loadSubjects(options.subjects, options.only);
  for (const dir of ['runs', 'prompts', 'work', 'scores']) mkdirSync(path.join(out, dir), { recursive: true });
  const todayDir = path.join(out, 'today');
  copyToday(todayDir);
  const common = await run('git', ['rev-parse', '--git-common-dir'], { cwd: repo });
  const context = {
    out, todayDir, scoresDir: path.join(out, 'scores'), effort: options.effort, model: options.model, budgetUsd: options.budgetUsd, noCheckout: options.noCheckout,
    claude: process.env.JOYCRAFT_BENCH_CLAUDE || 'claude',
    system: agentBody(readFileSync(path.join(repo, REVIEWER_FILES[0][1]), 'utf8')),
    scoreTemplate: options.only.some(group => group !== 'controls') ? readFileSync(need(options.subjects, 'replay/score-prompt.md'), 'utf8') : '',
    objects: path.resolve(repo, common.stdout.trim(), 'objects'),
    spent: 0, reserved: 0, waiters: [], stopped: false,
  };
  const records = await pool(subjects, options.jobs, subject => runSubject(context, subject));
  rmSync(path.join(out, 'work'), { recursive: true, force: true });
  const summary = summarize(records, options.only, context.stopped);
  const { rules, verdict } = judge(summary);
  const result = { date: new Date().toISOString().slice(0, 10), effort: options.effort, textSha256: textSha256(), summary, rules, verdict, records };
  writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(report(records, summary, { rules, verdict }));
  console.log(`results: ${path.relative(process.cwd(), path.join(out, 'results.json')) || path.join(out, 'results.json')}`);
  if (options.record) console.log(writeRecord(result));
  return EXIT[verdict];
}

function fromResults(options) {
  const saved = JSON.parse(readFileSync(options.from, 'utf8'));
  const { rules, verdict } = judge(saved.summary);
  console.log(report(saved.records ?? [], { costUsd: 0, medianSeconds: 0, missLevels: {}, ...saved.summary }, { rules, verdict }));
  if (options.record) {
    if (saved.textSha256 !== textSha256()) throw new UsageError('the saved run reviewed other reviewer text than this tree; run the benchmark again');
    console.log(writeRecord({ ...saved, verdict }));
  }
  return EXIT[verdict];
}

export async function main(argv) {
  let options;
  try {
    options = parseArgs(argv);
    if (options.help) { console.log(HELP); return 0; }
    return options.from ? fromResults(options) : await bench(options);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    console.error(`${error.message}\n${USAGE}`);
    return 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }, error => { console.error(error); process.exitCode = 1; });
}
