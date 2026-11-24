import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { applyInstall, checkWiring, formatWiring, planInstall, WIRING_SENTENCE } from '../src/install-v1.js';

// Spec 10 (install-entry-files): init, update and doctor report an unwired
// project and never write AGENTS.md or CLAUDE.md. Spec sl3-02: the one exception,
// `update` rewrites the text between Joycraft's markers in AGENTS.md.
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

const entryCheck = join(repo, 'payload/.joycraft/runtime/entry-check.mjs');
const currentBlock = () => execFileSync(process.execPath, [entryCheck, 'block'], { encoding: 'utf8' }).replace(/\n$/, '');
// The block that Joycraft 1.9.4 installed.
const BLOCK_194 = [
  '<!-- joycraft:managed -->',
  '- First action in each session: run `node .joycraft/runtime/update-check.mjs check`. If it prints JSON, follow `.joycraft/references/update.md`.',
  "- Ask a person to answer or approve anything only through Joycraft's decision artifact (`node .joycraft/runtime/artifacts/cli.mjs`, see `.joycraft/references/artifacts.md#asking-questions`), in the project's question style. Every page that shows a person a document, a question or a decision comes from that engine: never write your own HTML page for one. Show every other document a person must read (a plan, spec set, report or review) as an engine page (`--doc`), never only as Markdown in chat, where the person works (see `.joycraft/references/artifacts.md#showing-a-page`), and say where it is.",
  '- A Context Map row that matches your next step binds: read that page first, and again after a compaction or in a new agent. A record (a log or history) is an audit trail: search it to learn why or when; do not read it at the start.',
  '- When a fact here disagrees with the code, trust the code and report it. A rule holds even when the code breaks it.',
  '- Search the mapped pages first. A doc that no map row reaches is working material, not current truth.',
  '<!-- /joycraft:managed -->',
].join('\n');
const ABOVE = '# App\n\nMy own rules above.\n\n';
const BELOW = '\n\n## Context Map\n\n| Document | Read it when… |\n|---|---|\n| `docs/architecture.md` | Changing modules |\n\nMy notes below.\n';
const UPDATED_LINE = /^Updated Joycraft's block in AGENTS\.md \(lines (\d+)–(\d+)\)\. The previous file is in (\S+)\/\.$/m;

const bytes = (dir: string, path: string) => (existsSync(join(dir, path)) ? readFileSync(join(dir, path), 'utf8') : null);

