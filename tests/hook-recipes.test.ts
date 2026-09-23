import { describe, it, expect, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = join(__dirname, '..');
const HOOKS_DIR = join(ROOT, 'src', 'templates', 'hooks');

const EXPECTED_FILES = [
  'README.md',
  'exit-code-gate.sh',
  'plan-sync-on-completion.sh',
  'protected-path-guard.sh',
  'test-file-lock.sh',
];
const RECIPES = EXPECTED_FILES.filter((file) => file.endsWith('.sh'));

function read(file: string): string {
  return readFileSync(join(HOOKS_DIR, file), 'utf-8');
}

/** Script body with comment lines removed, so documentation never trips the command checks. */
function code(file: string): string {
  return read(file)
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n');
}

const HAS_JQ = spawnSync('jq', ['--version']).status === 0;

function run(file: string, payload: unknown, env: Record<string, string> = {}, cwd = ROOT) {
  const result = spawnSync('sh', [join(HOOKS_DIR, file)], {
    input: JSON.stringify(payload),
    encoding: 'utf-8',
    cwd,
    env: { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: process.env.HOME ?? '', ...env },
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe('hook recipes: files exist', () => {
  it('src/templates/hooks contains exactly the five expected files', () => {
    expect(existsSync(HOOKS_DIR), `${HOOKS_DIR} should exist`).toBe(true);
    expect(readdirSync(HOOKS_DIR).sort()).toEqual(EXPECTED_FILES);
  });
});

describe('hook recipes: POSIX shell, jq, and claude only', () => {
  for (const file of RECIPES) {
    it(`${file} is a POSIX sh script that parses cleanly`, () => {
      expect(read(file).startsWith('#!/bin/sh\n'), `${file} shebang`).toBe(true);
      const syntax = spawnSync('sh', ['-n', join(HOOKS_DIR, file)], { encoding: 'utf-8' });
      expect(syntax.status, syntax.stderr).toBe(0);
    });

    it(`${file} invokes no package manager, interpreter, or network tool`, () => {
      const body = code(file);
      expect(body).not.toMatch(/\b(npm|npx|pnpm|yarn|pip3?|node|python3?|ruby|perl|curl|wget|deno|bun)\b/);
      expect(body).not.toMatch(/\[\[/); // bash-only test syntax
    });

    it(`${file} checks for jq up front and degrades to allow when it is missing`, () => {
      expect(code(file)).toMatch(/command -v jq/);
    });
  }

  it('adds no runtime dependency to package.json', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8')) as { dependencies?: Record<string, string> };
    const deps = Object.keys(pkg.dependencies ?? {});
    expect(deps.some((dep) => /jq|claude|hook/i.test(dep))).toBe(false);
  });
});

describe('hook recipes: exit-code contract', () => {
  for (const file of ['exit-code-gate.sh', 'README.md']) {
    it(`${file} documents exit 0 allow, exit 1 warn/ask, exit 2 block`, () => {
      const content = read(file);
      expect(content).toMatch(/exit 0[^\n]*allow/i);
      expect(content).toMatch(/exit 1[^\n]*(warn|ask)/i);
      expect(content).toMatch(/exit 2[^\n]*block/i);
    });
  }

  it('exit-code-gate.sh demonstrates all three exits in code', () => {
    const body = code('exit-code-gate.sh');
    expect(body).toMatch(/exit 0/);
    expect(body).toMatch(/exit 1/);
    expect(body).toMatch(/exit 2/);
  });
});

describe('hook recipes: hook events and wiring', () => {
  it('the plan-sync recipe is a Stop hook that reads stdin with jq and calls claude -p', () => {
    const content = read('plan-sync-on-completion.sh');
    expect(content).toMatch(/\bStop\b/);
    expect(code('plan-sync-on-completion.sh')).toMatch(/\bjq\b/);
    expect(code('plan-sync-on-completion.sh')).toMatch(/claude -p/);
  });

  for (const file of ['protected-path-guard.sh', 'test-file-lock.sh']) {
    it(`${file} is a PreToolUse Edit|Write hook`, () => {
      const content = read(file);
      expect(content).toMatch(/PreToolUse/);
      expect(content).toContain('Edit|Write');
    });
  }

  it('the test-file lock documents the bugfix-active signal in-file', () => {
    const content = read('test-file-lock.sh');
    expect(content).toContain('JOYCRAFT_BUGFIX_ACTIVE');
    expect(content).toContain('.claude/bugfix-active');
  });

  it('README names every recipe with its hook event and a settings.json fragment', () => {
    const readme = read('README.md');
    for (const recipe of RECIPES) expect(readme).toContain(recipe);
    expect(readme).toMatch(/plan-sync-on-completion\.sh[\s\S]*?"Stop"/);
    expect(readme).toMatch(/"PreToolUse"[\s\S]*?"matcher": "Edit\|Write"[\s\S]*?protected-path-guard\.sh/);
    expect(readme).toMatch(/"PreToolUse"[\s\S]*?"matcher": "Edit\|Write"[\s\S]*?test-file-lock\.sh/);
    expect(readme).toContain('.claude/settings.json');
    // Every fenced json block parses, so the fragments are copy-pasteable.
    const blocks = [...readme.matchAll(/```json\n([\s\S]*?)```/g)].map((match) => match[1]);
    expect(blocks.length).toBeGreaterThanOrEqual(3);
    for (const block of blocks) expect(() => JSON.parse(block)).not.toThrow();
  });

  it('README says Joycraft never registers the recipes and separates them from generated hooks', () => {
    const readme = read('README.md');
    expect(readme).toMatch(/Joycraft never registers/i);
    expect(readme).toMatch(/deliberate/i);
    expect(readme).toContain('.claude/hooks/joycraft/block-dangerous.sh');
    expect(readme).toContain('.claude/hooks/joycraft-version-check.mjs');
    expect(readme).toMatch(/chmod \+x/);
  });
});

describe('hook recipes: no absolute or repo paths', () => {
  for (const file of EXPECTED_FILES) {
    it(`${file} uses project-relative paths only`, () => {
      const content = read(file);
      expect(content).not.toMatch(/\/Users\//);
      expect(content).not.toMatch(/joycraft\/src/);
      expect(content).not.toMatch(/joycraft-scenarios/);
    });
  }
});

describe.skipIf(!HAS_JQ)('hook recipes: behavior', () => {
  const project = join(tmpdir(), `joycraft-hook-recipes-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(join(project, 'tests'), { recursive: true });
  mkdirSync(join(project, 'src'), { recursive: true });
  writeFileSync(join(project, 'tests', 'math.test.ts'), 'test\n');
  writeFileSync(join(project, 'src', 'math.ts'), 'code\n');
  const env = { CLAUDE_PROJECT_DIR: project };
  const edit = (filePath: string) => ({ hook_event_name: 'PreToolUse', tool_name: 'Edit', cwd: project, tool_input: { file_path: filePath } });

  afterAll(() => rmSync(project, { recursive: true, force: true }));

  it('protected-path guard blocks a matching path with exit 2 and a stderr reason', () => {
    const result = run('protected-path-guard.sh', edit(join(project, '.env')), env, project);
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/protected/i);
  });

  it('protected-path guard allows a path that matches nothing', () => {
    expect(run('protected-path-guard.sh', edit(join(project, 'src', 'math.ts')), env, project).status).toBe(0);
  });

  it('protected-path guard with an empty pattern list is a no-op', () => {
    const result = run('protected-path-guard.sh', edit(join(project, '.env')), { ...env, PROTECTED_PATTERNS: '' }, project);
    expect(result.status).toBe(0);
  });

  it('test-file lock allows test edits when no bugfix is active', () => {
    expect(run('test-file-lock.sh', edit(join(project, 'tests', 'math.test.ts')), env, project).status).toBe(0);
  });

  it('test-file lock blocks an existing test file while JOYCRAFT_BUGFIX_ACTIVE is set', () => {
    const result = run('test-file-lock.sh', edit(join(project, 'tests', 'math.test.ts')), { ...env, JOYCRAFT_BUGFIX_ACTIVE: '1' }, project);
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/bugfix/i);
  });

  it('test-file lock blocks while the sentinel file exists and still allows source edits', () => {
    mkdirSync(join(project, '.claude'), { recursive: true });
    writeFileSync(join(project, '.claude', 'bugfix-active'), '');
    try {
      expect(run('test-file-lock.sh', edit(join(project, 'tests', 'math.test.ts')), env, project).status).toBe(2);
      expect(run('test-file-lock.sh', edit(join(project, 'src', 'math.ts')), env, project).status).toBe(0);
    } finally {
      rmSync(join(project, '.claude', 'bugfix-active'));
    }
  });

  it('exit-code gate returns 0, 1, and 2 for allow, warn, and block examples', () => {
    const bash = (command: string) => ({ hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd: project, tool_input: { command } });
    expect(run('exit-code-gate.sh', bash('ls'), env, project).status).toBe(0);
    const warn = run('exit-code-gate.sh', bash('git push origin feature/x'), env, project);
    expect(warn.status).toBe(1);
    expect(warn.stderr.length).toBeGreaterThan(0);
    const block = run('exit-code-gate.sh', bash('git push --force origin main'), env, project);
    expect(block.status).toBe(2);
    expect(block.stderr.length).toBeGreaterThan(0);
  });

  it('plan-sync exits 0 when the claude CLI is unavailable', () => {
    const result = run(
      'plan-sync-on-completion.sh',
      { hook_event_name: 'Stop', session_id: 'x', cwd: project, stop_hook_active: false },
      { ...env, PATH: '/usr/bin:/bin:/opt/homebrew/bin', CLAUDE_BIN: 'claude-not-installed-here' },
      project,
    );
    expect(result.status).toBe(0);
  });
});
