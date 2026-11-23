import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, posix, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Guards the text an agent reads in the shipped payload: every relative link and
// every named reference or runtime path must be shipped, and the text must not
// describe the parts that stay in the source repository (native hooks, routing,
// the Jev ranker). The source repository has the same guard; its tests are not
// vendored, so this repository keeps its own copy of the rules.

const root = join(__dirname, '..');
const payloadDir = process.env.JOYCRAFT_PAYLOAD_GUARD_ROOT ?? join(root, 'payload');

// field-24 (1.5.4) shipped this many words in all.
const FIELD_24_WORDS = 29919;

// Decision cap-raise = split-cap (docs/features/2026-11-21-test-release): the
// guard counts two groups of payload text against two caps.
//
// Every-spec text is what an agent reads while it works a spec: the implement,
// verify, decompose and testing skills, the implementer and reviewer agent
// files, and the references those always read per spec, including worktrees.md,
// which the implement and verify skills link for worker isolation. Other
// references they link (architecture, artifacts, delivery, recurring failures)
// are read only "when" a condition holds, so they are on-demand. Every-spec text
// stays flat: its cap is the field-24 total minus the on-demand words measured
// at the commit before spec 1 (f157616: 29,864 words in all, 12,201 every-spec,
// 17,663 on-demand), so 29,919 - 17,663 = 12,256.
//
// On-demand text is everything else: setup, update, cleanup, archive, the test
// review, artifacts, settings, the session-end, cleanup, retro, context, entry
// and ui-slice skills, and any new on-demand reference. It may grow by 2,000
// words over its count before spec 1: 17,663 + 2,000 = 19,663 (raised to +3,500 below).
//
// Spec 1 cut two duplicates (setup.md's Claude worktree paragraph, a copy of
// worktrees.md; joycraft-testing's acceptance-test paragraph). After it:
// 12,150 every-spec words (106 spare) and 17,569 on-demand words (2,094 spare).

// [AC:spec-5-2] Decision `word-cap-split` = `on-demand` (Max, 2026-11-22): `testing-review.md`
// stays on-demand. Per-spec readers (reviewer, verify, implementer, decompose)
// link only its `#test-changes` and `#test-only-specs` sections, and read them
// only when a spec changes tests or is test-only; the rest is cleanup's test review.
/** Every-spec text: each file with who reads it, and when. */
export const EVERY_SPEC_FILES: Record<string, string> = {
  '.agents/skills/joycraft-implement/SKILL.md': 'the coordinator, for every spec it runs',
  '.agents/skills/joycraft-verify/SKILL.md': 'the reviewer, for every spec it reviews',
  '.agents/skills/joycraft-decompose/SKILL.md': 'the decomposer, for every spec it writes',
  '.agents/skills/joycraft-testing/SKILL.md': 'the implementer and reviewer, when they run any check',
  '.claude/agents/joycraft-implementer.md': 'each implementer subagent, at start',
  '.claude/agents/joycraft-reviewer.md': 'each reviewer subagent, at start',
  '.joycraft/references/testing.md': 'implement, verify, testing and both agents link its running-tests tiers on every spec',
  '.joycraft/references/workflow.md': 'decompose follows its commitment-and-queue section for every queue',
  '.joycraft/references/dispatch.md': 'implement and the implementer run its dispatch preflight on every spec',
  '.joycraft/references/completion.md': 'the reviewer reads it at start; verify and implement use it to submit and accept',
  '.joycraft/references/gates.md': 'the gate check and Stop hook run on every spec once gates are on',
  '.joycraft/references/worktrees.md': 'the implement and verify skills link it for worker isolation; a packet\'s readFirst is AGENTS.md and the role skill only',
};
export const EVERY_SPEC_CAP = FIELD_24_WORDS - 17663;
// Decision `on-demand-budget` = `plus-1500` (Max, 2026-11-21): on-demand text may
// grow by 1,500 more words, 3,500 in all. The every-spec cap does not move.
export const ON_DEMAND_CAP = 17663 + 3500;

/** True when a payload text file is on-demand: every payload text file not in EVERY_SPEC_FILES. */
export const isOnDemand = (path: string) => !(path in EVERY_SPEC_FILES);

interface Bundle { label: string; files: Set<string>; read: (path: string) => string }

function walk(dir: string): string[] {
  return readdirSync(dir).sort().flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [relative(payloadDir, path).split('\\').join('/')];
  });
}

