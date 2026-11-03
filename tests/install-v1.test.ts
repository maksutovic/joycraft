import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { applyInstall, checkWiring, formatWiring, planInstall, WIRING_SENTENCE } from '../src/install-v1.js';

// Spec 10 (install-entry-files): init, update and doctor report an unwired
// project and never write AGENTS.md or CLAUDE.md.
const repo = join(__dirname, '..');
// Its own build folder, so it never races the other CLI test file's build.
const cli = join(repo, '.test-dist-wiring/cli.js');
const dirs: string[] = [];

beforeAll(() => {
  execFileSync(join(repo, 'node_modules/.bin/tsup'), ['src/cli.ts', '--format', 'esm', '--platform', 'node', '--out-dir', '.test-dist-wiring', '--no-config'], { cwd: repo, stdio: 'ignore' });
}, 120000);
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

const run = (dir: string, ...args: string[]) => spawnSync(process.execPath, [cli, ...args], { cwd: dir, encoding: 'utf8', input: '' });

const UNWIRED_AGENTS = '# App\n\nSome notes the team wrote.\n';
const UNWIRED_CLAUDE = '# Claude notes\n\nUse pnpm.\n';
const WIRED_AGENTS = [
  '# App', '',
  'At session start run `node .joycraft/runtime/update-check.mjs check`.', '',
  '## Context Map', '',
  '| Document | Read it when… |', '|---|---|',
  '| `docs/architecture.md` | Changing how modules talk to each other |', '',
].join('\n');
const WIRED_CLAUDE = '@AGENTS.md\n\n## Claude Code\n';

function project(files: Record<string, string> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'joycraft-wiring-'));
  dirs.push(dir);
  writeFileSync(join(dir, 'package.json'), '{"name":"app","scripts":{"test":"node --test"}}\n');
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

const bytes = (dir: string, path: string) => (existsSync(join(dir, path)) ? readFileSync(join(dir, path), 'utf8') : null);

