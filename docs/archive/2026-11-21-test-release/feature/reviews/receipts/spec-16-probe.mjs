// Reviewer probe for spec 16: runs cleanup.mjs and entry-check.mjs on fixtures,
// checks every-spec words before/after c4932c7, and prints the update.md step text.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const root = process.argv[2];
const rt = (n) => join(root, 'payload/.joycraft/runtime', n);
function fixture(lines, yaml = 'tests:\n  gate: "pnpm verify"\n') {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'jc16-')));
  const git = (...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@e.com', ...a], { cwd: dir, stdio: 'ignore' });
  git('init', '-q', '-b', 'main');
  writeFileSync(join(dir, 'AGENTS.md'), lines.join('\n') + '\n');
  if (yaml) writeFileSync(join(dir, 'joycraft.yaml'), yaml);
  git('add', '-A'); git('commit', '-q', '-m', 'i');
  return dir;
}
function gateRule(dir, tool) {
  const r = spawnSync(process.execPath, [rt(tool), '--root', dir], { encoding: 'utf8' });
  try { return JSON.parse(r.stdout).findings.filter((f) => f.check === 'gate-rule').map((f) => `${f.line}:${f.command}`); } catch { return `unparsed exit=${r.status} ${r.stdout.slice(0, 200)} ${r.stderr.slice(0, 200)}`; }
}
const cases = {
  briefDoneWhen: ['# App', '', 'Run `pnpm verify` after every change.', '', '| Check | Command |', '|---|---|', '| Project gate | pnpm verify |'],
  tableOnly: ['# App', '', '| Check | Command |', '|---|---|', '| Project gate | pnpm verify |'],
  twoRules: ['# App', '', '- Every step must pass `pnpm verify`.', '- Run `pnpm verify` before committing.'],
};
for (const [name, lines] of Object.entries(cases)) {
  const dir = fixture(lines);
  console.log(name, 'cleanup.mjs:', JSON.stringify(gateRule(dir, 'cleanup.mjs')), 'entry-check.mjs:', JSON.stringify(gateRule(dir, 'entry-check.mjs')));
  rmSync(dir, { recursive: true, force: true });
}
const noYaml = fixture(cases.briefDoneWhen, null);
console.log('noRecordedGate cleanup.mjs:', JSON.stringify(gateRule(noYaml, 'cleanup.mjs')));
rmSync(noYaml, { recursive: true, force: true });
// every-spec word count at parent vs c4932c7, using the guard's own list
const words = (t) => t.split(/\s+/).filter(Boolean).length;
const guard = readFileSync(join(root, 'tests/payload-guard.test.ts'), 'utf8');
const block = guard.slice(guard.indexOf('export const EVERY_SPEC_FILES'), guard.indexOf('export const EVERY_SPEC_CAP'));
const files = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);
const touched = ['.agents/skills/joycraft-cleanup/SKILL.md', '.joycraft/references/update.md', '.joycraft/references/cleanup.md'];
console.log('touched files in every-spec list:', touched.filter((t) => files.some((f) => t.endsWith(f) || f.endsWith(t))));
const changed = execFileSync('git', ['diff', '--name-only', 'c4932c7^', 'c4932c7'], { cwd: root, encoding: 'utf8' }).trim().split('\n');
console.log('files changed by c4932c7:', changed.join(', '));
for (const f of touched) {
  const before = words(execFileSync('git', ['show', `c4932c7^:payload/${f}`], { cwd: root, encoding: 'utf8' }));
  const after = words(execFileSync('git', ['show', `c4932c7:payload/${f}`], { cwd: root, encoding: 'utf8' }));
  console.log(`words ${f}: ${before} -> ${after} (+${after - before})`);
}
const update = readFileSync(join(root, 'payload/.joycraft/references/update.md'), 'utf8');
const s = update.indexOf('3. Run `npx joycraft'); console.log('update.md step 3:\n' + update.slice(s, update.indexOf('\n4. ', s)));
