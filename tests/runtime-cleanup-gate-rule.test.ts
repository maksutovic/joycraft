import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const cleanup = join(__dirname, '..', 'payload', '.joycraft', 'runtime', 'cleanup.mjs');
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

const agents = [
  '# App', '',
  'Run `pnpm verify` after every change.',
  'Run `pnpm verify --watch` while you edit.', '',
  '## Commands', '',
  '| Check | Command |', '|---|---|',
  '| Project gate | pnpm verify |', '',
].join('\n');

function fixture(gate?: string) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-cleanup-gate-rule-')));
  dirs.push(root);
  git(root, 'init', '-q', '-b', 'main');
  put(join(root, 'AGENTS.md'), agents);
  if (gate) put(join(root, 'joycraft.yaml'), `tests:\n  gate: ${JSON.stringify(gate)}\n`);
  git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'init');
  return root;
}

const gateRules = (root: string) => {
  const result = spawnSync(process.execPath, [cleanup, '--root', root], { encoding: 'utf8' });
  return (JSON.parse(result.stdout).findings as Array<{ check: string; path: string; line: number; command: string }>).filter(item => item.check === 'gate-rule');
};

describe('cleanup gate-rule', () => {
  it('[AC:spec-8-1] an entry-file rule line naming the recorded gate gives exactly one finding', () => {
    const findings = gateRules(fixture('pnpm verify'));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ path: 'AGENTS.md', line: 3, command: 'pnpm verify' });
  });

  it('[AC:spec-8-2] the Commands table row gives no finding, and a project with no recorded gate is not checked', () => {
    expect(gateRules(fixture('pnpm verify')).some(item => item.line === 10)).toBe(false);
    expect(gateRules(fixture())).toEqual([]);
  });

  it('[AC:spec-8-3] --checks lists gate-rule as a report check', () => {
    const result = spawnSync(process.execPath, [cleanup, '--checks'], { encoding: 'utf8' });
    expect(result.stdout.split('\n')).toContainEqual(expect.stringMatching(/^gate-rule\treport\t/));
  });
});
