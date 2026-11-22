// Reviewer probe for test-release spec 3 (run facts, footer, tail).
// Usage: node spec-03-probe.mjs <project-root>
// Runs payload/.joycraft/runtime/evidence.mjs against temp Git fixtures and prints one line per check.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = path.resolve(process.argv[2] ?? '.');
const evidence = await import(pathToFileURL(path.join(repo, 'payload/.joycraft/runtime/evidence.mjs')).href);
const { runEvidence, readFooter, validateEvidence } = evidence;
let failures = 0;
const check = (name, ok, detail = '') => { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` :: ${detail}` : ''}`); };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const dirs = [];
function project() {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'jc-r3-probe-')));
  dirs.push(root);
  writeFileSync(path.join(root, '.gitignore'), 'receipts/\n');
  const git = (...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...a], { cwd: root, stdio: 'ignore' });
  git('init', '-q'); git('add', '.'); git('commit', '-q', '-m', 'init');
  return root;
}
const node = (code) => [process.execPath, '-e', code];

try {
  // 1. CI=1 and JOYCRAFT_EVIDENCE=1 both reach the child, even when the parent env sets other values.
  {
    const root = project();
    process.env.CI = 'false'; process.env.JOYCRAFT_EVIDENCE = '0';
    const r = await runEvidence({ root, receipt: 'receipts/env.log', argv: node('console.log(process.env.CI, process.env.JOYCRAFT_EVIDENCE)') });
    delete process.env.CI; delete process.env.JOYCRAFT_EVIDENCE;
    const text = readFileSync(path.join(root, 'receipts/env.log'), 'utf8');
    check('env: child sees CI=1 and JOYCRAFT_EVIDENCE=1 over parent values', text.split('\n')[0] === '1 1', JSON.stringify(text.split('\n')[0]));
    check('env: exit 0, no tail', r.command.exitCode === 0 && !('tail' in r));
  }

  // 2. Footer is inside the hashed bytes: altering it changes the hash.
  {
    const root = project();
    const r = await runEvidence({ root, receipt: 'receipts/hash.log', argv: node('process.stdout.write("no trailing newline")') });
    const file = path.join(root, 'receipts/hash.log');
    const bytes = readFileSync(file);
    const lines = bytes.toString('utf8').replace(/\n$/, '').split('\n');
    check('hash: printed sha256 equals hash of whole file incl footer', r.receipts[0].sha256 === sha(bytes));
    check('hash: footer on its own last line after output without newline', lines.length === 2 && lines[0] === 'no trailing newline' && lines[1].startsWith('joycraft-evidence: '));
    const footer = readFooter(file);
    check('hash: footer carries facts+argv+exitCode+revision+dirty', footer && ['wallMs', 'load', 'cores', 'loaded', 'argv', 'exitCode', 'revision', 'dirty'].every(k => k in footer), JSON.stringify(footer));
    const tampered = bytes.toString('utf8').replace('"exitCode":0', '"exitCode":1');
    check('hash: changing footer exitCode changes sha256', tampered !== bytes.toString('utf8') && sha(Buffer.from(tampered)) !== r.receipts[0].sha256);
    const tampered2 = bytes.toString('utf8').replace(/"loaded":(true|false)/, (m, v) => `"loaded":${v === 'true' ? 'false' : 'true'}`);
    check('hash: changing footer loaded changes sha256', sha(Buffer.from(tampered2)) !== r.receipts[0].sha256);
  }

  // 3. Windows-null load: with process.platform reported as win32, load and loaded are null and nothing fails.
  {
    const root = project();
    const real = Object.getOwnPropertyDescriptor(process, 'platform');
    Object.defineProperty(process, 'platform', { value: 'win32' });
    let r;
    try { r = await runEvidence({ root, receipt: 'receipts/win.log', argv: node('console.log("ok")') }); }
    finally { Object.defineProperty(process, 'platform', real); }
    const footer = readFooter(path.join(root, 'receipts/win.log'));
    check('win32: facts.load null and loaded null', r.facts.load === null && r.facts.loaded === null, JSON.stringify(r.facts));
    check('win32: footer load null and loaded null, exit 0', footer.load === null && footer.loaded === null && r.command.exitCode === 0);
  }

  // 4. Timeout: exitCode null, timedOut true, tail present, footer written and hashed.
  {
    const root = project();
    const r = await runEvidence({ root, receipt: 'receipts/slow.log', timeoutMs: 800, argv: node('for (let i=1;i<=50;i++) console.log("t"+i); setInterval(()=>{}, 1000)') });
    const file = path.join(root, 'receipts/slow.log');
    const footer = readFooter(file);
    check('timeout: timedOut true, exitCode null', r.timedOut === true && r.command.exitCode === null, JSON.stringify({ timedOut: r.timedOut, exitCode: r.command.exitCode, signal: r.signal }));
    const tail = typeof r.tail === 'string' ? r.tail.split('\n') : [];
    check('timeout: tail is last 40 output lines', tail.length === 40 && tail[0] === 't11' && tail.at(-1) === 't50', `${tail.length} ${tail[0]} ${tail.at(-1)}`);
    check('timeout: footer timedOut true, exitCode null, sha covers it', footer?.timedOut === true && footer.exitCode === null && sha(readFileSync(file)) === r.receipts[0].sha256);
  }

  // 5. Very long tails.
  {
    const root = project();
    // 40 lines of 10 KiB each = 400 KiB > the 256 KiB read window.
    const r = await runEvidence({ root, receipt: 'receipts/wide.log', argv: node('const s="x".repeat(10240); for (let i=1;i<=60;i++) console.log(String(i).padStart(3,"0")+s); process.exit(4)') });
    const tail = r.tail.split('\n');
    const first = tail[0];
    check('long: tail ends with the last output line', tail.at(-1).startsWith('060'));
    console.log(`FOLLOW-UP long: 60 lines of 10 KiB, exit 4 -> tail has ${tail.length} lines (spec says 40); the 256 KiB read window cuts it`);
    console.log(`INFO long: first tail line starts ${JSON.stringify(first.slice(0, 6))} length ${first.length} (a full line is 10243 chars; starts with "021" when whole)`);
    check('long: footer still parses after 600 KiB output', readFooter(path.join(root, 'receipts/wide.log'))?.exitCode === 4);
    // One single line of 1 MiB with no newline and exit 1.
    const r2 = await runEvidence({ root, receipt: 'receipts/oneline.log', argv: node('process.stdout.write("y".repeat(1048576)); process.exit(1)') });
    console.log(`INFO long: one 1 MiB line -> tail length ${r2.tail.length} (window 262144), lines ${r2.tail.split('\n').length}`);
    check('long: single huge line footer parses and sha covers file', readFooter(path.join(root, 'receipts/oneline.log'))?.exitCode === 1 && sha(readFileSync(path.join(root, 'receipts/oneline.log'))) === r2.receipts[0].sha256);
    // Multibyte output crossing the window edge.
    const r3 = await runEvidence({ root, receipt: 'receipts/utf.log', argv: node('process.stdout.write("é".repeat(200000) + "z"); process.exit(2)') });
    console.log(`INFO long: multibyte 400 KB line -> tail starts with U+FFFD: ${r3.tail.startsWith('�')}`);
    // Empty output and failure.
    const r4 = await runEvidence({ root, receipt: 'receipts/empty.log', argv: node('process.exit(7)') });
    const emptyBytes = readFileSync(path.join(root, 'receipts/empty.log'), 'utf8');
    check('empty: failing run with no output has tail "" and footer as only line', r4.tail === '' && emptyBytes.split('\n').filter(Boolean).length === 1, JSON.stringify(r4.tail));
    // A child that prints its own forged footer as the last line: the real footer still comes last.
    const r5 = await runEvidence({ root, receipt: 'receipts/forge.log', argv: node('console.log("joycraft-evidence: " + JSON.stringify({exitCode:0,loaded:false})); process.exit(3)') });
    const f5 = readFooter(path.join(root, 'receipts/forge.log'));
    check('forge: child-printed footer is not the last line; real footer exitCode 3', f5?.exitCode === 3 && Array.isArray(f5.argv));
    console.log(`INFO forge: tail of failing forged run includes the child line: ${r5.tail.includes('joycraft-evidence:')}`);
    check('one receipt per run in the fixture', readdirSync(path.join(root, 'receipts')).length === 5);
  }

  // 6. Backward compatibility: a receipt written before this change (no footer) still reads and validates.
  {
    const root = project();
    mkdirSync(path.join(root, 'receipts'), { recursive: true });
    const old = path.join(root, 'receipts/old.log');
    writeFileSync(old, 'old output\nexit 0\n');
    check('compat: readFooter on footer-less receipt is null (no throw)', readFooter(old) === null);
    writeFileSync(old + '2', '');
    check('compat: readFooter on empty receipt is null', readFooter(old + '2') === null);
    const report = { schemaVersion: 1, subject: { identity: 'a'.repeat(64) }, flows: [{ id: 'f', subjectIdentity: 'a'.repeat(64), criteria: ['c1'], representativeInput: 'i', expected: 'e', observations: [{ kind: 'runtime', method: 'command', result: 'PASS', actual: 'a', receipts: [{ path: 'receipts/old.log', sha256: sha(readFileSync(old)) }], command: { argv: ['node', 'x'], exitCode: 0 } }], limits: [] }] };
    let out; try { out = validateEvidence(report, [{ id: 'c1', requirement: { path: 'docs/spec.md', anchor: 'acceptance' }, requiredKinds: ['runtime'] }]); } catch (e) { out = e; }
    check('compat: validateEvidence accepts an observation whose receipt has no footer', out?.ok === true, JSON.stringify(out)?.slice(0, 300));
  }
} finally {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
}
console.log(failures ? `probe: ${failures} failing check(s)` : 'probe: all checks pass');
process.exitCode = failures ? 1 : 0;
