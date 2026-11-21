import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const runtime = join(__dirname, '..', 'payload', '.joycraft', 'runtime', 'delivery.mjs');
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

function fixture() {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'jc-delivery-')));
  dirs.push(base);
  const remote = join(base, 'remote.git');
  const root = join(base, 'work');
  git(base, 'init', '-q', '--bare', remote);
  mkdirSync(root);
  git(root, 'init', '-q', '-b', 'main');
  writeFileSync(join(root, 'a.txt'), 'a\n');
  git(root, 'add', '.');
  git(root, 'commit', '-q', '-m', 'one');
  const first = git(root, 'rev-parse', 'HEAD').trim();
  writeFileSync(join(root, 'b.txt'), 'b\n');
  git(root, 'add', '.');
  git(root, 'commit', '-q', '-m', 'two');
  git(root, 'remote', 'add', 'origin', remote);
  const lock = join(root, '.git', 'joycraft-delivery-locks', createHash('sha256').update('origin\0feature').digest('hex'));
  mkdirSync(lock, { recursive: true });
  return { root, remote, first, lock };
}
const holder = (lock: string, pid: number, host = hostname()) => writeFileSync(join(lock, 'holder.json'), JSON.stringify({ pid, host, startedAt: new Date().toISOString() }));
const deadPid = () => spawnSync(process.execPath, ['-e', '']).pid as number;
const push = async (root: string, base: string, verifier = [process.execPath, '-e', '0']) => {
  const { deliver } = await import(runtime);
  return deliver({ root, base, remote: 'origin', branch: 'feature', verifier });
};

describe('delivery lock holder', () => {
  it('[AC:lock-dead-holder-taken] takes a lock whose recorded PID is not running on this host and pushes', async () => {
    const { root, remote, first, lock } = fixture();
    const pid = deadPid();
    expect(() => process.kill(pid, 0)).toThrow();
    holder(lock, pid);
    const result = await push(root, first);
    expect(result.ok).toBe(true);
    expect(git(remote, 'rev-parse', 'refs/heads/feature').trim()).toBe(result.pushedSha);
    expect(existsSync(lock)).toBe(false);
    expect(existsSync(`${lock}.takeover`)).toBe(false);
  });

  it('[AC:lock-dead-takeover-taken] takes over a takeover directory that a dead taker left behind', async () => {
    const { root, remote, first, lock } = fixture();
    holder(lock, deadPid());
    mkdirSync(`${lock}.takeover`);
    holder(`${lock}.takeover`, deadPid());
    const result = await push(root, first);
    expect(result.ok).toBe(true);
    expect(git(remote, 'rev-parse', 'refs/heads/feature').trim()).toBe(result.pushedSha);
    expect(existsSync(`${lock}.takeover`)).toBe(false);
  });

  it('[AC:lock-live-holder-refused] refuses a lock held by a live PID', async () => {
    const { root, first, lock } = fixture();
    holder(lock, process.pid);
    await expect(push(root, first)).rejects.toThrow('delivery-lock-exists-manual-diagnosis-required');
    expect(existsSync(join(lock, 'holder.json'))).toBe(true);
  });

  it('[AC:lock-other-host-refused] refuses a dead-looking PID recorded on another host', async () => {
    const { root, first, lock } = fixture();
    holder(lock, deadPid(), `${hostname()}-elsewhere`);
    await expect(push(root, first)).rejects.toThrow('delivery-lock-exists-manual-diagnosis-required');
  });

  it('[AC:lock-no-holder-refused] refuses a lock with no holder record, as before', async () => {
    const { root, first } = fixture();
    await expect(push(root, first)).rejects.toThrow('delivery-lock-exists-manual-diagnosis-required');
  });

  it('[AC:lock-records-holder] a free lock records this PID and host and is released after the push', async () => {
    const { root, remote, first, lock } = fixture();
    rmSync(lock, { recursive: true });
    const seen = join(root, '..', 'seen.json');
    const copy = `require('fs').copyFileSync(${JSON.stringify(join(lock, 'holder.json'))}, ${JSON.stringify(seen)})`;
    const result = await push(root, first, [process.execPath, '-e', copy]);
    expect(result.ok).toBe(true);
    expect(JSON.parse(readFileSync(seen, 'utf8'))).toMatchObject({ pid: process.pid, host: hostname() });
    expect(git(remote, 'rev-parse', 'refs/heads/feature').trim()).toBe(result.pushedSha);
    expect(existsSync(lock)).toBe(false);
  });
});
