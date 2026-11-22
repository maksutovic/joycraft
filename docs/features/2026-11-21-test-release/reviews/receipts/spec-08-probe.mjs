import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const cleanup = join(process.argv[2], 'payload/.joycraft/runtime/cleanup.mjs');
const g = (cwd, ...a) => execFileSync('git', ['-c','user.name=t','-c','user.email=t@e', ...a], { cwd });
function run(files, yaml) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'r8-')));
  g(root, 'init', '-q', '-b', 'main');
  for (const [f, b] of Object.entries(files)) writeFileSync(join(root, f), b);
  if (yaml) writeFileSync(join(root, 'joycraft.yaml'), yaml);
  g(root, 'add', '-A'); g(root, 'commit', '-q', '-m', 'i');
  const r = spawnSync(process.execPath, [cleanup, '--root', root], { encoding: 'utf8' });
  rmSync(root, { recursive: true, force: true });
  return { status: r.status, found: JSON.parse(r.stdout).findings.filter(x => x.check === 'gate-rule').map(x => `${x.path}:${x.line} ${x.command}`) };
}
const Y = 'tests:\n  gate: "pnpm verify"\n  full: "pnpm test:all"\n';
const cases = {
  'spec fixture (rule line + table row)': [{ 'AGENTS.md': '# A\n\nRun `pnpm verify` after every change.\n\n| Check | Command |\n|---|---|\n| Project gate | pnpm verify |\n' }, Y, ['AGENTS.md:3 pnpm verify']],
  'no tests: recorded': [{ 'AGENTS.md': '# A\n\nRun `pnpm verify` after every change.\n' }, null, []],
  'list item': [{ 'AGENTS.md': '# A\n\n- Run `pnpm verify` after every change.\n  * nested: every step must pass `pnpm verify`\n' }, Y, ['AGENTS.md:3 pnpm verify', 'AGENTS.md:4 pnpm verify']],
  'blockquote': [{ 'AGENTS.md': '# A\n\n> Every step must pass `pnpm verify`.\n' }, Y, ['AGENTS.md:3 pnpm verify']],
  'prose, gate then a word (spec-4 whole-command rule: not matched)': [{ 'AGENTS.md': 'Run pnpm verify after every change.\n' }, Y, []],
  'prose, gate then period': [{ 'AGENTS.md': 'Run pnpm verify.\n' }, Y, ['AGENTS.md:1 pnpm verify']],
  'pipe line without leading pipe (not a table) is flagged': [{ 'AGENTS.md': 'Gate | pnpm verify\n' }, Y, ['AGENTS.md:1 pnpm verify']],
  'table indented row': [{ 'AGENTS.md': '# A\n\n  | Gate | `pnpm verify` |\n' }, Y, []],
  'fenced block': [{ 'AGENTS.md': '# A\n\n```sh\npnpm verify\n```\n\n~~~\npnpm test:all\n~~~\n' }, Y, []],
  'CLAUDE.md': [{ 'CLAUDE.md': '# C\n\nAlways run `pnpm test:all` before you stop.\n' }, Y, ['CLAUDE.md:3 pnpm test:all']],
  'both files': [{ 'AGENTS.md': 'x `pnpm verify`\n', 'CLAUDE.md': '@AGENTS.md\n\ny `pnpm verify`\n' }, Y, ['AGENTS.md:1 pnpm verify', 'CLAUDE.md:3 pnpm verify']],
  'longer command w/ filter not gate': [{ 'AGENTS.md': '# A\n\nRun `pnpm verify tests/a.test.ts` for one file.\nRun `pnpm verify --watch`.\nRun `pnpm verifyx`.\n' }, Y, []],
  'gate twice on one line = one finding': [{ 'AGENTS.md': '# A\n\nRun `pnpm verify`, then `pnpm verify` again.\n' }, Y, ['AGENTS.md:3 pnpm verify']],
  'gate equals full: deduped': [{ 'AGENTS.md': 'Run `pnpm verify`.\n' }, 'tests:\n  gate: "pnpm verify"\n  full: "pnpm verify"\n', ['AGENTS.md:1 pnpm verify']],
  'inline code fence ```pnpm verify```': [{ 'AGENTS.md': 'Run ```pnpm verify``` now.\n' }, Y, ['AGENTS.md:1 pnpm verify']],
  'context page not checked': [{ 'AGENTS.md': '# A\n\n[g](docs/g.md)\n' }, Y, []],
  'line after unclosed fence': [{ 'AGENTS.md': '```\npnpm verify\n' }, Y, []],
};
let bad = 0;
for (const [name, [files, yaml, want]] of Object.entries(cases)) {
  const { status, found } = run(files, yaml);
  const ok = JSON.stringify(found) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'DIFF'} ${name} exit=${status} got=${JSON.stringify(found)} want=${JSON.stringify(want)}`);
}
const checks = spawnSync(process.execPath, [cleanup, '--checks'], { encoding: 'utf8' }).stdout.split('\n').filter(l => l.startsWith('gate-rule'));
console.log('--checks:', JSON.stringify(checks));
console.log('mismatches:', bad); if (bad || checks.length !== 1 || !/^gate-rule\treport\t/.test(checks[0])) process.exitCode = 1;
