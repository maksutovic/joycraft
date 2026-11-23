#!/usr/bin/env node
// Offline check of the small-job look (sl1-02). Not shipped: package `files` is
// `dist` and `payload`. It runs the exact Look question from the managed block,
// through the joycraft-look agent text, on each labelled screen, once per model
// tier. A tier passes when, on each screen labelled `block` or `ok`, more than
// half of its runs give that verdict. One run is noisy, so use --runs 3 for a
// pick. The report also counts each run that missed. Ship the cheapest tier that
// passes; when none passes, ship `model: inherit`.
//
// Usage:
//   node scripts/trial/look-eval.mjs --judge <dir> --words <file>
//     [--models haiku,sonnet,opus] [--runs 1] [--jobs 4] [--out <file.json>]
// <dir> holds P1..P9, each with screen.png. <file> holds the user's request.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const agentFile = path.join(repo, 'payload/.claude/agents/joycraft-look.md');

// The labels from the quality critic: P4 and P8 show "NO" beside "Go ride!".
export const LABELS = { P4: 'block', P8: 'block', P3: 'ok', P5: 'ok', P7: 'ok', P1: 'info', P2: 'info', P6: 'info', P9: 'info' };
// Cheapest first.
export const TIERS = ['haiku', 'sonnet', 'opus'];

/** The Look question, word for word from the managed block. */
export async function lookQuestion() {
  const { managedBlock } = await import(pathToFileURL(path.join(repo, 'payload/.joycraft/runtime/wiring.mjs')).href);
  const question = /Ask: "([^"]+)"/.exec(managedBlock)?.[1];
  if (!question) throw new Error('The managed block has no Look question.');
  return question;
}

/** The agent file as frontmatter fields and a body. */
export function readAgent(text = readFileSync(agentFile, 'utf8')) {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!match) throw new Error('joycraft-look.md has no frontmatter.');
  const fields = Object.fromEntries(match[1].split('\n').map(line => {
    const at = line.indexOf(':');
    return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
  }));
  return { fields, body: match[2].trim() };
}

/** The user's words: the text after "now the actual app:" when the file has it. */
export function userWords(text) {
  const at = text.indexOf('now the actual app:');
  return (at < 0 ? text : text.slice(at + 'now the actual app:'.length)).trim();
}

/** The task a builder gives the look: the user's words, the renders, the question. */
export function lookTask(words, renders, question) {
  return [
    'The user asked:', '', words, '',
    ...renders.map(render => `Render: ${render}`), '',
    question,
  ].join('\n');
}

/**
 * The verdict in a reply: `ok` when its first line starts with OK, `block` when it
 * quotes two or more statements, else `unclear`.
 */
