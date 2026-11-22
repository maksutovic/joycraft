import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Spec: docs/features/2026-11-21-test-release/specs/20-sota-page.md
const references = join(__dirname, '..', 'payload', '.joycraft', 'references');
const read = (file: string) => readFileSync(join(references, file), 'utf8');
const flat = (text: string) => text.replace(/\s+/g, ' ');
const page = read('testing-page.md');

/** The check set of the open-input rule: runner and tool names that must never ship in the page. */
const RUNNERS = ['vitest', 'jest', 'mocha', 'pytest', 'unittest', 'go test', 'cargo test', 'rspec', 'minitest',
  'junit', 'gradle', 'maven', 'phpunit', 'playwright', 'cypress', 'xctest'];

describe('the shipped testing page template', () => {
  it('[AC:spec-20-1] holds nine numbered principles as project decisions, the load order and the benefit', () => {
    const numbered = [...page.matchAll(/^\s*(\d+)\. \*\*/gm)].map(match => Number(match[1]));
    expect(numbered).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const text = flat(page);
    const principles = [
      /Focused: .* Gate, once per spec: .* Full suite/,
      /names its own tests.*never names the gate/,
      /cores ÷ agents workers.*keys on `JOYCRAFT_EVIDENCE`, never on `CI`/,
      /No real time.*never a fixed delay/,
      /temporary folder.*port.*database/,
      /Time is reported, never a gate/,
      /from the spec, before reading the code/,
      /existing test file before creating a new file/,
      /only on the integrated revision/,
    ];
    for (const principle of principles) expect(text).toMatch(principle);
    expect(text).toMatch(/Run less first.*Then cap workers per run.*a slot/i);
    expect(text).toMatch(/run less, cap workers, then a slot/);
    expect(text).toMatch(/fewer slow and flaky reruns/);
  });

  it('[AC:spec-20-2] names no test runner (check set: the RUNNERS list, case-insensitive, threshold 0)', () => {
    const lower = page.toLowerCase();
    expect(RUNNERS.filter(name => lower.includes(name))).toEqual([]);
  });

  it('[AC:spec-20-3] setup and the test review write the page behind the narrow map row', () => {
    for (const file of ['setup.md', 'testing-review.md']) {
      const text = flat(read(file));
      expect(text, file).toContain('testing-page.md');
      expect(text, file).toContain('`<context>/testing.md`');
      expect(text, file).toContain('"A test run is slow or flaky"');
    }
    expect(flat(read('testing-review.md'))).toMatch(/when the project has no testing page/);
  });
});
