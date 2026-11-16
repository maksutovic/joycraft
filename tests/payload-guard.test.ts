import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
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

  it('[AC:vendored-runtime-owned-steps] pins field-21 and ships submit, evidence run and the queue check', () => {
    const pin = JSON.parse(readFileSync(join(payloadDir, 'PIN'), 'utf8'));
    expect(pin.tag).toBe('field-21');
    expect(pin.commit).toBe('905489efbd89190321d9b50abfd0551854f79159');
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

  it('[AC:vendored-runtime-owned-steps] evidence run exits 0 once recorded and keeps the real exit code in command.exitCode', () => {
    const project = mkdtempSync(join(tmpdir(), 'joycraft-evidence-run-'));
    try {
      execFileSync('git', ['init', '-q'], { cwd: project });
      cpSync(join(payloadDir, '.joycraft'), join(project, '.joycraft'), { recursive: true });
      writeFileSync(join(project, '.gitignore'), 'receipts/\n');
      const result = spawnSync(process.execPath, ['.joycraft/runtime/evidence.mjs', 'run', '--receipt', 'receipts/run.txt', '--',
        process.execPath, '-e', "console.log('CI=' + process.env.CI); process.exit(3)"], { cwd: project, encoding: 'utf8' });
      expect(result.status).toBe(0);
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
