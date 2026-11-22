// Reviewer probe for spec 4: namesCommand false positives/negatives and end-to-end queue-check.
// Run from the project root: node docs/features/2026-11-21-test-release/reviews/receipts/spec-04-probe.mjs
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const runtime = resolve('payload/.joycraft/runtime/queue-check.mjs');
const { namesCommand, acceptanceBullets } = await import(pathToFileURL(runtime).href);

const cases = [
  ['prose, end of sentence', 'The suite passes. Check: run pnpm verify.', 'pnpm verify', true],
  ['prose, more words after', 'Check: run pnpm verify before merging.', 'pnpm verify', false],
  ['code span', 'Check: `pnpm verify` passes.', 'pnpm verify', true],
  ['code span, extra args', 'Check: `pnpm verify --filter a` passes.', 'pnpm verify', false],
  ['double spaces in text', 'Check: `pnpm   verify` passes.', 'pnpm verify', true],
  ['tab in recorded command', 'Check: `pnpm verify`.', 'pnpm\tverify', true],
  ['npm test prefix of focused', 'Check: `npm test -- tests/x` passes.', 'npm test', false],
  ['npm test exact', 'Check: `npm test` passes.', 'npm test', true],
  ['npm test then comma', 'Check: npm test, then lint.', 'npm test', true],
  ['npm test:unit (script name)', 'Check: `npm test:unit`.', 'npm test', false],
  ['run-script prefix', 'Check: `npx npm test`.', 'npm test', true],
  ['env prefix', 'Check: `CI=1 pnpm verify`.', 'pnpm verify', true],
  ['words: the project gate', 'Check: the project gate passes.', 'pnpm verify', false],
  ['compound gate exact', 'Check: `pnpm test && pnpm typecheck`.', 'pnpm test && pnpm typecheck', true],
  ['compound gate in focused bullet', 'Check: `pnpm test tests/x.test.ts`.', 'pnpm test && pnpm typecheck', false],
  ['compound gate extended', 'Check: `pnpm test && pnpm typecheck && pnpm lint`.', 'pnpm test && pnpm typecheck', false],
  ['parenthesised', 'Check: (pnpm verify).', 'pnpm verify', true],
  ['quoted', 'Check: "pnpm verify".', 'pnpm verify', true],
  ['em dash after', 'Check: pnpm verify — then ship.', 'pnpm verify', false],
  ['negated mention', 'Do not run `pnpm verify` here. Check: `pnpm test tests/x.test.ts`.', 'pnpm verify', true],
  ['inside word', 'Check: `xpnpm verify`.', 'pnpm verify', false],
];
let mismatch = 0;
for (const [name, text, command, expected] of cases) {
  const got = namesCommand(text, command);
  if (got !== expected) mismatch++;
  console.log(`${got === expected ? 'ok  ' : 'DIFF'} ${name}: namesCommand(${JSON.stringify(text)}, ${JSON.stringify(command)}) = ${got} (probe expectation ${expected})`);
}

// Code fence inside a bullet: what text does acceptanceBullets hand to namesCommand?
const fenced = '# A\n\n## acceptance\n\n- It works. Check: run\n\n  ```sh\n  pnpm verify\n  ```\n';
const fencedBullet = acceptanceBullets(fenced).bullets[0];
console.log(`fenced bullet text: ${JSON.stringify(fencedBullet.text)} -> namesCommand = ${namesCommand(fencedBullet.text, 'pnpm verify')}`);
const fencedEnd = '# A\n\n## acceptance\n\n- It works. Check: run\n\n  ```sh\n  pnpm verify\n  ```\n\n  Then more prose.\n';
const fencedEndBullet = acceptanceBullets(fencedEnd).bullets[0];
console.log(`fenced bullet + prose text: ${JSON.stringify(fencedEndBullet.text)} -> namesCommand = ${namesCommand(fencedEndBullet.text, 'pnpm verify')}`);

// End to end through the CLI.
const folder = 'docs/features/2026-11-21-f';
const queuePath = `${folder}/specs/.joycraft-spec-queue.json`;
const put = (file, body) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
function run(label, yaml, acceptance) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-r4-')));
  try {
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root });
    if (yaml !== null) put(join(root, 'joycraft.yaml'), yaml);
    put(join(root, folder, 'brief.md'), '# Brief\n\n## Goal\n\nText.\n');
    const spec = `${folder}/specs/01-a.md`;
    put(join(root, spec), `---\nid: 1\nstatus: todo\n---\n# A\n\n## acceptance\n\n${acceptance}\n\n## Implementation and verification scope\n\n- Files: \`src/a.ts\`.\n`);
    put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: 'f', specs: [{ id: 1, file: '01-a.md', depends_on: [], status: 'todo', mode: 'checkpoint',
      verification: { inputs: [{ path: spec, kind: 'requirement' }, { path: 'tests/x.test.ts', kind: 'check' }],
        criteria: [{ id: 'spec-1-1', requirement: { path: spec, anchor: 'acceptance' }, requiredKinds: ['runtime'] }] } }] }));
    const result = spawnSync(process.execPath, [runtime, '--queue', queuePath, '--root', root], { encoding: 'utf8' });
    const gates = result.stderr.split('\n').filter(line => line.includes('gate or full command'));
    console.log(`e2e ${label}: exit ${result.status}, gate gaps ${gates.length}${gates.length ? `\n    ${gates.join('\n    ')}` : ''}`);
    if (result.status !== 0 && gates.length === 0) console.log(`    stderr: ${result.stderr.trim()}`);
  } finally { rmSync(root, { recursive: true, force: true }); }
}
run('npm test gate vs focused npm test -- tests/x', 'tests:\n  gate: "npm test"\n', '- It works. Check: `npm test -- tests/x` passes.');
run('npm test gate named exactly', 'tests:\n  gate: "npm test"\n', '- It works. Check: `npm test` passes.');
run('gate and full both named in one bullet', 'tests:\n  gate: "pnpm verify"\n  full: "pnpm verify:all"\n', '- It works. Check: `pnpm verify` and `pnpm verify:all`.');
run('gate equals full (dedupe)', 'tests:\n  gate: "pnpm verify"\n  full: "pnpm verify"\n', '- It works. Check: `pnpm verify`.');
run('two bullets naming the gate', 'tests:\n  gate: "pnpm verify"\n', '- One. Check: `pnpm verify`.\n- Two. Check: run pnpm verify.');
run('the project gate in words', 'tests:\n  gate: "pnpm verify"\n', '- It works. Check: the project gate passes with `pnpm test tests/x.test.ts`.');
run('fenced block inside bullet', 'tests:\n  gate: "pnpm verify"\n', '- It works. Check: run\n\n  ```sh\n  pnpm verify\n  ```');
run('broken joycraft.yaml', 'tests: [\n', '- It works. Check: `pnpm verify`.');
console.log(`namesCommand probe mismatches vs reviewer expectation: ${mismatch}`);
