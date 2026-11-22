// Spec 18 review round 2 probe: the weakening attack (four assertions cut to one typeof check)
// walked by the new testing-review.md `## Test-only specs` text, with the shipped payload runtime,
// in a temp Git repo. Tries pruned and swapped fault sets against the implementer and reviewer steps.
// Usage: node spec-18-r2-attack.mjs <joycraft-root>
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const joycraft = process.argv[2];
const dir = realpathSync(mkdtempSync(join(tmpdir(), 'jc-spec18-r2-')));
const git = (...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd: dir, encoding: 'utf8' }).trim();
const write = (path, text) => { mkdirSync(join(dir, path, '..'), { recursive: true }); writeFileSync(join(dir, path), text); };
const sha = (path) => createHash('sha256').update(readFileSync(join(dir, path))).digest('hex');
const PRODUCT = `export function total(items, discountPct = 0) {
  const pct = Math.min(Math.max(discountPct, 0), 100);
  const gross = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  return Math.round(gross * (100 - pct)) / 100;
}
`;
const head = `import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { total } from '../src/price.mjs';\n`;
const cases = [
  ['sums price times quantity', 'assert.equal(total([{ price: 2, qty: 3 }, { price: 1.5, qty: 2 }]), 9)'],
  ['applies a discount', 'assert.equal(total([{ price: 10, qty: 1 }], 25), 7.5)'],
  ['clamps a discount above 100 to free', 'assert.equal(total([{ price: 10, qty: 1 }], 150), 0)'],
  ['rounds to cents', 'assert.equal(total([{ price: 0.335, qty: 1 }]), 0.34)'],
];
const file = (list) => head + list.map(([name, body]) => `test('${name}', () => { ${body}; });\n`).join('');
const OLD = file(cases);
const WEAK = head + `test('total returns a number', () => { assert.equal(typeof total([{ price: 2, qty: 3 }], 150), 'number'); });\n`;
// A changed (not deleted) assertion: rounding checked to 0.05 instead of exactly.
const LOOSE = file([...cases.slice(0, 3), ['rounds to cents', 'assert.ok(Math.abs(total([{ price: 0.335, qty: 1 }]) - 0.34) < 0.05)']]);

/** Save a fault patch under the git-ignored path from a product edit, then restore the product. */
const fault = (name, from, to) => {
  write('src/price.mjs', PRODUCT.replace(from, to));
  write(`.joycraft/local/faults/${name}.diff`, execFileSync('git', ['diff'], { cwd: dir, encoding: 'utf8' }));
  git('checkout', '--', 'src/price.mjs');
  return `.joycraft/local/faults/${name}.diff`;
};
/** Fault per removed assertion, in the order of `cases`. */
const perAssertion = () => [
  fault('a-qty', 'item.price * item.qty', 'item.price'),
  fault('a-discount', '(100 - pct)', '100'),
  fault('a-clamp', 'Math.min(Math.max(discountPct, 0), 100)', 'Math.max(discountPct, 0)'),
  fault('a-round', 'Math.round(gross', 'Math.floor(gross'),
];
const trivial = () => [
  fault('w-throw', '  const pct', '  throw new Error("x");\n  const pct'),
  fault('w-undefined', '  return Math.round(gross * (100 - pct)) / 100;', '  return undefined;'),
];
let n = 0;
/** One `evidence.mjs run --patch` on the focused test; returns the footer facts read back from the receipt. */
const run = (label, patch) => {
  const receipt = `.joycraft/local/receipts/${String(++n).padStart(2, '0')}-${label.replace(/[^a-z0-9]+/gi, '-')}.log`;
  const out = spawnSync(process.execPath, ['.joycraft/runtime/evidence.mjs', 'run', '--patch', patch, '--receipt', receipt, '--', process.execPath, '--test', 'test/price.test.mjs'], { cwd: dir, encoding: 'utf8' });
  if (out.status === 2) { console.log(JSON.stringify({ label, refused: out.stderr.trim().split('\n')[0] })); return null; }
  const last = readFileSync(join(dir, receipt), 'utf8').trim().split('\n').pop();
  const footer = JSON.parse(last.slice(last.indexOf('{')));
  const row = { label, exit: out.status, testExit: footer.exitCode, failed: footer.exitCode !== 0 && !footer.timedOut,
    receiptRevision: footer.revision.slice(0, 7), receiptPatchSha: footer.patch.sha256.slice(0, 12), restored: footer.patch.restored, clean: git('status', '--porcelain') === '' };
  console.log(JSON.stringify(row));
  return { ...row, revision: footer.revision, patchSha: footer.patch.sha256 };
};
/** Commit the fault list (path + sha256) before the test edit, as step 2 says. */
const pin = (patches) => {
  write('docs/faults.sha256', patches.map((p) => `${sha(p)}  ${p}`).join('\n') + '\n');
  git('add', 'docs/faults.sha256'); git('commit', '-q', '-m', 'test: pin fault patches');
  return new Map(patches.map((p) => [p, sha(p)]));
};
const verdict = (oldRuns, newRuns) => {
  const block = oldRuns.filter((o, i) => o.failed && !newRuns[i].failed).map((o) => o.label);
  console.log(JSON.stringify({ survivorsCaughtByOldMissedByNew: block, implementerProofPasses: oldRuns.every((o) => o.failed) && newRuns.every((r) => r.failed) }));
};

