#!/bin/sh
# Reviewer check for spec 9 criteria 1, 2 and 4 in one temp repo: dirty refusal, stale patch refusal,
# fault exit 1 with restored true and no index change, and a timeout footer with patch and exitCode null.
# Usage: sh spec-09-footer.sh <project-root>
set -u
E="$1/payload/.joycraft/runtime/evidence.mjs"
R=$(mktemp -d "${TMPDIR:-/tmp}/jc-r9-footer-XXXX")
cd "$R" || exit 3
git init -q && printf 'receipts/\n' > .gitignore && printf 'export const add = (a, b) => a + b;\n' > add.mjs
printf "import { add } from './add.mjs';\nif (add(2, 2) !== 4) { console.log('add is wrong'); process.exit(1); }\n" > check.mjs
git add -A && git -c user.name=t -c user.email=t@e commit -qm i && mkdir receipts
sed 's/a + b/a - b/' add.mjs > add.tmp && mv add.tmp add.mjs && git diff > receipts/fault.diff && git checkout -q -- add.mjs
sed 's/a + b/a * b/g' receipts/fault.diff > receipts/stale.diff
echo "index before: $(git ls-files -s | shasum -a 256 | cut -c1-16)"
echo dirty >> check.mjs; node "$E" run --receipt receipts/d.log --patch receipts/fault.diff -- node check.mjs >/dev/null 2>&1; echo "dirty: exit=$? add.mjs=$(grep -c 'a + b' add.mjs)"; git checkout -q -- check.mjs
node "$E" run --receipt receipts/s.log --patch receipts/stale.diff -- node check.mjs >/dev/null 2>&1; echo "stale patch: exit=$? status='$(git status --porcelain)' receiptExists=$(test -e receipts/s.log && echo yes || echo no)"
node "$E" run --receipt receipts/f.log --patch receipts/fault.diff -- node check.mjs > receipts/f.json 2>&1; echo "fault: exit=$? $(node -e 'const o=require(process.argv[1]);console.log(JSON.stringify({exitCode:o.command.exitCode,patch:o.patch}))' "$R/receipts/f.json") status='$(git status --porcelain)'"
node "$E" run --receipt receipts/t.log --timeout-ms 500 --patch receipts/fault.diff -- node -e 'setTimeout(()=>{},60000)' >/dev/null 2>&1; echo "timeout: exit=$? status='$(git status --porcelain)'"
echo "timeout footer: $(tail -1 receipts/t.log)"
echo "index after: $(git ls-files -s | shasum -a 256 | cut -c1-16)"
cd / && rm -rf "$R"
