import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createNpmVerificationAdapter, createReadinessPlan, runRegistryReadiness, verifyConsumerInstallations } from '../scripts/release-verification.mjs';
import { createPromotionProcessAdapter } from '../scripts/release-promotion.mjs';

const temporaryRoots: string[] = [];
afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixtureTarball(root: string, version: string, failOnUpdate = false): string {
  const source = join(root, `fixture ${version}`);
  mkdirSync(source, { recursive: true });
  writeFileSync(join(source, 'package.json'), JSON.stringify({
    name: 'joycraft', version, bin: { joycraft: 'cli.cjs' }, files: ['cli.cjs', 'dist'],
  }));
  mkdirSync(join(source, 'dist'));
  writeFileSync(join(source, 'dist/joycraft-release.json'), JSON.stringify({
    schemaVersion: 1, releaseVersion: version, manifestSchemas: [1], autoSafeEligible: false,
  }));
  writeFileSync(join(source, 'cli.cjs'), [
    '#!/usr/bin/env node',
    "const fs = require('node:fs');",
    "const path = require('node:path');",
    "const args = process.argv.slice(2);",
    `const version = ${JSON.stringify(version)};`,
    "if (args.includes('--version')) { console.log(version); process.exit(0); }",
    "const command = args.find(value => value === 'init' || value === 'update');",
    "if (!command) throw new Error('Expected init or update');",
    "const commandIndex = args.indexOf(command);",
    "const target = args[commandIndex + 1];",
    "const root = target && !target.startsWith('-') ? path.resolve(target) : process.cwd();",
    "fs.mkdirSync(root, { recursive: true });",
    "fs.appendFileSync(path.join(root, 'consumer-trace.jsonl'), JSON.stringify({ command, version }) + '\\n');",
    `if (${failOnUpdate} && command === 'update') throw new Error('fixture updater failed');`,
  ].join('\n'));
  const records: Buffer[] = [];
  for (const name of ['package.json', 'cli.cjs', 'dist/joycraft-release.json']) {
    const content = readFileSync(join(source, name));
    const header = Buffer.alloc(512);
    header.write(`package/${name}`, 0);
    header.write('0000755\0', 100);
    header.write(content.length.toString(8).padStart(11, '0') + '\0', 124);
    header.fill(32, 148, 156);
    header.write('0', 156);
    header.write('ustar\0', 257);
    header.write('00', 263);
    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148);
    records.push(header, content, Buffer.alloc((512 - content.length % 512) % 512));
  }
  const tarball = join(source, `joycraft-${version}.tgz`);
  writeFileSync(tarball, gzipSync(Buffer.concat([...records, Buffer.alloc(1024)])));
  return tarball;
}

function traces(root: string): Array<Array<{ command: string; version: string }>> {
  const results: Array<Array<{ command: string; version: string }>> = [];
  for (const item of readdirSync(root, { withFileTypes: true })) {
    if (item.name === 'node_modules' || item.name.startsWith('.')) continue;
    const path = join(root, item.name);
    if (item.isDirectory()) results.push(...traces(path));
    else if (item.name === 'consumer-trace.jsonl') {
      results.push(readFileSync(path, 'utf8').trim().split('\n').map(line => JSON.parse(line)));
    }
  }
  return results;
}

