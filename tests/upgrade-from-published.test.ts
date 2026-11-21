import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Holdout check: the path every live 1.x user takes next. Install the last
// published Joycraft from npm, then update to the candidate tarball.
// It needs the npm registry, so it runs only when JOYCRAFT_UPGRADE_TARBALL names a
// packed candidate (CI sets it). JOYCRAFT_PREVIOUS_VERSION picks another
// published version; the default is the npm `latest` tag.
const tarball = process.env.JOYCRAFT_UPGRADE_TARBALL;
const repo = join(__dirname, '..');

const STACKS = {
  node: ['package.json', '{"name":"app","private":true,"scripts":{"test":"node --test"}}\n'],
  python: ['pyproject.toml', '[project]\nname = "app"\n'],
  rust: ['Cargo.toml', '[package]\nname = "app"\nversion = "0.1.0"\n'],
  go: ['go.mod', 'module example.com/app\n\ngo 1.23\n'],
} as const;
const USER_FILES = {
  'AGENTS.md': '# My project\n\nMy own rules. Joycraft never edits this file.\n',
  'CLAUDE.md': '@AGENTS.md\n\nMy Claude notes.\n',
  '.claude/settings.json': '{\n  "model": "opus",\n  "permissions": { "allow": ["Bash(ls)"] }\n}\n',
};

function treeHash(root: string, skip = /^(\.joycraft-backups)(\/|$)/): string {
  const hash = createHash('sha256');
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name); const rel = relative(root, path).split('\\').join('/');
      if (skip.test(rel)) continue;
      if (statSync(path).isDirectory()) walk(path);
      else hash.update(`${rel}\0`).update(readFileSync(path));
    }
  };
  walk(root);
  return hash.digest('hex');
}

describe.skipIf(!tarball)('upgrade from the last published release to the candidate', () => {
  let work = '';
  let previous = '';
  let candidate = '';
  let previousCli = '';
  let candidateCli = '';

  const run = (cli: string, cwd: string, ...args: string[]) => {
    const result = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', input: '' });
    return result;
  };
  const ok = (result: ReturnType<typeof run>, what: string) => expect(result.status, `${what}\n${result.stdout}\n${result.stderr}`).toBe(0);
  const install = (spec: string, name: string) => {
    const prefix = join(work, name);
    mkdirSync(prefix, { recursive: true });
    execFileSync('npm', ['install', '--prefix', prefix, '--no-audit', '--no-fund', spec], { stdio: 'pipe', shell: process.platform === 'win32' });
    return join(prefix, 'node_modules/joycraft');
  };

  beforeAll(() => {
    work = mkdtempSync(join(tmpdir(), 'joycraft-upgrade-'));
    previous = process.env.JOYCRAFT_PREVIOUS_VERSION
      || execFileSync('npm', ['view', 'joycraft', 'dist-tags.latest'], { encoding: 'utf8', shell: process.platform === 'win32' }).trim();
    previousCli = join(install(`joycraft@${previous}`, 'previous'), 'dist/cli.js');
    const candidateRoot = install(resolve(repo, tarball!), 'candidate');
    candidate = JSON.parse(readFileSync(join(candidateRoot, 'package.json'), 'utf8')).version;
    candidateCli = join(candidateRoot, 'dist/cli.js');
  }, 300000);
  afterAll(() => { if (work) rmSync(work, { recursive: true, force: true }); });

  it.each(Object.keys(STACKS) as (keyof typeof STACKS)[])('%s: init with the published release, update with the candidate; user files keep their bytes', (stack) => {
    const dir = join(work, `stack-${stack}`);
    mkdirSync(join(dir, '.claude'), { recursive: true });
    const [file, text] = STACKS[stack];
    writeFileSync(join(dir, file), text);
    for (const [path, bytes] of Object.entries(USER_FILES)) writeFileSync(join(dir, path), bytes);

    ok(run(previousCli, dir, 'init', '.', '--harness', 'claude,codex', '--yes'), `init with ${previous}`);
    const edited = '.claude/skills/joycraft-entry/SKILL.md';
    writeFileSync(join(dir, edited), `${readFileSync(join(dir, edited), 'utf8')}\nMy own rule.\n`);
    const mine = readFileSync(join(dir, edited), 'utf8');

    ok(run(candidateCli, dir, 'update', '.', '--yes'), `update to ${candidate}`);
    ok(run(candidateCli, dir, 'doctor', '.'), 'doctor after update');
    for (const [path, bytes] of Object.entries(USER_FILES)) expect(readFileSync(join(dir, path), 'utf8'), path).toBe(bytes);
    expect(readFileSync(join(dir, file), 'utf8')).toBe(text);
    const manifest = JSON.parse(readFileSync(join(dir, '.joycraft/installation.json'), 'utf8'));
    expect(manifest.joycraft).toBe(candidate);
    // An edited Joycraft file is kept as it is, or replaced with the edited copy in the backup.
    const now = readFileSync(join(dir, edited), 'utf8');
    if (now !== mine) {
      const backups = readdirSync(join(dir, '.joycraft-backups'));
      expect(backups.some((name) => {
        try { return readFileSync(join(dir, '.joycraft-backups', name, 'files', edited), 'utf8') === mine; } catch { return false; }
      }), 'edited copy is in a backup').toBe(true);
    }
  });

  it('0.7.17 migrated by the published release, updated by the candidate, rolls back byte for byte', () => {
    const dir = join(work, 'v07');
    mkdirSync(dir, { recursive: true });
    execFileSync('tar', ['-xzf', join(repo, 'tests/fixtures/v07/0.7.17.tar.gz'), '-C', dir]);
    const before = treeHash(dir);
    const agents = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    const claude = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
    ok(run(previousCli, dir, 'update', '.', '--migrate', '--archive-custom', '--legacy-guard', 'keep', '--yes'), `migrate with ${previous}`);
    ok(run(candidateCli, dir, 'update', '.', '--yes'), `update to ${candidate}`);
    ok(run(candidateCli, dir, 'doctor', '.'), 'doctor after update');
    expect(readFileSync(join(dir, 'AGENTS.md'), 'utf8')).toBe(agents);
    expect(readFileSync(join(dir, 'CLAUDE.md'), 'utf8')).toBe(claude);
    ok(run(candidateCli, dir, 'rollback', '--yes'), 'rollback with the candidate');
    expect(treeHash(dir)).toBe(before);
  });
});
