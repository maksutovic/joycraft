// Spec 18 review probe: walk a test-only speed refactor by the shipped text in a temp Git repo,
// with the shipped payload runtime, `evidence.mjs run --patch` and git-ignored fault patches.
// Usage: node spec-18-walk.mjs <joycraft-root>
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const joycraft = process.argv[2];
const dir = realpathSync(mkdtempSync(join(tmpdir(), 'jc-spec18-walk-')));
const git = (...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd: dir, encoding: 'utf8' }).trim();
const write = (path, text) => { mkdirSync(join(dir, path, '..'), { recursive: true }); writeFileSync(join(dir, path), text); };
const PRODUCT = `export function total(items, discountPct = 0) {
  const pct = Math.min(Math.max(discountPct, 0), 100);
  const gross = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  return Math.round(gross * (100 - pct)) / 100;
}
`;
const head = `import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { total } from '../src/price.mjs';\n`;
const cases = [
  ['sums price times quantity', 'total([{ price: 2, qty: 3 }, { price: 1.5, qty: 2 }]), 9'],
  ['applies a discount', 'total([{ price: 10, qty: 1 }], 25), 7.5'],
  ['clamps a discount above 100 to free', 'total([{ price: 10, qty: 1 }], 150), 0'],
  ['rounds to cents', 'total([{ price: 0.335, qty: 1 }]), 0.34'],
];
const OLD = head + `const slow = () => new Promise((resolve) => setTimeout(resolve, 1500));\n`
  + cases.map(([name, body]) => `test('${name}', async () => { await slow(); assert.equal(${body}); });\n`).join('');
const FAST = head + cases.map(([name, body]) => `test('${name}', () => { assert.equal(${body}); });\n`).join('');
const WEAK = head + `test('total returns a number', () => { assert.equal(typeof total([{ price: 2, qty: 3 }], 150), 'number'); });\n`;

/** Save a fault as a patch under the git-ignored path, from a product edit, then restore the product. */
const fault = (name, from, to) => {
  write('src/price.mjs', PRODUCT.replace(from, to));
  write(`.joycraft/local/faults/${name}.diff`, execFileSync('git', ['diff'], { cwd: dir, encoding: 'utf8' }));
  git('checkout', '--', 'src/price.mjs');
};
const run = (label, patch, receipt, extra = []) => {
  const out = spawnSync(process.execPath, ['.joycraft/runtime/evidence.mjs', 'run', ...extra, '--patch', patch, '--receipt', receipt, '--', process.execPath, '--test', 'test/price.test.mjs'], { cwd: dir, encoding: 'utf8' });
  let facts = null; try { facts = JSON.parse(out.stdout); } catch { /* refused */ }
  const failed = facts ? (readFileSync(join(dir, receipt), 'utf8').match(/^✖ (?!failing tests).*$/m) ?? [''])[0].replace(/ \([\d.]+ms\)$/, '') : '';
  console.log(JSON.stringify({ label, exit: out.status, exitCode: facts?.command.exitCode ?? null, timedOut: facts?.timedOut ?? null,
    revision: facts?.revision.commit.slice(0, 7) ?? null, patch: facts?.patch ? { sha256: facts.patch.sha256.slice(0, 12), restored: facts.patch.restored } : null,
    wallMs: facts?.facts.wallMs ?? null, firstFailing: failed, refused: facts ? undefined : out.stderr.trim().split('\n')[0], clean: git('status', '--porcelain') === '' }));
  return out.status;
};

git('init', '-q', '-b', 'main');
write('.gitignore', '.joycraft/local/\n');
cpSync(join(joycraft, 'payload/.joycraft/runtime'), join(dir, '.joycraft/runtime'), { recursive: true });
write('src/price.mjs', PRODUCT); write('test/price.test.mjs', OLD); write('docs/features/2026-11-21-demo/brief.md', '# demo\n');
git('add', '-A'); git('commit', '-q', '-m', 'base');
const base = git('rev-parse', 'HEAD');
console.log(`base ${base.slice(0, 7)} (runtime copied from ${join(joycraft, 'payload/.joycraft/runtime')})`);

console.log('\n## Implementer step 1: save two faults before the test edit (git-ignored .joycraft/local/faults/)');
fault('f1-no-clamp', 'Math.min(Math.max(discountPct, 0), 100)', 'Math.max(discountPct, 0)');
fault('f2-floor', 'Math.round(gross', 'Math.floor(gross');
console.log(JSON.stringify({ clean: git('status', '--porcelain') === '' }));
console.log('\n## Implementer step 2: the old file on each fault');
for (const f of ['f1-no-clamp', 'f2-floor']) run(`old ${f}`, `.joycraft/local/faults/${f}.diff`, `.joycraft/local/faults/${f}-old.log`);

