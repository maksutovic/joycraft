import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

import {
  fetchVerifiedReleaseArtifact,
  isVerifiedReleaseArtifact,
  parseReleaseDescriptor,
  verifyReleaseArtifact,
} from '../src/release-artifact.js';
import { runVerifiedExactRelease } from '../src/release-resolver.js';
import type { ExactRelease } from '../src/release-resolver.js';

const version = '0.8.0';
const descriptor = { schemaVersion: 1, releaseVersion: version, manifestSchemas: [1], autoSafeEligible: true };

function tarHeader(name: string, size: number, type = '0', linkName = ''): Buffer {
  const header = Buffer.alloc(512);
  header.write(name, 0, 100, 'utf8');
  header.write('0000644\0', 100, 8, 'ascii');
  header.write('0000000\0', 108, 8, 'ascii');
  header.write('0000000\0', 116, 8, 'ascii');
  header.write(size.toString(8).padStart(11, '0') + '\0', 124, 12, 'ascii');
  header.write('00000000000\0', 136, 12, 'ascii');
  header.fill(0x20, 148, 156);
  header.write(type, 156, 1, 'ascii');
  header.write(linkName, 157, 100, 'utf8');
  header.write('ustar\0', 257, 6, 'ascii');
  header.write('00', 263, 2, 'ascii');
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
  return header;
}

function tarball(entries: Array<{ name: string; content?: string; type?: string; linkName?: string }>): Buffer {
  const chunks: Buffer[] = [];
  for (const entry of entries) {
    const content = Buffer.from(entry.content ?? '', 'utf8');
    chunks.push(tarHeader(entry.name, content.length, entry.type, entry.linkName));
    if (entry.type === undefined || entry.type === '0') {
      chunks.push(content, Buffer.alloc((512 - (content.length % 512)) % 512));
    }
  }
  return gzipSync(Buffer.concat([...chunks, Buffer.alloc(1024)]));
}

function validTarball(overrides: { packageName?: string; packageVersion?: string; descriptor?: unknown } = {}): Buffer {
  const packageName = overrides.packageName ?? 'joycraft';
  const packageVersion = overrides.packageVersion ?? version;
  const packageJson = JSON.stringify({ name: packageName, version: packageVersion });
  const releaseDescriptor = JSON.stringify(overrides.descriptor ?? descriptor);
  return tarball([
    { name: 'package/package.json', content: packageJson },
    { name: 'package/dist/joycraft-release.json', content: releaseDescriptor },
  ]);
}

function release(bytes: Uint8Array = validTarball()): ExactRelease {
  return {
    packageName: 'joycraft',
    version,
    integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
    tarballUrl: 'https://registry.npmjs.org/joycraft/-/joycraft-0.8.0.tgz',
  };
}

