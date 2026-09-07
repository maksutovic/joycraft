import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { prepareAutomaticRelease } from '../scripts/automatic-release.mjs';

describe('automatic release metadata', () => {
  it('advances beyond all published versions even when main still has an older version', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'auto-release-'));
    try {
      writeFileSync(join(cwd, 'package.json'), JSON.stringify({ name: 'joycraft', version: '0.7.13' }));
      const result = await prepareAutomaticRelease({ cwd, registryLookup: async () => ({ version: '0.7.13', versions: ['0.7.13', '0.7.14'], distTags: { candidate: '0.7.14' } }) });
      expect(result.version).toBe('0.7.15');
      expect(JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')).version).toBe('0.7.15');
      expect(JSON.parse(readFileSync(join(cwd, 'src/joycraft-release.json'), 'utf8')).releaseVersion).toBe('0.7.15');
    } finally { rmSync(cwd, { recursive: true, force: true }); }
  });
  it('refuses to prepare a guessed version when the registry is unavailable', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'auto-release-'));
    try {
      const original = JSON.stringify({ name: 'joycraft', version: '0.7.13' });
      writeFileSync(join(cwd, 'package.json'), original);
      await expect(prepareAutomaticRelease({ cwd, registryLookup: async () => { throw new Error('registry unavailable'); } })).rejects.toThrow('registry unavailable');
      expect(readFileSync(join(cwd, 'package.json'), 'utf8')).toBe(original);
    } finally { rmSync(cwd, { recursive: true, force: true }); }
  });
});
