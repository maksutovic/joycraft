#!/usr/bin/env node
// payload/ is the source of the skills, runtime and references Joycraft installs.
// After editing it, run `node scripts/pin-payload.mjs` to rewrite payload/PIN;
// `--check` fails when PIN does not match the files (tests run it).
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const payloadDir = join(root, 'payload');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function walk(dir, base = dir) {
  return readdirSync(dir).sort().flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path, base) : [relative(base, path).split('\\').join('/')];
  });
}

/** The PIN for the files in `dir`: their hashes, and a content revision that changes when any file does. */
export function pinFor(dir = payloadDir) {
  const files = Object.fromEntries(walk(dir).filter(path => path !== 'PIN').map(path => [path, sha256(readFileSync(join(dir, path)))]));
  const commit = sha256(JSON.stringify(files));
  return { schemaVersion: 1, source: 'joycraft', tag: `payload-${commit.slice(0, 12)}`, commit, files };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const text = `${JSON.stringify(pinFor(), null, 2)}\n`;
  if (process.argv.includes('--check')) {
    if (readFileSync(join(payloadDir, 'PIN'), 'utf8') !== text) { console.error('payload/PIN is stale. Run: node scripts/pin-payload.mjs'); process.exit(1); }
    console.log('payload/PIN matches payload/.');
  } else {
    writeFileSync(join(payloadDir, 'PIN'), text);
    console.log(`payload/PIN: ${Object.keys(JSON.parse(text).files).length} files, ${JSON.parse(text).tag}`);
  }
}
