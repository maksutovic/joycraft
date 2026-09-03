import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { runTelemetryScan, TELEMETRY_PATH, loadTelemetryStore } from '../src/telemetry-store';
import { applyGitignoreProfile } from '../src/gitignore';

const fixtures = join(__dirname, 'fixtures', 'transcripts');
const claudeDir = join(fixtures, 'claude');
const piDir = join(fixtures, 'pi');
const codexDir = join(fixtures, 'codex');
const noPi = join(fixtures, 'no-pi');
const noClaude = join(fixtures, 'no-claude');
const noCodex = join(fixtures, 'no-codex');

// The fixtures record ops against absolute /repo/... paths, so the scan must
// think the project is /repo while the store lands in a real temp dir.
const PROJECT = '/repo';

let projectDir: string;
let storePath: string;

beforeEach(() => {
  projectDir = mkdtempSync(join(tmpdir(), 'joycraft-telemetry-store-'));
  storePath = join(projectDir, 'docs', '.joycraft', 'telemetry.json');
});

describe('runTelemetryScan', () => {
  it('writes a store keyed by repo-relative doc path with counters', async () => {
    const result = await runTelemetryScan(PROJECT, { claudeDir, piDir, codexDir: noCodex, storePath });
    expect(result.status).toBe('ok');
    expect(existsSync(storePath)).toBe(true);

    const store = JSON.parse(readFileSync(storePath, 'utf-8'));
    expect(store.version).toBe(1);
    const dl = store.docs['docs/context/decision-log.md'];
    expect(dl.reads).toBe(3);
    expect(dl.writes).toBe(1);
    expect(Object.keys(store.docs).every((p) => !p.startsWith('/'))).toBe(true);
  });

  it('namespaces scanned-session ids per harness', async () => {
    await runTelemetryScan(PROJECT, { claudeDir, piDir, codexDir, storePath });
    const store = JSON.parse(readFileSync(storePath, 'utf-8'));
    expect(store.scannedSessions.sort()).toEqual([
      'claude:sess-alpha',
      'claude:sess-beta',
      'codex:codex-sess-one',
      'pi:pi-sess-one',
    ]);
  });

  it('stores only paths, counters, and session ids — never transcript content', async () => {
    await runTelemetryScan(PROJECT, { claudeDir, piDir, codexDir, storePath });
    const raw = readFileSync(storePath, 'utf-8');
    expect(raw).not.toContain('wrap up the session');
    expect(raw).not.toContain('old_string');
    expect(raw).not.toContain('cat ');
    expect(raw).not.toContain('exec_command');

    const store = JSON.parse(raw);
    expect(Object.keys(store).sort()).toEqual(['docs', 'scannedSessions', 'version']);
    for (const counts of Object.values<any>(store.docs)) {
      for (const key of Object.keys(counts)) {
        expect(['reads', 'mandatedReads', 'voluntaryReads', 'writes', 'sessions', 'fidelity']).toContain(key);
      }
    }
  });

  it('skips already-scanned sessions on a second run (incremental)', async () => {
    await runTelemetryScan(PROJECT, { claudeDir, piDir, codexDir, storePath });
    const first = JSON.parse(readFileSync(storePath, 'utf-8'));

    const second = await runTelemetryScan(PROJECT, { claudeDir, piDir, codexDir, storePath });
    const after = JSON.parse(readFileSync(storePath, 'utf-8'));

    expect(second.newSessions).toBe(0);
    expect(after).toEqual(first);
    expect(after.scannedSessions.length).toBe(new Set(after.scannedSessions).size);
  });

  it('accumulates new sessions into existing counters', async () => {
    await runTelemetryScan(PROJECT, { claudeDir, piDir: noPi, codexDir: noCodex, storePath });
    const before = JSON.parse(readFileSync(storePath, 'utf-8'));

    await runTelemetryScan(PROJECT, { claudeDir, piDir, codexDir: noCodex, storePath });
    const after = JSON.parse(readFileSync(storePath, 'utf-8'));

    const dlBefore = before.docs['docs/context/decision-log.md'];
    const dlAfter = after.docs['docs/context/decision-log.md'];
    expect(dlAfter.reads).toBe(dlBefore.reads + 1); // pi-sess-one adds one voluntary read
    expect(after.scannedSessions).toContain('pi:pi-sess-one');
  });

  it('preserves fidelity: degraded on Codex-sourced docs across merges', async () => {
    await runTelemetryScan(PROJECT, { claudeDir: noClaude, piDir: noPi, codexDir, storePath });
    await runTelemetryScan(PROJECT, { claudeDir, piDir, codexDir: noCodex, storePath });
    const store = JSON.parse(readFileSync(storePath, 'utf-8'));
    expect(store.docs['docs/context/notes.md'].fidelity).toBe('degraded');
  });

  it('reports nothing-to-scan when no transcript dirs exist, without corrupting the store', async () => {
    const result = await runTelemetryScan(PROJECT, {
      claudeDir: join(fixtures, 'missing-a'),
      piDir: join(fixtures, 'missing-b'),
      codexDir: join(fixtures, 'missing-c'),
      storePath,
    });
    expect(result.status).toBe('nothing-to-scan');
    expect(result.newSessions).toBe(0);
    if (existsSync(storePath)) {
      expect(() => JSON.parse(readFileSync(storePath, 'utf-8'))).not.toThrow();
    }
  });

  it('rebuilds a malformed existing store with a warning instead of crashing', async () => {
    mkdirSync(join(projectDir, 'docs', '.joycraft'), { recursive: true });
    writeFileSync(storePath, '{ this is not json', 'utf-8');

    const result = await runTelemetryScan(PROJECT, { claudeDir, piDir, codexDir: noCodex, storePath });
    expect(result.status).toBe('ok');
    expect(result.rebuiltStore).toBe(true);
    expect(() => JSON.parse(readFileSync(storePath, 'utf-8'))).not.toThrow();
  });

  it('creates docs/.joycraft when missing rather than scattering files elsewhere', async () => {
    await runTelemetryScan(PROJECT, { claudeDir, piDir: noPi, codexDir: noCodex, storePath });
    expect(existsSync(join(projectDir, 'docs', '.joycraft'))).toBe(true);
  });
});

