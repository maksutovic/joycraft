import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { applyInstall, doctor, planInstall, readManifest } from '../src/install-v1.js';
import { detectLegacy, migrateLegacy, planLegacy, recoverLegacy } from '../src/legacy-07.js';
import { applyRollback, planRollback } from '../src/rollback.js';
import { detectHost } from '../src/payload.js';

const repo = join(__dirname, '..');
// Its own build folder, so packaging tests that read dist/ never see a partial build.
const cli = join(repo, '.test-dist/cli.js');
const versions = ['0.7.8', '0.7.10', '0.7.15', '0.7.17'];
const dirs: string[] = [];

beforeAll(() => {
  execFileSync(join(repo, 'node_modules/.bin/tsup'), ['src/cli.ts', '--format', 'esm', '--platform', 'node', '--out-dir', '.test-dist', '--no-config'], { cwd: repo, stdio: 'ignore' });
}, 120000);
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

function temp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'joycraft-v1-'));
  dirs.push(dir);
  return dir;
}

function fixture07(version: string): string {
  const dir = temp();
  execFileSync('tar', ['-xzf', join(repo, `tests/fixtures/v07/${version}.tar.gz`), '-C', dir]);
  return dir;
}

function stack(kind: 'node' | 'python' | 'rust' | 'go'): string {
  const dir = temp();
  const files = { node: ['package.json', '{"name":"app","scripts":{"test":"node --test"}}\n'], python: ['pyproject.toml', '[project]\nname = "app"\n'],
    rust: ['Cargo.toml', '[package]\nname = "app"\nversion = "0.1.0"\n'], go: ['go.mod', 'module example.com/app\n\ngo 1.23\n'] }[kind];
  writeFileSync(join(dir, files[0]), files[1]);
  return dir;
}

/** Hash of every file except the backups folder. */
function treeHash(root: string, skip = /^\.joycraft-backups(\/|$)/): string {
  const hash = createHash('sha256');
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name); const rel = relative(root, path);
      if (skip.test(rel)) continue;
      if (statSync(path).isDirectory()) walk(path);
      else hash.update(`${rel}\0${statSync(path).mode & 0o777}\0`).update(readFileSync(path));
    }
  };
  walk(root);
  return hash.digest('hex');
}

const run = (dir: string, ...args: string[]) => spawnSync(process.execPath, [cli, ...args], { cwd: dir, encoding: 'utf8', input: '' });

