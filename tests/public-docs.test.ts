import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf-8');

/**
 * Collect relative (intra-repo) markdown link targets from a doc.
 * Skips external URLs, mailto:, and pure in-page anchors.
 */
function relativeLinks(markdown: string): string[] {
  const targets: string[] = [];
  const linkRe = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(markdown)) !== null) {
    const target = m[1];
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    targets.push(target);
  }
  return targets;
}

describe('README.md — 1.0 prompt-first structure', () => {
  const readme = read('README.md');
  const firstScreen = readme.split('\n').slice(0, 45).join('\n');

  it('opens with a paste-into-your-agent install prompt that plans first', () => {
    expect(firstScreen).toMatch(/##\s+Install: paste this into your coding agent/);
    expect(firstScreen).toContain('npx joycraft@latest init . --plan --json');
    expect(firstScreen.indexOf('--plan --json')).toBeLessThan(firstScreen.indexOf('--yes'));
  });

  it('has an upgrading-from-0.7 box near the top', () => {
    expect(firstScreen).toMatch(/\*\*Upgrading from 0\.7\?\*\*/);
    expect(firstScreen).toContain('docs/migrating-from-0.7.md');
    expect(firstScreen).toContain('npx joycraft@0.7.17 update');
  });

  it('says what Joycraft is and lists every host with its evidence', () => {
    expect(readme).toMatch(/##\s+What Joycraft is/);
    for (const host of ['Claude Code', 'Codex', 'Pi', 'Oh My Pi', 'GitHub Copilot CLI', 'OpenCode']) expect(readme).toContain(`| ${host} |`);
  });

  it('names no Jev, no prototype and no absolute path', () => {
    for (const doc of ['README.md', 'docs/install.md', 'docs/migrating-from-0.7.md', 'docs/prompts.md']) {
      expect(read(doc), doc).not.toMatch(/jev|prototype|\/Users\//i);
    }
  });

  it('links SECURITY.md', () => {
    expect(readme).toContain('SECURITY.md');
  });
});

describe('1.0 guides', () => {
  it('every prompt plans before it applies and asks for no keys, commits or publishing', () => {
    const prompts = read('docs/prompts.md');
    for (const block of prompts.split('```text').slice(1).map((part) => part.split('```')[0])) {
      expect(block).toMatch(/Do not (commit|post)/);
      expect(block).toMatch(/API keys/);
    }
    expect(prompts.indexOf('--plan --json')).toBeLessThan(prompts.indexOf('init . --harness'));
  });

  it("the migration guide's kept list matches the migration code", async () => {
    const { KEPT } = await import('../src/legacy-07.js');
    const guide = read('docs/migrating-from-0.7.md');
    for (const path of KEPT) expect(guide).toContain(path.replace(/\/$/, '/'));
  });
});

describe('SECURITY.md', () => {
  it('exists at the repo root', () => {
    expect(existsSync(join(repoRoot, 'SECURITY.md'))).toBe(true);
  });

  it('states the execution model, the boundary/deny-pattern mechanism, and reporting', () => {
    const security = read('SECURITY.md');
    expect(security).toMatch(/##\s+What Joycraft executes/i);
    expect(security).toMatch(/##\s+Boundaries and deny patterns/i);
    expect(security).toMatch(/##\s+Reporting a vulnerability/i);
    expect(security).toMatch(/never runs your code/i);
    expect(security).toMatch(/deny pattern/i);
  });

  it('links to Claude Code documentation at the stable docs root', () => {
    const security = read('SECURITY.md');
    expect(security).toMatch(/https:\/\/(code\.claude\.com\/docs|docs\.claude\.com\/en\/docs\/claude-code)/);
  });

  it('stays thin', () => {
    const security = read('SECURITY.md');
    expect(security.split('\n').length).toBeLessThan(120);
  });
});

describe('intra-repo links resolve', () => {
  for (const doc of ['README.md', 'SECURITY.md']) {
    it(`${doc} relative links all point at files that exist`, () => {
      const source = read(doc);
      const broken = relativeLinks(source).filter((target) => {
        const [path] = target.split('#');
        if (!path) return false; // pure anchor handled by the regex filter
        return !existsSync(resolve(repoRoot, path));
      });
      expect(broken).toEqual([]);
    });
  }

  it('relocated docs link back to files that exist', () => {
    const guides = [
      'docs/guides/setup-walkthrough.md',
      'docs/guides/levels.md',
      'docs/guides/platform-support.md',
      'docs/guides/upgrading.md',
      'docs/guides/git-tracking.md',
      'docs/guides/migration-per-feature-layout.md',
    ];
    const broken: string[] = [];
    for (const guide of guides) {
      if (!existsSync(join(repoRoot, guide))) continue;
      for (const target of relativeLinks(read(guide))) {
        const [path] = target.split('#');
        if (!path) continue;
        if (!existsSync(resolve(dirname(join(repoRoot, guide)), path))) {
          broken.push(`${guide} -> ${target}`);
        }
      }
    }
    expect(broken).toEqual([]);
  });
});
