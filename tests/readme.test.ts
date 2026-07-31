import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const migrationGuide = join(
  __dirname,
  '..',
  'docs',
  'guides',
  'migration-per-feature-layout.md',
);

describe('README.md', () => {
  it('links the migration guide', () => {
    const readme = readFileSync(join(__dirname, '..', 'README.md'), 'utf-8');
    expect(readme).toContain('docs/guides/migration-per-feature-layout.md');
  });

  it('keeps the migration section header in the linked guide', () => {
    const guide = readFileSync(migrationGuide, 'utf-8');
    expect(guide).toMatch(/#\s+Migration:\s+Flat\s+→\s+Per-Feature\s+Layout/);
  });

  it('explains what users will see on first post-upgrade run', () => {
    const guide = readFileSync(migrationGuide, 'utf-8');
    expect(guide).toContain('docs/features/');
  });
});
