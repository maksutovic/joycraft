import { describe, it, expect, afterEach } from 'vitest';
import {
  existsSync,
  statSync,
  readFileSync,
  mkdtempSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  chmodSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const SOURCE_SCRIPT = join(repoRoot, 'src', 'templates', 'pi-scripts', 'joycraft-implement-loop');
const INSTALLED_SCRIPT = join(repoRoot, '.pi', 'scripts', 'joycraft', 'joycraft-implement-loop');

// The real helper scripts the loop shells out to.
const PI_SCRIPTS_DIR = join(repoRoot, 'src', 'templates', 'pi-scripts');

const read = (p: string) => readFileSync(p, 'utf-8');
const isExecutable = (p: string) => (statSync(p).mode & 0o111) !== 0;

describe('pi-implement-loop script', () => {
  describe('exists, executable, parity', () => {
    it('source-of-truth script exists and is executable', () => {
      expect(existsSync(SOURCE_SCRIPT)).toBe(true);
      expect(isExecutable(SOURCE_SCRIPT)).toBe(true);
    });

    it('installed copy exists and is executable', () => {
      expect(existsSync(INSTALLED_SCRIPT)).toBe(true);
      expect(isExecutable(INSTALLED_SCRIPT)).toBe(true);
    });

    it('the two copies are byte-identical', () => {
      expect(read(INSTALLED_SCRIPT)).toBe(read(SOURCE_SCRIPT));
    });

    it('honors an overridable PI_BIN (so tests never invoke real pi)', () => {
      expect(read(SOURCE_SCRIPT)).toMatch(/PI_BIN/);
    });
  });

  describe('behavior with a fake pi stub', () => {
    let tmp: string;
    let specsDir: string;
    let binDir: string;
    let logFile: string;

    // Build a temp workspace: a fake `pi` on PATH that logs args, the real
    // helper scripts on PATH, and a temp specs dir with a 2-spec queue.
    function setup(opts: { failOnSpec?: string } = {}) {
      tmp = mkdtempSync(join(tmpdir(), 'joycraft-loop-'));
      specsDir = join(tmp, 'specs');
      binDir = join(tmp, 'bin');
      logFile = join(tmp, 'pi-calls.log');
      mkdirSync(specsDir, { recursive: true });
      mkdirSync(binDir, { recursive: true });

      // Two fake spec files.
      writeFileSync(join(specsDir, 'spec-a.md'), '# Spec A\n');
      writeFileSync(join(specsDir, 'spec-b.md'), '# Spec B\n');

      // Queue: spec-a then spec-b (b depends on a). NOTE: one spec object per
      // line — joycraft-next-spec/mark-done parse entries with `grep -o
      // '{[^}]*}'`, which only matches single-line objects (this is the format
      // joycraft-decompose emits). Pretty-printed multi-line JSON would not be
      // parsed and the queue would read as empty.
      writeFileSync(
        join(specsDir, '.joycraft-spec-queue.json'),
        [
          '{',
          '  "feature": "tmp",',
          '  "specs": [',
          '    { "id": 1, "file": "spec-a.md", "depends_on": [], "status": "todo", "mode": "isolated" },',
          '    { "id": 2, "file": "spec-b.md", "depends_on": [1], "status": "todo", "mode": "isolated" }',
          '  ]',
          '}',
          '',
        ].join('\n'),
      );

      // Fake `pi`: log "<args>" to the log file. The loop runs the real
      // spec-done logic (mark-done + frontmatter) OR delegates spec-done to
      // pi as well — either way, to actually advance the queue the loop must
      // bump status. We have the fake pi bump the matching spec to in-review
      // when it sees a spec-done prompt, so next-spec advances.
      const failSpec = opts.failOnSpec ?? '';
      const piStub = `#!/usr/bin/env bash
echo "$@" >> "${logFile}"
# Fail-fast simulation: exit non-zero when implementing the named spec.
if [ -n "${failSpec}" ]; then
  for a in "$@"; do
    case "$a" in
      *"${failSpec}"*)
        case "$a" in
          *implement*) echo "FAKE PI: failing on ${failSpec}" >&2; exit 7 ;;
        esac
        ;;
    esac
  done
fi
# When asked to run spec-done for a spec, bump that spec to in-review so the
# real joycraft-next-spec advances on the next iteration.
for a in "$@"; do
  case "$a" in
    *spec-done*|*spec_done*)
      for b in "$@"; do
        case "$b" in
          *spec-a.md*) "${PI_SCRIPTS_DIR}/joycraft-mark-done" 1 --to in-review "${specsDir}" >/dev/null 2>&1 ;;
          *spec-b.md*) "${PI_SCRIPTS_DIR}/joycraft-mark-done" 2 --to in-review "${specsDir}" >/dev/null 2>&1 ;;
        esac
      done
      ;;
  esac
done
exit 0
`;
      const piPath = join(binDir, 'pi');
      writeFileSync(piPath, piStub);
      chmodSync(piPath, 0o755);

      // Fake joycraft-session-end on PATH (shadows the real one) so the test
      // never runs the repo's real `pnpm test && build`. It just prints the
      // real script's banner (so the "ran once" assertion can match) + exits 0.
      const sessionEndStub = `#!/usr/bin/env bash
echo "Joycraft Session End"
exit 0
`;
      const sePath = join(binDir, 'joycraft-session-end');
      writeFileSync(sePath, sessionEndStub);
      chmodSync(sePath, 0o755);
    }

    afterEach(() => {
      if (tmp) rmSync(tmp, { recursive: true, force: true });
    });

    function runLoop(): { status: number; stdout: string; stderr: string } {
      // PATH gets binDir (fake pi) + the real helper scripts dir.
      const env = {
        ...process.env,
        PATH: `${binDir}:${PI_SCRIPTS_DIR}:${process.env.PATH}`,
        PI_BIN: join(binDir, 'pi'),
      };
      try {
        const stdout = execFileSync('bash', [SOURCE_SCRIPT, specsDir], {
          env,
          encoding: 'utf-8',
          stdio: 'pipe',
        });
        return { status: 0, stdout, stderr: '' };
      } catch (e: any) {
        return {
          status: e.status ?? 1,
          stdout: e.stdout?.toString() ?? '',
          stderr: e.stderr?.toString() ?? '',
        };
      }
    }

    it('passes the specs-dir through and implements each spec once, then terminates (exit 0)', () => {
      setup();
      const { status } = runLoop();
      expect(status).toBe(0);
      const calls = read(logFile);
      // Both specs were implemented (the fake pi saw both spec paths).
      expect(calls).toMatch(/spec-a\.md/);
      expect(calls).toMatch(/spec-b\.md/);
      // The implement prompt was issued exactly twice (once per spec).
      const implementCalls = calls.split('\n').filter((l) => /implement/.test(l));
      expect(implementCalls.length).toBe(2);
    });

    it('runs session-end exactly once after the queue is exhausted', () => {
      setup();
      const { stdout, status } = runLoop();
      expect(status).toBe(0);
      // The real joycraft-session-end script prints this banner.
      const sessionEndRuns = (stdout.match(/Joycraft Session End/g) || []).length;
      expect(sessionEndRuns).toBe(1);
    });

    it('fails fast: stops with non-zero exit when a spec implement fails, and does not run that spec\'s spec-done', () => {
      setup({ failOnSpec: 'spec-b.md' });
      const { status } = runLoop();
      expect(status).not.toBe(0);
      const calls = read(logFile);
      // spec-a implemented; spec-b implement attempted and failed; spec-b
      // spec-done must NOT have run.
      const specBDoneCalls = calls
        .split('\n')
        .filter((l) => /spec-done|spec_done/.test(l) && /spec-b\.md/.test(l));
      expect(specBDoneCalls.length).toBe(0);
    });

    it('errors out when no specs-dir argument is given (no glob-guessing)', () => {
      setup();
      const env = {
        ...process.env,
        PATH: `${binDir}:${PI_SCRIPTS_DIR}:${process.env.PATH}`,
        PI_BIN: join(binDir, 'pi'),
      };
      let status = 0;
      try {
        // Run from an empty cwd with NO specs-dir arg.
        execFileSync('bash', [SOURCE_SCRIPT], { env, cwd: tmp, encoding: 'utf-8', stdio: 'pipe' });
      } catch (e: any) {
        status = e.status ?? 1;
      }
      expect(status).not.toBe(0);
    });
  });

  describe('vestigial joycraft_next_spec TOOL removed from the extension', () => {
    const EXT_SOURCE = join(repoRoot, 'src', 'templates', 'pi-extensions', 'joycraft-pipeline.ts');
    const EXT_INSTALLED = join(repoRoot, '.pi', 'extensions', 'joycraft-pipeline.ts');

    for (const ext of [EXT_SOURCE, EXT_INSTALLED]) {
      it(`${ext.split('/').slice(-2).join('/')} no longer registers the joycraft_next_spec tool`, () => {
        const content = read(ext);
        // No registerTool for the vestigial tool.
        expect(content).not.toMatch(/registerTool\s*\(/);
        expect(content).not.toContain('"joycraft_next_spec"');
      });

      it(`${ext.split('/').slice(-2).join('/')} keeps the human-typable joycraft-next-spec COMMAND`, () => {
        const content = read(ext);
        expect(content).toMatch(/registerCommand\s*\(\s*["']joycraft-next-spec["']/);
      });
    }
  });
});
