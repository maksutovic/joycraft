import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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

describe('cleanup gate-rule polish (spec 27)', () => {
  it('[AC:spec-27-1] a plain-text rule line naming the gate before a word gives one finding', () => {
    const root = fixture('pnpm verify');
    put(join(root, 'AGENTS.md'), '# App\n\n- Run pnpm verify before merging.\n- Run pnpm verify --watch while you edit.\n');
    const findings = gateRules(root);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ path: 'AGENTS.md', line: 3, command: 'pnpm verify' });
  });

  it('[review-27-1] a rule line running the gate with a file or path argument gives no finding', () => {
    const root = fixture('pnpm test');
    put(join(root, 'AGENTS.md'), '# App\n\n- Run pnpm test add.test.ts before committing.\n- Run pnpm test before merging.\n');
    const findings = gateRules(root);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ path: 'AGENTS.md', line: 4, command: 'pnpm test' });
  });

  it('[AC:spec-27-4] gate-rule --record writes cleanup.gateRule and keeps other keys; --check reads it; bad values and symlinks change nothing', () => {
    const root = fixture('pnpm verify');
    const run = (...args: string[]) => spawnSync(process.execPath, [cleanup, 'gate-rule', ...args], { cwd: root, encoding: 'utf8' });
    expect(run('--check').stdout.trim()).toBe('unset');
    const prefs = join(root, '.joycraft', 'preferences.json');
    put(prefs, '{"schemaVersion":1,"artifacts":{"pages":"local"}}');
    expect(run('--record', 'kept').status).toBe(0);
    expect(JSON.parse(readFileSync(prefs, 'utf8'))).toEqual({ schemaVersion: 1, artifacts: { pages: 'local' }, cleanup: { gateRule: 'kept' } });
    expect(run('--check').stdout.trim()).toBe('kept');
    const before = readFileSync(prefs);
    const bad = run('--record', 'maybe');
    expect(bad.status).toBe(1);
    expect(readFileSync(prefs)).toEqual(before);

    const fresh = fixture('pnpm verify');
    expect(spawnSync(process.execPath, [cleanup, 'gate-rule', '--record', 'rewritten'], { cwd: fresh, encoding: 'utf8' }).status).toBe(0);
    expect(JSON.parse(readFileSync(join(fresh, '.joycraft', 'preferences.json'), 'utf8'))).toEqual({ schemaVersion: 1, cleanup: { gateRule: 'rewritten' } });

    const linked = fixture('pnpm verify');
    const elsewhere = join(linked, 'elsewhere.json');
    put(elsewhere, '{"schemaVersion":1}');
    mkdirSync(join(linked, '.joycraft'), { recursive: true });
    symlinkSync(elsewhere, join(linked, '.joycraft', 'preferences.json'));
    const refused = spawnSync(process.execPath, [cleanup, 'gate-rule', '--record', 'kept'], { cwd: linked, encoding: 'utf8' });
    expect(refused.status).toBe(1);
    expect(readFileSync(elsewhere, 'utf8')).toBe('{"schemaVersion":1}');

    const linkedDir = fixture('pnpm verify');
    const target = join(linkedDir, 'real');
    put(join(target, 'preferences.json'), '{"schemaVersion":1}');
    symlinkSync(target, join(linkedDir, '.joycraft'));
    expect(spawnSync(process.execPath, [cleanup, 'gate-rule', '--record', 'kept'], { cwd: linkedDir, encoding: 'utf8' }).status).toBe(1);
    expect(readFileSync(join(target, 'preferences.json'), 'utf8')).toBe('{"schemaVersion":1}');
  });
});
