import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyTemplate } from '../scripts/lib/skill-template.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CANONICAL = join(ROOT, 'src', 'skills');
const HARNESSES = ['claude', 'codex', 'pi', 'copilot', 'omp'] as const;
const ENTRY_COMMAND = 'node docs/.joycraft/check.mjs check --json';

function splitRendered(value: string): { frontmatter: string | undefined; body: string } {
  if (!value.startsWith('---\n')) return { frontmatter: undefined, body: value };
  const close = value.indexOf('\n---\n', 4);
  if (close < 0) return { frontmatter: undefined, body: value };
  const end = close + '\n---\n'.length;
  return { frontmatter: value.slice(0, end), body: value.slice(end) };
}

const skills = readdirSync(CANONICAL).filter((file) => file.endsWith('.md')).sort();

describe.each(HARNESSES)('$harness common skill entry', (harness) => {
  it.each(skills)('%s preserves its existing transformed frontmatter and body', (file) => {
    const source = readFileSync(join(CANONICAL, file), 'utf8');
    const existing = applyTemplate(source, harness, file);
    const withEntry = applyTemplate(source, harness, file, { includeUpdateCheck: true });
    const existingParts = splitRendered(existing);
    const entryParts = splitRendered(withEntry);

    expect(entryParts.frontmatter).toBe(existingParts.frontmatter);
    expect((withEntry.match(new RegExp(ENTRY_COMMAND.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? [])).toHaveLength(1);
    expect(entryParts.body.endsWith(existingParts.body)).toBe(true);
    const entry = entryParts.body.slice(0, -existingParts.body.length);
    expect(entry).toContain('continue the requested skill');
    expect(entry).toMatch(/If an update is offered|display: true/);
    expect(entry).toContain('reinvoke the skill or restart the session');
  });
});
