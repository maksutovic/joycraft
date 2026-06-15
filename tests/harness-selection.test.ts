import { describe, it, expect, vi } from 'vitest';
import { mkdirSync, existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Readable } from 'node:stream';
import { init } from '../src/init';
import { upgrade } from '../src/upgrade';
import { readVersion } from '../src/version';
import { parseHarnessSelection, resolveHarnesses, sanitizeHarnesses, HARNESSES } from '../src/harness';

function createTmpDir(): string {
  const dir = join(tmpdir(), `joycraft-harness-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

function readSettings(dir: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(dir, '.claude', 'settings.json'), 'utf-8'));
}

/**
 * Run init with the interactive prompts simulated: isTTY true + a fake stdin
 * supplying answers line by line. The first answer feeds the harness menu; a
 * second (if given) feeds the gitignore-profile prompt. Mirrors the
 * stdin-boundary pattern in tests/gitignore-profiles.test.ts.
 */
async function initWithAnswers(dir: string, ...answers: string[]): Promise<string> {
  const fakeStdin = Readable.from(answers.map((a) => `${a}\n`)) as unknown as NodeJS.ReadStream & { isTTY?: boolean };
  fakeStdin.isTTY = true;
  const stdinDesc = Object.getOwnPropertyDescriptor(process, 'stdin')!;
  Object.defineProperty(process, 'stdin', { value: fakeStdin, configurable: true });

  const logs: string[] = [];
  const origLog = console.log;
  console.log = (...args: unknown[]) => { logs.push(args.join(' ')); };
  try {
    await init(dir, { force: false });
  } finally {
    console.log = origLog;
    Object.defineProperty(process, 'stdin', stdinDesc);
  }
  return logs.join('\n');
}

describe('parseHarnessSelection', () => {
  it('parses a comma list, deduping and lowercasing', () => {
    expect(parseHarnessSelection('claude,pi')).toEqual(['claude', 'pi']);
    expect(parseHarnessSelection('CLAUDE, Codex')).toEqual(['claude', 'codex']);
    expect(parseHarnessSelection('pi,pi')).toEqual(['pi']);
  });

  it('accepts whitespace separators', () => {
    expect(parseHarnessSelection('claude codex pi')).toEqual(['claude', 'codex', 'pi']);
  });

  it('treats "all" as every harness', () => {
    expect(parseHarnessSelection('all')).toEqual([...HARNESSES]);
  });

  it('treats empty/whitespace input as an explicit none', () => {
    expect(parseHarnessSelection('')).toEqual([]);
    expect(parseHarnessSelection('   ')).toEqual([]);
  });

  it('returns null on an unrecognized token so the caller can re-ask', () => {
    expect(parseHarnessSelection('foo')).toBeNull();
    expect(parseHarnessSelection('claude,foo')).toBeNull();
  });
});

describe('resolveHarnesses', () => {
  it('installs all three when non-interactive', async () => {
    expect(await resolveHarnesses(false)).toEqual([...HARNESSES]);
  });
});

describe('init harness gating', () => {
  it('non-interactive installs all three harness dirs', async () => {
    const dir = createTmpDir();
    try {
      await init(dir, { force: false });
      expect(existsSync(join(dir, '.claude', 'skills'))).toBe(true);
      expect(existsSync(join(dir, '.agents', 'skills'))).toBe(true);
      expect(existsSync(join(dir, '.pi', 'skills'))).toBe(true);
    } finally {
      cleanup(dir);
    }
  });

  it('installs only the selected harnesses interactively', async () => {
    const dir = createTmpDir();
    try {
      // harness answer "claude,pi", then gitignore answer "shared"
      await initWithAnswers(dir, 'claude,pi', 'shared');
      expect(existsSync(join(dir, '.claude', 'skills'))).toBe(true);
      expect(existsSync(join(dir, '.pi', 'skills'))).toBe(true);
      expect(existsSync(join(dir, '.agents'))).toBe(false);
    } finally {
      cleanup(dir);
    }
  });

  it('installs nothing and prints the run-again message when none selected', async () => {
    const dir = createTmpDir();
    try {
      const out = await initWithAnswers(dir, '');
      expect(out).toMatch(/No harness selected/i);
      expect(out).toMatch(/run init again/i);
      // Nothing scaffolded — not even shared docs.
      expect(existsSync(join(dir, '.claude'))).toBe(false);
      expect(existsSync(join(dir, '.agents'))).toBe(false);
      expect(existsSync(join(dir, '.pi'))).toBe(false);
      expect(existsSync(join(dir, 'CLAUDE.md'))).toBe(false);
      expect(existsSync(join(dir, 'docs'))).toBe(false);
    } finally {
      cleanup(dir);
    }
  });

  it('does not install Claude skills/hooks for a codex-only install', async () => {
    const dir = createTmpDir();
    try {
      await initWithAnswers(dir, 'codex', 'shared');
      expect(existsSync(join(dir, '.agents', 'skills'))).toBe(true);
      // Zero Claude footprint — no .claude/ tree at all for a codex-only install.
      expect(existsSync(join(dir, '.claude'))).toBe(false);
      expect(existsSync(join(dir, '.pi'))).toBe(false);
      // State lives in the harness-neutral docs/ home, not under any harness dir.
      expect(existsSync(join(dir, 'docs', '.joycraft', 'state.json'))).toBe(true);
      // Shared docs are harness-agnostic and still generated.
      expect(existsSync(join(dir, 'CLAUDE.md'))).toBe(true);
      expect(existsSync(join(dir, 'AGENTS.md'))).toBe(true);
    } finally {
      cleanup(dir);
    }
  });
});

describe('agent-teams env var', () => {
  it('enables CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS when claude is installed', async () => {
    const dir = createTmpDir();
    try {
      await init(dir, { force: false });
      const settings = readSettings(dir);
      expect((settings.env as Record<string, unknown>).CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe('1');
    } finally {
      cleanup(dir);
    }
  });

  it('does not clobber an existing user value', async () => {
    const dir = createTmpDir();
    try {
      mkdirSync(join(dir, '.claude'), { recursive: true });
      const settingsPath = join(dir, '.claude', 'settings.json');
      writeFileSync(settingsPath, JSON.stringify({ env: { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '0' } }, null, 2));
      await init(dir, { force: false });
      const settings = readSettings(dir);
      expect((settings.env as Record<string, unknown>).CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe('0');
    } finally {
      cleanup(dir);
    }
  });
});

describe('sanitizeHarnesses', () => {
  it('drops unknown tokens and dedupes, preserving canonical order', () => {
    expect(sanitizeHarnesses(['pi', 'claude', 'bogus', 'pi'])).toEqual(['claude', 'pi']);
  });

  it('returns null for non-array input (no recorded selection)', () => {
    expect(sanitizeHarnesses(undefined)).toBeNull();
    expect(sanitizeHarnesses('claude')).toBeNull();
  });
});

describe('harness selection persists to state', () => {
  it('records the interactively chosen harnesses in state.json', async () => {
    const dir = createTmpDir();
    try {
      await initWithAnswers(dir, 'claude,pi', 'shared');
      expect(readVersion(dir)?.harnesses).toEqual(['claude', 'pi']);
    } finally {
      cleanup(dir);
    }
  });

  it('records all three for a non-interactive install', async () => {
    const dir = createTmpDir();
    try {
      await init(dir, { force: false });
      expect(readVersion(dir)?.harnesses).toEqual([...HARNESSES]);
    } finally {
      cleanup(dir);
    }
  });
});

describe('upgrade respects persisted harness selection', () => {
  // upgrade bails early if the registry reports a newer version, so stub fetch.
  function withRegistryStub<T>(run: () => Promise<T>): Promise<T> {
    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: '0.0.0' }),
    }) as unknown as typeof fetch;
    return run().finally(() => { globalThis.fetch = origFetch; });
  }

  it('does not resurrect .claude for a codex-only project', async () => {
    const dir = createTmpDir();
    try {
      mkdirSync(join(dir, '.agents', 'skills', 'joycraft-tune'), { recursive: true });
      writeFileSync(join(dir, '.agents', 'skills', 'joycraft-tune', 'SKILL.md'), 'tune');
      mkdirSync(join(dir, 'docs', '.joycraft'), { recursive: true });
      writeFileSync(
        join(dir, 'docs', '.joycraft', 'state.json'),
        JSON.stringify({ version: '0.0.1', files: {}, gitignoreProfile: 'shared', harnesses: ['codex'] })
      );
      await withRegistryStub(() => upgrade(dir, { yes: true }));
      expect(existsSync(join(dir, '.claude'))).toBe(false);
      expect(existsSync(join(dir, '.pi'))).toBe(false);
      expect(existsSync(join(dir, '.agents', 'skills'))).toBe(true);
      // Selection survives the upgrade.
      expect(readVersion(dir)?.harnesses).toEqual(['codex']);
    } finally {
      cleanup(dir);
    }
  });

  it('refreshes all three when state predates harness selection (no harnesses field)', async () => {
    const dir = createTmpDir();
    try {
      mkdirSync(join(dir, '.claude', 'skills', 'joycraft-tune'), { recursive: true });
      writeFileSync(join(dir, '.claude', 'skills', 'joycraft-tune', 'SKILL.md'), 'tune');
      mkdirSync(join(dir, 'docs', '.joycraft'), { recursive: true });
      writeFileSync(
        join(dir, 'docs', '.joycraft', 'state.json'),
        JSON.stringify({ version: '0.0.1', files: {}, gitignoreProfile: 'shared' })
      );
      await withRegistryStub(() => upgrade(dir, { yes: true }));
      expect(existsSync(join(dir, '.claude', 'skills'))).toBe(true);
      expect(existsSync(join(dir, '.agents', 'skills'))).toBe(true);
      expect(existsSync(join(dir, '.pi', 'skills'))).toBe(true);
    } finally {
      cleanup(dir);
    }
  });
});

describe('init leaves project toolchain gates clean', () => {
  // Recursively collect files under a dir matching a predicate.
  function walk(dir: string): string[] {
    const { readdirSync, statSync } = require('node:fs') as typeof import('node:fs');
    const out: string[] = [];
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) out.push(...walk(full));
      else out.push(full);
    }
    return out;
  }

  it('ships no toolchain-globbable .ts/.test.ts under docs/ (the create-next-app regression)', async () => {
    const dir = createTmpDir();
    try {
      await init(dir, { force: false }); // non-interactive → all three harnesses
      const offenders = walk(join(dir, 'docs')).filter(
        (f) => f.endsWith('.ts') || f.endsWith('.tsx'),
      );
      // A default `**​/*.ts` glob (create-next-app, plain tsc lib) must find
      // nothing compilable/testable under docs/ — the original red-build bug.
      expect(offenders).toEqual([]);
    } finally {
      cleanup(dir);
    }
  });

  it('excludes .pi from tsconfig when Pi is installed (real Next-style include glob)', async () => {
    const dir = createTmpDir();
    try {
      writeFileSync(
        join(dir, 'tsconfig.json'),
        `{\n  "compilerOptions": { "strict": true },\n  "include": ["**/*.ts", "**/*.tsx"],\n  "exclude": ["node_modules"]\n}`,
      );
      await init(dir, { force: false }); // all three → Pi included
      // The live .pi/extensions/*.ts must exist (Pi runtime) but be excluded
      // from the user's TS program.
      expect(existsSync(join(dir, '.pi', 'extensions', 'joycraft-pipeline.ts'))).toBe(true);
      const tsconfig = JSON.parse(readFileSync(join(dir, 'tsconfig.json'), 'utf-8'));
      expect(tsconfig.exclude).toContain('.pi');
      expect(tsconfig.exclude).toContain('node_modules');
    } finally {
      cleanup(dir);
    }
  });
});
