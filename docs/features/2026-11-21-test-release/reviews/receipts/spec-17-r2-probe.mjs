// Round-2 reviewer probe for spec 17 (round-1 probe plus new cases): what test-changes.mjs (the startup list the new
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
    console.log(`${name}\n  section: ${JSON.stringify(section)}\n  declared: ${JSON.stringify(r.declared)}\n  undeclared: ${JSON.stringify(r.undeclared)}\n  addedAfterBase: ${JSON.stringify(r.addedAfterBase)}`);
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
    console.log(`B7 implementer adds a class-2 declaration after the base and drops an assertion\n  base section: "none"\n  declared: ${JSON.stringify(r.declared)}\n  undeclared: ${JSON.stringify(r.undeclared)}\n  addedAfterBase: ${JSON.stringify(r.addedAfterBase)}`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

// ---- Round-2 cases: a two-spec repo; `mutate` gets (dir, specs) and may commit; `pick` picks the base.
function multi(name, { one = 'none', two = 'none', mutate, pick }) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'r17b-')));
  try {
    git(dir, 'init', '-q', '-b', 'main');
    const folder = 'docs/features/2026-11-21-f/specs';
    const body = s => `---\nid: 1\nstatus: in-review\n---\n# s\n\n## acceptance\n\n- Bullet 1: total() returns 12 (was 10).\n\n## Test changes\n\n${s}\n\n## Not covered\n\nx\n`;
    const queue = file => JSON.stringify({ schemaVersion: 1, feature: 'f', specs: [
      { id: 1, file, depends_on: [], status: 'in-review', mode: 'checkpoint', verification: { inputs: [{ path: `${folder}/${file}`, kind: 'requirement' }], criteria: [{ id: 'spec-1-1', requirement: { path: `${folder}/${file}`, anchor: 'acceptance' }, requiredKinds: ['runtime'] }] } },
      { id: 2, file: '02-b.md', depends_on: [], status: 'todo', mode: 'checkpoint', verification: { inputs: [{ path: `${folder}/02-b.md`, kind: 'requirement' }], criteria: [{ id: 'spec-2-1', requirement: { path: `${folder}/02-b.md`, anchor: 'acceptance' }, requiredKinds: ['runtime'] }] } }] });
    put(join(dir, `${folder}/01-a.md`), body(one));
    put(join(dir, `${folder}/02-b.md`), body(two).replace('id: 1', 'id: 2'));
    put(join(dir, `${folder}/.joycraft-spec-queue.json`), queue('01-a.md'));
    put(join(dir, 'tests/a.test.ts'), 'expect(total()).toBe(10);\nexpect(other()).toBe(1);\n');
    git(dir, 'add', '-A'); git(dir, 'commit', '-q', '-m', 'base');
    const main = git(dir, 'rev-parse', 'HEAD');
    const ctx = { dir, folder, body, queue, main, git: (...a) => git(dir, ...a), put: (f, b) => put(join(dir, f), b) };
    const base = (pick ?? (() => main))(ctx);
    mutate(ctx);
    let r;
    try { r = testChanges({ root: dir, queuePath: `${folder}/.joycraft-spec-queue.json`, specId: 1, base }); }
    catch (e) { console.log(`${name}\n  stopped: ${e.message}`); return; }
    console.log(`${name}\n  declared: ${JSON.stringify(r.declared)}\n  undeclared: ${JSON.stringify(r.undeclared)}\n  addedAfterBase: ${JSON.stringify(r.addedAfterBase)}`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
const weaken = c => c.put('tests/a.test.ts', 'expect(total()).toBe(10);\n');
const decl = '- `tests/a.test.ts` class 1: acceptance bullet 1 states the new value (12).';
multi('C1 declaration copied from spec 2 base text into spec 1 after the base', { two: decl,
  mutate: c => { c.put(`${c.folder}/01-a.md`, c.body(decl)); weaken(c); c.git('commit', '-qam', 'impl'); } });
multi('C2 spec 1 renamed after the base (queue updated), bullet added in the renamed file', {
  mutate: c => { c.git('mv', `${c.folder}/01-a.md`, `${c.folder}/01-renamed.md`); c.put(`${c.folder}/01-renamed.md`, c.body(decl)); c.put(`${c.folder}/.joycraft-spec-queue.json`, c.queue('01-renamed.md')); weaken(c); c.git('add', '-A'); c.git('commit', '-qm', 'impl'); } });
multi('C2b honest: spec 1 declares at the base, then renamed (queue updated)', { one: decl,
  mutate: c => { c.git('mv', `${c.folder}/01-a.md`, `${c.folder}/01-renamed.md`); c.put(`${c.folder}/.joycraft-spec-queue.json`, c.queue('01-renamed.md')); c.put('tests/a.test.ts', 'expect(total()).toBe(12);\nexpect(other()).toBe(1);\n'); c.git('add', '-A'); c.git('commit', '-qm', 'impl'); } });
multi('C3 base is not an ancestor: a side commit declares tests/a, HEAD history says none', {
  pick: c => { c.git('checkout', '-q', '-b', 'side'); c.put(`${c.folder}/01-a.md`, c.body(decl)); c.git('commit', '-qam', 'side'); const s = c.git('rev-parse', 'HEAD'); c.git('checkout', '-q', 'main'); return s; },
  mutate: c => { weaken(c); c.git('commit', '-qam', 'impl'); } });
multi('C4 base declaration kept (same path+class) but its requiring text rewritten after the base', { one: decl,
  mutate: c => { c.put(`${c.folder}/01-a.md`, c.body('- `tests/a.test.ts` class 1: acceptance bullet 1.')); weaken(c); c.git('commit', '-qam', 'impl'); } });
multi('C5 base class-1 declaration upgraded to class 3 after the base', { one: decl,
  mutate: c => { c.put(`${c.folder}/01-a.md`, c.body('- `tests/a.test.ts` class 3: ledger row 1, owner yes.')); rmSync(join(c.dir, 'tests/a.test.ts')); c.git('add', '-A'); c.git('commit', '-qm', 'impl'); } });
