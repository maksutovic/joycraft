import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

// sl2-04: a release the user only needs to hear about is one plain line, once per
// version per 7 days. An automatic update and a migration keep the JSON flow.
const repo = join(__dirname, '..');
const modulePath = join(repo, 'payload', '.joycraft', 'runtime', 'update-check.mjs');
const day = 24 * 60 * 60 * 1000;
const start = Date.UTC(2026, 10, 23);

type Main = (argv: string[], root: string, options: { fetcher: typeof fetch; now: number }) => Promise<unknown>;
const load = async (): Promise<{ main: Main }> => import(modulePath);

const dirs: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function project(installed: string, update?: Record<string, unknown>) {
  const root = mkdtempSync(join(tmpdir(), 'jc-update-'));
  dirs.push(root);
  mkdirSync(join(root, '.joycraft', 'local'), { recursive: true });
  writeFileSync(join(root, '.joycraft', 'installation.json'), JSON.stringify({ joycraft: installed }));
  if (update) writeFileSync(join(root, '.joycraft', 'local', 'preferences.json'), JSON.stringify({ update }));
  return root;
}

// A stubbed registry: no test reads the live npm registry.
function registry(latest: string, notes: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const fetcher = (async (url: string) => {
    calls.push(url);
    const packument = { 'dist-tags': { latest }, versions: { [latest]: { joycraft: { release: latest, summary: 'Faster close.', ...notes } } } };
    return { ok: true, status: 200, json: async () => packument };
  }) as unknown as typeof fetch;
  return { fetcher, calls };
}

async function check(root: string, fetcher: typeof fetch, now: number) {
  const { main } = await load();
  const printed: string[] = [];
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => { printed.push(args.join(' ')); });
  const result = await main(['check'], root, { fetcher, now });
  vi.restoreAllMocks();
  return { printed, result: result as { action?: string } | null };
}

describe('update notice', () => {
  it('[AC:sl2-04] two checks in a row with a newer stable release: one plain line, then nothing', async () => {
    const root = project('1.9.3');
    const { fetcher } = registry('1.9.4');
    const first = await check(root, fetcher, start);
    expect(first.printed).toEqual(['Joycraft 1.9.4 is available (you have 1.9.3). Say "update Joycraft" to update, or "no Joycraft updates" to turn this off.']);
    expect(first.printed.join('')).not.toContain('{');
    const second = await check(root, fetcher, start + 1000);
    expect(second.printed).toEqual([]);
    const { update } = JSON.parse(readFileSync(join(root, '.joycraft', 'local', 'preferences.json'), 'utf8'));
    expect(update.snoozed).toEqual({ version: '1.9.4', until: start + 7 * day });
  });

  it('[AC:sl2-04] a minor release is a plain line too', async () => {
    const { printed } = await check(project('1.8.1'), registry('1.9.4').fetcher, start);
    expect(printed).toEqual([expect.stringMatching(/^Joycraft 1\.9\.4 is available \(you have 1\.8\.1\)\. Say "update Joycraft"/)]);
  });

  it('[AC:sl2-04] after 7 days the line prints again', async () => {
    const root = project('1.9.3');
    const { fetcher } = registry('1.9.4');
    expect((await check(root, fetcher, start)).printed).toHaveLength(1);
    expect((await check(root, fetcher, start + 7 * day - 1)).printed).toEqual([]);
    const later = await check(root, fetcher, start + 7 * day);
    expect(later.printed).toEqual([expect.stringContaining('Joycraft 1.9.4 is available (you have 1.9.3).')]);
  });

  it('[AC:sl2-04] an auto-safe patch still returns action apply, as JSON, every time', async () => {
    const root = project('1.9.3', { policy: 'auto-safe' });
    const { fetcher } = registry('1.9.4', { autoSafeEligible: true });
    for (const now of [start, start + 1000]) {
      const { printed, result } = await check(root, fetcher, now);
      expect(result?.action).toBe('apply');
      expect(JSON.parse(printed.join('\n'))).toMatchObject({ action: 'apply', latest: '1.9.4', kind: 'patch' });
    }
  });

  it('[AC:sl2-04] a migration keeps the JSON and asks', async () => {
    const { printed } = await check(project('1.9.3'), registry('2.0.0').fetcher, start);
    expect(JSON.parse(printed.join('\n'))).toMatchObject({ action: 'ask', kind: 'migration', latest: '2.0.0' });
  });

  it('[AC:sl2-04] policy off is silent and reads nothing', async () => {
    const { fetcher, calls } = registry('1.9.4');
    const { printed, result } = await check(project('1.9.3', { policy: 'off' }), fetcher, start);
    expect([printed, result, calls]).toEqual([[], null, []]);
  });

  it('[AC:sl2-04] a pinned project gets its note as one plain line, once', async () => {
    const root = project('1.9.3', { pin: true });
    const { fetcher } = registry('1.9.4');
    expect((await check(root, fetcher, start)).printed).toEqual(['Joycraft 1.9.4 is available. This project stays on 1.9.3 by choice.']);
    expect((await check(root, fetcher, start + 1000)).printed).toEqual([]);
  });
});
