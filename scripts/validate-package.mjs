#!/usr/bin/env node

import { execFile } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { platform, tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

import { resolveRetainedArtifact } from './release-preparation.mjs';

const execFileAsync = promisify(execFile);

export const SUPPORTED_OS = Object.freeze(['ubuntu', 'macos', 'windows']);
export const STACKS = Object.freeze(['node', 'python', 'rust', 'go']);
export const HARNESS_SELECTIONS = Object.freeze([
  'claude',
  'codex',
  'pi',
  'copilot',
  'omp',
  'claude-codex',
  'all',
]);
const HARNESS_DIRS = Object.freeze({ claude: '.claude', codex: '.agents', pi: '.pi', copilot: '.github', omp: '.omp' });

const STACK_FIXTURES = Object.freeze({
  node: ['node-npm/package.json'],
  python: ['python-pip/requirements.txt'],
  rust: ['rust/Cargo.toml'],
  go: ['go/go.mod'],
});

function actualOsId(value = platform()) {
  const id = value === 'linux' ? 'ubuntu' : value === 'darwin' ? 'macos' : value === 'win32' ? 'windows' : undefined;
  if (!id) throw new Error(`Unsupported host operating system: ${String(value)}`);
  return id;
}

function stableNode(value) {
  return typeof value === 'string' && /^\d+\.\d+\.\d+$/.test(value);
}

function selectionArgs(selection) {
  if (selection === 'all') return 'all';
  if (selection === 'claude-codex') return 'claude,codex';
  return selection;
}

export function expectedCompatibilityCheckIds(os, node) {
  if (!SUPPORTED_OS.includes(os)) throw new Error(`Unsupported compatibility OS: ${String(os)}`);
  if (!stableNode(node)) throw new Error(`Invalid compatibility Node lane: ${String(node)}`);
  return STACKS.flatMap(stack => HARNESS_SELECTIONS.map(selection => `${os}:node-${node}:${stack}:${selection}`));
}

function assertRuntimeLane({ os, node } = {}) {
  if (!SUPPORTED_OS.includes(os)) throw new Error(`Unsupported compatibility OS: ${String(os)}`);
  if (!stableNode(node)) throw new Error(`Invalid compatibility Node lane: ${String(node)}`);
  if (Number.parseInt(node, 10) < 22) throw new Error(`Supported consumer Node runtime is >=22; received ${node}`);
  const actualOs = actualOsId();
  if (actualOs !== os) throw new Error(`Compatibility OS ${os} does not match host OS ${actualOs}`);
  if (process.versions.node !== node) throw new Error(`Compatibility Node runtime ${process.versions.node} does not match required lane ${node}`);
  return { os, node };
}

function packageBin(packageRoot) {
  const packageJson = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  const bin = typeof packageJson.bin === 'string' ? packageJson.bin : packageJson.bin?.[packageJson.name];
  if (!bin || typeof bin !== 'string') throw new Error('Installed package does not expose a joycraft executable');
  const executable = resolve(packageRoot, bin);
  const resolvedRoot = realpathSync(packageRoot);
  const resolvedExecutable = realpathSync(executable);
  const relation = relative(resolvedRoot, resolvedExecutable);
  if (!existsSync(executable) || !statSync(executable).isFile()
    || relation === '..' || relation.startsWith(`..${sep}`) || isAbsolute(relation)) {
    throw new Error(`Installed package executable is not a regular file contained by the package: ${bin}`);
  }
  return executable;
}

function verifyInstalledArtifact({ consumerRoot, retained }) {
  const packageRoot = join(consumerRoot, 'node_modules', retained.packageName);
  const packageJsonPath = join(packageRoot, 'package.json');
  if (!existsSync(packageJsonPath)) throw new Error('npm install did not create the retained package');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  if (packageJson.name !== retained.packageName || packageJson.version !== retained.version) {
    throw new Error('Installed package metadata does not match retained artifact');
  }
  const descriptorPath = join(packageRoot, 'dist', 'joycraft-release.json');
  const descriptor = JSON.parse(readFileSync(descriptorPath, 'utf8'));
  if (JSON.stringify(descriptor) !== JSON.stringify(retained.descriptor)) {
    throw new Error('Installed package descriptor does not match retained artifact');
  }
  const lockPath = join(consumerRoot, 'package-lock.json');
  if (!existsSync(lockPath)) throw new Error('npm install did not produce an integrity lockfile');
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  const lockEntry = lock?.packages?.[`node_modules/${retained.packageName}`];
  if (lockEntry?.integrity !== retained.integrity) throw new Error('Installed package lock integrity does not match retained artifact');
  return { packageRoot, executable: packageBin(packageRoot) };
}

async function runCli(executable, args, cwd) {
  const result = await execFileAsync(process.execPath, [executable, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, CI: 'true', NO_COLOR: '1' },
    timeout: 120_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  return { ...result, json: parseJsonOutput(result.stdout) };
}

function assertCliOutcome(result, command, expectedHarnesses, version) {
  const outcome = result.json;
  if (!outcome || typeof outcome !== 'object') throw new Error(`${command} did not return a JSON outcome`);
  if (outcome.exitCode !== 0 || !["applied", "noop"].includes(outcome.status)) {
    throw new Error(`${command} returned an unsuccessful outcome: ${JSON.stringify(outcome)}`);
  }
  if (outcome.targetVersion !== version && outcome.installedVersion !== version) {
    throw new Error(`${command} did not report retained version ${version}`);
  }
  if (JSON.stringify(outcome.harnesses) !== JSON.stringify(expectedHarnesses)) {
    throw new Error(`${command} reported unexpected harness selection`);
  }
  return outcome;
}

function parseJsonOutput(output) {
  const text = String(output ?? '').trim();
  if (!text) return undefined;
  try { return JSON.parse(text); } catch { return undefined; }
}

function copyFixture(projectRoot, stack, fixturesRoot) {
  for (const relativePath of STACK_FIXTURES[stack]) {
    const source = join(fixturesRoot, relativePath);
    const destination = join(projectRoot, basename(relativePath));
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, readFileSync(source));
  }
}

function snapshotFixtures(projectRoot, stack) {
  return Object.fromEntries(STACK_FIXTURES[stack].map(relativePath => {
    const name = basename(relativePath);
    return [name, readFileSync(join(projectRoot, name))];
  }));
}

function assertFixturesUnchanged(projectRoot, snapshot) {
  for (const [name, bytes] of Object.entries(snapshot)) {
    const current = readFileSync(join(projectRoot, name));
    if (!current.equals(bytes)) throw new Error(`Project manifest changed: ${name}`);
  }
}

function readTree(root, current = root, files = {}) {
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) readTree(root, path, files);
    else if (entry.isFile()) files[relative(root, path)] = readFileSync(path);
  }
  return files;
}

