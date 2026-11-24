#!/usr/bin/env node
// Offline check of the small-job look (sl1-02, sl2-02). Not shipped: package
// `files` is `dist` and `payload`. It runs the exact Look question from the
// managed block, through the joycraft-look agent text, on each labelled screen.
//
// sl2-02 runs one model in four cells: the full render or its parts ("crop"),
// with agent wording (a) or (b). A crop cuts a screen into parts about one
// screen tall, with `sips` (macOS) and no new dependency. Each part is its own
// look. A screen blocks when any part blocks.
//
// A cell passes when, on each screen labelled `block` or `ok`, more than half of
// its runs give that verdict. One run is noisy, so use --runs 5 for a pick.
// `--second` also runs, on the 12 judged screens, the Look question plus a
// second question, and scores the replies against the judge notes. That run is a
// record only.
//
// Usage:
//   node scripts/trial/look-eval.mjs --trial <dir> --words <file>[,<file>]
//     [--models haiku] [--cells full-a,full-b,crop-a,crop-b] [--runs 1]
//     [--jobs 4] [--second] [--out <file.json>] [--note <text>]
// <dir> is the ride trial folder (see SCREENS). Each <file> holds the user's words.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const agentFile = path.join(repo, 'payload/.claude/agents/joycraft-look.md');

