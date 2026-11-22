import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// Spec: docs/features/2026-11-21-drift-tidy/specs/04-tidy-verify.md
const cleanup = join(__dirname, '..', 'payload', '.joycraft', 'runtime', 'cleanup.mjs');
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (root: string, file: string, body: string) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), body); };
const save = (root: string, message: string) => { git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', message); };
const verify = (root: string) => {
  try { return { status: 0, json: JSON.parse(execFileSync('node', [cleanup, 'tidy', '--verify'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })) }; }
  catch (error) { const e = error as { status: number; stdout: string }; return { status: e.status, json: JSON.parse(e.stdout) }; }
};

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

const guide = '# Guide\n\nThe widget loader.\n\nCall `getWidget()` to load one.\n';

/** The gone-symbol fixture: the branch removes getWidget; the guide still names it at line 5. */
function fixture(extra: (root: string) => void = () => {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-verify-')));
  dirs.push(root);
  git(root, 'init', '-q', '-b', 'main');
  put(root, 'src/widget.ts', 'export function getWidget() {\n  return 1;\n}\nexport const keep = 2;\n');
  put(root, 'docs/context/guide.md', guide);
  put(root, 'docs/context/other.md', '# Other\n');
  put(root, 'AGENTS.md', '# A\n\n[guide](docs/context/guide.md)\n[other](docs/context/other.md)\n');
  extra(root);
  save(root, 'init');
  git(root, 'checkout', '-q', '-b', 'feature');
  put(root, 'src/widget.ts', 'export const keep = 2;\n');
  save(root, 'remove getWidget');
  return root;
}
const fixLine = (root: string) => put(root, 'docs/context/guide.md', guide.replace('Call `getWidget()` to load one.', 'Read `keep` for the value.'));

describe('tidy --verify', () => {
  it('[AC:spec-4-1] after the named line is fixed, the finding is gone and verify exits 0', () => {
    const root = fixture();
    fixLine(root);
    const out = verify(root);
    expect(out.status).toBe(0);
    expect(out.json.status).toBe('pass');
    expect(out.json.remaining.filter((item: { symbol?: string }) => item.symbol === 'getWidget')).toHaveLength(0);
    expect(out.json.cleared).toBe(1);
  });

  it('[AC:spec-4-2] an edit to AGENTS.md is refused, naming it, with no message', () => {
    const root = fixture();
    fixLine(root);
    put(root, 'AGENTS.md', '# A changed\n\n[guide](docs/context/guide.md)\n[other](docs/context/other.md)\n');
    const out = verify(root);
    expect(out.status).not.toBe(0);
    expect(out.json.refused.map((item: { path: string }) => item.path)).toEqual(['AGENTS.md']);
    expect(out.json.message).toBeNull();
  });

  it('[AC:spec-4-2] an edit to an unlisted context page is refused, naming it', () => {
    const root = fixture();
    fixLine(root);
    put(root, 'docs/context/other.md', '# Other, edited\n');
    const out = verify(root);
    expect(out.status).not.toBe(0);
    expect(out.json.refused.map((item: { path: string }) => item.path)).toEqual(['docs/context/other.md']);
    expect(out.json.message).toBeNull();
  });

  it('[AC:spec-4-2] an edit to an unnamed line of a named page is refused', () => {
    const root = fixture();
    put(root, 'docs/context/guide.md', guide.replace('The widget loader.', 'The loader.'));
    const out = verify(root);
    expect(out.status).not.toBe(0);
    expect(out.json.refused).toMatchObject([{ path: 'docs/context/guide.md', line: 3 }]);
  });

  it('[AC:spec-4-3] a pass prints the subject and the Joycraft-Tidy trailer; no edits prints nothing to commit', () => {
    const root = fixture();
    expect(verify(root).json).toMatchObject({ status: 'clean', message: null });
    fixLine(root);
    const base = git(root, 'merge-base', 'main', 'HEAD');
    const head = git(root, 'rev-parse', 'HEAD');
    const { message } = verify(root).json;
    expect(message.split('\n')[0]).toBe(`docs: tidy 1 doc line after ${head.slice(0, 7)}`);
    expect(message).toContain(`\n\nJoycraft-Tidy: ${base}..${head}`);
  });
});

describe('tidy --verify review fixes', () => {
  const refusedPaths = (out: { json: { refused: { path: string }[] } }) => out.json.refused.map(item => item.path);

  it('[review-a-3] a hunk that replaces the named line and adds lines after it is refused', () => {
    const root = fixture();
    put(root, 'docs/context/guide.md', guide.replace('Call `getWidget()` to load one.', 'Read `keep` for the value.\nAlso a new paragraph.\nAnd another.'));
    const out = verify(root);
    expect(out.status).not.toBe(0);
    expect(out.json.refused).toMatchObject([{ path: 'docs/context/guide.md', line: 5 }]);
    expect(out.json.message).toBeNull();
  });

  it('[review-a-3] an untracked file is refused', () => {
    const root = fixture();
    fixLine(root);
    put(root, 'docs/context/new.md', '# New\n');
    const out = verify(root);
    expect(out.status).not.toBe(0);
    expect(refusedPaths(out)).toEqual(['docs/context/new.md']);
    expect(out.json.message).toBeNull();
  });

  it('[review-a-3] a staged edit that the working tree hides is refused', () => {
    const root = fixture();
    put(root, 'docs/context/other.md', '# Other, staged\n');
    git(root, 'add', 'docs/context/other.md');
    put(root, 'docs/context/other.md', '# Other\n');
    fixLine(root);
    const out = verify(root);
    expect(out.status).not.toBe(0);
    expect(refusedPaths(out)).toEqual(['docs/context/other.md']);
    expect(out.json.message).toBeNull();
  });

  it('[review-a-3] an edit to the named line that still names the gone symbol is refused', () => {
    const root = fixture();
    put(root, 'docs/context/guide.md', guide.replace('Call `getWidget()` to load one.', 'Call `getWidget()` to load a widget.'));
    const out = verify(root);
    expect(out.status).not.toBe(0);
    expect(out.json.refused).toMatchObject([{ path: 'docs/context/guide.md', line: 5 }]);
    expect(out.json.message).toBeNull();
  });
});

describe('tidy --verify review-4 fixes', () => {
  const rewrite = '# Rewritten\n\nNew rule: push to main.\nMore.\n';
  const refusedAt = (out: { status: number; json: { refused: { path: string }[]; message: unknown; status: string } }, file: string) => {
    expect(out.status).not.toBe(0);
    expect(out.json.status).toBe('refused');
    expect(out.json.refused.map(item => item.path)).toContain(file);
    expect(out.json.message).toBeNull();
  };
  const cases: [string, (root: string) => void, ((root: string) => void)?][] = [
    ['a page with a NUL byte', root => put(root, 'docs/context/guide.md', `# Rewritten\0\n${rewrite}`)],
    ['.git/info/attributes *.md binary', root => { put(root, '.git/info/attributes', '*.md binary\n'); put(root, 'docs/context/guide.md', rewrite); }],
    ['a textconv driver', root => { put(root, '.git/info/attributes', '*.md diff=x\n'); git(root, 'config', 'diff.x.textconv', 'true'); put(root, 'docs/context/guide.md', rewrite); }],
    ['a committed .gitattributes *.md -diff', root => put(root, 'docs/context/guide.md', rewrite), root => put(root, '.gitattributes', '*.md -diff\n')],
    ['a mode-only change of the named page', root => chmodSync(join(root, 'docs/context/guide.md'), 0o755)],
    ['a mode change with the valid fix', root => { fixLine(root); chmodSync(join(root, 'docs/context/guide.md'), 0o755); }],
  ];
  for (const [name, edit, extra] of cases) {
    it(`[review-4-1] a named page rewritten past the hunk reader is refused: ${name}`, () => {
      const root = fixture(extra);
      edit(root);
      refusedAt(verify(root), 'docs/context/guide.md');
    });
  }

  it('[review-4-1] a pass never prints "tidy 0 doc lines"', () => {
    const root = fixture();
    chmodSync(join(root, 'docs/context/guide.md'), 0o755);
    expect(verify(root).json.message ?? '').not.toContain('tidy 0 doc lines');
  });

  it('[review-4-2] AGENTS.override.md is an entry file: its edit is refused', () => {
    const root = fixture(r => put(r, 'docs/context/AGENTS.override.md', '# Override\n\nUse `getWidget()`.\n'));
    put(root, 'docs/context/AGENTS.override.md', '# Override\n\nUse `keep`.\n');
    refusedAt(verify(root), 'docs/context/AGENTS.override.md');
  });

  it('[review-4-3] an index that holds part of the change is refused; a fully staged fix passes', () => {
    const root = fixture();
    put(root, 'docs/context/guide.md', guide.replace('to load one.', 'to load two.'));
    git(root, 'add', 'docs/context/guide.md');
    fixLine(root);
    const out = verify(root);
    refusedAt(out, 'docs/context/guide.md');
    expect(JSON.stringify(out.json.refused)).toMatch(/stage the whole fix/);
    git(root, 'add', 'docs/context/guide.md');
    expect(verify(root)).toMatchObject({ status: 0, json: { status: 'pass', cleared: 1 } });
  });

  for (const [name, line] of [['a space inside the backticks', 'Call `getWidget ()` to load one.'], ['no backticks', 'Call getWidget() to load one.'], ['inner spaces', 'Call `get Widget()` to load one.']]) {
    it(`[review-4-4] a named line that still names the gone symbol is refused: ${name}`, () => {
      const root = fixture();
      put(root, 'docs/context/guide.md', guide.replace('Call `getWidget()` to load one.', line));
      const out = verify(root);
      refusedAt(out, 'docs/context/guide.md');
      expect(JSON.stringify(out.json.refused)).toMatch(/still names getWidget/);
    });
  }

  for (const bit of ['--assume-unchanged', '--skip-worktree']) {
    it(`[review-4-5] an entry file with ${bit} is refused`, () => {
      const root = fixture();
      fixLine(root);
      git(root, 'update-index', bit, 'AGENTS.md');
      put(root, 'AGENTS.md', '# A hidden edit\n');
      refusedAt(verify(root), 'AGENTS.md');
    });
  }
});

describe('tidy --verify review-4-r2 fixes: the diff is read line by line', () => {
  const refusedFor = (out: { status: number; json: { status: string; refused: { path: string; line?: number; reason: string }[]; message: unknown } }, line: number, reason: RegExp) => {
    expect(out.status).not.toBe(0);
    expect(out.json.status).toBe('refused');
    expect(out.json.refused).toMatchObject([{ path: 'docs/context/guide.md', line }]);
    expect(out.json.refused[0].reason).toMatch(reason);
    expect(out.json.message).toBeNull();
  };
  const crlf = (text: string) => text.replace(/\n/g, '\r\n');
  const ls = ' ';

  it('[review-4-r2-1] LS1: a U+2028 funcname context does not hide an edit to an unnamed line', () => {
    const page = `# Guide\n\nThe widget loader.\n\nCall \`getWidget()\` to load one.\nNote${ls}line.\nOld policy: ask before pushing.\n`;
    const root = fixture(r => put(r, 'docs/context/guide.md', page));
    put(root, 'docs/context/guide.md', page.replace('Call `getWidget()` to load one.', 'Read `keep` for the value.').replace('Old policy: ask before pushing.', 'New policy: push to main.'));
    refusedFor(verify(root), 7, /no finding names/);
  });

  it('[review-4-r2-2] LS2: a named line that still names the gone symbol after U+2028 is refused', () => {
    const root = fixture();
    put(root, 'docs/context/guide.md', guide.replace('Call `getWidget()` to load one.', `Read \`keep\`.${ls}Call getWidget() still.`));
    refusedFor(verify(root), 5, /still names getWidget/);
  });

  for (const [tag, line] of [['CR2', 'Call getWidget() to load one.'], ['CR3', 'Call `getWidget ()` to load one.']]) {
    it(`[review-4-r2-3] ${tag}: on a CRLF page a named line that still names the gone symbol is refused`, () => {
      const root = fixture(r => put(r, 'docs/context/guide.md', crlf(guide)));
      put(root, 'docs/context/guide.md', crlf(guide.replace('Call `getWidget()` to load one.', line)));
      refusedFor(verify(root), 5, /still names getWidget/);
    });
  }

  it('[review-4-r2-4] a valid fix on a CRLF page and on a page with U+2028 still passes', () => {
    for (const page of [crlf(guide), guide.replace('The widget loader.', `The widget${ls}loader.`)]) {
      const root = fixture(r => put(r, 'docs/context/guide.md', page));
      put(root, 'docs/context/guide.md', page.replace('Call `getWidget()` to load one.', 'Read `keep` for the value.'));
      expect(verify(root)).toMatchObject({ status: 0, json: { status: 'pass', cleared: 1 } });
    }
  });

  it('[review-4-r2-5] a diff whose hunk counts, headers or line kinds do not match is refused', async () => {
    const { parseDiff } = await import(cleanup);
    const head = 'diff --git a/docs/context/guide.md b/docs/context/guide.md\nindex 1111111..2222222 100644\n--- a/docs/context/guide.md\n+++ b/docs/context/guide.md\n';
    expect(parseDiff(`${head}@@ -5 +5 @@ Note${ls}x\n-old\r\n+new\r\n`)).toMatchObject({ hunks: [{ start: 5, count: 1, removed: ['old'], added: ['new'] }] });
    expect(parseDiff(`${head}@@ -5 +5 @@\n-old\n`).error).toMatch(/fewer lines/);
    expect(parseDiff(`${head}@@ -5 +5 @@\n-old\n+new\n+more\n`).error).toMatch(/Git does not print|more added/);
    expect(parseDiff(`${head}@@ -5,2 +5 @@\n-old\n+new\n-late\n`).error).toBeUndefined();
    expect(parseDiff(`${head}@@ -5 +5 @@\n-old\nstray text\n+new\n`).error).toMatch(/Git does not print/);
    expect(parseDiff(`${head}@@ -x +5 @@\n-old\n+new\n`).error).toMatch(/header Git did not write/);
    expect(parseDiff(`${head}@@ -5 +5 @@\n-old\n+new\n${head}@@ -7 +7 @@\n-a\n+b\n`).error).toMatch(/outside one file header/);
    expect(parseDiff(`@@ -5 +5 @@\n-old\n+new\n`).error).toMatch(/header Git did not write/);
  });
});

describe('tidy --verify ignores the user diff environment (spec 27)', () => {
  it('[AC:spec-27-15] with GIT_DIFF_OPTS=--unified=5 set, verify accepts the valid fix as without it', () => {
    const root = fixture();
    fixLine(root);
    let status = 0; let stdout = '';
    try { stdout = execFileSync('node', [cleanup, 'tidy', '--verify'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GIT_DIFF_OPTS: '--unified=5', GIT_EXTERNAL_DIFF: 'false' } }); }
    catch (error) { const e = error as { status: number; stdout: string }; status = e.status; stdout = e.stdout; }
    expect(status, stdout).toBe(0);
    expect(JSON.parse(stdout).status).toBe('pass');
  });
});