function assertTreeUnchanged(root, snapshot) {
  const current = readTree(root);
  const names = [...new Set([...Object.keys(snapshot), ...Object.keys(current)])].sort();
  for (const name of names) {
    if (!snapshot[name] || !current[name] || !snapshot[name].equals(current[name])) {
      throw new Error(`Repeated update changed owned project bytes: ${name}`);
    }
  }
}

function assertInstalledManifest(projectRoot, version, expectedHarnesses) {
  const path = join(projectRoot, 'docs', '.joycraft', 'manifest.json');
  if (!existsSync(path)) throw new Error('CLI did not write an installation manifest');
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  if (manifest.targetVersion !== version) throw new Error(`Installation manifest targetVersion is not ${version}`);
  if (JSON.stringify(manifest.harnesses) !== JSON.stringify(expectedHarnesses)) {
    throw new Error('Installation manifest harness selection does not match the requested selection');
  }
}

async function runCompatibilityCheck({ executable, root, fixturesRoot, os, node, version, stack, selection }) {
  const projectRoot = join(root, `${stack}-${selection}`);
  mkdirSync(projectRoot, { recursive: true });
  copyFixture(projectRoot, stack, fixturesRoot);
  const before = snapshotFixtures(projectRoot, stack);
  const harnesses = selectionArgs(selection);
  const expectedHarnesses = selection === 'all'
    ? ['claude', 'codex', 'pi', 'copilot', 'omp']
    : harnesses.split(',');
  const common = ['--harnesses', harnesses, '--non-interactive', '--yes', '--json'];
  const initOutcome = await runCli(executable, ['init', projectRoot, ...common], root);
  assertCliOutcome(initOutcome, 'init', expectedHarnesses, version);
  assertInstalledManifest(projectRoot, version, expectedHarnesses);
  for (const harness of ['claude', 'codex', 'pi', 'copilot', 'omp']) {
    const artifact = join(projectRoot, HARNESS_DIRS[harness], 'skills', 'joycraft-tune', 'SKILL.md');
    if (expectedHarnesses.includes(harness) !== existsSync(artifact)) {
      throw new Error(`Harness selection ${selection} produced an unexpected ${harness} artifact`);
    }
  }
  const afterInitTree = readTree(projectRoot);
  const updateOutcome = await runCli(executable, ['update', projectRoot, ...common], root);
  assertCliOutcome(updateOutcome, 'update', expectedHarnesses, version);
  assertTreeUnchanged(projectRoot, afterInitTree);
  assertFixturesUnchanged(projectRoot, before);
  return {
    id: `${os}:node-${node}:${stack}:${selection}`,
    os,
    node,
    stack,
    selection,
    status: 'passed',
  };
}

