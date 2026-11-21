import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import installInventory from '../src/data/install-inventory.json';
import { applyInstall, planInstall, readManifest, recoverInstall } from '../src/install-v1.js';
import { detectGuard, GUARD_LIST, GUARD_SCRIPT, withoutGuard } from '../src/legacy-guard.js';
import { migrateLegacy, planLegacy } from '../src/legacy-07.js';
import { applyRollback, planRollback } from '../src/rollback.js';
import { sha256 } from '../src/payload.js';

// Feature legacy-guard-retire, spec 1: update and migrate ask the owner to
// remove or keep the 0.7 shell guard.
const repo = join(__dirname, '..');
// Its own build folder, so it never races the other CLI test files' builds.
const cli = join(repo, '.test-dist-guard/cli.js');
const dirs: string[] = [];
// The stock 0.7 guard, as published 0.7.17 wrote it into a project.
const fixture017 = join(repo, 'tests/fixtures/v07/0.7.17.tar.gz');
let stockScript = '';
let stockList = '';

beforeAll(() => {
  execFileSync(join(repo, 'node_modules/.bin/tsup'), ['src/cli.ts', '--format', 'esm', '--platform', 'node', '--out-dir', '.test-dist-guard', '--no-config'], { cwd: repo, stdio: 'ignore' });
  stockScript = execFileSync('tar', ['-xzOf', fixture017, `./${GUARD_SCRIPT}`], { encoding: 'utf8' });
  stockList = execFileSync('tar', ['-xzOf', fixture017, `./${GUARD_LIST}`], { encoding: 'utf8' });
}, 120000);
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

const run = (dir: string, ...args: string[]) => spawnSync(process.execPath, [cli, ...args], { cwd: dir, encoding: 'utf8', input: '' });
const read = (dir: string, path: string) => (existsSync(join(dir, path)) ? readFileSync(join(dir, path), 'utf8') : null);

const OTHER_HOOK = { type: 'command', command: 'node keep-me.mjs' };
const SETTINGS = `${JSON.stringify({
  permissions: { allow: ['Bash(ls:*)'] },
  hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: `"$CLAUDE_PROJECT_DIR"/${GUARD_SCRIPT}` }, OTHER_HOOK] }] },
}, null, 2)}\n`;

function write(dir: string, path: string, text: string): void {
  mkdirSync(dirname(join(dir, path)), { recursive: true });
  writeFileSync(join(dir, path), text);
}

/** A 1.x install that still has the stock 0.7 guard from before its migration. */
function installedWithGuard(list = stockList): string {
  const dir = mkdtempSync(join(tmpdir(), 'joycraft-guard-'));
  dirs.push(dir);
  write(dir, 'package.json', '{"name":"app"}\n');
  expect(run(dir, 'init', '.', '--harness', 'claude', '--yes').status).toBe(0);
  write(dir, GUARD_SCRIPT, stockScript);
  write(dir, GUARD_LIST, list);
  write(dir, '.claude/settings.json', SETTINGS);
  return dir;
}

const guardFiles = (dir: string) => [GUARD_SCRIPT, GUARD_LIST, '.claude/settings.json'].map((path) => read(dir, path));

