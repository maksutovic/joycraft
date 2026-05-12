import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillsDir = join(__dirname, '..', 'src', 'claude-skills');

describe('feature-folder README convention', () => {
  it('joycraft-decompose instructs writing a README.md to the spec folder', () => {
    const content = readFileSync(join(skillsDir, 'joycraft-decompose.md'), 'utf-8');
    expect(content).toContain('README.md');
    expect(content.toLowerCase()).toMatch(/spec table|spec(s)?\s+table/);
    expect(content.toLowerCase()).toMatch(/wave|execution\s+wave/);
  });

  it('joycraft-decompose updates the parent brief execution strategy', () => {
    const content = readFileSync(join(skillsDir, 'joycraft-decompose.md'), 'utf-8');
    expect(content.toLowerCase()).toMatch(/parent\s+brief|update.*brief/);
  });

  it('joycraft-implement reads sibling README.md before the spec', () => {
    const content = readFileSync(join(skillsDir, 'joycraft-implement.md'), 'utf-8');
    expect(content).toContain('README.md');
    expect(content.toLowerCase()).toMatch(/sibling|same\s+folder|same\s+directory/);
  });

  it('joycraft-implement warns on unmet dependencies', () => {
    const content = readFileSync(join(skillsDir, 'joycraft-implement.md'), 'utf-8');
    expect(content.toLowerCase()).toMatch(/unmet\s+dep|depend.+not.+(complete|met)|warn.*depend/);
  });
});
