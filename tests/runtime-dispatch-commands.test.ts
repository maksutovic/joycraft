import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { applyInstall, planInstall } from '../src/install-v1.js';

const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const folder = 'docs/features/2026-11-21-f';
const queuePath = `${folder}/specs/.joycraft-spec-queue.json`;
const forbidden = /&&|;|\||\$\(|<<|\bsource\b|\bcd\b/;

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true, maxRetries: 5 }); });

/** A git project with the shipped runtime installed and one spec whose check inputs are tests/a and tests/b. */
function fixture({ focused, checks = ['tests/a.test.ts', 'tests/b.test.ts'], status = 'todo', rootName, noGit = false }: { focused?: string; checks?: string[]; status?: string; rootName?: string; noGit?: boolean }) {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'jc-dispatch-commands-')));
  const pinned = realpathSync(mkdtempSync(join(tmpdir(), 'jc-dispatch-pin-')));
  dirs.push(base, pinned);
  const root = rootName ? join(base, rootName) : base;
  mkdirSync(root, { recursive: true });
  if (!noGit) git(root, 'init', '-q', '-b', 'main');
  applyInstall(planInstall(root, ['claude']));
  copyFileSync(join(root, '.joycraft/installation.json'), join(pinned, 'installation.json'));
  if (focused) put(join(root, 'joycraft.yaml'), `tests:\n  focused: ${JSON.stringify(focused)}\n`);
  put(join(root, '.gitignore'), '.joycraft/local/\n');
  put(join(root, folder, 'brief.md'), '# Brief\n\n## Goal\n\nText.\n');
  const spec = `${folder}/specs/01-a.md`;
  put(join(root, spec), `---\nid: 1\nstatus: ${status}\n---\n# A\n\n## acceptance\n\n- It works. Check: the tests pass.\n`);
  for (const file of checks) put(join(root, file), file.endsWith('.mjs') ? 'console.log("ran", process.argv.slice(1).join(","));\n' : 'test\n');
  put(join(root, 'src/a.ts'), 'export const a = 1;\n');
  put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: 'f', specs: [{ id: 1, file: '01-a.md', depends_on: [], status, mode: 'checkpoint',
    verification: { inputs: [{ path: `${folder}/brief.md`, kind: 'requirement' }, { path: spec, kind: 'requirement' }, { path: 'src/a.ts', kind: 'code' }, ...checks.map(path => ({ path, kind: 'check' }))],
      criteria: [{ id: 'spec-1-1', requirement: { path: spec, anchor: 'acceptance' }, requiredKinds: ['runtime'] }] } }] }, null, 2));
  if (!noGit) { git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'init'); }
  return { root, manifest: join(pinned, 'installation.json') };
}

function start({ root, manifest }: { root: string; manifest: string }, role: 'implementer' | 'reviewer') {
  const capabilities = ['filesystem:read', 'filesystem:write-report', ...(role === 'reviewer' ? ['agent:separate-context'] : [])].join(',');
  const result = spawnSync(process.execPath, [join(root, '.joycraft/runtime/dispatch-start.mjs'), '--worker-root', root, '--expected-manifest', manifest,
    '--queue', queuePath, '--spec', '1', '--role', role, '--implementer-session', 'impl-1', '--out', `.joycraft/local/packets/${role}-${Date.now()}.json`,
    '--capabilities', capabilities, '--native-session', role === 'reviewer' ? 'review-1' : 'impl-1'], { cwd: root, encoding: 'utf8' });
  return { status: result.status, stderr: result.stderr, output: result.stdout ? JSON.parse(result.stdout) : null };
}

