// Reviewer probe for test-release spec 2 (tests: section in joycraft.yaml).
// Usage: node spec-02-probe.mjs <project-root>
// Runs payload/.joycraft/runtime/config.mjs as a CLI against temp fixtures and prints one line per check.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = path.resolve(process.argv[2] ?? '.');
const runtime = path.join(repo, 'payload/.joycraft/runtime/config.mjs');
const { parseYaml, defaults } = await import(pathToFileURL(runtime).href);
let failures = 0;
const check = (name, ok, detail = '') => { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` :: ${detail}` : ''}`); };
const dirs = [];
const fixture = yaml => {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'jc-r2-probe-')));
  dirs.push(root);
  if (yaml !== undefined) writeFileSync(path.join(root, 'joycraft.yaml'), yaml);
  return root;
};
const run = root => spawnSync(process.execPath, [runtime, '--root', root], { encoding: 'utf8' });
const sorted = o => o && Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
const tests = r => { try { return sorted(JSON.parse(r.stdout).tests); } catch { return undefined; } };

try {
  // AC1: the spec's own values, block form; also unquoted {files} and all three commands.
  {
    const r = run(fixture('tests:\n  focused: "pnpm test {files}"\n  gate: "pnpm verify"\n  gateRuns: wave\n'));
    check('ac1 spec fixture (block form)', r.status === 0 && JSON.stringify(tests(r)) === JSON.stringify(sorted({ focused: 'pnpm test {files}', gate: 'pnpm verify', gateRuns: 'wave' })), `exit ${r.status} tests ${JSON.stringify(tests(r))}`);
    const r2 = run(fixture('tests:\n  focused: pnpm test {files}\n  gate: pnpm test && pnpm typecheck\n  full: pnpm test:all # CI too\n  gateRuns: spec\n'));
    check('ac1 unquoted {files}, && and trailing comment', r2.status === 0 && JSON.stringify(tests(r2)) === JSON.stringify(sorted({ gateRuns: 'spec', focused: 'pnpm test {files}', gate: 'pnpm test && pnpm typecheck', full: 'pnpm test:all' })), `exit ${r2.status} tests ${JSON.stringify(tests(r2))}`);
    const r3 = run(fixture('tests: { focused: "pnpm test {files}", gate: "pnpm verify", gateRuns: wave }\n'));
    check('ac1 flow-map form is refused with its line (parser has no flow maps)', r3.status === 1 && /line 1/.test(r3.stderr), `exit ${r3.status} stderr ${r3.stderr.trim()}`);
  }
  // AC2: no joycraft.yaml, an existing file without tests:, and an empty tests: section.
  {
    for (const [name, yaml] of [['no joycraft.yaml', undefined], ['joycraft.yaml without tests:', 'paths:\n  features: docs/features\n'], ['empty tests: section', 'tests:\n']]) {
      const r = run(fixture(yaml));
      check(`ac2 ${name}`, r.status === 0 && JSON.stringify(tests(r)) === JSON.stringify({ gateRuns: 'spec' }), `exit ${r.status} tests ${JSON.stringify(tests(r))}`);
    }
    const r = run(fixture());
    const out = JSON.parse(r.stdout);
    check('ac2 other sections unchanged (paths default)', JSON.stringify(out.paths) === JSON.stringify(defaults.paths), JSON.stringify(out.paths));
  }
  // AC3: bad values exit 1 and name tests.<key>.
  {
    const cases = [
      ['unknown key', 'tests:\n  slow: pnpm slow\n', 'tests.slow'],
      ['empty quoted command', 'tests:\n  gate: ""\n', 'tests.gate'],
      ['blank command', 'tests:\n  focused: "   "\n', 'tests.focused'],
      ['null command (key with no value)', 'tests:\n  full:\n', 'tests.full'],
      ['number command', 'tests:\n  gate: 5\n', 'tests.gate'],
      ['bad gateRuns', 'tests:\n  gateRuns: daily\n', 'tests.gateRuns'],
      ['gateRuns as a duration', 'tests:\n  gateRuns: 60\n', 'tests.gateRuns'],
      ['empty gateRuns', 'tests:\n  gateRuns:\n', 'tests.gateRuns'],
    ];
    for (const [name, yaml, key] of cases) {
      const r = run(fixture(yaml));
      check(`ac3 ${name}`, r.status === 1 && r.stderr.includes(key), `exit ${r.status} stderr ${r.stderr.trim()}`);
    }
    const r = run(fixture('tests:\n  - pnpm test\n'));
    check('ac3 tests as a list is refused', r.status === 1 && /tests must be a map/.test(r.stderr), `exit ${r.status} stderr ${r.stderr.trim()}`);
  }
  // AC4: the template.
  {
    const body = readFileSync(path.join(repo, 'payload/.joycraft/templates/joycraft.yaml'), 'utf8');
    check('ac4 template parses with tests undefined', parseYaml(body).tests === undefined);
    const r = run(fixture(body));
    check('ac4 template reads as the defaults', r.status === 0 && JSON.stringify(tests(r)) === JSON.stringify({ gateRuns: 'spec' }), `exit ${r.status}`);
    const section = body.slice(body.indexOf('# tests:'));
    check('ac4 # tests: and the four keys commented', body.includes('# tests:') && ['focused', 'gate', 'full', 'gateRuns'].every(k => new RegExp(`^#\\s+${k}:`, 'm').test(section)));
    check('ac4 no machine number in the section', !/\d/.test(section), JSON.stringify(section.match(/.*\d.*/g)));
    const uncommented = section.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    const block = section.slice(section.lastIndexOf('\n# tests:') + 1).split('\n').map(l => l.replace(/^# ?/, '')).filter(l => /^tests:\s*$|^\s+\w+:/.test(l)).join('\n') + '\n';
    const r2 = run(fixture(block));
    check('ac4 uncommenting the template block gives a valid config', uncommented.length === 0 && r2.status === 0, `exit ${r2.status} tests ${JSON.stringify(tests(r2))} stderr ${r2.stderr.trim()}`);
  }
} finally {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
}
console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
