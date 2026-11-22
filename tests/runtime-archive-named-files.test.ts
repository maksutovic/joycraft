import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

const runtime = join(__dirname, '..', 'payload', '.joycraft', 'runtime', 'archive.mjs');
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string | Buffer) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const hash = (body: string) => createHash('sha256').update(Buffer.from(body)).digest('hex');
const source = 'docs/features/x';
const localAttest = '.joycraft/local/attest.json';

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true, maxRetries: 5 }); });

// The test reads the brief and fails when it is missing or says "fail".
const briefTest = (where: string) => `import { readFileSync } from 'node:fs';\n// two-tier\nconst brief = readFileSync('${where}/brief.md', 'utf8');\nif (brief.includes('fail')) process.exit(1);\n`;

/** A done, legacy-accepted feature folder. */
function addFeature(root: string, feature: string, brief = '# Brief\n', folderName = feature) {
  const folder = `docs/features/${folderName}`, queuePath = `${folder}/specs/.joycraft-spec-queue.json`;
  put(join(root, `${folder}/brief.md`), brief);
  put(join(root, `${folder}/specs/01-a.md`), '---\nid: 1\nstatus: done\n---\n# A\n');
  const decision = JSON.stringify({ schemaVersion: 1, kind: 'legacy', queuePath, statement: 'Accept it as it is.', statedAt: '2026-11-21T00:00:00Z', specs: [1], reason: 'Done before the gates.' });
  put(join(root, `${folder}/specs/legacy.json`), decision);
  put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature, specs: [{ id: 1, file: '01-a.md', status: 'done', mode: 'batch', depends_on: [], verification: { inputs: [] }, ownerAcceptance: { path: `${folder}/specs/legacy.json`, sha256: hash(decision), legacy: true } }] }));
}

/** A done feature `x` (legacy-accepted) in `folder`, a test and a script that name it. */
function fixture({ folder = 'x', extra = {}, attest = localAttest }: { folder?: string; extra?: Record<string, string>; attest?: string } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-archive-named-')));
  dirs.push(root);
  const live = `docs/features/${folder}`;
  git(root, 'init', '-q', '-b', 'main');
  addFeature(root, 'x', '# Brief\n', folder);
  put(join(root, 'docs/context/decision-log.md'), '# Decisions\n');
  put(join(root, '.gitignore'), `${dirname(attest)}/\n`);
  put(join(root, attest), JSON.stringify({ schemaVersion: 1, phase: 'session-end', host: { sessionId: 's', quiescent: true, activeWorkers: [], dependentWork: [] }, durableContext: { carried: true, references: ['docs/context/decision-log.md'] } }));
  put(join(root, 'tests/two-tier.test.mjs'), briefTest(live));
  put(join(root, 'scripts/x.mjs'), `export const folder = '${live}';\n`);
  put(join(root, 'docs/notes.md'), `See ${live}.\n`);
  for (const [file, body] of Object.entries(extra)) put(join(root, file), body);
  git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'init');
  return root;
}

const run = (root: string, extra: string[] = [], { attest = localAttest, env = {} }: { attest?: string; env?: Record<string, string> } = {}) => {
  const result = spawnSync(process.execPath, [runtime, 'archive', '--feature', 'x', '--phase', 'session-end', '--attestation', attest, ...extra], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } });
  let output = null;
  try { output = JSON.parse(result.stdout); } catch { /* a refusal prints no result */ }
  return { status: result.status, stderr: result.stderr, output };
};
const archive = (root: string, ...extra: string[]) => run(root, extra);
const listed = (root: string) => archive(root).output.plan.namedFiles;

