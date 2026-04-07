import { describe, it, expect, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { init } from '../src/init';

function createTmpDir(): string {
  const dir = join(tmpdir(), `joycraft-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

describe('init', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTmpDir();
    return () => cleanup(tmpDir);
  });

  describe('empty directory', () => {
    it('creates all directories, CLAUDE.md, skills, and templates', async () => {
      await init(tmpDir, { force: false });

      // docs subdirectories
      expect(existsSync(join(tmpDir, 'docs', 'briefs'))).toBe(true);
      expect(existsSync(join(tmpDir, 'docs', 'specs'))).toBe(true);
      expect(existsSync(join(tmpDir, 'docs', 'discoveries'))).toBe(true);
      expect(existsSync(join(tmpDir, 'docs', 'contracts'))).toBe(true);
      expect(existsSync(join(tmpDir, 'docs', 'decisions'))).toBe(true);

      // CLAUDE.md
      expect(existsSync(join(tmpDir, 'CLAUDE.md'))).toBe(true);
      const claude = readFileSync(join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(claude).toContain('## Behavioral Boundaries');
      expect(claude).toContain('## Development Workflow');
      expect(claude).toContain('### ALWAYS');
      expect(claude).toContain('### ASK FIRST');
      expect(claude).toContain('### NEVER');

      // Skills
      expect(existsSync(join(tmpDir, '.claude', 'skills', 'joycraft-tune', 'SKILL.md'))).toBe(true);
      expect(existsSync(join(tmpDir, '.claude', 'skills', 'joycraft-new-feature', 'SKILL.md'))).toBe(true);
      expect(existsSync(join(tmpDir, '.claude', 'skills', 'joycraft-decompose', 'SKILL.md'))).toBe(true);
      expect(existsSync(join(tmpDir, '.claude', 'skills', 'joycraft-bugfix', 'SKILL.md'))).toBe(true);

      // Templates (keyed by relative path from src/templates/)
      expect(existsSync(join(tmpDir, 'docs', 'templates', 'examples', 'example-spec.md'))).toBe(true);
      expect(existsSync(join(tmpDir, 'docs', 'templates', 'examples', 'example-brief.md'))).toBe(true);
      expect(existsSync(join(tmpDir, 'docs', 'templates', 'context', 'production-map.md'))).toBe(true);
      expect(existsSync(join(tmpDir, 'docs', 'templates', 'context', 'troubleshooting.md'))).toBe(true);
    });

    it('creates pipit-examples directory with README', async () => {
      await init(tmpDir, { force: false });
      expect(existsSync(join(tmpDir, 'docs', 'pipit-examples'))).toBe(true);
      expect(existsSync(join(tmpDir, 'docs', 'pipit-examples', 'README.md'))).toBe(true);
      const readme = readFileSync(join(tmpDir, 'docs', 'pipit-examples', 'README.md'), 'utf-8');
      expect(readme).toContain('Pipit');
      expect(readme).toContain('optional');
    });
  });

  describe('directory with existing CLAUDE.md', () => {
    it('leaves existing CLAUDE.md untouched', async () => {
      const existingContent = '# My Project\n\nThis is my project description.\n\n## Custom Section\n\nMy custom content here.\n';
      writeFileSync(join(tmpDir, 'CLAUDE.md'), existingContent);

      await init(tmpDir, { force: false });

      const claude = readFileSync(join(tmpDir, 'CLAUDE.md'), 'utf-8');
      // File is completely unchanged
      expect(claude).toBe(existingContent);
    });

    it('still installs skills and templates alongside existing CLAUDE.md', async () => {
      writeFileSync(join(tmpDir, 'CLAUDE.md'), '# Existing project\n');

      await init(tmpDir, { force: false });

      // Skills installed
      expect(existsSync(join(tmpDir, '.claude', 'skills', 'joycraft-tune', 'SKILL.md'))).toBe(true);
      // Templates installed
      expect(existsSync(join(tmpDir, 'docs', 'templates', 'examples', 'example-spec.md'))).toBe(true);
      // CLAUDE.md untouched
      expect(readFileSync(join(tmpDir, 'CLAUDE.md'), 'utf-8')).toBe('# Existing project\n');
    });
  });

  describe('running init twice', () => {
    it('second run skips existing files', async () => {
      await init(tmpDir, { force: false });
      const firstClaude = readFileSync(join(tmpDir, 'CLAUDE.md'), 'utf-8');
      const firstSkill = readFileSync(join(tmpDir, '.claude', 'skills', 'joycraft-tune', 'SKILL.md'), 'utf-8');

      // Run again
      await init(tmpDir, { force: false });
      const secondClaude = readFileSync(join(tmpDir, 'CLAUDE.md'), 'utf-8');
      const secondSkill = readFileSync(join(tmpDir, '.claude', 'skills', 'joycraft-tune', 'SKILL.md'), 'utf-8');

      // Files should be identical
      expect(secondClaude).toBe(firstClaude);
      expect(secondSkill).toBe(firstSkill);
    });
  });

  describe('--force flag', () => {
    it('overwrites existing files', async () => {
      // First init
      await init(tmpDir, { force: false });

      // Modify a skill file
      writeFileSync(join(tmpDir, '.claude', 'skills', 'joycraft-tune', 'SKILL.md'), 'custom content');

      // Init with force
      await init(tmpDir, { force: true });

      const skill = readFileSync(join(tmpDir, '.claude', 'skills', 'joycraft-tune', 'SKILL.md'), 'utf-8');
      expect(skill).not.toBe('custom content');
      expect(skill).toContain('Joycraft');
    });

    it('regenerates CLAUDE.md with force', async () => {
      await init(tmpDir, { force: false });
      writeFileSync(join(tmpDir, 'CLAUDE.md'), 'totally replaced content');

      await init(tmpDir, { force: true });

      const claude = readFileSync(join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(claude).toContain('## Behavioral Boundaries');
      expect(claude).not.toBe('totally replaced content');
    });
  });

  describe('stack detection in generated CLAUDE.md', () => {
    it('includes Node.js commands for a Node project', async () => {
      // Create a package.json to trigger Node detection
      writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
        name: 'test-project',
        scripts: { build: 'tsc', test: 'vitest', lint: 'eslint .' },
        devDependencies: { typescript: '^5.0.0', vitest: '^1.0.0' },
      }));

      await init(tmpDir, { force: false });

      const claude = readFileSync(join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(claude).toContain('npm run build');
      expect(claude).toContain('npm run test');
      expect(claude).toContain('npm run lint');
      expect(claude).toContain('node');
    });

    it('includes Go commands for a Go project', async () => {
      writeFileSync(join(tmpDir, 'go.mod'), 'module example.com/test\n\ngo 1.21\n');

      await init(tmpDir, { force: false });

      const claude = readFileSync(join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(claude).toContain('go build');
      expect(claude).toContain('go test');
    });

    it('includes Rust commands for a Rust project', async () => {
      writeFileSync(join(tmpDir, 'Cargo.toml'), '[package]\nname = "test"\nversion = "0.1.0"\n');

      await init(tmpDir, { force: false });

      const claude = readFileSync(join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(claude).toContain('cargo build');
      expect(claude).toContain('cargo test');
    });

    it('includes Python commands for a Python project', async () => {
      writeFileSync(join(tmpDir, 'pyproject.toml'), '[tool.poetry]\nname = "test"\n');

      await init(tmpDir, { force: false });

      const claude = readFileSync(join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(claude).toContain('poetry');
    });
  });

  describe('gitignore warning', () => {
    it('warns when .gitignore blocks .claude/', async () => {
      writeFileSync(join(tmpDir, '.gitignore'), '.claude/\nnode_modules/\n');

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (...args: unknown[]) => logs.push(args.join(' '));
      try {
        await init(tmpDir, { force: false });
      } finally {
        console.log = origLog;
      }

      expect(logs.some(l => l.includes('.gitignore'))).toBe(true);
      expect(logs.some(l => l.includes('!.claude/skills/'))).toBe(true);
    });
  });

  describe('permissions in settings.json', () => {
    it('adds permission rules to settings.json', async () => {
      await init(tmpDir, { force: false });

      const settings = JSON.parse(readFileSync(join(tmpDir, '.claude', 'settings.json'), 'utf-8'));
      expect(settings.permissions).toBeDefined();
      expect(settings.permissions.deny).toContain('Bash(rm -rf *)');
      expect(settings.permissions.deny).toContain('Edit(//.env*)');
      expect(settings.permissions.allow).toContain('Bash(git status)');
    });

    it('adds stack-specific permissions for Node.js', async () => {
      writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
        name: 'test-project',
        scripts: { test: 'vitest', build: 'tsc' },
        devDependencies: { vitest: '^1.0.0' },
      }));
      writeFileSync(join(tmpDir, 'pnpm-lock.yaml'), '');

      await init(tmpDir, { force: false });

      const settings = JSON.parse(readFileSync(join(tmpDir, '.claude', 'settings.json'), 'utf-8'));
      expect(settings.permissions.allow).toContain('Bash(pnpm *)');
      expect(settings.permissions.deny).toContain('Bash(npm install *)');
      expect(settings.permissions.deny).toContain('Bash(yarn add *)');
    });

    it('does not duplicate permissions on second init', async () => {
      await init(tmpDir, { force: false });
      await init(tmpDir, { force: false });

      const settings = JSON.parse(readFileSync(join(tmpDir, '.claude', 'settings.json'), 'utf-8'));
      const denyCount = settings.permissions.deny.filter((r: string) => r === 'Bash(rm -rf *)').length;
      expect(denyCount).toBe(1);
    });

    it('preserves existing permissions', async () => {
      mkdirSync(join(tmpDir, '.claude'), { recursive: true });
      writeFileSync(join(tmpDir, '.claude', 'settings.json'), JSON.stringify({
        permissions: {
          allow: ['Bash(custom-tool *)'],
          deny: ['Bash(dangerous-thing *)'],
        },
      }, null, 2) + '\n');

      await init(tmpDir, { force: false });

      const settings = JSON.parse(readFileSync(join(tmpDir, '.claude', 'settings.json'), 'utf-8'));
      expect(settings.permissions.allow).toContain('Bash(custom-tool *)');
      expect(settings.permissions.deny).toContain('Bash(dangerous-thing *)');
      expect(settings.permissions.deny).toContain('Bash(rm -rf *)');
    });
  });

  describe('settings.json resilience', () => {
    it('preserves custom hooks in pre-existing settings.json', async () => {
      mkdirSync(join(tmpDir, '.claude'), { recursive: true });
      writeFileSync(join(tmpDir, '.claude', 'settings.json'), JSON.stringify({
        hooks: {
          PreToolUse: [{
            matcher: 'Bash',
            hooks: [{
              type: 'command',
              command: 'echo "custom pre-tool hook"',
            }],
          }],
        },
      }, null, 2) + '\n');

      await init(tmpDir, { force: false });

      const settings = JSON.parse(readFileSync(join(tmpDir, '.claude', 'settings.json'), 'utf-8'));
      // Custom hook preserved
      expect(settings.hooks.PreToolUse).toBeDefined();
      expect(settings.hooks.PreToolUse[0].hooks[0].command).toBe('echo "custom pre-tool hook"');
      // Joycraft hook added
      expect(settings.hooks.SessionStart).toBeDefined();
      const joycraftHook = settings.hooks.SessionStart.find((h: Record<string, unknown>) => {
        const innerHooks = h.hooks as Array<Record<string, unknown>> | undefined;
        return innerHooks?.some(ih => typeof ih.command === 'string' && (ih.command as string).includes('joycraft'));
      });
      expect(joycraftHook).toBeDefined();
    });

    it('warns and skips merge when settings.json is malformed', async () => {
      mkdirSync(join(tmpDir, '.claude'), { recursive: true });
      const malformedContent = '{ "hooks": { broken json here';
      writeFileSync(join(tmpDir, '.claude', 'settings.json'), malformedContent);

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (...args: unknown[]) => logs.push(args.join(' '));
      try {
        await init(tmpDir, { force: false });
      } finally {
        console.log = origLog;
      }

      // Warning emitted
      expect(logs.some(l => l.includes('malformed'))).toBe(true);
      expect(logs.some(l => l.includes('Fix the JSON'))).toBe(true);
      // File not modified
      const content = readFileSync(join(tmpDir, '.claude', 'settings.json'), 'utf-8');
      expect(content).toBe(malformedContent);
    });

    it('preserves existing allow/deny rules and appends Joycraft rules', async () => {
      mkdirSync(join(tmpDir, '.claude'), { recursive: true });
      writeFileSync(join(tmpDir, '.claude', 'settings.json'), JSON.stringify({
        permissions: {
          allow: ['Bash(my-custom-tool *)'],
          deny: ['Bash(my-dangerous-cmd *)'],
        },
      }, null, 2) + '\n');

      await init(tmpDir, { force: false });

      const settings = JSON.parse(readFileSync(join(tmpDir, '.claude', 'settings.json'), 'utf-8'));
      // Existing rules preserved
      expect(settings.permissions.allow).toContain('Bash(my-custom-tool *)');
      expect(settings.permissions.deny).toContain('Bash(my-dangerous-cmd *)');
      // Joycraft rules appended
      expect(settings.permissions.allow).toContain('Bash(git status)');
      expect(settings.permissions.deny).toContain('Bash(rm -rf *)');
      expect(settings.permissions.deny).toContain('Edit(//.env*)');
    });
  });

  describe('existing non-Joycraft skills', () => {
    it('includes Project Tools section in CLAUDE.md when non-Joycraft skills exist', async () => {
      // Pre-create non-Joycraft skill directories
      mkdirSync(join(tmpDir, '.claude', 'skills', 'flash-deploy'), { recursive: true });
      writeFileSync(join(tmpDir, '.claude', 'skills', 'flash-deploy', 'SKILL.md'), 'deploy skill');
      mkdirSync(join(tmpDir, '.claude', 'skills', 'log-watcher'), { recursive: true });
      writeFileSync(join(tmpDir, '.claude', 'skills', 'log-watcher', 'SKILL.md'), 'log skill');

      await init(tmpDir, { force: false });

      const claude = readFileSync(join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(claude).toContain('## Project Tools');
      expect(claude).toContain('flash-deploy');
      expect(claude).toContain('log-watcher');
      expect(claude).toContain('.claude/skills/');
    });

    it('does not include Project Tools section when no non-Joycraft skills exist', async () => {
      await init(tmpDir, { force: false });

      const claude = readFileSync(join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(claude).not.toContain('## Project Tools');
    });

    it('prints a note about existing skills during init', async () => {
      mkdirSync(join(tmpDir, '.claude', 'skills', 'my-tool'), { recursive: true });
      writeFileSync(join(tmpDir, '.claude', 'skills', 'my-tool', 'SKILL.md'), 'tool');

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (...args: unknown[]) => logs.push(args.join(' '));
      try {
        await init(tmpDir, { force: false });
      } finally {
        console.log = origLog;
      }

      expect(logs.some(l => l.includes('Found existing skills') && l.includes('my-tool'))).toBe(true);
      expect(logs.some(l => l.includes('Joycraft is additive'))).toBe(true);
    });

    it('ignores joycraft-prefixed directories when scanning for existing skills', async () => {
      // Pre-create a joycraft-prefixed skill (simulating previous init)
      mkdirSync(join(tmpDir, '.claude', 'skills', 'joycraft-tune'), { recursive: true });
      writeFileSync(join(tmpDir, '.claude', 'skills', 'joycraft-tune', 'SKILL.md'), 'tune');

      await init(tmpDir, { force: false });

      const claude = readFileSync(join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(claude).not.toContain('## Project Tools');
    });
  });

  describe('Codex skills (.agents/skills/)', () => {
    it('creates all 12 .agents/skills/*/SKILL.md files on empty dir', async () => {
      await init(tmpDir, { force: false });

      const expectedSkills = [
        'joycraft-add-fact',
        'joycraft-bugfix',
        'joycraft-decompose',
        'joycraft-design',
        'joycraft-implement-level5',
        'joycraft-interview',
        'joycraft-lockdown',
        'joycraft-new-feature',
        'joycraft-research',
        'joycraft-session-end',
        'joycraft-tune',
        'joycraft-verify',
      ];
      for (const skill of expectedSkills) {
        expect(existsSync(join(tmpDir, '.agents', 'skills', skill, 'SKILL.md'))).toBe(true);
      }
    });

    it('preserves existing non-Joycraft content in .agents/skills/', async () => {
      mkdirSync(join(tmpDir, '.agents', 'skills', 'custom-tool'), { recursive: true });
      writeFileSync(join(tmpDir, '.agents', 'skills', 'custom-tool', 'SKILL.md'), 'my custom tool');

      await init(tmpDir, { force: false });

      // Custom skill preserved
      expect(readFileSync(join(tmpDir, '.agents', 'skills', 'custom-tool', 'SKILL.md'), 'utf-8')).toBe('my custom tool');
      // Joycraft Codex skills installed
      expect(existsSync(join(tmpDir, '.agents', 'skills', 'joycraft-tune', 'SKILL.md'))).toBe(true);
    });

    it('overwrites existing Joycraft Codex skills with force: true', async () => {
      await init(tmpDir, { force: false });

      // Modify a Codex skill
      writeFileSync(join(tmpDir, '.agents', 'skills', 'joycraft-tune', 'SKILL.md'), 'custom content');

      await init(tmpDir, { force: true });

      const skill = readFileSync(join(tmpDir, '.agents', 'skills', 'joycraft-tune', 'SKILL.md'), 'utf-8');
      expect(skill).not.toBe('custom content');
      expect(skill).toContain('Joycraft');
    });

    it('skips existing Joycraft Codex skills without force', async () => {
      await init(tmpDir, { force: false });

      // Modify a Codex skill
      writeFileSync(join(tmpDir, '.agents', 'skills', 'joycraft-tune', 'SKILL.md'), 'custom content');

      await init(tmpDir, { force: false });

      const skill = readFileSync(join(tmpDir, '.agents', 'skills', 'joycraft-tune', 'SKILL.md'), 'utf-8');
      expect(skill).toBe('custom content');
    });

    it('includes .agents/skills/ hashes in .joycraft-version', async () => {
      await init(tmpDir, { force: false });

      const version = JSON.parse(readFileSync(join(tmpDir, '.joycraft-version'), 'utf-8'));
      const agentsKeys = Object.keys(version.files).filter(k => k.startsWith('.agents'));
      expect(agentsKeys.length).toBe(13);
      expect(agentsKeys.some(k => k.includes('joycraft-tune'))).toBe(true);
      expect(agentsKeys.some(k => k.includes('joycraft-decompose'))).toBe(true);
    });
  });

  describe('partial harness', () => {
    it('handles some dirs existing already', async () => {
      // Pre-create some dirs
      mkdirSync(join(tmpDir, 'docs', 'specs'), { recursive: true });
      mkdirSync(join(tmpDir, '.claude', 'skills'), { recursive: true });

      await init(tmpDir, { force: false });

      // All dirs should exist
      expect(existsSync(join(tmpDir, 'docs', 'briefs'))).toBe(true);
      expect(existsSync(join(tmpDir, 'docs', 'specs'))).toBe(true);
      expect(existsSync(join(tmpDir, 'docs', 'discoveries'))).toBe(true);
      // Skills still get installed
      expect(existsSync(join(tmpDir, '.claude', 'skills', 'joycraft-tune', 'SKILL.md'))).toBe(true);
    });

    it('preserves existing user skills', async () => {
      mkdirSync(join(tmpDir, '.claude', 'skills'), { recursive: true });
      writeFileSync(join(tmpDir, '.claude', 'skills', 'my-custom-skill.md'), 'my skill');

      await init(tmpDir, { force: false });

      // User skill is preserved
      expect(readFileSync(join(tmpDir, '.claude', 'skills', 'my-custom-skill.md'), 'utf-8')).toBe('my skill');
      // Joycraft skills are added
      expect(existsSync(join(tmpDir, '.claude', 'skills', 'joycraft-tune', 'SKILL.md'))).toBe(true);
    });
  });
});
