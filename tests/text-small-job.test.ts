import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyInstall, planInstall } from '../src/install-v1.js';

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
  it('[AC:sl1-01] the Work line names both paths and its four parts', () => {
    expect(workLines[0]).toBe('- Work: before you change code, say `Path: small job` or `Path: feature`.');
    expect(workLines.slice(1).map(line => line.slice(4, line.indexOf(':')))).toEqual(['Small job', 'Look, before you close', 'Close in one commit (no Git', 'Feature']);
  });

  it.each([
    // Small job: the line, the brief, the guesses.
    'it fits one session, needs no owner answer you cannot assume, and has no migration, auth, payment, deploy or public-API change.',
    'A time limit from the user means this path.',
    'Write `docs/features/<slug>/brief.md` (the features folder in `joycraft.yaml` when set)',
    "the user's request word for word, then \"Done when\" lines, each a state or input with its expected result.",
    'The first line gives the one answer the whole screen or output shows when its parts disagree.',
    'Write each guess as an `Assumed:` line. Do not ask.',
    'Build no page for this brief.',
    'check each line with a test or by looking at the running result.',
    // Look: fresh eyes, one question, two quotes block.
    "give a fresh agent (Claude Code: agent type `joycraft-look`) only the user's words and renders of the default state and one mixed state.",
    'Give it no brief and no code.',
    'Ask: "Quote any two statements on this screen that disagree about the main answer, or reply OK. At most 8 lines."',
    'Two such quotes block the close: fix, then look again one time. Its other remarks are notes.',
    'With no separate agent, read the renders yourself and say the look was not independent.',
    // Close: one commit, marks, docs, archive, final message.
    'Close in one commit (no Git: say so).',
    'Mark each line with its check (`test: <file>` or `seen: <render>`) and the look result.',
    'Update the mapped page that the change makes stale, with how to run and look at the result.',
    'Add a trap you hit to the traps page.',
    'Put a standing instruction from the user under `## Rules` in their words.',
    'Move the brief folder to `docs/archive/<slug>/`.',
    'Final message: the path, "N of N lines checked", the look result, and that no code review ran.',
    // Feature: the full loop, and when a small job escalates.
    'Feature: all other work, or when the user asks for the full loop: use the `joycraft-entry` skill.',
    'A small job becomes a feature when it needs an owner answer, meets one of those changes, or fails the same check twice: keep the brief and add specs.',
  ])('[AC:sl1-01] pins: %s', phrase => {
    expect(workLines.join('\n')).toContain(phrase);
  });

  it('[AC:sl1-01] the Work line holds no semicolon (STE fix-to-zero class)', () => {
    expect(workLines.join('\n')).not.toContain(';');
  });
});

describe('small-job routing in the skills, setup and templates', () => {
  it('[AC:sl1-01] the entry skill is for setup and features, and a small job skips it', () => {
    const entry = text('.agents/skills/joycraft-entry/SKILL.md');
    expect(entry).toMatch(/^description: Set up Joycraft or start a feature\./m);
    const body = entry.split(/^---$/m)[2].trim();
    expect(body.split('\n\n')[0].replace(/\s+/g, ' ')).toBe('A small job by the `Work` line in `AGENTS.md` does not use this skill and reads nothing here.');
    expect(entry.replace(/\s+/g, ' ')).toContain('A small job has no code review. Its look is its review.');
    expect(entry).not.toContain('small authorized tooling repair');
    expect(entry).not.toContain('existing direct path');
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

  it('[AC:sl1-01] the brief template asks for a whole-result Done when line for a mixed state', () => {
    expect(text('.joycraft/templates/brief.md').replace(/\s+/g, ' '))
      .toContain('Add one whole-result **Done when** line for a mixed state: the one answer the whole screen or output shows when its parts disagree.');
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

  it('[AC:sl1-01] an open brief and a hand-closed one (no queue) add nothing to wiring, status, cleanup or gate check', () => {
    const root = installed();
    const before = reports(root);
    put(join(root, 'docs/features/x/brief.md'), '# Add a button\n\nAdd a button.\n\n## Goals\n\n- Done when: the page shows one button.\n- Assumed: the button is blue.\n');
    put(join(root, 'docs/archive/y/brief.md'), '# Add a title\n\nAdd a title.\n\n## Goals\n\n- Done when: the page shows a title. test: `tests/title.test.ts`\n- Look: OK\n');
    git(root, 'add', '.');
    git(root, 'commit', '-q', '-m', 'small jobs');
    expect(reports(root)).toEqual(before);
    expect(before.map(report => report.status)).toEqual([0, 0, 0, 0]);
  });
});
