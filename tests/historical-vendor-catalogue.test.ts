import { describe, expect, it } from 'vitest';
import { HISTORICAL_VENDOR_CATALOGUE } from '../src/historical-vendor-catalogue';

describe('historical vendor catalogue', () => {
  it('contains verified 0.7.13 records with portable paths and full SHA-256 hashes', () => {
    expect(HISTORICAL_VENDOR_CATALOGUE.length).toBeGreaterThan(0);

    for (const record of HISTORICAL_VENDOR_CATALOGUE) {
      expect(record.version).toBe('0.7.13');
      expect(record.path).toMatch(
        /^(?:\.claude\/|\.agents\/|\.pi\/|\.github\/|\.omp\/|docs\/templates\/)/
      );
      expect(record.path).not.toMatch(/\\/);
      expect(record.path).not.toMatch(/(?:^|\/)\.\.?(?:\/|$)/);
      expect(record.vendorHash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('covers all five harness roots and managed templates', () => {
    const paths = HISTORICAL_VENDOR_CATALOGUE.map(({ path }) => path);

    expect(paths.some((path) => path.startsWith('.claude/'))).toBe(true);
    expect(paths.some((path) => path.startsWith('.agents/'))).toBe(true);
    expect(paths.some((path) => path.startsWith('.pi/'))).toBe(true);
    expect(paths.some((path) => path.startsWith('.github/'))).toBe(true);
    expect(paths.some((path) => path.startsWith('.omp/'))).toBe(true);
    expect(paths.some((path) => path.startsWith('docs/templates/'))).toBe(true);
  });

  it('retains the published 0.7.13 evidence set', () => {
    expect(HISTORICAL_VENDOR_CATALOGUE).toHaveLength(149);
    expect(
      HISTORICAL_VENDOR_CATALOGUE.find(
        ({ path }) => path === '.claude/skills/joycraft-tune/SKILL.md'
      )?.vendorHash
    ).toBe('ca7c90631f9b5aafab53c24850c3e78013b62aad7b0bb45525875a1987da5c70');
  });

  it('has no duplicate path/version records', () => {
    const keys = HISTORICAL_VENDOR_CATALOGUE.map(({ path, version }) => `${version}:${path}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('includes the verified historical skill and Pi support artifacts', () => {
    const paths = new Set(HISTORICAL_VENDOR_CATALOGUE.map(({ path }) => path));

    expect(paths.has('.claude/skills/joycraft-tune/SKILL.md')).toBe(true);
    expect(paths.has('.agents/skills/joycraft-tune/SKILL.md')).toBe(true);
    expect(paths.has('.pi/skills/joycraft-tune/SKILL.md')).toBe(true);
    expect(paths.has('.github/skills/joycraft-tune/SKILL.md')).toBe(true);
    expect(paths.has('.omp/skills/joycraft-tune/SKILL.md')).toBe(true);
    expect(paths.has('.pi/scripts/joycraft/joycraft-next-spec')).toBe(true);
    expect(paths.has('.pi/extensions/joycraft-pipeline.ts')).toBe(true);
    expect(paths.has('.pi/agents/joycraft-researcher.md')).toBe(true);
    expect(paths.has('docs/templates/examples/example-spec.md')).toBe(true);
  });
});
