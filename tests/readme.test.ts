import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
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

  it('[AC:readme-away-from-keyboard] says under The review loop what a user away from the queue sees, with its prompts', () => {
    const readme = readFileSync(join(__dirname, '..', 'README.md'), 'utf-8');
    const loop = readme.indexOf('\n## The review loop\n');
    const away = readme.indexOf('\n### Running a queue while you are away\n');
    expect(loop).toBeGreaterThan(-1);
    expect(away).toBeGreaterThan(loop);
    expect(away).toBeLessThan(readme.indexOf('\n## ', loop + 1));
    const section = readme.slice(away, readme.indexOf('\n### ', away + 1));
    expect(section).toMatch(/asks its questions before the queue\s+starts/);
    expect(section).toMatch(/Work stops only for an answer that must come from you or for a broken\s+project/);
    expect(section).toMatch(/follow-up\s+question/);
    expect(section).toMatch(/assumption the reviewer made/);
    expect(section).toMatch(/You do not run a command/);
    const prose = section.replace(/```[\s\S]*?```/g, '');
    expect(prose).not.toMatch(/node \.joycraft|npx |\.mjs/);
    const prompts = readFileSync(join(__dirname, '..', 'docs', 'prompts.md'), 'utf-8');
    for (const prompt of [
      'Build <what you want> with Joycraft. I will be away while the queue runs.',
      'At session end, ask me each follow-up question with the assumption the reviewer made.',
      "Run Joycraft's session end. Before you archive a feature, ask me each follow-up",
    ]) {
      expect(section).toContain(prompt);
      expect(prompts).toContain(prompt);
    }
    const lint = spawnSync('python3', [join(__dirname, '..', 'scripts', 'ste-lint.py'), '-'], { input: prose, encoding: 'utf-8' });
    if (lint.error) return; // python3 is absent: the ste-lint test skips the same way.
    const violations = JSON.parse(lint.stdout).violations;
    for (const kind of ['contraction', 'semicolon', 'banned_modal', 'latin_abbrev', 'slop_word']) expect(violations[kind], kind).toBe(0);
  });
});
