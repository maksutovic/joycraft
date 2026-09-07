import { afterEach, describe, expect, it } from 'vitest';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { getBundleInventory, type BundleInventoryEntry } from '../src/bundle-inventory';
import { defaultExecutionProfile } from '../src/execution-profile';
import { generatePermissions } from '../src/permissions';
import { generateHookScript } from '../src/safeguard';
import type { StackInfo } from '../src/detect';
import type { InstallationManifest } from '../src/install-manifest';
import {
  BACKLOG_README,
  materializeFreshInstallInventory,
} from '../src/update-inventory';

const roots: string[] = [];
const stack: StackInfo = {
  language: 'node',
  packageManager: 'pnpm',
  commands: { build: 'pnpm build', test: 'pnpm test', typecheck: 'pnpm typecheck' },
  framework: 'Vitest',
};

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function project(): string {
  const root = mkdtempSync(join(tmpdir(), 'joycraft-update-inventory-'));
  roots.push(root);
  return root;
}

function put(root: string, relative: string, content: string): void {
  const path = join(root, ...relative.split('/'));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

function manifest(files: InstallationManifest['files'] = {}): InstallationManifest {
  return {
    schemaVersion: 1,
    targetVersion: '1.0.0',
    bundleIntegrity: '',
    harnesses: ['claude'],
    profile: 'shared',
    files,
  };
}

function vendor(path: string, content = `${path}\n`): BundleInventoryEntry {
  return {
    path,
    harness: path.startsWith('.claude/') ? 'claude' : 'shared',
    kind: 'vendor',
    ownership: 'managed',
    active: true,
    installable: true,
    content,
  };
}

describe('materializeFreshInstallInventory', () => {
  it('materializes legacy generated documents and support setup without writing', () => {
    const root = project();
    mkdirSync(join(root, '.claude', 'skills', 'my-tool'), { recursive: true });
    const entries = getBundleInventory(['claude']);

    const result = materializeFreshInstallInventory({
      root,
      entries,
      manifest: manifest(),
      harnesses: ['claude'],
      profile: 'shared',
      stack,
      executionProfile: defaultExecutionProfile(['claude']),
      freshInstall: true,
    });

    const claude = result.entries.find((entry) => entry.path === 'CLAUDE.md');
    const agents = result.entries.find((entry) => entry.path === 'AGENTS.md');
    const backlog = result.entries.find((entry) => entry.path === 'docs/backlog/README.md');
    expect(claude?.content).toContain('## Project Tools');
    expect(claude?.content).toContain('my-tool');
    expect(agents?.content).toContain('## Execution Profile');
    expect(backlog?.content).toBe(BACKLOG_README);
    expect(result.setup.directories).toEqual(expect.arrayContaining(['docs/context', 'docs/backlog']));
    expect(existsSync(join(root, 'CLAUDE.md'))).toBe(false);
    expect(existsSync(join(root, 'docs', 'context'))).toBe(false);
  });

  it('does not expand a supplied fixture inventory into the full package bundle', () => {
    const root = project();
    const entries = [vendor('fixture.txt', 'fixture\n')];
    const result = materializeFreshInstallInventory({
      root,
      entries,
      manifest: manifest(),
      harnesses: ['claude'],
      profile: 'shared',
      stack,
    });

    expect(result.entries.map((entry) => entry.path)).toEqual(['fixture.txt']);
    expect(result.setup.directories).toEqual([]);
  });

  it('keeps create-once documents untouched unless scoped force is enabled', () => {
    const root = project();
    put(root, 'CLAUDE.md', '# Mine\n');
    put(root, 'README.md', '# Project\n');
    const entries: BundleInventoryEntry[] = [
      { path: 'CLAUDE.md', harness: 'shared', kind: 'create-once', ownership: 'managed', active: true, installable: false },
      { path: 'README.md', harness: 'shared', kind: 'create-once', ownership: 'managed', active: true, installable: false },
    ];

    const preserved = materializeFreshInstallInventory({
      root, entries, manifest: manifest(), harnesses: ['claude'], profile: 'shared', stack,
    });
    expect(preserved.entries).toHaveLength(0);

    const forced = materializeFreshInstallInventory({
      root, entries, manifest: manifest(), harnesses: ['claude'], profile: 'shared', stack, force: true,
    });
    expect(forced.entries.map((entry) => entry.path)).toEqual(['CLAUDE.md']);
    expect(forced.entries[0].content).toContain('# ' + root.split('/').pop());
  });

  it('creates fresh Claude settings with generated policy and no absent checker', () => {
    const root = project();
    const result = materializeFreshInstallInventory({
      root,
      entries: [],
      manifest: manifest(),
      harnesses: ['claude'],
      profile: 'shared',
      stack,
      disableAutoMemory: true,
      freshInstall: true,
    });
    const settings = result.entries.find((entry) => entry.path === '.claude/settings.json');
    expect(settings?.kind).toBe('create-once');
    const parsed = JSON.parse(String(settings?.content));
    expect(parsed.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe('1');
    expect(parsed.autoMemoryEnabled).toBe(false);
    expect(parsed.permissions).toEqual(generatePermissions(stack));
    expect(parsed.hooks.PreToolUse[0].hooks[0].command).toBe('.claude/hooks/joycraft/block-dangerous.sh');
    expect(JSON.stringify(parsed)).not.toContain('joycraft-version-check.mjs');
    expect(JSON.stringify(parsed)).not.toContain(generateHookScript());
  });

  it('returns a transactional settings patch that removes only the known legacy checker', () => {
    const root = project();
    const settings = {
      customSetting: true,
      hooks: {
        SessionStart: [
          { matcher: '', hooks: [
            { type: 'command', command: 'node .claude/hooks/joycraft-version-check.mjs' },
            { type: 'command', command: 'echo keep' },
          ] },
          { matcher: 'resume', hooks: [{ type: 'command', command: 'node .claude/hooks/my-joycraft-helper.mjs' }] },
        ],
      },
    };
    const original = JSON.stringify(settings, null, 2) + '\n';
    put(root, '.claude/settings.json', original);

    const result = materializeFreshInstallInventory({
      root,
      entries: [],
      manifest: manifest(),
      harnesses: ['claude'],
      profile: 'shared',
      stack,
      retireLegacyChecker: true,
    });
    expect(readFileSync(join(root, '.claude/settings.json'), 'utf8')).toBe(original);
    expect(result.setup.patchOperations).toHaveLength(1);
    const patch = result.setup.patchOperations[0];
    const patched = JSON.parse(String(patch.content));
    expect(patched.customSetting).toBe(true);
    expect(patched.hooks.SessionStart).toEqual([
      { matcher: '', hooks: [{ type: 'command', command: 'echo keep' }] },
      settings.hooks.SessionStart[1],
    ]);
    expect(JSON.stringify(patched)).not.toContain('joycraft-version-check.mjs');
    expect(JSON.stringify(patched)).not.toContain('block-dangerous.sh');
    expect(JSON.stringify(patched)).not.toContain('CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS');
  });

  it('does not use a verified auto-memory fragment to authorize unrelated setup', () => {
    const root = project();
    const original = JSON.stringify({ customSetting: { keep: true } }, null, 2) + '\n';
    put(root, '.claude/settings.json', original);
    const ownedManifest = manifest({
      '.claude/settings.json': {
        vendorVersion: '1.0.0',
        vendorHash: 'a'.repeat(64),
        kind: 'config-patch',
        ownership: 'verified',
        ownedKey: 'env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS',
      },
    });
    const result = materializeFreshInstallInventory({
      root,
      entries: [],
      manifest: ownedManifest,
      harnesses: ['claude'],
      profile: 'shared',
      stack,
    });
    expect(result.setup.patchOperations).toEqual([]);
    expect(readFileSync(join(root, '.claude/settings.json'), 'utf8')).toBe(original);
  });

  it('merges generated setup into an existing settings file on a fresh init', () => {
    const root = project();
    const original = JSON.stringify({ customSetting: { keep: true }, permissions: { allow: ['Bash(custom *)'] } }, null, 2) + '\n';
    put(root, '.claude/settings.json', original);
    const result = materializeFreshInstallInventory({
      root,
      entries: [],
      manifest: manifest(),
      harnesses: ['claude'],
      profile: 'shared',
      stack,
      freshInstall: true,
    });
    expect(result.setup.patchOperations).toHaveLength(1);
    const patched = JSON.parse(result.setup.patchOperations[0].content);
    expect(patched.customSetting).toEqual({ keep: true });
    expect(patched.permissions.allow).toContain('Bash(custom *)');
    expect(patched.permissions.allow).toContain('Bash(pnpm *)');
    expect(patched.hooks.PreToolUse[0].hooks[0].command).toBe('.claude/hooks/joycraft/block-dangerous.sh');
  });

  it('does not let a narrow auto-memory patch authorize unrelated generated settings', () => {
    const root = project();
    const original = JSON.stringify({ customSetting: true }, null, 2) + '\n';
    put(root, '.claude/settings.json', original);
    const narrow = manifest({
      '.claude/settings.json': {
        vendorVersion: '1.0.0',
        vendorHash: 'a'.repeat(64),
        kind: 'config-patch',
        ownership: 'verified',
        ownedKey: 'autoMemoryEnabled',
      },
    });
    const result = materializeFreshInstallInventory({
      root,
      entries: [],
      manifest: narrow,
      harnesses: ['claude'],
      profile: 'shared',
      stack,
    });
    expect(result.setup.patchOperations).toEqual([]);
    expect(readFileSync(join(root, '.claude/settings.json'), 'utf8')).toBe(original);
  });

  it('does not let a verified permissions fragment authorize other generated settings', () => {
    const root = project();
    const original = JSON.stringify({ customSetting: true }, null, 2) + '\n';
    put(root, '.claude/settings.json', original);
    const narrow = manifest({
      '.claude/settings.json': {
        vendorVersion: '1.0.0',
        vendorHash: 'a'.repeat(64),
        kind: 'config-patch',
        ownership: 'verified',
        ownedKey: 'permissions.allow',
      },
    });
    const result = materializeFreshInstallInventory({
      root, entries: [], manifest: narrow, harnesses: ['claude'], profile: 'shared', stack,
    });
    expect(result.setup.patchOperations).toEqual([]);
    expect(readFileSync(join(root, '.claude/settings.json'), 'utf8')).toBe(original);
  });

  it('plans a narrow Pi tsconfig exclusion and preserves unrelated config', () => {
    const root = project();
    const original = '{\n  "compilerOptions": { "strict": true },\n  "exclude": ["node_modules"]\n}\n';
    put(root, 'tsconfig.json', original);
    const result = materializeFreshInstallInventory({
      root,
      entries: [],
      manifest: manifest(),
      harnesses: ['pi'],
      profile: 'shared',
      stack,
      freshInstall: true,
    });

    expect(readFileSync(join(root, 'tsconfig.json'), 'utf8')).toBe(original);
    const patch = result.setup.patchOperations.find((operation) => operation.path === 'tsconfig.json');
    expect(patch?.content).toContain('".pi"');
    expect(JSON.parse(String(patch?.content)).compilerOptions.strict).toBe(true);
    expect(JSON.parse(String(patch?.content)).exclude).toEqual(['.pi', 'node_modules']);
  });

  it('reports malformed settings without a write operation', () => {
    const root = project();
    put(root, '.claude/settings.json', '{ broken');
    const result = materializeFreshInstallInventory({
      root, entries: [], manifest: manifest(), harnesses: ['claude'], profile: 'shared', stack,
    });
    expect(result.setup.patchOperations).toEqual([]);
    expect(result.diagnostics.some((diagnostic) => diagnostic.includes('settings.json'))).toBe(true);
  });
});