describe('legacy-guard-retire spec 1', () => {
  it('fixtures are the published 0.7 bytes', () => {
    const known = (installInventory as { files: Record<string, string[]> }).files;
    expect(stockScript.length).toBeGreaterThan(0);
    expect(known[GUARD_SCRIPT]).toContain(sha256(stockScript));
    expect(known[GUARD_LIST]).toContain(sha256(stockList));
  });

  it('[AC:detect] finds the script, the list or a settings entry; a project with none gets no question', () => {
    const dir = installedWithGuard();
    expect(detectGuard(dir)).toEqual({ files: [GUARD_SCRIPT, GUARD_LIST], settingsEntries: 1, changed: false });
    rmSync(join(dir, '.claude/hooks'), { recursive: true });
    expect(detectGuard(dir)).toEqual({ files: [], settingsEntries: 1, changed: false });
    write(dir, '.claude/settings.json', '{"hooks":{"PreToolUse":[{"hooks":[{"type":"command","command":".claude/hooks/joycraft/block-dangerous.sh"}]}]}}');
    expect(detectGuard(dir)?.settingsEntries).toBe(1);
    rmSync(join(dir, '.claude/settings.json'));
    expect(detectGuard(dir)).toBe(null);
    const result = run(dir, 'update', '.');
    expect(result.status).toBe(0);
    expect(result.stdout).not.toMatch(/shell guard/);
  });

  it('[AC:ask-once] the question names the guard, says 1.x does not maintain it and names curl | bash; changes are flagged', () => {
    const plain = run(installedWithGuard(), 'update', '.');
    expect(plain.stdout).toContain('.claude/hooks/joycraft/');
    expect(plain.stdout).toContain('does not maintain it');
    expect(plain.stdout).toContain('curl ... | bash');
    expect(plain.stdout).not.toContain('It has your changes');
    const changed = run(installedWithGuard(`${stockList}my-own-pattern\n`), 'update', '.');
    expect(changed.stdout).toContain('It has your changes; the backup keeps them.');
  });

  it('[AC:no-guess] no terminal and no answer changes nothing; --yes keeps it without recording', () => {
    const dir = installedWithGuard();
    const before = guardFiles(dir);
    const manifest = read(dir, '.joycraft/installation.json');
    const asked = run(dir, 'update', '.');
    expect(asked.status).toBe(1);
    expect(asked.stdout).toContain('--legacy-guard remove');
    expect(asked.stdout).toContain('Nothing changed.');
    expect(guardFiles(dir)).toEqual(before);
    expect(read(dir, '.joycraft/installation.json')).toBe(manifest);

    const yes = run(dir, 'update', '.', '--yes');
    expect(yes.status).toBe(0);
    expect(yes.stdout).toContain('Kept the old 0.7 shell guard (.claude/hooks/joycraft/) this time. Answer with --legacy-guard');
    expect(guardFiles(dir)).toEqual(before);
    expect(readManifest(dir)!.legacyGuard).toBeUndefined();
    expect(run(dir, 'update', '.').stdout).toContain('does not maintain it');

    expect(run(dir, 'update', '.', '--legacy-guard', 'maybe', '--yes').status).toBe(1);
    expect(guardFiles(dir)).toEqual(before);
  });

  it('[AC:keep] keep changes no guard file, is recorded, and is not asked again', () => {
    const dir = installedWithGuard();
    const before = guardFiles(dir);
    const kept = run(dir, 'update', '.', '--legacy-guard', 'keep', '--yes');
    expect(kept.status, kept.stderr).toBe(0);
    expect(kept.stdout).toContain('update will not ask again');
    expect(guardFiles(dir)).toEqual(before);
    expect(readManifest(dir)!.legacyGuard).toBe('kept');
    const next = run(dir, 'update', '.');
    expect(next.status).toBe(0);
    expect(next.stdout).not.toMatch(/shell guard/);
    // A later update with changes keeps the record.
    applyInstall(planInstall(dir, ['claude', 'codex']));
    expect(readManifest(dir)!.legacyGuard).toBe('kept');
  });

  it('[AC:remove] remove takes out the script, the list, its settings entry and the empty folder; the backup has the originals', () => {
    const dir = installedWithGuard();
    const [script, list, settings] = guardFiles(dir);
    const result = run(dir, 'update', '.', '--legacy-guard', 'remove', '--yes');
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('Removed the old 0.7 shell guard');
    expect(existsSync(join(dir, '.claude/hooks/joycraft'))).toBe(false);
    const after = JSON.parse(read(dir, '.claude/settings.json')!);
    expect(after.permissions).toEqual({ allow: ['Bash(ls:*)'] });
    expect(after.hooks.PreToolUse).toEqual([{ matcher: 'Bash', hooks: [OTHER_HOOK] }]);
    expect(detectGuard(dir)).toBe(null);
    expect(readManifest(dir)!.legacyGuard).toBeUndefined();
    const backup = join(dir, '.joycraft-backups', readdirSync(join(dir, '.joycraft-backups'))[0], 'files');
    expect(readFileSync(join(backup, GUARD_SCRIPT), 'utf8')).toBe(script);
    expect(readFileSync(join(backup, GUARD_LIST), 'utf8')).toBe(list);
    expect(readFileSync(join(backup, '.claude/settings.json'), 'utf8')).toBe(settings);
    expect(run(dir, 'update', '.').stdout).not.toMatch(/shell guard/);
  });

  it('[AC:remove] withoutGuard drops emptied groups and events and keeps everything else', () => {
    const text = JSON.stringify({ model: 'x', hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: GUARD_SCRIPT }] }] } });
    expect(JSON.parse(withoutGuard(text))).toEqual({ model: 'x' });
  });

  it('[AC:remove] an interrupted remove is recovered byte for byte', () => {
    const dir = installedWithGuard();
    const plan = planInstall(dir, ['claude']);
    plan.guardAnswer = 'remove';
    // Settings that stop being JSON after the plan make the settings step fail mid-apply.
    write(dir, '.claude/settings.json', '{ not json');
    const before = guardFiles(dir);
    expect(() => applyInstall(plan)).toThrow();
    expect(existsSync(join(dir, GUARD_SCRIPT))).toBe(false);
    recoverInstall(dir);
    expect(guardFiles(dir)).toEqual(before);
  });

  it('[AC:migrate] migration asks the same question; remove is undone by rollback', () => {
    const dir = mkdtempSync(join(tmpdir(), 'joycraft-guard-07-'));
    dirs.push(dir);
    execFileSync('tar', ['-xzf', fixture017, '-C', dir]);
    const before = guardFiles(dir);
    expect(before[0]).not.toBe(null);

    const asked = run(dir, 'update', '.', '--migrate');
    expect(asked.status).toBe(1);
    expect(asked.stdout).toContain('does not maintain it');
    expect(guardFiles(dir)).toEqual(before);

    const plan = planLegacy(dir);
    expect(plan.guard?.files).toEqual([GUARD_SCRIPT, GUARD_LIST]);
    expect(plan.kept).not.toContain(GUARD_SCRIPT);
    migrateLegacy(plan, { guardAnswer: 'remove' });
    expect(detectGuard(dir)).toBe(null);
    expect(read(dir, '.claude/settings.json')).not.toContain('block-dangerous');

    applyRollback(planRollback(dir));
    expect(guardFiles(dir)).toEqual(before);
  });

  it('[AC:migrate] migration with keep records the answer', () => {
    const dir = mkdtempSync(join(tmpdir(), 'joycraft-guard-07-'));
    dirs.push(dir);
    execFileSync('tar', ['-xzf', fixture017, '-C', dir]);
    const result = run(dir, 'update', '.', '--migrate', '--legacy-guard', 'keep', '--yes');
    expect(result.status, result.stderr).toBe(0);
    expect(read(dir, GUARD_SCRIPT)).not.toBe(null);
    expect(readManifest(dir)!.legacyGuard).toBe('kept');
  });
});
