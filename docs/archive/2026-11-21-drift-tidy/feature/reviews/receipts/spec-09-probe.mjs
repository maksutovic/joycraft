// Reviewer probes for drift-tidy spec 9 (age-out). Builds temp git fixtures and drives the CLI.
// Each line prints OBSERVED (what age-out did) so the log is a plain record, plus PASS/FAIL against the reviewer's expectation.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const cleanup = process.argv[2];
const git = (cwd, args, env = {}) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', env: { ...process.env, ...env } }).trim();
const put = (root, file, body = '# x\n') => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), body); };
const daysAgo = days => { const at = new Date(Date.now() - days * 86400000).toISOString(); return { GIT_AUTHOR_DATE: at, GIT_COMMITTER_DATE: at }; };
const run = (root, args) => { const r = spawnSync('node', [cleanup, 'age-out', ...args], { cwd: root, encoding: 'utf8' }); let json = null; try { json = JSON.parse(r.stdout); } catch {} return { status: r.status, json, stderr: r.stderr.trim() }; };
let failures = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` :: ${detail}` : ''}`); if (!ok) failures += 1; };
const repo = (files, { config, age = 30 } = {}) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-spec9-probe-')));
  git(root, ['init', '-q', '-b', 'main']);
  if (config) put(root, 'joycraft.yaml', config);
  for (const [file, body] of Object.entries(files)) put(root, file, body);
  git(root, ['add', '-A'], daysAgo(age)); git(root, ['commit', '-q', '-m', 'old'], daysAgo(age));
  return root;
};
const listed = out => (out.json?.docs ?? []).map(d => d.path).sort();

// 1. A page reached only by a backticked path in a context page (several spellings).
{
  const root = repo({
    'docs/context/guide.md': '# G\n\nSee `docs/research/full.md`, `../research/rel.md`, `research/docsrel.md`, `docs/research/anchor.md#part` and `docs/research/line.md:12`.\n\n```\ndocs/research/fenced.md\n```\n',
    'docs/research/full.md': '', 'docs/research/rel.md': '', 'docs/research/docsrel.md': '', 'docs/research/anchor.md': '', 'docs/research/line.md': '', 'docs/research/fenced.md': '', 'docs/research/plain.md': '',
  });
  const out = run(root, ['--days', '14']);
  console.log('OBSERVED backtick-in-context listed:', JSON.stringify(listed(out)));
  check('backticked full path from a context page keeps the page', !listed(out).includes('docs/research/full.md'));
  check('backticked ../ path from a context page keeps the page', !listed(out).includes('docs/research/rel.md'));
  check('an unreferenced research doc is listed', listed(out).includes('docs/research/plain.md'));
  console.log('INFO docs-root-relative `research/docsrel.md` listed:', listed(out).includes('docs/research/docsrel.md'));
  console.log('INFO `docs/research/anchor.md#part` listed:', listed(out).includes('docs/research/anchor.md'));
  console.log('INFO `docs/research/line.md:12` listed:', listed(out).includes('docs/research/line.md'));
  rmSync(root, { recursive: true, force: true });
}

// 2. Nested AGENTS.md under the docs root: never moved, and what it links is reached.
{
  const root = repo({
    'docs/context/a.md': '# A\n',
    'docs/research/AGENTS.md': '# Local rules\n\n[sib](sibling.md) and `docs/research/named.md`\n',
    'docs/research/CLAUDE.md': '@AGENTS.md\n@imported.md\n',
    'docs/research/AGENTS.override.md': '# o\n',
    'docs/research/sibling.md': '', 'docs/research/named.md': '', 'docs/research/imported.md': '', 'docs/research/loose.md': '',
    'docs/research/CLAUDE.local.md': '# local\n',
  });
  const out = run(root, ['--days', '14']);
  console.log('OBSERVED nested-entry listed:', JSON.stringify(listed(out)));
  for (const f of ['AGENTS.md', 'CLAUDE.md', 'AGENTS.override.md', 'sibling.md', 'named.md', 'imported.md']) check(`nested entry case keeps docs/research/${f}`, !listed(out).includes(`docs/research/${f}`));
  check('nested entry case still lists loose.md', listed(out).includes('docs/research/loose.md'));
  console.log('INFO CLAUDE.local.md listed:', listed(out).includes('docs/research/CLAUDE.local.md'));
  rmSync(root, { recursive: true, force: true });
}

