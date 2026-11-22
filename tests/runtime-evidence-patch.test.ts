import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const script = join(__dirname, '..', 'payload', '.joycraft', 'runtime', 'evidence.mjs');
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
const run = (cwd: string, receipt: string, patch: string, command: string[], extra: string[] = []) =>
  spawnSync(process.execPath, [script, 'run', '--receipt', receipt, '--patch', patch, ...extra, '--', ...command], { cwd, encoding: 'utf8' });

const good = 'export const add = (a, b) => a + b;\n';
const bad = 'export const add = (a, b) => a - b;\n';
const check = "import { add } from './add.mjs';\nif (add(2, 2) !== 4) { console.log('add is wrong'); process.exit(1); }\nconsole.log('ok');\n";

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

/** A committed project with add.mjs, check.mjs and a saved fault in an ignored receipts/ folder. */
function project() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-evidence-patch-')));
  dirs.push(root);
  git(root, 'init', '-q');
  writeFileSync(join(root, '.gitignore'), 'receipts/\n');
  writeFileSync(join(root, 'add.mjs'), good);
  writeFileSync(join(root, 'check.mjs'), check);
  git(root, 'add', '.');
  git(root, 'commit', '-q', '-m', 'init');
  writeFileSync(join(root, 'add.mjs'), bad);
  execFileSync('mkdir', ['-p', join(root, 'receipts')]);
  writeFileSync(join(root, 'receipts/fault.diff'), git(root, 'diff'));
  git(root, 'checkout', '--', 'add.mjs');
  return root;
}
const status = (root: string) => git(root, 'status', '--porcelain');
const footer = (root: string, receipt: string) => JSON.parse(readFileSync(join(root, receipt), 'utf8').trimEnd().split('\n').at(-1)!.replace(/^joycraft-evidence: /, ''));
const node = (...args: string[]) => [process.execPath, ...args];

describe('evidence.mjs run --patch', () => {
  it('[AC:spec-9-1] refuses a dirty tree, a patch that does not apply, and a path outside the project, applying nothing', () => {
    const root = project();
    writeFileSync(join(root, 'check.mjs'), `${check}// edit\n`);
    const dirty = run(root, 'receipts/dirty.log', 'receipts/fault.diff', node('check.mjs'));
    expect(dirty.status).toBe(2);
    expect(dirty.stderr).toContain('dirty');
    expect(readFileSync(join(root, 'add.mjs'), 'utf8')).toBe(good);
    git(root, 'checkout', '--', 'check.mjs');

    writeFileSync(join(root, 'receipts/stale.diff'), readFileSync(join(root, 'receipts/fault.diff'), 'utf8').replace(/a \+ b/g, 'a * b'));
    const stale = run(root, 'receipts/stale.log', 'receipts/stale.diff', node('check.mjs'));
    expect(stale.status).toBe(2);
    expect(stale.stderr).toContain('does not apply');

    writeFileSync(join(root, 'receipts/outside.diff'), '--- a/../outside.txt\n+++ b/../outside.txt\n@@ -0,0 +1 @@\n+x\n');
    const outside = run(root, 'receipts/outside.log', 'receipts/outside.diff', node('check.mjs'));
    expect(outside.status).toBe(2);
    expect(status(root)).toBe('');
    expect(readFileSync(join(root, 'add.mjs'), 'utf8')).toBe(good);
  });

  it('[AC:spec-9-2] applies the fault, runs, reverses it and reports restored: true', () => {
    const root = project();
    const before = sha(join(root, 'add.mjs'));
    const result = run(root, 'receipts/fault.log', 'receipts/fault.diff', node('check.mjs'));
    expect(result.status).toBe(1);
    const out = JSON.parse(result.stdout);
    expect(out.command.exitCode).toBe(1);
    expect(out.patch).toEqual({ path: 'receipts/fault.diff', sha256: sha(join(root, 'receipts/fault.diff')), patched: true, restored: true });
    expect(readFileSync(join(root, 'receipts/fault.log'), 'utf8')).toContain('add is wrong');
    expect(status(root)).toBe('');
    expect(sha(join(root, 'add.mjs'))).toBe(before);
    expect(git(root, 'diff', '--cached', '--name-only')).toBe('');
  });

  it('[AC:spec-9-3] restores the tree after a passing run and after a timeout', () => {
    const root = project();
    const before = sha(join(root, 'add.mjs'));
    const pass = run(root, 'receipts/pass.log', 'receipts/fault.diff', node('-e', 'console.log("no check")'));
    expect(pass.status).toBe(0);
    expect(JSON.parse(pass.stdout).patch.restored).toBe(true);
    expect(status(root)).toBe('');
    expect(sha(join(root, 'add.mjs'))).toBe(before);

    const slow = run(root, 'receipts/slow.log', 'receipts/fault.diff', node('-e', 'setTimeout(() => {}, 60000)'), ['--timeout-ms', '500']);
    expect(slow.status).toBe(1);
    expect(JSON.parse(slow.stdout).patch.restored).toBe(true);
    expect(status(root)).toBe('');
    expect(sha(join(root, 'add.mjs'))).toBe(before);
  });

  it('[AC:spec-9-3] a failed restore reports restored: false and exits 1, never a pass', () => {
    const root = project();
    // The command passes but rewrites the patched file, so the reverse cannot bring back the old bytes.
    const result = run(root, 'receipts/mangle.log', 'receipts/fault.diff', node('-e', "require('fs').writeFileSync('add.mjs', 'mangled\\n')"));
    expect(result.status).toBe(1);
    const out = JSON.parse(result.stdout);
    expect(out.command.exitCode).toBe(0);
    expect(out.patch.restored).toBe(false);
    expect(footer(root, 'receipts/mangle.log').patch.restored).toBe(false);
  });

  it('[AC:spec-9-4] a timeout keeps timedOut and exitCode null, and the footer records the patch', () => {
    const root = project();
    const slow = run(root, 'receipts/slow.log', 'receipts/fault.diff', node('-e', 'setTimeout(() => {}, 60000)'), ['--timeout-ms', '500']);
    const out = JSON.parse(slow.stdout);
    expect(out.timedOut).toBe(true);
    expect(out.command.exitCode).toBeNull();
    const value = footer(root, 'receipts/slow.log');
    expect(value.exitCode).toBeNull();
    expect(value.patch).toMatchObject({ path: 'receipts/fault.diff', sha256: sha(join(root, 'receipts/fault.diff')) });
  });
});