function failedCheck({ os, node, stack, selection }, error) {
  return {
    id: `${os}:node-${node}:${stack}:${selection}`,
    os,
    node,
    stack,
    selection,
    status: 'failed',
    error: [error instanceof Error ? error.message : String(error), error?.stdout, error?.stderr]
      .filter(value => typeof value === 'string' && value.trim()).join('\n'),
  };
}

/**
 * Validate one retained release artifact through the actual installed CLI.
 * The package is installed once into an isolated consumer and its executable
 * is reused for every stack/harness project in this matrix lane.
 */
export async function runPackageAcceptance({
  manifestPath,
  os,
  node,
  output,
  root,
  fixturesRoot = join(process.cwd(), 'tests', 'fixtures'),
  adapter,
} = {}) {
  assertRuntimeLane({ os, node });
  if (!manifestPath) throw new Error('A retained artifact manifest path is required');
  if (!output) throw new Error('A compatibility report output path is required');
  const retained = await resolveRetainedArtifact({ manifestPath });
  const npmAdapter = adapter ?? (await import('./release-verification.mjs')).createNpmVerificationAdapter();
  const ownedRoot = !root;
  const workspaceRoot = resolve(root ?? mkdtempSync(join(tmpdir(), 'joycraft-package-consumer-')));
  mkdirSync(workspaceRoot, { recursive: true });
  const consumerRoot = mkdtempSync(join(workspaceRoot, '.consumer-'));
  const reportPath = resolve(output);
  try {
    writeFileSync(join(consumerRoot, 'package.json'), `${JSON.stringify({ name: 'joycraft-compatibility-consumer', private: true })}\n`);
    const cacheDir = join(consumerRoot, '.npm-cache');
    mkdirSync(cacheDir, { recursive: true });
    await npmAdapter.install({ spec: retained.tarball, cwd: consumerRoot, cacheDir, preferOnline: true, attempt: 1 });
    const installed = verifyInstalledArtifact({ consumerRoot, retained });
    const checks = [];
    for (const stack of STACKS) {
      for (const selection of HARNESS_SELECTIONS) {
        try {
          checks.push(await runCompatibilityCheck({
            executable: installed.executable,
            root: consumerRoot,
            fixturesRoot,
            os,
            node,
            version: retained.version,
            stack,
            selection,
          }));
        } catch (error) {
          checks.push(failedCheck({ os, node, stack, selection }, error));
        }
      }
    }
    const report = {
      schemaVersion: 1,
      complete: checks.length === 28 && checks.every(check => check.status === 'passed'),
      releaseSha: retained.releaseSha,
      version: retained.version,
      integrity: retained.integrity,
      checks,
    };
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    return report;
  } finally {
    const reportRelation = relative(workspaceRoot, reportPath);
    const reportInsideRoot = reportRelation === ''
      || (reportRelation !== '..' && !reportRelation.startsWith(`..${sep}`) && !isAbsolute(reportRelation));
    // Keep a report written inside an automatically-created root available.
    // CI normally writes the report outside the temporary consumer.
    if (ownedRoot && !reportInsideRoot) rmSync(workspaceRoot, { recursive: true, force: true });
  }
}

function readOption(args, name) {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}

async function main() {
  const args = process.argv.slice(2);
  const result = await runPackageAcceptance({
    manifestPath: readOption(args, '--manifest'),
    os: readOption(args, '--os'),
    node: readOption(args, '--node'),
    output: readOption(args, '--output'),
  });
  console.log(JSON.stringify(result, null, 2));
  if (!result.complete) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
