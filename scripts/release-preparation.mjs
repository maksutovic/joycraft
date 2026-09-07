import { createHash } from 'node:crypto';
import { execFile, execFileSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const RELEASE_TOOLCHAIN = Object.freeze({
  node: '24.20.0',
  npm: '11.19.0',
  pnpm: '10.19.0',
});

export const RELEASE_BRANCH = 'release/joycraft';
export const ARTIFACT_MANIFEST = 'release-artifact.json';
export const RELEASE_DESCRIPTOR = Object.freeze({
  schemaVersion: 1,
  releaseVersion: '',
  manifestSchemas: [1],
  autoSafeEligible: false,
});

const PACKAGE_JSON = 'package.json';
const DESCRIPTOR_SOURCE = join('src', 'joycraft-release.json');
const DESCRIPTOR_OUTPUT = join('dist', 'joycraft-release.json');

function stableVersion(value) {
  return typeof value === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value);
}

function versionParts(value) {
  if (!stableVersion(value)) throw new Error(`Expected a stable semver version, received ${String(value)}`);
  return value.split('.').map(Number);
}

function compareVersions(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

function patchVersion(value) {
  const [major, minor, patch] = versionParts(value);
  return `${major}.${minor}.${patch + 1}`;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function descriptorForVersion(version) {
  if (!stableVersion(version)) throw new Error(`A stable descriptor version is required, received ${String(version)}`);
  return { schemaVersion: 1, releaseVersion: version, manifestSchemas: [1], autoSafeEligible: false };
}

function validateDescriptorShape(descriptor) {
  if (descriptor?.schemaVersion !== 1
    || typeof descriptor.releaseVersion !== 'string'
    || JSON.stringify(descriptor.manifestSchemas) !== '[1]'
    || typeof descriptor.autoSafeEligible !== 'boolean') {
    throw new Error('Release descriptor must be schema 1 with manifestSchemas [1] and boolean autoSafeEligible');
  }
}

function validateDescriptor(descriptor, version) {
  validateDescriptorShape(descriptor);
  if (descriptor.releaseVersion !== version) throw new Error(`Release descriptor releaseVersion ${descriptor.releaseVersion} does not match package version ${version}`);
}

/** Update package.json and its tracked release descriptor as one preparation. */
export function prepareReleaseFiles({ cwd = process.cwd(), version } = {}) {
  const root = resolve(cwd);
  const packagePath = join(root, PACKAGE_JSON);
  const descriptorPath = join(root, DESCRIPTOR_SOURCE);
  const packageJson = readJson(packagePath);
  if (!stableVersion(version)) throw new Error(`A stable release version is required, received ${String(version)}`);
  const descriptor = descriptorForVersion(version);
  if (existsSync(descriptorPath)) validateDescriptorShape(readJson(descriptorPath));
  packageJson.version = version;
  mkdirSync(dirname(descriptorPath), { recursive: true });
  writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
  writeFileSync(descriptorPath, `${JSON.stringify(descriptor, null, 2)}\n`, 'utf8');
  return { version, packagePath, descriptorPath, descriptor };
}

/** Materialize the tracked descriptor into the package's dist directory. */
export function emitReleaseDescriptor({ cwd = process.cwd() } = {}) {
  const root = resolve(cwd);
  const packageJson = readJson(join(root, PACKAGE_JSON));
  const descriptorPath = join(root, DESCRIPTOR_SOURCE);
  if (!existsSync(descriptorPath)) throw new Error(`Missing tracked release descriptor at ${DESCRIPTOR_SOURCE}`);
  const descriptor = readJson(descriptorPath);
  validateDescriptor(descriptor, packageJson.version);
  const outputPath = join(root, DESCRIPTOR_OUTPUT);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(descriptor, null, 2)}\n`, 'utf8');
  return { outputPath, descriptor };
}

export function isProductPath(file) {
  const normalized = String(file).replaceAll('\\', '/');
  if (normalized.startsWith('src/local-skills/')) return false;
  return normalized.startsWith('src/')
    || normalized.startsWith('templates/')
    || (normalized.startsWith('scripts/') && normalized !== 'scripts/release-preparation.mjs')
    || normalized === 'package.json'
    || normalized === 'pnpm-lock.yaml'
    || normalized === 'tsconfig.json'
    || normalized === 'tsup.config.ts';
}

/**
 * Purely describes the release PR operation. The workflow uses this plan to
 * keep version preparation on a branch and never writes a version to main.
 */
export function createReleasePreparationPlan({
  changedFiles = [],
  releaseSha,
  version,
  packageName = 'joycraft',
  releaseBranch = RELEASE_BRANCH,
  releasePreparationMerge = false,
} = {}) {
  const files = changedFiles.map(String).filter(Boolean);
  const shouldPrepare = !releasePreparationMerge && files.some(isProductPath);
  const lockKey = `release-preparation:${releaseBranch}`;
  if (!shouldPrepare) return {
    shouldPrepare: false,
    changedFiles: files,
    lockKey,
    releaseBranch,
    releaseSha,
    reason: releasePreparationMerge ? 'release-preparation-merge' : 'docs-only',
    actions: [],
  };

  if (!releaseSha || typeof releaseSha !== 'string') throw new Error('A reviewed release SHA is required');
  if (!stableVersion(version)) throw new Error(`A stable release version is required, received ${String(version)}`);
  const title = `release: v${version}`;
  return {
    shouldPrepare: true,
    changedFiles: files,
    lockKey,
    releaseBranch,
    releaseSha,
    version,
    packageName,
    pullRequest: {
      base: 'main',
      head: releaseBranch,
      title,
    body: `Prepare ${packageName}@${version} from reviewed commit ${releaseSha}. The packed release must include dist/joycraft-release.json with releaseVersion ${version}.\n\nDocs: none — release preparation metadata and descriptor are generated by the release workflow.`,
    },
    actions: [
      `refresh release branch ${releaseBranch} from ${releaseSha}`,
      'create or refresh one release pull request',
      'never push a version bump to main',
    ],
  };
}

async function defaultRun(command, args, options = {}) {
  return execFileAsync(command, args, { ...options, encoding: 'utf8' });
}

/** Ensure the checked-out bytes are the requested SHA and that SHA is on main. */
export async function verifyReleaseCommit({
  cwd = process.cwd(),
  releaseSha,
  run = defaultRun,
} = {}) {
  if (!/^[0-9a-f]{40}$/.test(String(releaseSha ?? ''))) throw new Error('Release SHA must be a full immutable commit SHA');
  const options = { cwd: resolve(cwd) };
  const actual = String((await run('git', ['rev-parse', 'HEAD'], options)).stdout ?? '').trim();
  if (actual !== releaseSha) throw new Error(`Checked-out release SHA ${actual} does not match ${releaseSha}`);
  await run('git', ['fetch', 'origin', 'main'], options);
  try {
    await run('git', ['merge-base', '--is-ancestor', releaseSha, 'origin/main'], options);
  } catch {
    throw new Error(`Release SHA ${releaseSha} is not merged into origin/main`);
  }
  return { releaseSha, actual };
}

/** Identify a preparation merge from GitHub's commit-to-PR association. */
export async function isMergedReleasePreparationCommit({
  repository,
  releaseSha,
  releaseBranch = RELEASE_BRANCH,
  run = defaultRun,
} = {}) {
  if (!repository || !releaseSha) return false;
  const result = await run('gh', ['api', `repos/${repository}/commits/${releaseSha}/pulls`], { cwd: process.cwd() });
  let pullRequests;
  try {
    pullRequests = JSON.parse(String(result.stdout ?? ''));
  } catch {
    throw new Error('GitHub returned invalid commit pull request metadata');
  }
  return Array.isArray(pullRequests) && pullRequests.some(pr => pr?.base?.ref === 'main'
    && pr?.head?.ref === releaseBranch
    && Boolean(pr?.merged_at));
}

/** Resolve the durable source baseline represented by an open or merged release PR. */
export async function resolveReleaseBaseline({
  repository,
  currentSha,
  releaseBranch = RELEASE_BRANCH,
  run = defaultRun,
} = {}) {
  if (!repository || !currentSha) return null;
  const options = { cwd: process.cwd() };
  const associated = await run('gh', ['api', `repos/${repository}/commits/${currentSha}/pulls`], options);
  let pullRequests;
  try {
    pullRequests = JSON.parse(String(associated.stdout ?? ''));
  } catch {
    throw new Error('GitHub returned invalid commit pull request metadata');
  }
  const mergedCurrent = Array.isArray(pullRequests)
    && pullRequests.find(pr => pr?.base?.ref === 'main'
      && pr?.head?.ref === releaseBranch
      && Boolean(pr?.merged_at)
      && (typeof pr?.merge_commit_sha === 'string' || typeof pr?.head?.sha === 'string'));
  const baselineVersion = async (baselineSha) => {
    try {
      const packageResult = await run('git', ['show', `${baselineSha}:package.json`], options);
      const packageJson = JSON.parse(String(packageResult.stdout ?? ''));
      return stableVersion(packageJson.version) ? packageJson.version : undefined;
    } catch {
      return undefined;
    }
  };
  if (mergedCurrent) {
    const mergedSha = /^[0-9a-f]{40}$/.test(mergedCurrent.merge_commit_sha ?? '')
      ? mergedCurrent.merge_commit_sha
      : mergedCurrent.head.sha;
    return {
      baselineSha: mergedSha,
      source: 'merged-release-pr',
      reservedVersion: await baselineVersion(mergedSha),
    };
  }

  const open = await run('gh', ['pr', 'list', '--base', 'main', '--head', releaseBranch, '--state', 'open', '--json', 'headRefOid', '--jq', '.[0].headRefOid'], options);
  const openSha = String(open.stdout ?? '').trim();
  if (/^[0-9a-f]{40}$/.test(openSha)) {
    return {
      baselineSha: openSha,
      source: 'open-release-pr',
      preparedVersion: await baselineVersion(openSha),
    };
  }

  const merged = await run('gh', ['pr', 'list', '--base', 'main', '--head', releaseBranch, '--state', 'merged', '--limit', '1', '--json', 'mergeCommit', '--jq', '.[0].mergeCommit.oid'], options);
  const mergedSha = String(merged.stdout ?? '').trim();
  if (/^[0-9a-f]{40}$/.test(mergedSha)) {
    return {
      baselineSha: mergedSha,
      source: 'latest-merged-release-pr',
      reservedVersion: await baselineVersion(mergedSha),
    };
  }

  const branch = await run('git', ['ls-remote', 'origin', `refs/heads/${releaseBranch}`], options);
  const branchSha = String(branch.stdout ?? '').trim().split(/\s+/)[0];
  if (/^[0-9a-f]{40}$/.test(branchSha)) {
    return {
      baselineSha: branchSha,
      source: 'existing-release-branch',
      preparedVersion: await baselineVersion(branchSha),
    };
  }
  // First adoption may have no release PR history. A verified published tag
  // still provides a durable source baseline for queued main pushes.
  try {
    const release = await run('gh', ['release', 'list', '--limit', '1', '--json', 'tagName', '--jq', '.[0].tagName'], options);
    const tag = String(release.stdout ?? '').trim();
    if (tag && /^v\d+\.\d+\.\d+$/.test(tag)) {
      const tagged = await run('git', ['rev-list', '-n', '1', `${tag}^{}`], options);
      const taggedSha = String(tagged.stdout ?? '').trim();
      if (/^[0-9a-f]{40}$/.test(taggedSha)) {
        await run('git', ['merge-base', '--is-ancestor', taggedSha, currentSha], options);
        return { baselineSha: taggedSha, source: 'prior-release-tag' };
      }
    }
  } catch {
    // No prior release is a valid first-adoption state; changed files are used.
  }
  return null;
}

/** Compare main to the durable prepared source, ignoring version-only metadata changes. */
export async function hasUnpreparedProductChanges({
  cwd = process.cwd(),
  baselineSha,
  currentSha,
  changedFiles = [],
  run = defaultRun,
} = {}) {
  const options = { cwd: resolve(cwd) };
  let files = changedFiles.map(String).filter(Boolean);
  if (baselineSha) {
    const diff = await run('git', ['diff', '--name-only', '--diff-filter=ACDMRTUXB', baselineSha, currentSha], options);
    files = String(diff.stdout ?? '').split(/\r?\n/).filter(Boolean);
    const metadataOnly = new Set([PACKAGE_JSON, DESCRIPTOR_SOURCE]);
    files = files.filter(file => {
      const normalized = file.replaceAll('\\', '/');
      if (!metadataOnly.has(normalized)) return true;
      const relative = normalized === PACKAGE_JSON ? PACKAGE_JSON : DESCRIPTOR_SOURCE;
      let before;
      let after;
      try {
        before = JSON.parse(String(execFileSync('git', ['show', `${baselineSha}:${relative}`], { cwd: resolve(cwd), encoding: 'utf8' })));
        after = JSON.parse(String(execFileSync('git', ['show', `${currentSha}:${relative}`], { cwd: resolve(cwd), encoding: 'utf8' })));
      } catch {
        return true;
      }
      if (relative === PACKAGE_JSON) {
        const beforeRest = { ...before };
        const afterRest = { ...after };
        delete beforeRest.version;
        delete afterRest.version;
        return JSON.stringify(beforeRest) !== JSON.stringify(afterRest);
      }
      const beforeRest = { ...before };
      const afterRest = { ...after };
      delete beforeRest.releaseVersion;
      delete afterRest.releaseVersion;
      return JSON.stringify(beforeRest) !== JSON.stringify(afterRest);
    });
  }
  return { hasUnpreparedProductChanges: files.some(isProductPath), files };
}

/** Resolve only package/descriptor conflicts whose sole difference is version ownership. */
async function resolveVersionOnlyMergeConflict({ cwd, run }) {
  const options = { cwd: resolve(cwd) };
  const status = await run('git', ['diff', '--name-only', '--diff-filter=U'], options);
  const conflicts = String(status.stdout ?? '').split(/\r?\n/).filter(Boolean).map(file => file.replaceAll('\\', '/'));
  if (!conflicts.length || conflicts.some(file => file !== PACKAGE_JSON && file !== DESCRIPTOR_SOURCE)) return false;
  const fields = new Map([[PACKAGE_JSON, 'version'], [DESCRIPTOR_SOURCE, 'releaseVersion']]);
  for (const file of conflicts) {
    let ours;
    let theirs;
    try {
      ours = JSON.parse(String((await run('git', ['show', `:2:${file}`], options)).stdout ?? ''));
      theirs = JSON.parse(String((await run('git', ['show', `:3:${file}`], options)).stdout ?? ''));
    } catch {
      return false;
    }
    const field = fields.get(file);
    delete ours[field];
    delete theirs[field];
    if (JSON.stringify(ours) !== JSON.stringify(theirs)) return false;
  }
  for (const file of conflicts) await run('git', ['checkout', '--ours', '--', file], options);
  await run('git', ['add', ...conflicts], options);
  await run('git', ['commit', '--no-edit'], options);
  return true;
}

/** Refresh the single release branch from main and prepare package metadata. */
export async function prepareReleaseBranch({
  cwd = process.cwd(),
  mainSha,
  version,
  releaseBranch = RELEASE_BRANCH,
  run = defaultRun,
} = {}) {
  if (!mainSha || typeof mainSha !== 'string') throw new Error('A main release SHA is required');
  const options = { cwd: resolve(cwd) };
  await run('git', ['fetch', 'origin', 'main'], options);
  // Configure identity before a possible merge commit on a fresh runner.
  await run('git', ['config', 'user.name', 'github-actions[bot]'], options);
  await run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'], options);
  let existingBranch = true;
  try {
    await run('git', ['ls-remote', '--exit-code', '--heads', 'origin', releaseBranch], options);
  } catch {
    existingBranch = false;
  }
  if (existingBranch) {
    await run('git', ['fetch', 'origin', releaseBranch], options);
    await run('git', ['switch', '--track', '-C', releaseBranch, `origin/${releaseBranch}`], options);
    try {
      await run('git', ['merge', '--no-edit', mainSha], options);
    } catch (error) {
      const resolved = await resolveVersionOnlyMergeConflict({ cwd, run });
      if (!resolved) {
        try { await run('git', ['merge', '--abort'], options); } catch { /* preserve the actionable merge failure */ }
        throw new Error(`Release branch merge conflicts outside version-only package metadata; resolve the release branch manually: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } else {
    await run('git', ['switch', '-c', releaseBranch, mainSha], options);
  }
  const prepared = prepareReleaseFiles({ cwd, version });
  await run('git', ['add', PACKAGE_JSON, DESCRIPTOR_SOURCE], options);
  let stagedChanges = true;
  try {
    await run('git', ['diff', '--cached', '--quiet'], options);
    stagedChanges = false;
  } catch {
    // git diff --quiet exits one when the metadata update is staged.
  }
  if (stagedChanges) await run('git', ['commit', '-m', `release: prepare v${version}`], options);
  await run('git', ['push', 'origin', `HEAD:${releaseBranch}`], options);
  return { ...prepared, releaseBranch, mainSha, stagedChanges };
}

