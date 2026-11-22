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
  it('[AC:spec-20-1] [AC:spec-28-1] holds nine numbered principles in order as project decisions, and the load order', () => {
    const numbered = [...page.matchAll(/^\s*(\d+)\. \*\*/gm)].map(match => Number(match[1]));
    expect(numbered).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const text = flat(page);
    const principles = [
      /Focused: .* Gate, once per spec: .* Full suite.*only on the integrated revision.*never names the gate/,
      /cores ÷ agents workers/,
      /No real time/,
      /temporary folder.*port.*database/,
      /Time is reported, never a gate/,
      /from the spec, before reading the code/,
      /existing test file before creating a new file/,
      /Flaky means defective.*never retry.*before it counts/,
      /special-case.*the check that judges the change/,
    ];
    // Each principle sits in its own numbered decision, in order.
    const decisions = flat(page.slice(page.indexOf('## Decisions'), page.indexOf('## When a run is slow'))).split(/ (?=\d\. \*\*)/).slice(1);
    expect(decisions).toHaveLength(9);
    principles.forEach((principle, at) => expect(decisions[at]).toMatch(principle));
    expect(text).toMatch(/Run less first.*Then cap workers per run.*a slot/i);
    expect(text).toMatch(/run less, cap workers, then a slot/);
  });

  it('[AC:spec-28-2] the benefit line is inside the markdown block that setup copies', () => {
    const open = page.indexOf('```markdown\n');
    const close = page.indexOf('\n```\n', open);
    expect(open).toBeGreaterThan(-1);
    expect(close).toBeGreaterThan(open);
    expect(flat(page.slice(open, close))).toContain('fewer slow and flaky reruns, so a queue spends its time on the work');
  });

  it('[AC:spec-20-2] names no test runner (check set: the RUNNERS list, case-insensitive, threshold 0)', () => {
    const lower = page.toLowerCase();
    expect(RUNNERS.filter(name => lower.includes(name))).toEqual([]);
  });

  // Spec 29: the project page is <context>/test-practices.md, titled "Test practices".
  it('[AC:spec-20-3] [AC:spec-29-6] setup and the test review write the page behind the narrow map row', () => {
    for (const file of ['setup.md', 'testing-review.md']) {
      const text = flat(read(file));
      expect(text, file).toContain('testing-page.md');
      expect(text, file).toContain('"A test run is slow or flaky"');
    }
    for (const file of ['testing-page.md', 'setup.md', 'testing-review.md']) {
      const text = flat(read(file));
      expect(text, file).toContain('`<context>/test-practices.md`');
      expect(text, file).not.toContain('`<context>/testing.md`');
    }
    expect(page).toMatch(/^# Test practices$/m);
    expect(flat(read('testing-review.md'))).toMatch(/when the project has no testing page/);
  });
});
