import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// Spec: docs/features/2026-11-21-drift-tidy/specs/01-check-listing.md
const runtimeDir = join(__dirname, '..', 'payload', '.joycraft', 'runtime');
const cleanup = join(runtimeDir, 'cleanup.mjs');
const reference = join(__dirname, '..', 'payload', '.joycraft', 'references', 'cleanup.md');
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const run = (cwd: string, args: string[], env: NodeJS.ProcessEnv = process.env) => {
  try { return { status: 0, stdout: execFileSync('node', [cleanup, ...args], { cwd, encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (error) { const e = error as { status: number; stdout: string }; return { status: e.status, stdout: e.stdout }; }
};

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
const tempDir = (prefix: string) => { const dir = realpathSync(mkdtempSync(join(tmpdir(), prefix))); dirs.push(dir); return dir; };

function repo() {
  const root = tempDir('jc-cleanup-checks-');
  git(root, 'init', '-q', '-b', 'main');
  put(join(root, 'README.md'), 'x\n');
  git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'init');
  return root;
}

describe('cleanup lists its own checks', () => {
  it('[AC:spec-1-1] --checks prints one line per check, and the ids equal every check id the source can emit', () => {
    const out = run(tmpdir(), ['--checks']);
    expect(out.status).toBe(0);
    const lines = out.stdout.trim().split('\n');
    for (const line of lines) expect(line).toMatch(/^[a-z-]+\t(report|mechanical)( gate)?\t\S/);
    const printed = lines.map(line => line.split('\t')[0]);
    expect(new Set(printed).size).toBe(printed.length);
    const source = readFileSync(cleanup, 'utf8');
    const emitted = new Set([...source.matchAll(/check: '([a-z-]+)'/g)].map(match => match[1]));
    expect([...printed].sort()).toEqual([...emitted].sort());
  });

  it('[AC:spec-1-2] cleanup.md has no check table and names cleanup.mjs --checks, with fewer words', () => {
    const text = readFileSync(reference, 'utf8');
    const ids = readFileSync(cleanup, 'utf8').matchAll(/check: '([a-z-]+)'/g);
    for (const [, id] of ids) expect(text, id).not.toMatch(new RegExp(`^\\|[^\\n]*\`${id}\``, 'm'));
    expect(text).not.toMatch(/^\|\s*Check\s*\|/m);
    expect(text).toContain('cleanup.mjs --checks');
    // 1,867 words before this spec.
    expect(text.split(/\s+/).filter(Boolean).length).toBeLessThan(1867);
  });

  it('[AC:spec-1-3] missing-path filters ignored paths with one check-ignore process', () => {
    const root = repo();
    put(join(root, '.gitignore'), 'ignored/\n');
    const spans = [
      ...Array.from({ length: 100 }, (_, index) => `\`ignored/file${index}.ts\``),
      ...Array.from({ length: 100 }, (_, index) => `\`src/gone${index}.ts\``),
    ];
    put(join(root, 'docs/context/guide.md'), `# Guide\n\n${spans.map(span => `- ${span}`).join('\n')}\n`);
    put(join(root, 'AGENTS.md'), '# A\n\n[guide](docs/context/guide.md)\n');
    git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'docs');
    // A git on PATH that logs each call, then runs the real git.
    const bin = tempDir('jc-fake-git-');
    const realGit = execFileSync('which', ['git'], { encoding: 'utf8' }).trim();
    const log = join(bin, 'calls.log');
    writeFileSync(join(bin, 'git'), `#!/bin/sh\necho "$1" >> "${log}"\nexec "${realGit}" "$@"\n`);
    chmodSync(join(bin, 'git'), 0o755);
    const started = Date.now();
    const out = run(root, [], { ...process.env, PATH: `${bin}:${process.env.PATH}` });
    expect(Date.now() - started).toBeLessThan(10000);
    const report = JSON.parse(out.stdout);
    const missing = report.findings.filter((item: { check: string }) => item.check === 'missing-path').map((item: { detail: string }) => item.detail);
    expect(missing).toHaveLength(100);
    for (const detail of missing) expect(detail).toMatch(/Names src\/gone\d+\.ts,/);
    const calls = readFileSync(log, 'utf8').split('\n').filter(line => line === 'check-ignore');
    expect(calls).toHaveLength(1);
  });

  it('[AC:spec-1-4] impact-drift asks to update the page or add a verified: line', () => {
    const root = repo();
    put(join(root, 'joycraft.yaml'), 'cleanup:\n  impact:\n    - source: src/**\n      docs: [docs/context/guide.md]\n');
    put(join(root, 'docs/context/guide.md'), '# Guide\n');
    put(join(root, 'AGENTS.md'), '# A\n\n[guide](docs/context/guide.md)\n');
    git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'docs');
    put(join(root, 'src/a.ts'), 'export const a = 1;\n');
    git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'code');
    const report = JSON.parse(run(root, []).stdout);
    const drift = report.findings.find((item: { check: string }) => item.check === 'impact-drift');
    expect(drift.fix).toContain('verified:');
    expect(drift.fix).not.toMatch(/unchanged/);
  });
});

describe('cleanup review fixes', () => {
  it('[review-a-4] a path beyond a symlink or in a submodule does not hide the other ignored paths', () => {
    const root = repo();
    put(join(root, '.gitignore'), 'ignored/\n');
    mkdirSync(join(root, 'real'));
    execFileSync('ln', ['-s', 'real', 'link'], { cwd: root });
    const sub = join(root, 'sub');
    mkdirSync(sub);
    git(sub, 'init', '-q'); put(join(sub, 'a.txt'), 'a\n'); git(sub, 'add', '.'); git(sub, 'commit', '-q', '-m', 'sub');
    put(join(root, 'AGENTS.md'), '# A\n\n- `link/gone.md`\n- `ignored/one.md`\n- `sub/gone.md`\n- `ignored/two.md`\n- `src/gone.ts`\n');
    git(root, 'add', '.gitignore', 'link', 'AGENTS.md'); git(root, 'add', 'sub'); git(root, 'commit', '-q', '-m', 'docs');
    const report = JSON.parse(run(root, []).stdout);
    const missing = report.findings.filter((item: { check: string }) => item.check === 'missing-path').map((item: { detail: string }) => item.detail);
    expect(missing.some((detail: string) => detail.includes('ignored/'))).toBe(false);
    expect(missing.some((detail: string) => detail.includes('src/gone.ts'))).toBe(true);
    expect(missing.some((detail: string) => detail.includes('link/gone.md'))).toBe(true);
  });

  it('[review-a-8] the header says only age-out --apply moves files', () => {
    const source = readFileSync(cleanup, 'utf8');
    expect(source.slice(0, 1200)).not.toMatch(/never edits a file/);
    expect(source.slice(0, 1200)).toContain('age-out --apply');
  });

  it('[review-a-9] cleanup.md and --checks keep the entry-check and temporal wording', () => {
    const text = readFileSync(reference, 'utf8').replace(/\s+/g, ' ');
    expect(text).toContain('nothing when they are clean');
    expect(text).toContain('one line for each gate finding');
    expect(run(repo(), ['--checks']).stdout).toMatch(/^temporal\t.*YYYY-MM-DD/m);
  });
});
