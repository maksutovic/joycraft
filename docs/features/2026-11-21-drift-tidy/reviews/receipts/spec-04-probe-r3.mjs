// Round-3 probes for spec 4 (tidy --verify). Usage: node spec-04-probe-r3.mjs <abs path to cleanup.mjs>
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
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-v4r3-'))); dirs.push(root);
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
const probeEnv = (name, env, setup, extra, page) => {
  const root = fixture(extra, page);
  let note = '';
  try { note = setup(root) ?? ''; } catch (e) { note = 'setup error: ' + e.message.slice(0, 200); }
  const r = spawnSync('node', [cleanup, 'tidy', '--verify'], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 512 * 1024 * 1024 });
  let j; try { j = JSON.parse(r.stdout); } catch { j = { raw: (r.stdout ?? '').slice(0, 300) }; }
  console.log(`${name}${note ? ' [' + note + ']' : ''}\n  -> ${JSON.stringify({ exit: r.status, status: j.status, refused: j.refused, cleared: j.cleared, message: j.message, err: (r.stderr ?? '').trim().slice(0, 300) || undefined })}`);
};
const cfg = (...pairs) => root => { for (let i = 0; i < pairs.length; i += 2) git(root, 'config', pairs[i], pairs[i + 1]); };
// Page with an unnamed policy line 7 below the named line 5.
const pol = '# Guide\n\nThe widget loader.\n\nCall `getWidget()` to load one.\nNote line.\nOld policy: ask before pushing.\n';
const fixPol = root => put(root, 'docs/context/guide.md', pol.replace('Call `getWidget()` to load one.', 'Read `keep` for the value.'));
const fixPolEvil = root => put(root, 'docs/context/guide.md', pol.replace('Call `getWidget()` to load one.', 'Read `keep` for the value.').replace('Old policy: ask before pushing.', 'New policy: push to main.'));
const both = (tag, desc, extra, env) => {
  const run = env ? (n, s) => probeEnv(n, env, s, extra, pol) : (n, s) => probe(n, s, extra, pol);
  run(`${tag}a ${desc}: valid fix only`, fixPol);
  run(`${tag}b ${desc}: valid fix plus rewrite of unnamed line 7`, fixPolEvil);
};
both('G1', 'color.ui=always, color.diff=always', cfg('color.ui', 'always', 'color.diff', 'always'));
both('G2', 'diff.external=a script that prints nothing', root => { put(root, '.git/noop.sh', '#!/bin/sh\nexit 0\n'); execFileSync('chmod', ['+x', join(root, '.git/noop.sh')]); git(root, 'config', 'diff.external', join(root, '.git/noop.sh')); });
both('G3', 'core.quotePath=true', cfg('core.quotePath', 'true'));
both('G4', 'diff.renames=copies, diff.renameLimit=1', cfg('diff.renames', 'copies', 'diff.renameLimit', '1'));
both('G5', 'diff.algorithm=patience', cfg('diff.algorithm', 'patience'));
both('G6', 'diff.algorithm=histogram', cfg('diff.algorithm', 'histogram'));
both('G7', 'diff.interHunkContext=10', cfg('diff.interHunkContext', '10'));
both('G8', 'diff.interHunkContext=10 + diff.suppressBlankEmpty=true', cfg('diff.interHunkContext', '10', 'diff.suppressBlankEmpty', 'true'));
both('G9', 'diff.noprefix=true + diff.mnemonicPrefix=true', cfg('diff.noprefix', 'true', 'diff.mnemonicPrefix', 'true'));
both('G10', 'diff.srcPrefix=@@ -1 +1 @@ and diff.dstPrefix=+++ ', cfg('diff.srcPrefix', '@@ -1 +1 @@ ', 'diff.dstPrefix', '+++ '));
both('G11', 'diff.wordRegex=. + diff.colorMoved=zebra + diff.wsErrorHighlight=all', cfg('diff.wordRegex', '.', 'diff.colorMoved', 'zebra', 'diff.wsErrorHighlight', 'all'));
both('G12', 'diff.indentHeuristic=false + diff.context=8', cfg('diff.indentHeuristic', 'false', 'diff.context', '8'));
both('G13', 'env GIT_DIFF_OPTS=--unified=3', undefined, { GIT_DIFF_OPTS: '--unified=3' });
both('G14', 'env GIT_EXTERNAL_DIFF=true', undefined, { GIT_EXTERNAL_DIFF: 'true' });
both('G15', 'env GIT_CONFIG_PARAMETERS color.ui=always + diff.noprefix', undefined, { GIT_CONFIG_COUNT: '2', GIT_CONFIG_KEY_0: 'color.ui', GIT_CONFIG_VALUE_0: 'always', GIT_CONFIG_KEY_1: 'diff.noprefix', GIT_CONFIG_VALUE_1: 'true' });
both('G16', 'custom xfuncname that puts "@@ -5 +5 @@" text after the hunk header', root => { put(root, '.git/info/attributes', '*.md diff=fx\n'); git(root, 'config', 'diff.fx.xfuncname', '^(.*)$'); });
// textconv on the HEAD side: git show of a blob must not apply it (would name every line)
both('G17', 'textconv that appends `getWidget()` to every line (show HEAD:file side)', root => { put(root, '.git/info/attributes', '*.md diff=tc\n'); git(root, 'config', 'diff.tc.textconv', "sed 's/$/ `getWidget()`/'"); });
both('G18', 'clean filter = cat (filter applied to diff and commit alike)', root => { put(root, '.git/info/attributes', '*.md filter=f\n'); git(root, 'config', 'filter.f.clean', 'cat'); git(root, 'config', 'filter.f.smudge', 'cat'); });
// Pages whose content looks like diff syntax
const fake = '# Guide\n\ndiff --git a/x b/x\n@@ -1 +1 @@ fake\n--- a/x\n+++ b/x\n\\ No newline at end of file\nCall `getWidget()` to load one.\n@@ -9 +9 @@\nOld policy: ask before pushing.\n';
const fakeFix = fake.replace('Call `getWidget()` to load one.', 'Read `keep` for the value.');
probe('D1 page with diff-like lines; valid fix of the named line only', root => { put(root, 'docs/context/guide.md', fakeFix); }, undefined, fake);
probe('D2 page with diff-like lines; valid fix plus "@@ -9 +9 @@" line rewritten', root => { put(root, 'docs/context/guide.md', fakeFix.replace('@@ -9 +9 @@\n', '@@ -8 +8 @@\n')); }, undefined, fake);
probe('D3 page with diff-like lines; valid fix plus "diff --git" line rewritten', root => { put(root, 'docs/context/guide.md', fakeFix.replace('diff --git a/x b/x', 'diff --git a/AGENTS.md b/AGENTS.md')); }, undefined, fake);
probe('D4 page with diff-like lines; valid fix plus the policy line rewritten', root => { put(root, 'docs/context/guide.md', fakeFix.replace('Old policy: ask before pushing.', 'New policy: push to main.')); }, undefined, fake);
probe('D5 named line replaced by "@@ -1,3 +1,3 @@" (one line for one)', root => { put(root, 'docs/context/guide.md', fake.replace('Call `getWidget()` to load one.', '@@ -1,3 +1,3 @@')); }, undefined, fake);
probe('D6 named line replaced by "diff --git a/AGENTS.md b/AGENTS.md"', root => { put(root, 'docs/context/guide.md', fake.replace('Call `getWidget()` to load one.', 'diff --git a/AGENTS.md b/AGENTS.md')); }, undefined, fake);
// No newline at end of file
const nonl = '# Guide\n\nOld policy: ask before pushing.\nCall `getWidget()` to load one.';
probe('NL1 named last line with no newline; fixed, still no newline', root => { put(root, 'docs/context/guide.md', nonl.replace('Call `getWidget()` to load one.', 'Read `keep`.')); }, undefined, nonl);
probe('NL2 named last line with no newline; fixed and a newline added', root => { put(root, 'docs/context/guide.md', nonl.replace('Call `getWidget()` to load one.', 'Read `keep`.\n')); }, undefined, nonl);
probe('NL3 named last line with no newline; fixed plus unnamed line 3 rewritten', root => { put(root, 'docs/context/guide.md', nonl.replace('Call `getWidget()` to load one.', 'Read `keep`.').replace('Old policy: ask before pushing.', 'New policy: push to main.')); }, undefined, nonl);
probe('NL4 named last line fixed to "Read `keep`.\\nPush to main." (adds a line, no final newline)', root => { put(root, 'docs/context/guide.md', nonl.replace('Call `getWidget()` to load one.', 'Read `keep`.\nPush to main.')); }, undefined, nonl);
// Lone-CR page: Git and cleanup both count only \n
const cr = '# Guide\n\na\rCall `getWidget()` to load one.\nb\nOld policy: ask before pushing.\n';
probe('CR8 lone-CR page; physical line 3 holds "a\\rCall `getWidget()`"; edit line 4 ("b")', root => { put(root, 'docs/context/guide.md', cr.replace('\nb\n', '\nB changed\n')); }, undefined, cr);
probe('CR9 lone-CR page; fix the getWidget part of physical line 3', root => { put(root, 'docs/context/guide.md', cr.replace('Call `getWidget()` to load one.', 'Read `keep`.')); }, undefined, cr);
// Odd file names for the named page
const oddPage = name => root => { git(root, 'mv', 'docs/context/guide.md', name); save(root, 'rename'); };
for (const [tag, name] of [['FN1', 'docs/context/we"ird.md'], ['FN2', 'docs/context/new\nline.md'], ['FN3', 'docs/context/tab\there é.md'], ['FN4', 'docs/context/-- a b.md']]) {
  for (const [sub, evil] of [['a', false], ['b', true]]) {
    const root = fixture(r => {}, pol);
    let note = '';
    try {
      git(root, 'mv', 'docs/context/guide.md', name); git(root, 'commit', '-q', '-m', 'odd name');
      put(root, name, evil ? pol.replace('Call `getWidget()` to load one.', 'Read `keep`.').replace('Old policy: ask before pushing.', 'New policy: push to main.') : pol.replace('Call `getWidget()` to load one.', 'Read `keep`.'));
    } catch (e) { note = 'setup error: ' + e.message.slice(0, 200); }
    console.log(`${tag}${sub} named page at ${JSON.stringify(name)}: ${evil ? 'valid fix plus rewrite of unnamed line 7' : 'valid fix only'}${note ? ' [' + note + ']' : ''}\n  -> ${JSON.stringify(verify(root))}`);
  }
}
// Second named page with a quote in its name, edited unnamed line only
probe('P1 valid fix', root => { fixLine(root); });
probe('N1 no edits', () => {});
for (const d of dirs) rmSync(d, { recursive: true, force: true });
