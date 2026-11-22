// Spec 22 round-2 reviewer probe: before spec 22 (7908d6f), spec commit (08beda2), round-1 subject (955fdb0), fix (5beb84d), now (HEAD).
import { execFileSync } from 'node:child_process';
const root = process.argv[2];
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' });
const show = (rev, p) => { try { return git('show', `${rev}:payload/${p}`); } catch { return ''; } };
const words = (t) => t.split(/\s+/).filter(Boolean).length;
const flat = (t) => t.replace(/\s+/g, ' ');
const IMPLEMENT = '.agents/skills/joycraft-implement/SKILL.md';
const IMPLEMENTER = '.claude/agents/joycraft-implementer.md';
const everySpec = (rev) => {
  const g = git('show', `${rev}:tests/payload-guard.test.ts`);
  const block = g.slice(g.indexOf('export const EVERY_SPEC_FILES'), g.indexOf('export const EVERY_SPEC_CAP'));
  const files = [...block.matchAll(/^\s+'([^']+)':/gm)].map(([, p]) => p);
  return { n: files.length, total: files.reduce((s, p) => s + words(show(rev, p)), 0) };
};
for (const rev of ['7908d6f', '08beda2', '955fdb0', '26b6b5f', '5beb84d', 'HEAD']) {
  console.log(`== ${rev} implement ${words(show(rev, IMPLEMENT))} implementer ${words(show(rev, IMPLEMENTER))} every-spec ${JSON.stringify(everySpec(rev))}`);
}
// Rules the fix must carry in the skill (every host).
const skill = flat(show('HEAD', IMPLEMENT));
for (const x of ['runs once and fails before the code exists; its receipt comes first', 'Add a test only when it can fail for a reason no existing test can',
  'one test may carry several `[AC:]` tags', 'extend the existing test file first', 'Do not commit tests of one-off run state', 'one focused test per acceptance']) {
  console.log('skill has', JSON.stringify(x), skill.includes(x));
}
// Rules the every-spec cuts touched: old wording at 26b6b5f vs HEAD, and where else the payload states them.
const pre = flat(show('26b6b5f', IMPLEMENT));
for (const x of ['before edits, stateful runtime work, or packet preparation', 'Its first action is the documented project bootstrap',
  'Do not ask merely because a review failed', 'Ask only when', 'instead of only announcing passes', 'Give concise stage updates during long work',
  'The session-end summary lists every held spec again', 'Session end lists every held', 'relevant existing decision/context paths',
  'first fix straightforward failures', 'it does not show that the test is right']) {
  console.log('cut-check', JSON.stringify(x), 'at 26b6b5f', pre.includes(x), 'HEAD', skill.includes(x));
}
const grep = (pat) => { try { return git('grep', '-n', '-i', '-F', pat, 'HEAD', '--', 'payload').trim(); } catch { return '(none)'; } };
for (const pat of ['before edits', 'bootstrap', 'merely because a review failed', 'announcing passes', 'stage update', 'lists every held spec']) {
  console.log(`grep ${JSON.stringify(pat)}:\n${grep(pat)}`);
}
console.log('git diff 26b6b5f 5beb84d --word-diff payload text:');
console.log(git('diff', '--word-diff', '26b6b5f', '5beb84d', '--', 'payload/.agents/skills/joycraft-implement/SKILL.md', 'payload/.joycraft/references/testing.md'));
console.log('test diffs 955fdb0..HEAD:');
console.log(git('diff', '955fdb0', 'HEAD', '--', 'tests/text-fewer-tests.test.ts', 'tests/payload-guard.test.ts', 'tests/text-fault-proof.test.ts', 'tests/text-lane-cap.test.ts'));
