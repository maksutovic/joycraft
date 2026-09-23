import { describe, it, expect, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TEMPLATES } from '../src/bundled-files';

const ROOT = join(__dirname, '..');
const EVALS_DIR = join(ROOT, 'src', 'templates', 'evals');

const EXPECTED_FILES = ['README.md', 'agent-evals.yml', 'check.sh', 'example-task.json'];

function read(file: string): string {
  return readFileSync(join(EVALS_DIR, file), 'utf-8');
}

/** Script body with comment lines removed, so documentation never trips the command checks. */
function code(file: string): string {
  return read(file)
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n');
}

describe('evals scaffold: files exist', () => {
  it('src/templates/evals contains exactly the four expected files', () => {
    expect(existsSync(EVALS_DIR), `${EVALS_DIR} should exist`).toBe(true);
    expect(readdirSync(EVALS_DIR).sort()).toEqual(EXPECTED_FILES);
  });
});

describe('evals scaffold: recorded-task shape', () => {
  it('example-task.json parses and carries id, prompt, fixture, assertions, and a pass criterion', () => {
    const task = JSON.parse(read('example-task.json')) as Record<string, unknown>;
    expect(typeof task.id).toBe('string');
    expect(typeof task.prompt).toBe('string');
    expect(typeof task.fixture).toBe('string');
    expect(Array.isArray(task.assertions)).toBe(true);
    expect((task.assertions as unknown[]).length).toBeGreaterThan(0);
    expect(typeof task.pass_gate).toBe('number');
  });

  it('example-task.json is marked as sample content to replace', () => {
    expect(read('example-task.json')).toMatch(/sample|replace/i);
  });
});