describe('archive lists files that name the feature folder', () => {
  it('[AC:spec-13-1] the preview, strict and as-is, lists the test first and the script, and moves nothing', () => {
    const root = fixture();
    for (const extra of [[], ['--as-is', '--owner-instruction', 'Archive it as it is.']]) {
      const preview = archive(root, ...extra);
      expect(preview.status, preview.stderr).toBe(0);
      expect(preview.output.plan.namedFiles).toEqual([
        { path: 'tests/two-tier.test.mjs', line: 3, text: "const brief = readFileSync('docs/features/x/brief.md', 'utf8');", test: true },
        { path: 'scripts/x.mjs', line: 1, text: "export const folder = 'docs/features/x';", test: false },
      ]);
    }
    expect(existsSync(join(root, source, 'brief.md'))).toBe(true);
    expect(git(root, 'status', '--porcelain')).toBe('');
  });

  it('[review-13-2] only the features home path with a path boundary names the folder', () => {
    const body = `const a = './docs/features/x/brief.md';\nconst b = 'packages/app/docs/features/x/y';\nconst c = 'docs/features/x.old';\nconst d = 'docs/features/x-two';\nprocess.exit(0);\n`;
    const root = fixture({ extra: { 'tests/multi.test.mjs': body, 'scripts/nested.mjs': "export const p = 'packages/app/docs/features/x/y';\n", 'scripts/old.mjs': "export const p = 'docs/features/x.old';\n" } });
    const paths = listed(root).map((file: { path: string }) => file.path);
    expect(paths).toContain('tests/multi.test.mjs');
    expect(paths).not.toContain('scripts/nested.mjs');
    expect(paths).not.toContain('scripts/old.mjs');
  });

  it('[review-13-6] a migration is listed and marked, so the agent leaves it as it is', () => {
    const root = fixture({ extra: { 'db/migrations/0001_init.sql': `-- from ${source}/brief.md\nCREATE TABLE t (id int);\n` } });
    expect(listed(root)).toContainEqual({ path: 'db/migrations/0001_init.sql', line: 1, text: `-- from ${source}/brief.md`, test: false, migration: true });
  });
});

const dated = '2026-11-21-x', datedSource = `docs/features/${dated}`;
const ignoredStatus = (root: string) => git(root, 'status', '--porcelain', '--ignored', '--untracked-files=all');

