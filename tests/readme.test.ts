import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('README.md', () => {
  it('contains the migration section header', () => {
    const readme = readFileSync(join(__dirname, '..', 'README.md'), 'utf-8');
    expect(readme).toMatch(/##\s+Migration:\s+Flat\s+→\s+Per-Feature\s+Layout/);
  });

  it('explains what users will see on first post-upgrade run', () => {
    const readme = readFileSync(join(__dirname, '..', 'README.md'), 'utf-8');
    expect(readme).toContain('docs/features/');
  });
});
