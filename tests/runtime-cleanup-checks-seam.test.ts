import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// Spec: docs/features/2026-11-21-drift-tidy/specs/10-checks-seam.md
const joycraft = join(__dirname, '..', 'payload', '.joycraft');
const runtime = (name: string) => join(joycraft, 'runtime', name);
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (root: string, file: string, body: string) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), body); };
const node = (root: string, args: string[]) => {
  try { return { status: 0, stdout: execFileSync('node', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), stderr: '' }; }
  catch (error) { const e = error as { status: number; stdout: string; stderr: string }; return e; }
};

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

function project(yaml: string) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-checks-seam-')));
  dirs.push(root);
  git(root, 'init', '-q', '-b', 'main');
  put(root, 'joycraft.yaml', yaml);
  put(root, 'lint.sh', 'echo "docs/context/a.md:3: Use the active voice."\necho "summary: 2 problems"\necho "./docs/b.md:12: Spelling: teh"\nexit 1\n');
  git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'init');
  return root;
}

describe('checks: in joycraft.yaml', () => {
  it('[AC:spec-10-1] config validation rejects an entry without run, naming run', () => {
    const root = project('checks:\n  - name: x\n');
    const out = node(root, [runtime('config.mjs')]);
    expect(out.status).not.toBe(0);
    expect(out.stderr).toMatch(/checks item 1 \(x\) needs run/);
    writeFileSync(join(root, 'joycraft.yaml'), 'checks:\n  - name: x\n    run: sh lint.sh\n');
    expect(JSON.parse(node(root, [runtime('config.mjs')]).stdout).checks).toEqual([{ name: 'x', run: 'sh lint.sh' }]);
  });

  it('[AC:spec-10-2] each path:line: message output line is a finding with the check name; other lines are ignored', () => {
    const root = project('checks:\n  - name: lint\n    run: sh lint.sh\n');
    const out = JSON.parse(node(root, [runtime('cleanup.mjs'), 'tidy']).stdout);
    const found = out.findings.filter((item: { check: string }) => item.check === 'lint');
    expect(found).toHaveLength(2);
    expect(found).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'docs/context/a.md', line: 3, detail: 'Use the active voice.' }),
      expect.objectContaining({ path: 'docs/b.md', line: 12, detail: 'Spelling: teh' }),
    ]));
  });

  it('[AC:spec-10-3] a command not found is one skipped entry and tidy exits 0', () => {
    const root = project('checks:\n  - name: ghost\n    run: definitely-not-a-tool-xyz --check\n');
    const out = node(root, [runtime('cleanup.mjs'), 'tidy']);
    expect(out.status).toBe(0);
    const json = JSON.parse(out.stdout);
    expect(json.skipped.filter((item: { check: string }) => item.check === 'ghost')).toHaveLength(1);
    expect(json.findings.filter((item: { check: string }) => item.check === 'ghost')).toEqual([]);
  });

  it('[AC:spec-10-4] settings.md and the template name checks:', () => {
    const settings = readFileSync(join(joycraft, 'references', 'settings.md'), 'utf8');
    expect(settings).toMatch(/drift, vale or docaudit[^\n]*`checks:`/);
    expect(readFileSync(join(joycraft, 'templates', 'joycraft.yaml'), 'utf8')).toMatch(/^# checks:/m);
  });
});