describe('archive lists only (spec 30)', () => {
  it('[AC:spec-30-1] a strict and an --as-is preview write nothing and move nothing, also beside an old pending record', () => {
    const root = fixture();
    put(join(root, '.joycraft/local/archive-pending/x.json'), '{"owner":{"pid":1,"started":null,"run":"0"}');
    const before = ignoredStatus(root);
    for (const extra of [[], ['--as-is', '--owner-instruction', 'Archive it as it is.']]) {
      const preview = archive(root, ...extra);
      expect(preview.status, preview.stderr).toBe(0);
      expect(preview.output.status).toBe('preview');
      expect(ignoredStatus(root)).toBe(before);
      expect(existsSync(join(root, source, 'brief.md'))).toBe(true);
    }
    expect(readFileSync(join(root, '.joycraft/local/archive-pending/x.json'), 'utf8')).toBe('{"owner":{"pid":1,"started":null,"run":"0"}');
    expect(existsSync(join(root, 'docs/archive'))).toBe(false);
  });

  it('[AC:spec-30-2] namedFiles lists the full path, split segments and the dated name, not look-alikes; marks only a non-test migration', () => {
    const root = fixture({ folder: dated, extra: {
      'tests/split.test.ts': `import { join } from 'node:path';\nconst at = join('docs', 'features', '${dated}');\n`,
      'tests/relative.test.ts': `const brief = join(features, "${dated}/brief.md");\n`,
      'tests/migrations/x.test.ts': `// fixture\nconst p = '${datedSource}/brief.md';\n`,
      'db/migrations/0002.sql': `-- seeded from ${datedSource}/brief.md\n`,
      'scripts/old.mjs': `export const a = '${datedSource}.old';\nexport const b = '${dated}.old';\n`,
      'scripts/two.mjs': `export const a = '${datedSource}-two';\nexport const b = '${dated}-two';\n`,
      'scripts/nested.mjs': `export const a = 'packages/app/${datedSource}';\nexport const b = 'packages/app/${datedSource}/brief.md';\n`,
    } });
    expect(listed(root)).toEqual([
      { path: 'tests/migrations/x.test.ts', line: 2, text: `const p = '${datedSource}/brief.md';`, test: true },
      { path: 'tests/relative.test.ts', line: 1, text: `const brief = join(features, "${dated}/brief.md");`, test: true },
      { path: 'tests/split.test.ts', line: 2, text: `const at = join('docs', 'features', '${dated}');`, test: true },
      { path: 'tests/two-tier.test.mjs', line: 3, text: `const brief = readFileSync('${datedSource}/brief.md', 'utf8');`, test: true },
      { path: 'db/migrations/0002.sql', line: 1, text: `-- seeded from ${datedSource}/brief.md`, test: false, migration: true },
      { path: 'scripts/x.mjs', line: 1, text: `export const folder = '${datedSource}';`, test: false },
    ]);
    // An undated name is matched by its full path only.
    const undated = fixture({ extra: { 'tests/split.test.ts': "const at = join('docs', 'features', 'x');\nconst b = 'x/brief.md';\n" } });
    expect(listed(undated).map((file: { path: string }) => file.path)).toEqual(['tests/two-tier.test.mjs', 'scripts/x.mjs']);
  });

  it('[AC:spec-30-3] --apply moves as 1.8.1 does, edits nothing outside the docs root, and names each listed test in next', () => {
    const root = fixture({ extra: { 'tests/other.test.mjs': `// a\n// b\nconst p = '${source}';\n` } });
    const result = archive(root, '--apply');
    expect(result.status, result.stderr).toBe(0);
    expect(result.output.status).toBe('archived');
    expect(existsSync(join(root, 'docs/archive/x/feature/brief.md'))).toBe(true);
    expect(existsSync(join(root, source))).toBe(false);
    const changed = git(root, 'status', '--porcelain', '--untracked-files=all').split('\n').map(line => line.replace(/^\s*\S+\s+/, ''));
    expect(changed.length).toBeGreaterThan(0);
    for (const file of changed) expect(file.startsWith('docs/'), file).toBe(true);
    expect(readFileSync(join(root, 'tests/two-tier.test.mjs'), 'utf8')).toBe(briefTest(source));
    const next: string = result.output.next;
    expect(next).toMatch(/^2 tests still name `docs\/features\/x`/);
    expect(next).toContain('`tests/other.test.mjs:3`');
    expect(next).toContain('`tests/two-tier.test.mjs:3`');
    expect(next).toContain('run the gate');
    expect(next).toContain('commit');
  });

  it('[AC:spec-30-4] --rewrite is an unknown argument, and neither a preview nor an --apply writes under .joycraft/local', () => {
    const attest = '.attest/attest.json';
    const root = fixture({ attest });
    const refused = run(root, ['--apply', '--rewrite', 'tests/a.test.ts'], { attest });
    expect(refused.status).toBe(2);
    expect(refused.stderr).toMatch(/Unknown argument: --rewrite/);
    expect(existsSync(join(root, source, 'brief.md'))).toBe(true);
    expect(existsSync(join(root, 'docs/archive'))).toBe(false);
    expect(run(root, [], { attest }).status).toBe(0);
    const applied = run(root, ['--apply'], { attest });
    expect(applied.output?.status, applied.stderr).toBe('archived');
    expect(existsSync(join(root, '.joycraft/local'))).toBe(false);
    expect(readFileSync(runtime, 'utf8')).not.toMatch(/archive-pending|--rewrite|recoverPending/);
  });
});

describe('archive list follow-ups (spec 32)', () => {
  it('[AC:spec-32-1] namedFiles lists the }/, ../, ../../ and features/<slug>/ forms and none of the five look-alikes', () => {
    const root = fixture({ folder: dated, extra: {
      'tests/root.test.ts': `const p = \`\${root}/${datedSource}/x\`;\n`,
      'tests/up.test.ts': `const p = '../${datedSource}/x';\n`,
      'tests/up-two.test.ts': `const p = '../../${datedSource}';\n`,
      'tests/home.test.ts': `const p = 'features/${dated}/brief.md';\n`,
      'scripts/nested.mjs': `export const p = 'packages/app/${datedSource}/brief.md';\n`,
      'scripts/old.mjs': `export const p = '${datedSource}.old';\n`,
      'scripts/two.mjs': `export const p = '${datedSource}-two';\n`,
      'scripts/before.mjs': `export const p = 'x${dated}/brief.md';\n`,
      'scripts/after.mjs': `export const p = '${dated}x/brief.md';\n`,
    } });
    const paths = listed(root).map((file: { path: string }) => file.path);
    for (const file of ['tests/root.test.ts', 'tests/up.test.ts', 'tests/up-two.test.ts', 'tests/home.test.ts']) expect(paths, file).toContain(file);
    for (const file of ['scripts/nested.mjs', 'scripts/old.mjs', 'scripts/two.mjs', 'scripts/before.mjs', 'scripts/after.mjs']) expect(paths, file).not.toContain(file);
  });
});

