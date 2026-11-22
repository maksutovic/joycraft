// Reviewer probe for test-release spec 12 (machine-local environment map in evidence.mjs).
// Usage: node spec-12-probe.mjs <project-root>
// Builds temp Git fixtures, runs payload evidence.mjs as a CLI, prints one line per check.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const repo = path.resolve(process.argv[2] ?? '.');
const script = path.join(repo, 'payload/.joycraft/runtime/evidence.mjs');
const map = '.joycraft/local/evidence-env.json';
let failures = 0;
const check = (name, ok, detail = '') => { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` :: ${detail}` : ''}`); };
const dirs = [];
const git = (cwd, ...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...a], { cwd, stdio: 'ignore' });
function project(body, { repo: useGit = true } = {}) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'jc-r12-probe-')));
  dirs.push(root);
  writeFileSync(path.join(root, '.gitignore'), 'receipts/\n.joycraft/local/\n');
  if (useGit) { git(root, 'init', '-q'); git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'init'); }
  if (body !== undefined) { mkdirSync(path.join(root, '.joycraft/local'), { recursive: true }); if (body !== null) writeFileSync(path.join(root, map), body); }
  return root;
}
const printer = 'console.log(JSON.stringify({ W: process.env.WORKERS, CI: process.env.CI, JE: process.env.JOYCRAFT_EVIDENCE, A: process.env.A, B: process.env.B, ci: process.env.ci }))';
const run = (root, receipt = 'receipts/a.log', code = printer) => {
  const r = spawnSync(process.execPath, [script, 'run', '--receipt', receipt, '--', process.execPath, '-e', code], { cwd: root, encoding: 'utf8' });
  const file = path.join(root, receipt);
  const text = existsSync(file) ? readFileSync(file, 'utf8') : null;
  const lines = text ? text.trimEnd().split('\n') : [];
  return { code: r.status, stderr: r.stderr.trim(), out: r.status === 0 ? JSON.parse(r.stdout) : null, child: lines.length > 1 && lines[0].startsWith('{') ? JSON.parse(lines[0]) : null,
    footer: lines.length ? JSON.parse(lines.at(-1).replace(/^joycraft-evidence: /, '')) : null, receiptExists: text !== null };
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

try {
  // 1. Spec's own fixture.
  let r = run(project(JSON.stringify({ WORKERS: '3', CI: '0' })), 'receipts/a.log', 'console.log(process.env.WORKERS, process.env.CI)');
  const first = r.receiptExists ? readFileSync(path.join(dirs.at(-1), 'receipts/a.log'), 'utf8').split('\n')[0] : null;
  check('spec fixture {"WORKERS":"3","CI":"0"} prints "3 1"', r.code === 0 && first === '3 1', `exit=${r.code} first=${JSON.stringify(first)}`);
  check('spec fixture result env = ["WORKERS"]', same(r.out?.env, ['WORKERS']), JSON.stringify(r.out?.env));
  check('spec fixture receipt footer env = ["WORKERS"]', same(r.footer?.env, ['WORKERS']), JSON.stringify(r.footer?.env));

  // 2. JOYCRAFT_EVIDENCE cannot be overridden.
  r = run(project(JSON.stringify({ JOYCRAFT_EVIDENCE: '0', CI: 'false', WORKERS: '2' })));
  check('map JOYCRAFT_EVIDENCE=0 and CI=false: child sees JE=1 CI=1', r.code === 0 && r.child?.JE === '1' && r.child?.CI === '1' && r.child?.W === '2', JSON.stringify(r.child));
  check('override names are not listed as applied', same(r.out?.env, ['WORKERS']) && same(r.footer?.env, ['WORKERS']), `${JSON.stringify(r.out?.env)} / ${JSON.stringify(r.footer?.env)}`);

  // 3. Values with spaces, newlines, quotes, empty string reach the child byte-exact.
  const tricky = { A: 'two words  and\ttab', B: 'line1\nline2\n"q" $HOME `x`' };
  r = run(project(JSON.stringify(tricky)));
  check('values with spaces/tabs pass exactly', r.code === 0 && r.child?.A === tricky.A, JSON.stringify(r.child?.A));
  check('values with newlines/quotes/$ pass exactly (no shell)', r.code === 0 && r.child?.B === tricky.B, JSON.stringify(r.child?.B));
  check('tricky map env list = ["A","B"]', same(r.out?.env, ['A', 'B']), JSON.stringify(r.out?.env));
  r = run(project(JSON.stringify({ A: '' })));
  check('empty-string value is applied as empty', r.code === 0 && r.child?.A === '' && same(r.out?.env, ['A']), JSON.stringify(r.child));

  // 4. Malformed maps refuse with exit 2, name the file, start no child and leave no receipt.
  for (const [label, body] of [['array', '["WORKERS"]'], ['number value', '{"WORKERS": 3}'], ['invalid JSON', '{not json'], ['null', 'null'],
    ['string top-level', '"WORKERS=3"'], ['nested object value', '{"A": {"b": "c"}}'], ['null value', '{"A": null}'], ['bool value', '{"A": true}'], ['empty file', '']]) {
    r = run(project(body));
    check(`malformed (${label}) exit 2, names file, no receipt`, r.code === 2 && r.stderr.includes(map) && !r.receiptExists, `exit=${r.code} receipt=${r.receiptExists} stderr=${r.stderr.slice(0, 120)}`);
  }
  // Map path is a directory.
  const dirRoot = project(null);
  mkdirSync(path.join(dirRoot, map));
  r = run(dirRoot);
  check('map path is a directory: exit 2 naming file', r.code === 2 && r.stderr.includes(map), `exit=${r.code} ${r.stderr.slice(0, 120)}`);

  // 5. Tracked maps refuse.
  let root = project(JSON.stringify({ WORKERS: '3' }));
  git(root, 'add', '-f', map); git(root, 'commit', '-q', '-m', 'track');
  r = run(root);
  check('committed map: exit 2 "must stay machine-local", no receipt', r.code === 2 && r.stderr.includes('must stay machine-local') && !r.receiptExists, `exit=${r.code} ${r.stderr.slice(0, 140)}`);
  root = project(JSON.stringify({ WORKERS: '3' }));
  git(root, 'add', '-f', map);
  r = run(root);
  check('staged (index only) map: exit 2 "must stay machine-local"', r.code === 2 && r.stderr.includes('must stay machine-local'), `exit=${r.code}`);
  root = project('{not json');
  git(root, 'add', '-f', map); git(root, 'commit', '-q', '-m', 'track');
  r = run(root);
  check('tracked AND malformed map still exit 2', r.code === 2, `exit=${r.code} ${r.stderr.slice(0, 120)}`);
  // Committed then removed from the index (git rm --cached): local file stays, no longer tracked.
  root = project(JSON.stringify({ WORKERS: '4' }));
  git(root, 'add', '-f', map); git(root, 'commit', '-q', '-m', 'track'); git(root, 'rm', '-q', '--cached', map);
  r = run(root);
  check('untracked again after git rm --cached: runs and applies', r.code === 0 && r.child?.W === '4', `exit=${r.code} ${r.stderr.slice(0, 120)}`);

  // 6. No map runs as before.
  r = run(project());
  check('no map: exit 0, no env key in result or footer, CI=1 JE=1', r.code === 0 && !('env' in (r.out ?? {})) && !('env' in (r.footer ?? {})) && r.child?.CI === '1' && r.child?.JE === '1', JSON.stringify(r.child));
  r = run(project(null));
  check('empty .joycraft/local/ folder, no map: runs as before', r.code === 0 && !('env' in (r.out ?? {})), `exit=${r.code}`);

  // 7. Edge cases the spec does not decide (follow-ups only).
  r = run(project('{}'));
  console.log(`INFO empty map {}: exit=${r.code} env=${JSON.stringify(r.out?.env)} footerEnv=${JSON.stringify(r.footer?.env)}`);
  r = run(project(JSON.stringify({ A: 'a\u0000b' })));
  console.log(`INFO NUL in value: exit=${r.code} namesFile=${r.stderr.includes(map)} receipt=${r.receiptExists} stderr=${r.stderr.slice(0, 160)}`);
  r = run(project(JSON.stringify({ 'A=B': 'c' })));
  console.log(`INFO "=" in name: exit=${r.code} env=${JSON.stringify(r.out?.env)} stderr=${r.stderr.slice(0, 120)}`);
  r = run(project(JSON.stringify({ ci: '0' })));
  console.log(`INFO lowercase ci on ${process.platform}: exit=${r.code} child.CI=${r.child?.CI} child.ci=${r.child?.ci} env=${JSON.stringify(r.out?.env)}`);
  r = run(project(JSON.stringify({ WORKERS: '5' }), { repo: false }));
  console.log(`INFO no Git repo: exit=${r.code} W=${r.child?.W} stderr=${r.stderr.slice(0, 120)}`);
} finally {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
}
console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
