import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPackageVersion } from '../src/package-version';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('getPackageVersion', () => {
  it('returns the CLI package.json version', () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
    expect(getPackageVersion()).toBe(pkg.version);
  });

  it('does not return the deprecated 0.1.0 fallback', () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
    if (pkg.version !== '0.1.0') {
      expect(getPackageVersion()).not.toBe('0.1.0');
    }
  });

  it('returns a non-empty string', () => {
    const v = getPackageVersion();
    expect(typeof v).toBe('string');
    expect(v.length).toBeGreaterThan(0);
  });
});
