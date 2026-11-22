// Round-2 reviewer probe for test-release spec 1 (split word cap).
// Usage: node spec-01-r2-probe.mjs <base-rev> <packet.json>
// 1. Recompute the base split with the 12-file every-spec list (worktrees.md added) and the caps.
// 2. Compare with the constants and comment in tests/payload-guard.test.ts.
// 3. Packet readFirst payload text not in the list (f1).
// 4. setup.md allowlist entry gone and setup.md has no guarded term (f5).
// 5. Fixture size rule against simulated spares (f4).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const [base, packetPath] = process.argv.slice(2);
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 26 });
const words = (text) => text.split(/\s+/).filter(Boolean).length;
const isPayloadText = (path) => /^\.agents\/skills\/joycraft-[^/]+\/SKILL\.md$/.test(path)
  || /^\.claude\/agents\/[^/]+\.md$/.test(path)
  || /^\.joycraft\/references\/.+\.md$/.test(path);

const test = readFileSync('tests/payload-guard.test.ts', 'utf8');
const listBlock = test.slice(test.indexOf('export const EVERY_SPEC_FILES'), test.indexOf('export const EVERY_SPEC_CAP'));
const listed = [...listBlock.matchAll(/^\s*'([^']+)':/gm)].map((m) => m[1]);
console.log('EVERY_SPEC_FILES in test:', listed.length, JSON.stringify(listed));

function counts(rev) {
  const files = git('ls-tree', '-r', '--name-only', rev, 'payload/').split('\n')
    .filter(Boolean).map((p) => p.slice('payload/'.length)).filter(isPayloadText);
  let es = 0; let od = 0;
  for (const f of files) {
    const n = words(git('show', `${rev}:payload/${f}`));
    if (listed.includes(f)) es += n; else od += n;
  }
  return { es, od, total: es + od };
}

console.log('\n== 1/2. counts');
const before = counts(base);
const now = counts('HEAD');
const everyCap = 29919 - before.od;
const onDemandCap = before.od + 2000;
console.log(`base ${base.slice(0, 7)}: every-spec ${before.es} on-demand ${before.od} total ${before.total}`);
console.log(`caps: every-spec ${everyCap} on-demand ${onDemandCap}`);
console.log(`HEAD: every-spec ${now.es} (spare ${everyCap - now.es}) on-demand ${now.od} (spare ${onDemandCap - now.od}) total ${now.total}`);
const capLines = test.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /EVERY_SPEC_CAP =|ON_DEMAND_CAP =|toBeLessThan\(|12,201|17,663|12,256|19,663|12,150|17,569/.test(l));
for (const [n, l] of capLines) console.log(`payload-guard.test.ts:${n}: ${l.trim()}`);

console.log('\n== 3. packet readFirst');
const packet = JSON.parse(readFileSync(packetPath, 'utf8'));
const unlisted = packet.readFirst
  .map((p) => p.replace(/^\.claude\/skills\//, '.agents/skills/'))
  .filter((p) => isPayloadText(p) && !listed.includes(p));
console.log('readFirst:', JSON.stringify(packet.readFirst));
console.log('payload text in readFirst but not in EVERY_SPEC_FILES:', JSON.stringify(unlisted));

console.log('\n== 4. allowlist');
const allowBlock = test.slice(test.indexOf('const allowlist'), test.indexOf('function unshippedText'));
console.log('allowlist entries naming setup.md:', (allowBlock.match(/references\/setup\.md/g) ?? []).length);
const setup = readFileSync('payload/.joycraft/references/setup.md', 'utf8');
const terms = [/\bjev\b/i, /hooks-config\.json/i, /hook receipt/i, /classifier/i, /routing advice/i, /hooksourceview/i, /hooks-disabled/i, /WorktreeCreate/];
console.log('setup.md lines matching guarded terms or WorktreeCreate:', setup.split('\n').filter((l) => terms.some((t) => t.test(l))).length);

console.log('\n== 5. fixture size Math.max(200, spare + 1) vs spare');
for (const spare of [0, 106, 199, 200, 500, 2000]) {
  const added = Math.max(200, spare + 1);
  console.log(`spare ${spare}: adds ${added}, over by ${added - spare} -> ${added > spare ? 'fails cap (as required)' : 'passes (wrong)'}`);
}