// A preload that runs a whole second plain --apply inside this one at one point: when this run
// checks for the destination again ('check'), or right before it moves the folder ('stage').
const preloadHome = realpathSync(mkdtempSync(join(tmpdir(), 'jc-archive-race-')));
afterAll(() => rmSync(preloadHome, { recursive: true, force: true }));
const preload = join(preloadHome, 'race.mjs');
writeFileSync(preload, `import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
const at = process.env.JC_RACE_AT;
if (at) {
  const env = { ...process.env }; delete env.NODE_OPTIONS; delete env.JC_RACE_AT;
  let done = false, checks = 0;
  const other = () => { done = true; fs.writeFileSync(process.env.JC_RACE_OUT, execFileSync(process.execPath, process.argv.slice(1), { env, encoding: 'utf8' })); };
  const rename = fs.renameSync, exists = fs.existsSync;
  fs.renameSync = function (from, to) { if (!done && at === 'stage' && String(to).includes('.staging-') && String(from).endsWith('/docs/features/x')) other(); return rename.apply(this, arguments); };
  fs.existsSync = function (file) { if (!done && at === 'check' && String(file).endsWith('/docs/archive/x') && ++checks === 2) other(); return exists.apply(this, arguments); };
  syncBuiltinESMExports();
}
`);