describe('spec 10: init, update and doctor report an unwired project', () => {
  it('init on a bare project prints the findings and the sentence; AGENTS.md and CLAUDE.md bytes are unchanged', () => {
    const dir = project({ 'AGENTS.md': UNWIRED_AGENTS, 'CLAUDE.md': UNWIRED_CLAUDE });
    const result = run(dir, 'init', '.', '--harness', 'claude', '--yes');
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(`"${WIRING_SENTENCE}"`);
    expect(result.stdout).toMatch(/AGENTS\.md has no Joycraft block/);
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

describe('sl3-02: update refreshes the managed block', () => {
  const installed = (agents: string) => {
    const dir = project({ 'AGENTS.md': agents });
    expect(run(dir, 'init', '.', '--harness', 'codex', '--yes').status).toBe(0);
    return dir;
  };

  it('[AC:sl3-02-rewrite] [AC:sl3-02-backup-line] update --yes replaces the 1.9.4 block and keeps every byte outside the markers', () => {
    const before = `${ABOVE}${BLOCK_194}${BELOW}`;
    const dir = installed(before);
    expect(bytes(dir, 'AGENTS.md'), 'init leaves the block').toBe(before);
    rmSync(join(dir, '.joycraft/runtime/scope.mjs'));
    const result = run(dir, 'update', '.', '--yes');
    expect(result.status, result.stderr).toBe(0);
    expect(bytes(dir, 'AGENTS.md')).toBe(`${ABOVE}${currentBlock()}${BELOW}`);
    const lines = result.stdout.split('\n').filter((line) => UPDATED_LINE.test(line));
    expect(lines).toHaveLength(1);
    const [, a, b, backup] = UPDATED_LINE.exec(lines[0])!;
    expect([Number(a), Number(b)]).toEqual([5, 4 + currentBlock().split('\n').length]);
    expect(result.stdout).toContain(`Previous files are in ${backup}/.`);
    expect(bytes(dir, join(backup, 'files', 'AGENTS.md'))).toBe(before);
    expect(JSON.parse(run(dir, 'update', '.', '--yes', '--json').stdout).managedBlock).toEqual({ updated: false, backup: null, lines: null });
  });

  it('[AC:sl3-02-rewrite] CRLF line endings stay CRLF, inside and outside the block', () => {
    const crlf = (text: string) => text.replace(/\n/g, '\r\n');
    const dir = installed(crlf(`${ABOVE}${BLOCK_194}${BELOW}`));
    expect(run(dir, 'update', '.', '--yes').status).toBe(0);
    expect(bytes(dir, 'AGENTS.md')).toBe(crlf(`${ABOVE}${currentBlock()}${BELOW}`));
  });

  it('[AC:sl3-02-noop-update] with no payload change, update still rewrites a stale block and reports it in --json', () => {
    const dir = installed(`${ABOVE}${BLOCK_194}${BELOW}`);
    const result = JSON.parse(run(dir, 'update', '.', '--yes', '--json').stdout);
    expect(result.status).toBe('noop');
    expect(result.managedBlock).toMatchObject({ updated: true, lines: [5, expect.any(Number)] });
    expect(bytes(dir, join(result.managedBlock.backup, 'files', 'AGENTS.md'))).toBe(`${ABOVE}${BLOCK_194}${BELOW}`);
    expect(bytes(dir, 'AGENTS.md')).toBe(`${ABOVE}${currentBlock()}${BELOW}`);
    expect(result.wiring.findings.map((finding: { check: string }) => finding.check)).not.toContain('managed-block');
  });

  it('[AC:sl3-02-no-touch] no markers, one marker, a fenced block, a current block, init and --plan leave AGENTS.md as it is', () => {
    const [open] = BLOCK_194.split('\n');
    const cases = {
      'no markers': UNWIRED_AGENTS,
      'one marker': `${ABOVE}${BLOCK_194.split('\n').slice(0, -1).join('\n')}${BELOW}`,
      'fenced block': `${ABOVE}\`\`\`md\n${BLOCK_194}\n\`\`\`${BELOW}`,
      'closing before opening': `${ABOVE}<!-- /joycraft:managed -->\n- old\n${open}${BELOW}`,
      'current block': `${ABOVE}${currentBlock()}${BELOW}`,
    };
    for (const [name, text] of Object.entries(cases)) {
      const dir = installed(text);
      expect(bytes(dir, 'AGENTS.md'), `${name}: init`).toBe(text);
      const result = run(dir, 'update', '.', '--yes');
      expect(result.status, `${name}: ${result.stderr}`).toBe(0);
      expect(result.stdout, name).not.toMatch(UPDATED_LINE);
      expect(bytes(dir, 'AGENTS.md'), name).toBe(text);
    }
    const stale = `${ABOVE}${BLOCK_194}${BELOW}`;
    const dir = project({ 'AGENTS.md': stale });
    expect(run(dir, 'init', '.', '--harness', 'codex', '--yes').status).toBe(0);
    expect(run(dir, 'init', '.', '--harness', 'codex', '--yes').status).toBe(0);
    const plan = run(dir, 'update', '.', '--plan');
    expect(plan.stdout).toContain("Will update Joycraft's block in AGENTS.md");
    expect(JSON.parse(run(dir, 'update', '.', '--plan', '--json').stdout).managedBlock).toMatchObject({ updated: true, lines: [5, expect.any(Number)] });
    expect(bytes(dir, 'AGENTS.md')).toBe(stale);
    expect(existsSync(join(dir, '.joycraft-backups'))).toBe(false);
  });

  it('[AC:fix-1-10-1-plan] update --plan says what update --yes then does to the block, and a current block plans no change', () => {
    const dir = installed(`${ABOVE}${BLOCK_194}${BELOW}`);
    const plan = JSON.parse(run(dir, 'update', '.', '--plan', '--json').stdout).managedBlock;
    expect(plan).toEqual({ updated: true, backup: '.joycraft-backups/update-<time>', lines: [5, 4 + currentBlock().split('\n').length] });
    const human = run(dir, 'update', '.', '--plan').stdout;
    expect(human).toContain(`Will update Joycraft's block in AGENTS.md (lines 5–${4 + currentBlock().split('\n').length}). The previous file goes to .joycraft-backups/update-<time>/.`);
    expect(bytes(dir, 'AGENTS.md')).toBe(`${ABOVE}${BLOCK_194}${BELOW}`);
    const applied = JSON.parse(run(dir, 'update', '.', '--yes', '--json').stdout).managedBlock;
    expect(applied).toMatchObject({ updated: true, lines: plan.lines, backup: expect.stringMatching(/^\.joycraft-backups\/update-/) });
    expect(JSON.parse(run(dir, 'update', '.', '--plan', '--json').stdout).managedBlock).toEqual({ updated: false, backup: null, lines: null });
    expect(run(dir, 'update', '.', '--plan').stdout).not.toContain("Joycraft's block");
  });

  it('[AC:fix-1-10-1-guard] a project guard that every backticked page in AGENTS.md exists stays green after update from a 1.9 block', () => {
    // The field guard: each backticked .md path in AGENTS.md (anchor dropped) names a file.
    const guard = (dir: string) => [...bytes(dir, 'AGENTS.md')!.matchAll(/`([^`\s]+?\.md)(?:#[^`\s]*)?`/g)]
      .map((match) => match[1]).filter((page) => !existsSync(join(dir, page)));
    const dir = installed(`${ABOVE}${BLOCK_194}${BELOW}`);
    mkdirSync(join(dir, 'docs'), { recursive: true });
    writeFileSync(join(dir, 'docs/architecture.md'), '# Architecture\n');
    expect(guard(dir), 'green before the update').toEqual([]);
    const result = run(dir, 'update', '.', '--yes');
    expect(result.status, result.stderr).toBe(0);
    expect(bytes(dir, 'AGENTS.md')).toBe(`${ABOVE}${currentBlock()}${BELOW}`);
    expect(guard(dir)).toEqual([]);
    expect(result.stdout).not.toContain('which this project does not have');
    // The guard bites: the 1.10.0 Close line named a fixed traps page.
    writeFileSync(join(dir, 'AGENTS.md'), `${bytes(dir, 'AGENTS.md')}\nAdd a trap to \`docs/context/traps.md\`.\n`);
    expect(guard(dir)).toEqual(['docs/context/traps.md']);
  });
});
