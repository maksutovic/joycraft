import { randomBytes } from 'node:crypto';
import { lstat, mkdir, open, readFile, realpath, rename, unlink } from 'node:fs/promises';
import { join, sep } from 'node:path';

const preferencePath = '.joycraft/preferences.json';
const themes = new Set(['light', 'dark']);

export function checkedTheme(value, source = 'theme') {
  if (!themes.has(value)) throw new Error(`${source} must be light or dark`);
  return value;
}

async function checkedPreferencePath(root, { output = false } = {}) {
  const base = await realpath(root);
  let current = base;
  for (const part of preferencePath.split('/')) {
    current = join(current, part);
    let stat;
    try { stat = await lstat(current); }
    catch (error) { if (output && error.code === 'ENOENT') continue; throw error; }
    if (stat.isSymbolicLink() || (part === 'preferences.json' ? !stat.isFile() : !stat.isDirectory())) throw new Error(`Expected a plain project file: ${preferencePath}`);
  }
  if (!current.startsWith(base + sep)) throw new Error('Path escaped project root');
  return current;
}

function parsePreferences(bytes) {
  let preferences;
  try { preferences = JSON.parse(bytes.toString('utf8')); }
  catch { throw new Error(`Invalid JSON: ${preferencePath}`); }
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) throw new Error(`${preferencePath} must contain an object`);
  if (preferences.artifacts !== undefined && (!preferences.artifacts || typeof preferences.artifacts !== 'object' || Array.isArray(preferences.artifacts))) throw new Error(`${preferencePath} artifacts must be an object`);
  return preferences;
}

export async function artifactTheme(root) {
  let path;
  try { path = await checkedPreferencePath(root); }
  catch (error) { if (error.code === 'ENOENT') return undefined; throw error; }
  const preferences = parsePreferences(await readFile(path));
  return preferences.artifacts?.theme === undefined ? undefined : checkedTheme(preferences.artifacts.theme, 'Artifact preference theme');
}

export async function setArtifactTheme(root, theme) {
  checkedTheme(theme, 'Theme');
  const base = await realpath(root);
  const directory = join(base, '.joycraft');
  await mkdir(directory, { recursive: true });
  let path;
  try { path = await checkedPreferencePath(root); }
  catch (error) { if (error.code !== 'ENOENT') throw error; path = await checkedPreferencePath(root, { output: true }); }
  let preferences;
  try { preferences = parsePreferences(await readFile(path)); }
  catch (error) { if (error.code !== 'ENOENT') throw error; preferences = { schemaVersion: 1 }; }
  const updated = { ...preferences, artifacts: { ...(preferences.artifacts ?? {}), theme } };
  const temporary = `${path}.theme-${randomBytes(8).toString('hex')}`;
  const file = await open(temporary, 'wx', 0o600);
  try { await file.writeFile(`${JSON.stringify(updated, null, 2)}\n`); await file.sync(); }
  finally { await file.close(); }
  try { await checkedPreferencePath(root, { output: true }); await rename(temporary, path); }
  finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
  return updated;
}