console.log('\n## Implementer step 3: rewrite faster; "the same way" before a commit is refused');
write('test/price.test.mjs', FAST);
run('new f1 uncommitted', '.joycraft/local/faults/f1-no-clamp.diff', '.joycraft/local/faults/f1-uncommitted.log');
git('add', '-A'); git('commit', '-q', '-m', 'test: drop sleeps');
const fast = git('rev-parse', 'HEAD');
console.log(JSON.stringify({ diffNameOnly: git('diff', '--name-only', base, fast).split('\n') }));
for (const f of ['f1-no-clamp', 'f2-floor']) run(`new ${f}`, `.joycraft/local/faults/${f}.diff`, `.joycraft/local/faults/${f}-new.log`);

console.log('\n## Reviewer: one saved fault and one of its own; receipts in the feature folder');
fault('r1-ignore-qty', 'item.price * item.qty', 'item.price');
run('reviewer saved f2 new (feature-folder receipt)', '.joycraft/local/faults/f2-floor.diff', 'docs/features/2026-11-21-demo/reviews/rev-f2-new.log');
run('reviewer own r1 new (feature-folder receipt)', '.joycraft/local/faults/r1-ignore-qty.diff', 'docs/features/2026-11-21-demo/reviews/rev-r1-new.log');
rmSync(join(dir, 'docs/features/2026-11-21-demo/reviews'), { recursive: true });
console.log('\n## Reviewer again with git-ignored receipts; old file by checking out the base');
fault('r2-negative', 'Math.min(Math.max(discountPct, 0), 100)', 'Math.min(discountPct, 100)');
for (const f of ['f2-floor', 'r1-ignore-qty', 'r2-negative']) run(`reviewer new ${f}`, `.joycraft/local/faults/${f}.diff`, `.joycraft/local/review-${f}-new.log`);
git('checkout', '-q', base);
for (const f of ['r1-ignore-qty', 'r2-negative']) run(`reviewer old ${f}`, `.joycraft/local/faults/${f}.diff`, `.joycraft/local/review-${f}-old.log`);
git('checkout', '-q', 'main');

console.log('\n## Timeout fault: not a fail; tree restored');
fault('t1-hang', '  const pct', '  while (true) {}\n  const pct');
run('new t1-hang', '.joycraft/local/faults/t1-hang.diff', '.joycraft/local/review-t1-new.log', ['--timeout-ms', '3000']);

console.log('\n## Weakening probe: one typeof assertion replaces four; the implementer picks trivial faults');
git('checkout', '-q', '-b', 'weak', base);
fault('w1-throw', '  const pct', '  throw new Error("x");\n  const pct');
fault('w2-undefined', '  return Math.round(gross * (100 - pct)) / 100;', '  return undefined;');
for (const f of ['w1-throw', 'w2-undefined']) run(`old ${f}`, `.joycraft/local/faults/${f}.diff`, `.joycraft/local/weak-${f}-old.log`);
write('test/price.test.mjs', WEAK); git('add', '-A'); git('commit', '-q', '-m', 'test: faster price test');
const weak = git('rev-parse', 'HEAD');
for (const f of ['w1-throw', 'w2-undefined']) run(`weak new ${f}`, `.joycraft/local/faults/${f}.diff`, `.joycraft/local/weak-${f}-new.log`);
console.log('-- reviewer own fault aimed at a removed assertion (f1 clamp):');
run('weak new f1-no-clamp', '.joycraft/local/faults/f1-no-clamp.diff', '.joycraft/local/weak-f1-new.log');
git('checkout', '-q', base); run('base old f1-no-clamp', '.joycraft/local/faults/f1-no-clamp.diff', '.joycraft/local/weak-f1-old.log'); git('checkout', '-q', 'weak');
console.log('-- reviewer own fault that is trivial (returns a string):');
fault('rv-string', '  return Math.round(gross * (100 - pct)) / 100;', '  return "x";');
run('weak new rv-string', '.joycraft/local/faults/rv-string.diff', '.joycraft/local/weak-rv-string-new.log');
console.log('-- "old" runs taken on the new file: they differ from real old runs only in revision');
run('weak "old" f1 at new revision', '.joycraft/local/faults/f1-no-clamp.diff', '.joycraft/local/weak-f1-mislabelled-old.log');
console.log(JSON.stringify({ base: base.slice(0, 7), fast: fast.slice(0, 7), weak: weak.slice(0, 7) }));
rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
