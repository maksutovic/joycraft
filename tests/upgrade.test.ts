import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

import { init } from '../src/init';
import { upgrade } from '../src/upgrade';
import { getBundleInventory } from '../src/bundle-inventory';
import { updateStatusExitCode } from '../src/update';
import { manifestPath, normalizedVendorHash, type InstallationManifest } from '../src/install-manifest';
import type { Harness } from '../src/harness';

const ALL_HARNESSES = ['claude', 'codex', 'pi', 'copilot', 'omp'] as const;
const CODEX_HARNESSES = ['codex'] as const;
const fullInventory = getBundleInventory(ALL_HARNESSES);

function project(): string {
  return mkdtempSync(join(tmpdir(), 'joycraft-upgrade-'));
}

function cleanup(root: string): void {
  rmSync(root, { recursive: true, force: true });
}

function bundle(inventory = fullInventory, version = '9.9.9') {
  return { version, integrity: '', inventory };
}

async function initialize(
  root: string,
  inventory = fullInventory,
  version = '1.0.0',
  harnesses: readonly Harness[] = ALL_HARNESSES,
) {
  return init(root, {
    nonInteractive: true,
    yes: true,
    harnesses,
    bundle: bundle(inventory, version),
  });
}

async function runUpgrade(root: string, inventory = fullInventory, options: Record<string, unknown> = {}) {
  return upgrade(root, {
    nonInteractive: true,
    yes: true,
    bundle: bundle(inventory),
    ...options,
  });
}

function entry(inventory: typeof fullInventory, pathSuffix: string) {
  const found = inventory.find((candidate) => candidate.path.endsWith(pathSuffix));
  if (!found) throw new Error(`Missing inventory entry: ${pathSuffix}`);
  return found;
}

function put(root: string, relative: string, content: string): void {
  const absolute = join(root, relative);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, 'utf8');
}

function readManifest(root: string, profile: 'shared' | 'private' = 'shared'): InstallationManifest {
  return JSON.parse(readFileSync(join(root, manifestPath(profile)), 'utf8')) as InstallationManifest;
}