function treeBundle(): Bundle {
  return {
    label: payloadDir,
    files: new Set(walk(payloadDir).filter((path) => path !== 'PIN')),
    read: (path) => readFileSync(join(payloadDir, path), 'utf8'),
  };
}

/** Shipped skills, agent files and references: the text an agent reads. */
const isPayloadText = (path: string) => /^\.agents\/skills\/joycraft-[^/]+\/SKILL\.md$/.test(path)
  || /^\.claude\/agents\/[^/]+\.md$/.test(path)
  || /^\.joycraft\/references\/.+\.md$/.test(path);

const payloadText = (bundle: Bundle) => [...bundle.files].filter(isPayloadText).sort()
  .map((path) => ({ path, text: bundle.read(path) }));

const markdownLink = /\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
const namedPath = /\.joycraft\/(?:references\/[\w./-]+?\.md|runtime\/[\w./-]+?\.mjs)(?![\w-])/g;

/** Each relative link and named `.joycraft/references/**.md` or `.joycraft/runtime/**.mjs` the bundle lacks. */
function deadReferences(bundle: Bundle): { file: string; target: string }[] {
  const dead: { file: string; target: string }[] = [];
  for (const { path, text } of payloadText(bundle)) {
    for (const [, link] of text.matchAll(markdownLink)) {
      if (/^[a-z][a-z\d+.-]*:/i.test(link) || link.startsWith('#')) continue;
      const target = posix.normalize(posix.join(posix.dirname(path), link.replace(/[#?].*$/, '')));
      if (!bundle.files.has(target)) dead.push({ file: path, target });
    }
    for (const [target] of text.matchAll(namedPath)) {
      if (!bundle.files.has(target)) dead.push({ file: path, target });
    }
  }
  return dead;
}

// Terms for parts that are not shipped.
const terms: [string, RegExp][] = [
  ['Jev', /\bjev\b/i],
  ['hooks-config.json', /hooks-config\.json/i],
  ['hook receipt', /hook receipt/i],
  ['classifier', /classifier/i],
  ['routing advice', /routing advice/i],
  ['hookSourceView', /hooksourceview/i],
  ['hooks-disabled', /hooks-disabled/i],
];

// A line in `file` that matches `line` may use a term. Each entry says why.
const allowlist: { file: string; line: RegExp; reason: string }[] = [
  { file: '.joycraft/references/settings.md', line: /hooks\.afterArchive/, reason: 'the after-archive setting runs a project command; Joycraft ships it' },
  { file: '.joycraft/references/worktrees.md', line: /WorktreeCreate/, reason: "Claude Code's own WorktreeCreate hook, not a Joycraft hook" },
  { file: '.joycraft/references/gates.md', line: /\bStop\b/, reason: 'the gate Stop hook ships with the gates reference' },
];

function unshippedText(bundle: Bundle): { file: string; line: number; term: string }[] {
  const found: { file: string; line: number; term: string }[] = [];
  for (const { path, text } of payloadText(bundle)) {
    text.split('\n').forEach((line, index) => {
      if (allowlist.some((entry) => entry.file === path && entry.line.test(line))) return;
      for (const [term, pattern] of terms) if (pattern.test(line)) found.push({ file: path, line: index + 1, term });
    });
  }
  return found;
}

/** Words in the shipped skills, agent files and references, counted like `wc -w`. */
const payloadWords = (bundle: Bundle, keep: (path: string) => boolean = () => true) => payloadText(bundle)
  .filter(({ path }) => keep(path))
  .reduce((sum, { text }) => sum + text.split(/\s+/).filter(Boolean).length, 0);

/** Every-spec and on-demand word counts, and the caps each one breaks. */
function splitCap(bundle: Bundle) {
  const everySpec = payloadWords(bundle, (path) => !isOnDemand(path));
  const onDemand = payloadWords(bundle, isOnDemand);
  const over: string[] = [];
  if (everySpec > EVERY_SPEC_CAP) over.push(`every-spec ${everySpec} > ${EVERY_SPEC_CAP}`);
  if (onDemand > ON_DEMAND_CAP) over.push(`on-demand ${onDemand} > ${ON_DEMAND_CAP}`);
  return { everySpec, onDemand, over };
}

/** The shipped bundle with `words` extra words appended to one file. */
function grown(path: string, words: number): Bundle {
  const bundle = treeBundle();
  return { ...bundle, read: (file) => bundle.read(file) + (file === path ? `\n${'word '.repeat(words)}\n` : '') };
}

describe('shipped payload text', () => {
  it('[AC:vendored-field-19] ships the gate check and the gates reference', () => {
    const bundle = treeBundle();
    expect(bundle.files.has('.joycraft/runtime/gate.mjs')).toBe(true);
    expect(bundle.files.has('.joycraft/references/gates.md')).toBe(true);
  });

  it('[AC:vendored-runtime-owned-steps] pins the payload and ships submit, evidence run and the queue check', () => {
    const pin = JSON.parse(readFileSync(join(payloadDir, 'PIN'), 'utf8'));
    // payload/ is the source since 1.7.0; scripts/pin-payload.mjs writes the tag.
    expect(pin.source).toBe('joycraft');
    expect(pin.tag).toMatch(/^payload-[0-9a-f]{12}$/);
    const bundle = treeBundle();
    for (const path of ['.joycraft/runtime/completion.mjs', '.joycraft/runtime/evidence.mjs', '.joycraft/runtime/queue-check.mjs']) {
      expect(bundle.files.has(path), path).toBe(true);
      expect(Object.keys(pin.files)).toContain(path);
    }
    expect(bundle.read('.joycraft/runtime/completion.mjs')).toMatch(/\bsubmit\b/);
    const run = (script: string, args: string[]) => spawnSync(process.execPath, [join(payloadDir, '.joycraft/runtime', script), ...args], { encoding: 'utf8' });
    expect(run('completion.mjs', ['submit']).stderr).toMatch(/arguments for submit/);
    expect(run('evidence.mjs', []).stderr).toMatch(/evidence\.mjs run --receipt <path>/);
    expect(run('queue-check.mjs', []).stderr).toMatch(/queue-check\.mjs --queue <queue>/);
  });

  it('[AC:vendored-open-issues] evidence run exits 1 when the command fails, writes the receipt and keeps the real exit code in command.exitCode', () => {
    const project = mkdtempSync(join(tmpdir(), 'joycraft-evidence-run-'));
    try {
      execFileSync('git', ['init', '-q'], { cwd: project });
      cpSync(join(payloadDir, '.joycraft'), join(project, '.joycraft'), { recursive: true });
      writeFileSync(join(project, '.gitignore'), 'receipts/\n');
      const result = spawnSync(process.execPath, ['.joycraft/runtime/evidence.mjs', 'run', '--receipt', 'receipts/run.txt', '--',
        process.execPath, '-e', "console.log('CI=' + process.env.CI); process.exit(3)"], { cwd: project, encoding: 'utf8' });
      expect(result.status).toBe(1);
      const observation = JSON.parse(result.stdout);
      expect(observation.command.exitCode).toBe(3);
      expect(observation.timeoutMs).toBe(300000);
      expect(observation.receipts[0].path).toBe('receipts/run.txt');
      expect(readFileSync(join(project, 'receipts/run.txt'), 'utf8')).toContain('CI=1');
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  /** A git project with the shipped runtime and one queue whose specs are `done` with no acceptance. */
  function doneSpecsProject(prefix: string, specIds: number[], extra: Record<string, unknown> = {}): string {
    const project = mkdtempSync(join(tmpdir(), prefix));
    execFileSync('git', ['init', '-q'], { cwd: project });
    cpSync(join(payloadDir, '.joycraft'), join(project, '.joycraft'), { recursive: true });
    writeFileSync(join(project, '.joycraft/installation.json'), JSON.stringify({ hosts: ['claude'] }));
    const specs = join(project, 'docs/features/demo/specs');
    mkdirSync(specs, { recursive: true });
    for (const id of specIds) writeFileSync(join(specs, `0${id}-a.md`), `---\nid: ${id}\nstatus: done\n---\n# A\n`);
    writeFileSync(join(specs, '.joycraft-spec-queue.json'), JSON.stringify({ schemaVersion: 1, feature: 'demo',
      specs: specIds.map((id) => ({ id, file: `0${id}-a.md`, depends_on: [], status: 'done', mode: 'batch', ...extra, verification: {
        inputs: [{ path: `docs/features/demo/specs/0${id}-a.md`, kind: 'requirement' }],
        criteria: [{ id: 'a', requirement: { path: `docs/features/demo/specs/0${id}-a.md`, anchor: 'a' }, requiredKinds: ['runtime'] }] } })) }));
    return project;
  }

  const queue = 'docs/features/demo/specs/.joycraft-spec-queue.json';
  const decision = 'docs/features/demo/specs/legacy-acceptance.json';
  const node = (project: string, args: string[]) => spawnSync(process.execPath, args, { cwd: project, encoding: 'utf8' });
  function writeDecision(project: string, specs: number[]) {
    writeFileSync(join(project, decision), JSON.stringify({ schemaVersion: 1, kind: 'legacy', queuePath: queue,
      statement: 'accept them as they are', statedAt: '2026-11-16', specs, reason: 'marked done with no review on record' }, null, 2));
  }

  it('[AC:vendored-open-issues] hook --on refuses over an unaccepted done spec, exits 2 and writes nothing', () => {
    const project = doneSpecsProject('joycraft-gate-on-', [1]);
    try {
      const result = spawnSync(process.execPath, ['.joycraft/runtime/gate.mjs', 'hook', '--on'], { cwd: project, encoding: 'utf8' });
      expect(result.status, result.stderr).toBe(2);
      expect(result.stderr).toMatch(/Do not ask the user/);
      expect(result.stderr).toMatch(/nothing was written/);
      expect(existsSync(join(project, '.claude/settings.json'))).toBe(false);
      expect(existsSync(join(project, '.joycraft/local/gate-hook.json'))).toBe(false);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('[AC:vendored-legacy-acceptance] hook --plan asks one question about done specs with no acceptance', () => {
    const project = doneSpecsProject('joycraft-gate-plan-', [1]);
    try {
      const result = node(project, ['.joycraft/runtime/gate.mjs', 'hook', '--plan']);
      expect(JSON.parse(result.stdout).message).toMatch(/ask one question instead: accept them as they are, or send them back for review/);
      expect(existsSync(join(project, '.claude/settings.json'))).toBe(false);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('[AC:vendored-legacy-acceptance] accept-owner --legacy accepts done specs on a decision file, and then the gates turn on', () => {
    const project = doneSpecsProject('joycraft-legacy-', [1, 2]);
    try {
      writeDecision(project, [1, 2]);
      const accepted = node(project, ['.joycraft/runtime/completion.mjs', 'accept-owner', '--legacy', '--queue', queue, '--spec', '1,2', '--decision', decision]);
      expect(accepted.status, accepted.stderr).toBe(0);
      const saved = JSON.parse(readFileSync(join(project, queue), 'utf8'));
      expect(saved.specs.map((spec: { status: string; ownerAcceptance: { legacy: boolean } }) => [spec.status, spec.ownerAcceptance.legacy])).toEqual([['done', true], ['done', true]]);
      expect(node(project, ['.joycraft/runtime/gate.mjs', 'check']).status).toBe(0);
      const on = node(project, ['.joycraft/runtime/gate.mjs', 'hook', '--on']);
      expect(on.status, on.stderr).toBe(0);
      expect(readFileSync(join(project, '.claude/settings.json'), 'utf8')).toMatch(/gate\.mjs/);
      writeFileSync(join(project, decision), '{}');
      expect(node(project, ['.joycraft/runtime/gate.mjs', 'check']).status).toBe(2);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('[AC:vendored-legacy-acceptance] accept-owner --legacy refuses a spec submitted for review and writes nothing', () => {
    const project = doneSpecsProject('joycraft-legacy-refuse-', [1], { submitted: { at: '2026-11-16T00:00:00.000Z' } });
    try {
      writeDecision(project, [1]);
      const before = readFileSync(join(project, queue), 'utf8');
      const result = node(project, ['.joycraft/runtime/completion.mjs', 'accept-owner', '--legacy', '--queue', queue, '--spec', '1', '--decision', decision]);
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/went through review/);
      expect(readFileSync(join(project, queue), 'utf8')).toBe(before);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('[AC:vendored-archive-dated-folder] a dated folder with an undated queue feature archives by the feature name, and replays by either name', () => {
    const project = doneSpecsProject('joycraft-dated-archive-', [1]);
    try {
      // The field shape: docs/features/2026-11-17-demo with "feature": "demo".
      const folder = 'docs/features/2026-11-17-demo';
      renameSync(join(project, 'docs/features/demo'), join(project, folder));
      const datedQueue = `${folder}/specs/.joycraft-spec-queue.json`;
      writeFileSync(join(project, datedQueue), readFileSync(join(project, datedQueue), 'utf8').replaceAll('docs/features/demo/', `${folder}/`));
      writeFileSync(join(project, folder, 'brief.md'), '# Demo\n');
      const datedDecision = `${folder}/specs/legacy-acceptance.json`;
      writeFileSync(join(project, datedDecision), JSON.stringify({ schemaVersion: 1, kind: 'legacy', queuePath: datedQueue,
        statement: 'accept them as they are', statedAt: '2026-11-17', specs: [1], reason: 'marked done with no review on record' }, null, 2));
      expect(node(project, ['.joycraft/runtime/queue-check.mjs', '--queue', datedQueue]).stderr).not.toMatch(/its folder is/);
      const accepted = node(project, ['.joycraft/runtime/completion.mjs', 'accept-owner', '--legacy', '--queue', datedQueue, '--spec', '1', '--decision', datedDecision]);
      expect(accepted.status, accepted.stderr).toBe(0);
      mkdirSync(join(project, 'docs/context'), { recursive: true });
      writeFileSync(join(project, 'docs/context/decision-log.md'), '# Decisions\n');
      writeFileSync(join(project, 'attestation.json'), JSON.stringify({ schemaVersion: 1, phase: 'session-end',
        host: { sessionId: 'host', quiescent: true, activeWorkers: [], dependentWork: [] }, durableContext: { carried: true, references: ['docs/context/decision-log.md'] } }));
      const archive = (feature: string) => node(project, ['.joycraft/runtime/archive.mjs', 'archive', '--feature', feature, '--phase', 'session-end', '--attestation', 'attestation.json', '--apply']);
      const first = archive('demo');
      expect(first.status, first.stderr).toBe(0);
      expect(JSON.parse(first.stdout)).toMatchObject({ status: 'archived', destination: 'docs/archive/2026-11-17-demo' });
      expect(existsSync(join(project, folder))).toBe(false);
      const manifest = JSON.parse(readFileSync(join(project, 'docs/archive/2026-11-17-demo/archive-replay.json'), 'utf8'));
      expect([manifest.feature, manifest.source]).toEqual(['demo', folder]);
      for (const name of ['demo', '2026-11-17-demo']) expect(JSON.parse(archive(name).stdout).unchanged, name).toBe(true);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('[AC:vendored-archive-dated-folder] queue-check reports a folder that is not named for its queue feature', () => {
    const project = doneSpecsProject('joycraft-folder-gap-', [1]);
    try {
      renameSync(join(project, 'docs/features/demo'), join(project, 'docs/features/2026-11-17-checkout'));
      const moved = 'docs/features/2026-11-17-checkout/specs/.joycraft-spec-queue.json';
      const result = node(project, ['.joycraft/runtime/queue-check.mjs', '--queue', moved]);
      expect(result.status, result.stderr).toBe(2);
      expect(result.stderr).toMatch(/has feature "demo", but its folder is docs\/features\/2026-11-17-checkout; session-end archive finds a feature only in a folder named demo or YYYY-MM-DD-demo\./);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('[AC:spec-1-1] [AC:spec-7-1] lists every-spec files that exist, and the two groups cover exactly the payload text', () => {
    // The 12 every-spec paths, pinned: dropping or adding one fails here instead of moving its words to the on-demand budget.
    expect(Object.keys(EVERY_SPEC_FILES).sort()).toEqual([
      '.agents/skills/joycraft-implement/SKILL.md',
      '.agents/skills/joycraft-verify/SKILL.md',
      '.agents/skills/joycraft-decompose/SKILL.md',
      '.agents/skills/joycraft-testing/SKILL.md',
      '.claude/agents/joycraft-implementer.md',
      '.claude/agents/joycraft-reviewer.md',
      '.joycraft/references/testing.md',
      '.joycraft/references/workflow.md',
      '.joycraft/references/dispatch.md',
      '.joycraft/references/completion.md',
      '.joycraft/references/gates.md',
      '.joycraft/references/worktrees.md',
    ].sort());
    const bundle = treeBundle();
    for (const path of Object.keys(EVERY_SPEC_FILES)) expect(bundle.files.has(path), path).toBe(true);
    const text = [...bundle.files].filter(isPayloadText);
    const everySpec = text.filter((path) => !isOnDemand(path));
    const onDemand = text.filter(isOnDemand);
    expect([...everySpec, ...onDemand].sort()).toEqual(text.sort());
    expect(everySpec.sort()).toEqual(Object.keys(EVERY_SPEC_FILES).sort());
    for (const path of ['setup.md', 'update.md', 'testing-review.md', 'testing-page.md', 'archive.md', 'cleanup.md', 'retro.md', 'settings.md', 'doc-cleanup-LICENSE.md']) {
      expect(onDemand, path).toContain(`.joycraft/references/${path}`);
    }
  });

  it('[AC:spec-1-2] [AC:spec-7-2] [AC:spec-2-4] every-spec and on-demand words stay under their own caps', () => {
    const { everySpec, onDemand, over } = splitCap(treeBundle());
    console.log(`every-spec words: ${everySpec} (cap ${EVERY_SPEC_CAP}, ${EVERY_SPEC_CAP - everySpec} spare)`);
    console.log(`on-demand words: ${onDemand} (cap ${ON_DEMAND_CAP}, ${ON_DEMAND_CAP - onDemand} spare)`);
    expect(over).toEqual([]);
  });

  it('[AC:spec-1-3] 200 more words in the implement skill break the every-spec cap; 600 more in the test review do not', () => {
    // At least 200, and always one past the spare, so later cuts cannot make this pass without a regression.
    const spare = EVERY_SPEC_CAP - splitCap(treeBundle()).everySpec;
    expect(splitCap(grown('.agents/skills/joycraft-implement/SKILL.md', Math.max(200, spare + 1))).over).toEqual([expect.stringMatching(/^every-spec /)]);
    // 600 more on-demand words: no every-spec entry.
    const review = splitCap(grown('.joycraft/references/testing-review.md', 600));
    expect(review.over.filter((entry) => entry.startsWith('every-spec '))).toEqual([]);
    // Growth up to the on-demand spare stays under the on-demand cap. sl1-02's look agent
    // (96 on-demand words) left less than 600 spare; ON_DEMAND_CAP itself did not move.
    const onDemandSpare = ON_DEMAND_CAP - splitCap(treeBundle()).onDemand;
    expect(splitCap(grown('.joycraft/references/testing-review.md', Math.min(600, onDemandSpare))).onDemand).toBeLessThanOrEqual(ON_DEMAND_CAP);
    // One word past the on-demand spare breaks only the on-demand cap.
    expect(splitCap(grown('.joycraft/references/testing-review.md', onDemandSpare + 1)).over).toEqual([expect.stringMatching(/^on-demand /)]);
  });

  it('[AC:spec-1-4] the duplicate worktree and acceptance-test paragraphs are cut, and worktrees.md keeps its copy', () => {
    const bundle = treeBundle();
    expect(bundle.read('.joycraft/references/setup.md')).not.toMatch(/WorktreeCreate/);
    expect(bundle.read('.joycraft/references/setup.md')).toMatch(/resource-lease convention/);
    // [AC:spec-2-1] 1.9.3 cut the Claude native-isolation recipe and its hook note from worktrees.md too.
    expect(bundle.read('.joycraft/references/worktrees.md')).not.toMatch(/WorktreeCreate/);
    expect(bundle.read('.agents/skills/joycraft-testing/SKILL.md')).not.toMatch(/sized like neighboring tests/);
    // sl1-01 added the 17-word small-job scope line to the implement skill. The cut still holds against the
    // count before spec 1 plus that line; EVERY_SPEC_CAP stays the limit for new every-spec text.
    // sl1-05 added the 17-word sentence in the decompose skill that names the four input kinds.
    expect(payloadWords(bundle, (path) => !isOnDemand(path))).toBeLessThan(12201 + 17 + 17);
  });

  it('every relative link and named reference or runtime path is shipped', () => {
    expect(deadReferences(treeBundle())).toEqual([]);
  });

  it('describes no unshipped hook, routing or ranker part', () => {
    expect(unshippedText(treeBundle())).toEqual([]);
  });

  it('finds a dead link, a dead named path and an unshipped term', () => {
    const files: Record<string, string> = {
      '.agents/skills/joycraft-demo/SKILL.md': 'See [routing](../../../.joycraft/references/routing.md) and `.joycraft/runtime/hooks/cli.mjs`.\nJev ranks the specs.\n',
    };
    const bundle: Bundle = { label: 'fixture', files: new Set(Object.keys(files)), read: (path) => files[path] };
    expect([...new Set(deadReferences(bundle).map((item) => item.target))].sort()).toEqual(['.joycraft/references/routing.md', '.joycraft/runtime/hooks/cli.mjs']);
    expect(unshippedText(bundle).map((item) => item.term)).toEqual(['Jev']);
  });
});
