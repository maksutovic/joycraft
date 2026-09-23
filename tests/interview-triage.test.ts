import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

/**
 * Spec add-triage-mode-to-interview (2026-09-22-fable-native-sdlc-harness):
 * interview offers triage of untriaged `docs/intent/` files before opening the
 * floor. The agent proposes tags + priority; the human routes each intent to
 * exactly one of interview / bugfix / backlog / discard; the route is stamped
 * into the intent's `Status:` header and the file is never deleted.
 */

const TRIAGE_HEADING = /^### 0\. Triage the Inbox/m;
const FLOOR_HEADING = /^### 1\. Open the Floor/m;
const ROUTES = ['interview', 'bugfix', 'backlog', 'discard'];

const CANONICAL = join(repoRoot, 'src', 'skills', 'joycraft-interview.md');
const GENERATED: Array<[string, string]> = [
  ['claude', join(repoRoot, 'src', 'claude-skills', 'joycraft-interview.md')],
  ['omp', join(repoRoot, 'src', 'omp-skills', 'joycraft-interview.md')],
];

/** Triage region: from the triage heading up to the Open the Floor heading. */
function triageRegion(content: string): string {
  const start = content.search(TRIAGE_HEADING);
  const end = content.search(FLOOR_HEADING);
  expect(start, 'triage heading present').toBeGreaterThan(-1);
  expect(end, 'Open the Floor heading present').toBeGreaterThan(-1);
  expect(start).toBeLessThan(end);
  return content.slice(start, end);
}

/** Collapse whitespace so hard wraps never break a phrase match. */
const flat = (s: string) => s.replace(/\s+/g, ' ');

function orderingAndRoutes(label: string, path: string) {
  describe(`interview triage ordering and routes (${label})`, () => {
    const content = readFileSync(path, 'utf-8');

    it('places the triage step before Open the Floor', () => {
      const triage = content.search(TRIAGE_HEADING);
      const floor = content.search(FLOOR_HEADING);
      expect(triage, 'triage heading present').toBeGreaterThan(-1);
      expect(triage).toBeLessThan(floor);
    });

    it('names all four routes inside the triage region', () => {
      const region = triageRegion(content);
      for (const route of ROUTES) {
        expect(region, `route ${route}`).toContain(`\`${route}\``);
      }
    });
  });
}

orderingAndRoutes('canonical', CANONICAL);
for (const [label, path] of GENERATED) orderingAndRoutes(label, path);

describe('interview triage behavior (canonical)', () => {
  const content = readFileSync(CANONICAL, 'utf-8');
  const region = () => flat(triageRegion(content));

  it('reads the intent inbox', () => {
    expect(region()).toContain('docs/intent/');
  });

  it('defines untriaged by the Status: value untriaged or an absent header', () => {
    const r = region();
    expect(r).toMatch(/`Status:`/);
    expect(r).toContain('`untriaged`');
    expect(r).toMatch(/absent|missing|no `Status:`/i);
    expect(r).toMatch(/any other value/i);
  });

  it('excludes README.md from the listing', () => {
    expect(region()).toMatch(/skip(ping)? `README\.md`|`README\.md` is (skipped|excluded)|excluding `README\.md`/i);
  });

  it('stays silent and falls through on an empty inbox', () => {
    const r = region();
    expect(r).toMatch(/zero untriaged/i);
    expect(r).toMatch(/say nothing|silent/i);
    expect(r).toMatch(/Step 1|Open the Floor/);
  });

  it('offers triage before a fresh brainstorm when untriaged intents exist', () => {
    expect(region()).toMatch(/triage now or start a fresh brainstorm/i);
  });

  it('has the agent propose tags and a priority', () => {
    expect(region()).toMatch(/propose[s]? tags and a priority/i);
  });

  it('states the agent proposes and the human decides, never inferring a route', () => {
    const r = region();
    expect(r).toMatch(/agent proposes/i);
    expect(r).toMatch(/human (routes|decides)/i);
    expect(r).toMatch(/never (infer|inferred)[^.]*silence/i);
  });

  it('stamps the route word into the Status: header', () => {
    expect(region()).toMatch(/stamp/i);
    expect(region()).toMatch(/`Status: <route>`|`Status:` (header|line)/);
  });

  it('keeps the intent file in place on every route, discard included — never deleted', () => {
    const r = region();
    expect(r).toMatch(/stays in `docs\/intent\/`/);
    expect(r).toMatch(/never delete/i);
    expect(r).toContain('`discard`');
  });

  it('never writes to docs/backlog/ or invokes a downstream skill from triage', () => {
    const r = region();
    expect(r).toMatch(/names the next command/i);
    expect(r).toMatch(/never (writes|write) to `docs\/backlog\/`/i);
  });

  it('adds no second render step or slot-template reference', () => {
    const r = region();
    expect(r).not.toContain('REVIEW_GATE_TEMPLATE');
    expect(r).not.toContain('SLOT:');
    expect(r).toMatch(/no HTML artifact|stays in chat/i);
  });
});
