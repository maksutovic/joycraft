import { describe, it, expect } from 'vitest';
import { generatePermissions } from '../src/permissions';
import type { StackInfo } from '../src/detect';

function makeStack(overrides: Partial<StackInfo> = {}): StackInfo {
  return {
    language: 'unknown',
    packageManager: '',
    commands: {},
    ...overrides,
  };
}

describe('generatePermissions', () => {
  it('returns default deny rules for unknown stack', () => {
    const result = generatePermissions(makeStack());
    expect(result.deny).toContain('Bash(rm -rf *)');
    expect(result.deny).toContain('Bash(git push --force *)');
    expect(result.deny).toContain('Bash(git reset --hard *)');
    expect(result.deny).toContain('Edit(//.env*)');
    expect(result.deny).toContain('Edit(//*.pem)');
    expect(result.deny).toContain('Edit(//*.key)');
    expect(result.deny).toContain('Edit(//.git/**)');
  });

  it('returns default allow rules for git operations', () => {
    const result = generatePermissions(makeStack());
    expect(result.allow).toContain('Bash(git status)');
    expect(result.allow).toContain('Bash(git diff *)');
    expect(result.allow).toContain('Bash(git log *)');
    expect(result.allow).toContain('Bash(git add *)');
    expect(result.allow).toContain('Bash(git commit *)');
  });

  describe('Node.js', () => {
    it('allows pnpm and denies other package managers', () => {
      const result = generatePermissions(makeStack({
        language: 'node',
        packageManager: 'pnpm',
        commands: { test: 'pnpm test', build: 'pnpm build' },
      }));
      expect(result.allow).toContain('Bash(pnpm *)');
      expect(result.deny).toContain('Bash(npm install *)');
      expect(result.deny).toContain('Bash(yarn add *)');
      expect(result.deny).toContain('Bash(bun add *)');
      expect(result.deny).not.toContain('Bash(pnpm add *)');
    });

    it('allows npm and denies other package managers', () => {
      const result = generatePermissions(makeStack({
        language: 'node',
        packageManager: 'npm',
        commands: { test: 'npm run test' },
      }));
      expect(result.allow).toContain('Bash(npm *)');
      expect(result.deny).not.toContain('Bash(npm install *)');
      expect(result.deny).toContain('Bash(yarn add *)');
      expect(result.deny).toContain('Bash(pnpm add *)');
      expect(result.deny).toContain('Bash(bun add *)');
    });

    it('allows test/build/lint/typecheck commands', () => {
      const result = generatePermissions(makeStack({
        language: 'node',
        packageManager: 'pnpm',
        commands: {
          test: 'pnpm test',
          build: 'pnpm build',
          lint: 'pnpm lint',
          typecheck: 'pnpm typecheck',
        },
      }));
      expect(result.allow).toContain('Bash(pnpm test)');
      expect(result.allow).toContain('Bash(pnpm build)');
      expect(result.allow).toContain('Bash(pnpm lint)');
      expect(result.allow).toContain('Bash(pnpm typecheck)');
    });
  });

  describe('Python', () => {
    it('allows poetry commands', () => {
      const result = generatePermissions(makeStack({
        language: 'python',
        packageManager: 'poetry',
        commands: { test: 'poetry run pytest', lint: 'poetry run ruff check .' },
      }));
      expect(result.allow).toContain('Bash(poetry *)');
      expect(result.allow).toContain('Bash(poetry run pytest)');
      expect(result.allow).toContain('Bash(poetry run ruff check .)');
    });

    it('allows uv commands', () => {
      const result = generatePermissions(makeStack({
        language: 'python',
        packageManager: 'uv',
        commands: { test: 'uv run pytest' },
      }));
      expect(result.allow).toContain('Bash(uv *)');
      expect(result.allow).toContain('Bash(uv run pytest)');
    });
  });

  describe('Rust', () => {
    it('allows cargo commands', () => {
      const result = generatePermissions(makeStack({
        language: 'rust',
        packageManager: 'cargo',
        commands: { build: 'cargo build', test: 'cargo test' },
      }));
      expect(result.allow).toContain('Bash(cargo *)');
    });
  });

  describe('Go', () => {
    it('allows go commands', () => {
      const result = generatePermissions(makeStack({
        language: 'go',
        packageManager: 'go',
        commands: { build: 'go build ./...', test: 'go test ./...' },
      }));
      expect(result.allow).toContain('Bash(go *)');
    });
  });

  describe('Swift', () => {
    it('allows swift and xcodebuild commands', () => {
      const result = generatePermissions(makeStack({
        language: 'swift',
        packageManager: 'swift',
        commands: { build: 'swift build', test: 'swift test' },
      }));
      expect(result.allow).toContain('Bash(swift *)');
      expect(result.allow).toContain('Bash(xcodebuild *)');
    });
  });
});