/** Use GitHub CLI argument arrays to create or edit the one release PR. */
export async function syncReleasePullRequest({
  cwd = process.cwd(),
  version,
  packageName = 'joycraft',
  releaseBranch = RELEASE_BRANCH,
  run = defaultRun,
} = {}) {
  if (!stableVersion(version)) throw new Error(`A stable release version is required, received ${String(version)}`);
  const options = { cwd: resolve(cwd) };
  const list = await run('gh', ['pr', 'list', '--base', 'main', '--head', releaseBranch, '--state', 'open', '--json', 'number', '--jq', '.[0].number'], options);
  const number = String(list.stdout ?? '').trim();
  const body = `Prepare ${packageName}@${version} from reviewed main changes. The packed release must include dist/joycraft-release.json with releaseVersion ${version}.\n\nDocs: none — release preparation metadata and descriptor are generated by the release workflow.`;
  if (number) {
    return run('gh', ['pr', 'edit', number, '--title', `release: v${version}`, '--body', body], options);
  }
  return run('gh', ['pr', 'create', '--base', 'main', '--head', releaseBranch, '--title', `release: v${version}`, '--body', body], options);
}

export async function defaultRegistryLookup(packageName, { run = defaultRun } = {}) {
  const versionsResult = await run('npm', ['view', packageName, 'versions', '--json']);
  const tagsResult = await run('npm', ['view', packageName, 'dist-tags', '--json']);
  const parse = (result) => {
    const text = String(result.stdout ?? '').trim();
    try { return JSON.parse(text); } catch { return text; }
  };
  const rawVersions = parse(versionsResult);
  const versions = (Array.isArray(rawVersions) ? rawVersions : [rawVersions]).filter(stableVersion);
  if (!versions.length) throw new Error(`Registry returned no stable versions for ${packageName}`);
  const distTags = parse(tagsResult);
  return { version: versions.reduce((latest, candidate) => compareVersions(candidate, latest) > 0 ? candidate : latest), versions, distTags };
}

