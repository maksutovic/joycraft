import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STATE_PATH } from '../src/version';

describe('version sync', () => {
  it('hidden state version matches package.json version', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
    const versionFile = JSON.parse(readFileSync(join(process.cwd(), STATE_PATH), 'utf-8'));
    expect(versionFile.version).toBe(pkg.version);
  });
});
