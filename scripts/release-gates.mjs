#!/usr/bin/env node
// G10 release gates, run against the packed tarball (never the source tree).
// Every check is reported by name; any failure exits 1.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const STACKS = {
  node: ['package.json', '{"name":"app","private":true,"scripts":{"test":"node --test"}}\n'],
  python: ['pyproject.toml', '[project]\nname = "app"\n'],
  rust: ['Cargo.toml', '[package]\nname = "app"\nversion = "0.1.0"\n'],
  go: ['go.mod', 'module example.com/app\n\ngo 1.23\n'],
};
const FIXTURES_07 = ['0.7.8', '0.7.10', '0.7.15', '0.7.17'];

function treeHash(dir, skip = /^(\.joycraft-backups)(\/|$)/) {
  const hash = createHash('sha256');
  const walk = current => {
    for (const name of readdirSync(current).sort()) {
      const path = join(current, name); const rel = relative(dir, path);
      if (skip.test(rel)) continue;
      if (statSync(path).isDirectory()) walk(path); else hash.update(`${rel}\0${statSync(path).mode & 0o777}\0`).update(readFileSync(path));
    }
  };
  walk(dir);
  return hash.digest('hex');
}

export async function runGates({ tarball, work = mkdtempSync(join(tmpdir(), 'joycraft-gates-')) }) {
  const results = [];
  const check = (name, fn) => {
    try { fn(); results.push({ name, status: 'passed' }); }
    catch (error) { results.push({ name, status: 'failed', error: String(error?.message ?? error).slice(0, 2000) }); }
  };
  // Install the tarball once into a private prefix and run its real bin.
  const prefix = join(work, 'prefix');
  mkdirSync(prefix, { recursive: true });
  execFileSync('npm', ['install', '--prefix', prefix, '--no-audit', '--no-fund', resolve(tarball)], { stdio: 'pipe' });
  const cli = join(prefix, 'node_modules/joycraft/dist/cli.js');
  const joycraft = (cwd, ...args) => spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', input: '' });
  const expectStatus = (result, status, what) => {
    if (result.status !== status) throw new Error(`${what}: exit ${result.status}, expected ${status}\n${result.stdout}\n${result.stderr}`);
  };

  check('G11 payload: Jev only in docs', () => {
    const payload = join(prefix, 'node_modules/joycraft/payload');
    const walk = dir => readdirSync(dir).flatMap(name => statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)]);
    const hits = walk(payload).filter(path => !/\.(md|d\.ts)$/.test(path) && /jev/i.test(readFileSync(path, 'utf8')));
    if (hits.length) throw new Error(`Jev outside docs: ${hits.map(path => relative(payload, path)).join(', ')}`);
  });
  check('D11 payload: no trial data collection', () => {
    const payload = join(prefix, 'node_modules/joycraft/payload');
    const out = spawnSync('grep', ['-rlE', 'failure-record|failures\\.jsonl|Joycraft-Spec:|jc-impl-|jc-rev-|callTelemetry', payload], { encoding: 'utf8' });
    if (out.stdout.trim()) throw new Error(`Found in: ${out.stdout.trim()}`);
  });
  for (const [stack, [file, text]] of Object.entries(STACKS)) {
    check(`init ${stack}`, () => {
      const dir = join(work, `stack-${stack}`); mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, file), text);
      expectStatus(joycraft(dir, 'init', '.', '--harness', 'claude,codex', '--yes'), 0, 'init');
      expectStatus(joycraft(dir, 'doctor', '.'), 0, 'doctor');
      expectStatus(joycraft(dir, 'update', '.', '--yes'), 0, 'repeat update');
    });
  }
  for (const version of FIXTURES_07) {
    check(`0.7 ${version}: dry run, migrate, rollback`, () => {
      const dir = join(work, `v${version}`); mkdirSync(dir, { recursive: true });
      execFileSync('tar', ['-xzf', join(root, `tests/fixtures/v07/${version}.tar.gz`), '-C', dir]);
      const before = treeHash(dir);
      expectStatus(joycraft(dir, 'update', '.'), 1, 'dry run');
      if (treeHash(dir) !== before) throw new Error('the dry run changed files');
      expectStatus(joycraft(dir, 'update', '.', '--migrate', '--archive-custom', '--yes'), 0, 'migrate');
      expectStatus(joycraft(dir, 'doctor', '.'), 0, 'doctor after migrate');
      expectStatus(joycraft(dir, 'rollback', '--yes'), 0, 'rollback');
      if (treeHash(dir) !== before) throw new Error('rollback did not restore the pre-migration tree');
    });
  }
  check('0.7.17 with a customized skill survives', () => {
    const dir = join(work, 'custom'); mkdirSync(dir, { recursive: true });
    execFileSync('tar', ['-xzf', join(root, 'tests/fixtures/v07/0.7.17.tar.gz'), '-C', dir]);
    writeFileSync(join(dir, '.claude/skills/joycraft-tune/SKILL.md'), 'my tune\n');
    expectStatus(joycraft(dir, 'update', '.', '--migrate', '--yes'), 1, 'migrate without a custom choice');
    expectStatus(joycraft(dir, 'update', '.', '--migrate', '--keep-custom', '--yes'), 0, 'migrate keeping custom');
    if (readFileSync(join(dir, '.claude/skills/joycraft-tune/SKILL.md'), 'utf8') !== 'my tune\n') throw new Error('the customized skill was lost');
  });
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const index = process.argv.indexOf('--tarball');
  const tarball = index >= 0 ? process.argv[index + 1] : null;
  if (!tarball) { console.error('Usage: node scripts/release-gates.mjs --tarball <joycraft-x.y.z.tgz>'); process.exit(2); }
  const work = mkdtempSync(join(tmpdir(), 'joycraft-gates-'));
  try {
    const results = await runGates({ tarball, work });
    for (const result of results) console.log(`${result.status === 'passed' ? 'PASS' : 'FAIL'}  ${result.name}${result.error ? `\n      ${result.error.split('\n').join('\n      ')}` : ''}`);
    const failed = results.filter(result => result.status !== 'passed');
    console.log(`\n${results.length - failed.length}/${results.length} release gates passed`);
    if (failed.length) process.exitCode = 1;
  } finally { rmSync(work, { recursive: true, force: true }); }
}
