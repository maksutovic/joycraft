import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyInstall, planInstall } from '../src/install-v1.js';
import { filesForHosts, type Host } from '../src/payload.js';

// sl1-01: the small-job path lives inline in the managed block. These tests pin
// its rules, the routing in the entry and implement skills, the kickoff step,
// both template lines, and that a queue-less brief adds no runtime report.
const repo = join(__dirname, '..');
const payload = join(repo, 'payload');
const text = (file: string) => readFileSync(join(payload, file), 'utf8');
const runtime = (root: string, script: string, ...args: string[]) =>
  spawnSync(process.execPath, [join(root, '.joycraft/runtime', script), ...args], { cwd: root, encoding: 'utf8' });
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };

const block = spawnSync(process.execPath, [join(payload, '.joycraft/runtime/entry-check.mjs'), 'block'], { encoding: 'utf8' }).stdout;
const workLines = block.split('\n').filter(line => line.startsWith('- Work:') || line.startsWith('  - '));

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

describe('small-job rules in the managed block', () => {
  it('[AC:sl2-03] the Work line names both paths and its four parts', () => {
    expect(workLines[0]).toBe('- Work: before you change code, say `Path: small job` or `Path: feature`.');
    expect(workLines.slice(1).map(line => line.slice(4, line.indexOf(':')))).toEqual(['Small job', 'Look, before you close', 'Close', 'Feature']);
  });

  it('[AC:sl2-03] [AC:sl3-01-work-cap] the Work line is at most 480 words', () => {
    expect(workLines.join(' ').split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(480);
  });

  it.each([
    // Small job: the line, the first commit, the brief, the guesses.
    'it fits one session, needs no owner answer you cannot assume, and has no auth, payment, deploy or data-migration change.',
    'When Git has no commit yet, first commit what is there as `chore: set up Joycraft`.',
    'Write `docs/features/<slug>/brief.md` (the features folder in `joycraft.yaml` when set)',
    "the user's request word for word, then a \"Done when\" list with one group for each goal.",
    'Each line is a state or input with its expected result and its check (`test: <file>` or `seen: <render>`).',
    'Write one line for each thing the user asked for, in their words, and one for a missing input.',
    'The first line gives the one answer that the screen or output shows, and that each repeated item in it shows, when its inputs disagree.',
    'Every other statement there is a reason for that answer. Each answer says which hours, days or items it covers, and the answers leave no gap.',
    'Test an outside source through the function that calls it, with the network call stubbed, for a good reply and a failed one.',
    'Write each guess as an `Assumed:` line. Do not ask.',
    'Build no page for this brief.',
    'Build, and check each line.',
    // Look: fresh eyes on the first line's inputs, one question, two quotes block.
    "give a fresh agent (Claude Code: agent type `joycraft-look`) only the user's words and renders of the default state and of a state where the inputs of the first line disagree.",
    'Save the renders in `.joycraft/local/looks/<slug>/`.',
    'A switch that fakes data says so on the screen.',
    'Give it no brief and no code.',
    'Ask: "Quote any two statements on this screen that disagree about the main answer, or reply OK. At most 8 lines."',
    'Two such quotes block the close: fix, then look again one time. With no separate agent',
    'With no separate agent, read the renders yourself and say the look was not independent.',
    // Close: marks, docs, traps, rules, close.mjs, final message.
    'Close: mark each line `test: <file>`, `seen: <render>` or `not checked: <why>`, and add a `Look:` line with the result.',
    'Update what the change makes stale, in this file and in the mapped page, with how to run and look at the result.',
    'Add a trap (it cost you a retry) to `docs/context/traps.md`, with a map row.',
    'Put a standing instruction from the user under `## Rules` in their words.',
    'Stage your work, then run `node .joycraft/runtime/close.mjs <slug> -m "<message>"`, which runs the `test:` files, archives the brief and commits.',
    'Final message, at most 120 words: how to run the result, each guess that changes the answer, then the line that the command printed.',
    // Feature: the full loop, and when a small job escalates.
    'Feature: all other work, or when the user asks for the full loop: use the `joycraft-entry` skill.',
    'A small job becomes a feature when it needs an owner answer, meets one of those changes, or fails the same check twice: keep the brief and add specs.',
  ])('[AC:sl2-03] [AC:sl3-01-work-line] pins: %s', phrase => {
    expect(workLines.join('\n')).toContain(phrase);
  });

  it.each([
    'Close in one commit',
    'one mixed state',
    'Move the brief folder to `docs/archive/<slug>/`.',
    'N of N lines checked',
    // sl3-01
    'public-API',
    'A time limit from the user means this path.',
    'with how it must feel',
    'Its other remarks are notes.',
    '(purpose, commands, map rows)',
  ])('[AC:sl2-03] [AC:sl3-01-work-line] drops the old phrase: %s', phrase => {
    expect(workLines.join('\n')).not.toContain(phrase);
  });

  it('[AC:sl1-01] [AC:sl3-01-work-cap] the Work line holds no semicolon (STE fix-to-zero class)', () => {
    expect(workLines.join('\n')).not.toContain(';');
  });
});

describe('small-job routing in the skills, setup and templates', () => {
  it('[AC:sl1-01] [AC:sl3-01-entry-text] the entry skill is for setup and features, and a small job skips it', () => {
    const entry = text('.agents/skills/joycraft-entry/SKILL.md');
    expect(entry).toMatch(/^description: Set up Joycraft or start a feature\./m);
    const body = entry.split(/^---$/m)[2].trim();
    expect(body.split('\n\n')[0].replace(/\s+/g, ' ')).toBe('A small job by the `Work` line in `AGENTS.md` does not use this skill and reads nothing here.');
    // [AC:sl3-01-entry-text] the close runs the tests, and the skill stays within 1,287 words.
    expect(entry.replace(/\s+/g, ' ')).toContain('A small job has no code review: its look and the tests that its close runs are its checks.');
    expect(entry.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(1287);
    expect(entry).not.toContain('small authorized tooling repair');
    expect(entry).not.toContain('existing direct path');
  });

  it('[AC:sl3-03-no-plan] [AC:sl3-03-no-page] [AC:sl3-03-words] a feature asks no setup or meta question', () => {
    const entry = text('.agents/skills/joycraft-entry/SKILL.md');
    const flat = entry.replace(/\s+/g, ' ');
    // [AC:sl3-03-no-plan] the review-tools plan stays in setup.md.
    expect(entry).not.toContain('review-tools.mjs plan');
    expect(entry).not.toMatch(/review-loop plan/i);
    // [AC:sl3-03-no-page]
    expect(flat).toContain('A brief with no open decision gets no page.');
    expect(flat).toContain('and ask as it prints.');
    expect(flat).not.toContain('numbered prose in chat');
    expect(flat).not.toContain('lacks this rule');
    // [AC:sl3-03-words]
    expect(entry.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(1240);
  });

  it('[AC:sl1-01] the implement skill scopes out a small job', () => {
    expect(text('.agents/skills/joycraft-implement/SKILL.md')).toContain('A small job (the `Work` line in `AGENTS.md`) has no queue and does not use this skill.');
  });

  it('[AC:sl1-01] kickoff step 7 starts the first outcome by the Work line', () => {
    const setup = text('.joycraft/references/setup.md');
    const step = /^7\. [\s\S]*?(?=\n\n)/m.exec(setup)?.[0].replace(/\s+/g, ' ');
    expect(step).toContain('start the first outcome by the `Work` line in `AGENTS.md`');
    expect(step).not.toContain('a brief, specs and review');
  });

  it('[AC:sl2-03] the brief template gives the same first-line rule as the Work line', () => {
    const brief = text('.joycraft/templates/brief.md').replace(/\s+/g, ' ');
    expect(brief).toContain('Make the first **Done when** line the one answer that the screen or output shows, and that each repeated item in it shows, when its inputs disagree.');
    expect(brief).not.toContain('mixed state');
  });

  it('[AC:sl2-03] setup commits at kickoff step 5 and caps its last message', () => {
    const setup = text('.joycraft/references/setup.md');
    const kickoff = setup.slice(setup.indexOf('## Kickoff for a new project'));
    const kickStep = (n: number) => new RegExp(`^${n}\\. [\\s\\S]*?(?=\\n\\d\\. |\\n\\n)`, 'm').exec(kickoff)?.[0].replace(/\s+/g, ' ') ?? '';
    expect(kickStep(5)).toMatch(/When Git is on, commit what is there as `chore: set up Joycraft`\.$/);
    expect(kickStep(6)).toContain('kickoff.mjs summary --root .');
    expect(kickStep(6)).not.toContain('first commit');
    expect(setup).toContain('End setup in at most 120 words: what changed, what you assumed, what to say next.');
  });

  it('[AC:sl1-01] the project context template has How it works with a Run and look line', () => {
    const page = text('.joycraft/templates/project-context.md');
    const section = /^## How it works\n([\s\S]*?)(?=\n## )/m.exec(page)?.[1] ?? '';
    expect(section.replace(/\s+/g, ' ')).toContain('In 5 to 12 lines: the main code paths, the purpose of each, and the data sources.');
    expect(section).toMatch(/^Run and look: /m);
  });
});

describe('a queue-less brief in the runtime', () => {
  /** A fresh Claude install, wired with the printed block, a map and CLAUDE.md. */
  function installed() {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-small-job-')));
    dirs.push(root);
    git(root, 'init', '-q', '-b', 'main');
    applyInstall(planInstall(root, ['claude']));
    const printed = runtime(root, 'entry-check.mjs', 'block').stdout.trimEnd();
    put(join(root, 'AGENTS.md'), `# Demo\n\n${printed}\n\n## Context map\n\n| Read when | Document |\n|---|---|\n| Finding what the project is | \`docs/context/project.md\` |\n`);
    put(join(root, 'CLAUDE.md'), '@AGENTS.md\n');
    put(join(root, 'docs/context/project.md'), '# Demo\n\nA small page.\n');
    git(root, 'add', '.');
    git(root, 'commit', '-q', '-m', 'init');
    return root;
  }
  const reports = (root: string) => [
    runtime(root, 'wiring.mjs', '--root', root),
    runtime(root, 'status.mjs', '--root', root),
    runtime(root, 'cleanup.mjs', '--root', root),
    runtime(root, 'gate.mjs', 'check', '--root', root),
  ].map(result => ({ status: result.status, stdout: result.stdout }));

  it('[AC:sl1-01] wiring exits 0 on a fresh install that carries the new block', () => {
    const root = installed();
    const wiring = runtime(root, 'wiring.mjs', '--root', root);
    expect(wiring.status, wiring.stdout).toBe(0);
    expect(JSON.parse(wiring.stdout).findings).toEqual([]);
    expect(runtime(root, 'entry-check.mjs', '--root', root, '--ci').status).toBe(0);
  });

  it('[AC:sl2-03] the block may name the traps page before it exists, and a line outside the block may not', () => {
    const root = installed();
    const missing = () => JSON.parse(runtime(root, 'cleanup.mjs', '--root', root).stdout || '{"findings":[]}').findings
      .filter((item: { check: string }) => item.check === 'missing-path').map((item: { detail: string }) => item.detail);
    expect(missing()).toEqual([]);
    put(join(root, 'AGENTS.md'), readFileSync(join(root, 'AGENTS.md'), 'utf8') + '\nSee `docs/context/traps.md`.\n');
    expect(missing()).toEqual(['Names docs/context/traps.md, which does not exist.']);
  });

  it('[AC:sl1-01] an open brief and a hand-closed one (no queue) add nothing to wiring, status, cleanup or gate check', () => {
    const root = installed();
    const before = reports(root);
    put(join(root, 'docs/features/x/brief.md'), '# Add a button\n\nAdd a button.\n\n## Goals\n\n- Done when: the page shows one button.\n- Assumed: the button is blue.\n');
    put(join(root, 'docs/archive/y/brief.md'), '# Add a title\n\nAdd a title.\n\n## Goals\n\n- Done when: the page shows a title. test: `tests/title.test.ts`\n- Look: OK\n');
    git(root, 'add', '.');
    git(root, 'commit', '-q', '-m', 'small jobs');
    // sl1-05: status lists the open brief in its report-only openBriefs; nothing else changes.
    const after = reports(root);
    const { openBriefs: opened, ...statusAfter } = JSON.parse(after[1].stdout);
    const { openBriefs: none, ...statusBefore } = JSON.parse(before[1].stdout);
    expect(opened).toEqual([{ folder: 'docs/features/x', brief: 'docs/features/x/brief.md' }]);
    expect(none).toEqual([]);
    expect(statusAfter).toEqual(statusBefore);
    expect([after[0], after[2], after[3]]).toEqual([before[0], before[2], before[3]]);
    expect(after.map(report => report.status)).toEqual(before.map(report => report.status));
    expect(before.map(report => report.status)).toEqual([0, 0, 0, 0]);
  });
});

// sl1-02: the look is a cheap fresh-eyes agent. Claude Code installs it; other
// hosts use any fresh agent with the same inline question.
describe('the joycraft-look agent', () => {
  const look = text('.claude/agents/joycraft-look.md');
  const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(look)?.[1] ?? '';

  it('[AC:sl1-02] has tools: Read and a model, and stays under 120 words', () => {
    expect(frontmatter).toMatch(/^name: joycraft-look$/m);
    expect(frontmatter).toMatch(/^tools: Read$/m);
    expect(frontmatter).toMatch(/^model: \S+$/m);
    expect(look.split(/\s+/).filter(Boolean).length).toBeLessThan(120);
  });

  it('[AC:sl1-02] answers only the question, never reads code or specs, at most 8 lines', () => {
    const body = look.slice(look.indexOf('\n---\n', 4) + 5).replace(/\s+/g, ' ');
    expect(body).toContain('Open each file the task names. Answer only its question.');
    expect(body).toContain('When nothing disagrees, reply OK and nothing else.');
    expect(body).toContain('Never read code, specs or a brief.');
    expect(body).toContain('Reply in at most 8 lines.');
  });

  it('[AC:sl1-02] the managed block names joycraft-look', () => {
    expect(workLines.join('\n')).toContain('agent type `joycraft-look`');
  });

  it('[AC:sl1-02] a Claude install has the agent file; a non-Claude install does not', () => {
    const paths = (hosts: Host[]) => filesForHosts(hosts).map(file => file.path);
    expect(paths(['claude'])).toContain('.claude/agents/joycraft-look.md');
    for (const host of ['codex', 'pi', 'omp', 'copilot', 'opencode'] as Host[]) {
      expect(paths([host]).some(path => path.startsWith('.claude/agents/')), host).toBe(false);
    }
  });
});

describe('the offline look check (scripts/trial/look-eval.mjs)', () => {
  it('[AC:sl1-02] asks the Look question word for word and reads verdicts', async () => {
    const evalScript = await import('../scripts/trial/look-eval.mjs');
    expect(await evalScript.lookQuestion()).toBe('Quote any two statements on this screen that disagree about the main answer, or reply OK. At most 8 lines.');
    expect(evalScript.readAgent().fields.tools).toBe('Read');
    expect(evalScript.verdict('OK')).toBe('ok');
    expect(evalScript.verdict('- "NO. Unless you are a fish."\n- "Bike? Yes!"')).toBe('block');
    expect(evalScript.verdict('Not sure.')).toBe('unclear');
    expect(evalScript.LABELS).toMatchObject({ P4: 'block', P8: 'block', P3: 'ok', P5: 'ok', P7: 'ok' });
  });

  it('[AC:sl1-02] a tier passes when most runs of each labelled screen give the label', async () => {
    const { tierPasses } = await import('../scripts/trial/look-eval.mjs');
    const runs = (screen: string, ...verdicts: string[]) => verdicts.map(verdict => ({ screen, verdict }));
    const good = [...runs('P4', 'block', 'block', 'ok'), ...runs('P3', 'ok', 'ok', 'block'), ...runs('P1', 'block', 'block', 'block')];
    expect(tierPasses(good)).toBe(true);
    expect(tierPasses([...good, ...runs('P8', 'ok', 'ok', 'block')])).toBe(false);
  });

  it('[AC:sl2-02] labels the Q screens and the flooded render, and blocks P1 and P9', async () => {
    const { LABELS, SCREENS, JUDGED } = await import('../scripts/trial/look-eval.mjs');
    expect(LABELS).toMatchObject({ P1: 'block', P9: 'block', Q1: 'block', Q3: 'block', 'Q2-flooded': 'block', Q2: 'ok' });
    expect(SCREENS['Q2-flooded']).toBe('loop/arms/jc-i1-r3/.tmp/shots/forecast-flooded.png');
    expect(SCREENS.Q1).toBe('v2/judge/Q1/screen.png');
    expect(Object.keys(LABELS).sort()).toEqual(Object.keys(SCREENS).sort());
    expect(JUDGED).toHaveLength(12);
  });

  it('[AC:sl2-02] wording (b) swaps one sentence and keeps the rest of the agent text', async () => {
    const { readAgent, withWording, WORDING } = await import('../scripts/trial/look-eval.mjs');
    const body = readAgent().body;
    const flat = (value: string) => value.replace(/\s+/g, ' ');
    const b = withWording(body, 'b');
    const a = withWording(body, 'a');
    expect(flat(b)).toContain(WORDING.b);
    expect(flat(b)).not.toContain(WORDING.a);
    expect(flat(a)).toContain(WORDING.a);
    expect(flat(withWording(b, 'a'))).toBe(flat(a));
    expect(flat(b).replace(WORDING.b, '')).toBe(flat(a).replace(WORDING.a, ''));
  });

  it('[AC:sl2-02] a crop cuts a long screen into overlapping parts about one screen tall', async () => {
    const { partOffsets, screenVerdict } = await import('../scripts/trial/look-eval.mjs');
    const parts = partOffsets(1100, 2600);
    expect(parts.map(part => part.y)).toEqual([0, 440, 880, 1320, 1720]);
    expect(parts.every(part => part.height === 880)).toBe(true);
    expect(parts.at(-1)!.y + parts.at(-1)!.height).toBe(2600);
    expect(partOffsets(1100, 700)).toEqual([{ y: 0, height: 700 }]);
    expect(screenVerdict(['ok', 'block', 'ok'])).toBe('block');
    expect(screenVerdict(['ok', 'ok'])).toBe('ok');
    expect(screenVerdict(['ok', 'unclear'])).toBe('unclear');
  });

  it('[AC:sl2-02] the top part starts at sips row 1, because row 0 gives the centre crop', async () => {
    const { partOffsets, sipsOffset } = await import('../scripts/trial/look-eval.mjs');
    const rows = partOffsets(1100, 2600).map(part => sipsOffset(part.y, part.height, 2600));
    expect(rows).toEqual([1, 440, 880, 1320, 1719]);
  });

  it('[AC:sl2-02] each look task states the date its screen was rendered', async () => {
    const { CAPTURED, SCREENS, lookTask, renderLine } = await import('../scripts/trial/look-eval.mjs');
    expect(Object.keys(CAPTURED).sort()).toEqual(Object.keys(SCREENS).sort());
    expect(renderLine('2026-11-22T21:50')).toBe('The render was made on Sunday, Nov 22, 2026, at 9:50 PM.');
    expect(renderLine('2026-11-23T00:05')).toBe('The render was made on Monday, Nov 23, 2026, at 12:05 AM.');
    const task = lookTask('words', ['/x/screen.png'], 'Question?', CAPTURED.Q2).split('\n');
    expect(task.slice(-4)).toEqual(['Render: /x/screen.png', 'The render was made on Sunday, Nov 22, 2026, at 11:45 PM.', '', 'Question?']);
    expect(lookTask('words', ['/x/screen.png'], 'Question?')).not.toContain('render was made');
  });

  it('[AC:sl2-02] the ship rules: (b) only when it passes and (a) does not; crop only when it wins and never loses', async () => {
    const { decide, LABELS } = await import('../scripts/trial/look-eval.mjs');
    const labelled = Object.keys(LABELS).filter(screen => LABELS[screen] !== 'info');
    const right = (wrong: Record<string, number> = {}) => labelled.flatMap(screen => [1, 2, 3].map(run => ({
      screen, run, verdict: run <= (wrong[screen] ?? 0) ? (LABELS[screen] === 'ok' ? 'block' : 'ok') : LABELS[screen],
    })));
    const bWins = decide({ 'full-a': right({ Q1: 2 }), 'full-b': right(), 'crop-a': right({ Q3: 2 }), 'crop-b': right() });
    expect(bWins).toMatchObject({ wording: 'b', render: 'full', shipped: 'full-b', okKept: true });
    const cropWins = decide({ 'full-a': right({ Q1: 2 }), 'full-b': right({ Q3: 1 }), 'crop-a': right({ Q1: 2 }), 'crop-b': right() });
    expect(cropWins).toMatchObject({ wording: 'b', render: 'crop', shipped: 'crop-b' });
    const bothPass = decide({ 'full-a': right(), 'full-b': right(), 'crop-a': right(), 'crop-b': right({ P3: 1 }) });
    expect(bothPass).toMatchObject({ wording: 'a', render: 'full', shipped: 'full-a', okKept: true });
  });

  it('[AC:sl2-02] the second question is scored against the judge notes, as a record', async () => {
    const { scoreSecond, NOTES, SECOND } = await import('../scripts/trial/look-eval.mjs');
    expect(SECOND).toBe('Then list any fact shown with two values, and one thing the user asked for that is missing. At most 3 lines.');
    const total = Object.values(NOTES).flat().length;
    const score = scoreSecond([
      { screen: 'P6', reply: 'OK\n- Monday tide is 6.6 ft in the table and 6.8 ft in the card.' },
      { screen: 'P6', reply: 'OK' },
      { screen: 'P6', reply: 'OK\n- 6.8 ft peak, 6.6 ft in the table. Only two days ahead.' },
      { screen: 'Q2', reply: 'OK' },
    ]);
    expect(score.total).toBe(total);
    expect(score.notes.find(note => note.screen === 'P6' && note.kind === 'two values')).toMatchObject({ matched: 2, runs: 3, found: true });
    expect(score.notes.find(note => note.screen === 'Q2')).toMatchObject({ found: false });
    expect(score.found).toBe(1);
  });
});