describe('upgrade alias through the shared update engine', () => {
  it('reports invalid for a fresh unattended upgrade without harness selection', async () => {
    const root = project();
    try {
      const result = await upgrade(root, { nonInteractive: true, yes: true, bundle: bundle() });
      expect(result.status).toBe('invalid');
      expect(result.exitCode).toBe(1);
      expect(result.diagnostics.join(' ')).toMatch(/harness/i);
      expect(existsSync(join(root, manifestPath('shared')))).toBe(false);
    } finally {
      cleanup(root);
    }
  });

  it('reconciles an old manifest version without rewriting matching managed files', async () => {
    const root = project();
    try {
      expect((await initialize(root)).status).toBe('applied');
      const skill = entry(fullInventory, 'joycraft-tune/SKILL.md');
      const skillPath = join(root, skill.path);
      const beforeContent = readFileSync(skillPath, 'utf8');
      const beforeMtime = statSync(skillPath).mtimeMs;
      const manifest = readManifest(root);
      manifest.targetVersion = '0.0.1';
      writeFileSync(join(root, manifestPath('shared')), JSON.stringify(manifest, null, 2) + '\n');

      const result = await runUpgrade(root);

      expect(result.status).toBe('noop');
      expect(result.exitCode).toBe(0);
      expect(readManifest(root).targetVersion).toBe('9.9.9');
      expect(readFileSync(skillPath, 'utf8')).toBe(beforeContent);
      expect(statSync(skillPath).mtimeMs).toBe(beforeMtime);
    } finally {
      cleanup(root);
    }
  });

  it('maps the shared outcome statuses to the documented exit codes', () => {
    expect(updateStatusExitCode('applied')).toBe(0);
    expect(updateStatusExitCode('noop')).toBe(0);
    expect(updateStatusExitCode('preserved')).toBe(0);
    expect(updateStatusExitCode('invalid')).toBe(1);
    expect(updateStatusExitCode('failed')).toBe(1);
    expect(updateStatusExitCode('conflict')).toBe(2);
    expect(updateStatusExitCode('attention')).toBe(3);
  });

  it('preserves a local-only customization in safe --yes mode without prompting', async () => {
    const root = project();
    try {
      await initialize(root);
      const skill = entry(fullInventory, 'joycraft-tune/SKILL.md');
      const custom = `${readFileSync(join(root, skill.path), 'utf8')}\nlocal-only edit\n`;
      writeFileSync(join(root, skill.path), custom);

      const result = await runUpgrade(root);

      expect(result.status).toBe('preserved');
      expect(result.exitCode).toBe(0);
      expect(result.preserved).toContain(skill.path);
      expect(result.conflicts).toEqual([]);
      expect(readFileSync(join(root, skill.path), 'utf8')).toBe(custom);
    } finally {
      cleanup(root);
    }
  });

  it('preserves vendor conflicts under --yes and replaces only explicitly selected paths', async () => {
    const root = project();
    try {
      const oldInventory = fullInventory;
      const changedInventory = oldInventory.map((candidate) => candidate.path.endsWith('joycraft-tune/SKILL.md')
        ? { ...candidate, content: `${candidate.content ?? ''}\nvendor update\n` }
        : candidate);
      await initialize(root, oldInventory, '1.0.0');
      const skill = entry(changedInventory, 'joycraft-tune/SKILL.md');
      const custom = 'local edit that conflicts with a vendor update\n';
      writeFileSync(join(root, skill.path), custom);

      const conflict = await runUpgrade(root, changedInventory);
      expect(conflict.status).toBe('conflict');
      expect(conflict.exitCode).toBe(2);
      expect(conflict.conflicts).toContain(skill.path);
      expect(conflict.preserved).toContain(skill.path);
      expect(readFileSync(join(root, skill.path), 'utf8')).toBe(custom);

      const replaced = await runUpgrade(root, changedInventory, { replaceCustomized: [skill.path] });
      expect(replaced.status).toBe('applied');
      expect(replaced.exitCode).toBe(0);
      expect(readFileSync(join(root, skill.path), 'utf8')).toBe(skill.content);
      expect(readManifest(root).files[skill.path]?.vendorHash).toBe(normalizedVendorHash(skill.content!));
    } finally {
      cleanup(root);
    }
  });

  it('keeps declined custom bytes and the recorded vendor baseline across repeated upgrades', async () => {
    const root = project();
    try {
      const oldInventory = fullInventory;
      const changedInventory = oldInventory.map((candidate) => candidate.path.endsWith('joycraft-tune/SKILL.md')
        ? { ...candidate, content: `${candidate.content ?? ''}\nvendor update\n` }
        : candidate);
      await initialize(root, oldInventory, '1.0.0');
      const skill = entry(changedInventory, 'joycraft-tune/SKILL.md');
      const custom = 'the user customization must survive every conflict\n';
      writeFileSync(join(root, skill.path), custom);

      for (let run = 0; run < 3; run += 1) {
        const result = await runUpgrade(root, changedInventory);
        expect(result.status).toBe('conflict');
        expect(readFileSync(join(root, skill.path), 'utf8')).toBe(custom);
        expect(readManifest(root).files[skill.path]?.vendorHash).toBe(
          normalizedVendorHash(oldInventory.find((candidate) => candidate.path === skill.path)!.content!),
        );
      }
    } finally {
      cleanup(root);
    }
  });

  it('does not invent a vendor baseline for customized bytes with unknown ownership', async () => {
    const root = project();
    try {
      const oldInventory = fullInventory;
      const changedInventory = oldInventory.map((candidate) => candidate.path.endsWith('joycraft-tune/SKILL.md')
        ? { ...candidate, content: `${candidate.content ?? ''}\nvendor update\n` }
        : candidate);
      await initialize(root, oldInventory, '1.0.0');
      const skill = entry(changedInventory, 'joycraft-tune/SKILL.md');
      const manifest = readManifest(root);
      delete manifest.files[skill.path];
      writeFileSync(join(root, manifestPath('shared')), JSON.stringify(manifest, null, 2) + '\n');
      const custom = 'custom content with unknown ownership\n';
      writeFileSync(join(root, skill.path), custom);

      const result = await runUpgrade(root, changedInventory);

      expect(result.status).toBe('conflict');
      expect(readFileSync(join(root, skill.path), 'utf8')).toBe(custom);
      expect(readManifest(root).files[skill.path]).toBeUndefined();
    } finally {
      cleanup(root);
    }
  });

  it('auto-adds a new inventory file without prompting', async () => {
    const root = project();
    try {
      const initial = [entry(fullInventory, 'joycraft-tune/SKILL.md')];
      const expanded = [
        ...initial,
        entry(fullInventory, 'joycraft-setup/SKILL.md'),
      ];
      await initialize(root, initial, '1.0.0');
      rmSync(join(root, expanded[1].path), { force: true });

      const result = await runUpgrade(root, expanded);

      expect(result.status).toBe('applied');
      expect(result.applied).toContain(expanded[1].path);
      expect(readFileSync(join(root, expanded[1].path), 'utf8')).toBe(expanded[1].content);
    } finally {
      cleanup(root);
    }
  });

  it('leaves a user template beside managed templates untouched', async () => {
    const root = project();
    try {
      await initialize(root);
      const customPath = 'docs/templates/context/my-project-template.md';
      put(root, customPath, '# user template\n');
      const result = await runUpgrade(root);

      expect(result.exitCode).toBe(0);
      expect(readFileSync(join(root, customPath), 'utf8')).toBe('# user template\n');
    } finally {
      cleanup(root);
    }
  });

  it('does not remove non-Joycraft skill directories', async () => {
    const root = project();
    try {
      await initialize(root);
      const customPath = '.claude/skills/my-custom-skill/SKILL.md';
      put(root, customPath, 'my custom skill\n');
      await runUpgrade(root);

      expect(existsSync(join(root, customPath))).toBe(true);
      expect(readFileSync(join(root, customPath), 'utf8')).toBe('my custom skill\n');
    } finally {
      cleanup(root);
    }
  });

  it('installs only the selected harness and expands it when requested', async () => {
    const root = project();
    try {
      const codexInventory = getBundleInventory(CODEX_HARNESSES);
      const initial = await initialize(root, codexInventory, '1.0.0', CODEX_HARNESSES);
      expect(initial.harnesses).toEqual(['codex']);
      expect(existsSync(join(root, '.agents'))).toBe(true);
      expect(existsSync(join(root, '.claude'))).toBe(false);

      const expandedInventory = getBundleInventory(['codex', 'pi']);
      const result = await runUpgrade(root, expandedInventory, { harnesses: ['codex', 'pi'] });

      expect(result.exitCode).toBe(0);
      expect(existsSync(join(root, '.pi'))).toBe(true);
      expect(readManifest(root).harnesses).toEqual(['codex', 'pi']);
    } finally {
      cleanup(root);
    }
  });

  it('preserves user files outside the inventory across an upgrade', async () => {
    const root = project();
    try {
      await initialize(root);
      const files = {
        'CLAUDE.md': '# User instructions\n',
        'AGENTS.md': '# Team instructions\n',
        'docs/notes.md': 'user notes\n',
      };
      for (const [path, content] of Object.entries(files)) put(root, path, content);
      await runUpgrade(root);

      for (const [path, content] of Object.entries(files)) {
        expect(readFileSync(join(root, path), 'utf8')).toBe(content);
      }
    } finally {
      cleanup(root);
    }
  });

  it('writes the executing bundle version after applying a changed vendor file', async () => {
    const root = project();
    try {
      const oldInventory = fullInventory;
      const changedInventory = oldInventory.map((candidate) => candidate.path.endsWith('joycraft-tune/SKILL.md')
        ? { ...candidate, content: `${candidate.content ?? ''}\nvendor update\n` }
        : candidate);
      await initialize(root, oldInventory, '0.1.0');
      const skill = entry(changedInventory, 'joycraft-tune/SKILL.md');
      const result = await runUpgrade(root, changedInventory);

      expect(result.status).toBe('applied');
      expect(readManifest(root).targetVersion).toBe('9.9.9');
      expect(readFileSync(join(root, skill.path), 'utf8')).toBe(skill.content);
    } finally {
      cleanup(root);
    }
  });
});
