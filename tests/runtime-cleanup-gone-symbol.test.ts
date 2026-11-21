import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// Spec: docs/features/2026-11-21-drift-tidy/specs/03-gone-symbol.md
const cleanup = join(__dirname, '..', 'payload', '.joycraft', 'runtime', 'cleanup.mjs');
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (root: string, file: string, body: string) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), body); };
const save = (root: string, message: string) => { git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', message); };
const gone = (root: string) => {
  let stdout: string;
  try { stdout = execFileSync('node', [cleanup, 'tidy'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (error) { stdout = (error as { stdout: string }).stdout; }
  return JSON.parse(stdout).findings.filter((item: { check: string }) => item.check === 'gone-symbol');
};

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

/** main has the code and a guide that names it; the feature branch changes the code. */
function fixture(code: string, body: string, doc: string, page = 'docs/context/guide.md') {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-gone-')));
  dirs.push(root);
  git(root, 'init', '-q', '-b', 'main');
  put(root, code, body);
  put(root, page, doc);
  if (page !== 'AGENTS.md') put(root, 'AGENTS.md', `# A\n\n[guide](${page})\n`);
  save(root, 'init');
  git(root, 'checkout', '-q', '-b', 'feature');
  return root;
}

const guide = '# Guide\n\nThe widget loader.\n\nCall `getWidget()` to load one.\n';
const widget = 'export function getWidget() {\n  return 1;\n}\nexport const keep = 2;\n';

describe('gone-symbol', () => {
  it('[AC:spec-3-1] a name removed from code and still named in a context page is one finding at that line', () => {
    const root = fixture('src/widget.ts', widget, guide);
    put(root, 'src/widget.ts', 'export const keep = 2;\n');
    save(root, 'remove getWidget');
    const found = gone(root);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ path: 'docs/context/guide.md', line: 5, symbol: 'getWidget', fixable: true });
  });

  it('[AC:spec-3-2] a name moved to another file in the range is not reported', () => {
    const root = fixture('src/widget.ts', widget, guide);
    put(root, 'src/widget.ts', 'export const keep = 2;\n');
    put(root, 'src/loader.ts', 'export function getWidget() {\n  return 1;\n}\n');
    save(root, 'move getWidget');
    expect(gone(root)).toEqual([]);
  });

  it('[AC:spec-3-3] the same works for Python', () => {
    const root = fixture('app/widget.py', 'def get_widget():\n    return 1\n\ndef keep():\n    return 2\n', '# Guide\n\nUse `get_widget()`.\n');
    put(root, 'app/widget.py', 'def keep():\n    return 2\n');
    save(root, 'remove get_widget');
    const found = gone(root);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ path: 'docs/context/guide.md', line: 3, symbol: 'get_widget' });
  });

  it('[AC:spec-3-4] a hit in an entry file is fixable: false', () => {
    const root = fixture('src/widget.ts', widget, '# Project\n\nNever call `getWidget()` twice.\n', 'AGENTS.md');
    put(root, 'src/widget.ts', 'export const keep = 2;\n');
    save(root, 'remove getWidget');
    const found = gone(root);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ path: 'AGENTS.md', line: 3, fixable: false });
  });
});
