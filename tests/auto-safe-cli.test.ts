import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { build } from 'tsup';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
let fixture: string;
let cli: string;
let preload: string;
beforeAll(async () => {
  fixture = mkdtempSync(join(tmpdir(), 'joycraft-auto-cli-'));
  copyFileSync(join(repo, 'package.json'), join(fixture, 'package.json'));
  symlinkSync(join(repo, 'node_modules'), join(fixture, 'node_modules'), 'junction');
  cli = join(fixture, 'dist/cli.mjs');
  await build({ entry: { cli: join(repo, 'src/cli.ts') }, outDir: join(fixture, 'dist'), format: ['esm'], outExtension: () => ({ js: '.mjs' }), config: false, silent: true, dts: false });
  preload = join(fixture, 'deny-network.mjs');
  writeFileSync(preload, "import { appendFileSync } from 'node:fs'; globalThis.fetch = async () => { appendFileSync(process.env.JOYCRAFT_TEST_NETWORK_LOG, 'unexpected'); throw new Error('unexpected network'); };\n");
}, 30_000);
afterAll(() => { if (fixture) rmSync(fixture, { recursive: true, force: true }); });

function run(name: string, args: string[], setup?: (root: string) => void) {
  const root = join(fixture, name);
  mkdirSync(root, { recursive: true });
  setup?.(root);
  const networkLog = join(root, 'network-log');
  const result = spawnSync(process.execPath, ['--import', preload, cli, 'update', '.', ...args, '--json'], { cwd: root, encoding: 'utf8', timeout: 10_000, env: { ...process.env, JOYCRAFT_TEST_NETWORK_LOG: networkLog } });
  expect(result.error).toBeUndefined();
  expect(result.stderr).toBe('');
  expect(existsSync(networkLog)).toBe(false);
  return { root, status: result.status, output: JSON.parse(result.stdout) };
}

describe('automatic and preview CLI boundaries', () => {
  it('rejects automation without local opt-in before registry work or project changes', () => {
    const { root, status, output } = run('no permission', ['--auto-safe']);
    expect(status).toBe(1);
    expect(output.diagnostics.join(' ')).toMatch(/local.*auto-safe/i);
    expect(readdirSync(root)).toEqual([]);
  });

  it('rejects automatic recovery before registry work or recovery mutation', () => {
    const { status, output } = run('no recovery', ['--auto-safe', '--recover']);
    expect(status).toBe(1);
    expect(output.diagnostics.join(' ')).toMatch(/automatic|auto-safe/i);
  });

  it('previews actual candidate actions without installing any files', () => {
    const { root, status, output } = run('preview with spaces', ['--preview', '--harnesses', 'codex', '--non-interactive']);
    expect(status).toBe(0);
    expect(output.preview).toBe(true);
    expect(output.actions.some((action: { path: string }) => action.path === '.agents/skills/joycraft-tune/SKILL.md')).toBe(true);
    expect(readdirSync(root)).toEqual([]);
  });
});
