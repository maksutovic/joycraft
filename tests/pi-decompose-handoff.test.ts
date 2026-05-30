import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillPath = join(__dirname, '..', '.pi', 'skills', 'joycraft-decompose', 'SKILL.md');

describe('Pi decompose skill handoff', () => {
  const content = readFileSync(skillPath, 'utf-8');

  it('mentions joycraft_next_spec tool for Pi autonomy loop', () => {
    expect(content).toContain('joycraft_next_spec');
  });

  it('still mentions /clear for non-Pi harnesses', () => {
    expect(content).toContain('/clear');
  });

  it('only changes Step 7 (no other section renamed)', () => {
    const steps = content.match(/^## Step \d+/gm) || [];
    expect(steps).toHaveLength(7);
    expect(content).toMatch(/## Step 7: Hand Off/);
  });
});