export function verdict(reply) {
  const lines = String(reply).trim().split('\n').map(line => line.trim()).filter(Boolean);
  if (/^ok\b/i.test((lines[0] ?? '').replace(/[*_`]/g, ''))) return 'ok';
  const quoted = String(reply).match(/"[^"\n]{2,}"|“[^”\n]{2,}”/g) ?? [];
  const blockquotes = lines.filter(line => line.startsWith('>'));
  return Math.max(quoted.length, blockquotes.length) >= 2 ? 'block' : 'unclear';
}

/** True when, on each labelled screen, more than half of the runs give the label. */
export function tierPasses(results) {
  const screens = [...new Set(results.map(result => result.screen))].filter(screen => LABELS[screen] !== 'info');
  return screens.every(screen => {
    const runs = results.filter(result => result.screen === screen);
    return runs.filter(result => result.verdict === LABELS[screen]).length * 2 > runs.length;
  });
}

/** The labelled runs whose verdict is not the label. */
export const misses = results => results.filter(result => LABELS[result.screen] !== 'info' && result.verdict !== LABELS[result.screen]);

function args(argv) {
  const out = { models: TIERS, runs: 1, jobs: 4 };
  for (let i = 0; i < argv.length; i += 1) {
    const name = argv[i].replace(/^--/, '');
    const value = argv[i + 1];
    i += 1;
    if (name === 'models') out.models = value.split(',').map(model => model.trim()).filter(Boolean);
    else if (name === 'runs' || name === 'jobs') out[name] = Number(value);
    else if (['judge', 'words', 'out'].includes(name)) out[name] = value;
    else throw new Error(`Unknown option: ${argv[i - 1]}`);
  }
  if (!out.judge || !out.words) throw new Error('Usage: look-eval.mjs --judge <dir> --words <file> [--models haiku,sonnet,opus] [--runs 1] [--jobs 4] [--out <file.json>]');
  return out;
}

function runLook({ model, screen, image, task, agent, cwd }) {
  const definition = { 'joycraft-look': { description: agent.fields.description, prompt: agent.body, tools: ['Read'], model } };
  const env = { ...process.env };
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;
  const argv = ['-p', task, '--agents', JSON.stringify(definition), '--agent', 'joycraft-look', '--model', model,
    '--tools', 'Read', '--allowedTools', 'Read', '--add-dir', path.dirname(image), '--output-format', 'json',
    '--no-session-persistence', '--strict-mcp-config', '--disable-slash-commands', '--setting-sources', ''];
  return new Promise(resolve => {
    const started = Date.now();
    const child = spawn('claude', argv, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    const timer = setTimeout(() => child.kill('SIGKILL'), 240000);
    child.on('close', code => {
      clearTimeout(timer);
      let json = null;
      try { json = JSON.parse(stdout); } catch { /* reported below */ }
      const reply = json?.result ?? '';
      resolve({
        model, screen, label: LABELS[screen], verdict: json ? verdict(reply) : 'error', reply,
        cost: json?.total_cost_usd ?? null, seconds: Math.round((Date.now() - started) / 100) / 10,
        turns: json?.num_turns ?? null, exit: code, error: json ? undefined : (stderr || stdout).slice(0, 400),
      });
    });
  });
}

async function pool(tasks, jobs) {
  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.max(1, jobs) }, async () => {
    while (next < tasks.length) {
      const task = tasks[next];
      next += 1;
      results.push(await task());
    }
  }));
  return results;
}

async function main() {
  const options = args(process.argv.slice(2));
  const agent = readAgent();
  const question = await lookQuestion();
  const words = userWords(readFileSync(options.words, 'utf8'));
  const screens = Object.keys(LABELS).sort();
  const cwd = mkdtempSync(path.join(tmpdir(), 'jc-look-eval-'));
  try {
    const tasks = [];
    for (const model of options.models) {
      for (const screen of screens) {
        const image = path.resolve(options.judge, screen, 'screen.png');
        if (!existsSync(image)) throw new Error(`Missing screen: ${image}`);
        for (let run = 1; run <= options.runs; run += 1) {
          tasks.push(async () => ({ run, ...(await runLook({ model, screen, image, task: lookTask(words, [image], question), agent, cwd })) }));
        }
      }
    }
    const results = await pool(tasks, options.jobs);
    const tiers = options.models.map(model => {
      const mine = results.filter(result => result.model === model).sort((a, b) => a.screen.localeCompare(b.screen) || a.run - b.run);
      const cost = mine.reduce((sum, result) => sum + (result.cost ?? 0), 0);
      return { model, passes: tierPasses(mine), misses: misses(mine).length, labelled: mine.filter(result => LABELS[result.screen] !== 'info').length, cost: Math.round(cost * 10000) / 10000, results: mine };
    });
    const pick = TIERS.find(tier => tiers.some(result => result.model === tier && result.passes)) ?? 'inherit';
    const report = { question, words, runs: options.runs, pick, tiers };
    if (options.out) writeFileSync(options.out, `${JSON.stringify(report, null, 2)}\n`);
    for (const tier of tiers) {
      console.log(`${tier.model}: ${tier.passes ? 'PASS' : 'FAIL'}, ${tier.misses} of ${tier.labelled} labelled runs missed ($${tier.cost.toFixed(4)})`);
      for (const result of tier.results) console.log(`  ${result.screen} run ${result.run} label=${result.label} verdict=${result.verdict} ${result.seconds}s`);
    }
    console.log(`Pick: model: ${pick}`);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exit(1); });
}
