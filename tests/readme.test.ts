import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const migrationGuide = join(
  __dirname,
  '..',
  'docs',
  'archive',
  'guides-0.7',
  'migration-per-feature-layout.md',
);

describe('README.md', () => {
  it('links the migration guide', () => {
    const readme = readFileSync(join(__dirname, '..', 'README.md'), 'utf-8');
    expect(readme).toContain('docs/migrating-from-0.7.md');
  });

  it('keeps the migration section header in the linked guide', () => {
    const guide = readFileSync(migrationGuide, 'utf-8');
    expect(guide).toMatch(/#\s+Migration:\s+Flat\s+→\s+Per-Feature\s+Layout/);
  });

  it('explains what users will see on first post-upgrade run', () => {
    const guide = readFileSync(migrationGuide, 'utf-8');
    expect(guide).toContain('docs/features/');
  });

  it('[AC:readme-gates-section] has a gates section under The review loop with both prompts and its limits', () => {
    const readme = readFileSync(join(__dirname, '..', 'README.md'), 'utf-8');
    const loop = readme.indexOf('\n## The review loop\n');
    const gates = readme.indexOf('\n### The gates');
    expect(loop).toBeGreaterThan(-1);
    expect(gates).toBeGreaterThan(loop);
    expect(gates).toBeLessThan(readme.indexOf('\n## ', loop + 1));
    const end = readme.indexOf('\n## ', gates + 1);
    const section = readme.slice(gates, end === -1 ? undefined : end);
    expect(section).toContain("Turn on Joycraft's gates.");
    expect(section).toContain("Turn off Joycraft's gates.");
    expect(section).toContain('What the gates do not do');
    expect(section).toMatch(/Claude Code only for now/);
    expect(section).toMatch(/session-end\s+skill runs the check/);
    expect(section).toMatch(/no CI check/i);
    expect(section).toMatch(/fourth review is refused/i);
    const prompts = readFileSync(join(__dirname, '..', 'docs', 'prompts.md'), 'utf-8');
    expect(prompts).toContain("Turn on Joycraft's gates.");
    expect(prompts).toContain("Turn off Joycraft's gates.");
  });
});
