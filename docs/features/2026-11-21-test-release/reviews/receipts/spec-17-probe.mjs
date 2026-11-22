// Reviewer probe for spec 17: what test-changes.mjs (the startup list the new
// reviewer rules read) reports for honest and adversarial test edits.
// Usage: node spec-17-probe.mjs <project-root>
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.argv[2];
const { testChanges } = await import(pathToFileURL(join(root, 'payload/.joycraft/runtime/test-changes.mjs')).href);
const git = (cwd, ...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@e', ...a], { cwd, encoding: 'utf8' }).trim();
const put = (f, b) => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, b); };

function scenario(name, section, mutate) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'r17-')));
  try {
    git(dir, 'init', '-q', '-b', 'main');
    const folder = 'docs/features/2026-11-21-f/specs';
    const spec = `${folder}/01-a.md`;
    put(join(dir, spec), `---\nid: 1\nstatus: in-review\n---\n# s\n\n## acceptance\n\n- Bullet 1: total() returns 12 (was 10).\n- Bullet 2: faster suite.\n\n## Test changes\n\n${section}\n\n## Not covered\n\nx\n`);
    for (const f of ['a', 'b', 'c', 'd']) put(join(dir, `tests/${f}.test.ts`), `expect(total()).toBe(10);\nexpect(other()).toBe(1);\n`);
    put(join(dir, `${folder}/.joycraft-spec-queue.json`), JSON.stringify({ schemaVersion: 1, feature: 'f', specs: [{ id: 1, file: '01-a.md', depends_on: [], status: 'in-review', mode: 'checkpoint',
      verification: { inputs: [{ path: spec, kind: 'requirement' }], criteria: [{ id: 'spec-1-1', requirement: { path: spec, anchor: 'acceptance' }, requiredKinds: ['runtime'] }] } }] }));
    git(dir, 'add', '-A'); git(dir, 'commit', '-q', '-m', 'base');
    const base = git(dir, 'rev-parse', 'HEAD');
    mutate(dir);
    const r = testChanges({ root: dir, queuePath: `${folder}/.joycraft-spec-queue.json`, specId: 1, base });
    console.log(`${name}\n  section: ${JSON.stringify(section)}\n  declared: ${JSON.stringify(r.declared)}\n  undeclared: ${JSON.stringify(r.undeclared)}`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

const edit = (dir, f, body) => put(join(dir, `tests/${f}.test.ts`), body);
// (a) honest cases
scenario('A1 class 1, expected value changed, acceptance states 12', '- `tests/a.test.ts` class 1: acceptance bullet 1 states the new value (12).',
  d => edit(d, 'a', 'expect(total()).toBe(12);\nexpect(other()).toBe(1);\n'));
scenario('A2 class 2 speed refactor (fault proof claimed)', '- `tests/b.test.ts` class 2: acceptance bullet 2; fault proof receipts/fault-b.diff.',
  d => edit(d, 'b', 'describe.concurrent("x",()=>{expect(total()).toBe(10);expect(other()).toBe(1);});\n'));
scenario('A3 class 3 deletion', '- `tests/c.test.ts` class 3: ledger row 4, owner yes 2026-11-21.',
  d => rmSync(join(d, 'tests/c.test.ts')));
// (b) adversarial cases
scenario('B1 undeclared edit removing an assertion', 'none', d => edit(d, 'a', 'expect(total()).toBe(10);\n'));
scenario('B2 declared file, change unrelated to the requiring line (assertion on other() dropped)', '- `tests/a.test.ts` class 1: acceptance bullet 1 states the new value (12).',
  d => edit(d, 'a', 'expect(total()).toBe(12);\n'));
scenario('B3 class 1 whose requiring line does not state the value', '- `tests/a.test.ts` class 1: acceptance bullet 2.',
  d => edit(d, 'a', 'expect(total()).toBe(99);\nexpect(other()).toBe(1);\n'));
scenario('B4 bare declaration with no requiring line', '- `tests/a.test.ts` class 1',
  d => edit(d, 'a', 'expect(total()).toBeDefined();\nexpect(other()).toBe(1);\n'));
scenario('B5 rename hides a deletion, new path declared class 2', '- `tests/d2.test.ts` class 2: acceptance bullet 2; fault proof receipts/fault-d.diff.',
  d => { renameSync(join(d, 'tests/d.test.ts'), join(d, 'tests/d2.test.ts')); edit(d, 'd2', 'expect(total()).toBe(10);\n'); });
scenario('B6 rename hides a deletion, nothing declared', 'none',
  d => { renameSync(join(d, 'tests/d.test.ts'), join(d, 'tests/d2.test.ts')); edit(d, 'd2', 'expect(total()).toBe(10);\n'); });
// B7: the implementer adds its own declaration to the spec after the base (test-changes reads the current spec text).
{
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'r17-')));
  try {
    git(dir, 'init', '-q', '-b', 'main');
    const folder = 'docs/features/2026-11-21-f/specs';
    const spec = `${folder}/01-a.md`;
    const body = s => `---\nid: 1\nstatus: in-review\n---\n# s\n\n## acceptance\n\n- Bullet 1: x.\n\n## Test changes\n\n${s}\n\n## Not covered\n\nx\n`;
    put(join(dir, spec), body('none'));
    put(join(dir, 'tests/a.test.ts'), 'expect(total()).toBe(10);\nexpect(other()).toBe(1);\n');
    put(join(dir, `${folder}/.joycraft-spec-queue.json`), JSON.stringify({ schemaVersion: 1, feature: 'f', specs: [{ id: 1, file: '01-a.md', depends_on: [], status: 'in-review', mode: 'checkpoint',
      verification: { inputs: [{ path: spec, kind: 'requirement' }], criteria: [{ id: 'spec-1-1', requirement: { path: spec, anchor: 'acceptance' }, requiredKinds: ['runtime'] }] } }] }));
    git(dir, 'add', '-A'); git(dir, 'commit', '-q', '-m', 'base');
    const base = git(dir, 'rev-parse', 'HEAD');
    put(join(dir, spec), body('- `tests/a.test.ts` class 2: bullet 1; fault proof to follow.'));
    put(join(dir, 'tests/a.test.ts'), 'expect(total()).toBe(10);\n');
    git(dir, 'commit', '-qam', 'impl');
    const r = testChanges({ root: dir, queuePath: `${folder}/.joycraft-spec-queue.json`, specId: 1, base });
    console.log(`B7 implementer adds a class-2 declaration after the base and drops an assertion\n  base section: "none"\n  declared: ${JSON.stringify(r.declared)}\n  undeclared: ${JSON.stringify(r.undeclared)}`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
