import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { generateAgentsMd } from '../src/agents-md.js';

describe('API safety guards (spec #8)', () => {
  const ROOT = join(__dirname, '..');

  describe('AGENTS.md generation', () => {
    const stack = {
      language: 'node' as const,
      framework: undefined,
      packageManager: 'pnpm',
      commands: { build: 'pnpm build', test: 'pnpm test', lint: '', typecheck: 'pnpm typecheck', deploy: '' },
    };
    const agentsMd = generateAgentsMd('test-project', stack);

    it('includes External API Safety section', () => {
      expect(agentsMd).toContain('External API');
    });

    it('includes read docs/types instruction', () => {
      expect(agentsMd).toContain('official docs');
    });

    it('includes devDependency convention', () => {
      expect(agentsMd).toContain('devDependencies');
      expect(agentsMd).toContain('SDK');
    });

    it('includes integration smoke test convention', () => {
      expect(agentsMd).toContain('smoke test');
    });
  });

  describe('Pi implement skill', () => {
    const skillPath = join(ROOT, 'src', 'pi-skills', 'joycraft-implement.md');
    const content = readFileSync(skillPath, 'utf-8');

    it('warns against self-authoring type stubs', () => {
      expect(content).toContain('declare module');
      expect(content).toContain('stub');
    });

    it('directs to use real package as devDependency', () => {
      expect(content).toContain('devDependency');
    });
  });

  describe('Claude implement skill mirrors Pi', () => {
    const skillPath = join(ROOT, 'src', 'claude-skills', 'joycraft-implement.md');
    const content = readFileSync(skillPath, 'utf-8');

    it('warns against self-authoring type stubs', () => {
      expect(content).toContain('declare module');
    });
  });

  describe('Codex implement skill mirrors Pi', () => {
    const skillPath = join(ROOT, 'src', 'codex-skills', 'joycraft-implement.md');
    const content = readFileSync(skillPath, 'utf-8');

    it('warns against self-authoring type stubs', () => {
      expect(content).toContain('declare module');
    });
  });

  describe('Pi decompose skill', () => {
    const skillPath = join(ROOT, 'src', 'pi-skills', 'joycraft-decompose.md');
    const content = readFileSync(skillPath, 'utf-8');

    it('includes External API Contract section in spec template', () => {
      expect(content).toContain('External API Contract');
    });

    it('includes package name placeholder', () => {
      expect(content).toContain('npm-package-name');
    });

    it('includes canonical sources section', () => {
      expect(content).toContain('Canonical sources');
    });

    it('marks section as optional', () => {
      expect(content).toMatch(/optional|ONLY|omit/i);
    });
  });

  describe('Claude decompose skill mirrors Pi', () => {
    const skillPath = join(ROOT, 'src', 'claude-skills', 'joycraft-decompose.md');
    const content = readFileSync(skillPath, 'utf-8');

    it('includes External API Contract section', () => {
      expect(content).toContain('External API Contract');
    });
  });

  describe('Codex decompose skill mirrors Pi', () => {
    const skillPath = join(ROOT, 'src', 'codex-skills', 'joycraft-decompose.md');
    const content = readFileSync(skillPath, 'utf-8');

    it('includes External API Contract section', () => {
      expect(content).toContain('External API Contract');
    });
  });

  describe('generated AGENTS.md includes guard conventions', () => {
    it('generated output is not empty', () => {
      const result = generateAgentsMd('guard-test', {
        language: 'node' as const,
        framework: undefined,
        packageManager: 'yarn',
        commands: { build: 'yarn build', test: 'yarn test', lint: '', typecheck: '', deploy: '' },
      });
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
