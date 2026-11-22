// Spec 22 reviewer probe: compares the payload before spec 22 (7908d6f), at its commit (08beda2) and now.
import { execFileSync } from 'node:child_process';
const root = process.argv[2];
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' });
const show = (rev, p) => { try { return git('show', `${rev}:payload/${p}`); } catch { return ''; } };
const words = (t) => t.split(/\s+/).filter(Boolean).length;
const flat = (t) => t.replace(/\s+/g, ' ');
const IMPLEMENT = '.agents/skills/joycraft-implement/SKILL.md';
const IMPLEMENTER = '.claude/agents/joycraft-implementer.md';
const guardAt = (rev) => git('show', `${rev}:tests/payload-guard.test.ts`);
const everySpec = (rev) => {
  const g = guardAt(rev);
  const block = g.slice(g.indexOf('export const EVERY_SPEC_FILES'), g.indexOf('export const EVERY_SPEC_CAP'));
  const files = [...block.matchAll(/^\s+'([^']+)':/gm)].map(([, p]) => p);
  return { n: files.length, total: files.reduce((s, p) => s + words(show(rev, p)), 0) };
};
for (const rev of ['7908d6f', '08beda2', 'HEAD']) {
  console.log(`\n== ${rev}`);
  console.log('implement words', words(show(rev, IMPLEMENT)), 'implementer words', words(show(rev, IMPLEMENTER)), 'every-spec', JSON.stringify(everySpec(rev)));
  const phrases = {
    [IMPLEMENT]: ['one focused test per acceptance', 'several checks', 'existing test file', 'fails before', 'runs once', 'receipt', 'one-off run state', 'spec gap'],
    [IMPLEMENTER]: ['one focused test per acceptance', 'several checks', 'existing test file', 'fails before', 'runs once', 'receipt first', 'one-off run state', 'spec gap'],
    '.joycraft/templates/spec.md': ['real boundary', 'mocked boundary under "Not covered"'],
    '.joycraft/references/testing.md': ["or a special case for a test's input", "a special case for a test's input", 'spec gap: test is wrong'],
    '.joycraft/references/testing-review.md': ['in a file or a list', 'leaves the gate count', 'conflicts with a later owner decision'],
  };
  for (const [p, list] of Object.entries(phrases)) {
    const t = flat(show(rev, p));
    console.log(p, Object.fromEntries(list.map((x) => [x, t.includes(x)])));
  }
}
// Which hosts receive each file (src/payload.ts: .claude/agents/ ships to Claude only).
console.log('\nhost reach: joycraft-implementer.md ships only when hosts include claude; joycraft-implement skill ships to every host');
const src = execFileSync('sed', ['-n', '55,66p', 'src/payload.ts'], { cwd: root, encoding: 'utf8' });
console.log(src);
// Any remaining "one test per" style wording anywhere in shipped text.
try { console.log('one-per wording:', git('grep', '-n', '-i', '-E', 'focused test per|one test per|test per acceptance', '--', 'payload')); } catch { console.log('one-per wording: none'); }