describe('archive owner check of spec 13', () => {
  for (const at of ['check', 'stage']) {
    it(`[owner-check-n1] [AC:spec-30-5] [AC:spec-32-2] two plain applies of one feature: one archives, the other exits 2 with no manual step and no stage folder (${at})`, () => {
      const root = fixture();
      const out = join(root, '.joycraft/local/other.json');
      const loser = run(root, ['--apply'], { env: { NODE_OPTIONS: `--import=${preload}`, JC_RACE_AT: at, JC_RACE_OUT: out } });
      expect(JSON.parse(readFileSync(out, 'utf8'))).toMatchObject({ status: 'archived' });
      expect(loser.status, loser.stderr).toBe(2);
      expect(loser.stderr).toContain('changed nothing');
      expect(loser.stderr).toContain('is gone');
      expect(loser.stderr).not.toMatch(/manually/);
      expect(readdirSync(join(root, 'docs/archive'))).toEqual(['x']);
      expect(existsSync(join(root, 'docs/archive/x/feature/brief.md'))).toBe(true);
      expect(existsSync(join(root, source))).toBe(false);
      const later = archive(root);
      expect(later.status, later.stderr).toBe(0);
      expect(later.output).toMatchObject({ status: 'archived', unchanged: true });
    });
  }

  it('[AC:spec-1-5] next names only tests that name the folder outside a comment, at that line; namedFiles matches the preview', () => {
    const spec = `// Spec: ${source}/specs/01-a.md\n`;
    const check = (extra: Record<string, string>) => {
      const root = fixture({ extra });
      // The fixture's own two-tier test names the folder in code; drop it so only `extra` counts.
      rmSync(join(root, 'tests/two-tier.test.mjs')); git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'only extra');
      const preview = listed(root);
      const result = archive(root, '--apply');
      expect(result.status, result.stderr).toBe(0);
      return { preview, next: result.output.next as string, root };
    };
    // (a) two tests that name the folder only in `// Spec:` lines.
    const a = check({ 'tests/a.test.ts': spec, 'tests/b.test.ts': `${spec}import x from 'y';\n` });
    expect(a.next).toContain('no path change looks needed');
    expect(a.next).not.toContain('Change the folder path');
    expect(a.preview.filter((file: { test: boolean }) => file.test).map((file: { path: string }) => file.path)).toEqual(['tests/a.test.ts', 'tests/b.test.ts']);
    // (b) one comment-only test plus one whose path sits in a string.
    const b = check({ 'tests/a.test.ts': spec, 'tests/c.test.ts': `import x from 'y';\nconst at = '${source}/brief.md';\n` });
    expect(b.next).toMatch(/^1 test still names `docs\/features\/x`: `tests\/c\.test\.ts:2`\./);
    expect(b.next).not.toContain('tests/a.test.ts');
    // (c) a `// Spec:` line 1 and a string path at line 9.
    const c = check({ 'tests/d.test.ts': `${spec}${'// more\n'.repeat(7)}const at = '${source}/brief.md';\n` });
    expect(c.next).toContain('`tests/d.test.ts:9`');
    expect(c.next).not.toContain('tests/d.test.ts:1`');
    for (const { preview } of [a, b, c]) {
      const named = preview.find((file: { path: string }) => file.path.startsWith('tests/'));
      expect(named.line).toBe(1);
      expect(named.text).toBe(spec.trim());
    }
  });

  /** After a real --apply with only `extra` as tests: the `next` message. */
  const nextAfterApply = (extra: Record<string, string>) => {
    const root = fixture({ extra });
    rmSync(join(root, 'tests/two-tier.test.mjs')); git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'only extra');
    const result = archive(root, '--apply');
    expect(result.status, result.stderr).toBe(0);
    expect(existsSync(join(root, source))).toBe(false);
    return result.output.next as string;
  };

  it('[AC:spec-9-1] only sure comments are comment-only; a closed /* */ before code, a .ts #field and a bare * line are code', () => {
    const code: [string, string][] = [
      ['tests/p1.test.ts', `/* x */ const p = '${source}/a';\n`],
      ['tests/p2.test.ts', `class A {\n  #dir = '${source}';\n}\n`],
      ['tests/p3.test.ts', `const md = \`\n* [b](${source}/c.md)\n\`;\nexport { md };\n`],
    ];
    for (const [file, body] of code) {
      const lineNo = body.split('\n').findIndex(each => each.includes(source)) + 1;
      const next = nextAfterApply({ [file]: body });
      expect(next, file).toMatch(/^1 test still names/);
      expect(next, file).toContain(`\`${file}:${lineNo}\``);
    }
    const comments: Record<string, string> = {
      'tests/test_q1.py': `# ${source}\nimport os\n# see ${source}/brief.md\n`,
      'tests/q2.test.ts': `// Spec: ${source}/x.md\nexport {};\n`,
      'tests/q3.test.ts': `/**\n * Reads nothing; documented in\n * ${source}/brief.md\n */\nexport {};\n`,
    };
    for (const [file, body] of Object.entries(comments)) {
      const next = nextAfterApply({ [file]: body });
      expect(next, file).toContain('only in comments');
      expect(next, file).not.toContain('still name');
    }
    const all = nextAfterApply(comments);
    expect(all).toContain('only in comments');
    expect(all).not.toContain('still name');
  });

  it('[AC:spec-9-2] when every listed test names the folder only in comments, next says to run the gate', () => {
    const next = nextAfterApply({ 'tests/a.test.ts': `// Spec: ${source}/specs/01-a.md\n`, 'tests/test_b.py': `# ${source}\n` });
    expect(next).toContain('no path change looks needed');
    expect(next).toContain('run the gate');
    expect(next).not.toContain('Leave their paths as they are');
  });
});

// Spec: docs/features/2026-11-22-followups-1-9-2/specs/04-archive-lines.md
describe('archive reads every line ending (1.9.2 spec 4)', () => {
  it('[AC:spec-4-2] a CR-only test file gets real line numbers and its comment line counts as a comment; LF, CRLF, U+2028 and U+2029 agree', () => {
    const lines = ["import x from 'y';", 'export { x };', `// Spec: ${source}/specs/01.md`, 'export const n = 1;'];
    const entry = (ending: string) => {
      const root = fixture({ extra: { 'tests/e.test.ts': lines.join(ending) + ending } });
      rmSync(join(root, 'tests/two-tier.test.mjs')); git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'only e');
      const named = listed(root).filter((file: { path: string }) => file.path === 'tests/e.test.ts');
      const result = archive(root, '--apply');
      expect(result.status, result.stderr).toBe(0);
      return { named, next: result.output.next as string };
    };
    const expected = [{ path: 'tests/e.test.ts', line: 3, text: lines[2], test: true }];
    for (const ending of ['\r', '\n', '\r\n', ' ', ' ']) {
      const { named, next } = entry(ending);
      expect(named, JSON.stringify(ending)).toEqual(expected);
      expect(next, JSON.stringify(ending)).toContain('only in comments');
      expect(next, JSON.stringify(ending)).not.toContain('still name');
    }
  });
});
