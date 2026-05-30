import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('version sync', () => {
  it('.joycraft-version version matches package.json version', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
    const versionFile = JSON.parse(readFileSync(join(process.cwd(), '.joycraft-version'), 'utf-8'));
    expect(versionFile.version).toBe(pkg.version);
  });
});
