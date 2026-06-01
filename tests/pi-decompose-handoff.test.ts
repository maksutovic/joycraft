import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillPath = join(__dirname, '..', '.pi', 'skills', 'joycraft-decompose', 'SKILL.md');

describe('Pi decompose skill handoff', () => {
  const content = readFileSync(skillPath, 'utf-8');

  // The interactive-only `joycraft_next_spec` TOOL was retired by the
  // pi-implement-loop spec; the loop script supersedes it as the Pi autonomy
  // path. The handoff must point at that script, not the dead tool.
  it('points Pi autonomy at the joycraft-implement-loop driver', () => {
    expect(content).toContain('joycraft-implement-loop');
  });

  it('does not reference the retired joycraft_next_spec tool', () => {
    expect(content).not.toContain('joycraft_next_spec');
  });

  it('still mentions /clear for non-Pi (Claude Code / Codex) harnesses', () => {
    expect(content).toContain('/clear');
  });

  it('only changes Step 7 (no other section renamed)', () => {
    const steps = content.match(/^## Step \d+/gm) || [];
    expect(steps).toHaveLength(7);
    expect(content).toMatch(/## Step 7: Hand Off/);
  });
});
