// Reviewer probes for drift-tidy spec 8 (as-is archive). Builds temp git fixtures and drives the CLI.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const runtime = process.argv[2];
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8' }).trim();
const put = (file, body) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const hash = b => createHash('sha256').update(b).digest('hex');
const source = 'docs/features/x', queuePath = `${source}/specs/.joycraft-spec-queue.json`;
let failures = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` :: ${detail}` : ''}`); if (!ok) failures += 1; };

function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-spec8-probe-')));
  git(root, 'init', '-q', '-b', 'main');
  put(join(root, `${source}/brief.md`), '# Brief\n');
  put(join(root, `${source}/specs/01-a.md`), '---\nid: 1\nstatus: in-review\n---\n# A\n');
  // A report kept inside the feature folder.
  put(join(root, `${source}/reviews/spec-1.report.json`), '{"schemaVersion":1,"verdict":"FAIL"}\n');
  put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: 'x', specs: [
    { id: 1, file: '01-a.md', status: 'in-review', mode: 'batch', depends_on: [], verification: { inputs: [] }, submitted: { at: '2026-11-21T00:00:00Z' } },
  ] }, null, 2));
  put(join(root, 'docs/context/decision-log.md'), '# Decisions\n');
  put(join(root, '.joycraft/local/attest.json'), JSON.stringify({ schemaVersion: 1, phase: 'session-end', host: { sessionId: 's', quiescent: true, activeWorkers: [], dependentWork: [] }, durableContext: { carried: true, references: ['docs/context/decision-log.md'] } }));
  git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'init');
  return root;
}
const archive = (root, ...flags) => spawnSync(process.execPath, [runtime, 'archive', '--feature', 'x', '--phase', 'session-end', '--attestation', '.joycraft/local/attest.json', ...flags], { cwd: root, encoding: 'utf8' });

// P1: preview (no --apply) with --as-is writes nothing.
{
  const root = fixture();
  const r = archive(root, '--as-is', '--owner-instruction', 'archive it');
  check('P1 as-is preview exits 0', r.status === 0, `status=${r.status} stderr=${r.stderr.trim()}`);
  check('P1 preview leaves source and writes no archive', existsSync(join(root, source)) && !existsSync(join(root, 'docs/archive')));
  rmSync(root, { recursive: true, force: true });
}
// P2: report inside the feature folder is moved byte-identical; multi-line instruction kept verbatim in manifest.
{
  const root = fixture();
  const reportBytes = readFileSync(join(root, `${source}/reviews/spec-1.report.json`));
  const instruction = 'Line one: archive x as is.\n  Line two keeps *markdown* and `ticks`.';
  const r = archive(root, '--as-is', '--owner-instruction', instruction, '--apply');
  check('P2 as-is apply exits 0', r.status === 0, `status=${r.status} stderr=${r.stderr.trim()}`);
  const moved = join(root, 'docs/archive/x/feature/reviews/spec-1.report.json');
  check('P2 in-folder report bytes preserved', existsSync(moved) && readFileSync(moved).equals(reportBytes));
  const manifest = JSON.parse(readFileSync(join(root, 'docs/archive/x/archive-replay.json'), 'utf8'));
  check('P2 manifest ownerInstruction verbatim', manifest.asIs?.ownerInstruction === instruction);
  const note = readFileSync(join(root, 'docs/archive/x/unverified.md'), 'utf8');
  check('P2 note quotes each instruction line verbatim', note.includes('> Line one: archive x as is.\n>   Line two keeps *markdown* and `ticks`.'));
  check('P2 note names spec 1', note.includes('- Spec 1 (`01-a.md`): status in-review'));
  check('P2 note has no "accepted" claim beyond the disclaimer', !/\bwas accepted\b|\bverified\b(?! or)/i.test(note.replace('Nothing here says that it was accepted or verified.', '')));
  check('P2 manifest historical.currentAcceptanceRenewed false', manifest.historical?.currentAcceptanceRenewed === false);
  check('P2 manifest evidence empty (nothing accepted)', Array.isArray(manifest.evidence) && manifest.evidence.length === 0, JSON.stringify(manifest.evidence));
  rmSync(root, { recursive: true, force: true });
}
// P3: whitespace-only instruction is refused.
{
  const root = fixture();
  const r = archive(root, '--as-is', '--owner-instruction', '   ', '--apply');
  check('P3 whitespace-only instruction refused', r.status !== 0 && existsSync(join(root, source)), `status=${r.status} stderr=${r.stderr.trim()}`);
  rmSync(root, { recursive: true, force: true });
}
// P4: --owner-instruction without --as-is is refused and the default refusal stands.
{
  const root = fixture();
  const r = archive(root, '--owner-instruction', 'archive it', '--apply');
  check('P4 instruction without --as-is refused', r.status !== 0 && existsSync(join(root, source)), `status=${r.status} stderr=${r.stderr.trim()}`);
  const d = archive(root, '--apply');
  check('P4 default archive still refuses (folder stays)', d.status === 1 && /^Archive stopped: /.test(d.stderr) && existsSync(join(root, source)), `status=${d.status} stderr=${d.stderr.trim()}`);
  rmSync(root, { recursive: true, force: true });
}
// P5: --as-is placed after --apply, and missing-flag message names the flag.
{
  const root = fixture();
  const r = archive(root, '--apply', '--as-is');
  check('P5 --as-is without instruction (any order) exits non-zero naming --owner-instruction', r.status !== 0 && r.stderr.includes('--owner-instruction'), `status=${r.status} stderr=${r.stderr.trim()}`);
  rmSync(root, { recursive: true, force: true });
}
// P6: a later edit of the archived unverified.md is detected on repeat.
{
  const root = fixture();
  archive(root, '--as-is', '--owner-instruction', 'archive it', '--apply');
  writeFileSync(join(root, 'docs/archive/x/unverified.md'), 'tampered\n');
  const r = archive(root, '--apply');
  check('P6 tampered unverified.md refused on repeat', r.status !== 0 && /as-is note/.test(r.stderr), `status=${r.status} stderr=${r.stderr.trim()}`);
  rmSync(root, { recursive: true, force: true });
}
console.log(`failures: ${failures}`);
process.exitCode = failures ? 1 : 0;
