// Reviewer probes for spec 11 (start advice). Usage: node spec-11-probe.mjs <repo-root> <scratch-dir>
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const [repo, scratch] = process.argv.slice(2);
const wiring = join(repo, 'payload/.joycraft/runtime/wiring.mjs');
const git = (cwd, args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file, body) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const save = (root, m) => { git(root, ['add', '-A']); git(root, ['commit', '-q', '-m', m]); };
const tmp = () => realpathSync(mkdtempSync(join(scratch, 'p-')));
const run = (root) => {
  const t = process.hrtime.bigint();
  const r = spawnSync('node', [wiring, '--root', root], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const ms = Number(process.hrtime.bigint() - t) / 1e6;
  let json = null; try { json = JSON.parse(r.stdout); } catch {}
  return { status: r.status, stderr: r.stderr, ms: Math.round(ms), tidy: json?.advice?.filter(a => a.check === 'tidy') ?? 'NO-JSON' };
};
// Every file under root (except .git objects) with mtime, to prove nothing is written.
const snapshot = (root) => {
  const out = {};
  const walk = (dir) => { for (const name of readdirSync(dir)) { const p = join(dir, name); if (name === 'node_modules' || p.includes('/.git/objects')) continue; const s = statSync(p); if (s.isDirectory()) walk(p); else out[p] = s.mtimeMs + ':' + s.size; } };
  walk(root);
  return createHash('sha256').update(JSON.stringify(out)).digest('hex').slice(0, 16) + ` (${Object.keys(out).length} files)`;
};
const log = (name, value) => console.log(`${name}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);

function project({ removed, guide, agents = '' }) {
  const root = tmp();
  git(root, ['init', '-q', '-b', 'main']);
  put(join(root, 'AGENTS.md'), `# P\n\n${agents}\n## Context Map\n\n| Document | Read it when |\n|---|---|\n| \`docs/context/guide.md\` | Always |\n`);
  put(join(root, 'src/w.ts'), 'export function aaaOne() {}\nexport function bbbTwo() {}\nexport function cccThree() {}\nexport function dddFour() {}\nexport function keepMe() {}\n');
  put(join(root, 'docs/context/guide.md'), guide);
  save(root, 'init');
  git(root, ['checkout', '-q', '-b', 'feature']);
  put(join(root, 'src/w.ts'), ['aaaOne', 'bbbTwo', 'cccThree', 'dddFour', 'keepMe'].filter(n => !removed.includes(n)).map(n => `export function ${n}() {}\n`).join(''));
  save(root, 'remove');
  return root;
}

// P1: four removed symbols named in the guide -> still at most 3 lines, last names tidy, count says 4.
{ const r = run(project({ removed: ['aaaOne', 'bbbTwo', 'cccThree', 'dddFour'], guide: '# G\n\n`aaaOne`\n\n`bbbTwo`\n\n`cccThree`\n\n`dddFour`\n' })); log('P1 four findings', r); }
// P2: removed symbol named only in AGENTS.md (entry file, report-only) -> no tidy advice.
{ const r = run(project({ removed: ['aaaOne'], agents: 'Call `aaaOne` first.\n', guide: '# G\n\nNothing.\n' })); log('P2 entry-file only', r); }
// P3: no Git at all -> no tidy advice, no stderr.
{ const root = tmp(); put(join(root, 'AGENTS.md'), '# P\n'); const r = run(root); log('P3 no git', r); }
// P4: trunk only (on main), symbol removed in a recent commit -> approximate range still finds it.
{ const root = tmp(); git(root, ['init', '-q', '-b', 'main']); put(join(root, 'AGENTS.md'), '# P\n\n## Context Map\n\n| Document | Read it when |\n|---|---|\n| `docs/context/guide.md` | Always |\n'); put(join(root, 'src/w.ts'), 'export function aaaOne() {}\n'); put(join(root, 'docs/context/guide.md'), '`aaaOne`\n'); save(root, 'a'); put(join(root, 'src/w.ts'), 'export const x = 1;\n'); save(root, 'b'); const r = run(root); log('P4 trunk only', r); }
// P5: exit code and no writes with a finding, files and git status compared before/after.
{ const root = project({ removed: ['aaaOne'], guide: '`aaaOne`\n' }); const st0 = git(root, ['status', '--porcelain']); const before = snapshot(root); const r = run(root); const after = snapshot(root); log('P5 run', r); log('P5 files before/after (snapshot taken after the reviewer git status, around the wiring run only)', `${before} / ${after}`); log('P5 status before/after', JSON.stringify([st0, git(root, ['status', '--porcelain'])])); }
// P6: dirty working tree (uncommitted edit) is left untouched.
{ const root = project({ removed: ['aaaOne'], guide: '`aaaOne`\n' }); put(join(root, 'docs/context/guide.md'), '`aaaOne` dirty\n'); const st0 = git(root, ['status', '--porcelain']); const r = run(root); log('P6 dirty', { status: r.status, lines: r.tidy?.[0]?.lines?.length, statusSame: st0 === git(root, ['status', '--porcelain']) }); }
