#!/bin/sh
# Spec 21 reviewer walk: follow payload/.joycraft/references/testing-review.md as an agent
# on a small temp project whose suite is slow, flaky and over-mocked.
# Usage: sh spec-21-walk.sh <joycraft-checkout>
set -u
JC="$1"
EV="$JC/payload/.joycraft/runtime/evidence.mjs"
P=$(mktemp -d "${TMPDIR:-/tmp}/jc-r21-walk-XXXXXX")
cd "$P" || exit 1
git init -q -b main
mkdir -p test/inner src
printf 'receipts/\n' > .gitignore
cat > package.json <<'EOF'
{ "name": "walk", "private": true, "type": "module", "scripts": { "test": "node run-tests.mjs" } }
EOF
# Runner config: a worker cap keyed on CI (local machines get 2 workers, "CI" gets all cores).
cat > run-tests.mjs <<'EOF'
import { spawnSync } from 'node:child_process';
import { availableParallelism } from 'node:os';
const concurrency = process.env.CI ? availableParallelism() : 2;
console.log(`runner: concurrency=${concurrency} (CI=${process.env.CI ?? ''})`);
const r = spawnSync(process.execPath, ['--test', `--test-concurrency=${concurrency}`, '--import', './test/setup.mjs', '--test-reporter=spec', ...process.argv.slice(2).length ? process.argv.slice(2) : ['test/*.test.mjs']], { stdio: 'inherit' });
process.exit(r.status ?? 1);
EOF
# Global setup every run pays: production-strength crypto.
cat > test/setup.mjs <<'EOF'
import { pbkdf2Sync } from 'node:crypto';
globalThis.key = pbkdf2Sync('pw', 'salt', 300000, 32, 'sha512');
EOF
cat > src/price.mjs <<'EOF'
export const total = (qty, unit, discount = 0) => Math.round(qty * unit * (1 - discount) * 100) / 100;
export async function fetchRate(client) { return (await client.get('/rate')).value; }
EOF
cat > test/sleep.test.mjs <<'EOF'
import test from 'node:test'; import assert from 'node:assert/strict';
import { total } from '../src/price.mjs';
test('total after the cache warms', async () => {
  await new Promise((r) => setTimeout(r, 1500)); // fixed sleep
  assert.equal(total(2, 5), 10);
});
EOF
cat > test/self.test.mjs <<'EOF'
import test from 'node:test'; import assert from 'node:assert/strict';
import { total, fetchRate } from '../src/price.mjs';
test('discount total', () => { const v = total(3, 10, 0.1); assert.equal(v, v); }); // compares a value with itself
test('rate comes back', async () => {
  const client = { get: async () => ({ value: 1.25 }) }; // the mock supplies the asserted behavior
  assert.equal(await fetchRate(client), 1.25);
});
EOF
cat > test/flaky.test.mjs <<'EOF'
import test from 'node:test'; import assert from 'node:assert/strict';
test('finishes within budget', async () => {
  const t0 = Date.now(); await new Promise((r) => setTimeout(r, 30));
  assert.ok(Date.now() - t0 < 35, 'too slow'); // wall-clock assertion: flaky under load
});
EOF
cat > test/inner/a.test.mjs <<'EOF'
import test from 'node:test'; import assert from 'node:assert/strict';
test('inner', () => assert.equal(1 + 1, 2));
EOF
cat > test/nested.test.mjs <<'EOF'
import test from 'node:test'; import assert from 'node:assert/strict'; import { spawnSync } from 'node:child_process';
test('runner config works', () => {
  const r = spawnSync(process.execPath, ['--test', 'test/inner/'], { encoding: 'utf8' }); // nested test runner, default workers
  assert.equal(r.status, 0);
});
EOF
git add -A
git -c user.name=t -c user.email=t@example.com commit -q -m 'slow flaky over-mocked suite'
BASE=$(git rev-parse HEAD)
echo "project=$P base=$BASE"

echo "== Measure first: full suite once, with the runner's duration output, through evidence.mjs"
node "$EV" run --receipt receipts/full.log -- npm test
echo "measure exit=$?"
echo "-- receipt: runner line, per-file durations, footer"
grep -E 'runner:|^✔|^✖|duration_ms|# (pass|fail|duration)' receipts/full.log | sed 's/\x1b\[[0-9;]*m//g'
tail -1 receipts/full.log

echo "== Find: what every run pays (global setup) -- a focused run of one fast file"
node "$EV" run --receipt receipts/focused-inner.log -- npm test -- test/inner/a.test.mjs
echo "focused exit=$?"
node "$EV" run --receipt receipts/focused-nosetup.log -- node --test test/inner/a.test.mjs
echo "focused-without-setup exit=$?"

echo "== Find: scans the text's bullets point at"
echo "-- real waits"; grep -rn 'setTimeout\|sleep' test | grep -v node_modules
echo "-- controls keyed on CI"; grep -rn 'process.env.CI' --include=*.mjs . | grep -v receipts
echo "-- nested runners"; grep -rn "'--test'" test
echo "-- no real oracle"; grep -rnE 'assert\.equal\((\w+), \1\)|get: async' test
echo "-- flaky (second full run at the same tree)"
node "$EV" run --receipt receipts/full-2.log -- npm test
echo "second run exit=$?"; tail -1 receipts/full-2.log

echo "== Review edits no test: tree vs base"
git status --porcelain --untracked-files=all
git diff --quiet "$BASE" && echo "tests untouched (git diff --quiet exit 0)"
rm -rf "$P"
