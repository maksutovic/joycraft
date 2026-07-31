import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const TEMPLATE_PATH = join(
  ROOT,
  'src',
  'templates',
  'REVIEW_GATE_TEMPLATE.html',
);

/** Read the real template from src/templates/ — never a copy. */
function readTemplate(): string {
  return readFileSync(TEMPLATE_PATH, 'utf-8');
}

const SLOT_NAMES = [
  'title',
  'eyebrow',
  'title-h1',
  'dek',
  'context-strip',
  'sections',
  'questions',
  'howto',
  'footer',
];

describe('REVIEW_GATE_TEMPLATE.html — file + slots', () => {
  it('exists in src/templates/', () => {
    expect(existsSync(TEMPLATE_PATH)).toBe(true);
  });

  for (const slot of SLOT_NAMES) {
    it(`declares the ${slot} slot region`, () => {
      expect(readTemplate()).toContain(`SLOT:${slot}`);
    });
  }

  it('defines the required container and block classes', () => {
    const html = readTemplate();
    for (const cls of [
      '.lock-chip',
      '.sec-head',
      '.sub',
      '.pillars',
      '.tablebox',
      '.spec-name',
      '.size',
      '.wave',
      '.cols',
      '.criteria',
      '.q',
      '.howto',
    ]) {
      expect(html, `missing class ${cls}`).toContain(cls);
    }
  });
});

describe('REVIEW_GATE_TEMPLATE.html — custom output templates stay inside the slots', () => {
  /**
   * `support-custom-output-templates` lets a team's own PRD format shape gate
   * output. The locked-skeleton contract says that reshaping happens *inside*
   * the slot regions and never to the skeleton itself.
   *
   * A byte/hash pin would be the strictest form, but it would also fail
   * legitimately when a later spec edits the skeleton on purpose. So we pin the
   * structural invariants a custom template could plausibly erode instead —
   * these hold no matter whose sections end up in the `sections` slot.
   */
  it('routes custom sections through a generic sections slot', () => {
    // The mapping target: custom sections have somewhere to go that is not a
    // gate-specific slot. Without this, honoring a custom template would mean
    // inventing skeleton markup.
    expect(readTemplate()).toContain('SLOT:sections');
  });

  it('keeps every slot a comment, so filling one cannot alter the skeleton', () => {
    const content = readTemplate();
    for (const slot of SLOT_NAMES) {
      expect(
        content,
        `SLOT:${slot} must be declared inside an HTML comment`,
      ).toMatch(new RegExp(`<!--\\s*SLOT:${slot}\\b`));
    }
  });

  it('ships no custom-template lookup logic of its own', () => {
    // The lookup is a skill instruction, not template machinery: rendering
    // stays agent-hand-filled with no runtime dependency (AGENTS.md NEVER).
    const content = readTemplate();
    expect(content).not.toContain('docs/templates/output/');
  });
});

describe('REVIEW_GATE_TEMPLATE.html — design tokens', () => {
  it('defines --ground on :root', () => {
    const html = readTemplate();
    expect(html).toMatch(/:root\s*\{[^}]*--ground:/);
  });

  it('follows the OS dark preference', () => {
    expect(readTemplate()).toContain('@media (prefers-color-scheme: dark)');
  });

  it('lets an explicit data-theme override win in both directions', () => {
    const html = readTemplate();
    expect(html).toContain(':root[data-theme="dark"]');
    expect(html).toContain(':root[data-theme="light"]');
  });

  it('reuses the dossier token palette values', () => {
    const html = readTemplate();
    const dossier = readFileSync(
      join(ROOT, 'src', 'templates', 'DECISION_DOSSIER_TEMPLATE.html'),
      'utf-8',
    );
    // A few load-bearing token values must match the dossier byte-for-byte —
    // this is one design system, not two.
    for (const token of [
      '--ground: #F5F6F8',
      '--ground: #12151C',
      '--accent: #2F4E8C',
      '--warn-ink: #92550C',
    ]) {
      expect(dossier, `dossier drifted: ${token}`).toContain(token);
      expect(html, `template missing dossier token: ${token}`).toContain(token);
    }
  });

  it('uses the dossier type stack (serif body, sans headings, mono code)', () => {
    const html = readTemplate();
    expect(html).toContain('Charter');
    expect(html).toContain('"Avenir Next"');
    expect(html).toContain('ui-monospace');
  });
});

describe('REVIEW_GATE_TEMPLATE.html — self-containment', () => {
  it('starts with the charset meta', () => {
    const firstLine = readTemplate().split('\n')[0].trim();
    expect(firstLine).toBe('<meta charset="utf-8">');
  });

  it('makes zero external requests', () => {
    const html = readTemplate();
    expect(html).not.toMatch(/(src|href)\s*=\s*["']?https?:\/\//i);
    expect(html).not.toMatch(/@import/i);
    expect(html).not.toMatch(/url\(\s*["']?https?:\/\//i);
  });

  it('contains exactly one script element — the theme handler', () => {
    const html = readTemplate();
    const opens = html.match(/<script\b/gi) ?? [];
    expect(opens.length).toBe(1);
    expect(html).toContain('data-theme');
    expect(html).toContain('prefers-color-scheme');
  });

  it('keeps the tablebox scrollable so the body never scrolls horizontally', () => {
    expect(readTemplate()).toMatch(/\.tablebox[^}]*overflow-x:\s*auto/);
  });
});

describe('REVIEW_GATE_TEMPLATE.html — contract comment', () => {
  it('has a contract comment with no nested comment terminator', () => {
    const html = readTemplate();
    const start = html.indexOf('<!--');
    expect(start).toBeGreaterThanOrEqual(0);
    const end = html.indexOf('-->', start);
    expect(end).toBeGreaterThan(start);
    const contract = html.slice(start, end);
    // The 2026-07-20 discovery: a literal slot delimiter inside the contract
    // comment terminates it early and dumps prose onto the page.
    expect(contract).not.toContain('SLOT:');
    expect(contract.length).toBeGreaterThan(200);
  });

  it('names the reject-this-framing escape in the howto slot guidance', () => {
    expect(readTemplate().toLowerCase()).toContain('reject');
  });
});

describe('REVIEW_GATE_TEMPLATE.html — registration', () => {
  it('is registered in the bundled TEMPLATES map', async () => {
    const { TEMPLATES } = await import('../src/bundled-files.js');
    expect(TEMPLATES).toHaveProperty('REVIEW_GATE_TEMPLATE.html');
    expect(TEMPLATES['REVIEW_GATE_TEMPLATE.html']).toBe(readTemplate());
  });

  it('installs to docs/templates/REVIEW_GATE_TEMPLATE.html on init', async () => {
    const { init } = await import('../src/init.js');
    const dir = mkdtempSync(join(tmpdir(), 'joycraft-review-gate-'));
    try {
      await init(dir, { force: false });
      expect(
        existsSync(join(dir, 'docs', 'templates', 'REVIEW_GATE_TEMPLATE.html')),
      ).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
