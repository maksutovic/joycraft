import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

import {
  resolveExactRelease,
  runExactRelease,
  type ReleaseMetadata,
  type ReleaseProcessAdapter,
} from '../src/release-resolver.js';

const integrity = `sha512-${Buffer.alloc(64, 7).toString('base64')}`;

function metadata(version = '0.8.0'): ReleaseMetadata {
  return {
    name: 'joycraft',
    'dist-tags': { latest: version },
    versions: {
      [version]: {
        name: 'joycraft',
        version,
        dist: {
          integrity,
          tarball: `https://registry.npmjs.org/joycraft/-/joycraft-${version}.tgz`,
        },
      },
    },
  };
}

describe('exact release resolver', () => {
  it('resolves latest to one exact version with canonical sha512 metadata', async () => {
    let fetches = 0;
    const result = await resolveExactRelease({
      packageName: 'joycraft',
      fetchMetadata: async (url) => {
        fetches += 1;
        expect(url).toBe('https://registry.npmjs.org/joycraft');
        return metadata('0.8.0-beta.1');
      },
    });

    expect(fetches).toBe(1);
    expect(result).toEqual({
      ok: true,
      release: {
        packageName: 'joycraft',
        version: '0.8.0-beta.1',
        integrity,
        tarballUrl: 'https://registry.npmjs.org/joycraft/-/joycraft-0.8.0-beta.1.tgz',
      },
    });
  });

  it('resolves an explicitly requested prerelease without a second metadata request', async () => {
    let fetches = 0;
    const result = await resolveExactRelease({
      packageName: 'joycraft',
      version: '0.8.0-rc.2',
      fetchMetadata: async () => {
        fetches += 1;
        return {
          ...metadata('0.8.0'),
          versions: {
            ...metadata('0.8.0').versions,
            '0.8.0-rc.2': {
              name: 'joycraft',
              version: '0.8.0-rc.2',
              dist: { integrity, tarball: 'https://registry.npmjs.org/joycraft/-/joycraft-0.8.0-rc.2.tgz' },
            },
          },
        };
      },
    });

    expect(fetches).toBe(1);
    expect(result.ok && result.release.version).toBe('0.8.0-rc.2');
  });

  it('fails closed for malformed metadata and registry failures', async () => {
    await expect(resolveExactRelease({
      packageName: 'joycraft',
      fetchMetadata: async () => ({
        ...metadata('0.8.0'),
        versions: {
          '0.8.0': {
            name: 'joycraft',
            version: '0.8.0',
            dist: { integrity: 'sha1-not-accepted', tarball: 'https://registry.npmjs.org/joycraft.tgz' },
          },
        },
      }),
    })).resolves.toEqual(expect.objectContaining({ ok: false, status: 'invalid' }));

    await expect(resolveExactRelease({
      packageName: 'joycraft',
      fetchMetadata: async () => { throw new Error('registry unavailable'); },
    })).resolves.toEqual(expect.objectContaining({ ok: false, status: 'unknown', error: expect.stringContaining('registry unavailable') }));

    await expect(resolveExactRelease({
      packageName: 'joycraft',
      fetchMetadata: async () => { throw new Error('request timed out'); },
    })).resolves.toEqual(expect.objectContaining({ ok: false, status: 'unknown', error: 'request timed out' }));
  });

  it('passes an exact package spec and a project path containing spaces as argv entries', () => {
    const calls: Array<{ command: string; args: string[]; options: Record<string, unknown> }> = [];
    const processAdapter: ReleaseProcessAdapter = {
      spawn: (command, args, options) => {
        calls.push({ command, args, options });
        return { status: 0, signal: null };
      },
    };
    const result = runExactRelease({
      release: { packageName: 'joycraft', version: '0.8.0', integrity, tarballUrl: 'https://example.test/pkg.tgz' },
      projectPath: '/tmp/project with spaces',
      commandArgs: ['update', '--yes'],
      processAdapter,
      platform: 'linux',
    });

    expect(result).toEqual({ ok: true, status: 0, command: 'npm', args: [
      'exec', '--yes', '--', 'joycraft@0.8.0', 'update', '--yes', '/tmp/project with spaces',
    ] });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      command: 'npm',
      args: ['exec', '--yes', '--', 'joycraft@0.8.0', 'update', '--yes', '/tmp/project with spaces'],
      options: expect.objectContaining({ shell: false }),
    });
  });

  it('runs a resolved Windows npm-cli.js with spaces and metacharacters as intact arguments', () => {
    const root = mkdtempSync(join(tmpdir(), 'joycraft-release-runner-'));
    const cliDir = join(root, 'fake npm');
    mkdirSync(cliDir);
    const cliPath = join(cliDir, 'npm-cli.js');
    const outputPath = join(root, 'captured argv.json');
    writeFileSync(cliPath, "require('node:fs').writeFileSync(process.env.JOYCRAFT_CAPTURE, JSON.stringify(process.argv.slice(2)));\n");
    try {
      // Use a real Node child process with the platform override so this test
      // exercises the same Windows npm-cli.js argv shape without invoking npm.
      const result = runExactRelease({
        localBundle: 'C:\\Bundles\\joycraft-local.tgz',
        projectPath: 'C:\\Projects\\with spaces\\$(touch compromised)',
        commandArgs: ['update', '--non-interactive'],
        npmCliPath: cliPath,
        env: { ...process.env, JOYCRAFT_CAPTURE: outputPath },
        platform: 'win32',
      });

      expect(result).toEqual({ ok: true, status: 0, command: process.execPath, args: [
        cliPath, 'exec', '--yes', '--', 'C:\\Bundles\\joycraft-local.tgz', 'update', '--non-interactive', 'C:\\Projects\\with spaces\\$(touch compromised)',
      ] });
      expect(JSON.parse(readFileSync(outputPath, 'utf8'))).toEqual([
        'exec', '--yes', '--', 'C:\\Bundles\\joycraft-local.tgz', 'update', '--non-interactive', 'C:\\Projects\\with spaces\\$(touch compromised)',
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('reports an actionable error when Windows npm-cli.js cannot be resolved', () => {
    let spawned = false;
    const processAdapter: ReleaseProcessAdapter = {
      spawn: () => {
        spawned = true;
        return { status: 0, signal: null };
      },
    };
    const result = runExactRelease({
      localBundle: 'joycraft-local.tgz',
      npmCliPath: '/path/that/does/not/exist/npm-cli.js',
      platform: 'win32',
      processAdapter,
    });

    expect(result).toEqual(expect.objectContaining({
      ok: false,
      error: expect.stringContaining('npmCliPath must point to a regular npm-cli.js file'),
    }));
    expect(spawned).toBe(false);
  });

  it('skips a pnpm npm_execpath and rejects a directory named npm-cli.js', () => {
    const root = mkdtempSync(join(tmpdir(), 'joycraft-release-candidates-'));
    const pnpmPath = join(root, 'fake pnpm.cjs');
    const directoryNamedCli = join(root, 'npm-cli.js');
    writeFileSync(pnpmPath, '// pnpm fixture\n');
    mkdirSync(directoryNamedCli);
    const calls: Array<{ command: string; args: string[] }> = [];
    const processAdapter: ReleaseProcessAdapter = {
      spawn: (command, args) => {
        calls.push({ command, args });
        return { status: 0, signal: null };
      },
    };
    try {
      const directoryResult = runExactRelease({
        localBundle: 'joycraft-local.tgz',
        platform: 'win32',
        env: { npm_execpath: pnpmPath, PATH: '' },
        npmCliPath: directoryNamedCli,
        processAdapter,
      });

      expect(directoryResult).toEqual(expect.objectContaining({
        ok: false,
        error: expect.stringContaining('npmCliPath must point to a regular npm-cli.js file'),
      }));
      expect(calls).toEqual([]);

      const skippedPnpmResult = runExactRelease({
        localBundle: 'joycraft-local.tgz',
        platform: 'win32',
        env: { npm_execpath: pnpmPath, PATH: '' },
        processAdapter,
      });
      if (skippedPnpmResult.ok) {
        expect(calls).toHaveLength(1);
        expect(calls[0].args[0]).not.toBe(pnpmPath);
        expect(calls[0].args[0].replaceAll('\\', '/')).toMatch(/npm-cli\.js$/i);
      } else {
        expect(skippedPnpmResult.error).toContain('Unable to locate npm-cli.js');
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects injected release fields before the process adapter is reached', () => {
    let spawned = false;
    const processAdapter: ReleaseProcessAdapter = {
      spawn: () => {
        spawned = true;
        return { status: 0, signal: null };
      },
    };
    const result = runExactRelease({
      release: {
        packageName: 'joycraft',
        version: '0.8.0; touch compromised',
        integrity,
        tarballUrl: 'https://example.test/pkg.tgz',
      },
      commandArgs: ['update', '$(touch compromised)'],
      processAdapter,
    });

    expect(result.ok).toBe(false);
    expect(spawned).toBe(false);
  });
});
