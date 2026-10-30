#!/usr/bin/env node
// Copy the Joycraft bundle from a pinned joycraft-prototype tag into payload/.
// Never edit payload/ by hand: fix the source repository, tag it, re-vendor.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const payloadDir = join(root, 'payload');

// What the CLI installs, and the exporter that installs it.
export const included = ['.joycraft', '.agents/skills', '.claude/agents', 'scripts/export.mjs', 'scripts/legacy-hooks.mjs',
  'scripts/legacy-inventory.json', 'scripts/hook-paths.mjs'];
// 1.0 ships no Jev (D5, G11) and no trial data collection (D11).
export const excluded = [
  /^\.joycraft\/runtime\/(hooks|routing|harnesses)\//,
  /^\.joycraft\/runtime\/context\/rank-model\.mjs$/,
  /^\.joycraft\/hooks-config\.json$/,
  /^\.joycraft\/references\/(hooks-[^/]+|routing)\.md$/,
  /^\.joycraft\/local\//,
  /^\.agents\/skills\/(?!joycraft-)/,
  /^\.claude\/agents\/(?!joycraft-)/,
];

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function walk(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path, base));
    else out.push(relative(base, path).split('\\').join('/'));
  }
  return out;
}

/** Vendor `tag` from `source` into `dest`. Same tag, same bytes, same PIN. */
export function vendor({ source, tag, dest = payloadDir }) {
  const commit = execFileSync('git', ['-C', source, 'rev-parse', `${tag}^{commit}`], { encoding: 'utf8' }).trim();
  const stage = mkdtempSync(join(tmpdir(), 'joycraft-vendor-'));
  try {
    const archive = execFileSync('git', ['-C', source, 'archive', '--format=tar', commit, '--', ...included], { maxBuffer: 256 * 1024 * 1024 });
    execFileSync('tar', ['-xf', '-', '-C', stage], { input: archive });
    const files = walk(stage).filter(path => !excluded.some(pattern => pattern.test(path)));
    rmSync(dest, { recursive: true, force: true });
    const manifest = {};
    for (const path of files) {
      const bytes = readFileSync(join(stage, path));
      mkdirSync(dirname(join(dest, path)), { recursive: true });
      writeFileSync(join(dest, path), bytes);
      manifest[path] = sha256(bytes);
    }
    const pin = { schemaVersion: 1, source: 'joycraft-prototype', tag, commit, files: manifest };
    writeFileSync(join(dest, 'PIN'), `${JSON.stringify(pin, null, 2)}\n`);
    return pin;
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const flag = name => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
  const tag = flag('--tag');
  const source = resolve(flag('--source') ?? process.env.JOYCRAFT_PROTOTYPE_REPO ?? join(root, '..', 'joycraft-prototype'));
  if (!tag) { console.error('Usage: node scripts/vendor-payload.mjs --tag <field-N> [--source <joycraft-prototype checkout>]'); process.exit(2); }
  const pin = vendor({ source, tag });
  console.log(`Vendored ${Object.keys(pin.files).length} files from ${tag} (${pin.commit.slice(0, 7)}) into payload/`);
}
