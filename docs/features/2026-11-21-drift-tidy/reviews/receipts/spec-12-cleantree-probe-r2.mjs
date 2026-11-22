// Reviewer probe (spec 12, round 2): does the skill's clean-tree guard
// (`git status --porcelain` prints nothing) agree with `cleanup.mjs tidy --verify`?
// Usage: node <this file> <path to cleanup.mjs>
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const cleanup = path.resolve(process.argv[2]);
const root = mkdtempSync(path.join(tmpdir(), 'spec12-r2-'));
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const porcelain = () => git('status', '--porcelain');
const verify = () => {
  try { return JSON.parse(execFileSync('node', [cleanup, 'tidy', '--verify', '--root', root], { encoding: 'utf8' })); }
  catch (error) { return JSON.parse(error.stdout); }
};
const show = (label) => {
  const p = porcelain();
  const v = verify();
  console.log(`${label}: porcelain=${JSON.stringify(p)} verify.status=${v.status} refused=${JSON.stringify(v.refused.map(r => `${r.path}: ${r.reason}`))}`);
};
try {
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'probe@example.invalid');
  git('config', 'user.name', 'probe');
  mkdirSync(path.join(root, 'docs/context'), { recursive: true });
  writeFileSync(path.join(root, 'docs/context/guide.md'), '# Guide\n\nA line.\n');
  writeFileSync(path.join(root, 'docs/context/decision-log.md'), '# Decisions\n');
  writeFileSync(path.join(root, '.gitignore'), 'local/\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'init');
  show('1 clean tree');
  mkdirSync(path.join(root, 'local'));
  writeFileSync(path.join(root, 'local/x.json'), '{}');
  show('2 only an ignored file');
  writeFileSync(path.join(root, 'notes.txt'), 'user notes\n');
  show('3 untracked user file');
  rmSync(path.join(root, 'notes.txt'));
  writeFileSync(path.join(root, 'docs/context/decision-log.md'), '# Decisions\n\n- a session-end record row\n');
  show('4 session-end record row written before tidy');
  git('checkout', '--', 'docs/context/decision-log.md');
  git('update-index', '--assume-unchanged', 'docs/context/guide.md');
  writeFileSync(path.join(root, 'docs/context/guide.md'), '# Guide\n\nAn edit hidden from status.\n');
  show('5 assume-unchanged edit hidden from porcelain');
} finally {
  rmSync(root, { recursive: true, force: true });
}
