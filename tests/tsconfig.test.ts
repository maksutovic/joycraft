import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ensurePiExcludedFromTsconfig } from '../src/tsconfig';

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'joycraft-tsconfig-'));
}

/** Parse JSONC by stripping comments — used to assert the edit stays valid. */
function parseJsonc(text: string): { exclude?: unknown } {
  return JSON.parse(
    text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1'),
  );
}

describe('ensurePiExcludedFromTsconfig', () => {
  it('no tsconfig → no-op', () => {
    const dir = tmp();
    try {
      expect(ensurePiExcludedFromTsconfig(dir).status).toBe('no-tsconfig');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('appends .pi to an existing exclude array (create-next-app shape with comments)', () => {
    const dir = tmp();
    try {
      const cfg = `{
  "compilerOptions": { "target": "ES2017", "strict": true },
  /* path globs */
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`;
      writeFileSync(join(dir, 'tsconfig.json'), cfg);
      const out = ensurePiExcludedFromTsconfig(dir);
      expect(out.status).toBe('added');

      const after = readFileSync(join(dir, 'tsconfig.json'), 'utf-8');
      // Comments preserved (we didn't round-trip through JSON.stringify).
      expect(after).toContain('/* path globs */');
      // Still valid JSONC, and now excludes .pi alongside node_modules.
      const parsed = parseJsonc(after);
      expect(parsed.exclude).toContain('.pi');
      expect(parsed.exclude).toContain('node_modules');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('adds an exclude key when none exists (keeps it beside include)', () => {
    const dir = tmp();
    try {
      writeFileSync(
        join(dir, 'tsconfig.json'),
        `{\n  "compilerOptions": { "strict": true },\n  "include": ["**/*.ts"]\n}`,
      );
      const out = ensurePiExcludedFromTsconfig(dir);
      expect(out.status).toBe('added');
      const parsed = parseJsonc(readFileSync(join(dir, 'tsconfig.json'), 'utf-8'));
      expect(parsed.exclude).toContain('.pi');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('is idempotent — already excludes .pi → no change', () => {
    const dir = tmp();
    try {
      const cfg = `{ "exclude": [".pi", "node_modules"] }`;
      writeFileSync(join(dir, 'tsconfig.json'), cfg);
      const out = ensurePiExcludedFromTsconfig(dir);
      expect(out.status).toBe('already-present');
      expect(readFileSync(join(dir, 'tsconfig.json'), 'utf-8')).toBe(cfg);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a second run after adding does not double-insert', () => {
    const dir = tmp();
    try {
      writeFileSync(
        join(dir, 'tsconfig.json'),
        `{\n  "include": ["**/*.ts"],\n  "exclude": ["node_modules"]\n}`,
      );
      expect(ensurePiExcludedFromTsconfig(dir).status).toBe('added');
      expect(ensurePiExcludedFromTsconfig(dir).status).toBe('already-present');
      const parsed = parseJsonc(readFileSync(join(dir, 'tsconfig.json'), 'utf-8'));
      const piCount = (parsed.exclude as string[]).filter((e) => e === '.pi').length;
      expect(piCount).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('adds exclude to a minimal config with no include/exclude', () => {
    const dir = tmp();
    try {
      writeFileSync(join(dir, 'tsconfig.json'), `{ "compilerOptions": { "strict": true } }`);
      const out = ensurePiExcludedFromTsconfig(dir);
      expect(out.status).toBe('added');
      expect(parseJsonc(readFileSync(join(dir, 'tsconfig.json'), 'utf-8')).exclude).toContain('.pi');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('every edited result remains valid JSONC', () => {
    const shapes = [
      `{ "include": ["**/*.ts"], "exclude": ["node_modules"] }`,
      `{\n  "compilerOptions": {},\n  "include": ["**/*.ts"]\n}`,
      `{ "compilerOptions": { "strict": true } }`,
      `{\n  // leading comment\n  "exclude": ["dist"]\n}`,
    ];
    for (const shape of shapes) {
      const dir = tmp();
      try {
        writeFileSync(join(dir, 'tsconfig.json'), shape);
        ensurePiExcludedFromTsconfig(dir);
        const after = readFileSync(join(dir, 'tsconfig.json'), 'utf-8');
        expect(() => parseJsonc(after), `invalid JSONC produced for: ${shape}`).not.toThrow();
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });
});
