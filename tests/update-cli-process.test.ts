import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { build } from 'tsup';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
let fixture: string;
let cli: string;
let preload: string;
beforeAll(async () => {
  fixture = mkdtempSync(join(tmpdir(), 'joycraft-cli-process-'));
  copyFileSync(join(repo, 'package.json'), join(fixture, 'package.json'));
  symlinkSync(join(repo, 'node_modules'), join(fixture, 'node_modules'), 'junction');
  cli = join(fixture, 'dist/cli.mjs');
  await build({ entry: { cli: join(repo, 'src/cli.ts') }, outDir: join(fixture, 'dist'), format: ['esm'], outExtension: () => ({ js: '.mjs' }), config: false, silent: true, dts: false });
  preload = join(fixture, 'deny-network.mjs');
  writeFileSync(preload, "import { appendFileSync } from 'node:fs'; globalThis.fetch = async () => { appendFileSync(process.env.JOYCRAFT_TEST_NETWORK_LOG, 'called\\n'); throw new Error('unexpected registry lookup'); };\n");
}, 30_000);
afterAll(() => { if (fixture) rmSync(fixture, { recursive: true, force: true }); });

function run(name: string, args: string[], setup?: (root: string) => void) {
  const root = join(fixture, name);
  mkdirSync(root, { recursive: true });
  setup?.(root);
  const networkLog = join(root, 'network-calls.txt');
  const result = spawnSync(process.execPath, ['--import', preload, cli, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, JOYCRAFT_TEST_NETWORK_LOG: networkLog }, timeout: 15_000 });
  expect(result.error).toBeUndefined();
  expect(result.stderr).toBe('');
  expect(existsSync(networkLog)).toBe(false);
  const lines = result.stdout.trim().split('\n');
  expect(lines).toHaveLength(1);
  const output = JSON.parse(lines[0]);
  expect(output.exitCode).toBe(result.status);
  return { root, output, code: result.status };
}

describe('real CLI update outcomes', () => {
  it('repairs a deliberately missing owned file only when explicitly selected', () => {
    const args = ['update', '.', '--harnesses', 'codex', '--non-interactive', '--json'];
    const { root } = run('explicit repair', args);
    const path = '.agents/skills/joycraft-tune/SKILL.md';
    const original = readFileSync(join(root, path));
    rmSync(join(root, path));
    run('explicit repair', args);
    expect(existsSync(join(root, path))).toBe(false);
    const repaired = run('explicit repair', [...args, '--repair', path]);
    expect(repaired.code).toBe(0);
    expect(repaired.output.applied).toContain(path);
    expect(readFileSync(join(root, path))).toEqual(original);
  });
  for (const alias of ['update', 'init', 'upgrade']) {
    it(`${alias} prints one JSON outcome and uses its executing bundle without registry resolution`, () => {
      const { code, output } = run(alias, [alias, '.', '--harnesses', 'codex', '--non-interactive', '--json']);
      expect(code).toBe(0);
      expect(output.status).toBe('applied');
      expect(output.installedVersion).toBe(output.targetVersion);
      expect(output.applied).toContain('.agents/skills/joycraft-tune/SKILL.md');
    });
  }
  it('reports fresh selection failure with exit 1', () => {
    const { code, output } = run('invalid', ['update', '--non-interactive', '--json']);
    expect(code).toBe(1);
    expect(output.status).toBe('invalid');
  });
  it('reports unknown customized files with exit 2 and preserves their bytes', () => {
    const relative = '.agents/skills/joycraft-tune/SKILL.md';
    const { code, output, root } = run('conflict', ['update', '--harnesses', 'codex', '--yes', '--json'], (root) => {
      mkdirSync(dirname(join(root, relative)), { recursive: true });
      writeFileSync(join(root, relative), 'my custom skill\n');
    });
    expect(code).toBe(2);
    expect(output.conflicts).toContain(relative);
    expect(readFileSync(join(root, relative), 'utf8')).toBe('my custom skill\n');
  });
  it('reports project lock attention with exit 3 and no applied files', () => {
    const { code, output } = run('locked', ['update', '--harnesses', 'codex', '--yes', '--json'], (root) => {
      const owner = join(root, 'docs/.joycraft/local/update.lock/owner.json');
      mkdirSync(dirname(owner), { recursive: true });
      writeFileSync(owner, JSON.stringify({ operationId: 'test-live', pid: process.pid, startedAt: new Date().toISOString() }));
    });
    expect(code).toBe(3);
    expect(output.applied).toEqual([]);
  });
});

describe('real CLI explicit migrations', () => {
  it('previews the same conservative moves that apply executes, without touching files during preview', () => {
    const name = 'migration preview with spaces';
    const { root, output: preview } = run(name, ['migrate', '.', '--json'], (root) => {
      mkdirSync(join(root, 'docs/briefs'), { recursive: true });
      writeFileSync(join(root, 'docs/briefs/accounts.md'), '# accounts');
      mkdirSync(join(root, 'docs/specs/unknown-area'), { recursive: true });
      writeFileSync(join(root, 'docs/specs/unknown-area/custom.md'), 'user notes');
      writeFileSync(join(root, 'CLAUDE.md'), 'my policy\r\n');
    });
    expect(preview.status).toBe('preview');
    expect(preview.plan.moves.map((move: { kind: string }) => move.kind)).toEqual(['brief']);
    expect(readFileSync(join(root, 'docs/briefs/accounts.md'), 'utf8')).toBe('# accounts');
    expect(existsSync(join(root, 'docs/features'))).toBe(false);
    const { output: applied, code } = run(name, ['migrate', '.', '--apply', '--json']);
    expect(code).toBe(0);
    expect(applied.plan.moves).toEqual(preview.plan.moves);
    expect(readFileSync(join(root, 'docs/features/accounts/brief.md'), 'utf8')).toBe('# accounts');
    expect(readFileSync(join(root, 'docs/specs/unknown-area/custom.md'), 'utf8')).toBe('user notes');
    expect(readFileSync(join(root, 'CLAUDE.md'), 'utf8')).toBe('my policy\r\n');
  });

  it('preserves a colliding destination until the explicit replacement flag selects it', () => {
    const name = 'migration collision';
    const { root, output } = run(name, ['migrate', '--apply', '--json'], (root) => {
      for (const path of ['docs/briefs', 'docs/features/accounts']) mkdirSync(join(root, path), { recursive: true });
      writeFileSync(join(root, 'docs/briefs/accounts.md'), 'source');
      writeFileSync(join(root, 'docs/features/accounts/brief.md'), 'custom destination');
    });
    expect(output.applied).toBe(0);
    expect(readFileSync(join(root, 'docs/features/accounts/brief.md'), 'utf8')).toBe('custom destination');
    const { output: replaced } = run(name, ['migrate', '--apply', '--json', '--replace-collision', 'docs/features/accounts/brief.md']);
    expect(replaced.applied).toBe(1);
    expect(readFileSync(join(root, 'docs/features/accounts/brief.md'), 'utf8')).toBe('source');
  });
});