git('init', '-q', '-b', 'main');
write('.gitignore', '.joycraft/local/\n');
cpSync(join(joycraft, 'payload/.joycraft/runtime'), join(dir, '.joycraft/runtime'), { recursive: true });
write('src/price.mjs', PRODUCT); write('test/price.test.mjs', OLD);
git('add', '-A'); git('commit', '-q', '-m', 'base');
const base = git('rev-parse', 'HEAD');
console.log(`base ${base.slice(0, 7)}`);

console.log('\n## A. Honest agent, weakening rewrite: one fault per removed assertion (step 1), pinned (step 2)');
git('checkout', '-q', '-b', 'a', base);
const A = perAssertion(); pin(A);
const aBase = git('rev-parse', 'HEAD');
const aOld = A.map((p) => run(`A old ${p.split('/').pop()}`, p));
write('test/price.test.mjs', WEAK); git('add', '-A'); git('commit', '-q', '-m', 'test: faster price test');
const aNew = A.map((p) => run(`A new ${p.split('/').pop()}`, p));
verdict(aOld, aNew);
console.log(JSON.stringify({ diffNameOnly: git('diff', '--name-only', aBase, 'HEAD').split('\n') }));

console.log('\n## B. Pruned set: two trivial faults (breaks step 1), pinned; implementer proof only');
git('checkout', '-q', '-b', 'b', base);
const B = trivial(); pin(B);
const bBase = git('rev-parse', 'HEAD');
const bOld = B.map((p) => run(`B old ${p.split('/').pop()}`, p));
write('test/price.test.mjs', WEAK); git('add', '-A'); git('commit', '-q', '-m', 'test: faster price test');
const bNew = B.map((p) => run(`B new ${p.split('/').pop()}`, p));
verdict(bOld, bNew);
console.log(JSON.stringify({ pinnedFaults: B.length, assertionsRemovedByDiff: git('diff', bBase, 'HEAD', '--', 'test/price.test.mjs').split('\n').filter((l) => /^-.*assert\./.test(l)).length }));
console.log('-- reviewer: rerun one saved fault, then its own aimed at a removed assertion (clamp), old file at the base');
run('B reviewer saved w-throw new', B[0]);
const rv = fault('rv-clamp', 'Math.min(Math.max(discountPct, 0), 100)', 'Math.max(discountPct, 0)');
const rvNew = run('B reviewer own rv-clamp new', rv);
git('checkout', '-q', bBase); const rvOld = run('B reviewer own rv-clamp old (base)', rv); git('checkout', '-q', 'b');
console.log(JSON.stringify({ reviewerBlocks: rvOld.failed && !rvNew.failed }));

console.log('\n## C. Swap after the old run: patch file replaced by a trivial one for the new runs');
git('checkout', '-q', '-b', 'c', base);
const C = perAssertion(); const cPinned = pin(C);
const cBase = git('rev-parse', 'HEAD');
const cOld = C.map((p) => run(`C old ${p.split('/').pop()}`, p));
write('test/price.test.mjs', WEAK); git('add', '-A'); git('commit', '-q', '-m', 'test: faster price test');
const throwDiff = readFileSync(join(dir, trivial()[0]), 'utf8');
for (const p of C) writeFileSync(join(dir, p), throwDiff);
const cNew = C.map((p) => run(`C new ${p.split('/').pop()} (swapped)`, p));
verdict(cOld, cNew);
console.log(JSON.stringify({ reviewerShaCheck: C.map((p, i) => ({ fault: p.split('/').pop(), oldRevIsBase: cOld[i].revision === cBase, oldShaEqualsNewSha: cOld[i].patchSha === cNew[i].patchSha, newShaEqualsPinned: cNew[i].patchSha === cPinned.get(p) })) }));

console.log('\n## D. "Old" runs taken on the new file (no base checkout), honest patches');
git('checkout', '-q', '-b', 'd', base);
const D = perAssertion(); pin(D);
const dBase = git('rev-parse', 'HEAD');
write('test/price.test.mjs', WEAK); git('add', '-A'); git('commit', '-q', '-m', 'test: faster price test');
const dOld = D.map((p) => run(`D "old" ${p.split('/').pop()} at new rev`, p));
console.log(JSON.stringify({ wouldBeDroppedAsNotAFault: dOld.filter((o) => !o.failed).length, reviewerRevisionCheck: dOld.map((o) => o.revision === dBase) }));

