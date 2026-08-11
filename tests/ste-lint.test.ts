import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const LINTER = join(repoRoot, 'scripts', 'ste-lint.py');

/**
 * The deterministic half of the STE contract (ste-human-output, D2/D3):
 * shells to the vendored linter — never a TypeScript reimplementation, which
 * would fork the rules and drift. Maintainer-side only: this holds THIS
 * repo's shipped template prose to the contract; users get the manual
 * self-check in the style doc, no script obligation.
 *
 * D3 class split — fix-to-zero on the reliable regex classes, advisory on
 * everything approximate. Advisory classes are reported via the failure-free
 * assertion message path only, never failed on.
 */
const FIX_TO_ZERO = [
  'contraction',
  'semicolon',
  'banned_modal',
  'latin_abbrev',
  'slop_word',
] as const;

/** python3 probe — absent python3 must skip legibly, not die on spawn. */
const python3Available = (() => {
  try {
    execFileSync('python3', ['--version'], { encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
})();

type RunResult = { stdout: string; ok: boolean; status: number | null };

function run(args: string[], stdin?: string): RunResult {
  try {
    const stdout = execFileSync('python3', [LINTER, ...args], {
      encoding: 'utf-8',
      ...(stdin !== undefined ? { input: stdin } : {}),
    });
    return { stdout, ok: true, status: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: Buffer | string; status?: number | null };
    return {
      stdout: e.stdout ? e.stdout.toString() : '',
      ok: false,
      status: e.status ?? null,
    };
  }
}

/** Lint text on stdin; fail loudly with raw output when the JSON shape is off. */
function lint(text: string, type: 'procedural' | 'descriptive') {
  const res = run(['--type', type, '-'], text);
  expect(res.ok, `linter exited ${res.status}: ${res.stdout}`).toBe(true);
  let parsed: { violations?: Record<string, number> };
  try {
    parsed = JSON.parse(res.stdout);
  } catch {
    throw new Error(`unparseable linter output: ${res.stdout}`);
  }
  expect(parsed.violations, `no violations key in: ${res.stdout}`).toBeDefined();
  return parsed.violations as Record<string, number>;
}

function assertFixToZero(violations: Record<string, number>, label: string) {
  const offending = FIX_TO_ZERO.filter((c) => (violations[c] ?? 0) > 0);
  expect(
    offending,
    `${label} trips fix-to-zero classes: ${JSON.stringify(
      Object.fromEntries(offending.map((c) => [c, violations[c]])),
    )}`,
  ).toEqual([]);
}

// ---------------------------------------------------------------------------
// Governed prose extraction. Carve-outs are visible here on purpose
// (spec edge case): prose that quotes a violation to ban it is not a use.
// ---------------------------------------------------------------------------

/**
 * Style doc minus the deliberate rule-breakers:
 *  - the Worked Example "before" blockquote — it demonstrates failure on purpose
 *  - rule 11's slop table — its cells quote the banned words to ban them
 *  - rule 9's counter-example phrase quoting a banned modal
 */
function styleDocGovernedProse(): string {
  let text = readFileSync(
    join(repoRoot, 'src', 'templates', 'reference', 'output-style.md'),
    'utf-8',
  );
  const before = text.indexOf('A decomposition hand-off, before:');
  const after = text.indexOf('After:');
  expect(before, 'Worked Example before-sample present').toBeGreaterThan(-1);
  expect(after, 'Worked Example after-sample present').toBeGreaterThan(before);
  text = text.slice(0, before) + text.slice(after);
  // The slop table: every markdown table row between rule 11's header and Why.
  text = text.replace(/^\|.*\|$/gm, ' ');
  // Rule 9's quoted counter-example mentions a banned modal to ban it.
  text = text.replace('"the build might fail"', '"..."');
  return text;
}

/** Gate template: the SLOT: comment guidance text is the shipped human prose. */
function gateTemplateSlotGuidance(): string {
  const html = readFileSync(
    join(repoRoot, 'src', 'templates', 'REVIEW_GATE_TEMPLATE.html'),
    'utf-8',
  );
  const comments = [...html.matchAll(/<!--([\s\S]*?)-->/g)].map((m) => m[1].trim());
  const slots = comments.filter((c) => c.startsWith('SLOT:'));
  expect(slots.length, 'slot comments present').toBeGreaterThan(10);
  return slots.join('\n\n');
}

// ---------------------------------------------------------------------------

describe.skipIf(!python3Available)('ste-lint (skipped: python3 not on PATH)', () => {
  it('passes its own --self-test', () => {
    const res = run(['--self-test']);
    expect(res.ok, `--self-test exited ${res.status}: ${res.stdout}`).toBe(true);
    expect(res.stdout).toContain('self-test OK');
  });

  it('output-style.md governed prose has zero fix-to-zero violations', () => {
    assertFixToZero(lint(styleDocGovernedProse(), 'descriptive'), 'output-style.md');
  });

  it('REVIEW_GATE_TEMPLATE.html slot guidance has zero fix-to-zero violations', () => {
    assertFixToZero(lint(gateTemplateSlotGuidance(), 'procedural'), 'gate template');
  });

  it('advisory classes never fail — a long sentence is reported, not fatal', () => {
    const longSentence =
      'This one deliberately overlong fixture sentence rambles across far more than twenty five words to prove that the advisory sentence length class alone can never fail the suite at all.';
    const violations = lint(longSentence, 'descriptive');
    expect(violations.sentence_over_limit).toBeGreaterThan(0);
    assertFixToZero(violations, 'advisory fixture');
  });
});

describe.skipIf(python3Available)('ste-lint skip path', () => {
  it('skips legibly when python3 is absent', () => {
    // Reached only without python3: records WHY the lint guarantee narrowed.
    expect(python3Available, 'python3 missing — STE lint suite skipped').toBe(false);
  });
});
