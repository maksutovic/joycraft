import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { update } from '../src/update';
import { getBundleInventory } from '../src/bundle-inventory';
import { rawFileHash, type InstallationManifest } from '../src/install-manifest';
import { materializeFreshInstallInventory } from '../src/update-inventory';
import { MODEL_PROFILE_CONTEXT_MAP_ROW } from '../src/model-profile';
import type { Harness } from '../src/harness';
import type { StackInfo } from '../src/detect';

const PROFILE_PATH = 'docs/templates/reference/model-profile-claude-fable-5-1.md';

const STACK: StackInfo = {
  language: 'node',
  packageManager: 'pnpm',
  commands: { build: 'pnpm build', test: 'pnpm test', lint: undefined, typecheck: 'pnpm typecheck' },
} as StackInfo;

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function project(): string {
  const root = mkdtempSync(join(tmpdir(), 'joycraft-profile-pointer-'));
  roots.push(root);
  return root;
}

function read(root: string, path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function occurrences(content: string): number {
  return content.split(PROFILE_PATH).length - 1;
}

/** A hand-customized memory file that lacks the pointer row. */
const CUSTOM = [
  '# Acme Service',
  '',
  'Hand-written intro with trailing spaces.   ',
  '',
  '## Zebra Rules',
  '',
  '- keep the zebra first, out of canonical order',
  '',
  '## Behavioral Boundaries',
  '',
  '### ALWAYS',
  '- run the tests',
  '',
  '## Context Map',
  '',
  'Our own teaching line.',
  '',
  '| Document | Read it when… |',
  '|----------|---------------|',
  '| `docs/context/reference/db.md` | Touching the schema |',
  '',
  '## Notes',
  '',
  'tail line\t',
  '',
].join('\n');

const CUSTOM_WITH_ROW = CUSTOM.replace(
  '| Touching the schema |\n',
  '| Touching the schema |\n' + MODEL_PROFILE_CONTEXT_MAP_ROW + '\n',
);

describe('fresh install: memory file pointer row per selection', () => {
  it('claude writes CLAUDE.md with exactly one profile row inside the Context Map', async () => {
    const root = project();
    const result = await update(root, { nonInteractive: true, harnesses: ['claude'] });
    expect(result.status).toBe('applied');
    const claude = read(root, 'CLAUDE.md');
    expect(occurrences(claude)).toBe(1);
    const section = claude.slice(claude.indexOf('## Context Map'));
    const body = section.slice(0, section.indexOf('\n## ', 4) === -1 ? undefined : section.indexOf('\n## ', 4));
    expect(body).toContain(MODEL_PROFILE_CONTEXT_MAP_ROW);
    // The claude-only AGENTS.md is not the memory file; no second pointer.
    expect(occurrences(read(root, 'AGENTS.md'))).toBe(0);
  });

  for (const harness of ['pi', 'omp'] as const) {
    it(`${harness}-only writes an AGENTS.md memory file carrying the single row`, async () => {
      const root = project();
      const result = await update(root, { nonInteractive: true, harnesses: [harness] });
      expect(result.status).toBe('applied');
      expect(occurrences(read(root, 'AGENTS.md'))).toBe(1);
      expect(occurrences(read(root, 'CLAUDE.md'))).toBe(0);
    });
  }

  it('codex-only writes a memory file with no profile row', async () => {
    const root = project();
    await update(root, { nonInteractive: true, harnesses: ['codex'] });
    expect(occurrences(read(root, 'AGENTS.md'))).toBe(0);
    expect(occurrences(read(root, 'CLAUDE.md'))).toBe(0);
  });

  it('claude+codex (multiTool AGENTS.md path) carries the row', async () => {
    const root = project();
    await update(root, { nonInteractive: true, harnesses: ['claude', 'codex'] });
    expect(occurrences(read(root, 'AGENTS.md'))).toBe(1);
    expect(occurrences(read(root, 'CLAUDE.md'))).toBe(0);
  });

  it('a fresh-install second run changes nothing in the memory file', async () => {
    const root = project();
    await update(root, { nonInteractive: true, harnesses: ['claude'] });
    const first = readFileSync(join(root, 'CLAUDE.md'));
    const second = await update(root, { nonInteractive: true, harnesses: ['claude'] });
    expect(readFileSync(join(root, 'CLAUDE.md'))).toEqual(first);
    expect(second.applied).not.toContain('CLAUDE.md');
  });
});

describe('update on an existing customized memory file', () => {
  async function installed(harnesses: Harness[], memory: string, content: string): Promise<string> {
    const root = project();
    await update(root, { nonInteractive: true, harnesses });
    writeFileSync(join(root, memory), content);
    return root;
  }

  it('inserts exactly the one row into a customized CLAUDE.md; every other byte is unchanged', async () => {
    const root = await installed(['claude'], 'CLAUDE.md', CUSTOM);
    const result = await update(root, { nonInteractive: true });
    expect(result.applied).toContain('CLAUDE.md');
    expect(read(root, 'CLAUDE.md')).toBe(CUSTOM_WITH_ROW);
  });

  it('preserves CRLF line endings throughout', async () => {
    const crlf = CUSTOM.replace(/\n/g, '\r\n');
    const root = await installed(['claude'], 'CLAUDE.md', crlf);
    await update(root, { nonInteractive: true });
    const after = read(root, 'CLAUDE.md');
    expect(after).toBe(CUSTOM_WITH_ROW.replace(/\n/g, '\r\n'));
    expect(after.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('inserts into a customized AGENTS.md on an AGENTS.md-selected project', async () => {
    const root = await installed(['claude', 'codex'], 'AGENTS.md', CUSTOM);
    const claudeBefore = readFileSync(join(root, 'CLAUDE.md'));
    await update(root, { nonInteractive: true });
    expect(read(root, 'AGENTS.md')).toBe(CUSTOM_WITH_ROW);
    // The other memory file is untouched.
    expect(readFileSync(join(root, 'CLAUDE.md'))).toEqual(claudeBefore);
  });

  it('a second update changes no bytes and reports no action for the memory file', async () => {
    const root = await installed(['claude'], 'CLAUDE.md', CUSTOM);
    await update(root, { nonInteractive: true });
    const afterFirst = readFileSync(join(root, 'CLAUDE.md'));
    const second = await update(root, { nonInteractive: true });
    expect(readFileSync(join(root, 'CLAUDE.md'))).toEqual(afterFirst);
    expect(second.applied).not.toContain('CLAUDE.md');
  });

  it('inserts nothing on a codex-only project', async () => {
    const root = await installed(['codex'], 'AGENTS.md', CUSTOM);
    const result = await update(root, { nonInteractive: true });
    expect(read(root, 'AGENTS.md')).toBe(CUSTOM);
    expect(result.applied).not.toContain('AGENTS.md');
  });

  it('leaves a file that already names the profile path in prose byte-identical', async () => {
    const prose = CUSTOM + `\nFable notes live in ${PROFILE_PATH}.\n`;
    const root = await installed(['claude'], 'CLAUDE.md', prose);
    const result = await update(root, { nonInteractive: true });
    expect(read(root, 'CLAUDE.md')).toBe(prose);
    expect(result.applied).not.toContain('CLAUDE.md');
  });

  it('appends the Context Map section plus the row when the file has none', async () => {
    const bare = '# Acme\n\nJust an intro.\n';
    const root = await installed(['claude'], 'CLAUDE.md', bare);
    await update(root, { nonInteractive: true });
    const after = read(root, 'CLAUDE.md');
    expect(after.startsWith(bare)).toBe(true);
    expect(after).toContain('## Context Map');
    expect(occurrences(after)).toBe(1);
  });

  it('a pre-existing CLAUDE.md on a first install receives the row without other changes', async () => {
    const root = project();
    writeFileSync(join(root, 'CLAUDE.md'), CUSTOM);
    await update(root, { nonInteractive: true, harnesses: ['claude'] });
    expect(read(root, 'CLAUDE.md')).toBe(CUSTOM_WITH_ROW);
  });

  it('does not resurrect a deleted memory file', async () => {
    const root = project();
    await update(root, { nonInteractive: true, harnesses: ['claude'] });
    rmSync(join(root, 'CLAUDE.md'));
    await update(root, { nonInteractive: true });
    expect(() => readFileSync(join(root, 'CLAUDE.md'))).toThrow();
  });
});

describe('contextMapPointerPatch operation shape', () => {
  function manifest(harnesses: Harness[]): InstallationManifest {
    return {
      schemaVersion: 1,
      targetVersion: '0.0.0',
      bundleIntegrity: '',
      harnesses,
      profile: 'shared',
      files: {},
    } as InstallationManifest;
  }

  it('carries a rawPrecondition matching rawFileHash of the bytes read', () => {
    const root = project();
    writeFileSync(join(root, 'CLAUDE.md'), CUSTOM);
    const harnesses: Harness[] = ['claude'];
    const result = materializeFreshInstallInventory({
      root,
      entries: getBundleInventory(harnesses),
      manifest: manifest(harnesses),
      harnesses,
      profile: 'shared',
      stack: STACK,
    });
    const op = result.setup.patchOperations.find((operation) => operation.path === 'CLAUDE.md');
    expect(op).toBeDefined();
    expect(op!.kind).toBe('write');
    expect(op!.currentPresent).toBe(true);
    expect(op!.content).toBe(CUSTOM_WITH_ROW);
    expect(op!.rawPrecondition).toBe(rawFileHash(CUSTOM));
  });

  it('returns no operation when the insertion would be a no-op', () => {
    const root = project();
    writeFileSync(join(root, 'CLAUDE.md'), CUSTOM_WITH_ROW);
    const harnesses: Harness[] = ['claude'];
    const result = materializeFreshInstallInventory({
      root,
      entries: getBundleInventory(harnesses),
      manifest: manifest(harnesses),
      harnesses,
      profile: 'shared',
      stack: STACK,
    });
    expect(result.setup.patchOperations.find((operation) => operation.path === 'CLAUDE.md')).toBeUndefined();
  });
});