describe('evals scaffold: check.sh runtime surface', () => {
  it('is a POSIX sh script that parses cleanly', () => {
    expect(read('check.sh').startsWith('#!/bin/sh\n')).toBe(true);
    const syntax = spawnSync('sh', ['-n', join(EVALS_DIR, 'check.sh')], { encoding: 'utf-8' });
    expect(syntax.status, syntax.stderr).toBe(0);
  });

  it('invokes no package manager, interpreter, or network tool', () => {
    const body = code('check.sh');
    expect(body).not.toMatch(/\b(npm|npx|pnpm|yarn|pip3?|node|python3?|ruby|perl|curl|wget|deno|bun)\b/);
    expect(body).not.toMatch(/\[\[/);
    expect(body).toMatch(/\bjq\b/);
    expect(body).toMatch(/claude -p/);
  });

  it('fails loudly when jq is missing', () => {
    expect(code('check.sh')).toMatch(/command -v jq/);
    expect(code('check.sh')).toMatch(/jq required/);
  });

  it('prints a pass rate and compares it against the declared gate', () => {
    const body = code('check.sh');
    expect(body).toMatch(/pass rate/i);
    expect(body).toMatch(/pass_gate/);
    expect(body).toMatch(/exit 1/);
  });

  it('adds no runtime dependency to package.json', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8')) as { dependencies?: Record<string, string> };
    expect(Object.keys(pkg.dependencies ?? {}).some((dep) => /jq|claude|eval/i.test(dep))).toBe(false);
  });
});

describe('evals scaffold: workflow triggers', () => {
  it('agent-evals.yml has a schedule trigger and a harness-file paths filter', () => {
    const yml = read('agent-evals.yml');
    expect(yml).toMatch(/^\s*schedule:/m);
    expect(yml).toMatch(/^\s*(push|pull_request):/m);
    expect(yml).toMatch(/^\s*paths:/m);
    for (const path of ['CLAUDE.md', 'AGENTS.md', '.claude/**', '.agents/skills/**', '.claude/hooks/**']) {
      expect(yml, path).toContain(`'${path}'`);
    }
  });

  it('agent-evals.yml runs check.sh and uses no Joycraft-specific secret', () => {
    const yml = read('agent-evals.yml');
    expect(yml).toContain('docs/templates/evals/check.sh');
    const secrets = [...yml.matchAll(/secrets\.([A-Z0-9_]+)/g)].map((m) => m[1]);
    expect(secrets.length).toBeGreaterThan(0);
    for (const secret of secrets) expect(secret).not.toMatch(/JOYCRAFT/);
  });
});

describe('evals scaffold: README', () => {
  it('states the workflow is copied into .github/workflows/ by hand and no Joycraft command installs it', () => {
    const readme = read('README.md');
    expect(readme).toMatch(/copy[^\n]*\.github\/workflows\/[^\n]*by hand/i);
    expect(readme).toMatch(/no Joycraft command installs/i);
  });

  it('states the rule that every bugfix seeds an eval', () => {
    expect(read('README.md')).toMatch(/every bugfix seeds an eval/i);
  });
});

describe('evals scaffold: no absolute or repo paths', () => {
  for (const file of EXPECTED_FILES) {
    it(`${file} uses project-relative paths only`, () => {
      const content = read(file);
      expect(content).not.toMatch(/\/Users\//);
      expect(content).not.toMatch(/joycraft\/src/);
    });
  }

  it('never mentions the holdout scenarios repo', () => {
    for (const file of EXPECTED_FILES) expect(read(file), file).not.toMatch(/joycraft-scenarios|scenarios-dispatch/);
  });
});

describe('evals scaffold: bugfix skill reminder', () => {
  it('the canonical bugfix skill points at docs/templates/evals/README.md', () => {
    expect(readFileSync(join(ROOT, 'src', 'skills', 'joycraft-bugfix.md'), 'utf-8')).toContain('docs/templates/evals/README.md');
  });

  for (const variant of ['claude-skills', 'codex-skills', 'pi-skills', 'copilot-skills', 'omp-skills']) {
    it(`the generated ${variant} bugfix skill carries the reminder`, () => {
      expect(readFileSync(join(ROOT, 'src', variant, 'joycraft-bugfix.md'), 'utf-8')).toContain('docs/templates/evals/README.md');
    });
  }
});

describe('evals scaffold: init-autofix prefix hazard', () => {
  it('the scaffold ships under evals/ bundle keys', () => {
    for (const file of EXPECTED_FILES) expect(Object.keys(TEMPLATES)).toContain(`evals/${file}`);
  });

  it('no TEMPLATES key naming agent-evals starts with workflows/ or scenarios/', () => {
    const keys = Object.keys(TEMPLATES).filter((key) => key.includes('agent-evals') || key.startsWith('evals/'));
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) expect(key).not.toMatch(/^(workflows|scenarios)\//);
  });
});

const HAS_JQ = spawnSync('jq', ['--version']).status === 0;

describe.skipIf(!HAS_JQ)('evals scaffold: check.sh behavior with a stub claude', () => {
  const sandbox = join(tmpdir(), `joycraft-evals-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const bin = join(sandbox, 'bin');
  const project = join(sandbox, 'project');
  const tasks = join(project, 'tasks');
  mkdirSync(bin, { recursive: true });
  mkdirSync(join(project, 'fx'), { recursive: true });
  mkdirSync(tasks, { recursive: true });
  writeFileSync(join(project, 'fx', 'CLAUDE.md'), '# fixture\n');
  afterAll(() => rmSync(sandbox, { recursive: true, force: true }));

  function stubClaude(body: string): void {
    writeFileSync(join(bin, 'claude'), `#!/bin/sh\n${body}\n`);
    chmodSync(join(bin, 'claude'), 0o755);
  }
  function writeTask(name: string, task: unknown): void {
    writeFileSync(join(tasks, name), JSON.stringify(task));
  }
  function clearTasks(): void {
    for (const file of readdirSync(tasks)) rmSync(join(tasks, file));
  }
  function run(path = `${bin}:${process.env.PATH ?? '/usr/bin:/bin'}`) {
    const result = spawnSync('/bin/sh', [join(EVALS_DIR, 'check.sh'), 'tasks'], { cwd: project, encoding: 'utf-8', env: { PATH: path, HOME: process.env.HOME ?? '' } });
    return { status: result.status, out: result.stdout + result.stderr };
  }
  const example = () => ({ ...(JSON.parse(read('example-task.json')) as Record<string, unknown>), fixture: 'fx' });

  it('an empty task directory reports zero tasks and exits 0', () => {
    clearTasks();
    stubClaude('echo "pnpm test"');
    const result = run();
    expect(result.status, result.out).toBe(0);
    expect(result.out).toMatch(/0 tasks/);
  });

  it('the example task passes against a matching reply and prints a pass rate', () => {
    clearTasks();
    stubClaude('echo "pnpm test"');
    writeTask('example.json', example());
    const result = run();
    expect(result.status, result.out).toBe(0);
    expect(result.out).toMatch(/Pass rate: 100%/);
  });

  it('exits non-zero when the observed pass rate is below the gate', () => {
    clearTasks();
    stubClaude('echo "no idea"');
    writeTask('example.json', example());
    const result = run();
    expect(result.status, result.out).toBe(1);
    expect(result.out).toMatch(/Pass rate: 0%/);
    expect(result.out).toMatch(/FAIL example-test-command/);
  });

  it('counts a task with malformed assertions as a failure, names it, and keeps going', () => {
    clearTasks();
    stubClaude('echo "pnpm test"');
    writeTask('a-bad.json', { id: 'bad-task', prompt: 'x', fixture: 'fx', assertions: [{ type: 'nope', value: '1' }], pass_gate: 1 });
    writeTask('b-good.json', example());
    const result = run();
    expect(result.status, result.out).toBe(1);
    expect(result.out).toMatch(/FAIL bad-task: malformed assertions/);
    expect(result.out).toMatch(/PASS example-test-command/);
  });

  it('surfaces the claude CLI error and exits non-zero when claude -p fails', () => {
    clearTasks();
    stubClaude('echo "Not logged in" >&2; exit 1');
    writeTask('example.json', example());
    const result = run();
    expect(result.status).not.toBe(0);
    expect(result.out).toMatch(/Not logged in/);
  });

  it('exits non-zero with "jq required" when jq is absent', () => {
    const nojq = join(sandbox, 'nojq');
    mkdirSync(nojq, { recursive: true });
    for (const tool of ['dirname', 'mktemp', 'rm']) {
      const found = spawnSync('sh', ['-c', `command -v ${tool}`], { encoding: 'utf-8' }).stdout.trim();
      if (found && !existsSync(join(nojq, tool))) symlinkSync(found, join(nojq, tool));
    }
    const result = run(nojq);
    expect(result.status).not.toBe(0);
    expect(result.out).toMatch(/jq required/);
  });
});
