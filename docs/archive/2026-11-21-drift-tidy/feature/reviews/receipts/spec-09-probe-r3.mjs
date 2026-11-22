// Round-3 reviewer probes for drift-tidy spec 9 (age-out), after fix 84fab84.
// PASS/FAIL lines are the reviewer's expectation; INFO lines record behavior the spec does not decide.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const cleanup = process.argv[2];
const env0 = { GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
const git = (cwd, args, env = {}) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', env: { ...process.env, ...env0, ...env } }).trim();
const put = (root, file, body = '# x\n') => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), body); };
const daysAgo = days => { const at = new Date(Date.now() - days * 86400000).toISOString(); return { GIT_AUTHOR_DATE: at, GIT_COMMITTER_DATE: at }; };
const run = (cwd, args) => { const r = spawnSync('node', [cleanup, 'age-out', ...args], { cwd, encoding: 'utf8', env: { ...process.env, ...env0 } }); let json = null; try { json = JSON.parse(r.stdout); } catch {} return { status: r.status, json, stdout: r.stdout.replace(/\s+/g, ' ').trim(), stderr: r.stderr.trim() }; };
let failures = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` :: ${detail}` : ''}`); if (!ok) failures += 1; };
const temp = () => realpathSync(mkdtempSync(join(tmpdir(), 'jc-spec9-r3-')));
const commit = (root, age, msg = 'c') => { git(root, ['add', '-A'], daysAgo(age)); git(root, ['commit', '-q', '-m', msg], daysAgo(age)); };
const repo = (files, { config, age = 30, at } = {}) => {
  const root = at ?? temp();
  mkdirSync(root, { recursive: true });
  git(root, ['init', '-q', '-b', 'main']);
  if (config) put(root, config[0], config[1]);
  for (const [file, body] of Object.entries(files)) put(root, file, body);
  commit(root, age, 'old');
  return root;
};
const listed = out => (out.json?.docs ?? []).map(d => d.path).sort();
const porcelain = root => git(root, ['-c', 'core.quotepath=false', 'status', '--porcelain']);

// 1. Project in a subfolder of its repo, with its own joycraft.yaml, --apply, 20/5-day docs, a renamed archive.
{
  const top = temp();
  git(top, ['init', '-q', '-b', 'main']);
  put(top, 'app/joycraft.yaml', 'paths:\n  features: notes/features\n  archive: notes/old\n  context: notes/context\n');
  put(top, 'app/notes/context/a.md'); put(top, 'app/notes/research/old.md'); put(top, 'other/notes/research/old.md');
  commit(top, 20);
  put(top, 'app/notes/research/new.md'); commit(top, 5);
  const out = run(join(top, 'app'), ['--days', '14', '--apply']);
  console.log('OBSERVED subfolder apply:', out.status, out.stdout);
  check('subfolder project lists only notes/research/old.md, 20 days', JSON.stringify(listed(out)) === '["notes/research/old.md"]' && out.json.docs[0].days === 20);
  check('subfolder apply: rename shown from repo root, sibling project untouched, HEAD unchanged', porcelain(top) === 'R  app/notes/research/old.md -> app/notes/old/working/research/old.md' && existsSync(join(top, 'other/notes/research/old.md')), porcelain(top));
  check('subfolder apply: no skipped entries', (out.json?.skipped ?? []).length === 0, JSON.stringify(out.json?.skipped));
  rmSync(top, { recursive: true, force: true });
}

// 2. Project two folders deep, via --root from the repo top, with a staged and an unstaged doc.
{
  const top = repo({ 'a/b/docs/context/a.md': '', 'a/b/docs/research/old.md': '', 'a/b/docs/research/staged.md': '', 'a/b/docs/research/edit.md': '' });
  put(top, 'a/b/docs/research/staged.md', '# s2\n'); git(top, ['add', 'a/b/docs/research/staged.md']);
  put(top, 'a/b/docs/research/edit.md', '# e2\n');
  const out = run(top, ['--root', 'a/b', '--days', '14', '--apply']);
  console.log('OBSERVED deep --root apply:', out.status, out.stdout);
  check('deep --root: old moved, staged and edited skipped as uncommitted', JSON.stringify(listed(out)) === '["docs/research/old.md"]' && JSON.stringify((out.json?.skipped ?? []).map(s => s.path).sort()) === '["docs/research/edit.md","docs/research/staged.md"]' && existsSync(join(top, 'a/b/docs/archive/working/research/old.md')));
  rmSync(top, { recursive: true, force: true });
}

// 3. Unicode and space names under a .docs root, plus a space in the project folder name.
{
  const top = temp();
  const names = ['.docs/research/café notes.md', '.docs/research/日本語.md', '.docs/réseau/plan d’été.md', '.docs/research/tab\tname.md', '.docs/research/quote"q.md'];
  const files = { 'my app/.docs/context/a.md': '' };
  for (const n of names) files[`my app/${n}`] = '';
  repo(files, { at: top, config: ['my app/joycraft.yaml', 'paths:\n  features: .docs/features\n  archive: .docs/archive\n  context: .docs/context\n'] });
  const out = run(join(top, 'my app'), ['--days', '14']);
  console.log('OBSERVED unicode/space dry run:', out.status, out.stdout);
  const plain = names.slice(0, 3);
  check('unicode and space names are listed with 30 days', plain.every(n => listed(out).includes(n.normalize('NFC')) || listed(out).includes(n)) && out.json.docs.every(d => d.days === 30), JSON.stringify(listed(out)));
  const quotedNames = names.slice(3);
  const accounted = quotedNames.every(n => listed(out).includes(n) || (out.json?.skipped ?? []).some(s => s.path === n));
  check('names Git log quotes (tab, double quote) are listed or skipped with a reason, never silently dropped', accounted, JSON.stringify(out.json?.skipped));
  console.log('INFO quoted names: listed', JSON.stringify(quotedNames.filter(n => listed(out).includes(n))), 'skipped', JSON.stringify((out.json?.skipped ?? []).filter(s => quotedNames.includes(s.path))));
  const ap = run(join(top, 'my app'), ['--days', '14', '--apply']);
  const moved = (ap.json?.docs ?? []).filter(d => d.moved).map(d => d.path);
  check('unicode/space apply moves each listed doc under .docs/archive/working/', moved.length === (ap.json?.docs ?? []).length && moved.every(p => existsSync(join(top, 'my app', `.docs/archive/working/${p.slice('.docs/'.length)}`))), porcelain(top));
  console.log('OBSERVED unicode porcelain:', JSON.stringify(porcelain(top)));
  rmSync(top, { recursive: true, force: true });
}

// 4. NFD-decomposed name written on disk (macOS precomposeunicode default).
{
  const nfd = 'docs/research/' + 'été.md';
  const root = repo({ 'docs/context/a.md': '', [nfd]: '' });
  const out = run(root, ['--days', '14', '--apply']);
  console.log('OBSERVED NFD name:', out.status, out.stdout);
  check('NFD-named doc is listed and moved (or skipped with a reason)', (out.json?.docs ?? []).some(d => d.moved) || (out.json?.skipped ?? []).length === 1, porcelain(root));
  rmSync(root, { recursive: true, force: true });
}

// 5. Docs root path with a symlinked ancestor above the project root.
{
  const real = temp();
  const project = repo({ 'docs/context/a.md': '', 'docs/research/old.md': '' }, { at: join(real, 'proj') });
  const linkParent = temp();
  symlinkSync(real, join(linkParent, 'via'));
  const viaRoot = join(linkParent, 'via', 'proj');
  const out = run(linkParent, ['--root', viaRoot, '--days', '14', '--apply']);
  console.log('OBSERVED symlinked ancestor --root:', out.status, out.stdout, out.stderr);
  check('a symlink above the project root does not trigger the symlink skip; old doc moves', JSON.stringify(listed(out)) === '["docs/research/old.md"]' && (out.json?.skipped ?? []).length === 0 && existsSync(join(project, 'docs/archive/working/research/old.md')));
  // cwd inside the symlinked path, project in a subfolder of the repo
  const top = repo({ 'app/docs/context/a.md': '', 'app/docs/research/old.md': '' }, { at: join(real, 'top') });
  const out2 = run(join(linkParent, 'via', 'top', 'app'), ['--days', '14']);
  console.log('OBSERVED symlinked ancestor + subfolder:', out2.status, out2.stdout);
  check('symlinked ancestor + subfolder project lists the old doc with 30 days', JSON.stringify(listed(out2)) === '["docs/research/old.md"]' && out2.json.docs[0].days === 30 && (out2.json.skipped ?? []).length === 0);
  rmSync(real, { recursive: true, force: true }); rmSync(linkParent, { recursive: true, force: true });
  void top;
}

// 6. Case-insensitive filesystem collisions (macOS APFS default).
{
  // 6a. Target differs only in case from an existing archived file.
  const root = repo({ 'docs/context/a.md': '', 'docs/research/old.md': '', 'docs/archive/working/research/OLD.md': '' });
  const out = run(root, ['--days', '14', '--apply']);
  console.log('OBSERVED case-collision target:', out.status, out.stdout);
  const ci = existsSync(join(root, 'docs/archive/working/research/old.md'));
  console.log('INFO filesystem is case-insensitive:', ci);
  check('a target that collides only by case is skipped, the archived OLD.md is untouched', !ci || ((out.json?.skipped ?? []).some(s => s.path === 'docs/research/old.md') && porcelain(root) === ''), porcelain(root));
  rmSync(root, { recursive: true, force: true });
  // 6b. --root given in the wrong case for a subfolder project.
  const top = repo({ 'App/docs/context/a.md': '', 'App/docs/research/old.md': '' });
  const out2 = run(top, ['--root', 'app', '--days', '14']);
  console.log('OBSERVED wrong-case --root subfolder:', out2.status, out2.stdout, out2.stderr);
  check('wrong-case --root lists the old doc or explains with a skipped entry (no silent empty, no false "no commit")', out2.status === 0 && (JSON.stringify(listed(out2)) === '["docs/research/old.md"]' || ((out2.json?.skipped ?? []).length > 0 && !(out2.json.skipped).some(s => /no commit/.test(s.reason)))), JSON.stringify(out2.json?.skipped));
  rmSync(top, { recursive: true, force: true });
  // 6c. Config path case differs from the tracked folder (Docs vs docs).
  const r3 = repo({ 'docs/context/a.md': '', 'docs/research/old.md': '' }, { config: ['joycraft.yaml', 'paths:\n  features: Docs/features\n  archive: Docs/archive\n  context: Docs/context\n'] });
  const out3 = run(r3, ['--days', '14']);
  console.log('OBSERVED config case mismatch:', out3.status, out3.stdout);
  check('config case mismatch lists nothing silently? (expect a skipped entry or a listing)', out3.status === 0 && (listed(out3).length > 0 || (out3.json?.skipped ?? []).length > 0));
  rmSync(r3, { recursive: true, force: true });
}

// 7. A doc both listed in installation.json and old, in a normal and a subfolder project.
{
  const inst = JSON.stringify({ files: [{ path: 'docs/research/installed.md', sha256: 'h' }] });
  const root = repo({ 'docs/context/a.md': '', 'docs/research/installed.md': '', 'docs/research/old.md': '', '.joycraft/installation.json': inst });
  const out = run(root, ['--days', '14', '--apply']);
  console.log('OBSERVED installed+old:', out.status, out.stdout);
  check('installed old doc is neither listed nor moved; plain old doc moves', JSON.stringify(listed(out)) === '["docs/research/old.md"]' && existsSync(join(root, 'docs/research/installed.md')));
  rmSync(root, { recursive: true, force: true });
  const top = repo({ 'app/docs/context/a.md': '', 'app/docs/research/installed.md': '', 'app/docs/research/old.md': '', 'app/.joycraft/installation.json': inst });
  const out2 = run(join(top, 'app'), ['--days', '14', '--apply']);
  console.log('OBSERVED installed+old subfolder:', out2.status, out2.stdout);
  check('subfolder: installed old doc kept, plain old doc moves', JSON.stringify(listed(out2)) === '["docs/research/old.md"]' && existsSync(join(top, 'app/docs/research/installed.md')));
  rmSync(top, { recursive: true, force: true });
}

// 8. Acceptance fixture rerun: 20 and 5 days via GIT_COMMITTER_DATE only.
{
  const root = temp();
  git(root, ['init', '-q', '-b', 'main']);
  put(root, 'docs/context/a.md'); put(root, 'docs/research/old.md');
  git(root, ['add', '-A']); git(root, ['commit', '-q', '-m', 'a'], { GIT_COMMITTER_DATE: new Date(Date.now() - 20 * 86400000).toISOString() });
  put(root, 'docs/research/new.md');
  git(root, ['add', '-A']); git(root, ['commit', '-q', '-m', 'b'], { GIT_COMMITTER_DATE: new Date(Date.now() - 5 * 86400000).toISOString() });
  const out = run(root, ['--days', '14', '--apply']);
  check('acceptance: lists only the 20-day doc, count 1, git status shows the rename, no commit', out.json?.count === 1 && listed(out)[0] === 'docs/research/old.md' && out.json.docs[0].days === 20 && porcelain(root) === 'R  docs/research/old.md -> docs/archive/working/research/old.md' && git(root, ['rev-list', '--count', 'HEAD']) === '2');
  rmSync(root, { recursive: true, force: true });
}

console.log(`failures: ${failures}`);
process.exitCode = failures ? 1 : 0;
