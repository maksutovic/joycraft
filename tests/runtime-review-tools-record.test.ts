import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const script = join(__dirname, '..', 'payload', '.joycraft', 'runtime', 'review-tools.mjs');
const reviewTools = (cwd: string, ...args: string[]) => spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' });

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

function webApp() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-review-tools-')));
  dirs.push(root);
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'web', scripts: { dev: 'vite' } }));
  return root;
}

// sl1-05: an agent records the pick, so the row says "recorded choice", never that the user chose it.
describe('review-tools record (sl1-05)', () => {
  it('[AC:sl1-05-review-tools] a recorded pick says "recorded choice", never "chosen by the user"', () => {
    const root = webApp();
    const result = reviewTools(root, 'record', '--root', root, '--choose', '.=shotter', '--command', '.=node shot.mjs');
    expect(result.status, result.stderr).toBe(0);
    const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8');
    expect(agents).toContain('shotter: recorded choice');
    expect(agents).not.toContain('chosen by the user');
    expect(readFileSync(script, 'utf8')).not.toContain('chosen by the user');
  });

  it('[AC:sl1-05-review-tools] record --help prints the usage and exits 0', () => {
    const root = webApp();
    for (const args of [['record', '--help'], ['--help'], ['record', '--root', root, '-h']]) {
      const result = reviewTools(root, ...args);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain('Usage: review-tools.mjs plan|install|record');
      expect(result.stdout).toContain('--choose <package>=<tool>');
    }
  });
});
