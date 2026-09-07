import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

import { verifyExactVersionMetadata } from './release-verification.mjs';

const execFileAsync = promisify(execFile);

/** Revalidate exact-version metadata without npm's additional fetch retries. */
export async function readPublishedMetadata({ packageName, version, timeoutMs }) {
  const processTimeout = Math.min(timeoutMs, 30_000);
  const result = await execFileAsync('npm', [
    'view', `${packageName}@${version}`, 'name', 'version', 'dist.integrity', 'dist-tags.latest',
    '--json', '--prefer-online', '--fetch-retries=0', `--fetch-timeout=${processTimeout}`,
  ], { encoding: 'utf8', timeout: processTimeout, killSignal: 'SIGKILL', maxBuffer: 1024 * 1024 });
  return JSON.parse(result.stdout);
}

function newerVersion(actual, expected) {
  if (typeof actual !== 'string' || !/^\d+\.\d+\.\d+$/.test(actual)) return false;
  const left = actual.split('.').map(BigInt);
  const right = expected.split('.').map(BigInt);
  for (let index = 0; index < 3; index++) {
    if (left[index] !== right[index]) return left[index] > right[index];
  }
  return false;
}

/** Publication is already complete. Poll its visibility without publishing again. */
export async function verifyPublishedRelease({
  packageName, version, integrity,
  timeoutMs = 5 * 60 * 1000,
  pollIntervalMs = 5000,
  readMetadata = readPublishedMetadata,
  now = Date.now,
  sleep: wait = sleep,
  log = console.log,
} = {}) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new Error('Publication timeout must be a positive integer');
  if (!Number.isSafeInteger(pollIntervalMs) || pollIntervalMs <= 0) throw new Error('Publication polling interval must be a positive integer');
  if (!packageName || typeof version !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error('Publication requires a package name and stable version');
  }
  const identity = { packageName, version, integrity };
  const expectedCheck = verifyExactVersionMetadata({ ...identity, metadata: { name: packageName, version, dist: { integrity } } });
  if (!expectedCheck.ok) throw new Error(`Invalid retained publication identity: ${expectedCheck.errors.join(', ')}`);

  const deadline = now() + timeoutMs;
  let attempts = 0;
  let observed = 'observed latest=missing, integrity=missing';
  while (now() < deadline) {
    attempts++;
    let metadata;
    let readError;
    try {
      metadata = await readMetadata({ packageName, version, timeoutMs: Math.max(1, deadline - now()) });
    } catch (error) {
      readError = String(error.message ?? error).replace(/\s+/g, ' ').slice(0, 500);
    }
    const latest = metadata?.['dist-tags.latest'];
    const actualIntegrity = metadata?.['dist.integrity'];
    observed = `observed latest=${latest ?? 'missing'}, integrity=${actualIntegrity === integrity ? 'matches' : actualIntegrity ? 'mismatch' : 'missing'}`;
    if (readError) observed += `, registry read failed: ${readError}`;
    log(`Publication check ${attempts}: expected latest=${version}; ${observed}`);

    for (const [field, expected] of [['name', packageName], ['version', version], ['dist.integrity', integrity]]) {
      if (metadata?.[field] != null && metadata[field] !== expected) {
        throw new Error(`Published ${field} mismatch: expected ${expected}, observed ${metadata[field]}`);
      }
    }
    if (latest != null && (typeof latest !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(latest))) {
      throw new Error(`Registry latest ${String(latest)} is not a stable version; inspect the registry before retrying`);
    }
    if (newerVersion(latest, version)) throw new Error(`Registry latest ${latest} is newer than ${version}; no tag was changed`);
    const verified = verifyExactVersionMetadata({ ...identity, metadata: { name: metadata?.name, version: metadata?.version, dist: { integrity: actualIntegrity } } });
    if (now() < deadline && latest === version && verified.ok) return { version, attempts };
    const remaining = deadline - now();
    if (remaining > 0) await wait(Math.min(pollIntervalMs, remaining));
  }
  throw new Error(`Publication verification deadline expired: expected latest=${version}; ${observed}. The package may already be published; reuse the retained artifact when retrying.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 2 || args[0] !== '--manifest') throw new Error('Usage: node scripts/verify-publication.mjs --manifest <retained-manifest>');
    const manifest = JSON.parse(readFileSync(args[1], 'utf8'));
    await verifyPublishedRelease({ packageName: manifest.packageName, version: manifest.version, integrity: manifest.integrity });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
