#!/usr/bin/env node
// Hash every file each published 0.7.x release writes into a fresh project, so a
// 1.0 migration can tell an untouched 0.7 file from one the user changed.
// Run by hand when a 0.7.x release is added; it needs the npm registry.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const out = join(root, 'src/data/install-inventory.json');
// User-owned or per-project files: their 0.7 bytes never prove Joycraft ownership.
const userOwned = /^(AGENTS\.md|CLAUDE\.md|package\.json|\.gitignore|\.gitattributes|\.claude\/settings(\.local)?\.json|docs\/\.joycraft\/(state|manifest)\.json|\.git\/)/;

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const versions = JSON.parse(execFileSync('npm', ['view', 'joycraft', 'versions', '--json'], { encoding: 'utf8' }))
  .filter(version => /^0\.7\.\d+$/.test(version));
const files = {};
for (const version of versions) {
  const dir = mkdtempSync(join(tmpdir(), `joycraft-inventory-${version}-`));
  try {
    writeFileSync(join(dir, 'package.json'), '{"name":"inventory","version":"1.0.0"}\n');
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: dir });
    const all = 'claude,codex,pi,copilot,omp';
    let run = spawnSync('npx', ['-y', `joycraft@${version}`, 'init', '.', '--harnesses', all, '--non-interactive', '--yes'], { cwd: dir, encoding: 'utf8', timeout: 180000 });
    // Older releases have no flags; they prompt for harnesses instead.
    if (run.status !== 0) run = spawnSync('npx', ['-y', `joycraft@${version}`, 'init', '.'], { cwd: dir, input: `${all}\n\n\n\n`, encoding: 'utf8', timeout: 180000 });
    let count = 0;
    for (const full of walk(dir)) {
      const path = relative(dir, full).split('\\').join('/');
      if (userOwned.test(path)) continue;
      const hash = createHash('sha256').update(readFileSync(full)).digest('hex');
      files[path] ??= [];
      if (!files[path].includes(hash)) files[path].push(hash);
      count += 1;
    }
    console.log(`${version}: ${count} files (exit ${run.status})`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const sorted = Object.fromEntries(Object.keys(files).sort().map(path => [path, files[path].sort()]));
writeFileSync(out, `${JSON.stringify({ schemaVersion: 1, source: 'npm joycraft', versions, files: sorted }, null, 2)}\n`);
console.log(`Wrote ${Object.keys(sorted).length} paths from ${versions.length} releases to ${relative(root, out)}`);