describe('loadTelemetryStore', () => {
  it('returns null for an absent or malformed store', () => {
    expect(loadTelemetryStore(join(projectDir, 'nope.json'))).toBeNull();
    const bad = join(projectDir, 'bad.json');
    writeFileSync(bad, 'garbage{{{', 'utf-8');
    expect(loadTelemetryStore(bad)).toBeNull();
  });
});

describe('gitignore coverage', () => {
  it('exports the store path constant', () => {
    expect(TELEMETRY_PATH).toBe('docs/.joycraft/telemetry.json');
  });

  it('both scaffold profiles ignore telemetry.json', () => {
    for (const profile of ['shared', 'private'] as const) {
      const dir = mkdtempSync(join(tmpdir(), `joycraft-gitignore-${profile}-`));
      applyGitignoreProfile(dir, profile);
      const lines = readFileSync(join(dir, '.gitignore'), 'utf-8').split('\n');
      expect(lines).toContain('docs/.joycraft/telemetry.json');
    }
  });

  it("this repo's .gitignore covers telemetry.json", () => {
    const lines = readFileSync(join(__dirname, '..', '.gitignore'), 'utf-8').split('\n');
    expect(lines.map((l) => l.trim())).toContain('docs/.joycraft/telemetry.json');
  });
});

describe('CLI wiring', () => {
  it('registers a telemetry subcommand that delegates to the store module', () => {
    const cli = readFileSync(join(__dirname, '..', 'src', 'cli.ts'), 'utf-8');
    expect(cli).toContain(".command('telemetry')");
    expect(cli).toContain('telemetry-store');
  });
});