describe('spec 12: install and update from the payload', () => {
  it('AC1: init installs for each stack type and doctor passes', () => {
    for (const kind of ['node', 'python', 'rust', 'go'] as const) {
      const dir = stack(kind);
      const result = run(dir, 'init', '.', '--harness', 'claude,codex', '--yes');
      expect(result.status, result.stderr).toBe(0);
      expect(existsSync(join(dir, '.claude/skills/joycraft-entry/SKILL.md'))).toBe(true);
      expect(existsSync(join(dir, '.agents/skills/joycraft-entry/SKILL.md'))).toBe(true);
      expect(doctor(dir).ok).toBe(true);
      expect(run(dir, 'doctor', '.').status).toBe(0);
    }
  });

  it('AC2: update replaces untouched Joycraft files, backs up an edited one, and never replaces a file it did not install', () => {
    const dir = stack('node');
    applyInstall(planInstall(dir, ['claude']));
    const manifest = readManifest(dir)!;
    const edited = '.claude/skills/joycraft-entry/SKILL.md';
    const untouched = '.joycraft/runtime/scope.mjs';
    writeFileSync(join(dir, edited), 'my edits\n');
    // Pretend the last install shipped different bytes for both files.
    const old = { ...manifest, files: manifest.files.map((file) => (file.path === untouched ? { ...file, sha256: createHash('sha256').update('old\n').digest('hex') } : file.path === edited ? { ...file, sha256: 'f'.repeat(64) } : file)) };
    writeFileSync(join(dir, '.joycraft/installation.json'), JSON.stringify(old));
    writeFileSync(join(dir, untouched), 'old\n');
    const plan = planInstall(dir, ['claude']);
    expect(plan.actions).toEqual(expect.arrayContaining([{ kind: 'replace', path: untouched }, { kind: 'replace-edited', path: edited }]));
    const result = applyInstall(plan);
    expect(readFileSync(join(dir, result.backup!, 'files', edited), 'utf8')).toBe('my edits\n');
    expect(doctor(dir).edited).toEqual([]);
    const user = '.claude/skills/joycraft-entry/extra.md';
    writeFileSync(join(dir, user), 'mine\n');
    expect(planInstall(dir, ['claude']).actions.some((action) => action.path === user)).toBe(false);
  });

  it('AC3: the host choice is recorded and reused', () => {
    const dir = stack('node');
    expect(run(dir, 'init', '.', '--harness', 'pi,omp', '--yes').status).toBe(0);
    expect(readManifest(dir)!.hosts).toEqual(['pi', 'omp']);
    const plan = JSON.parse(run(dir, 'update', '.', '--plan', '--json').stdout);
    expect(plan.hosts).toEqual(['pi', 'omp']);
  });

  it('AC4: without a terminal or --yes it prints the plan and exits 1; --plan --json writes nothing', () => {
    const dir = stack('node');
    const before = treeHash(dir);
    const plain = run(dir, 'init', '.', '--harness', 'claude');
    expect(plain.status).toBe(1);
    expect(plain.stdout).toMatch(/Re-run with --yes/);
    const planned = run(dir, 'init', '.', '--harness', 'claude', '--plan', '--json');
    expect(planned.status).toBe(0);
    expect(JSON.parse(planned.stdout).actions.length).toBeGreaterThan(0);
    expect(treeHash(dir)).toBe(before);
  });

  it('AC5: the host running the CLI is detected from its environment', () => {
    expect(detectHost({ CLAUDECODE: '1' })).toBe('claude');
    expect(detectHost({ CODEX_THREAD_ID: 'x' })).toBe('codex');
    expect(detectHost({ OPENCODE: '1' })).toBe('opencode');
    expect(detectHost({})).toBe(null);
  });
});

describe('spec 13: a 0.7 install gets a dry run', () => {
  it.each(versions)('AC1–AC3: %s is detected, nothing changes, and all three choices are named', (version) => {
    const dir = fixture07(version);
    const skill = '.claude/skills/joycraft-tune/SKILL.md';
    writeFileSync(join(dir, skill), `${readFileSync(join(dir, skill), 'utf8')}\nMy own rule.\n`);
    const before = treeHash(dir);
    const result = run(dir, 'update', '.');
    expect(result.status).toBe(1);
    expect(treeHash(dir)).toBe(before);
    expect(result.stdout).toContain(`  ${skill}`);
    for (const choice of ['update --migrate', 'npx joycraft@0.7.17 update', 'migrate-from-0-7.md']) expect(result.stdout).toContain(choice);
    expect(run(dir, 'init', '.').status).toBe(1);
    expect(treeHash(dir)).toBe(before);
  });
});

