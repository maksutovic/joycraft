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

// The last commit on main whose payload was field-18 (1.3.0). Used to show that
// the guard finds the dead paths it was written for. Skipped in a shallow clone.
const FIELD_18 = '92146bb';
const FIELD_18_WORDS = 30434;

// The last commit on main whose payload was field-20 (1.4.0). field-21 must ship
// fewer words in skills, agent files and references (runtime-owned-steps spec 5).
const FIELD_20 = 'c3db626';
const FIELD_20_WORDS = 30033;

// The last commit on main whose payload was field-21 (1.5.0). field-22 must not
// ship more words in skills, agent files and references (open-issues).
const FIELD_21 = '522c756';
const FIELD_21_WORDS = 29941;

// The last commit on main whose payload was field-22 (1.5.1). field-23 must not
// ship more words in skills, agent files and references (legacy-acceptance).
const FIELD_22 = '23af2ca';
const FIELD_22_WORDS = 29922;

// field-23 (1.5.2, 1.5.3) shipped this many words. field-24 must not ship more
// (archive-dated-folder).
const FIELD_23_WORDS = 29919;

// field-24 (1.5.4) shipped this many words. field-26 must not ship more
// (canonical-entry-file spec 8).
const FIELD_24_WORDS = 29919;

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

const git = (args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

function hasRevision(revision: string): boolean {
  try { git(['rev-parse', '--verify', '--quiet', `${revision}^{commit}`]); return true; } catch { return false; }
}

function revisionBundle(revision: string): Bundle {
  const files = git(['ls-tree', '-r', '--name-only', revision, '--', 'payload/']).split('\n').filter(Boolean)
    .map((path) => path.replace(/^payload\//, '')).filter((path) => path !== 'PIN');
  return { label: revision, files: new Set(files), read: (path) => git(['show', `${revision}:payload/${path}`]) };
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
  { file: '.joycraft/references/setup.md', line: /WorktreeCreate/, reason: "Claude Code's own WorktreeCreate hook, not a Joycraft hook" },
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
const payloadWords = (bundle: Bundle, without: string[] = []) => payloadText(bundle)
  .filter(({ path }) => !without.includes(path))
  .reduce((sum, { text }) => sum + text.split(/\s+/).filter(Boolean).length, 0);

const field18Dead = [
  '.joycraft/references/hooks-claude.md',
  '.joycraft/references/hooks-install.md',
  '.joycraft/references/hooks-runtime.md',
  '.joycraft/references/routing.md',
  '.joycraft/runtime/hooks/cli.mjs',
  '.joycraft/runtime/hooks/judge.mjs',
  '.joycraft/runtime/hooks/metrics.mjs',
];

describe('shipped payload text', () => {
  it('[AC:vendored-field-19] ships the gate check and the gates reference', () => {
    const bundle = treeBundle();
    expect(bundle.files.has('.joycraft/runtime/gate.mjs')).toBe(true);
    expect(bundle.files.has('.joycraft/references/gates.md')).toBe(true);
  });

  it('[AC:vendored-runtime-owned-steps] pins field-26 and ships submit, evidence run and the queue check', () => {
    const pin = JSON.parse(readFileSync(join(payloadDir, 'PIN'), 'utf8'));
    expect(pin.tag).toBe('field-26');
    expect(pin.commit).toBe('ee3ab75f06fe9d5bec13f9e8770ca4f23358447e');
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

  it('[AC:vendored-runtime-owned-steps] ships fewer words than field-20', () => {
    const words = payloadWords(treeBundle());
    expect(words, `${words} words; field-20 had ${FIELD_20_WORDS}`).toBeLessThan(FIELD_20_WORDS);
  });

  it.runIf(hasRevision(FIELD_20))('[AC:vendored-runtime-owned-steps] field-20 had the recorded word count', () => {
    expect(JSON.parse(git(['show', `${FIELD_20}:payload/PIN`])).tag).toBe('field-20');
    expect(payloadWords(revisionBundle(FIELD_20))).toBe(FIELD_20_WORDS);
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

  it('[AC:payload-words-not-up] ships no more words than field-24', () => {
    const words = payloadWords(treeBundle());
    expect(words, `${words} words; field-24 had ${FIELD_24_WORDS}`).toBeLessThanOrEqual(FIELD_24_WORDS);
  });

  it('[AC:vendored-archive-dated-folder] ships no more words than field-23', () => {
    const words = payloadWords(treeBundle());
    expect(words, `${words} words; field-23 had ${FIELD_23_WORDS}`).toBeLessThanOrEqual(FIELD_23_WORDS);
  });

  it('[AC:vendored-legacy-acceptance] ships no more words than field-22', () => {
    const words = payloadWords(treeBundle());
    expect(words, `${words} words; field-22 had ${FIELD_22_WORDS}`).toBeLessThanOrEqual(FIELD_22_WORDS);
  });

  it.runIf(hasRevision(FIELD_22))('[AC:vendored-legacy-acceptance] field-22 had the recorded word count', () => {
    expect(JSON.parse(git(['show', `${FIELD_22}:payload/PIN`])).tag).toBe('field-22');
    expect(payloadWords(revisionBundle(FIELD_22))).toBe(FIELD_22_WORDS);
  });

  it('[AC:vendored-open-issues] ships no more words than field-21', () => {
    const words = payloadWords(treeBundle());
    expect(words, `${words} words; field-21 had ${FIELD_21_WORDS}`).toBeLessThanOrEqual(FIELD_21_WORDS);
  });

  it.runIf(hasRevision(FIELD_21))('[AC:vendored-open-issues] field-21 had the recorded word count', () => {
    expect(JSON.parse(git(['show', `${FIELD_21}:payload/PIN`])).tag).toBe('field-21');
    expect(payloadWords(revisionBundle(FIELD_21))).toBe(FIELD_21_WORDS);
  });

  it('every relative link and named reference or runtime path is shipped', () => {
    expect(deadReferences(treeBundle())).toEqual([]);
  });

  it('describes no unshipped hook, routing or ranker part', () => {
    expect(unshippedText(treeBundle())).toEqual([]);
  });

  it('is shorter than field-18, without the new gates reference', () => {
    const words = payloadWords(treeBundle(), ['.joycraft/references/gates.md']);
    expect(words, `${words} words; field-18 had ${FIELD_18_WORDS}`).toBeLessThan(FIELD_18_WORDS);
  });

  it.runIf(hasRevision(FIELD_18))('finds the seven dead paths and every term in the field-18 payload', () => {
    const before = revisionBundle(FIELD_18);
    expect(JSON.parse(git(['show', `${FIELD_18}:payload/PIN`])).tag).toBe('field-18');
    expect([...new Set(deadReferences(before).map((item) => item.target))].sort()).toEqual(field18Dead);
    expect([...new Set(unshippedText(before).map((item) => item.term))].sort()).toEqual(terms.map(([term]) => term).sort());
    expect(payloadWords(before)).toBe(FIELD_18_WORDS);
  });
});
