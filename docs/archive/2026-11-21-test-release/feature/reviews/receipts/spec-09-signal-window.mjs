// Reviewer probe for spec 9: SIGTERM sent across the first ~200 ms of a --patch run, in temp repos only.
// Usage: node spec-09-signal-window.mjs <project-root>. Prints each delay where the fault stayed in the tree.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const script = path.join(path.resolve(process.argv[2] ?? '.'), 'payload/.joycraft/runtime/evidence.mjs');
const git = (cwd, ...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@e', ...a], { cwd, encoding: 'utf8' });
const good = 'export const add = (a, b) => a + b;\n'; const bad = 'export const add = (a, b) => a - b;\n';
let left = 0, total = 0;
for (let round = 0; round < 3; round++) for (let delay = 40; delay <= 200; delay += 8) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'jc-r9-sig-')));
  git(root, 'init', '-q'); writeFileSync(path.join(root, '.gitignore'), 'receipts/\n'); writeFileSync(path.join(root, 'add.mjs'), good);
  git(root, 'add', '.'); git(root, 'commit', '-qm', 'i'); writeFileSync(path.join(root, 'add.mjs'), bad); mkdirSync(path.join(root, 'receipts'));
  writeFileSync(path.join(root, 'receipts/fault.diff'), git(root, 'diff')); git(root, 'checkout', '--', 'add.mjs');
  const child = spawn(process.execPath, [script, 'run', '--receipt', 'receipts/r.log', '--patch', 'receipts/fault.diff', '--', process.execPath, '-e', 'setTimeout(()=>{},30000)'], { cwd: root, stdio: 'ignore' });
  spawnSync('sleep', [String(delay / 1000)]);
  const how = await new Promise(resolve => { child.on('exit', (c, s) => resolve(`${c}/${s}`)); child.kill('SIGTERM'); });
  total++;
  const stayed = readFileSync(path.join(root, 'add.mjs'), 'utf8') === bad;
  if (stayed) { left++; console.log(`FAULT LEFT delay=${delay}ms exit=${how} status="${git(root, 'status', '--porcelain').trim()}"`); }
  rmSync(root, { recursive: true, force: true });
}
console.log(`signal window: fault left in ${left} of ${total} early SIGTERM runs`);
