// Round-2 reviewer probes for drift-tidy spec 9 (age-out), after fix 01f909e.
// Each line prints OBSERVED (what age-out did) plus PASS/FAIL against the reviewer's expectation; INFO lines record behavior the spec does not decide.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readlinkSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const cleanup = process.argv[2];
const env0 = { GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
const git = (cwd, args, env = {}) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'protocol.file.allow=always', ...args], { cwd, encoding: 'utf8', env: { ...process.env, ...env0, ...env } }).trim();
const put = (root, file, body = '# x\n') => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), body); };
const daysAgo = days => { const at = new Date(Date.now() - days * 86400000).toISOString(); return { GIT_AUTHOR_DATE: at, GIT_COMMITTER_DATE: at }; };
const run = (root, args) => { const r = spawnSync('node', [cleanup, 'age-out', ...args], { cwd: root, encoding: 'utf8' }); let json = null; try { json = JSON.parse(r.stdout); } catch {} return { status: r.status, json, stdout: r.stdout.trim(), stderr: r.stderr.trim() }; };
let failures = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` :: ${detail}` : ''}`); if (!ok) failures += 1; };
const temp = () => realpathSync(mkdtempSync(join(tmpdir(), 'jc-spec9-r2-')));
const repo = (files, { config, age = 30 } = {}) => {
  const root = temp();
  git(root, ['init', '-q', '-b', 'main']);
  if (config) put(root, 'joycraft.yaml', config);
  for (const [file, body] of Object.entries(files)) put(root, file, body);
  git(root, ['add', '-A'], daysAgo(age)); git(root, ['commit', '-q', '-m', 'old'], daysAgo(age));
  return root;
};
const listed = out => (out.json?.docs ?? []).map(d => d.path).sort();

// A. Docs root `.` through the CLI: exit code and output shape.
{
  const root = repo({ 'context/a.md': '', 'notes/old.md': '' }, { config: 'paths:\n  features: features\n  archive: archive\n  context: context\n' });
  const out = run(root, ['--days', '14', '--apply']);
  console.log('OBSERVED dot root CLI:', out.status, out.stdout.replace(/\s+/g, ' '));
  check('dot root CLI exits 0 with one skipped entry and moves nothing', out.status === 0 && out.json?.skipped?.length === 1 && out.json.count === 0 && git(root, ['status', '--porcelain']) === '');
  rmSync(root, { recursive: true, force: true });
}

// B. A docs root that is itself a dot folder (`.docs`), which the config validator accepts.
{
  const root = repo({ '.docs/context/a.md': '', '.docs/research/old.md': '', '.docs/research/.drafts/d.md': '' },
    { config: 'paths:\n  features: .docs/features\n  archive: .docs/archive\n  context: .docs/context\n' });
  const out = run(root, ['--days', '14']);
  console.log('OBSERVED .docs root:', out.status, out.stdout.replace(/\s+/g, ' '), out.stderr);
  check('.docs root lists .docs/research/old.md (a working doc under the docs root)', listed(out).includes('.docs/research/old.md'));
  console.log('INFO .docs root gives a skipped entry explaining an empty list:', JSON.stringify(out.json?.skipped ?? null));
  rmSync(root, { recursive: true, force: true });
}

// C. .joycraft/installation.json missing, malformed, wrong shape, or listing a doc.
{
  const cases = {
    missing: null,
    malformed: '{ not json',
    'files-object': JSON.stringify({ files: { 'docs/research/x.md': 'h' } }),
    'files-null-entry': JSON.stringify({ files: [null, { path: 'docs/research/y.md' }] }),
    'lists-a-doc': JSON.stringify({ files: [{ path: 'docs/research/y.md', sha256: 'h' }] }),
  };
  for (const [name, body] of Object.entries(cases)) {
    const files = { 'docs/context/a.md': '', 'docs/research/x.md': '', 'docs/research/y.md': '' };
    if (body != null) files['.joycraft/installation.json'] = body;
    const root = repo(files);
    const out = run(root, ['--days', '14']);
    console.log(`OBSERVED installation ${name}:`, out.status, JSON.stringify(listed(out)), out.stderr);
    const want = name === 'lists-a-doc' ? ['docs/research/x.md'] : ['docs/research/x.md', 'docs/research/y.md'];
    check(`installation.json ${name}: exit 0 and lists ${JSON.stringify(want)}`, out.status === 0 && JSON.stringify(listed(out)) === JSON.stringify(want));
    rmSync(root, { recursive: true, force: true });
  }
}

// D. Symlinks: a tracked symlinked doc under docs, and a docs root that is a symlink.
{
  const root = temp();
  git(root, ['init', '-q', '-b', 'main']);
  put(root, 'docs/context/a.md', ''); put(root, 'shared/real.md', '# real\n'); put(root, 'docs/research/plain.md', '');
  mkdirSync(join(root, 'docs/research'), { recursive: true });
  symlinkSync('../../shared/real.md', join(root, 'docs/research/link.md'));
  git(root, ['add', '-A'], daysAgo(30)); git(root, ['commit', '-q', '-m', 'old'], daysAgo(30));
  const out = run(root, ['--days', '14', '--apply']);
  console.log('OBSERVED symlinked doc:', out.status, JSON.stringify(out.json?.docs), JSON.stringify(out.json?.skipped));
  const moved = join(root, 'docs/archive/working/research/link.md');
  const isLink = existsSync(moved) || (() => { try { return lstatSync(moved).isSymbolicLink(); } catch { return false; } })();
  if (isLink) {
    const target = readlinkSync(moved);
    console.log('INFO moved symlink target:', target, 'resolves:', existsSync(moved));
  } else console.log('INFO symlinked doc was not moved');
  check('ordinary doc next to a symlink still moves', existsSync(join(root, 'docs/archive/working/research/plain.md')));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = temp();
  git(root, ['init', '-q', '-b', 'main']);
  put(root, 'real-docs/context/a.md', ''); put(root, 'real-docs/research/old.md', '');
  symlinkSync('real-docs', join(root, 'docs'));
  git(root, ['add', '-A'], daysAgo(30)); git(root, ['commit', '-q', '-m', 'old'], daysAgo(30));
  const out = run(root, ['--days', '14', '--apply']);
  console.log('OBSERVED docs root is a symlink:', out.status, JSON.stringify(out.json), out.stderr);
  check('docs-as-symlink: exit 0 and nothing moved', out.status === 0 && git(root, ['status', '--porcelain']) === '');
  rmSync(root, { recursive: true, force: true });
}

// E. A submodule under the docs root.
{
  const sub = repo({ 'guide.md': '# g\n', 'old.md': '' });
  const root = repo({ 'docs/context/a.md': '', 'docs/research/x.md': '' });
  git(root, ['submodule', 'add', '-q', sub, 'docs/vendor'], daysAgo(30)); git(root, ['commit', '-q', '-m', 'sub'], daysAgo(30));
  const out = run(root, ['--days', '14', '--apply']);
  console.log('OBSERVED submodule:', out.status, JSON.stringify(listed(out)), JSON.stringify(out.json?.skipped), out.stderr);
  check('submodule: no file inside the submodule is listed and the gitlink is not moved', out.status === 0 && !listed(out).some(f => f.startsWith('docs/vendor')) && existsSync(join(root, 'docs/vendor/guide.md')));
  check('submodule: the ordinary doc still moves', existsSync(join(root, 'docs/archive/working/research/x.md')));
  rmSync(root, { recursive: true, force: true }); rmSync(sub, { recursive: true, force: true });
}

// F. A doc whose only commit is the root commit, with later commits to other files.
{
  const root = repo({ 'docs/context/a.md': '', 'docs/research/rooted.md': '' }, { age: 20 });
  put(root, 'docs/research/fresh.md', ''); git(root, ['add', '-A'], daysAgo(5)); git(root, ['commit', '-q', '-m', 'fresh'], daysAgo(5));
  const out = run(root, ['--days', '14']);
  console.log('OBSERVED root-commit doc:', JSON.stringify(out.json?.docs));
  check('a doc whose only commit is the root commit is listed with its age (20)', JSON.stringify(out.json?.docs?.map(d => [d.path, d.days])) === JSON.stringify([['docs/research/rooted.md', 20]]));
  rmSync(root, { recursive: true, force: true });
}

console.log(`failures=${failures}`);
process.exitCode = failures ? 1 : 0;
