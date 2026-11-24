import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// Feature claude-artifact-pages: where pages show, one page for a document and
// its questions, and importing answers from Claude artifact storage.
const runtime = join(__dirname, '../payload/.joycraft/runtime/artifacts');
const load = async (name: string) => import(join(runtime, name));
const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

const BRIEF = `---
feature: pages-test
status: specified
decisions: [
  { "id": "one", "status": "open", "answer": null, "question": "First?", "options": [{ "value": "a", "label": "A" }, { "value": "b", "label": "B" }], "affected": ["x"] },
  { "id": "two", "status": "open", "answer": null, "question": "Second?", "options": [{ "value": "c", "label": "C" }, { "value": "d", "label": "D" }], "affected": ["x"] }
]
---
# Pages test
`;

function project(): string {
  const dir = mkdtempSync(join(tmpdir(), 'joycraft-pages-'));
  dirs.push(dir);
  mkdirSync(join(dir, 'docs'), { recursive: true });
  writeFileSync(join(dir, 'docs/brief.md'), BRIEF);
  writeFileSync(join(dir, 'docs/findings.md'), '# Findings\n\nThe first finding.\n');
  return dir;
}

describe('claude-artifact-pages', () => {
  it('[AC:pages-default] pages default to claude, and a recorded choice wins', async () => {
    const { main } = await load('cli.mjs');
    const dir = project();
    expect(await main(['pages'], dir)).toEqual({ pages: 'claude', source: 'default' });
    expect(await main(['pages', '--set', 'local'], dir)).toEqual({ pages: 'local', source: '.joycraft/preferences.json' });
    expect(await main(['pages'], dir)).toEqual({ pages: 'local', source: '.joycraft/preferences.json' });
    await expect(main(['pages', '--set', 'web'], dir)).rejects.toThrow('claude or local');
    expect(JSON.parse(readFileSync(join(dir, '.joycraft/preferences.json'), 'utf8')).artifacts).toEqual({ pages: 'local' });
  });

  it('[AC:sl3-03-no-style-ask] artifacts.md uses the default style and asks for none outside setup', () => {
    const text = readFileSync(join(__dirname, '../payload/.joycraft/references/artifacts.md'), 'utf8').replace(/\s+/g, ' ');
    expect(text).toContain(`With \`unset: true\`, use a page of decisions on the decision page, and say once: "Say 'ask me one at a time' or 'ask in chat' to change this."`);
    expect(text).not.toMatch(/ask for it as \[setup\]/);
    expect(text).not.toContain('setup.md) step 2');
  });

  it('[AC:sl3-03-default-style] questions with no preferences prints a page on the decision page and writes nothing', async () => {
    const { main } = await load('cli.mjs');
    const dir = project();
    const printed: string[] = [];
    const log = console.log;
    console.log = (line: string) => { printed.push(line); };
    try { await main(['questions'], dir); } finally { console.log = log; }
    expect(JSON.parse(printed.join('\n'))).toMatchObject({ pacing: 'page', surface: 'artifact', unset: true });
    expect(existsSync(join(dir, '.joycraft'))).toBe(false);
  });

  it('[AC:one-page] a Claude build shows the document above its questions on one page', async () => {
    const { main } = await load('cli.mjs');
    const dir = project();
    await main(['build', '--brief', 'docs/brief.md', '--doc', 'docs/findings.md', '--out', 'page.html', '--mode', 'claude'], dir);
    const html = readFileSync(join(dir, 'page.html'), 'utf8');
    expect(html).toContain('The first finding.');
    expect(html).toContain('First?');
    expect(html.indexOf('The first finding.')).toBeLessThan(html.indexOf('"First?"'));
    expect(html).toContain('JoycraftArtifactTransports.claude');
  });

  it('[AC:import-list] answers kept one per decision import together; a repeated decision is refused', async () => {
    const { loadArtifact, persistResponses } = await load('model.mjs');
    const dir = project();
    const { model } = await loadArtifact({ root: dir, brief: 'docs/brief.md', mode: 'claude' });
    const envelope = (id: string, answer: string) => ({ schemaVersion: 1, kind: 'joycraft-artifact-responses', artifactId: model.artifactId, source: model.source, answers: [{ id, answer }] });
    const preview = await persistResponses({ root: dir, brief: 'docs/brief.md', envelope: [envelope('one', 'a'), envelope('two', 'd')] });
    expect(preview.applied).toBe(false);
    expect(readFileSync(join(dir, 'docs/brief.md'), 'utf8')).toBe(BRIEF);
    await expect(persistResponses({ root: dir, brief: 'docs/brief.md', envelope: [envelope('one', 'a'), envelope('one', 'b')] })).rejects.toThrow('more than once');
    await persistResponses({ root: dir, brief: 'docs/brief.md', envelope: [envelope('one', 'a'), envelope('two', 'd')], apply: true });
    const { model: after } = await loadArtifact({ root: dir, brief: 'docs/brief.md' });
    expect(after.questions.map((q: { id: string; answer: string }) => [q.id, q.answer])).toEqual([['one', 'a'], ['two', 'd']]);
  });
});
