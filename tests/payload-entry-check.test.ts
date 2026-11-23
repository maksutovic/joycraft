import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// The entry check of the shipped payload, run as a project runs it: the
// payload's `.joycraft` folder is copied into a small project and the command
// runs there (canonical-entry-file spec 8).

const payloadDir = process.env.JOYCRAFT_PAYLOAD_GUARD_ROOT ?? join(__dirname, '..', 'payload');
const projects: string[] = [];

const map = (rows: string[]) => ['# Example project', '', 'A small auction service.', '', '## Context map', '',
  '| Read when | Document |', '|---|---|',
  '| Finding what the project is and who owns it | `docs/context/project.md` |',
  '| Changing how an auction closes | [auction rules](docs/context/rules.md) |', ...rows, ''].join('\n');

/** A project with the shipped `.joycraft` folder, two context pages and an `AGENTS.md` whose map has `rows` more. */
function project(rows: string[] = []): string {
  const root = mkdtempSync(join(tmpdir(), 'joycraft-payload-entry-'));
  projects.push(root);
  cpSync(join(payloadDir, '.joycraft'), join(root, '.joycraft'), { recursive: true });
  write(root, 'AGENTS.md', map(rows));
  write(root, 'docs/context/project.md', '# Project\n\nAn auction service for one seller. See [the rules](rules.md).\n');
  write(root, 'docs/context/rules.md', '# Auction rules\n\nAn auction closes at noon.\n');
  return root;
}

function write(root: string, relative: string, contents: string) {
  mkdirSync(join(root, dirname(relative)), { recursive: true });
  writeFileSync(join(root, relative), contents);
}

const run = (root: string, ...args: string[]) => spawnSync(process.execPath, ['.joycraft/runtime/entry-check.mjs', ...args], { cwd: root, encoding: 'utf8' });

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

afterEach(() => { for (const root of projects.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe('shipped entry check', () => {
  it('[AC:vendored-field-build] ships the entry check, and no file is or names now.md or entry.tidy', () => {
    const files = walk(payloadDir).filter((path) => !path.endsWith('PIN'));
    expect(files.some((path) => path.endsWith('.joycraft/runtime/entry-check.mjs'))).toBe(true);
    expect(files.filter((path) => path.endsWith('now.md'))).toEqual([]);
    const text = files.filter((path) => /\.(md|mjs|js|json|yaml)$/.test(path));
    expect(text.filter((path) => /\bnow\.md\b|entry\.tidy/.test(readFileSync(path, 'utf8')))).toEqual([]);
  });

  it('[AC:payload-entry-check] a clean project prints nothing and exits 0, also with --ci', () => {
    const root = project();
    for (const args of [[], ['--ci']]) {
      const result = run(root, ...args);
      expect([result.status, result.stdout, result.stderr], args.join(' ')).toEqual([0, '', '']);
    }
  });

  it('[AC:payload-entry-check] a dead path in AGENTS.md fails --ci with exit 2 and one line for each finding', () => {
    const root = project(['| Changing a bid | `docs/context/gone.md` |', '| Releasing | [release steps](docs/context/release.md) |']);
    const result = run(root, '--ci');
    expect(result.status, result.stderr).toBe(2);
    expect(result.stdout.trimEnd().split('\n')).toEqual([
      'AGENTS.md:11 missing-path Names docs/context/gone.md, which does not exist.',
      'AGENTS.md:12 broken-link Links to docs/context/release.md, which does not exist.',
    ]);
  });

  it("[AC:payload-entry-check] block prints Joycraft's lines between its markers", () => {
    const result = run(project(), 'block');
    expect([result.status, result.stderr]).toEqual([0, '']);
    const lines = result.stdout.trimEnd().split('\n');
    expect([lines[0], lines.at(-1)]).toEqual(['<!-- joycraft:managed -->', '<!-- /joycraft:managed -->']);
    // Six entries; the sixth (the Work line) has four indented sub-items.
    expect(lines).toHaveLength(12);
    expect(lines[1]).toMatch(/First action in each session: run `node \.joycraft\/runtime\/update-check\.mjs check`/);
    // sl2-04: a one-line notice goes at the end of the next reply; JSON still opens update.md.
    expect(lines[1]).toMatch(/check`\. If it prints one line, end your next reply with it\. If it prints JSON, follow `\.joycraft\/references\/update\.md`\.$/);
    expect(lines[2]).toMatch(/as an engine page \(`--doc`\)/);
    expect(lines[3]).toMatch(/A Context Map row that matches your next step binds/);
    expect(lines[4]).toMatch(/trust the code and report it\. A rule holds even when the code breaks it\.$/);
    expect(lines[5]).toMatch(/^- Search the mapped pages first\. A doc that no map row reaches is working material, not current truth\.$/);
    expect(lines[6]).toBe('- Work: before you change code, say `Path: small job` or `Path: feature`.');
    expect(lines.slice(7, 11).map(line => /^  - (\w+(?: \w+)?)/.exec(line)?.[1])).toEqual(['Small job', 'Look', 'Close', 'Feature']);
  });

  it('[AC:payload-entry-check] the exact block is clean; a block with one changed word is one advisory and --ci exits 0', () => {
    const root = project();
    const block = run(root, 'block').stdout.trimEnd();
    const place = (text: string) => write(root, 'AGENTS.md', map([]).replace('## Context map', `${text}\n\n## Context map`));
    place(block);
    expect([run(root).status, run(root).stdout]).toEqual([0, '']);
    place(block.replace('trust the code', 'trust the docs'));
    const report = JSON.parse(run(root).stdout);
    expect(report.gate).toBe(0);
    expect(report.findings.map((item: { check: string; level: string; path: string }) => [item.check, item.level, item.path]))
      .toEqual([['managed-block', 'advisory', 'AGENTS.md']]);
    const ci = run(root, '--ci');
    expect([ci.status, ci.stdout]).toEqual([0, '']);
  });
});