describe('retained release consumer subprocesses', () => {
  it('executes fresh init and a real previous-init to candidate-update sequence', async () => {
    const root = mkdtempSync(join(tmpdir(), 'joycraft release consumer '));
    temporaryRoots.push(root);
    const previousTarball = fixtureTarball(root, '1.2.2');
    const tarball = fixtureTarball(root, '1.2.3');
    const consumers = join(root, 'consumer projects');
    mkdirSync(consumers);
    const result = await verifyConsumerInstallations({
      packageName: 'joycraft', version: '1.2.3', tarball, previousTarball,
      root: consumers, adapter: createNpmVerificationAdapter(),
    });
    expect(result.freshInstall).toBe(true);
    expect(result.previousVersionUpdate).toBe(true);
    expect(traces(consumers)).toEqual(expect.arrayContaining([
      [{ command: 'init', version: '1.2.3' }],
      [{ command: 'init', version: '1.2.2' }, { command: 'update', version: '1.2.3' }],
    ]));
  }, 30_000);

  it('rejects the candidate when its actual updater fails despite successful npm installation', async () => {
    const root = mkdtempSync(join(tmpdir(), 'joycraft failed consumer '));
    temporaryRoots.push(root);
    const previousTarball = fixtureTarball(root, '1.2.2');
    const tarball = fixtureTarball(root, '1.2.3', true);
    await expect(verifyConsumerInstallations({
      packageName: 'joycraft', version: '1.2.3', tarball, previousTarball,
      root: join(root, 'consumers'), adapter: createNpmVerificationAdapter(), attempts: 1,
    })).rejects.toThrow(/fixture updater failed/);
  }, 30_000);

  it('uses real full and compact npm caches primed before the fixture registry publishes a candidate', async () => {
    const root = mkdtempSync(join(tmpdir(), 'joycraft registry cache '));
    temporaryRoots.push(root);
    const versions = ['1.2.2', '1.2.3'];
    const tarballs = Object.fromEntries(versions.map(version => [version, readFileSync(fixtureTarball(root, version))]));
    const integrities = Object.fromEntries(versions.map(version => [version, `sha512-${createHash('sha512').update(tarballs[version]).digest('base64')}`]));
    let published = false;
    let latest = '1.2.2';
    let registry = '';
    const requests: Array<{ published: boolean; accept: string }> = [];
    const server = createServer((request, response) => {
      if (request.url?.startsWith('/tarball/')) {
        const version = request.url.slice('/tarball/'.length).replace('.tgz', '');
        response.end(tarballs[version]);
        return;
      }
      if (request.url !== '/joycraft') { response.writeHead(404); response.end(); return; }
      requests.push({ published, accept: String(request.headers.accept) });
      response.setHeader('Content-Type', 'application/json');
      response.setHeader('Cache-Control', 'public, max-age=300');
      response.setHeader('Vary', 'Accept');
      response.setHeader('ETag', published ? '"candidate"' : '"previous"');
      response.end(JSON.stringify({
        name: 'joycraft', 'dist-tags': { latest },
        versions: Object.fromEntries(versions.filter(version => published || version === '1.2.2').map(version => [version, {
          name: 'joycraft', version, bin: { joycraft: 'cli.cjs' },
          dist: { integrity: integrities[version], tarball: `${registry}tarball/${version}.tgz` },
        }])),
      }));
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    registry = `http://127.0.0.1:${(server.address() as { port: number }).port}/`;
    const oldRegistry = process.env.npm_config_registry;
    process.env.npm_config_registry = registry;
    try {
      const adapter = createNpmVerificationAdapter();
      const cacheRoot = join(root, 'caches');
      for (const metadataMode of ['full', 'compact']) {
        const cwd = join(root, `prime-${metadataMode}`);
        mkdirSync(cwd);
        writeFileSync(join(cwd, 'package.json'), JSON.stringify({ name: 'cache-primer', private: true }));
        await adapter.primeMetadata({ packageName: 'joycraft', version: '1.2.2', cacheDir: join(cacheRoot, process.versions.node, `warmed-${metadataMode}`), metadataMode, cwd });
      }
      expect(requests.some(item => !item.published && item.accept.includes('application/json') && !item.accept.includes('install-v1'))).toBe(true);
      expect(requests.some(item => !item.published && item.accept.includes('install-v1')), JSON.stringify(requests)).toBe(true);
      published = true;
      let clock = 300_000;
      const descriptor = { schemaVersion: 1, releaseVersion: '1.2.3', manifestSchemas: [1], autoSafeEligible: false };
      const result = await runRegistryReadiness({
        packageName: 'joycraft', version: '1.2.3', integrity: integrities['1.2.3'], descriptor, adapter, cacheRoot,
        consumerRoot: join(root, 'registry consumers'),
        plan: createReadinessPlan({ packageName: 'joycraft', version: '1.2.3', runtimeLanes: [{ node: process.versions.node, npm: '10.9.8' }] }),
        startedAt: 0, now: () => clock, deadlineMs: 900_000,
        sleep: async () => { clock = 900_001; },
      });
      expect(result.ready).toBe(true);
      expect(result.evidence.checks).toHaveLength(3);
      expect(result.evidence.checks.every((check: { consumer: boolean }) => check.consumer)).toBe(true);
      expect(requests.some(item => item.published && item.accept.includes('install-v1'))).toBe(true);
      const promotion = createPromotionProcessAdapter();
      const priorLatestRoot = join(root, 'prior latest');
      mkdirSync(priorLatestRoot);
      expect(await promotion.verifyFreshLatest({
        packageName: 'joycraft', version: '1.2.3', integrity: integrities['1.2.3'], descriptor,
        cwd: priorLatestRoot, cacheDir: join(root, 'prior latest cache'),
      })).toBe(false);
      latest = '1.2.3';
      const candidateLatestRoot = join(root, 'candidate latest');
      mkdirSync(candidateLatestRoot);
      expect(await promotion.verifyFreshLatest({
        packageName: 'joycraft', version: '1.2.3', integrity: integrities['1.2.3'], descriptor,
        cwd: candidateLatestRoot, cacheDir: join(root, 'candidate latest cache'),
      })).toBe(true);
    } finally {
      if (oldRegistry === undefined) delete process.env.npm_config_registry;
      else process.env.npm_config_registry = oldRegistry;
      server.closeAllConnections();
      await new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done()));
    }
  }, 30_000);
});