describe('task startup commands', () => {
  it('[AC:spec-5-1] implementer and reviewer startup print the focused command built from the check inputs', () => {
    const project = fixture({ focused: 'pnpm test {files}' });
    const implementer = start(project, 'implementer');
    expect(implementer.status, implementer.stderr).toBe(0);
    expect(implementer.output.commands.focused).toEqual({ command: 'pnpm test tests/a.test.ts tests/b.test.ts', argv: ['pnpm', 'test', 'tests/a.test.ts', 'tests/b.test.ts'] });
    const reviewer = start(fixture({ focused: 'pnpm test {files}', status: 'in-review' }), 'reviewer');
    expect(reviewer.status, reviewer.stderr).toBe(0);
    expect(reviewer.output.commands.focused.command).toBe('pnpm test tests/a.test.ts tests/b.test.ts');
    const appended = start(fixture({ focused: 'npx vitest run' }), 'implementer');
    expect(appended.output.commands.focused.command).toBe('npx vitest run tests/a.test.ts tests/b.test.ts');
  });

  it('[AC:spec-5-2] each step is one plain command with literal paths', () => {
    const implementer = start(fixture({ focused: 'pnpm test {files}' }), 'implementer').output.commands;
    expect(implementer.evidence).toMatch(new RegExp(`^node \\.joycraft/runtime/evidence\\.mjs run --receipt ${folder}/receipts/spec-1-implementer-focused-\\S+\\.log -- pnpm test tests/a\\.test\\.ts tests/b\\.test\\.ts$`));
    expect(implementer.submit).toBe(`node .joycraft/runtime/completion.mjs submit --queue ${queuePath} --spec 1`);
    const project = fixture({ focused: 'pnpm test {files}', status: 'in-review' });
    const reviewer = start(project, 'reviewer').output.commands;
    expect(reviewer.checkReport).toBe(`node .joycraft/runtime/dispatch-preflight.mjs check-report --worker-root ${project.root} --queue ${queuePath} --spec 1 --report ${folder}/specs/review-1.report.json`);
    expect(reviewer.finalizeReview).toBe(`node .joycraft/runtime/completion.mjs finalize-review --queue ${queuePath} --spec 1 --report ${folder}/specs/review-1.report.json`);
    expect(reviewer.evidence).toContain('evidence.mjs run --receipt');
    for (const command of [implementer.evidence, implementer.submit, reviewer.evidence, reviewer.checkReport, reviewer.finalizeReview]) expect(command).not.toMatch(forbidden);
    // The receipt path is one evidence.mjs accepts: it runs and writes there.
    const receipt = reviewer.evidence.split(' ')[4];
    const run = spawnSync(process.execPath, ['.joycraft/runtime/evidence.mjs', 'run', '--receipt', receipt, '--', process.execPath, '-e', '0'], { cwd: project.root, encoding: 'utf8' });
    expect(run.status, run.stderr).toBe(0);
  });

  it('[AC:spec-5-3] without tests.focused or without check inputs, focused is null with a note and startup succeeds', () => {
    const noConfig = start(fixture({}), 'implementer');
    expect(noConfig.status).toBe(0);
    expect(noConfig.output.commands.focused).toBeNull();
    expect(noConfig.output.commands.note).toContain('tests.focused');
    const noChecks = start(fixture({ focused: 'pnpm test {files}', checks: [] }), 'implementer');
    expect(noChecks.status).toBe(0);
    expect(noChecks.output.commands.focused).toBeNull();
    expect(noChecks.output.commands.note).toContain('check input');
  });

  it('[review-5-1] printed commands run as printed through /bin/sh with a space in the worker root or a check path', () => {
    const run = (root: string, command: string) => spawnSync('/bin/sh', ['-c', command], { cwd: root, encoding: 'utf8' });
    for (const [rootName, checks] of [['my proj', ['tests/a.mjs', 'tests/b.mjs']], ['proj', ["tests/a b.mjs", "tests/it's.mjs"]]] as const) {
      const implementerProject = fixture({ focused: 'node {files}', checks: [...checks], rootName });
      const implementer = start(implementerProject, 'implementer');
      expect(implementer.status, implementer.stderr).toBe(0);
      const commands = implementer.output.commands;
      expect(commands.focused.argv).toEqual(['node', ...checks]);
      for (const command of [commands.focused.command, commands.evidence, commands.submit]) expect(command).not.toMatch(forbidden);
      const focusedRun = run(implementerProject.root, commands.focused.command);
      expect(focusedRun.status, focusedRun.stderr).toBe(0);
      expect(focusedRun.stdout).toContain('ran');
      const evidence = run(implementerProject.root, commands.evidence);
      expect(evidence.status, evidence.stderr).toBe(0);
      const submit = run(implementerProject.root, commands.submit);
      expect(submit.status, submit.stderr).toBe(0);

      const reviewerProject = fixture({ focused: 'node {files}', checks: [...checks], status: 'in-review', rootName });
      const reviewer = start(reviewerProject, 'reviewer');
      expect(reviewer.status, reviewer.stderr).toBe(0);
      const steps = reviewer.output.commands;
      for (const command of [steps.evidence, steps.checkReport, steps.finalizeReview]) expect(command).not.toMatch(forbidden);
      const reviewEvidence = run(reviewerProject.root, steps.evidence);
      expect(reviewEvidence.status, reviewEvidence.stderr).toBe(0);
      // No report exists yet, so both steps parse their arguments and stop only on the absent report.
      for (const command of [steps.checkReport, steps.finalizeReview]) {
        const result = run(reviewerProject.root, command);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain('ENOENT');
        expect(result.stderr).toContain(join(reviewerProject.root, `${folder}/specs/review-1.report.json`));
        expect(result.stderr).not.toContain('Invalid or duplicate argument');
      }
    }
  }, 60_000);

  it('[review-5-2] {files} inside a word is replaced in place and quoted template arguments stay whole', () => {
    const inWord = start(fixture({ focused: 'vitest --dir={files} --run' }), 'implementer').output.commands.focused;
    expect(inWord.argv).toEqual(['vitest', '--dir=tests/a.test.ts', 'tests/b.test.ts', '--run']);
    expect(inWord.command).toBe('vitest --dir=tests/a.test.ts tests/b.test.ts --run');
    const quoted = start(fixture({ focused: `runner --name "unit tests" 'a b' {files}` }), 'implementer').output.commands.focused;
    expect(quoted.argv).toEqual(['runner', '--name', 'unit tests', 'a b', 'tests/a.test.ts', 'tests/b.test.ts']);
    expect(quoted.command).toBe(`runner --name 'unit tests' 'a b' tests/a.test.ts tests/b.test.ts`);
    const appended = start(fixture({ focused: `runner "x y"` }), 'implementer').output.commands.focused;
    expect(appended.argv).toEqual(['runner', 'x y', 'tests/a.test.ts', 'tests/b.test.ts']);
  });

  it('[review-5-3] two startups in the same second print different receipt paths', () => {
    const project = fixture({ focused: 'pnpm test {files}' });
    const first = start(project, 'implementer').output.commands.evidence.split(' ')[4];
    const second = start(project, 'implementer').output.commands.evidence.split(' ')[4];
    expect(first).not.toBe(second);
  });

  it('[review-5-4] reviewer receipts go to reviews/receipts and implementer receipts to receipts', () => {
    const implementer = start(fixture({ focused: 'pnpm test {files}' }), 'implementer').output.commands.evidence.split(' ')[4];
    expect(implementer.startsWith(`${folder}/receipts/spec-1-implementer-focused-`)).toBe(true);
    const project = fixture({ focused: 'pnpm test {files}', status: 'in-review' });
    const reviewer = start(project, 'reviewer').output.commands.evidence.split(' ')[4];
    expect(reviewer.startsWith(`${folder}/reviews/receipts/spec-1-reviewer-focused-`)).toBe(true);
    const run = spawnSync(process.execPath, ['.joycraft/runtime/evidence.mjs', 'run', '--receipt', reviewer, '--', process.execPath, '-e', '0'], { cwd: project.root, encoding: 'utf8' });
    expect(run.status, run.stderr).toBe(0);
  });

  it('[AC:spec-29-1] a check path holding the literal {files} is never expanded again', () => {
    const result = start(fixture({ focused: 'vitest run {files}', checks: ['tests/{files}.test.ts'] }), 'implementer');
    expect(result.status, result.stderr).toBe(0);
    expect(result.output.commands.focused.argv).toEqual(['vitest', 'run', 'tests/{files}.test.ts']);
  });

  it('[AC:spec-29-2] an unclosed quote in tests.focused gives focused null with a note, and startup exits 0', () => {
    const single = start(fixture({ focused: "vitest run 'x {files}" }), 'implementer');
    expect(single.status, single.stderr).toBe(0);
    expect(single.output.commands.focused).toBeNull();
    expect(single.output.commands.note).toContain('unclosed single quote');
    const double = start(fixture({ focused: 'vitest run "x {files}' }), 'implementer');
    expect(double.status, double.stderr).toBe(0);
    expect(double.output.commands.focused).toBeNull();
    expect(double.output.commands.note).toContain('unclosed double quote');
  });

  it('[AC:spec-29-3] a focused command with shell syntax runs as sh -c under evidence', () => {
    const project = fixture({ focused: 'pnpm build && vitest run {files}', checks: ['tests/a.test.ts'] });
    const result = start(project, 'implementer');
    expect(result.status, result.stderr).toBe(0);
    const { focused, evidence } = result.output.commands;
    expect(focused.argv).toEqual(['sh', '-c', 'pnpm build && vitest run tests/a.test.ts']);
    spawnSync('/bin/sh', ['-c', evidence], { cwd: project.root, encoding: 'utf8' });
    const receipt = evidence.split(' ')[4];
    const last = readFileSync(join(project.root, receipt), 'utf8').trimEnd().split('\n').pop() ?? '';
    expect(last.startsWith('joycraft-evidence: ')).toBe(true);
    const footer = JSON.parse(last.slice('joycraft-evidence: '.length));
    expect(footer.argv.slice(0, 2)).toEqual(['sh', '-c']);
    expect(footer.argv[2]).toBe('pnpm build && vitest run tests/a.test.ts');
    for (const template of ['a || b', 'a; b', 'a | b', 'a < f', 'a > f', 'a $(b)', 'a `b`']) {
      const shell = start(fixture({ focused: template, checks: ['tests/a.test.ts'] }), 'implementer').output.commands.focused;
      expect(shell.argv, template).toEqual(['sh', '-c', `${template} tests/a.test.ts`]);
    }
    const quotedOnly = start(fixture({ focused: `runner "a && b" {files}`, checks: ['tests/a.test.ts'] }), 'implementer').output.commands.focused;
    expect(quotedOnly.argv).toEqual(['runner', 'a && b', 'tests/a.test.ts']);
  }, 60_000);

  // Spec: docs/features/2026-11-22-fixes-1-9-3/specs/04-reviewer-start.md
  it('[AC:spec-4-1] --help prints the ready-to-run startup with placeholders and exits 0', () => {
    const { root } = fixture({});
    for (const flag of ['--help', '-h']) {
      const result = spawnSync(process.execPath, [join(root, '.joycraft/runtime/dispatch-start.mjs'), flag], { cwd: root, encoding: 'utf8' });
      expect(result.status, result.stderr).toBe(0);
      expect(result.stderr).toBe('');
      for (const word of ['--worker-root <absolute-worker-root>', '--expected-manifest', '--role implementer|reviewer', '--native-session <your-host-session-id>', '--native-agent <your-host-agent-id>', '--coordinator-session', 'agent:separate-context', '.joycraft/local/packets/<packet.json>']) {
        expect(result.stdout).toContain(word);
      }
    }
    // Any other unknown flag still stops startup.
    const other = spawnSync(process.execPath, [join(root, '.joycraft/runtime/dispatch-start.mjs'), '--helpme'], { cwd: root, encoding: 'utf8' });
    expect(other.status).toBe(1);
    expect(other.stderr).toContain('Invalid startup argument: --helpme');
  });
});

