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

describe('README.md — install-first structure', () => {
  const readme = read('README.md');
  const firstScreen = readme.split('\n').slice(0, 40).join('\n');

  it('shows the install/quick-start command within the first 40 lines', () => {
    expect(firstScreen).toMatch(/npx joycraft(@latest)? init/);
  });

  it('says what Joycraft is on the first screen', () => {
    expect(firstScreen).toMatch(/##\s+What is Joycraft\?/);
  });

  it('has a table of contents on the first screen', () => {
    expect(firstScreen).toMatch(/##\s+Contents/);
    // A TOC is a list of links into the doc or into docs/
    const tocBlock = firstScreen.slice(firstScreen.search(/##\s+Contents/));
    const bullets = tocBlock.split('\n').filter((l) => /^\s*[-*]\s+\[/.test(l));
    expect(bullets.length).toBeGreaterThanOrEqual(5);
  });

  it('links a setup walkthrough that lists the steps a new user runs', () => {
    expect(readme).toContain('docs/guides/setup-walkthrough.md');
    const walkthrough = read('docs/guides/setup-walkthrough.md');
    expect(walkthrough).toMatch(/npx joycraft(@latest)? init/);
    expect(walkthrough).toMatch(/^\s*1\.\s+/m);
  });

  it('links SECURITY.md', () => {
    expect(readme).toContain('SECURITY.md');
  });
});

describe('relocated exposition lives in docs/ and stays linked', () => {
  const readme = read('README.md');

  const relocated: Array<[string, RegExp]> = [
    ['docs/guides/levels.md', /5 Levels/i],
    ['docs/guides/platform-support.md', /Platform support/i],
    ['docs/guides/upgrading.md', /Upgrad/i],
    ['docs/guides/git-tracking.md', /gitignore|shared vs private/i],
    ['docs/guides/migration-per-feature-layout.md', /Migration/i],
  ];

  for (const [path, contentPattern] of relocated) {
    it(`${path} exists, keeps its heading, and is linked from the README`, () => {
      expect(existsSync(join(repoRoot, path))).toBe(true);
      expect(read(path)).toMatch(contentPattern);
      expect(readme).toContain(path);
    });
  }
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
