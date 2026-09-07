import { afterEach, describe, expect, it } from 'vitest';
import { build } from 'tsup';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createNpmVerificationAdapter } from '../scripts/release-verification.mjs';

const roots: string[] = [];
const repo = resolve(process.cwd());
const packageVersion = (JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8')) as { version: string }).version;

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function runCandidate(cli: string, preload: string, target: string, stats: string, tarball: string, args: string[]) {
  return spawnSync(process.execPath, ['--require', preload, cli, args[0], target, ...args.slice(1)], {
    cwd: target,
    encoding: 'utf8',
    env: {
      ...process.env,
      JOYCRAFT_TEST_METADATA: join(dirname(preload), 'metadata.json'),
      JOYCRAFT_TEST_TARBALL: tarball,
      JOYCRAFT_TEST_STATS: stats,
    },
    maxBuffer: 20 * 1024 * 1024,
  });
}

function readStats(path: string): { metadata: number; tarball: number } {
  return JSON.parse(readFileSync(path, 'utf8')) as { metadata: number; tarball: number };
}

function makeHistorical(project: string, skillPath: string): { skill: string; manifest: string; profile: string; settings: string; gitignore: string; gitattributes: string } {
  const manifestPath = join(project, 'docs/.joycraft/manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    targetVersion: string;
    files: Record<string, { vendorVersion: string; vendorHash: string }>;
  };
  const oldSkill = 'historical vendor skill\n';
  writeFileSync(join(project, ...skillPath.split('/')), oldSkill);
  manifest.targetVersion = '0.7.12';
  manifest.files[skillPath].vendorVersion = '0.7.12';
  manifest.files[skillPath].vendorHash = sha256(oldSkill);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  return {
    skill: oldSkill,
    manifest: readFileSync(manifestPath, 'utf8'),
    profile: String((JSON.parse(readFileSync(manifestPath, 'utf8')) as { profile?: unknown }).profile ?? ''),
    settings: readFileSync(join(project, 'docs/.joycraft/local/settings.json'), 'utf8'),
    gitignore: existsSync(join(project, '.gitignore')) ? readFileSync(join(project, '.gitignore'), 'utf8') : '',
    gitattributes: existsSync(join(project, '.gitattributes')) ? readFileSync(join(project, '.gitattributes'), 'utf8') : '',
  };
}

describe('auto-safe update through a packed candidate package', () => {
  it('verifies and applies the actual packed CLI once, then fails closed on descriptor drift', async () => {
    const root = mkdtempSync(join(tmpdir(), 'joycraft-auto-safe-package-'));
    roots.push(root);
    const fixture = join(root, 'fixture package');
    const dist = join(fixture, 'dist');
    mkdirSync(dist, { recursive: true });
    await build({
      entry: { cli: join(repo, 'src/cli.ts') },
      format: ['esm'],
      target: 'node22',
      platform: 'node',
      bundle: true,
      noExternal: ['commander'],
      config: false,
      clean: true,
      sourcemap: false,
      outDir: dist,
      outExtension: () => ({ js: '.mjs' }),
      banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
      silent: true,
    });
    writeFileSync(join(fixture, 'package.json'), JSON.stringify({
      name: 'joycraft',
      version: packageVersion,
      type: 'module',
      bin: { joycraft: 'dist/cli.mjs' },
      files: ['dist'],
    }, null, 2) + '\n');
    writeFileSync(join(dist, 'joycraft-release.json'), JSON.stringify({
      schemaVersion: 1,
      releaseVersion: packageVersion,
      manifestSchemas: [1],
      autoSafeEligible: true,
    }, null, 2) + '\n');
    const packed = JSON.parse(execFileSync('npm', ['pack', '--ignore-scripts', '--json'], { cwd: fixture, encoding: 'utf8' })) as Array<{ filename: string }>;
    expect(packed).toHaveLength(1);
    const tarball = join(fixture, packed[0].filename);
    const installed = join(root, 'installed candidate');
    mkdirSync(installed);
    writeFileSync(join(installed, 'package.json'), JSON.stringify({ name: 'candidate-consumer', private: true }));
    await createNpmVerificationAdapter().install({ spec: tarball, cwd: installed, cacheDir: join(root, 'npm-cache'), preferOnline: false });
    const installedDist = join(installed, 'node_modules/joycraft/dist');
    const bytes = readFileSync(tarball);
    const integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
    const metadataPath = join(root, 'metadata.json');
    writeFileSync(metadataPath, JSON.stringify({
      name: 'joycraft',
      'dist-tags': { latest: packageVersion },
      versions: {
        [packageVersion]: {
          name: 'joycraft',
          version: packageVersion,
          dist: { integrity, tarball: `https://registry.npmjs.org/joycraft/-/joycraft-${packageVersion}.tgz` },
        },
      },
    }));
    const preload = join(root, 'fetch.cjs');
    writeFileSync(preload, [
      "const fs = require('node:fs');",
      'let metadata = 0; let tarball = 0;',
      'global.fetch = async (url) => {',
      "  if (String(url).endsWith('/joycraft')) { metadata += 1; return new Response(fs.readFileSync(process.env.JOYCRAFT_TEST_METADATA), { headers: { 'content-type': 'application/json' } }); }",
      "  if (String(url).endsWith('.tgz')) { tarball += 1; return new Response(fs.readFileSync(process.env.JOYCRAFT_TEST_TARBALL)); }",
      "  throw new Error('unexpected fetch ' + url);",
      '};',
      "process.on('exit', () => fs.writeFileSync(process.env.JOYCRAFT_TEST_STATS, JSON.stringify({ metadata, tarball })));",
    ].join('\n'));
    const project = join(root, 'consumer project');
    mkdirSync(project);
    const init = runCandidate(join(installedDist, 'cli.mjs'), preload, project, join(root, 'init-stats.json'), tarball, ['init', '--harnesses', 'codex', '--non-interactive', '--json']);
    expect(init.status, init.stderr).toBe(0);
    const skillPath = '.agents/skills/joycraft-tune/SKILL.md';
    expect(existsSync(join(project, ...skillPath.split('/')))).toBe(true);
    const settingsPath = join(project, 'docs/.joycraft/local/settings.json');
    mkdirSync(dirname(settingsPath), { recursive: true });
    const settings = existsSync(settingsPath)
      ? JSON.parse(readFileSync(settingsPath, 'utf8')) as Record<string, unknown>
      : {};
    settings.updatePolicy = 'auto-safe';
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
    const before = makeHistorical(project, skillPath);
    const updateStats = join(root, 'update-stats.json');
    const update = runCandidate(join(installedDist, 'cli.mjs'), preload, project, updateStats, tarball, ['update', '--auto-safe', '--non-interactive', '--json']);
    expect(update.status, `${update.stderr}\n${update.error ?? ''}\n${update.signal ?? ''}`).toBe(0);
    expect(readFileSync(join(project, ...skillPath.split('/')), 'utf8')).not.toBe(before.skill);
    expect(JSON.parse(readFileSync(join(project, 'docs/.joycraft/manifest.json'), 'utf8')).targetVersion).toBe(packageVersion);
    expect(String(JSON.parse(readFileSync(join(project, 'docs/.joycraft/manifest.json'), 'utf8')).profile ?? '')).toBe(before.profile);
    expect(readFileSync(settingsPath, 'utf8')).toBe(before.settings);
    expect(existsSync(join(project, '.gitignore')) ? readFileSync(join(project, '.gitignore'), 'utf8') : '').toBe(before.gitignore);
    expect(existsSync(join(project, '.gitattributes')) ? readFileSync(join(project, '.gitattributes'), 'utf8') : '').toBe(before.gitattributes);
    expect(readStats(updateStats)).toEqual({ metadata: 1, tarball: 1 });

    makeHistorical(project, skillPath);
    writeFileSync(join(installedDist, 'joycraft-release.json'), JSON.stringify({
      schemaVersion: 1,
      releaseVersion: packageVersion,
      manifestSchemas: [1],
      autoSafeEligible: false,
    }, null, 2) + '\n');
    const failedStats = join(root, 'failed-stats.json');
    const failed = runCandidate(join(installedDist, 'cli.mjs'), preload, project, failedStats, tarball, ['update', '--auto-safe', '--non-interactive', '--json']);
    expect(failed.status).toBe(1);
    expect(readFileSync(join(project, ...skillPath.split('/')), 'utf8')).toBe(before.skill);
    const failedManifest = JSON.parse(readFileSync(join(project, 'docs/.joycraft/manifest.json'), 'utf8')) as { targetVersion: string; profile?: unknown };
    expect(failedManifest.targetVersion).toBe('0.7.12');
    expect(String(failedManifest.profile ?? '')).toBe(before.profile);
    expect(readStats(failedStats)).toEqual({ metadata: 1, tarball: 1 });
  }, 120_000);
});
