import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const script = join(__dirname, '..', 'payload', '.joycraft', 'runtime', 'evidence.mjs');
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const run = (cwd: string, receipt: string, code: string) => spawnSync(process.execPath, [script, 'run', '--receipt', receipt, '--', process.execPath, '-e', code], { cwd, encoding: 'utf8' });

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function project() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-evidence-facts-')));
  dirs.push(root);
  mkdirSync(join(root, 'docs/features/x'), { recursive: true });
  writeFileSync(join(root, 'docs/features/x/spec.md'), 'spec\n');
  writeFileSync(join(root, '.gitignore'), 'receipts/\n');
  git(root, 'init', '-q');
  git(root, 'add', '.');
  git(root, 'commit', '-q', '-m', 'init');
  return root;
}
const lines = (root: string, receipt: string) => readFileSync(join(root, receipt), 'utf8').replace(/\n$/, '').split('\n');
const footer = (root: string, receipt: string) => {
  const last = lines(root, receipt).at(-1)!;
  expect(last.startsWith('joycraft-evidence: ')).toBe(true);
  return JSON.parse(last.slice('joycraft-evidence: '.length));
};
const envCode = 'console.log(process.env.CI, process.env.JOYCRAFT_EVIDENCE)';

describe('evidence.mjs run facts', () => {
  it('[AC:spec-3-1] the child sees CI=1 and JOYCRAFT_EVIDENCE=1', () => {
    const root = project();
    const result = run(root, 'receipts/a.log', envCode);
    expect(result.status).toBe(0);
    expect(lines(root, 'receipts/a.log')[0]).toBe('1 1');
  });

  it('[AC:spec-3-2] the printed result carries wallMs, load, cores and loaded', () => {
    const root = project();
    const { facts } = JSON.parse(run(root, 'receipts/a.log', envCode).stdout);
    expect(Object.keys(facts).sort()).toEqual(['cores', 'load', 'loaded', 'wallMs']);
    expect(facts.cores).toBe(availableParallelism());
    expect(Number.isInteger(facts.wallMs) && facts.wallMs >= 0).toBe(true);
    if (process.platform === 'win32') {
      expect(facts.load).toBeNull();
      expect(facts.loaded).toBeNull();
    } else {
      expect(facts.load).toHaveLength(2);
      expect(facts.loaded).toBe(facts.load[0] > facts.cores);
    }
  });

  it('[AC:spec-3-3] the receipt ends with one footer line that the printed sha256 covers', () => {
    const root = project();
    const head = git(root, 'rev-parse', 'HEAD');
    const result = JSON.parse(run(root, 'receipts/a.log', envCode).stdout);
    const value = footer(root, 'receipts/a.log');
    expect(value).toMatchObject({ ...result.facts, argv: result.command.argv, exitCode: 0, revision: head, dirty: false });
    expect(lines(root, 'receipts/a.log').filter(line => line.startsWith('joycraft-evidence: '))).toHaveLength(1);
    const bytes = readFileSync(join(root, 'receipts/a.log'));
    expect(result.receipts[0].sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
  });

  it('[AC:spec-3-4] a failing run prints the last 40 output lines as tail; a passing run has none', () => {
    const root = project();
    const failing = run(root, 'receipts/fail.log', 'for (let i = 1; i <= 100; i++) console.log("line " + i); process.exit(3)');
    expect(failing.status).toBe(1);
    const { tail, command } = JSON.parse(failing.stdout);
    expect(command.exitCode).toBe(3);
    const tailLines = tail.split('\n');
    expect(tailLines).toHaveLength(40);
    expect(tailLines[0]).toBe('line 61');
    expect(tailLines.at(-1)).toBe('line 100');
    expect(footer(root, 'receipts/fail.log').exitCode).toBe(3);
    expect(JSON.parse(run(root, 'receipts/pass.log', envCode).stdout)).not.toHaveProperty('tail');
  });

  it('[AC:spec-3-5] one run writes one receipt and no other file; exit codes are as before', () => {
    const root = project();
    expect(run(root, 'receipts/a.log', envCode).status).toBe(0);
    expect(run(root, 'receipts/b.log', 'process.exit(5)').status).toBe(1);
    expect(run(root, 'receipts/a.log', envCode).status).toBe(2);
    expect(readdirSync(join(root, 'receipts')).sort()).toEqual(['a.log', 'b.log']);
    expect(git(root, 'status', '--porcelain')).toBe('');
  });
});
