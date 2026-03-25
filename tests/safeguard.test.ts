import { describe, it, expect, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  getDefaultDenyPatterns,
  generateHookScript,
  generateDenyPatternsFile,
  installSafeguardHooks,
} from '../src/safeguard';

function createTmpDir(): string {
  const dir = join(tmpdir(), `joycraft-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

describe('safeguard', () => {
  describe('getDefaultDenyPatterns', () => {
    it('returns expected patterns', () => {
      const patterns = getDefaultDenyPatterns();
      expect(patterns).toContain('rm\\s+-rf\\s+/');
      expect(patterns).toContain('git\\s+push\\s+--force');
      expect(patterns).toContain('DROP\\s+TABLE');
      expect(patterns).toContain('chmod\\s+777');
      expect(patterns).toContain('curl.*\\|.*sh');
      expect(patterns.length).toBeGreaterThan(5);
    });
  });

  describe('generateHookScript', () => {
    it('returns a valid bash script', () => {
      const script = generateHookScript();
      expect(script).toMatch(/^#!\/bin\/bash/);
      expect(script).toContain('TOOL_NAME=');
      expect(script).toContain('deny-patterns.txt');
      expect(script).toContain('exit 2');
      expect(script).toContain('exit 0');
    });
  });

  describe('generateDenyPatternsFile', () => {
    it('with no custom patterns returns defaults', () => {
      const content = generateDenyPatternsFile();
      expect(content).toContain('rm\\s+-rf\\s+/');
      expect(content).toContain('git\\s+push\\s+--force');
      expect(content).toContain('DROP\\s+TABLE');
      expect(content).toContain('# Joycraft Safeguard');
      expect(content).not.toContain('Project-specific');
    });

    it('includes custom patterns', () => {
      const content = generateDenyPatternsFile(['prod\\.example\\.com']);
      expect(content).toContain('prod\\.example\\.com');
      expect(content).toContain('# Project-specific patterns (from risk interview)');
      // Still has defaults
      expect(content).toContain('rm\\s+-rf\\s+/');
    });
  });

  describe('installSafeguardHooks', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = createTmpDir();
      return () => cleanup(tmpDir);
    });

    it('creates hook script and deny-patterns.txt', () => {
      const result = installSafeguardHooks(tmpDir);

      const hookPath = join(tmpDir, '.claude', 'hooks', 'joycraft', 'block-dangerous.sh');
      const patternsPath = join(tmpDir, '.claude', 'hooks', 'joycraft', 'deny-patterns.txt');

      expect(existsSync(hookPath)).toBe(true);
      expect(existsSync(patternsPath)).toBe(true);
      expect(result.created).toContain(hookPath);
      expect(result.created).toContain(patternsPath);
      expect(result.skipped).toHaveLength(0);
    });

    it('registers PreToolUse hook in settings.json', () => {
      installSafeguardHooks(tmpDir);

      const settings = JSON.parse(readFileSync(join(tmpDir, '.claude', 'settings.json'), 'utf-8'));
      expect(settings.hooks).toBeDefined();
      expect(settings.hooks.PreToolUse).toBeDefined();
      expect(settings.hooks.PreToolUse).toHaveLength(1);
      expect(settings.hooks.PreToolUse[0].matcher).toBe('Bash');
      expect(settings.hooks.PreToolUse[0].hooks[0].command).toContain('joycraft');
    });

    it('does not duplicate on re-run', () => {
      installSafeguardHooks(tmpDir);
      const result2 = installSafeguardHooks(tmpDir);

      // Files skipped
      expect(result2.skipped).toHaveLength(2);
      expect(result2.created).toHaveLength(0);

      // Hook not duplicated in settings
      const settings = JSON.parse(readFileSync(join(tmpDir, '.claude', 'settings.json'), 'utf-8'));
      expect(settings.hooks.PreToolUse).toHaveLength(1);
    });

    it('overwrites with force flag', () => {
      installSafeguardHooks(tmpDir);

      // Modify the patterns file
      const patternsPath = join(tmpDir, '.claude', 'hooks', 'joycraft', 'deny-patterns.txt');
      writeFileSync(patternsPath, 'custom content');

      const result2 = installSafeguardHooks(tmpDir, [], true);
      expect(result2.created).toHaveLength(2);

      const content = readFileSync(patternsPath, 'utf-8');
      expect(content).toContain('# Joycraft Safeguard');
      expect(content).not.toBe('custom content');
    });

    it('merges with existing settings.json hooks', () => {
      // Pre-create settings with a SessionStart hook
      mkdirSync(join(tmpDir, '.claude'), { recursive: true });
      writeFileSync(join(tmpDir, '.claude', 'settings.json'), JSON.stringify({
        hooks: {
          SessionStart: [{
            matcher: '',
            hooks: [{ type: 'command', command: 'node .claude/hooks/joycraft-version-check.mjs' }],
          }],
        },
        permissions: {
          allow: ['Bash(git status)'],
        },
      }, null, 2) + '\n');

      installSafeguardHooks(tmpDir);

      const settings = JSON.parse(readFileSync(join(tmpDir, '.claude', 'settings.json'), 'utf-8'));
      // SessionStart hook preserved
      expect(settings.hooks.SessionStart).toHaveLength(1);
      expect(settings.hooks.SessionStart[0].hooks[0].command).toContain('version-check');
      // PreToolUse hook added
      expect(settings.hooks.PreToolUse).toHaveLength(1);
      // Permissions preserved
      expect(settings.permissions.allow).toContain('Bash(git status)');
    });

    it('includes custom patterns in deny-patterns.txt', () => {
      installSafeguardHooks(tmpDir, ['prod\\.example\\.com']);

      const content = readFileSync(join(tmpDir, '.claude', 'hooks', 'joycraft', 'deny-patterns.txt'), 'utf-8');
      expect(content).toContain('prod\\.example\\.com');
    });
  });
});
