import { describe, it, expect } from 'vitest';
import { SKILLS, TEMPLATES, CODEX_SKILLS, PI_SKILLS, OMP_SKILLS } from '../src/bundled-files';

describe('bundled SKILLS', () => {
  it('includes joycraft-collaborative-setup.md', () => {
    expect(Object.keys(SKILLS)).toContain('joycraft-collaborative-setup.md');
  });

  it('content for collaborative-setup skill is non-empty and references docs/areas/', () => {
    const content = SKILLS['joycraft-collaborative-setup.md'];
    expect(content).toBeDefined();
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain('docs/areas/');
  });
});

describe('bundled TEMPLATES', () => {
  it('includes CONTRIBUTING-joycraft template', () => {
    expect(Object.keys(TEMPLATES)).toContain('CONTRIBUTING-joycraft-template.md');
  });
});

describe('bundled CODEX_SKILLS', () => {
  it('is non-empty', () => {
    expect(Object.keys(CODEX_SKILLS).length).toBeGreaterThan(0);
  });
});

describe('bundled OMP_SKILLS', () => {
  it('has the same key count as PI_SKILLS', () => {
    expect(Object.keys(OMP_SKILLS).length).toBe(Object.keys(PI_SKILLS).length);
  });

  /**
   * omp's native skill provider rejects a skill whose frontmatter has no
   * non-empty `description`, so this is a shipping gate, not a style rule.
   *
   * `joycraft-implement-feature` is the one known gap: its description lives in
   * per-harness frontmatter blocks (claude / codex|copilot / pi) and no branch
   * lists omp yet, so the omp variant renders with the key dropped entirely.
   * Adding an omp branch means editing a canonical skill body, which is the
   * harness-block audit's job — see
   * `docs/features/2026-09-02-omp-support/specs/audit-harness-blocks-for-omp.md`,
   * which tabulates this exact site. Asserting the gap's *exact* membership
   * keeps it from widening while that spec is pending, and the audit tightens
   * the allowance to zero.
   */
  const KNOWN_MISSING_DESCRIPTION = ['joycraft-implement-feature.md'];

  it('every skill carries a non-empty description: — omp rejects skills without one', () => {
    const missing = Object.entries(OMP_SKILLS)
      .filter(([, content]) => !/^description:[ \t]*\S.*$/m.test(content))
      .map(([file]) => file);

    expect(
      missing,
      'an omp skill lost its frontmatter description — omp will refuse to load it',
    ).toEqual(KNOWN_MISSING_DESCRIPTION);
  });

  it('names no absolute path — generated skills are copied into user projects', () => {
    for (const [file, content] of Object.entries(OMP_SKILLS)) {
      expect(content, `${file} contains an absolute path`).not.toMatch(/\/Users\/|\/home\//);
    }
  });

  it('uses omp invocation and skills dir, never .pi/skills', () => {
    const all = Object.values(OMP_SKILLS).join('\n');
    expect(all).toContain('/skill:joycraft-');
    expect(all).not.toContain('.pi/skills');
  });
});
