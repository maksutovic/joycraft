// Reviewer probe for test-release spec 1 (split word cap).
// Usage: node spec-01-probe.mjs <base-rev> <packet.json>
// 1. Which payload references every dispatch packet tells a worker to read first.
// 2. Word counts per group at the base revision and now, for the shipped
//    EVERY_SPEC_FILES list and for that list plus worktrees.md.
// 3. The spec-1-4 text checks.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const [base, packetPath] = process.argv.slice(2);
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 26 });
const words = (text) => text.split(/\s+/).filter(Boolean).length;
const isPayloadText = (path) => /^\.agents\/skills\/joycraft-[^/]+\/SKILL\.md$/.test(path)
  || /^\.claude\/agents\/[^/]+\.md$/.test(path)
  || /^\.joycraft\/references\/.+\.md$/.test(path);

const listed = [
  '.agents/skills/joycraft-implement/SKILL.md', '.agents/skills/joycraft-verify/SKILL.md',
  '.agents/skills/joycraft-decompose/SKILL.md', '.agents/skills/joycraft-testing/SKILL.md',
  '.claude/agents/joycraft-implementer.md', '.claude/agents/joycraft-reviewer.md',
  '.joycraft/references/testing.md', '.joycraft/references/workflow.md',
  '.joycraft/references/dispatch.md', '.joycraft/references/completion.md',
  '.joycraft/references/gates.md',
];

console.log('== 1. dispatch-preflight.mjs role reference paths (every packet, both roles)');
const preflight = readFileSync('payload/.joycraft/runtime/dispatch-preflight.mjs', 'utf8').split('\n');
preflight.forEach((line, i) => {
  if (/referencePaths:|readFirst:|nativePrompt:/.test(line)) console.log(`dispatch-preflight.mjs:${i + 1}: ${line.trim().slice(0, 260)}`);
});
const packet = JSON.parse(readFileSync(packetPath, 'utf8'));
console.log('this reviewer packet readFirst:', JSON.stringify(packet.readFirst));
console.log('this reviewer packet nativePrompt:', packet.nativePrompt);
const unlistedReadFirst = packet.readFirst.filter((p) => isPayloadText(p) && !listed.includes(p.replace(/^\.claude\/skills\//, '.agents/skills/')));
console.log('payload text in readFirst but not in EVERY_SPEC_FILES:', JSON.stringify(unlistedReadFirst));

function counts(rev, every) {
  const files = git('ls-tree', '-r', '--name-only', rev, 'payload/').split('\n')
    .filter(Boolean).map((p) => p.slice('payload/'.length)).filter(isPayloadText);
  let es = 0; let od = 0;
  for (const f of files) {
    const n = words(git('show', `${rev}:payload/${f}`));
    if (every.includes(f)) es += n; else od += n;
  }
  return { es, od, total: es + od };
}

console.log('\n== 2. counts');
for (const [label, every] of [['shipped list', listed], ['shipped list + worktrees.md', [...listed, '.joycraft/references/worktrees.md']]]) {
  const before = counts(base, every);
  const now = counts('HEAD', every);
  const everyCap = 29919 - before.od;
  const onDemandCap = before.od + 2000;
  console.log(`${label}: base ${base.slice(0, 7)} every-spec ${before.es} on-demand ${before.od} total ${before.total}`);
  console.log(`${label}: HEAD every-spec ${now.es} (cap ${everyCap}, spare ${everyCap - now.es}) on-demand ${now.od} (cap ${onDemandCap}, spare ${onDemandCap - now.od}) total ${now.total}`);
}

console.log('\n== 3. spec-1-4 text');
const setup = readFileSync('payload/.joycraft/references/setup.md', 'utf8');
const worktrees = readFileSync('payload/.joycraft/references/worktrees.md', 'utf8');
console.log('setup.md WorktreeCreate lines:', setup.split('\n').filter((l) => /WorktreeCreate/.test(l)).length);
console.log('setup.md keeps resource-lease paragraph:', /resource-lease convention/.test(setup));
console.log('worktrees.md keeps WorktreeCreate paragraph:', /A `WorktreeCreate` hook replaces creation/.test(worktrees));
const cut = 'Do not commit tests of one-off run state';
let hits = '';
try { hits = git('grep', '-n', '-F', cut, 'HEAD', '--', 'payload/').trim(); } catch (error) { if (error.status !== 1) throw error; }
console.log(`payload lines still holding "${cut}":`, hits === '' ? 'none' : hits);
