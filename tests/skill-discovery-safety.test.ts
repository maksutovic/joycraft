import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { generateClaudeSessionStartAdapter } from '../src/claude-session-start.js';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

function fixture(checker?: string): { root: string; hook: string } {
  const root = mkdtempSync(join(tmpdir(), 'joycraft hook safety '));
  roots.push(root);
  const hook = join(root, '.claude/hooks/joycraft-version-check.mjs');
  mkdirSync(join(root, '.claude/hooks'), { recursive: true });
  writeFileSync(hook, generateClaudeSessionStartAdapter());
  if (checker) {
    mkdirSync(join(root, 'docs/.joycraft'), { recursive: true });
    writeFileSync(join(root, 'docs/.joycraft/check.mjs'), checker);
  }
  return { root, hook };
}

function invoke(hook: string, keepInputOpen: boolean, env: NodeJS.ProcessEnv = process.env): Promise<{ code: number | null; output: string; timedOut: boolean }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [hook], { stdio: ['pipe', 'pipe', 'pipe'], env });
    let output = '';
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, 2_000);
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); resolve({ code, output, timedOut }); });
    if (!keepInputOpen) child.stdin.end(JSON.stringify({ session_id: 'fixture-session' }));
  });
}

describe('installed Claude discovery boundary', () => {
  it('shares the documented hook session with later skill commands without replacing existing environment settings', async () => {
    const { root, hook } = fixture('export async function checkForUpdate() { return { display: false }; }');
    const envFile = join(root, 'claude-env');
    writeFileSync(envFile, 'export KEEP_ME=1\n');
    expect((await invoke(hook, false, { ...process.env, CLAUDE_ENV_FILE: envFile })).code).toBe(0);
    expect(readFileSync(envFile, 'utf8')).toBe("export KEEP_ME=1\nexport JOYCRAFT_SESSION_ID='fixture-session'\n");
  });

  it('passes the hook session to the shared checker and acknowledges only a displayed offer', async () => {
    const { root, hook } = fixture(`import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
export async function checkForUpdate(root, options) {
  appendFileSync(join(root, 'calls.jsonl'), JSON.stringify({ action: 'check', options }) + '\\n');
  return { display: true, installedVersion: '1.0.0', availableVersion: '1.1.0' };
}
export function acknowledgeUpdate(root, input) {
  appendFileSync(join(root, 'calls.jsonl'), JSON.stringify({ action: 'ack', input }) + '\\n');
}
`);
    const result = await invoke(hook, false);
    expect(result.code).toBe(0);
    expect(result.output).toContain('1.1.0');
    expect(result.output).toContain('reinvoke');
    const calls = readFileSync(join(root, 'calls.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
    expect(calls).toEqual([
      { action: 'check', options: { sessionId: 'fixture-session' } },
      { action: 'ack', input: { release: '1.1.0', session: 'fixture-session' } },
    ]);
  });

  it('does not display or acknowledge a suppressed offer', async () => {
    const { hook } = fixture(`export async function checkForUpdate() { return { display: false, availableVersion: '1.1.0' }; }
export function acknowledgeUpdate() { console.log('unexpected acknowledgement'); }
`);
    expect(await invoke(hook, false)).toEqual({ code: 0, output: '', timedOut: false });
  });

  it('continues quietly when the checker is missing, including paths with spaces', async () => {
    const { hook } = fixture();
    expect(await invoke(hook, false)).toEqual({ code: 0, output: '', timedOut: false });
  });

  it('does not wait indefinitely for hook input whose pipe never closes', async () => {
    const { hook } = fixture('export async function checkForUpdate() { return { display: false }; }');
    const result = await invoke(hook, true);
    expect(result).toEqual({ code: 0, output: '', timedOut: false });
  });
});

describe('installed checker notice lifecycle', () => {
  it('acknowledges an actual offer for one session while keeping postponement separate', () => {
    const { root } = fixture(readFileSync(new URL('../src/check.mjs', import.meta.url), 'utf8'));
    const local = join(root, 'docs/.joycraft/local');
    mkdirSync(local, { recursive: true });
    writeFileSync(join(root, 'docs/.joycraft/manifest.json'), JSON.stringify({ schemaVersion: 1, targetVersion: '1.0.0', bundleIntegrity: '', profile: 'shared', harnesses: ['claude'], files: {} }));
    writeFileSync(join(local, 'check-cache.json'), JSON.stringify({ schemaVersion: 1, fetchedAt: Date.now(), version: '1.1.0' }));
    const run = (...args: string[]) => {
      const result = spawnSync(process.execPath, [join(root, 'docs/.joycraft/check.mjs'), ...args], { encoding: 'utf8', timeout: 2_000, env: { ...process.env, JOYCRAFT_CHECK_FETCH: '0' } });
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      return JSON.parse(result.stdout);
    };
    expect(run('check', '--json', '--session', 'alpha').display).toBe(true);
    expect(run('acknowledge', '1.1.0', '--session', 'alpha')).toEqual({ acknowledged: true });
    expect(run('check', '--json', '--session', 'alpha').display).toBe(false);
    expect(run('check', '--json', '--session', 'beta').display).toBe(true);
    expect(run('postpone', '1.1.0')).toEqual({ postponed: true });
    expect(run('check', '--json', '--session', 'beta').status).toBe('postponed');
    expect(run('check', '--json', '--explicit', '--session', 'beta').display).toBe(true);
  });
});