// Spec: .joycraft/local/loop/iter1/chair.md, sl1-03 (Git settled at setup; early plain refusal).
describe('no Git: early plain refusal (sl1-03)', () => {
  const noGit = 'this folder is not a Git repository with a commit. Run git init, commit, then';

  it('[AC:sl1-03-submit] submit exits 1 with the plain message and leaves the spec todo', () => {
    const { root } = fixture({ noGit: true });
    const queueBefore = readFileSync(join(root, queuePath), 'utf8');
    const specBefore = readFileSync(join(root, folder, 'specs/01-a.md'), 'utf8');
    const result = spawnSync(process.execPath, [join(root, '.joycraft/runtime/completion.mjs'), 'submit', '--queue', queuePath, '--spec', '1'], { cwd: root, encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toBe(`Completion stopped: ${noGit} submit again.\n`);
    expect(result.stdout).toBe('');
    expect(JSON.parse(readFileSync(join(root, queuePath), 'utf8')).specs[0].status).toBe('todo');
    expect(readFileSync(join(root, queuePath), 'utf8')).toBe(queueBefore);
    expect(readFileSync(join(root, folder, 'specs/01-a.md'), 'utf8')).toBe(specBefore);
  });

  it('[AC:sl1-03-submit] a repository with no commit gets the same refusal', () => {
    const { root } = fixture({ noGit: true });
    git(root, 'init', '-q', '-b', 'main');
    const result = spawnSync(process.execPath, [join(root, '.joycraft/runtime/completion.mjs'), 'submit', '--queue', queuePath, '--spec', '1'], { cwd: root, encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(noGit);
  });

  it('[AC:sl1-03-start] task startup with no Git says the same instead of the ignore message', () => {
    const result = start(fixture({ noGit: true }), 'implementer');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`${noGit} start again.`);
    expect(result.stderr).not.toContain('git-ignored');
  });
});

// Spec: .joycraft/local/loop/iter1/chair.md, sl1-05 (readFirst is AGENTS.md plus the role skill).
describe('packet readFirst (sl1-05)', () => {
  const packetOf = (root: string, output: { packetPath: string }) => JSON.parse(readFileSync(join(root, output.packetPath), 'utf8'));

  it('[AC:sl1-05-readfirst] each packet lists AGENTS.md and the role skill only, with no runtime .mjs', () => {
    const project = fixture({ focused: 'pnpm test {files}' });
    writeFileSync(join(project.root, 'AGENTS.md'), '# Demo\n');
    const implementer = start(project, 'implementer');
    expect(implementer.status, implementer.stderr).toBe(0);
    const implementerPacket = packetOf(project.root, implementer.output);
    expect(implementerPacket.readFirst).toEqual(['AGENTS.md', '.claude/skills/joycraft-implement/SKILL.md']);
    const reviewing = fixture({ focused: 'pnpm test {files}', status: 'in-review' });
    const reviewer = start(reviewing, 'reviewer');
    expect(reviewer.status, reviewer.stderr).toBe(0);
    const reviewerPacket = packetOf(reviewing.root, reviewer.output);
    expect(reviewerPacket.readFirst).toEqual(['.claude/skills/joycraft-verify/SKILL.md']);
    for (const packet of [implementerPacket, reviewerPacket]) {
      expect(packet.readFirst.filter((file: string) => file.endsWith('.mjs'))).toEqual([]);
      expect(packet.roles[0].files).toContain('.joycraft/runtime/completion.mjs');
    }
  });
});

// Spec: .joycraft/local/loop/iter2/chair.md, sl2-06 part a (startup flag defaults).
describe('startup flag defaults (sl2-06a)', () => {
  const runStart = (root: string, args: string[]) => {
    const result = spawnSync(process.execPath, [join(root, '.joycraft/runtime/dispatch-start.mjs'), ...args], { cwd: root, encoding: 'utf8' });
    return { status: result.status, stderr: result.stderr, output: result.status === 0 && result.stdout ? JSON.parse(result.stdout) : null };
  };
  const claimQueue = (root: string, session: string) => {
    const result = spawnSync(process.execPath, [join(root, '.joycraft/runtime/coordinator.mjs'), 'claim', '--queue', queuePath, '--session', session, '--host', 'claude'], { cwd: root, encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
  };
  const packetOf = (root: string, output: { packetPath: string }) => JSON.parse(readFileSync(join(root, output.packetPath), 'utf8'));

  it('[AC:sl2-06a-defaults] on a claimed queue, queue, spec, role and coordinator session are enough for both roles', async () => {
    const project = fixture({ focused: 'pnpm test {files}' });
    claimQueue(project.root, 'lead-1');
    const implementer = runStart(project.root, ['--queue', queuePath, '--spec', '1', '--role', 'implementer', '--coordinator-session', 'lead-1']);
    expect(implementer.status, implementer.stderr).toBe(0);
    expect(implementer.output.ready).toBe(true);
    expect(implementer.output.packetPath).toMatch(/^\.joycraft\/local\/packets\/spec-1-implementer-\S+\.json$/);
    const implementerPacket = packetOf(project.root, implementer.output);
    expect(implementerPacket.implementerSessionId).toBe('lead-1');
    expect(implementerPacket.workerRoot).toBe(project.root);
    const { startupDefaults } = await import(pathToFileURL(join(project.root, '.joycraft/runtime/dispatch-start.mjs')).href);
    const filled = startupDefaults({ '--queue': queuePath, '--spec': '1', '--role': 'implementer' }, project.root).flags;
    expect(filled['--expected-manifest']).toBe(join(project.root, '.joycraft/installation.json'));
    expect(filled['--capabilities']).toBe('filesystem:read,filesystem:write-report');

    const reviewing = fixture({ focused: 'pnpm test {files}', status: 'in-review' });
    claimQueue(reviewing.root, 'lead-2');
    const reviewer = runStart(reviewing.root, ['--queue', queuePath, '--spec', '1', '--role', 'reviewer', '--coordinator-session', 'lead-2']);
    expect(reviewer.status, reviewer.stderr).toBe(0);
    // Reviewer startup checks agent:separate-context, so success shows the reviewer default carries it.
    expect(packetOf(reviewing.root, reviewer.output).implementerSessionId).toBe('lead-2');
  });

  it('[AC:sl2-06a-one-refusal] one refusal lists every missing flag', () => {
    const { root } = fixture({});
    const bare = runStart(root, []);
    expect(bare.status).toBe(1);
    expect(bare.stderr).toBe('Task startup stopped: Task startup requires --queue, --spec, --role, --implementer-session, --out, --capabilities, --native-session; native identities must come from the active host (--help lists each flag and its default)\n');
    // An unclaimed queue has no lease, so the sessions have no default.
    const unclaimed = runStart(root, ['--queue', queuePath, '--spec', '1', '--role', 'implementer']);
    expect(unclaimed.status).toBe(1);
    expect(unclaimed.stderr).toContain('Task startup requires --implementer-session, --native-session;');
  });

  it('[AC:sl2-06a-explicit-wins] explicit flags win, and --coordinator-session stays explicit', () => {
    const project = fixture({ focused: 'pnpm test {files}' });
    claimQueue(project.root, 'lead-1');
    const explicit = runStart(project.root, ['--queue', queuePath, '--spec', '1', '--role', 'implementer', '--coordinator-session', 'lead-1',
      '--native-session', 'own-1', '--out', '.joycraft/local/packets/mine.json', '--capabilities', 'filesystem:read,filesystem:write-report,agent:separate-context',
      '--expected-manifest', project.manifest]);
    expect(explicit.status, explicit.stderr).toBe(0);
    expect(explicit.output.packetPath).toBe('.joycraft/local/packets/mine.json');
    const packet = packetOf(project.root, explicit.output);
    expect(packet.implementerSessionId).toBe('own-1');
    // A pinned manifest that lacks the role files refuses, so an explicit --expected-manifest is the one read.
    writeFileSync(project.manifest, JSON.stringify({ schemaVersion: 1, files: [{ path: 'x', sha256: 'a'.repeat(64) }] }));
    const pinned = runStart(project.root, ['--queue', queuePath, '--spec', '1', '--role', 'implementer', '--coordinator-session', 'lead-1', '--expected-manifest', project.manifest]);
    expect(pinned.status).toBe(1);
    expect(pinned.stderr).toContain('Pinned expected installation does not include');
    const noCoordinator = runStart(project.root, ['--queue', queuePath, '--spec', '1', '--role', 'implementer']);
    expect(noCoordinator.status).toBe(1);
    expect(noCoordinator.stderr).toContain('pass --coordinator-session lead-1');
  });

  it('[AC:sl2-06a-help] --help names each default and says the capabilities default is a claim', () => {
    const { root } = fixture({});
    const help = spawnSync(process.execPath, [join(root, '.joycraft/runtime/dispatch-start.mjs'), '--help'], { cwd: root, encoding: 'utf8' });
    expect(help.status).toBe(0);
    for (const line of ['--worker-root: this folder.', '--expected-manifest: .joycraft/installation.json in the main checkout.', "--native-session: the coordinator lease's session", 'That default is a claim, not an observation']) expect(help.stdout).toContain(line);
  });
});
