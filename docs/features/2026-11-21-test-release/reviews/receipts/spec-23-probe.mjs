// Spec 23 reviewer probe: structural text checks and the every-spec word delta.
// Usage: node spec-23-probe.mjs <project-root>
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2];
const base = '09f5ad5';
const head = 'dcd5476';
const files = {
  implementer: 'payload/.claude/agents/joycraft-implementer.md',
  reviewer: 'payload/.claude/agents/joycraft-reviewer.md',
  dispatch: 'payload/.joycraft/references/dispatch.md',
  setup: 'payload/.joycraft/references/setup.md',
};
const show = (rev, file) => execFileSync('git', ['show', `${rev}:${file}`], { cwd: root, encoding: 'utf8' });
const words = (text) => text.split(/\s+/).filter(Boolean).length;
const flat = (text) => text.replace(/\s+/g, ' ');
let failed = 0;
const check = (label, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failed += 1; };

for (const key of ['implementer', 'reviewer', 'dispatch']) {
  const text = flat(readFileSync(join(root, files[key]), 'utf8'));
  check(`${key}: names heredoc`, text.includes('heredoc'));
  check(`${key}: names \`source\``, text.includes('`source`'));
  check(`${key}: names cd out of the root`, text.includes('`cd` out of'));
  check(`${key}: keeps && ; | $(git …)`, ['`&&`', '`;`', '`|`', '`$(git …)`'].every((f) => text.includes(f)));
  check(`${key}: says paste the startup output's \`commands\``, text.includes("Paste the startup output's `commands`"));
}
const dispatch = flat(readFileSync(join(root, files.dispatch), 'utf8'));
check('dispatch: keeps run pwd / git rev-parse HEAD alone and paste the value', dispatch.includes('run `pwd` or `git rev-parse HEAD` alone and paste the value'));
const setup = flat(readFileSync(join(root, files.setup), 'utf8'));
check('setup: evidence-env.json machine-local, never a tracked file', setup.includes('machine-local `.joycraft/local/evidence-env.json`') && setup.includes('never in a tracked file'));

// The sentence the implementer dropped from both agent files.
for (const key of ['implementer', 'reviewer']) {
  const before = flat(show(base, files[key]));
  const now = flat(readFileSync(join(root, files[key]), 'utf8'));
  console.log(`${key}: base had "Paste literal paths and revisions instead": ${before.includes('Paste literal paths and revisions instead')}; now: ${now.includes('Paste literal paths and revisions instead')}`);
}

// Payload runtime prints literal-path commands for the reviewer and implementer.
const start = readFileSync(join(root, 'payload/.joycraft/runtime/dispatch-start.mjs'), 'utf8');
check('payload dispatch-start returns a commands object', /commands,/.test(start) && start.includes('function workerCommands'));

let total = 0;
for (const [key, file] of Object.entries(files)) {
  const b = words(show(base, file));
  const h = words(show(head, file));
  const w = words(readFileSync(join(root, file), 'utf8'));
  console.log(`words ${key}: base ${b} head ${h} tree ${w} delta ${h - b}`);
  if (key !== 'setup') total += h - b;
}
console.log(`every-spec delta (implementer+reviewer+dispatch): ${total}`);
check('every-spec delta <= 6', total <= 6);
const changed = execFileSync('git', ['diff', '--name-only', base, head], { cwd: root, encoding: 'utf8' }).trim().split('\n');
console.log(`files changed ${base}..${head}: ${changed.join(', ')}`);
check('no existing test file changed', !changed.some((f) => f.startsWith('tests/') && f !== 'tests/text-worker-commands.test.ts'));
process.exit(failed ? 1 : 0);
