import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const CANONICAL = join(repoRoot, 'src', 'skills', 'joycraft-add-fact.md');
const content = () => readFileSync(CANONICAL, 'utf-8');

describe('add-decay-category-bans: the three bans are present', () => {
  it('names redundant-with-{{boundary_file}} using the placeholder, not a literal filename', () => {
    const c = content();
    expect(c).toMatch(/[Rr]edundant with \{\{boundary_file\}\}/);
    expect(c).not.toMatch(/[Rr]edundant with (AGENTS|CLAUDE)\.md/);
  });

  it('names expired shipped-state and cites the shipped ledger', () => {
    const c = content();
    expect(c).toMatch(/[Ee]xpired shipped-state/);
    expect(c.toLowerCase()).toMatch(/shipped ledger/);
  });

  it('names point-in-time hazard', () => {
    expect(content()).toMatch(/[Pp]oint-in-time hazard/);
  });
});

describe('add-decay-category-bans: category wording', () => {
  it('gives the point-in-time examples: PR numbers, "currently broken", live URLs', () => {
    const c = content();
    expect(c).toMatch(/PR numbers/);
    expect(c).toMatch(/currently broken/);
    expect(c).toMatch(/live URLs/);
  });
});

describe('add-decay-category-bans: rejection is explicit, not silent', () => {
  it('requires a one-line reason on rejection', () => {
    const c = content().toLowerCase();
    expect(c).toMatch(/one-line reason/);
    expect(c).toMatch(/never (silently )?drop|not silent/);
  });
});

describe('add-decay-category-bans: bans precede classification', () => {
  it('places the reject-signals block before the first routing target in Step 2', () => {
    const c = content();
    const step2 = c.indexOf('## Step 2: Classify the Fact');
    expect(step2).toBeGreaterThan(-1);
    const banIdx = c.indexOf('Point-in-time hazard', step2);
    const firstRoute = c.indexOf('docs/context/production-map.md', step2);
    expect(banIdx).toBeGreaterThan(step2);
    expect(firstRoute).toBeGreaterThan(-1);
    expect(banIdx).toBeLessThan(firstRoute);
  });
});

describe('add-decay-category-bans: budget paid same-commit', () => {
  it('does not grow the canonical skill past its pre-change length (207)', () => {
    expect(content().split('\n').length).toBeLessThanOrEqual(207);
  });

  it('the paying trims bring the skill back under the 200-line budget', () => {
    expect(content().split('\n').length).toBeLessThanOrEqual(200);
  });
});

describe('add-decay-category-bans: generated + installed copies carry the bans', () => {
  const copies = [
    join(repoRoot, 'src', 'claude-skills', 'joycraft-add-fact.md'),
    join(repoRoot, 'src', 'codex-skills', 'joycraft-add-fact.md'),
    join(repoRoot, 'src', 'pi-skills', 'joycraft-add-fact.md'),
    join(repoRoot, 'src', 'copilot-skills', 'joycraft-add-fact.md'),
    join(repoRoot, '.claude', 'skills', 'joycraft-add-fact', 'SKILL.md'),
  ];

  for (const copy of copies) {
    it(`carries the three bans: ${copy.replace(repoRoot + '/', '')}`, () => {
      const c = readFileSync(copy, 'utf-8');
      expect(c).toMatch(/[Rr]edundant with /);
      expect(c).toMatch(/[Ee]xpired shipped-state/);
      expect(c).toMatch(/[Pp]oint-in-time hazard/);
    });
  }
});