describe('spec 14: migrate from 0.7', () => {
  it.each(versions)('AC1/AC3: %s migrates cleanly; 0.7 files are moved, never deleted', (version) => {
    const dir = fixture07(version);
    const plan = planLegacy(dir);
    expect(plan.customized).toEqual([]);
    const agents = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    const result = migrateLegacy(plan);
    const installed = new Set(readManifest(dir)!.files.map((file) => file.path));
    for (const path of plan.archive) {
      // Gone, or now the 1.0 file of the same name; the 0.7 bytes are in the backup either way.
      expect(!existsSync(join(dir, path)) || installed.has(path), path).toBe(true);
      expect(existsSync(join(dir, result.backup, 'archive', path)), path).toBe(true);
    }
    expect(detectLegacy(dir)).toBe(null);
    expect(doctor(dir).ok).toBe(true);
    expect(readFileSync(join(dir, 'AGENTS.md'), 'utf8')).toBe(agents);
    expect(readFileSync(join(dir, '.gitignore'), 'utf8')).toMatch(/^\.joycraft-backups\/$/m);
    const settings = JSON.parse(readFileSync(join(dir, '.claude/settings.json'), 'utf8'));
    expect(JSON.stringify(settings)).not.toContain('joycraft-version-check');
    const commands = Object.values<any>(settings.hooks).flat().flatMap((group: any) => group.hooks.map((hook: any) => hook.command));
    expect(commands).toContain('"$CLAUDE_PROJECT_DIR"/.claude/hooks/joycraft/block-dangerous.sh');
  });

  it('AC2: a customized skill is kept or archived as chosen, never lost', () => {
    const dir = fixture07('0.7.17');
    const kept = '.claude/skills/joycraft-tune/SKILL.md';        // no 1.0 skill at this path
    const overlapping = '.claude/skills/joycraft-implement/SKILL.md'; // 1.0 installs here
    for (const path of [kept, overlapping]) writeFileSync(join(dir, path), 'customized\n');
    const plan = planLegacy(dir);
    expect(plan.customized.sort()).toEqual([overlapping, kept].sort());
    const result = migrateLegacy(plan, { keep: [kept, overlapping] });
    expect(readFileSync(join(dir, kept), 'utf8')).toBe('customized\n');
    expect(readFileSync(join(dir, result.backup, 'archive', overlapping), 'utf8')).toBe('customized\n');
    expect(readFileSync(join(dir, overlapping), 'utf8')).not.toBe('customized\n');
  });

  it('AC4: 0.7 spec queues stay as read-only history, byte for byte', () => {
    const dir = fixture07('0.7.17');
    const queue = 'docs/features/old-feature/specs/.joycraft-spec-queue.json';
    mkdirSync(join(dir, 'docs/features/old-feature/specs'), { recursive: true });
    writeFileSync(join(dir, queue), '{"specs":[{"id":1,"status":"complete"}]}\n');
    migrateLegacy(planLegacy(dir));
    expect(readFileSync(join(dir, queue), 'utf8')).toBe('{"specs":[{"id":1,"status":"complete"}]}\n');
  });

  it('AC5: an interrupted migration recovers to the pre-migration tree', () => {
    const dir = fixture07('0.7.17');
    const before = treeHash(dir, /^(\.joycraft-backups|\.joycraft)(\/|$)/);
    const plan = planLegacy(dir);
    // The 1.0 install fails part way, after every 0.7 file has moved.
    mkdirSync(join(dir, '.claude/agents'), { recursive: true });
    chmodSync(join(dir, '.claude/agents'), 0o500);
    expect(() => migrateLegacy(plan)).toThrow();
    chmodSync(join(dir, '.claude/agents'), 0o700);
    rmdirSync(join(dir, '.claude/agents'));
    expect(recoverLegacy(dir)).toBe(true);
    expect(treeHash(dir, /^(\.joycraft-backups|\.joycraft)(\/|$)/)).toBe(before);
    expect(detectLegacy(dir)).not.toBe(null);
  });
});

describe('spec 15: rollback', () => {
  it.each(versions)('AC1: migrate then roll back %s restores the tree byte for byte', (version) => {
    const dir = fixture07(version);
    const before = treeHash(dir);
    migrateLegacy(planLegacy(dir));
    expect(treeHash(dir)).not.toBe(before);
    applyRollback(planRollback(dir));
    expect(treeHash(dir)).toBe(before);
    expect(readdirSync(join(dir, '.joycraft-backups')).some((name) => name.startsWith('migrate-'))).toBe(true);
  });

  it('AC2/AC3: without --yes nothing changes; a 1.0 file edited after the migration is kept unless forced', () => {
    const dir = fixture07('0.7.17');
    migrateLegacy(planLegacy(dir));
    const edited = '.joycraft/runtime/scope.mjs';
    writeFileSync(join(dir, edited), '// my change\n');
    const before = treeHash(dir);
    const dry = run(dir, 'rollback');
    expect(dry.stdout).toContain(`kept, edited after the migration (use --force to remove): ${edited}`);
    expect(treeHash(dir)).toBe(before);
    applyRollback(planRollback(dir));
    expect(readFileSync(join(dir, edited), 'utf8')).toBe('// my change\n');
  });
});
