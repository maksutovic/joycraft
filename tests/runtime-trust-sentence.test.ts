import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// drift-tidy spec 5: the managed block tells agents which docs to trust.
const repo = join(__dirname, '..');
const entryCheck = join(repo, 'payload', '.joycraft', 'runtime', 'entry-check.mjs');
const sentence = 'Search the mapped pages first. A doc that no map row reaches is working material, not current truth.';
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const run = (...args: string[]) => spawnSync(process.execPath, [entryCheck, ...args], { encoding: 'utf8' });

// The four-line block that 1.8.1 generated.
const oldBlock = [
  '<!-- joycraft:managed -->',
  '- First action in each session: run `node .joycraft/runtime/update-check.mjs check`. If it prints JSON, follow `.joycraft/references/update.md`.',
  "- Ask a person to answer or approve anything only through Joycraft's decision artifact (`node .joycraft/runtime/artifacts/cli.mjs`, see `.joycraft/references/artifacts.md#asking-questions`), in the project's question style. Every page that shows a person a document, a question or a decision comes from that engine: never write your own HTML page for one. Show every other document a person must read (a plan, spec set, report or review) as an engine page (`--doc`), never only as Markdown in chat, where the person works (see `.joycraft/references/artifacts.md#showing-a-page`), and say where it is.",
  '- A Context Map row that matches your next step binds: read that page first, and again after a compaction or in a new agent. A record (a log or history) is an audit trail: search it to learn why or when; do not read it at the start.',
  '- When a fact here disagrees with the code, trust the code and report it. A rule holds even when the code breaks it.',
  '<!-- /joycraft:managed -->',
].join('\n');

// The five-line block that 1.9.x generated, before the Work line (sl1-01).
const fiveLineBlock = [
  ...oldBlock.split('\n').slice(0, -1),
  `- ${sentence}`,
  '<!-- /joycraft:managed -->',
].join('\n');

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

function fixture(block: string) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-trust-')));
  dirs.push(root);
  git(root, 'init', '-q', '-b', 'main');
  put(join(root, 'AGENTS.md'), `# Example\n\n${block}\n\n## Context map\n\n| Read when | Document |\n|---|---|\n| Finding what the project is | \`docs/context/project.md\` |\n`);
  put(join(root, 'docs/context/project.md'), '# Project\n\nA small service.\n');
  git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'init');
  return root;
}

const managedFindings = (stdout: string) => (stdout.trim() ? JSON.parse(stdout).findings : [])
  .filter((item: { check: string }) => item.check === 'managed-block');

describe('trust sentence in the managed block', () => {
  it('[AC:spec-5-1] entry-check.mjs block prints the trust sentence as a block line', () => {
    const result = run('block');
    expect([result.status, result.stderr]).toEqual([0, '']);
    expect(result.stdout.split('\n')).toContain(`- ${sentence}`);
  });

  it('[AC:spec-5-2] an AGENTS.md with the previous four-line block gets a managed-block finding (changed)', () => {
    const stale = fixture(oldBlock);
    const findings = managedFindings(run('--root', stale).stdout);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ path: 'AGENTS.md', line: 3, detail: expect.stringContaining('differs') });
    const fiveLine = managedFindings(run('--root', fixture(fiveLineBlock)).stdout);
    expect(fiveLine).toHaveLength(1);
    expect(fiveLine[0]).toMatchObject({ path: 'AGENTS.md', line: 3, detail: expect.stringContaining('differs') });
    // sl2-03: the sl1-01 Work line, with its old Close part, is stale too.
    const sl1Close = '  - Close in one commit (no Git: say so). Move the brief folder to `docs/archive/<slug>/`.';
    const sl1Block = run('block').stdout.trimEnd().split('\n').map(line => (line.startsWith('  - Close:') ? sl1Close : line)).join('\n');
    const sl1 = managedFindings(run('--root', fixture(sl1Block)).stdout);
    expect(sl1).toHaveLength(1);
    expect(sl1[0]).toMatchObject({ path: 'AGENTS.md', detail: expect.stringContaining('differs') });
    // sl2-04: the first line from before the one-line update notice is stale too.
    const jsonOnly = run('block').stdout.trimEnd().replace(' If it prints one line, end your next reply with it.', '');
    const sl2 = managedFindings(run('--root', fixture(jsonOnly)).stdout);
    expect(sl2).toHaveLength(1);
    expect(sl2[0]).toMatchObject({ path: 'AGENTS.md', line: 3, detail: expect.stringContaining('differs') });
    const current = fixture(run('block').stdout.trimEnd());
    expect(managedFindings(run('--root', current).stdout)).toEqual([]);
  });

  it("[AC:spec-5-3] this repository's AGENTS.md carries the current block", () => {
    expect(managedFindings(run('--root', repo).stdout)).toEqual([]);
  });
});
