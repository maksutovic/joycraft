import { describe, expect, it, vi } from 'vitest';

vi.mock('node:path', async (importOriginal) => {
  const path = await importOriginal<typeof import('node:path')>();
  return { ...path, join: path.win32.join };
});

import { STATE_PATH, LEGACY_CLAUDE_STATE_PATH } from '../src/version';
import { normalizeManifestPath } from '../src/install-manifest';

describe('Windows legacy state paths', () => {
  it('keeps persisted state paths portable for migration and ignore entries', () => {
    expect(normalizeManifestPath(STATE_PATH)).toBe('docs/.joycraft/state.json');
    expect(normalizeManifestPath(LEGACY_CLAUDE_STATE_PATH)).toBe('.claude/.joycraft/state.json');
  });
});
