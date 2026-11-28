import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
// @ts-expect-error the runtime is plain JavaScript
import { commandSpawn } from '../payload/.joycraft/runtime/evidence.mjs';

// spec-3: test commands start through cmd.exe on Windows, where npm, npx and pnpm are .cmd shims.
const runtime = join(__dirname, '..', 'payload', '.joycraft', 'runtime');
const windowsEnv = { PATH: 'C:\\tools;C:\\Program Files\\nodejs', PATHEXT: '.COM;.EXE;.BAT;.CMD', ComSpec: 'C:\\Windows\\system32\\cmd.exe' };
const onDisk = (...files: string[]) => (file: string) => files.some(each => each.toLowerCase() === file.toLowerCase());

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
const temp = (prefix: string) => { const dir = realpathSync(mkdtempSync(join(tmpdir(), prefix))); dirs.push(dir); return dir; };
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };

describe('commandSpawn', () => {
  it('[AC:spec-3-1] on win32 a .cmd shim starts through cmd.exe /d /s /c with each argument quoted', () => {
    const spawn = commandSpawn(['pnpm', 'test', 'tests/a b.test.ts'],
      { platform: 'win32', env: windowsEnv, exists: onDisk('C:\\Program Files\\nodejs\\pnpm.CMD') });
    expect(spawn.command).toBe('C:\\Windows\\system32\\cmd.exe');
    expect(spawn.args.slice(0, 3)).toEqual(['/d', '/s', '/c']);
    expect(spawn.options).toEqual({ windowsVerbatimArguments: true });
    // The shim path, then every argument in quotes; spaces and quotes are caret-escaped twice, since the shim re-reads %*.
    expect(spawn.args[3]).toBe('"C:\\Program^ Files\\nodejs\\pnpm.CMD ^^^"test^^^" ^^^"tests/a^^^ b.test.ts^^^""');
  });

  it('[AC:spec-3-1] on win32 cmd.exe metacharacters in an argument are escaped, never left bare', () => {
    const spawn = commandSpawn(['npx', 'vitest', 'a&b|c<d>e^f%PATH%"g'],
      { platform: 'win32', env: windowsEnv, exists: onDisk('C:\\tools\\npx.cmd') });
    const line = spawn.args[3];
    // Every metacharacter that cmd.exe acts on carries a caret before it.
    for (const char of ['&', '|', '<', '>', '%']) {
      for (const [index, each] of [...line].entries()) if (each === char) expect(line[index - 1]).toBe('^');
    }
    expect(line).toContain('\\^^^"g');
  });

  it('[AC:spec-3-1] on win32 a found .exe and a command not on PATH start directly, without cmd.exe', () => {
    const exe = commandSpawn(['node', '--test', 'a b.mjs'], { platform: 'win32', env: windowsEnv, exists: onDisk('C:\\tools\\node.exe') });
    expect(exe).toEqual({ command: 'node', args: ['--test', 'a b.mjs'], options: {} });
    const missing = commandSpawn(['jc-missing', 'x'], { platform: 'win32', env: windowsEnv, exists: () => false });
    expect(missing).toEqual({ command: 'jc-missing', args: ['x'], options: {} });
  });

  it('[AC:spec-3-2] on darwin and linux the command starts directly with no shell', () => {
    for (const platform of ['darwin', 'linux']) {
      expect(commandSpawn(['pnpm', 'test', 'tests/a b.test.ts'], { platform, env: windowsEnv, exists: () => true }))
        .toEqual({ command: 'pnpm', args: ['test', 'tests/a b.test.ts'], options: {} });
    }
  });
});

describe('callers', () => {
  it('[AC:spec-3-3] evidence.mjs and close.mjs start commands through the helper', () => {
    const evidence = readFileSync(join(runtime, 'evidence.mjs'), 'utf8');
    const close = readFileSync(join(runtime, 'close.mjs'), 'utf8');
    expect(evidence).toMatch(/commandSpawn\(argv\b/);
    expect(close).toMatch(/commandSpawn\(argv\b/);
    expect(evidence).not.toMatch(/spawn\(argv\[0\], argv\.slice\(1\)/);
    expect(close).toMatch(/import \{[^}]*commandSpawn[^}]*\} from '\.\/evidence\.mjs'/);
    expect(close).not.toMatch(/execFileSync\(argv\[0\], argv\.slice\(1\)/);
  });

  it('[AC:spec-3-3] evidence run with a missing command says it could not start', () => {
    const root = temp('jc-spawn-evidence-');
    put(join(root, '.gitignore'), 'receipts/\n');
    execFileSync('git', ['init', '-q'], { cwd: root });
    const result = spawnSync(process.execPath, [join(runtime, 'evidence.mjs'), 'run', '--receipt', 'receipts/a.log', '--', 'jc-no-such-command'], { cwd: root, encoding: 'utf8' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Could not start jc-no-such-command');
  });

  it('[AC:spec-3-3] close with a missing focused command says it could not start', () => {
    const root = temp('jc-spawn-close-');
    const home = temp('jc-spawn-home-');
    const env = { ...process.env, HOME: home, XDG_CONFIG_HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: join(home, 'none') };
    put(join(root, 'AGENTS.md'), '# Demo\n');
    put(join(root, 'tests/title.test.ts'), 'export {};\n');
    put(join(root, 'joycraft.yaml'), 'tests:\n  focused: jc-no-such-command {files}\n');
    put(join(root, 'docs/features/title/brief.md'), '# T\n\n## Done when\n\n1. The title shows. test: tests/title.test.ts\n\n## Assumptions\n\n- Look: OK\n');
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root, env });
    execFileSync('git', ['config', 'user.name', 't'], { cwd: root, env });
    execFileSync('git', ['config', 'user.email', 't@example.com'], { cwd: root, env });
    const result = spawnSync(process.execPath, [join(runtime, 'close.mjs'), 'title', '-m', 'feat: t', '--root', root], { cwd: root, env, encoding: 'utf8' });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Could not start jc-no-such-command');
  });
});
