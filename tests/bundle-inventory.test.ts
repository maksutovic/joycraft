import { describe, expect, it } from 'vitest';
import { HARNESSES } from '../src/harness';
import {
  getBundleInventory,
  templateEntries,
  TEMPLATE_HARNESS_GATES,
  USER_OWNED_VENDOR_PATHS,
  type BundleInventoryEntry,
} from '../src/bundle-inventory';
import { TEMPLATES } from '../src/bundled-files';

function paths(entries: readonly BundleInventoryEntry[]): string[] {
  return entries.map((entry) => entry.path);
}

describe('getBundleInventory', () => {
  it('describes each harness separately and does not resurrect unselected trees', () => {
    for (const harness of HARNESSES) {
      const entries = getBundleInventory([harness]);
      expect(entries.some((entry) => entry.harness === harness && entry.kind === 'vendor')).toBe(true);
      expect(entries.every((entry) => entry.harness === 'shared' || entry.harness === harness)).toBe(true);
    }

    const codexPaths = paths(getBundleInventory(['codex']));
    expect(codexPaths.some((path) => path.startsWith('.claude/'))).toBe(false);
    expect(codexPaths.some((path) => path.startsWith('.pi/'))).toBe(false);
  });

  it('includes shared vendor files, create-once documents, and owned patches', () => {
    const entries = getBundleInventory(['claude', 'codex', 'pi', 'copilot', 'omp']);
    expect(entries.some((entry) => entry.path === 'docs/templates/output/README.md' && entry.kind === 'vendor')).toBe(true);
    expect(entries.filter((entry) => entry.kind === 'create-once').map((entry) => entry.path)).toEqual(
      expect.arrayContaining(['CLAUDE.md', 'AGENTS.md']),
    );
    const patches = entries.filter((entry) => entry.kind === 'config-patch');
    expect(patches.length).toBeGreaterThan(0);
    expect(patches.every((entry) => entry.path === '.claude/settings.json')).toBe(true);
    expect(patches.every((entry) => entry.ownedKey || entry.ownedRegion)).toBe(true);
  });

  it('declares the checker payload and active Claude adapter ownership', () => {
    const entries = getBundleInventory(['claude']);
    const checkerEntries = entries.filter((entry) =>
      entry.path === 'docs/.joycraft/check.mjs' || entry.path === '.claude/hooks/joycraft-version-check.mjs',
    );
    expect(checkerEntries).toHaveLength(2);
    expect(checkerEntries.every((entry) => entry.ownership === 'managed')).toBe(true);
    expect(checkerEntries.find((entry) => entry.path === 'docs/.joycraft/check.mjs')).toEqual(expect.objectContaining({ active: true, installable: true, executable: true }));
    expect(checkerEntries.find((entry) => entry.path === '.claude/hooks/joycraft-version-check.mjs')).toEqual(expect.objectContaining({ active: true, installable: true, executable: true }));
  });

  it('marks executable runtime scripts with their install mode', () => {
    const entries = getBundleInventory(['pi']);
    const scripts = entries.filter((entry) => entry.path.startsWith('.pi/scripts/joycraft/'));
    expect(scripts.length).toBeGreaterThan(0);
    expect(scripts.filter((entry) => !entry.path.endsWith('README.md')).every((entry) => entry.executable && entry.mode === 0o755)).toBe(true);
    expect(scripts.find((entry) => entry.path.endsWith('README.md'))?.executable).toBe(false);
  });

});

const PROFILE_PATH = 'docs/templates/reference/model-profile-claude-fable-5-1.md';