describe('spec 10: init, update and doctor report an unwired project', () => {
  it('init on a bare project prints the findings and the sentence; AGENTS.md and CLAUDE.md bytes are unchanged', () => {
    const dir = project({ 'AGENTS.md': UNWIRED_AGENTS, 'CLAUDE.md': UNWIRED_CLAUDE });
    const result = run(dir, 'init', '.', '--harness', 'claude', '--yes');
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(`"${WIRING_SENTENCE}"`);
    expect(result.stdout).toMatch(/update-check\.mjs check/);
    expect(result.stdout).toMatch(/Context Map/);
    expect(result.stdout).toMatch(/@AGENTS\.md/);
    expect(bytes(dir, 'AGENTS.md')).toBe(UNWIRED_AGENTS);
    expect(bytes(dir, 'CLAUDE.md')).toBe(UNWIRED_CLAUDE);
  });

  it('init with no entry files reports them missing and creates neither', () => {
    const dir = project();
    const result = run(dir, 'init', '.', '--harness', 'claude,codex', '--yes', '--json');
    expect(result.status, result.stderr).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.wiring.wired).toBe(false);
    expect(output.wiring.findings.map((finding: { check: string }) => finding.check)).toEqual(['no-agents-md', 'no-claude-import']);
    expect(existsSync(join(dir, 'AGENTS.md'))).toBe(false);
    expect(existsSync(join(dir, 'CLAUDE.md'))).toBe(false);
  });

  it('update reports an unwired project, also when nothing changes', () => {
    const dir = project({ 'AGENTS.md': UNWIRED_AGENTS });
    expect(run(dir, 'init', '.', '--harness', 'codex', '--yes').status).toBe(0);
    const result = run(dir, 'update', '.', '--yes');
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toMatch(/up to date/);
    expect(result.stdout).toContain(`"${WIRING_SENTENCE}"`);
    expect(bytes(dir, 'AGENTS.md')).toBe(UNWIRED_AGENTS);
  });

  it('a wired project gets no sentence from init, update or doctor', () => {
    const dir = project({ 'AGENTS.md': WIRED_AGENTS, 'CLAUDE.md': WIRED_CLAUDE });
    for (const args of [['init', '.', '--harness', 'claude', '--yes'], ['update', '.', '--yes'], ['doctor', '.']]) {
      const result = run(dir, ...args);
      expect(result.status, `${args[0]}: ${result.stderr}`).toBe(0);
      expect(result.stdout, args[0]).not.toContain(WIRING_SENTENCE);
      expect(result.stdout, args[0]).not.toMatch(/not wired up|advice/);
    }
    expect(bytes(dir, 'AGENTS.md')).toBe(WIRED_AGENTS);
    expect(bytes(dir, 'CLAUDE.md')).toBe(WIRED_CLAUDE);
  });

  it('doctor lists each wiring finding as advice and exits 0 when the install is sound', () => {
    const dir = project({ 'AGENTS.md': UNWIRED_AGENTS });
    applyInstall(planInstall(dir, ['claude']));
    const result = run(dir, 'doctor', '.');
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/: ok/);
    expect(result.stdout.match(/^ {2}advice \(/gm)).toHaveLength(3);
    expect(result.stdout).toContain(`"${WIRING_SENTENCE}"`);
    const json = JSON.parse(run(dir, 'doctor', '.', '--json').stdout);
    expect(json.ok).toBe(true);
    expect(json.wiring.findings.map((finding: { check: string }) => finding.check)).toEqual(['no-joycraft-lines', 'no-context-map', 'no-claude-import']);
  });

  it('doctor exit code reflects only install problems, not wiring', () => {
    const wired = project({ 'AGENTS.md': WIRED_AGENTS, 'CLAUDE.md': WIRED_CLAUDE });
    applyInstall(planInstall(wired, ['claude']));
    rmSync(join(wired, '.joycraft/runtime/scope.mjs'));
    const broken = run(wired, 'doctor', '.');
    expect(broken.status).toBe(1);
    expect(broken.stdout).toMatch(/missing: \.joycraft\/runtime\/scope\.mjs/);
    expect(broken.stdout).not.toContain(WIRING_SENTENCE);
  });

  it('--plan --json includes a wiring field and writes nothing', () => {
    const dir = project({ 'AGENTS.md': UNWIRED_AGENTS });
    const result = run(dir, 'init', '.', '--harness', 'claude', '--plan', '--json');
    expect(result.status, result.stderr).toBe(0);
    const plan = JSON.parse(result.stdout);
    expect(plan.actions.length).toBeGreaterThan(0);
    expect(plan.wiring).toMatchObject({ wired: false, advice: [] });
    expect(plan.wiring.findings.map((finding: { check: string }) => finding.check)).toEqual(['no-joycraft-lines', 'no-context-map', 'no-claude-import']);
    expect(run(dir, 'init', '.', '--harness', 'claude', '--plan').stdout).toContain('After this install');
    expect(existsSync(join(dir, '.joycraft'))).toBe(false);
    expect(bytes(dir, 'AGENTS.md')).toBe(UNWIRED_AGENTS);
    const wired = project({ 'AGENTS.md': WIRED_AGENTS });
    expect(JSON.parse(run(wired, 'init', '.', '--harness', 'codex', '--plan', '--json').stdout).wiring).toMatchObject({ wired: true, findings: [] });
  });

  it('checkWiring runs the package copy, never the project copy', async () => {
    const dir = project({ 'AGENTS.md': WIRED_AGENTS });
    expect(await checkWiring(dir)).toMatchObject({ wired: true });
    applyInstall(planInstall(dir, ['codex']));
    writeFileSync(join(dir, '.joycraft/runtime/wiring.mjs'), 'globalThis.projectWiringRan = true; throw new Error("project code");\n');
    expect(await checkWiring(dir)).toMatchObject({ wired: true });
    expect((globalThis as { projectWiringRan?: boolean }).projectWiringRan).toBeUndefined();
  });

  it('reports areas setup has not mapped yet as advice without unwiring the project', async () => {
    const dir = project({ 'AGENTS.md': WIRED_AGENTS, 'docs/context/project.md': '# Project\n\n## Not yet mapped\n\n- `services/billing/`\n' });
    const wiring = await checkWiring(dir);
    expect(wiring?.wired).toBe(true);
    expect(wiring?.advice.map((item) => item.check)).toEqual(['unmapped-areas']);
    expect(formatWiring(wiring).join('\n')).toContain('Not mapped yet');
  });
});
