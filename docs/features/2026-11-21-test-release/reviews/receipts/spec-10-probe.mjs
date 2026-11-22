// Reviewer probe for test-release spec 10 (queue-end load line in status.mjs).
// Usage: node spec-10-probe.mjs <project-root>
// Builds temp Git fixtures, writes receipts, runs payload status.mjs as a CLI, prints one line per check.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = path.resolve(process.argv[2] ?? '.');
const script = path.join(repo, 'payload/.joycraft/runtime/status.mjs');
const { runEvidence } = await import(pathToFileURL(path.join(repo, 'payload/.joycraft/runtime/evidence.mjs')).href);
let failures = 0;
const check = (name, ok, detail = '') => { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` :: ${detail}` : ''}`); };
const dirs = [];
const folder = 'docs/features/demo';
const queuePath = `${folder}/specs/.joycraft-spec-queue.json`;
const put = (file, body) => { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, body); };
const git = (cwd, ...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...a], { cwd, stdio: 'ignore' });
function project() {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'jc-r10-probe-')));
  dirs.push(root);
  put(path.join(root, '.gitignore'), 'receipts/\n');
  put(path.join(root, folder, 'specs/01-a.md'), '---\nid: 1\nstatus: todo\n---\n# A\n');
  put(path.join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: 'demo', specs: [{ id: 1, file: '01-a.md', depends_on: [], status: 'todo', mode: 'batch', verification: {
    inputs: [{ path: `${folder}/specs/01-a.md`, kind: 'requirement' }],
    criteria: [{ id: 'a', requirement: { path: `${folder}/specs/01-a.md`, anchor: 'a' }, requiredKinds: ['runtime'] }] } }] }));
  git(root, 'init', '-q'); git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'init');
  return root;
}
const footer = (f) => `joycraft-evidence: ${JSON.stringify({ wallMs: 10, cores: 8, argv: ['x'], exitCode: 0, ...f })}\n`;
const receipt = (root, rel, f) => put(path.join(root, rel), `output line\n${f ? footer(f) : ''}`);
const status = (root) => {
  const r = spawnSync(process.execPath, [script, '--root', root], { encoding: 'utf8' });
  return { code: r.status, stderr: r.stderr, demo: r.status === 0 || r.status === 2 ? JSON.parse(r.stdout).features.find(x => x.feature === 'demo') : null, all: r.stdout };
};
const cite = (root, name, paths) => put(path.join(root, folder, 'reviews', name), JSON.stringify({ verdict: 'PASS', subject: { queuePath, specId: 1 },
  flows: [{ observations: [{ receipts: paths.map(p => ({ path: p, sha256: '0'.repeat(64) })) }] }] }));

try {
  // 1. The spec's own check: 3 receipts, 2 loaded -> "2 of 3 ..." (cores 8), one line, a number.
  {
    const root = project();
    receipt(root, `${folder}/receipts/a.log`, { load: [12, 10], loaded: true });
    receipt(root, `${folder}/receipts/b.log`, { load: [9, 9], loaded: true });
    receipt(root, `${folder}/receipts/c.log`, { load: [2, 2], loaded: false });
    const s = status(root);
    check('spec check: exit 0', s.code === 0, s.stderr);
    check('spec check: exact sentence', s.demo?.load === "2 of 3 test runs started above the core count (8 cores). Cap workers per run with the runner's own flag; see setup.", JSON.stringify(s.demo?.load));
    check('spec check: one line, no newline', typeof s.demo?.load === 'string' && !s.demo.load.includes('\n'));
    check('spec check: names numbers', /^\d+ of \d+ .*\(\d+ cores\)/.test(s.demo?.load ?? ''));
  }
  // 2. Receipts written by the real payload evidence runner (footer shape from spec 3); stub load by count only.
  {
    const root = project();
    await runEvidence({ root, receipt: `${folder}/receipts/real.log`, argv: [process.execPath, '-e', 'console.log(1)'] });
    const s = status(root);
    check('real receipt: status exits 0', s.code === 0, s.stderr);
    // Whether it is loaded depends on this machine; check only the shape when present.
    check('real receipt: load absent or "<n> of 1"', s.demo && (!('load' in s.demo) || /^1 of 1 test runs/.test(s.demo.load)), JSON.stringify(s.demo?.load));
  }
  // 3. Old receipts without footers next to loaded:false ones: no load field, rest of output unchanged.
  {
    const root = project();
    const before = status(root);
    receipt(root, `${folder}/receipts/old1.log`);
    receipt(root, `${folder}/receipts/old2.log`);
    receipt(root, `${folder}/receipts/q.log`, { load: [1, 1], loaded: false });
    const after = status(root);
    check('no loaded: no load field', after.demo && !('load' in after.demo));
    check('no loaded: rest of output identical to no receipts', JSON.stringify(before.demo) === JSON.stringify(after.demo));
  }
  // 4. Footerless old receipts are not counted in m when mixed with a loaded one.
  {
    const root = project();
    receipt(root, `${folder}/receipts/old.log`);
    receipt(root, `${folder}/receipts/hot.log`, { load: [20, 20], loaded: true });
    check('mixed: footerless not in m', status(root).demo?.load?.startsWith('1 of 1 '), JSON.stringify(status(root).demo?.load));
  }
  // 5. Report cites a missing file, an escaping path and an absolute path: ignored, no crash.
  {
    const root = project();
    receipt(root, `${folder}/receipts/hot.log`, { load: [20, 20], loaded: true });
    cite(root, 'r.json', ['receipts/missing.log', '../outside.log', '/etc/hosts', `./${folder}/receipts/hot.log`]);
    const s = status(root);
    check('bad cites: exit 0', s.code === 0, s.stderr);
    check('bad cites: ./-prefixed duplicate counted once', s.demo?.load?.startsWith('1 of 1 '), JSON.stringify(s.demo?.load));
  }
  // 6. Malformed footer JSON and a footer that is not the last line: not counted.
  {
    const root = project();
    put(path.join(root, folder, 'receipts/bad.log'), 'x\njoycraft-evidence: {not json\n');
    put(path.join(root, folder, 'receipts/mid.log'), `x\n${footer({ load: [20, 20], loaded: true })}more output\n`);
    const s = status(root);
    check('malformed footers: exit 0 and no load', s.code === 0 && s.demo && !('load' in s.demo), JSON.stringify(s.demo?.load));
  }
  // 7. Status writes nothing: porcelain status (ignored files included) is the same before and after.
  {
    const root = project();
    receipt(root, `${folder}/receipts/hot.log`, { load: [20, 20], loaded: true });
    const look = () => execFileSync('git', ['status', '--porcelain', '--ignored'], { cwd: root, encoding: 'utf8' });
    const before = look();
    status(root);
    const after = look();
    check('read only: no new or changed files after status', before === after, `${before} -> ${after}`);
  }
  // 8. Loaded footer without integer cores: falls back to 0 cores (observed, recorded for follow-up).
  {
    const root = project();
    receipt(root, `${folder}/receipts/nocores.log`, { cores: null, load: [20, 20], loaded: true });
    console.log(`INFO loaded footer without cores gives: ${JSON.stringify(status(root).demo?.load)}`);
  }
} finally {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
}
console.log(failures ? `${failures} check(s) failed` : 'all checks passed');
process.exitCode = failures ? 1 : 0;
