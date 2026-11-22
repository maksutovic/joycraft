// Reviewer probe for spec 10 (checks seam): real-tool output shapes, YAML forms, cwd.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
const runtime = resolve(process.argv[2]);
const git = (cwd, ...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@e', ...a], { cwd, stdio: 'ignore' });
const put = (r, f, b) => { mkdirSync(dirname(join(r, f)), { recursive: true }); writeFileSync(join(r, f), b); };
function project(yaml, files = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-s10-')));
  git(root, 'init', '-q', '-b', 'main');
  put(root, 'joycraft.yaml', yaml);
  for (const [f, b] of Object.entries(files)) put(root, f, b);
  git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'init');
  return root;
}
const run = (root, script, args, cwd = root) => spawnSync('node', [join(runtime, script), ...args], { cwd, encoding: 'utf8' });
function tidy(label, yaml, files, cwd) {
  const root = project(yaml, files);
  const r = run(root, 'cleanup.mjs', ['tidy'], cwd ? join(root, cwd) : root);
  let j; try { j = JSON.parse(r.stdout); } catch { j = null; }
  const own = j ? j.all?.filter(f => !['gone-symbol', 'new-doc'].includes(f.check)) ?? j.findings : null;
  console.log(`\n## ${label}\nexit ${r.status}\nfindings ${JSON.stringify(own?.map(({ check, path, line, detail }) => ({ check, path, line, detail })))}\nskipped ${JSON.stringify(j?.skipped)}${r.stderr ? `\nstderr ${r.stderr.trim().slice(0, 300)}` : ''}`);
  rmSync(root, { recursive: true, force: true });
}
function config(label, yaml) {
  const root = project(yaml);
  const r = run(root, 'config.mjs', []);
  console.log(`\n## config: ${label}\nexit ${r.status}\n${r.status === 0 ? JSON.stringify(JSON.parse(r.stdout).checks) : r.stderr.trim()}`);
  rmSync(root, { recursive: true, force: true });
}
const sh = body => ({ 'tool.sh': body });
// Output shapes taken from each tool's documented line formats.
tidy('vale --output=line shape', 'checks:\n  - name: vale\n    run: sh tool.sh\n', sh("echo \"docs/a.md:3:5:Vale.Spelling:Did you really mean 'teh'?\"\nexit 1\n"));
tidy('markdownlint-cli2 shape (with and without column, stderr)', 'checks:\n  - name: mdl\n    run: sh tool.sh\n', sh('echo "docs/a.md:3:81 MD013/line-length Line length" >&2\necho "docs/a.md:1 MD041/first-line-heading First line" >&2\nexit 1\n'));
tidy('knip default symbols reporter shape', 'checks:\n  - name: knip\n    run: sh tool.sh\n', sh('echo "Unused exports (1)"\necho "helper  function  src/a.ts:10:17"\nexit 1\n'));
tidy('eslint unix formatter (absolute path)', 'checks:\n  - name: eslint\n    run: sh tool.sh\n', sh('echo "$PWD/src/a.js:10:5: Unexpected var [Error/no-var]"\nexit 1\n'));
tidy('docaudit/drift line contract, exit 0', 'checks:\n  - name: drift\n    run: sh tool.sh\n', sh('echo "docs/context/x.md:4: names removed fn foo"\nexit 0\n'));
tidy('path with a space', 'checks:\n  - name: sp\n    run: sh tool.sh\n', sh('echo "docs/my notes.md:2: bad"\nexit 1\n'));
tidy('CRLF output', 'checks:\n  - name: crlf\n    run: sh tool.sh\n', sh("printf 'docs/a.md:2: bad\\r\\n'\nexit 1\n"));
tidy('clean check exit 0, no output', 'checks:\n  - name: ok\n    run: "true"\n', {});
tidy('failing check, no line output', 'checks:\n  - name: noisy\n    run: sh tool.sh\n', sh('echo "2 problems"\nexit 2\n'));
tidy('not-found inside a pipeline', 'checks:\n  - name: piped\n    run: definitely-not-a-tool-xyz | cat\n', {});
tidy('quoted run with glob (template example form)', 'checks:\n  - name: q\n    run: sh tool.sh "docs/**/*.md"\n', sh('echo "docs/a.md:1: arg=$1"\nexit 1\n'));
tidy('run from a subdirectory', 'checks:\n  - name: here\n    run: sh tool.sh\n', { ...sh('echo "docs/a.md:1: cwd=$PWD"\nexit 1\n'), 'docs/a.md': '# a\n' }, 'docs');
tidy('two checks, one missing', 'checks:\n  - name: ghost\n    run: definitely-not-a-tool-xyz\n  - name: real\n    run: sh tool.sh\n', sh('echo "docs/a.md:1: hi"\nexit 1\n'));
config('template example parses', 'checks:\n  - name: markdownlint\n    run: npx markdownlint-cli2 "docs/**/*.md"\n    timeout: 300\n');
config('run with colon and hash', "checks:\n  - name: c\n    run: sh -c 'echo a: b' # note\n");
config('flow-map entry', 'checks: [{name: x, run: y}]\n');
config('no name', 'checks:\n  - run: x\n');
config('unknown key', 'checks:\n  - name: x\n    run: y\n    args: z\n');
config('checks as map', 'checks:\n  name: x\n');