describe('per-template harness gates', () => {
  it('declares the model profile doc gated to claude, pi, and omp', () => {
    expect(TEMPLATE_HARNESS_GATES['reference/model-profile-claude-fable-5-1.md']).toEqual(['claude', 'pi', 'omp']);
  });

  it('delivers the profile doc to every eligible single-harness selection', () => {
    for (const harness of ['claude', 'pi', 'omp'] as const) {
      const matches = getBundleInventory([harness]).filter((entry) => entry.path === PROFILE_PATH);
      expect(matches, harness).toHaveLength(1);
      expect(matches[0]).toEqual(expect.objectContaining({ harness, kind: 'vendor', active: true, installable: true }));
    }
  });

  it('withholds the profile doc from codex-only and copilot-only selections', () => {
    expect(paths(getBundleInventory(['codex']))).not.toContain(PROFILE_PATH);
    expect(paths(getBundleInventory(['copilot']))).not.toContain(PROFILE_PATH);
    expect(paths(getBundleInventory(['codex', 'copilot']))).not.toContain(PROFILE_PATH);
  });

  it('delivers the profile doc to a mixed selection that includes an eligible harness', () => {
    const matches = getBundleInventory(['claude', 'codex']).filter((entry) => entry.path === PROFILE_PATH);
    expect(matches).toHaveLength(1);
    expect(matches[0].harness).toBe('claude');
  });

  it('emits exactly one entry, under the first eligible harness in canonical order', () => {
    const all = getBundleInventory(['claude', 'pi', 'omp']).filter((entry) => entry.path === PROFILE_PATH);
    expect(all).toHaveLength(1);
    expect(all[0].harness).toBe('claude');
    const piOmp = getBundleInventory(['omp', 'pi']).filter((entry) => entry.path === PROFILE_PATH);
    expect(piOmp).toHaveLength(1);
    expect(piOmp[0].harness).toBe('pi');
    const defaults = getBundleInventory().filter((entry) => entry.path === PROFILE_PATH);
    expect(defaults).toHaveLength(1);
  });

  it('keeps every ungated template shared, vendored, and byte-identical for every selection', () => {
    const ungated = Object.entries(TEMPLATES).filter(([key]) => !(key in TEMPLATE_HARNESS_GATES));
    expect(ungated.length).toBeGreaterThan(0);
    for (const harness of HARNESSES) {
      const byPath = new Map(getBundleInventory([harness]).map((entry) => [entry.path, entry]));
      for (const [key, content] of ungated) {
        expect(byPath.get(`docs/templates/${key}`), `${harness}: ${key}`).toEqual({
          path: `docs/templates/${key}`,
          harness: 'shared',
          kind: USER_OWNED_VENDOR_PATHS.includes(`docs/templates/${key}`) ? 'create-once' : 'vendor',
          ownership: 'managed',
          active: true,
          installable: true,
          content,
        });
      }
      expect(byPath.has('docs/templates/output/README.md')).toBe(true);
    }
  });

  it('treats a gate key with no matching template as inert', () => {
    const templates = { 'output/README.md': 'readme\n', 'reference/real.md': 'real\n' };
    const gates = { 'reference/does-not-exist.md': ['claude'] as const, 'reference/real.md': ['pi'] as const };
    expect(() => templateEntries(templates, ['claude'], gates)).not.toThrow();
    expect(paths(templateEntries(templates, ['claude'], gates))).toEqual(['docs/templates/output/README.md']);
    expect(paths(templateEntries(templates, ['pi'], gates))).toEqual([
      'docs/templates/output/README.md',
      'docs/templates/reference/real.md',
    ]);
  });

  it('never carries an array on the harness field', () => {
    for (const entry of getBundleInventory()) {
      expect(typeof entry.harness).toBe('string');
    }
  });
});

const HOOK_RECIPE_PATHS = [
  'docs/templates/hooks/README.md',
  'docs/templates/hooks/exit-code-gate.sh',
  'docs/templates/hooks/plan-sync-on-completion.sh',
  'docs/templates/hooks/protected-path-guard.sh',
  'docs/templates/hooks/test-file-lock.sh',
];

describe('governance hook recipes', () => {
  it('ships the five recipe files as shared vendor entries for a claude selection', () => {
    const byPath = new Map(getBundleInventory(['claude']).map((entry) => [entry.path, entry]));
    for (const path of HOOK_RECIPE_PATHS) {
      expect(byPath.get(path), path).toEqual(expect.objectContaining({ kind: 'vendor', harness: 'shared' }));
    }
  });

  it('registers nothing: the settings.json config-patch set is exactly the six pre-existing entries', () => {
    const entries = getBundleInventory(['claude']);
    const patches = entries.filter((entry) => entry.kind === 'config-patch');
    expect(patches.some((entry) => entry.path.startsWith('docs/templates/hooks/'))).toBe(false);
    const settings = patches
      .filter((entry) => entry.path === '.claude/settings.json')
      .map((entry) => entry.ownedKey ?? entry.ownedRegion)
      .sort();
    expect(settings).toEqual([
      'autoMemoryEnabled',
      'env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS',
      'hooks.PreToolUse[command=.claude/hooks/joycraft/block-dangerous.sh]',
      'hooks.SessionStart[command=node .claude/hooks/joycraft-version-check.mjs]',
      'permissions.allow[joycraft-generated]',
      'permissions.deny[joycraft-generated]',
    ]);
    expect(patches.some((entry) => String(entry.ownedKey ?? entry.ownedRegion).includes('docs/templates/hooks'))).toBe(false);
  });
});

const EVALS_SCAFFOLD_PATHS = [
  'docs/templates/evals/README.md',
  'docs/templates/evals/example-task.json',
  'docs/templates/evals/check.sh',
  'docs/templates/evals/agent-evals.yml',
];

describe('evals scaffold', () => {
  it('ships the four scaffold files as shared entries, with the example task user-owned', () => {
    const byPath = new Map(getBundleInventory(['claude']).map((entry) => [entry.path, entry]));
    for (const path of EVALS_SCAFFOLD_PATHS) {
      const kind = path.endsWith('example-task.json') ? 'create-once' : 'vendor';
      expect(byPath.get(path), path).toEqual(expect.objectContaining({ kind, harness: 'shared' }));
    }
  });

  it('puts nothing under .github/workflows/', () => {
    for (const entry of getBundleInventory(['claude', 'codex', 'pi', 'copilot', 'omp'])) {
      expect(entry.path.startsWith('.github/workflows/'), entry.path).toBe(false);
    }
  });
});
