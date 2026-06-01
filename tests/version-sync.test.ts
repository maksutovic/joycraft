import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { STATE_PATH } from '../src/version';

describe('version sync', () => {
  // STATE_PATH is Joycraft's own runtime state from applying itself to this
  // repo — it is gitignored (see .gitignore) and absent in a clean checkout
  // such as CI. So this is a best-effort local guard: when the file is present
  // its version must match package.json; when it is absent there is nothing to
  // drift, so we skip rather than fail on the missing file.
  it('hidden state version matches package.json version (when present)', () => {
    const statePath = join(process.cwd(), STATE_PATH);
    if (!existsSync(statePath)) return;
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
    const versionFile = JSON.parse(readFileSync(statePath, 'utf-8'));
    expect(versionFile.version).toBe(pkg.version);
  });
});