/**
 * Resolve one release version. Registry failures are returned as failures so
 * callers cannot turn an unavailable registry into a fake 0.0.0 baseline.
 */
export async function resolveReleaseVersion({
  packageName = 'joycraft',
  localVersion,
  registryLookup = () => defaultRegistryLookup(packageName),
  reservedVersions = [],
  preparedVersion,
} = {}) {
  if (!stableVersion(localVersion)) return { ok: false, error: `Invalid local package version: ${String(localVersion)}` };
  try {
    const remote = await registryLookup(packageName);
    const registryVersion = typeof remote === 'string' ? remote : remote?.version;
    const allRegistryVersions = typeof remote === 'object' && remote !== null
      ? [
        ...(Array.isArray(remote.versions) ? remote.versions : []),
        remote.version,
        ...(remote.distTags && typeof remote.distTags === 'object' ? Object.values(remote.distTags) : []),
      ].filter(stableVersion)
      : [registryVersion].filter(stableVersion);
    if (!allRegistryVersions.length) throw new Error(`Registry returned no stable versions for ${packageName}`);
    const reservations = Array.isArray(reservedVersions) ? reservedVersions : [reservedVersions];
    const occupied = [...new Set([...allRegistryVersions, ...reservations].filter(stableVersion))];
    const highestOccupied = occupied.reduce((highest, candidate) => compareVersions(candidate, highest) > 0 ? candidate : highest, occupied[0]);
    const preferred = stableVersion(preparedVersion) ? preparedVersion : localVersion;
    let version = preferred;
    if (occupied.includes(version)) {
      version = patchVersion(compareVersions(version, highestOccupied) > 0 ? version : highestOccupied);
    } else if (!preparedVersion && compareVersions(version, highestOccupied) <= 0) {
      version = patchVersion(highestOccupied);
    }
    return { ok: true, version, localVersion, registryVersion: stableVersion(registryVersion) ? registryVersion : highestOccupied, occupiedVersions: occupied };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function sha512(buffer) {
  const digest = createHash('sha512').update(buffer).digest();
  return {
    sha512: digest.toString('hex'),
    integrity: `sha512-${digest.toString('base64')}`,
  };
}

function parseTarEntries(tarball) {
  const archive = gunzipSync(tarball);
  const entries = new Map();
  for (let offset = 0; offset + 512 <= archive.length;) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every(byte => byte === 0)) break;
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '');
    const prefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/, '');
    const fullName = `${prefix ? `${prefix}/` : ''}${name}`;
    const sizeText = header.subarray(124, 136).toString('ascii').replace(/\0.*$/, '').trim();
    const size = sizeText ? Number.parseInt(sizeText, 8) : 0;
    const start = offset + 512;
    entries.set(fullName, archive.subarray(start, start + size));
    offset = start + Math.ceil(size / 512) * 512;
  }
  return entries;
}

