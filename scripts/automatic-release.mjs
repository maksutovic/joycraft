import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepareReleaseFiles, resolveReleaseVersion } from './release-preparation.mjs';

/** Derive release metadata from npm while retaining the reviewed source commit. */
export async function prepareAutomaticRelease({ cwd = process.cwd(), registryLookup } = {}) {
  const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'));
  const plan = await resolveReleaseVersion({ packageName: pkg.name, localVersion: pkg.version, ...(registryLookup ? { registryLookup } : {}) });
  if (!plan.ok) throw new Error(plan.error);
  prepareReleaseFiles({ cwd, version: plan.version });
  return { version: plan.version };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await prepareAutomaticRelease())); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
