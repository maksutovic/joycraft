import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');

function readSkill(variant: string): string {
  return readFileSync(join(ROOT, 'src', variant, 'joycraft-implement.md'), 'utf-8');
}

describe('joycraft-implement skill input validation', () => {
  const variants = ['pi-skills', 'claude-skills', 'codex-skills'];

  it.each(variants)('%s: requires a path (no path = stop)', (variant) => {
    const content = readSkill(variant);
    expect(content).toMatch(/No path = stop|MUST provide a path/i);
  });

  it.each(variants)('%s: accepts directories and resolves to first active spec via queue', (variant) => {
    const content = readSkill(variant);
    expect(content).toMatch(/directory[\s\S]*?specs\/\.joycraft-spec-queue/i);
    expect(content).toMatch(/first active spec|dependencies are complete/i);
  });

  it.each(variants)('%s: does not have a Multi-Spec Handling section', (variant) => {
    const content = readSkill(variant);
    expect(content).not.toMatch(/## Step \d+: Multi-Spec Handling/i);
    expect(content).not.toMatch(/## Multi-Spec Handling/i);
  });
});