// Labels from the judges. P4 and P8 show "NO" beside "Go ride!". P1, P9, Q1 and
// Q3 show a mild one: a day's "NOPE" above a "good weather" chip. Q2-flooded is
// the full-page render the jc-i1-r3 look passed with such a pair.
export const LABELS = {
  P1: 'block', P4: 'block', P8: 'block', P9: 'block', Q1: 'block', Q3: 'block', 'Q2-flooded': 'block',
  P3: 'ok', P5: 'ok', P7: 'ok', Q2: 'ok',
  P2: 'info', P6: 'info',
};
// Each screen, relative to the trial folder.
export const SCREENS = Object.fromEntries([
  ...['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'Q1', 'Q2', 'Q3'].map(screen => [screen, `v2/judge/${screen}/screen.png`]),
  ['Q2-flooded', 'loop/arms/jc-i1-r3/.tmp/shots/forecast-flooded.png'],
]);
// When each screen was rendered, local time, from the file dates. All are the
// evening of Sunday, Nov 22. A real look runs on the day of its render, but the
// eval may run later. The look reads "today" from the system date, so the task
// states the render date (see renderLine).
export const CAPTURED = {
  P1: '2026-11-22T22:03', P2: '2026-11-22T21:50', P3: '2026-11-22T21:50', P4: '2026-11-22T21:50',
  P5: '2026-11-22T21:50', P6: '2026-11-22T21:50', P7: '2026-11-22T21:50', P8: '2026-11-22T21:50',
  P9: '2026-11-22T21:50', Q1: '2026-11-22T23:45', Q2: '2026-11-22T23:45', Q3: '2026-11-22T23:45',
  'Q2-flooded': '2026-11-22T23:43',
};

/** The task line that gives the render date, such as "The render was made on Sunday, Nov 22, 2026, at 9:50 PM." */
export function renderLine(stamp) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(stamp ?? '');
  if (!match) throw new Error(`Bad render date: ${stamp}`);
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  const name = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1];
  const clock = `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
  return `The render was made on ${weekday}, ${name} ${day}, ${year}, at ${clock}.`;
}

// The 12 screens the product judges scored.
export const JUDGED = Object.keys(SCREENS).filter(screen => /^[PQ]\d$/.test(screen));
// Cheapest first.
export const TIERS = ['haiku', 'sonnet', 'opus'];
export const CELLS = ['full-a', 'full-b', 'crop-a', 'crop-b'];

// The one sentence that differs between wording (a) and wording (b).
export const WORDING = {
  a: 'Advice on when or how, a caveat or a detail is not an answer.',
  b: 'A rating or label for the same day, item or state is an answer. Advice on when or how, or a caveat, is not.',
};

/**
 * The agent body with wording (a) or (b). It replaces the sentence the file
 * holds now and keeps the file's line breaks everywhere else.
 */
export function withWording(body, key) {
  const pattern = sentence => new RegExp(sentence.split(/\s+/).map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+'));
  const now = Object.keys(WORDING).find(name => pattern(WORDING[name]).test(body));
  if (!now) throw new Error('The agent body holds neither wording (a) nor (b).');
  return now === key ? body : body.replace(pattern(WORDING[now]), WORDING[key]);
}

// The record-only second question (sl2-02 step 4).
export const SECOND = 'Then list any fact shown with two values, and one thing the user asked for that is missing. At most 3 lines.';

// What the judges noted on each judged screen for the second question. `match`
// is a rough test of a reply; read the replies before you trust a count. The
// judges noted no fact with two values and nothing missing on P1, P5, P9 and Q1.
export const NOTES = {
  P3: [{ kind: 'two values', note: 'Snorkel session 8:59-10:04 AM up top, 8:55-10:05 AM in the Monday card.', match: /8:5[59]|10:0[45]/ }],
  P6: [
    { kind: 'two values', note: 'Tide table 6.6 ft for Monday 9:35 AM, forecast peak 6.8 ft.', match: /6\.6.*6\.8|6\.8.*6\.6/ },
    { kind: 'missing', note: '"Next 3 days" starts with Rest of today: two future days.', match: /two (future )?days|rest of today|only 2|3[- ]day|three[- ]day/i },
  ],
  P8: [
    { kind: 'two values', note: 'Hero says the path is dry, the Today card says soggy.', match: /sogg/i },
    { kind: 'missing', note: 'Forecast is Today, Tomorrow, Tuesday: two future days.', match: /two (future )?days|only 2|3[- ]day|three[- ]day/i },
  ],
  Q3: [
    { kind: 'two values', note: 'Tide card says next flood Mon 9:35 AM, the Monday card says from 8:28 AM.', match: /9:35.*8:28|8:28.*9:35/ },
    { kind: 'missing', note: 'Cards say when the flood starts, never when it ends.', match: /\bend|until|how long|duration|window/i },
  ],
  P2: [{ kind: 'missing', note: 'No art in the forecast, only emoji.', match: /illustrat|drawing|picture|\bart\b|image/i }],
  P4: [
    { kind: 'missing', note: 'No forecast art, no flood window times, the fallback location is not stated.', match: /illustrat|drawing|picture|\bart\b|window|fallback|ferry|location/i },
  ],
  P7: [{ kind: 'missing', note: 'No art in the forecast.', match: /illustrat|drawing|picture|\bart\b|image/i }],
  Q2: [{ kind: 'missing', note: 'El Nino is not on the screen.', match: /ni[nñ]o/i }],
};

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

/**
 * The user's words: the text after "now the actual app:" when the file has it,
 * and before the operator note.
 */
export function userWords(text) {
  const at = text.indexOf('now the actual app:');
  const words = at < 0 ? text : text.slice(at + 'now the actual app:'.length);
  return words.split(/\n---\n/)[0].trim();
}

/**
 * The task a builder gives the look: the user's words, the renders, the render
 * date when given, and the question.
 */
export function lookTask(words, renders, question, made) {
  return [
    'The user asked:', '', words, '',
    ...renders.map(render => `Render: ${render}`),
    ...(made ? [renderLine(made)] : []), '',
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

/**
 * The parts of a screen, each about one screen tall (0.8 of the width), each
 * starting half a part below the one before. So any band up to half a part
 * tall, such as one day card, is whole in at least one part.
 */
export function partOffsets(width, height) {
  const tall = Math.min(height, Math.round(width * 0.8));
  if (tall >= height) return [{ y: 0, height }];
  const stride = Math.round(tall / 2);
  const parts = [];
  for (let y = 0; y + tall < height; y += stride) parts.push({ y, height: tall });
  parts.push({ y: height - tall, height: tall });
  return parts;
}

/**
 * The row where sips starts a part. `sips --cropOffset 0 0` acts as no offset
 * and gives the centre crop, so the top part starts at row 1. sips also skips a
 * crop that reaches the bottom edge, so the last part starts one row higher.
 */
export function sipsOffset(y, partHeight, height) {
  return Math.max(1, Math.min(y, height - partHeight - 1));
}

/** The screen verdict from its parts: block when any part blocks, ok when all are ok. */
export function screenVerdict(parts) {
  if (parts.includes('block')) return 'block';
  if (parts.includes('error')) return 'error';
  return parts.length > 0 && parts.every(part => part === 'ok') ? 'ok' : 'unclear';
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

/** Per labelled screen, how many runs give the label. */
export function hits(results) {
  const out = {};
  for (const result of results) {
    if (LABELS[result.screen] === 'info') continue;
    out[result.screen] = (out[result.screen] ?? 0) + (result.verdict === LABELS[result.screen] ? 1 : 0);
  }
  return out;
}

/** The labelled screens where `crop` gives the label in more runs than `full`, and where in fewer. */
export function compare(crop, full) {
  const a = hits(crop);
  const b = hits(full);
  const screens = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  return { better: screens.filter(screen => (a[screen] ?? 0) > (b[screen] ?? 0)), worse: screens.filter(screen => (a[screen] ?? 0) < (b[screen] ?? 0)) };
}

/**
 * The sl2-02 ship rules, from the results of the four cells.
 * - Wording (b) ships only when (b) passes and (a) does not, in a render mode,
 *   and (a) passes over (b) in no render mode.
 * - Crop ships only when, with the shipped wording, it beats full on at least
 *   one labelled screen and loses on none.
 */
export function decide(cells) {
  const pass = name => tierPasses(cells[name] ?? []);
  const modes = ['full', 'crop'].filter(mode => cells[`${mode}-a`] && cells[`${mode}-b`]);
  const bBetter = modes.some(mode => pass(`${mode}-b`) && !pass(`${mode}-a`));
  const aBetter = modes.some(mode => pass(`${mode}-a`) && !pass(`${mode}-b`));
  const wording = bBetter && !aBetter ? 'b' : 'a';
  const crop = cells[`crop-${wording}`] && cells[`full-${wording}`] ? compare(cells[`crop-${wording}`], cells[`full-${wording}`]) : { better: [], worse: [] };
  const render = crop.better.length > 0 && crop.worse.length === 0 ? 'crop' : 'full';
  const shipped = `${render}-${wording}`;
  const okKept = ['P3', 'P5', 'P7', 'Q2'].every(screen => {
    const runs = (cells[shipped] ?? []).filter(result => result.screen === screen);
    return runs.length > 0 && runs.filter(result => result.verdict === 'ok').length * 2 > runs.length;
  });
  return { wording, render, shipped, passes: Object.fromEntries(Object.keys(cells).map(name => [name, pass(name)])), crop, okKept };
}

/** Which judge notes a set of second-question replies finds: a note counts when most runs match it. */
export function scoreSecond(results) {
  const notes = [];
  for (const [screen, list] of Object.entries(NOTES)) {
    const replies = results.filter(result => result.screen === screen).map(result => result.reply);
    for (const item of list) {
      const matched = replies.filter(reply => item.match.test(reply)).length;
      notes.push({ screen, kind: item.kind, note: item.note, matched, runs: replies.length, found: replies.length > 0 && matched * 2 > replies.length });
    }
  }
  return { found: notes.filter(note => note.found).length, total: notes.length, notes };
}

function args(argv) {
  const out = { models: ['haiku'], cells: CELLS, runs: 1, jobs: 4, second: false };
  for (let i = 0; i < argv.length; i += 1) {
    const name = argv[i].replace(/^--/, '');
    if (name === 'second') { out.second = true; continue; }
    const value = argv[i + 1];
    i += 1;
    if (name === 'models' || name === 'cells') out[name] = value.split(',').map(item => item.trim()).filter(Boolean);
    else if (name === 'runs' || name === 'jobs') out[name] = Number(value);
    else if (name === 'words') out.words = value.split(',').map(item => item.trim()).filter(Boolean);
    else if (['trial', 'out', 'note'].includes(name)) out[name] = value;
    else throw new Error(`Unknown option: ${argv[i - 1]}`);
  }
  if (!out.trial || !out.words) throw new Error('Usage: look-eval.mjs --trial <dir> --words <file>[,<file>] [--models haiku] [--cells full-a,full-b,crop-a,crop-b] [--runs 1] [--jobs 4] [--second] [--out <file.json>]');
  for (const cell of out.cells) if (!CELLS.includes(cell)) throw new Error(`Unknown cell: ${cell}`);
  return out;
}

/** Cut a screen into parts with sips. Returns the part files, top first. */
function cropScreen(image, dir) {
  const size = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', image], { encoding: 'utf8' });
  const width = Number(/pixelWidth: (\d+)/.exec(size)?.[1]);
  const height = Number(/pixelHeight: (\d+)/.exec(size)?.[1]);
  mkdirSync(dir, { recursive: true });
  const parts = partOffsets(width, height);
  // A plain `sips -c` gives the centre crop. A part away from the centre that
  // equals it means sips ignored the offset.
  const centre = path.join(dir, 'centre.png');
  if (parts.length > 1) execFileSync('sips', ['-c', String(parts[0].height), String(width), image, '-o', centre], { stdio: 'ignore' });
  return parts.map((part, index) => {
    const out = path.join(dir, `part-${index + 1}.png`);
    const y = sipsOffset(part.y, part.height, height);
    if (part.height === height) execFileSync('cp', [image, out]);
    else execFileSync('sips', ['-c', String(part.height), String(width), '--cropOffset', String(y), '0', image, '-o', out], { stdio: 'ignore' });
    const check = execFileSync('sips', ['-g', 'pixelHeight', out], { encoding: 'utf8' });
    if (Number(/pixelHeight: (\d+)/.exec(check)?.[1]) !== part.height) throw new Error(`sips did not crop ${image} at ${y}.`);
    const middle = Math.abs(y - (height - part.height) / 2) <= 1;
    if (parts.length > 1 && !middle && readFileSync(out).equals(readFileSync(centre))) throw new Error(`sips gave the centre crop of ${image} for the part at ${y}.`);
    return out;
  });
}

function runLook({ model, image, task, prompt, description, cwd }) {
  const definition = { 'joycraft-look': { description, prompt, tools: ['Read'], model } };
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
        verdict: json ? verdict(reply) : 'error', reply,
        cost: json?.total_cost_usd ?? null, seconds: Math.round((Date.now() - started) / 100) / 10,
        exit: code, error: json ? undefined : (stderr || stdout).slice(0, 400),
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

const round4 = value => Math.round(value * 10000) / 10000;

async function main() {
  const options = args(process.argv.slice(2));
  const agent = readAgent();
  const question = await lookQuestion();
  const words = options.words.map(file => userWords(readFileSync(file, 'utf8'))).join('\n\n');
  const screens = Object.keys(LABELS).sort();
  const cwd = mkdtempSync(path.join(tmpdir(), 'jc-look-eval-'));
  try {
    const images = Object.fromEntries(screens.map(screen => {
      const image = path.resolve(options.trial, SCREENS[screen]);
      if (!existsSync(image)) throw new Error(`Missing screen: ${image}`);
      return [screen, image];
    }));
    const parts = options.cells.some(cell => cell.startsWith('crop'))
      ? Object.fromEntries(screens.map(screen => [screen, cropScreen(images[screen], path.join(cwd, 'parts', screen))]))
      : {};
    const tasks = [];
    for (const model of options.models) {
      for (const cell of options.cells) {
        const [render, wording] = cell.split('-');
        const prompt = withWording(agent.body, wording);
        for (const screen of screens) {
          for (let run = 1; run <= options.runs; run += 1) {
            tasks.push(async () => {
              const renders = render === 'crop' ? parts[screen] : [images[screen]];
              const looks = await Promise.all(renders.map(image => runLook({ model, image, task: lookTask(words, [image], question, CAPTURED[screen]), prompt, description: agent.fields.description, cwd })));
              const cost = looks.reduce((sum, look) => sum + (look.cost ?? 0), 0);
              return {
                model, cell, screen, run, label: LABELS[screen], verdict: screenVerdict(looks.map(look => look.verdict)),
                cost: round4(cost), seconds: Math.max(...looks.map(look => look.seconds)),
                parts: looks.map((look, index) => ({ part: index + 1, verdict: look.verdict, reply: look.reply, error: look.error })),
              };
            });
          }
        }
      }
    }
    const second = [];
    if (options.second) {
      const prompt = agent.body;
      for (const screen of JUDGED) {
        for (let run = 1; run <= options.runs; run += 1) {
          second.push(async () => {
            const image = path.resolve(options.trial, SCREENS[screen]);
            const look = await runLook({ model: options.models[0], image, task: lookTask(words, [image], `${question} ${SECOND}`, CAPTURED[screen]), prompt, description: agent.fields.description, cwd });
            return { screen, run, verdict: look.verdict, reply: look.reply, cost: look.cost, error: look.error };
          });
        }
      }
    }
    const results = await pool([...tasks, ...second], options.jobs);
    const looks = results.filter(result => result.cell);
    const cells = {};
    for (const model of options.models) {
      for (const cell of options.cells) {
        cells[`${model}:${cell}`] = looks.filter(result => result.model === model && result.cell === cell).sort((a, b) => a.screen.localeCompare(b.screen) || a.run - b.run);
      }
    }
    const summary = Object.entries(cells).map(([name, mine]) => ({
      cell: name, passes: tierPasses(mine), misses: misses(mine).length, labelled: mine.filter(result => LABELS[result.screen] !== 'info').length,
      hits: hits(mine), cost: round4(mine.reduce((sum, result) => sum + (result.cost ?? 0), 0)),
    }));
    const decisions = Object.fromEntries(options.models.map(model => [model, decide(Object.fromEntries(options.cells.map(cell => [cell, cells[`${model}:${cell}`]])))]));
    const secondResults = results.filter(result => !result.cell && result.reply !== undefined).sort((a, b) => a.screen.localeCompare(b.screen) || a.run - b.run);
    const report = {
      note: options.note, question, second: options.second ? SECOND : undefined, words, runs: options.runs, labels: LABELS, screens: SCREENS, captured: CAPTURED, wordings: WORDING,
      summary, decisions, cells,
      secondRun: options.second ? { ...scoreSecond(secondResults), results: secondResults } : undefined,
    };
    if (options.out) writeFileSync(options.out, `${JSON.stringify(report, null, 2)}\n`);
    for (const cell of summary) {
      console.log(`${cell.cell}: ${cell.passes ? 'PASS' : 'FAIL'}, ${cell.misses} of ${cell.labelled} labelled runs missed ($${cell.cost.toFixed(4)})`);
      console.log(`  label hits: ${Object.entries(cell.hits).map(([screen, count]) => `${screen}=${count}`).join(' ')}`);
    }
    for (const [model, decision] of Object.entries(decisions)) console.log(`${model}: ship wording (${decision.wording}), render ${decision.render}; ok screens kept: ${decision.okKept}`);
    if (report.secondRun) console.log(`Second question: ${report.secondRun.found} of ${report.secondRun.total} judge notes found.`);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exit(1); });
}