// 3. A docs root of `.`: work folders at the top level. What else in the project becomes a "working doc"?
{
  const root = repo({
    'AGENTS.md': '# A\n', 'README.md': '# r\n', 'CHANGELOG.md': '', 'context/arch.md': '# arch\n',
    'features/f/brief.md': '', 'archive/a/brief.md': '', 'backlog/x.md': '',
    'notes/old.md': '',
    '.claude/skills/joycraft-verify/SKILL.md': '---\nname: v\n---\n',
    '.agents/skills/joycraft-verify/SKILL.md': '---\nname: v\n---\n',
    '.joycraft/references/cleanup.md': '# ref\n',
    '.claude/agents/joycraft-reviewer.md': '---\nname: r\n---\n',
    '.github/pull_request_template.md': '## PR\n',
    '.github/copilot-instructions.md': '# copilot\n',
    'src/lib/design.md': '# d\n',
    'pkg/sub/AGENTS.md': '# nested\n',
  }, { config: 'paths:\n  features: features\n  archive: archive\n  context: context\n' });
  const out = run(root, ['--days', '14']);
  console.log('OBSERVED docs-root-dot listed:', JSON.stringify(listed(out)));
  console.log('OBSERVED docs-root-dot targets:', JSON.stringify((out.json?.docs ?? []).map(d => d.to).sort()));
  check('dot root lists notes/old.md', listed(out).includes('notes/old.md'));
  for (const f of ['AGENTS.md', 'README.md', 'CHANGELOG.md', 'pkg/sub/AGENTS.md', 'backlog/x.md']) check(`dot root keeps ${f}`, !listed(out).includes(f));
  for (const f of ['.claude/skills/joycraft-verify/SKILL.md', '.agents/skills/joycraft-verify/SKILL.md', '.joycraft/references/cleanup.md', '.claude/agents/joycraft-reviewer.md', '.github/pull_request_template.md', '.github/copilot-instructions.md']) {
    check(`dot root keeps harness/tool file ${f}`, !listed(out).includes(f));
  }
  console.log('INFO dot root lists src/lib/design.md:', listed(out).includes('src/lib/design.md'));
  // Apply, then see what the harness install looks like.
  const applied = run(root, ['--days', '14', '--apply']);
  console.log('OBSERVED dot root apply status:', applied.status, 'moved:', JSON.stringify((applied.json?.docs ?? []).filter(d => d.moved).map(d => d.path).sort()));
  check('after apply .claude/skills/joycraft-verify/SKILL.md still exists', existsSync(join(root, '.claude/skills/joycraft-verify/SKILL.md')));
  check('after apply .joycraft/references/cleanup.md still exists', existsSync(join(root, '.joycraft/references/cleanup.md')));
  console.log('OBSERVED git status after dot apply:\n' + git(root, ['status', '--porcelain']));
  check('apply made no commit', git(root, ['rev-list', '--count', 'HEAD']) === '1');
  rmSync(root, { recursive: true, force: true });
}

// 4. Default docs root: a docs/.joycraft state folder and dot folders under docs.
{
  const root = repo({ 'docs/context/a.md': '', 'docs/.joycraft/notes.md': '', 'docs/research/x.md': '' });
  const out = run(root, ['--days', '14']);
  console.log('OBSERVED docs/.joycraft listed:', JSON.stringify(listed(out)));
  console.log('INFO docs/.joycraft/notes.md listed:', listed(out).includes('docs/.joycraft/notes.md'));
  rmSync(root, { recursive: true, force: true });
}

// 5. Dirty variants: staged-only change, staged deletion, a file with a space; target exists.
{
  const root = repo({ 'docs/context/a.md': '', 'docs/research/staged.md': '', 'docs/research/gone.md': '', 'docs/research/with space.md': '', 'docs/research/clash.md': '', 'docs/research/ok.md': '' });
  put(root, 'docs/research/staged.md', '# changed\n'); git(root, ['add', 'docs/research/staged.md']);
  git(root, ['rm', '-q', '--cached', 'docs/research/gone.md']);
  put(root, 'docs/archive/working/research/clash.md', '# already\n');
  const out = run(root, ['--days', '14', '--apply']);
  const skipped = (out.json?.skipped ?? []).map(s => s.path).sort();
  console.log('OBSERVED dirty listed:', JSON.stringify(listed(out)), 'skipped:', JSON.stringify(skipped));
  check('staged-only change is skipped', skipped.includes('docs/research/staged.md') && existsSync(join(root, 'docs/research/staged.md')));
  check('target that exists is skipped, the existing target untouched', skipped.includes('docs/research/clash.md') && existsSync(join(root, 'docs/research/clash.md')));
  check('a name with a space moves', existsSync(join(root, 'docs/archive/working/research/with space.md')));
  check('ok.md moves', existsSync(join(root, 'docs/archive/working/research/ok.md')));
  console.log('INFO staged deletion (git rm --cached) listed or skipped:', listed(out).includes('docs/research/gone.md') ? 'listed' : skipped.includes('docs/research/gone.md') ? 'skipped' : 'absent');
  rmSync(root, { recursive: true, force: true });
}

// 6. Bad --days values and a non-Git folder.
{
  const root = repo({ 'docs/context/a.md': '', 'docs/research/x.md': '' });
  for (const value of [['--days', '0'], ['--days', '-3'], ['--days', '1.5'], ['--days', 'abc'], []]) {
    const out = run(root, value);
    check(`age-out ${value.join(' ') || '(no --days)'} refuses with exit 1`, out.status === 1, out.stderr);
  }
  rmSync(join(root, '.git'), { recursive: true, force: true });
  const out = run(root, ['--days', '14']);
  console.log('OBSERVED non-git:', out.status, out.stderr);
  check('a folder without Git stops with exit 1, not a crash trace', out.status === 1 && out.stderr.startsWith('Cleanup stopped'));
  rmSync(root, { recursive: true, force: true });
}

// 7. A doc touched recently only in a merge commit (conflict resolution).
{
  const root = repo({ 'docs/context/a.md': '', 'docs/research/m.md': 'base\n' });
  git(root, ['checkout', '-q', '-b', 'side']); put(root, 'docs/research/m.md', 'side\n'); git(root, ['commit', '-q', '-am', 'side'], daysAgo(25));
  git(root, ['checkout', '-q', 'main']); put(root, 'docs/research/m.md', 'main\n'); git(root, ['commit', '-q', '-am', 'main'], daysAgo(25));
  spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', 'merge', '-q', 'side'], { cwd: root });
  put(root, 'docs/research/m.md', 'resolved today\n'); git(root, ['add', '.']); git(root, ['commit', '-q', '-m', 'merge today']);
  const out = run(root, ['--days', '14']);
  console.log('INFO doc changed today only in a merge resolution listed as old:', listed(out).includes('docs/research/m.md'), JSON.stringify(out.json?.docs));
  rmSync(root, { recursive: true, force: true });
}

console.log(`failures=${failures}`);
process.exitCode = failures ? 1 : 0;