describe('evidence.mjs run --patch polish (spec 27)', () => {
  it.skipIf(process.platform === 'win32')('[AC:spec-27-6] a SIGTERM while git apply runs ends with 143 and the tree restored', async () => {
    const root = project();
    const bin = join(root, 'receipts', 'bin');
    mkdirSync(bin, { recursive: true });
    const realGit = execFileSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).trim();
    const marker = join(root, 'receipts', 'applying');
    writeFileSync(join(bin, 'git'), `#!/bin/sh\nif [ "$1" = apply ] && [ "$2" = "--" ]; then touch '${marker}'; sleep 1; fi\nexec '${realGit}' "$@"\n`);
    chmodSync(join(bin, 'git'), 0o755);
    const child = spawn(process.execPath, [script, 'run', '--receipt', 'receipts/sig.log', '--patch', 'receipts/fault.diff', '--', process.execPath, 'check.mjs'],
      { cwd: root, env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }, stdio: 'ignore' });
    const exit = new Promise<number | null>(resolve => child.on('exit', code => resolve(code)));
    for (let waited = 0; !existsSync(marker) && waited < 10000; waited += 20) await new Promise(resolve => setTimeout(resolve, 20));
    expect(existsSync(marker)).toBe(true);
    child.kill('SIGTERM');
    expect(await exit).toBe(143);
    expect(spawnSync('git', ['diff', '--quiet'], { cwd: root }).status).toBe(0);
  }, 30000);

  it('[AC:spec-27-7] a change to another tracked file, a commit or a stash gives restored: false; the plain fault run stays true', () => {
    const commands = [
      node('-e', "require('fs').appendFileSync('check.mjs', '// more\\n')"),
      ['git', '-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-q', '--allow-empty', '-m', 'x'],
      ['git', '-c', 'user.name=t', '-c', 'user.email=t@example.com', 'stash', '-q'],
      // [review-27-5] a new branch at the same commit changes only the symbolic HEAD.
      ['git', 'checkout', '-q', '-b', 'other'],
    ];
    for (const command of commands) {
      const root = project();
      const result = run(root, 'receipts/r.log', 'receipts/fault.diff', command);
      expect(result.status, command.join(' ')).toBe(1);
      expect(JSON.parse(result.stdout).patch.restored, command.join(' ')).toBe(false);
    }
    const root = project();
    const plain = run(root, 'receipts/fault.log', 'receipts/fault.diff', node('check.mjs'));
    expect(JSON.parse(plain.stdout).patch.restored).toBe(true);
  }, 30000);

  it('[AC:spec-27-8] a project in a repository subfolder runs its fault; a patch outside the subfolder is refused', () => {
    const top = realpathSync(mkdtempSync(join(tmpdir(), 'jc-evidence-sub-')));
    dirs.push(top);
    const app = join(top, 'app');
    mkdirSync(join(app, 'receipts'), { recursive: true });
    mkdirSync(join(top, 'lib'));
    git(top, 'init', '-q');
    writeFileSync(join(app, '.gitignore'), 'receipts/\n');
    writeFileSync(join(app, 'add.mjs'), good);
    writeFileSync(join(app, 'check.mjs'), check);
    writeFileSync(join(top, 'lib/other.mjs'), good);
    git(top, 'add', '.');
    git(top, 'commit', '-q', '-m', 'init');
    writeFileSync(join(app, 'add.mjs'), bad);
    writeFileSync(join(app, 'receipts/fault.diff'), git(top, 'diff', '--', 'app/add.mjs'));
    git(top, 'checkout', '--', 'app/add.mjs');
    writeFileSync(join(top, 'lib/other.mjs'), bad);
    writeFileSync(join(app, 'receipts/other.diff'), git(top, 'diff', '--', 'lib/other.mjs'));
    git(top, 'checkout', '--', 'lib/other.mjs');

    const result = run(app, 'receipts/fault.log', 'receipts/fault.diff', node('check.mjs'));
    expect(result.status).toBe(1);
    const out = JSON.parse(result.stdout);
    expect(out.command.exitCode).toBe(1);
    expect(out.patch.restored).toBe(true);
    expect(readFileSync(join(app, 'receipts/fault.log'), 'utf8')).toContain('add is wrong');

    const outside = run(app, 'receipts/other.log', 'receipts/other.diff', node('check.mjs'));
    expect(outside.status).toBe(2);
    expect(outside.stderr).toContain('lib/other.mjs');
    expect(git(top, 'status', '--porcelain')).toBe('');
  }, 30000);
});