function descriptorFromTarball(tarball) {
  const entries = parseTarEntries(tarball);
  const packageJsonBytes = entries.get('package/package.json');
  const descriptorBytes = entries.get('package/dist/joycraft-release.json');
  if (!packageJsonBytes) throw new Error('Retained package is missing package/package.json');
  if (!descriptorBytes) throw new Error('Retained package is missing dist/joycraft-release.json');
  let packageJson;
  let descriptor;
  try {
    packageJson = JSON.parse(packageJsonBytes.toString('utf8'));
    descriptor = JSON.parse(descriptorBytes.toString('utf8'));
  } catch {
    throw new Error('Retained package metadata is not valid JSON');
  }
  try { validateDescriptorShape(descriptor); } catch { throw new Error('Retained package has a malformed release descriptor'); }
  if (descriptor.releaseVersion !== packageJson.version) {
    throw new Error(`Release descriptor version ${descriptor.releaseVersion} does not match package version ${packageJson.version}`);
  }
  return { packageJson, descriptor };
}

function parsePackOutput(stdout) {
  const text = String(stdout ?? '').trim();
  const start = text.indexOf('[');
  if (start < 0) throw new Error('npm pack did not return JSON metadata');
  try {
    const records = JSON.parse(text.slice(start));
    if (!Array.isArray(records) || records.length !== 1 || !records[0]?.filename) throw new Error('npm pack returned an unexpected file list');
    return records[0];
  } catch (error) {
    throw new Error(`Unable to parse npm pack output: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function validateArtifactPath(manifestPath, tarballName) {
  if (!tarballName || basename(tarballName) !== tarballName || !tarballName.endsWith('.tgz')) {
    throw new Error('Retained artifact manifest contains an unsafe tarball filename');
  }
  const path = resolve(dirname(manifestPath), tarballName);
  if (dirname(path) !== resolve(dirname(manifestPath))) throw new Error('Retained artifact escapes its artifact directory');
  return path;
}

/**
 * Run npm pack exactly once, validate the packaged descriptor, and retain the
 * outer tarball integrity plus a provenance tuple in a durable manifest.
 */
export async function packReleaseArtifact({
  cwd = process.cwd(),
  artifactDir = join(cwd, 'release-artifact'),
  releaseSha,
  expectedVersion,
  packageName,
  run = defaultRun,
} = {}) {
  if (!releaseSha || typeof releaseSha !== 'string') throw new Error('A reviewed release SHA is required to pack an artifact');
  const manifestPath = join(resolve(artifactDir), ARTIFACT_MANIFEST);
  if (existsSync(manifestPath)) throw new Error(`A retained artifact already exists at ${manifestPath}; validate it for retry`);
  mkdirSync(artifactDir, { recursive: true });
  const result = await run('npm', [
    'pack',
    '--json',
    '--ignore-scripts',
    '--pack-destination',
    resolve(artifactDir),
  ], { cwd: resolve(cwd) });
  const record = parsePackOutput(result.stdout);
  const tarball = validateArtifactPath(manifestPath, basename(record.filename));
  if (!existsSync(tarball)) throw new Error(`npm pack did not retain ${tarball}`);
  const bytes = readFileSync(tarball);
  const digest = sha512(bytes);
  const { packageJson, descriptor } = descriptorFromTarball(bytes);
  if (record.package?.name && record.package.name !== packageJson.name) throw new Error('npm pack metadata does not match package metadata');
  if (record.package?.version && record.package.version !== packageJson.version) throw new Error('npm pack version does not match package metadata');
  if (expectedVersion && packageJson.version !== expectedVersion) throw new Error(`Packed version ${packageJson.version} does not match reviewed version ${expectedVersion}`);
  if (packageName && packageJson.name !== packageName) throw new Error(`Packed package ${packageJson.name} does not match ${packageName}`);
  const manifest = {
    artifactSchemaVersion: 1,
    packageName: packageJson.name,
    version: packageJson.version,
    releaseSha,
    tarball: basename(tarball),
    ...digest,
    descriptor,
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return { ...manifest, tarball, manifestPath };
}

/** Validate a previously retained tarball before any npm command is run. */
export async function resolveRetainedArtifact({ manifestPath, expected = {} } = {}) {
  if (!manifestPath) throw new Error('A retained artifact manifest path is required');
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read retained artifact manifest: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (manifest.artifactSchemaVersion !== 1
    || typeof manifest.packageName !== 'string'
    || !stableVersion(manifest.version)
    || typeof manifest.releaseSha !== 'string'
    || typeof manifest.integrity !== 'string'
    || typeof manifest.sha512 !== 'string'
    || !manifest.descriptor) throw new Error('Retained artifact manifest is malformed');
  if (expected.releaseSha && expected.releaseSha !== manifest.releaseSha) throw new Error('Retained artifact provenance release SHA mismatch');
  if (expected.version && expected.version !== manifest.version) throw new Error('Retained artifact version mismatch');
  if (expected.packageName && expected.packageName !== manifest.packageName) throw new Error('Retained artifact package name mismatch');
  const tarball = validateArtifactPath(manifestPath, manifest.tarball);
  if (!existsSync(tarball)) throw new Error('Retained artifact tarball is missing');
  const digest = sha512(readFileSync(tarball));
  if (digest.sha512 !== manifest.sha512 || digest.integrity !== manifest.integrity) throw new Error('Retained artifact integrity mismatch');
  const { packageJson, descriptor } = descriptorFromTarball(readFileSync(tarball));
  if (packageJson.name !== manifest.packageName || packageJson.version !== manifest.version) throw new Error('Retained artifact package metadata mismatch');
  if (JSON.stringify(descriptor) !== JSON.stringify(manifest.descriptor)) throw new Error('Retained artifact descriptor/provenance mismatch');
  if (expected.descriptor && JSON.stringify(expected.descriptor) !== JSON.stringify(descriptor)) throw new Error('Retained artifact descriptor mismatch');
  return { ...manifest, descriptor, tarball, manifestPath: resolve(manifestPath) };
}

export function createNpmProcessAdapter({ run = defaultRun } = {}) {
  return {
    publishCandidate(tarballPath) {
      if (!tarballPath || typeof tarballPath !== 'string' || !tarballPath.endsWith('.tgz')) throw new Error('A tarball path is required for candidate publication');
      return run('npm', ['publish', tarballPath, '--access', 'public', '--tag', 'candidate']);
    },
  };
}

export async function publishCandidate(tarballPath, options = {}) {
  return createNpmProcessAdapter(options).publishCandidate(tarballPath);
}

// Stable descriptive aliases for workflow callers and future release stages.
export const prepareReleaseArtifact = packReleaseArtifact;
export const validateRetainedArtifact = resolveRetainedArtifact;
export const resolveVersion = resolveReleaseVersion;
export const getReleasePreparationPlan = createReleasePreparationPlan;

function readOption(args, name) {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command) throw new Error('Usage: release-preparation.mjs <emit-descriptor|prepare|prepare-branch|sync-pr|verify-commit|resolve-baseline|has-unprepared-product|plan|resolve-version|pack|validate-retained|publish-candidate>');
  if (command === 'emit-descriptor') {
    console.log(JSON.stringify(emitReleaseDescriptor(), null, 2));
    return;
  }
  if (command === 'prepare') {
    console.log(JSON.stringify(prepareReleaseFiles({ version: readOption(args, '--version') }), null, 2));
    return;
  }
  if (command === 'prepare-branch') {
    console.log(JSON.stringify(await prepareReleaseBranch({
      mainSha: readOption(args, '--main-sha'),
      version: readOption(args, '--version'),
    }), null, 2));
    return;
  }
  if (command === 'sync-pr') {
    await syncReleasePullRequest({ version: readOption(args, '--version') });
    return;
  }
  if (command === 'verify-commit') {
    console.log(JSON.stringify(await verifyReleaseCommit({ releaseSha: readOption(args, '--release-sha') }), null, 2));
    return;
  }
  if (command === 'is-release-merge') {
    const merged = await isMergedReleasePreparationCommit({
      repository: readOption(args, '--repository'),
      releaseSha: readOption(args, '--release-sha'),
    });
    console.log(String(merged));
    return;
  }
  if (command === 'resolve-baseline') {
    const result = await resolveReleaseBaseline({
      repository: readOption(args, '--repository'),
      currentSha: readOption(args, '--current-sha'),
    });
    console.log(JSON.stringify(result ?? {}, null, 2));
    return;
  }
  if (command === 'has-unprepared-product') {
    const changedFilesPath = readOption(args, '--changed-files-file');
    const changedFiles = changedFilesPath
      ? readFileSync(changedFilesPath, 'utf8').split(/\r?\n/).filter(Boolean)
      : [];
    const result = await hasUnpreparedProductChanges({
      baselineSha: readOption(args, '--baseline-sha'),
      currentSha: readOption(args, '--current-sha'),
      changedFiles,
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (command === 'plan') {
    const files = [];
    for (let index = 0; index < args.length; index += 1) {
      if (args[index] === '--file' && args[index + 1]) {
        files.push(args[index + 1]);
        index += 1;
      }
    }
    console.log(JSON.stringify(createReleasePreparationPlan({
      changedFiles: files,
      releaseSha: readOption(args, '--release-sha'),
      version: readOption(args, '--version'),
      releasePreparationMerge: args.includes('--skip-release-preparation'),
    }), null, 2));
    return;
  }
  if (command === 'resolve-version') {
    const packageJson = JSON.parse(readFileSync(readOption(args, '--package-json') ?? 'package.json', 'utf8'));
    const reservedVersions = args.flatMap((value, index) => value === '--reserved-version' && args[index + 1] ? [args[index + 1]] : []);
    const result = await resolveReleaseVersion({
      packageName: packageJson.name,
      localVersion: packageJson.version,
      preparedVersion: readOption(args, '--prepared-version'),
      reservedVersions,
    });
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
    return;
  }
  if (command === 'pack') {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    const result = await packReleaseArtifact({
      cwd: process.cwd(),
      artifactDir: readOption(args, '--artifact-dir') ?? join(process.cwd(), 'release-artifact'),
      releaseSha: readOption(args, '--release-sha'),
      expectedVersion: readOption(args, '--expected-version') ?? packageJson.version,
      packageName: packageJson.name,
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (command === 'validate-retained') {
    const result = await resolveRetainedArtifact({
      manifestPath: readOption(args, '--manifest'),
      expected: {
        releaseSha: readOption(args, '--release-sha'),
        version: readOption(args, '--version'),
        packageName: readOption(args, '--package-name'),
      },
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (command === 'publish-candidate') {
    await publishCandidate(readOption(args, '--tarball'));
    return;
  }
  throw new Error(`Unknown release preparation command: ${command}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
