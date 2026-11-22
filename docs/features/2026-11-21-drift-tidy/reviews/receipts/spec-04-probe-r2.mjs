// Round-2 probes for spec 4 (tidy --verify). Usage: node spec-04-probe-r2.mjs <abs path to cleanup.mjs>
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
const cleanup = process.argv[2];
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'protocol.file.allow=always', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (root, file, body) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), body); };
const save = (root, m) => { git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', m); };
const guide = '# Guide\n\nThe widget loader.\n\nCall `getWidget()` to load one.\n';
const dirs = [];
function fixture(extra = () => {}, page = guide) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-v4r2-'))); dirs.push(root);
  git(root, 'init', '-q', '-b', 'main');
  put(root, 'src/widget.ts', 'export function getWidget() {\n  return 1;\n}\nexport const keep = 2;\n');
  put(root, 'docs/context/guide.md', page);
  put(root, 'docs/context/other.md', '# Other\n');
  put(root, 'AGENTS.md', '# A\n\n[guide](docs/context/guide.md)\n[other](docs/context/other.md)\n');
  extra(root);
  save(root, 'init');
  git(root, 'checkout', '-q', '-b', 'feature');
  put(root, 'src/widget.ts', 'export const keep = 2;\n');
  save(root, 'remove getWidget');
  return root;
}
const fixLine = root => put(root, 'docs/context/guide.md', guide.replace('Call `getWidget()` to load one.', 'Read `keep` for the value.'));
const verify = root => {
  const r = spawnSync('node', [cleanup, 'tidy', '--verify'], { cwd: root, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
  let j; try { j = JSON.parse(r.stdout); } catch { j = { raw: (r.stdout ?? '').slice(0, 300) }; }
  const before = (j.remaining ?? []).length;
  return { exit: r.status, status: j.status, refused: j.refused, cleared: j.cleared, remaining: before, message: j.message, err: (r.stderr ?? '').trim().slice(0, 300) || undefined };
};
const probe = (name, setup, extra, page) => {
  const root = fixture(extra, page);
  let note = '';
  try { note = setup(root) ?? ''; } catch (e) { note = 'setup error: ' + e.message.slice(0, 200); }
  const out = verify(root);
  console.log(`${name}${note ? ' [' + note + ']' : ''}\n  -> ${JSON.stringify(out)}`);
};
const crlf = text => text.replace(/\n/g, '\r\n');

// CRLF pages
probe('CR1 CRLF page at HEAD; named line fixed (CRLF kept)', root => { put(root, 'docs/context/guide.md', crlf(guide.replace('Call `getWidget()` to load one.', 'Read `keep` for the value.'))); }, undefined, crlf(guide));
probe('CR2 CRLF page at HEAD; named line still names getWidget without backticks', root => { put(root, 'docs/context/guide.md', crlf(guide.replace('Call `getWidget()` to load one.', 'Call getWidget() to load one.'))); }, undefined, crlf(guide));
probe('CR3 CRLF page at HEAD; named line keeps the gone symbol with a space in backticks', root => { put(root, 'docs/context/guide.md', crlf(guide.replace('`getWidget()`', '`getWidget ()`'))); }, undefined, crlf(guide));
const crPage = '# Guide\r\n\r\nThe widget loader.\r\n\r\nCall `getWidget()` to load one.\r\nNote line.\r\nOld policy: ask before pushing.\r\n';
probe('CR4 CRLF page: valid fix of line 5 plus rewrite of unnamed line 7 (hunk heading holds a CR)', root => { put(root, 'docs/context/guide.md', crPage.replace('Call `getWidget()` to load one.', 'Read `keep` for the value.').replace('Old policy: ask before pushing.', 'New policy: push to main.')); return 'raw diff: ' + JSON.stringify(git(root, 'diff', 'HEAD', '-U0', '--text', '--', 'docs/context/guide.md').split('\n').filter(l => l.startsWith('@@'))); }, undefined, crPage);
probe('CR5 LF page at HEAD; whole page converted to CRLF, named line fixed', root => { put(root, 'docs/context/guide.md', crlf(guide.replace('Call `getWidget()` to load one.', 'Read `keep` for the value.'))); });
probe('CR6 LF page; only the named line gets a CR and the fix', root => { put(root, 'docs/context/guide.md', guide.replace('Call `getWidget()` to load one.', 'Read `keep` for the value.\r')); });
probe('CR7 core.autocrlf=true; LF page converted to CRLF in the worktree plus the fix', root => { git(root, 'config', 'core.autocrlf', 'true'); put(root, 'docs/context/guide.md', crlf(guide.replace('Call `getWidget()` to load one.', 'Read `keep` for the value.'))); });
// U+2028 in a hunk heading line at HEAD (JS "." does not match it either)
const lsPage = '# Guide\n\nThe widget loader.\n\nCall `getWidget()` to load one.\nNote line.\nOld policy: ask before pushing.\n';
probe('LS1 LF page with U+2028 in line 6 at HEAD: valid fix of line 5 plus rewrite of unnamed line 7', root => { put(root, 'docs/context/guide.md', lsPage.replace('Call `getWidget()` to load one.', 'Read `keep` for the value.').replace('Old policy: ask before pushing.', 'New policy: push to main.')); }, undefined, lsPage);
probe('LS2 named line rewritten as "Read `keep`.<U+2028>getWidget() still"', root => { put(root, 'docs/context/guide.md', guide.replace('Call `getWidget()` to load one.', 'Read `keep`. Call getWidget() still.')); });

// Submodules
const sub = () => {
  const s = realpathSync(mkdtempSync(join(tmpdir(), 'jc-v4r2-sub-'))); dirs.push(s);
  git(s, 'init', '-q', '-b', 'main'); put(s, 'page.md', '# Sub\n'); save(s, 'sub init'); return s;
};
probe('SM1 submodule at docs/vendor added (new gitlink) plus the valid fix', root => { const s = sub(); fixLine(root); git(root, 'submodule', 'add', '-q', s, 'docs/vendor'); });
probe('SM2 committed submodule moved to a new commit plus the valid fix', root => { fixLine(root); const s = join(root, 'docs/vendor'); put(s, 'page.md', '# Sub changed\n'); git(s, 'commit', '-q', '-am', 'x'); }, root => { const s = sub(); git(root, 'submodule', 'add', '-q', s, 'docs/vendor'); });
probe('SM3 submodule with ignore=all in .gitmodules moved to a new commit plus the valid fix', root => { fixLine(root); const s = join(root, 'docs/vendor'); put(s, 'page.md', '# Sub changed\n'); git(s, 'commit', '-q', '-am', 'x'); return 'status: ' + git(root, 'status', '--porcelain').replace(/\n/g, ' | '); }, root => { const s = sub(); git(root, 'submodule', 'add', '-q', s, 'docs/vendor'); git(root, 'config', '-f', '.gitmodules', 'submodule.docs/vendor.ignore', 'all'); });
probe('SM4 named page replaced by a submodule gitlink in the index', root => { const s = sub(); git(root, 'rm', '-q', 'docs/context/guide.md'); git(root, 'submodule', 'add', '-q', s, 'docs/context/guide.md'); });

// Rename in the index only
probe('IR1 index renames guide.md to guide2.md (same blob); worktree guide.md holds the valid fix', root => { fixLine(root); const blob = git(root, 'rev-parse', 'HEAD:docs/context/guide.md'); git(root, 'update-index', '--force-remove', 'docs/context/guide.md'); git(root, 'update-index', '--add', '--cacheinfo', `100644,${blob},docs/context/guide2.md`); return 'status: ' + git(root, 'status', '--porcelain').replace(/\n/g, ' | '); });
probe('IR2 index renames other.md (unnamed) to other2.md; worktree unchanged except the valid fix', root => { fixLine(root); const blob = git(root, 'rev-parse', 'HEAD:docs/context/other.md'); git(root, 'update-index', '--force-remove', 'docs/context/other.md'); git(root, 'update-index', '--add', '--cacheinfo', `100644,${blob},docs/context/other2.md`); });

// Intent-to-add
probe('IA1 git add -N docs/context/new.md plus the valid fix', root => { fixLine(root); put(root, 'docs/context/new.md', '# New rules\n\nPush to main.\n'); git(root, 'add', '-N', 'docs/context/new.md'); return 'diff HEAD names: ' + git(root, 'diff', 'HEAD', '--name-only').replace(/\n/g, ',') + '; cached: ' + git(root, 'diff', '--cached', 'HEAD', '--name-only').replace(/\n/g, ','); });
probe('IA2 git add -N an empty docs/context/empty.md plus the valid fix', root => { fixLine(root); put(root, 'docs/context/empty.md', ''); git(root, 'add', '-N', 'docs/context/empty.md'); });
probe('IA3 git add -N AGENTS.override.md at the root plus the valid fix', root => { fixLine(root); put(root, 'AGENTS.override.md', '# Override\n'); git(root, 'add', '-N', 'AGENTS.override.md'); });

// Very long lines
const big = 'x'.repeat(3 * 1024 * 1024);
probe('LL1 named line replaced by a 3 MB line that names no symbol', root => { put(root, 'docs/context/guide.md', guide.replace('Call `getWidget()` to load one.', big)); });
probe('LL2 named line replaced by a 3 MB line ending in getWidget() (no backticks)', root => { put(root, 'docs/context/guide.md', guide.replace('Call `getWidget()` to load one.', big + ' getWidget()')); });
probe('LL3 valid fix plus unnamed line 3 replaced by a 3 MB line', root => { put(root, 'docs/context/guide.md', guide.replace('Call `getWidget()` to load one.', 'Read `keep`.').replace('The widget loader.', big)); });
probe('LL4 HEAD page has a 3 MB line 3; valid fix of line 5 only', root => { put(root, 'docs/context/guide.md', ('# Guide\n\n' + big + '\n\nCall `getWidget()` to load one.\n').replace('Call `getWidget()` to load one.', 'Read `keep`.')); }, undefined, '# Guide\n\n' + big + '\n\nCall `getWidget()` to load one.\n');

// Baselines
probe('P1 valid fix', root => { fixLine(root); });
probe('N1 no edits', () => {});
for (const d of dirs) rmSync(d, { recursive: true, force: true });
