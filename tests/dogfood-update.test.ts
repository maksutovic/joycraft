import { afterEach, describe, expect, it } from 'vitest';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { update } from '../src/update';
import { readInstallationManifestInfo, manifestPath } from '../src/install-manifest';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function put(root: string, path: string, content: string) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

describe('repository dogfood through the production updater', () => {
  it('replaces a reviewed legacy checker through the transaction while retaining its registration', async () => {
    const root = mkdtempSync(join(tmpdir(), 'joycraft legacy checker '));
    roots.push(root);
    const hook = '.claude/hooks/joycraft-version-check.mjs';
    const oldHook = '// Earlier local version checker\nprocess.exit(0);\n';
    const legacy = JSON.stringify({ version: '0.7.11', harnesses: ['claude'], files: {} });
    const settings = JSON.stringify({ customOption: 'keep', hooks: { SessionStart: [{ matcher: '', hooks: [
      { type: 'command', command: `node ${hook}` },
      { type: 'command', command: 'echo project hook' },
    ] }] } }, null, 2) + '\n';
    put(root, hook, oldHook);
    put(root, '.claude/settings.json', settings);
    put(root, 'docs/.joycraft/state.json', legacy);
    const result = await update(root, { nonInteractive: true, replaceCustomized: [hook] });
    expect(result.applied).toContain(hook);
    expect(result.conflicts).not.toContain(hook);
    expect(readFileSync(join(root, hook), 'utf8')).toContain('checkForUpdate');
    expect(readFileSync(join(root, '.claude/settings.json'), 'utf8')).toBe(settings);
    expect(existsSync(join(root, 'docs/.joycraft/state.json'))).toBe(false);
    expect((await update(root, { recovery: 'rollback' })).exitCode).toBe(0);
    expect(readFileSync(join(root, hook), 'utf8')).toBe(oldHook);
    expect(readFileSync(join(root, 'docs/.joycraft/state.json'), 'utf8')).toBe(legacy);
    expect(readFileSync(join(root, '.claude/settings.json'), 'utf8')).toBe(settings);
  });
  it('bridges a copied installation while preserving custom skills, instructions, and local preferences', async () => {
    const root = mkdtempSync(join(tmpdir(), 'joycraft copied repo with spaces '));
    roots.push(root);
    cpSync('.agents/skills', join(root, '.agents/skills'), { recursive: true });
    cpSync('AGENTS.md', join(root, 'AGENTS.md'));
    const instructions = readFileSync(join(root, 'AGENTS.md'));
    const skill = '.agents/skills/joycraft-tune/SKILL.md';
    const custom = readFileSync(join(root, skill), 'utf8') + '\nProject-specific instruction: preserve my release conventions.\r\n';
    put(root, skill, custom);
    const legacy = JSON.stringify({ version: '0.7.11', harnesses: ['codex'], gitignoreProfile: 'shared', autoOpen: false, files: {}, userExtension: { keep: 'unchanged' } });
    put(root, 'docs/.joycraft/state.json', legacy);
    const preview = await update(root, { preview: true, nonInteractive: true });
    expect(preview.conflicts).toContain(skill);
    expect(preview.applied).toEqual([]);
    expect(existsSync(join(root, manifestPath()))).toBe(false);
    expect(readFileSync(join(root, 'docs/.joycraft/state.json'), 'utf8')).toBe(legacy);
    const applied = await update(root, { nonInteractive: true, yes: true });
    expect(applied.exitCode).toBe(2);
    expect(applied.conflicts).toEqual(preview.conflicts);
    expect(applied.preserved).toContain(skill);
    expect(readFileSync(join(root, skill), 'utf8')).toBe(custom);
    expect(readFileSync(join(root, 'AGENTS.md'))).toEqual(instructions);
    expect(applied.harnesses).toEqual(['codex']);
    expect(existsSync(join(root, 'docs/.joycraft/state.json'))).toBe(false);
    const local = JSON.parse(readFileSync(join(root, 'docs/.joycraft/local/settings.json'), 'utf8'));
    expect(local.autoOpen).toBe(false);
    expect(local.legacy.state.userExtension).toEqual({ keep: 'unchanged' });
    const backup = JSON.parse(readFileSync(join(root, 'docs/.joycraft/local/legacy-state-backup.json'), 'utf8'));
    expect(Buffer.from(backup['docs/.joycraft/state.json'], 'base64').toString('utf8')).toBe(legacy);
    expect((await update(root, { nonInteractive: true })).conflicts).toContain(skill);
    expect(readFileSync(join(root, skill), 'utf8')).toBe(custom);
  });

  it('checks in the repository manifest produced by its dogfood update', () => {
    const installed = readInstallationManifestInfo(process.cwd(), 'shared');
    expect(installed.status).toBe('valid');
    if (!installed.manifest) return;
    // Release preparation can bump the package without applying a new local
    // installation. This manifest records the last real dogfood transaction.
    expect(installed.manifest.targetVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(installed.manifest.harnesses).toEqual(['claude', 'codex', 'pi', 'copilot', 'omp']);
    expect(installed.manifest.files['docs/.joycraft/check.mjs'].ownership).toBe('verified');
  });
});
