import { describe, it, expect } from 'vitest';
import { evaluate } from '../scripts/check-docs-sync.mjs';

describe('check-docs-sync gate', () => {
  it('passes a docs-only branch', () => {
    expect(evaluate(['README.md', 'docs/guides/upgrading.md'], '').ok).toBe(true);
  });

  it('passes a tests-only branch', () => {
    expect(evaluate(['tests/foo.test.ts'], '').ok).toBe(true);
  });

  it('blocks product changes without a CHANGELOG entry', () => {
    const r = evaluate(['src/cli.ts'], 'Summary only');
    expect(r.ok).toBe(false);
    expect(r.product).toEqual(['src/cli.ts']);
  });

  it.each(['src/cli.ts', 'scripts/release-gates.mjs'])(
    'treats %s as a product path',
    (f) => expect(evaluate([f], '').ok).toBe(false),
  );

  it('does not treat the removed 0.7 templates/ folder as a product path', () => {
    expect(evaluate(['templates/x.md'], '').ok).toBe(true);
  });

  it('passes when CHANGELOG.md changed alongside product files', () => {
    expect(evaluate(['src/cli.ts', 'CHANGELOG.md'], '').ok).toBe(true);
  });

  it('passes with a "Docs: none — reason" opt-out line in the body', () => {
    expect(evaluate(['src/cli.ts'], 'Summary\n\nDocs: none — refactor only').ok).toBe(true);
    expect(evaluate(['src/cli.ts'], 'docs: NONE (ci)').ok).toBe(true);
  });

  it('does not accept the opt-out mid-line', () => {
    expect(evaluate(['src/cli.ts'], 'we decided Docs: none here').ok).toBe(false);
  });
});
