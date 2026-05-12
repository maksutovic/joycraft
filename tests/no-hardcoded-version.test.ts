import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..', 'src');

describe('no hardcoded version', () => {
  it('init.ts contains no literal "0.1.0"', () => {
    const src = readFileSync(join(srcDir, 'init.ts'), 'utf-8');
    expect(src).not.toContain("'0.1.0'");
    expect(src).not.toContain('"0.1.0"');
  });

  it('upgrade.ts contains no literal "0.1.0"', () => {
    const src = readFileSync(join(srcDir, 'upgrade.ts'), 'utf-8');
    expect(src).not.toContain("'0.1.0'");
    expect(src).not.toContain('"0.1.0"');
  });
});
