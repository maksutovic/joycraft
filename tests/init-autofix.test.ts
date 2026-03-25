import { describe, it, expect, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initAutofix } from '../src/init-autofix';

function createTmpDir(): string {
  const dir = join(tmpdir(), `joycraft-autofix-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

/** Write a .joycraft-version file so the project appears initialized */
function markInitialized(dir: string): void {
  writeFileSync(join(dir, '.joycraft-version'), JSON.stringify({ version: '0.1.0', files: {} }));
}

describe('init-autofix', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTmpDir();
    return () => cleanup(tmpDir);
  });

  describe('pre-condition check', () => {
    it('throws if project is not initialized (no .joycraft-version)', async () => {
      await expect(initAutofix(tmpDir, {})).rejects.toThrow('joycraft init');
    });
  });

  describe('workflow files', () => {
    it('creates all four workflow files in .github/workflows/', async () => {
      markInitialized(tmpDir);
      await initAutofix(tmpDir, {});

      expect(existsSync(join(tmpDir, '.github', 'workflows', 'autofix.yml'))).toBe(true);
      expect(existsSync(join(tmpDir, '.github', 'workflows', 'scenarios-dispatch.yml'))).toBe(true);
      expect(existsSync(join(tmpDir, '.github', 'workflows', 'spec-dispatch.yml'))).toBe(true);
      expect(existsSync(join(tmpDir, '.github', 'workflows', 'scenarios-rerun.yml'))).toBe(true);
    });
  });

  describe('placeholder replacement', () => {
    it('replaces $JOYCRAFT_APP_ID when --app-id is provided', async () => {
      markInitialized(tmpDir);
      await initAutofix(tmpDir, { appId: '12345' });

      const autofix = readFileSync(join(tmpDir, '.github', 'workflows', 'autofix.yml'), 'utf-8');
      expect(autofix).toContain('12345');
      expect(autofix).not.toContain('$JOYCRAFT_APP_ID');
    });

    it('replaces $SCENARIOS_REPO when --scenarios-repo is provided', async () => {
      markInitialized(tmpDir);
      await initAutofix(tmpDir, { scenariosRepo: 'my-app-scenarios' });

      const dispatch = readFileSync(join(tmpDir, '.github', 'workflows', 'scenarios-dispatch.yml'), 'utf-8');
      expect(dispatch).toContain('my-app-scenarios');
      expect(dispatch).not.toContain('$SCENARIOS_REPO');
    });

    it('does not replace ${{ ... }} GitHub Actions expressions', async () => {
      markInitialized(tmpDir);
      await initAutofix(tmpDir, { appId: '12345' });

      const autofix = readFileSync(join(tmpDir, '.github', 'workflows', 'autofix.yml'), 'utf-8');
      // GitHub Actions expressions like ${{ secrets.JOYCRAFT_APP_PRIVATE_KEY }} must survive
      expect(autofix).toContain('${{');
    });

    it('leaves $JOYCRAFT_APP_ID as-is when --app-id is not provided', async () => {
      markInitialized(tmpDir);
      await initAutofix(tmpDir, {});

      const autofix = readFileSync(join(tmpDir, '.github', 'workflows', 'autofix.yml'), 'utf-8');
      expect(autofix).toContain('$JOYCRAFT_APP_ID');
    });

    it('defaults $SCENARIOS_REPO to basename(dir)-scenarios when not provided', async () => {
      markInitialized(tmpDir);
      await initAutofix(tmpDir, {});

      const dispatch = readFileSync(join(tmpDir, '.github', 'workflows', 'scenarios-dispatch.yml'), 'utf-8');
      // The default is derived from basename(tmpDir) + '-scenarios'
      const { basename } = await import('node:path');
      const expectedRepo = `${basename(tmpDir)}-scenarios`;
      expect(dispatch).toContain(expectedRepo);
    });
  });

  describe('scenario bootstrap files', () => {
    it('creates scenario template files in docs/templates/scenarios/', async () => {
      markInitialized(tmpDir);
      await initAutofix(tmpDir, {});

      expect(existsSync(join(tmpDir, 'docs', 'templates', 'scenarios', 'example-scenario.test.ts'))).toBe(true);
      expect(existsSync(join(tmpDir, 'docs', 'templates', 'scenarios', 'workflows', 'run.yml'))).toBe(true);
      expect(existsSync(join(tmpDir, 'docs', 'templates', 'scenarios', 'package.json'))).toBe(true);
      expect(existsSync(join(tmpDir, 'docs', 'templates', 'scenarios', 'README.md'))).toBe(true);
      expect(existsSync(join(tmpDir, 'docs', 'templates', 'scenarios', 'workflows', 'generate.yml'))).toBe(true);
      expect(existsSync(join(tmpDir, 'docs', 'templates', 'scenarios', 'prompts', 'scenario-agent.md'))).toBe(true);
    });
  });

  describe('skip / force behavior', () => {
    it('skips existing workflow files without --force', async () => {
      markInitialized(tmpDir);
      mkdirSync(join(tmpDir, '.github', 'workflows'), { recursive: true });
      writeFileSync(join(tmpDir, '.github', 'workflows', 'autofix.yml'), 'custom content');

      await initAutofix(tmpDir, {});

      const content = readFileSync(join(tmpDir, '.github', 'workflows', 'autofix.yml'), 'utf-8');
      expect(content).toBe('custom content');
    });

    it('overwrites existing files with --force', async () => {
      markInitialized(tmpDir);
      mkdirSync(join(tmpDir, '.github', 'workflows'), { recursive: true });
      writeFileSync(join(tmpDir, '.github', 'workflows', 'autofix.yml'), 'custom content');

      await initAutofix(tmpDir, { force: true });

      const content = readFileSync(join(tmpDir, '.github', 'workflows', 'autofix.yml'), 'utf-8');
      expect(content).not.toBe('custom content');
      expect(content.length).toBeGreaterThan(50);
    });
  });

  describe('setup checklist', () => {
    it('prints checklist mentioning JOYCRAFT_APP_PRIVATE_KEY and ANTHROPIC_API_KEY', async () => {
      markInitialized(tmpDir);

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (...args: unknown[]) => logs.push(args.join(' '));
      try {
        await initAutofix(tmpDir, {});
      } finally {
        console.log = origLog;
      }

      const output = logs.join('\n');
      expect(output).toContain('JOYCRAFT_APP_PRIVATE_KEY');
      expect(output).toContain('ANTHROPIC_API_KEY');
    });
  });

  describe('--dry-run', () => {
    it('lists files without creating them', async () => {
      markInitialized(tmpDir);

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (...args: unknown[]) => logs.push(args.join(' '));
      try {
        await initAutofix(tmpDir, { dryRun: true });
      } finally {
        console.log = origLog;
      }

      // No files should be created
      expect(existsSync(join(tmpDir, '.github', 'workflows', 'autofix.yml'))).toBe(false);
      expect(existsSync(join(tmpDir, 'docs', 'templates', 'scenarios', 'README.md'))).toBe(false);

      // But output should list the files
      const output = logs.join('\n');
      expect(output).toContain('autofix.yml');
      expect(output).toContain('scenarios');
    });
  });
});
