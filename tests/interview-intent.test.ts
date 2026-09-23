import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

/**
 * Spec emit-intent-from-interview (2026-09-22-fable-native-sdlc-harness):
 * the interview's first written artifact is an intent file in the inbox, not a
 * draft brief. The draft brief becomes optional and, when written, is stamped
 * with an `intent:` frontmatter key pointing back at the intent.
 */

const INTENT_PATH = 'docs/intent/<slug>.md';
const BRIEF_PATH = 'docs/features/<slug>/brief.md';
const TEMPLATE_PATH = 'docs/templates/INTENT_TEMPLATE.md';

const SOURCES: Array<[string, string]> = [
  ['canonical', join(repoRoot, 'src', 'skills', 'joycraft-interview.md')],
  ['claude', join(repoRoot, 'src', 'claude-skills', 'joycraft-interview.md')],
  ['codex', join(repoRoot, 'src', 'codex-skills', 'joycraft-interview.md')],
];

/** Step 4 region: from the `### 4.` heading to the next numbered step heading. */
function step4(content: string): string {
  const start = content.search(/^### 4\. /m);
  expect(start, 'Step 4 heading present').toBeGreaterThan(-1);
  const rest = content.slice(start);
  const end = rest.slice(1).search(/^### 5\. /m);
  return end === -1 ? rest : rest.slice(0, end + 1);
}

/** Every ```yaml fence body in the text. */
function yamlFences(content: string): string[] {
  const out: string[] = [];
  const re = /```yaml\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) out.push(m[1]);
  return out;
}

for (const [label, path] of SOURCES) {
  describe(`joycraft-interview emits an intent first (${label})`, () => {
    const content = readFileSync(path, 'utf-8');

    it('names the intent path before the first draft-brief path', () => {
      const intent = content.indexOf(INTENT_PATH);
      const brief = content.indexOf(BRIEF_PATH);
      expect(intent, 'intent path present').toBeGreaterThan(-1);
      expect(brief, 'brief path present').toBeGreaterThan(-1);
      expect(intent).toBeLessThan(brief);
    });

    it('cites the intent template by path instead of restating it', () => {
      expect(content).toContain(TEMPLATE_PATH);
    });

    it('stamps source: interview on the intent', () => {
      expect(content).toContain('source: interview');
    });

    it('writes the intent as untriaged', () => {
      expect(content).toContain('Status: untriaged');
    });

    it('marks the draft brief optional inside Step 4, ahead of the brief format', () => {
      // Slice off the render subsection: its "optional extra render" offer
      // predates this spec and must not satisfy the optionality check.
      const s = step4(content);
      const head = s.slice(0, s.indexOf('### The "Prompt for the implementing agent" section'));
      expect(head.toLowerCase()).toMatch(/draft brief is optional|optional draft brief/);
    });

    it('stamps intent: into the brief frontmatter alongside the four existing keys', () => {
      const briefFm = yamlFences(step4(content)).find((f) => /^status: draft$/m.test(f));
      expect(briefFm, 'brief frontmatter block present in Step 4').toBeDefined();
      for (const key of ['status', 'owner', 'created', 'feature']) {
        expect(briefFm!).toMatch(new RegExp(`^${key}: `, 'm'));
      }
      expect(briefFm!).toMatch(/^intent: docs\/intent\/<slug>\.md$/m);
    });

    it('creates no feature folder and skips the render when the brief is declined', () => {
      const s = step4(content).replace(/\s+/g, ' ');
      expect(s).toMatch(/no folder under `docs\/features\/`|no `docs\/features\/<slug>\/` folder/);
      expect(s.toLowerCase()).toContain('skip');
    });
  });
}
