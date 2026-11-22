import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const script = join(__dirname, '..', 'payload', '.joycraft', 'runtime', 'evidence.mjs');
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const code = 'console.log(process.env.WORKERS, process.env.CI)';
const run = (cwd: string, receipt: string) => spawnSync(process.execPath, [script, 'run', '--receipt', receipt, '--', process.execPath, '-e', code], { cwd, encoding: 'utf8' });
const map = '.joycraft/local/evidence-env.json';

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function project(body?: string) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-evidence-env-')));
  dirs.push(root);
  writeFileSync(join(root, '.gitignore'), 'receipts/\n.joycraft/local/\n');
  git(root, 'init', '-q');
  git(root, 'add', '.');
  git(root, 'commit', '-q', '-m', 'init');
  if (body !== undefined) { mkdirSync(join(root, '.joycraft/local'), { recursive: true }); writeFileSync(join(root, map), body); }
  return root;
}
const footer = (root: string, receipt: string) => JSON.parse(readFileSync(join(root, receipt), 'utf8').trimEnd().split('\n').at(-1)!.replace(/^joycraft-evidence: /, ''));

describe('evidence.mjs machine-local environment map', () => {
  it('[AC:spec-12-1] passes the map to the child, CI wins, and lists the applied names', () => {
    const root = project(JSON.stringify({ WORKERS: '3', CI: '0' }));
    const result = run(root, 'receipts/a.log');
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(join(root, 'receipts/a.log'), 'utf8').split('\n')[0]).toBe('3 1');
    expect(JSON.parse(result.stdout).env).toEqual(['WORKERS']);
    expect(footer(root, 'receipts/a.log').env).toEqual(['WORKERS']);
  });

  it('[AC:spec-12-2] a malformed map or a tracked map refuses with exit 2 naming the file; no map runs as before', () => {
    for (const body of ['["WORKERS"]', '{"WORKERS": 3}', '{not json']) {
      const root = project(body);
      const result = run(root, 'receipts/a.log');
      expect(result.status, body).toBe(2);
      expect(result.stderr).toContain(map);
      expect(result.stdout).toBe('');
    }
    const tracked = project(JSON.stringify({ WORKERS: '3' }));
    git(tracked, 'add', '-f', map);
    git(tracked, 'commit', '-q', '-m', 'track the map');
    const refused = run(tracked, 'receipts/a.log');
    expect(refused.status).toBe(2);
    expect(refused.stderr).toContain('must stay machine-local');

    const none = project();
    const plain = run(none, 'receipts/a.log');
    expect(plain.status).toBe(0);
    expect(JSON.parse(plain.stdout)).not.toHaveProperty('env');
    expect(readFileSync(join(none, 'receipts/a.log'), 'utf8').split('\n')[0]).toBe('undefined 1');
  });
});

describe('evidence.mjs environment map checks (spec 27)', () => {
  it('[AC:spec-27-9] refuses bad names and NULs, never applies CI or JOYCRAFT_EVIDENCE in any case, and needs an ignored map', () => {
    for (const body of [JSON.stringify({ '': '1' }), JSON.stringify({ 'A=B': '1' }), JSON.stringify({ A: 'x\u0000y' })]) {
      const result = run(project(body), 'receipts/a.log');
      expect(result.status, body).toBe(2);
      expect(result.stderr).toContain(map);
    }
    const cased = project(JSON.stringify({ ci: '0', W: '3', joycraft_evidence: '0' }));
    const ran = spawnSync(process.execPath, [script, 'run', '--receipt', 'receipts/a.log', '--', process.execPath, '-e', 'console.log(process.env.ci, process.env.joycraft_evidence)'], { cwd: cased, encoding: 'utf8' });
    expect(ran.status, ran.stderr).toBe(0);
    expect(JSON.parse(ran.stdout).env).toEqual(['W']);
    if (process.platform !== 'win32') expect(readFileSync(join(cased, 'receipts/a.log'), 'utf8').split('\n')[0]).toBe('undefined undefined');

    const unignored = project(JSON.stringify({ W: '3' }));
    writeFileSync(join(unignored, '.gitignore'), 'receipts/\n');
    const refused = run(unignored, 'receipts/a.log');
    expect(refused.status).toBe(2);
    expect(refused.stderr).toContain('must be git-ignored');
    writeFileSync(join(unignored, '.gitignore'), 'receipts/\n.joycraft/local/\n');
    expect(run(unignored, 'receipts/b.log').status).toBe(0);
  });
});
