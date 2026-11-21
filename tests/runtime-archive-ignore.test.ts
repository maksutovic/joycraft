import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// drift-tidy spec 6: setup and update offer to hide the archive from search.
const repo = join(__dirname, '..');
const runtime = join(repo, 'payload', '.joycraft', 'runtime', 'archive.mjs');
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const ignore = (root: string, flag: string) => {
  const result = spawnSync(process.execPath, [runtime, 'ignore', flag], { cwd: root, encoding: 'utf8' });
  expect([result.status, result.stderr]).toEqual([0, '']);
  return JSON.parse(result.stdout);
};

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

function fixture(config?: string) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-archive-ignore-')));
  dirs.push(root);
  git(root, 'init', '-q', '-b', 'main');
  put(join(root, 'README.md'), 'x\n');
  if (config) put(join(root, 'joycraft.yaml'), config);
  git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'init');
  return root;
}

describe('archive.mjs ignore', () => {
  it('[AC:spec-6-1] --check reports missing on a fresh fixture; --apply adds the line once; a second --apply is byte-identical', () => {
    const root = fixture();
    const file = join(root, '.ignore');
    expect(ignore(root, '--check')).toEqual({ file: '.ignore', line: 'docs/archive/', status: 'missing' });
    expect(existsSync(file)).toBe(false);
    expect(ignore(root, '--apply').status).toBe('added');
    const once = readFileSync(file);
    expect(once.toString()).toBe('docs/archive/\n');
    expect(ignore(root, '--apply').status).toBe('present');
    expect(readFileSync(file).equals(once)).toBe(true);
    expect(ignore(root, '--check').status).toBe('present');
  });

  it('[AC:spec-6-2] a custom paths.archive in joycraft.yaml is used', () => {
    const root = fixture('paths:\n  archive: work/old\n');
    put(join(root, '.ignore'), 'node_modules/');
    expect(ignore(root, '--check')).toEqual({ file: '.ignore', line: 'work/old/', status: 'missing' });
    ignore(root, '--apply');
    expect(readFileSync(join(root, '.ignore'), 'utf8')).toBe('node_modules/\nwork/old/\n');
  });

  it('[AC:spec-6-3] setup.md and update.md each name archive.mjs ignore once', () => {
    for (const name of ['setup.md', 'update.md']) {
      const text = readFileSync(join(repo, 'payload', '.joycraft', 'references', name), 'utf8');
      expect(text.match(/archive\.mjs ignore/g), name).toHaveLength(1);
    }
  });
});
