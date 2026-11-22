// Spec 22 reviewer probe: runs spec 22's test against the payload before it (7908d6f, expect red),
// and the spec's tests at its own commit 08beda2 (expect green, original spec-1-3 600-word assertion intact).
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, symlinkSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const root = process.argv[2];
const git = (...a) => execFileSync('git', a, { cwd: root, maxBuffer: 1 << 28 });
function tree(rev) {
  const dir = mkdtempSync(join(tmpdir(), `jc-r22-${rev}-`));
  const tar = git('archive', rev);
  execFileSync('tar', ['-x', '-C', dir], { input: tar });
  symlinkSync(join(root, 'node_modules'), join(dir, 'node_modules'));
  return dir;
}
const run = (dir, files) => {
  const r = spawnSync(join(dir, 'node_modules/.bin/vitest'), ['run', ...files], { cwd: dir, encoding: 'utf8', env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' } });
  return { status: r.status, out: (r.stdout + r.stderr).split('\n').filter((l) => /✓|×|Tests |words:|AssertionError/.test(l)).join('\n') };
};
const base = tree('7908d6f');
writeFileSync(join(base, 'tests/text-fewer-tests.test.ts'), git('show', '08beda2:tests/text-fewer-tests.test.ts'));
const red = run(base, ['tests/text-fewer-tests.test.ts']);
console.log('== spec 22 test on the payload before spec 22 (7908d6f): exit', red.status, '\n' + red.out);
const own = tree('08beda2');
const green = run(own, ['tests/text-fewer-tests.test.ts', 'tests/payload-guard.test.ts', 'tests/text-spec-tier.test.ts']);
console.log('\n== spec 22 tests at 08beda2: exit', green.status, '\n' + green.out);
console.log('\npayload-guard spec-1-3 at 08beda2:', git('show', '08beda2:tests/payload-guard.test.ts').toString().split('\n').filter((l) => /testing-review\.md', 600|onDemandSpare/.test(l)).join('\n'));
for (const d of [base, own]) rmSync(d, { recursive: true, force: true, maxRetries: 5 });
process.exit(red.status !== 0 && green.status === 0 ? 0 : 1);