console.log('\n## E. Consistent swap: trivial patches rerun old (base) and new; pinned list still holds the honest shas');
git('checkout', '-q', '-b', 'e', base);
const E = perAssertion(); const ePinned = pin(E);
const eBase = git('rev-parse', 'HEAD');
for (const p of E) writeFileSync(join(dir, p), throwDiff);
const eOld = E.map((p) => run(`E old ${p.split('/').pop()} (swapped)`, p));
write('test/price.test.mjs', WEAK); git('add', '-A'); git('commit', '-q', '-m', 'test: faster price test');
const eNew = E.map((p) => run(`E new ${p.split('/').pop()} (swapped)`, p));
verdict(eOld, eNew);
console.log(JSON.stringify({ reviewerShaCheck: E.map((p, i) => ({ oldRevIsBase: eOld[i].revision === eBase, oldShaEqualsNewSha: eOld[i].patchSha === eNew[i].patchSha, shaEqualsPinnedList: eNew[i].patchSha === ePinned.get(p) })) }));
const eRv = fault('rv-e-round', 'Math.round(gross', 'Math.floor(gross');
const eRvNew = run('E reviewer own rv-round new', eRv);
git('checkout', '-q', eBase); const eRvOld = run('E reviewer own rv-round old (base)', eRv); git('checkout', '-q', 'e');
console.log(JSON.stringify({ reviewerBlocks: eRvOld.failed && !eRvNew.failed }));

console.log('\n## F. Changed (not deleted) assertion: rounding loosened to 0.05; pruned set omits the rounding fault');
git('checkout', '-q', '-b', 'f', base);
const F = perAssertion().slice(0, 3); pin(F);
const fBase = git('rev-parse', 'HEAD');
const fOld = F.map((p) => run(`F old ${p.split('/').pop()}`, p));
write('test/price.test.mjs', LOOSE); git('add', '-A'); git('commit', '-q', '-m', 'test: tolerant rounding');
const fNew = F.map((p) => run(`F new ${p.split('/').pop()}`, p));
verdict(fOld, fNew);
console.log(JSON.stringify({ diffRemovedAssertLines: git('diff', fBase, 'HEAD', '--', 'test/price.test.mjs').split('\n').filter((l) => /^-.*assert\./.test(l)) }));
const fRv = fault('rv-f-round', 'Math.round(gross', 'Math.floor(gross');
const fRvNew = run('F reviewer own rv-round new', fRv);
git('checkout', '-q', fBase); const fRvOld = run('F reviewer own rv-round old (base)', fRv); git('checkout', '-q', 'f');
console.log(JSON.stringify({ reviewerBlocks: fRvOld.failed && !fRvNew.failed }));

console.log('\n## G. Two assertions removed, one re-covered; consistent swap of the other fault; reviewer aims at the re-covered one');
const RECOVER = file([...cases.slice(0, 2), ['clamps a discount above 100 to free', 'assert.equal(total([{ price: 4, qty: 1 }], 200), 0)']]);
git('checkout', '-q', '-b', 'g', base);
const G = perAssertion().slice(2); const gPinned = pin(G);
const gBase = git('rev-parse', 'HEAD');
writeFileSync(join(dir, G[1]), throwDiff);
const gOld = G.map((p) => run(`G old ${p.split('/').pop()}`, p));
write('test/price.test.mjs', RECOVER); git('add', '-A'); git('commit', '-q', '-m', 'test: shorter price test');
const gNew = G.map((p) => run(`G new ${p.split('/').pop()}`, p));
verdict(gOld, gNew);
console.log(JSON.stringify({ diffRemovedAssertLines: git('diff', gBase, 'HEAD', '--', 'test/price.test.mjs').split('\n').filter((l) => /^-.*assert\./.test(l)).length,
  reviewerShaCheck: G.map((p, i) => ({ fault: p.split('/').pop(), oldRevIsBase: gOld[i].revision === gBase, oldShaEqualsNewSha: gOld[i].patchSha === gNew[i].patchSha, shaEqualsPinnedList: gNew[i].patchSha === gPinned.get(p) })) }));
const gRv = fault('rv-g-clamp', 'Math.min(Math.max(discountPct, 0), 100)', 'Math.max(discountPct, 0)');
const gRvNew = run('G reviewer own rv-clamp new', gRv);
git('checkout', '-q', gBase); const gRvOld = run('G reviewer own rv-clamp old (base)', gRv); git('checkout', '-q', 'g');
console.log(JSON.stringify({ reviewerBlocks: gRvOld.failed && !gRvNew.failed, roundingStillCaught: false }));
const gTruth = fault('truth-g-round', 'Math.round(gross', 'Math.floor(gross');
const gTruthNew = run('G check: honest rounding fault new', gTruth);
console.log(JSON.stringify({ honestRoundingFaultSurvivesNew: !gTruthNew.failed }));

rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