describe('verified release artifacts', () => {
  it('parses the supported descriptor and preserves false as a valid manual release', () => {
    expect(parseReleaseDescriptor(JSON.stringify({ ...descriptor, autoSafeEligible: false }), version)).toEqual({
      ...descriptor,
      autoSafeEligible: false,
    });
    expect(parseReleaseDescriptor({ ...descriptor, manifestSchemas: [1, 2] }, version).manifestSchemas).toEqual([1, 2]);
  });

  it.each([
    { schemaVersion: 2, releaseVersion: version, manifestSchemas: [1], autoSafeEligible: true },
    { schemaVersion: 1, releaseVersion: '0.8.1', manifestSchemas: [1], autoSafeEligible: true },
    { schemaVersion: 1, releaseVersion: version, manifestSchemas: [], autoSafeEligible: true },
    { schemaVersion: 1, releaseVersion: version, manifestSchemas: [2], autoSafeEligible: true },
    { schemaVersion: 1, releaseVersion: version, manifestSchemas: [1], autoSafeEligible: 'yes' },
  ])('fails closed for malformed or unsupported descriptor %j', (invalid) => {
    expect(() => parseReleaseDescriptor(invalid, version)).toThrow();
  });

  it('verifies the actual tarball SRI and exact package and descriptor identity', () => {
    const bytes = validTarball();
    const artifact = verifyReleaseArtifact(release(bytes), bytes);
    expect(artifact.release.version).toBe(version);
    expect(artifact.descriptor).toEqual(descriptor);
    expect(isVerifiedReleaseArtifact(artifact)).toBe(true);
    expect(isVerifiedReleaseArtifact({ release: release(bytes), descriptor })).toBe(false);
    const copy = artifact.tarball;
    copy[0] ^= 0xff;
    expect(verifyReleaseArtifact(release(bytes), artifact.tarball).descriptor).toEqual(descriptor);
  });

  it('rejects malformed archives, duplicate or traversal paths, symlink metadata, and mismatches', () => {
    const bytes = validTarball();
    expect(() => verifyReleaseArtifact({ ...release(bytes), integrity: release(bytes).integrity.replace(/.$/, 'A') }, bytes)).toThrow(/integrity/i);
    const versionMismatch = validTarball({ packageVersion: '0.8.1' });
    expect(() => verifyReleaseArtifact(release(versionMismatch), versionMismatch)).toThrow(/version/i);
    const missingDescriptor = tarball([{ name: 'package/package.json', content: '{}' }]);
    expect(() => verifyReleaseArtifact(release(missingDescriptor), missingDescriptor)).toThrow(/missing/i);
    const traversal = tarball([
      { name: 'package/package.json', content: '{}' },
      { name: '../package/dist/joycraft-release.json', content: '{}' },
    ]);
    expect(() => verifyReleaseArtifact(release(traversal), traversal)).toThrow(/path|traversal|unsafe/i);
    const duplicate = tarball([
      { name: 'package/package.json', content: '{}' },
      { name: 'package/package.json', content: '{}' },
    ]);
    expect(() => verifyReleaseArtifact(release(duplicate), duplicate)).toThrow(/duplicate/i);
    const symlink = tarball([
      { name: 'package/package.json', content: '{}' },
      { name: 'package/dist/joycraft-release.json', content: JSON.stringify(descriptor) },
      { name: 'package/dist/link', type: '2', linkName: 'joycraft-release.json' },
    ]);
    expect(() => verifyReleaseArtifact(release(symlink), symlink)).toThrow(/symlink|link|metadata|unsafe/i);
    const malformedDirectory = tarball([
      { name: 'package/package.json', content: '{}' },
      { name: 'package/dist/joycraft-release.json', content: JSON.stringify(descriptor) },
      { name: 'package/bad/', type: '5', content: 'unexpected bytes' },
    ]);
    expect(() => verifyReleaseArtifact(release(malformedDirectory), malformedDirectory)).toThrow(/directory|content/i);
  });

  it('downloads once with a bounded fetch and verifies the returned bytes', async () => {
    const bytes = validTarball();
    let downloads = 0;
    const artifact = await fetchVerifiedReleaseArtifact(release(bytes), {
      fetchTarball: async (url) => {
        downloads += 1;
        expect(url).toContain('joycraft-0.8.0.tgz');
        return bytes;
      },
    });
    expect(downloads).toBe(1);
    expect(isVerifiedReleaseArtifact(artifact)).toBe(true);
  });

  it('rejects a fetch seam that ignores cancellation by the deadline', async () => {
    const result = fetchVerifiedReleaseArtifact(release(), {
      timeoutMs: 10,
      fetchTarball: async () => new Promise(() => undefined),
    });
    await expect(result).rejects.toThrow(/timed out/i);
  });

  it('runs the same retained verified tarball once with automatic gate flags', () => {
    const bytes = validTarball();
    const artifact = verifyReleaseArtifact(release(bytes), bytes);
    let executedBytes: Buffer | undefined;
    const result = runVerifiedExactRelease({
      artifact,
      autoSafe: true,
      processAdapter: {
        spawn: (_command, args) => {
          executedBytes = readFileSync(args[3]);
          expect(args).toEqual(expect.arrayContaining(['update', '--auto-safe', '--non-interactive', '--json']));
          return { status: 0, signal: null };
        },
      },
    });
    expect(result.ok).toBe(true);
    expect(executedBytes).toEqual(bytes);
  });
});
