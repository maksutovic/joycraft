import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, existsSync, readdirSync, mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { getBundleInventory } from '../src/bundle-inventory';
import { TEMPLATES } from '../src/bundled-files';
import { update } from '../src/update';
import { readInstallationManifest, type InstallationManifest } from '../src/install-manifest';

const ROOT = join(__dirname, '..');
const TEMPLATES_DIR = join(ROOT, 'src', 'templates');
const PROFILE_DOC = join(TEMPLATES_DIR, 'reference', 'model-profile-claude-fable-5-1.md');
const INSTALLED_PATH = 'docs/templates/reference/model-profile-claude-fable-5-1.md';

function read(): string {
  return readFileSync(PROFILE_DOC, 'utf-8');
}

/** Only `## ` heading lines — prose mentions of a block name are harmless. */
function h2Headings(content: string): string[] {
  return content.split('\n').filter((l) => /^## /.test(l));
}

/**
 * Slice the lines belonging to a `## <heading>` section, stopping at the next
 * `## `. The heading regex must match the WHOLE heading line.
 */
function section(content: string, heading: RegExp): string[] {
  const lines = content.split('\n');
  const start = lines.findIndex((l) => /^## /.test(l) && heading.test(l));
  if (start === -1) return [];
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^## /.test(l));
  return end === -1 ? rest : rest.slice(0, end);
}

/**
 * The block roster. Later specs cite these headings verbatim as
 * "path + block name", so each regex pins the whole heading line. Renaming a
 * heading must fail this test.
 */
const BLOCKS: Array<[string, RegExp]> = [
  ['finish the whole task', /^## Finish the Whole Task$/],
  ['keep changes and tests to what the task asks', /^## Keep Changes and Tests to What the Task Asks$/],
  ['progress updates', /^## Give User-Facing Progress Updates$/],
  ['mannered prose', /^## Mannered Prose$/],
  ['compaction retention', /^## Compaction Retention$/],
  ['targeted edits', /^## Targeted Edits Over Whole-File Rewrites$/],
  ['batched tool calls', /^## Batch Independent Tool Calls$/],
  ['formatting when appropriate', /^## Formatting When Appropriate$/],
  ['end state', /^## End State of Every Prompt$/],
  ['choose between paths', /^## Paths to Choose Between$/],
];

describe('model profile template: file exists', () => {
  it('src/templates/reference/model-profile-claude-fable-5-1.md exists', () => {
    expect(existsSync(PROFILE_DOC), `${PROFILE_DOC} should exist`).toBe(true);
  });
});

describe('model profile template: reference-doc shape', () => {
  it('has an H1, a blockquote purpose line, and at least one section', () => {
    const lines = read().split('\n');
    expect(lines.some((l) => /^# /.test(l)), 'missing H1').toBe(true);
    expect(lines.some((l) => /^> /.test(l)), 'missing blockquote').toBe(true);
    expect(lines.some((l) => /^## /.test(l)), 'missing section').toBe(true);
  });

  it('stays inside a ~200-line budget', () => {
    expect(read().split('\n').length).toBeLessThanOrEqual(200);
  });
});

describe('model profile template: ten named blocks', () => {
  for (const [label, heading] of BLOCKS) {
    it(`has a ## heading for: ${label}`, () => {
      const matches = h2Headings(read()).filter((l) => heading.test(l));
      expect(matches.length, `missing ## block: ${label}`).toBeGreaterThanOrEqual(1);
    });
  }
});

describe('model profile template: greppable block headings', () => {
  for (const [label, heading] of BLOCKS) {
    it(`resolves "${label}" to exactly one ## heading with a non-empty body`, () => {
      const content = read();
      const matches = h2Headings(content).filter((l) => heading.test(l));
      expect(matches.length, `block "${label}" must map to exactly one heading`).toBe(1);
      const body = section(content, heading).join('\n').trim();
      expect(body.length, `block "${label}" has an empty body`).toBeGreaterThan(0);
    });
  }

  it('has no duplicate ## headings anywhere', () => {
    const headings = h2Headings(read());
    expect(new Set(headings).size).toBe(headings.length);
  });

  it('mannered prose covers both the long and the short form', () => {
    const body = section(read(), /^## Mannered Prose$/).join('\n');
    expect(body).toMatch(/long form/i);
    expect(body).toMatch(/short form/i);
  });

  it('finish the whole task carries both the autonomous-operation and delivering-work halves', () => {
    const body = section(read(), /^## Finish the Whole Task$/).join('\n');
    expect(body).toMatch(/autonomous/i);
    expect(body).toMatch(/deliver/i);
  });
});

describe('model profile template: formatting rule', () => {
  /** Strip fenced blocks, blockquotes, inline code, and quoted samples. */
  function normativeProse(): string {
    return read()
      .replace(/```[\s\S]*?```/g, '')
      .split('\n')
      .filter((l) => !/^\s*>/.test(l))
      .join('\n')
      .replace(/`[^`]*`/g, '`CODE`')
      .replace(/"[^"]*"/g, '"SAMPLE"')
      .replace(/“[^”]*”/g, '"SAMPLE"');
  }

  it('states a when-appropriate rule in the formatting block', () => {
    const body = section(read(), /^## Formatting When Appropriate$/).join('\n');
    expect(body).toMatch(/when (?:it is |it's )?appropriate|when [^.]{0,60}\bhelps?\b/i);
  });

  it('carries no blanket anti-formatting instruction in normative prose', () => {
    expect(normativeProse()).not.toMatch(/never use (markdown|formatting)/i);
    expect(normativeProse()).not.toMatch(/(?:do not|don't|avoid) (?:use )?(?:any )?(markdown|formatting)\b(?! when)/i);
  });
});

describe('model profile template: model named and scoped', () => {
  it('names Claude Fable 5.1', () => {
    expect(read()).toMatch(/Claude Fable 5\.1/);
  });

  it('says the guidance is model-specific, not universal', () => {
    expect(read()).toMatch(/model-specific/i);
    expect(read()).toMatch(/not universal/i);
  });
});

describe('model profile template: no absolute or repo paths', () => {
  it('uses project-relative paths only', () => {
    const content = read();
    expect(content).not.toMatch(/\/Users\//);
    expect(content).not.toMatch(/joycraft\/src/);
  });
});

describe('model profile template: auto-bundle key shape', () => {
  it('maps to the reference/model-profile-claude-fable-5-1.md bundle key', () => {
    // Mirrors the bundler's readTreeDir(relative(TEMPLATES_DIR, file)) normalization.
    expect(existsSync(PROFILE_DOC), `${PROFILE_DOC} should exist`).toBe(true);
    const key = relative(TEMPLATES_DIR, PROFILE_DOC).split(/[\\/]/).join('/');
    expect(key).toBe('reference/model-profile-claude-fable-5-1.md');
  });
});

describe('model profile template: bundle inventory entry', () => {
  it('getBundleInventory([claude]) vendors the doc into docs/templates/reference/', () => {
    const paths = getBundleInventory(['claude']).map((e) => e.path);
    expect(paths).toContain(INSTALLED_PATH);
  });
});

describe('model profile template: installed copy stays byte-identical', () => {
  it('docs/templates/reference/model-profile-claude-fable-5-1.md matches the source template', () => {
    const installed = join(ROOT, INSTALLED_PATH);
    expect(existsSync(installed), `${installed} should exist`).toBe(true);
    expect(readFileSync(installed)).toEqual(readFileSync(PROFILE_DOC));
  });
});

describe('reference templates dir: enumeration guard', () => {
  const REFERENCE_DIR = join(TEMPLATES_DIR, 'reference');
  const EXPECTED_FILES = [
    'knowledge-lifecycle.md',
    'model-profile-claude-fable-5-1.md',
    'output-style.md',
    'spec-status-lifecycle.md',
  ];

  it('src/templates/reference/ contains exactly the expected .md files', () => {
    expect(existsSync(REFERENCE_DIR), `${REFERENCE_DIR} should exist`).toBe(true);
    const found = readdirSync(REFERENCE_DIR).filter((f) => f.endsWith('.md')).sort();
    expect(found).toEqual(EXPECTED_FILES);
  });

  for (const file of EXPECTED_FILES) {
    it(`${file} maps to the reference/${file} bundle key`, () => {
      expect(Object.keys(TEMPLATES)).toContain(`reference/${file}`);
    });
  }
});

describe('model profile template: harness-gated install', () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });
  function project(): string {
    const root = mkdtempSync(join(tmpdir(), 'joycraft-profile-gate-'));
    roots.push(root);
    return root;
  }
  function manifest(root: string): InstallationManifest {
    const found = readInstallationManifest(root) ?? readInstallationManifest(root, 'private');
    expect(found, 'installation manifest should exist').not.toBeNull();
    return found!;
  }
  const installed = (root: string): boolean => existsSync(join(root, INSTALLED_PATH));

  it('a codex-only install does not write the profile doc', async () => {
    const root = project();
    const result = await update(root, { nonInteractive: true, harnesses: ['codex'] });
    expect(result.status).toBe('applied');
    expect(installed(root)).toBe(false);
    expect(manifest(root).files[INSTALLED_PATH]).toBeUndefined();
  });

  it('a pi-only install writes the profile doc', async () => {
    const root = project();
    const result = await update(root, { nonInteractive: true, harnesses: ['pi'] });
    expect(result.status).toBe('applied');
    expect(installed(root)).toBe(true);
    expect(readFileSync(join(root, INSTALLED_PATH))).toEqual(readFileSync(PROFILE_DOC));
  });

  it('adding claude to a codex-only install writes the profile doc', async () => {
    const root = project();
    await update(root, { nonInteractive: true, harnesses: ['codex'] });
    expect(installed(root)).toBe(false);
    await update(root, { nonInteractive: true, harnesses: ['codex', 'claude'] });
    expect(installed(root)).toBe(true);
    expect(manifest(root).files[INSTALLED_PATH]).toBeDefined();
  });

  it('dropping every eligible harness deletes the unmodified profile doc and its manifest row', async () => {
    const root = project();
    await update(root, { nonInteractive: true, harnesses: ['pi'] });
    expect(installed(root)).toBe(true);
    await update(root, { nonInteractive: true, harnesses: ['codex'] });
    expect(installed(root)).toBe(false);
    expect(manifest(root).files[INSTALLED_PATH]).toBeUndefined();
  });

  it('a claude install records the profile doc with verified ownership', async () => {
    const root = project();
    await update(root, { nonInteractive: true, harnesses: ['claude'] });
    expect(manifest(root).files[INSTALLED_PATH]?.ownership).toBe('verified');
  });

  it('the gated doc does not replace the claude skill tree in the selected-harness ignore warning', async () => {
    const root = project();
    writeFileSync(join(root, '.gitignore'), '.claude/\n');
    const result = await update(root, { nonInteractive: true, harnesses: ['claude'], gitignore: 'shared' });
    expect(result.status).toBe('applied');
    const warning = result.diagnostics.find((line) => line.startsWith('Selected claude harness path'));
    expect(warning, result.diagnostics.join('\n')).toBeDefined();
    expect(warning).toContain('.claude/');
    expect(warning).not.toContain(INSTALLED_PATH);
  });

  it('the gated doc on disk is not a harness detection signal for a manifest-less project', async () => {
    const root = project();
    const piSkill = getBundleInventory(['pi']).find((entry) => entry.harness === 'pi' && entry.path.startsWith('.pi/skills/'))!;
    for (const [path, content] of [[piSkill.path, piSkill.content!], [INSTALLED_PATH, readFileSync(PROFILE_DOC, 'utf-8')]]) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), content);
    }
    const result = await update(root, { nonInteractive: true, preview: true });
    expect(result.harnesses).toEqual(['pi']);
  });
});
