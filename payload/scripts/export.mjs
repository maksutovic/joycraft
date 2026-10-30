import { createHash, randomUUID } from 'node:crypto';
import { cp, lstat, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { applyLegacyHooks, planLegacyHooks } from './legacy-hooks.mjs';
import { relativePath } from '../.joycraft/runtime/identity.mjs';

export const installationManifestPath = '.joycraft/installation.json';
const mutableBundlePaths = new Set(['.joycraft/hooks-config.json', installationManifestPath]);
// Project-owned state shares the .joycraft/ directory with the bundle; it is never exported or replaced.
const projectOwned = path => /^\.joycraft\/(local\/|preferences\.json$|state\.json$)/.test(path);
export const previousBundleDir = '.joycraft-prototype';
const managedHookFiles = ['.claude/settings.json', '.codex/hooks.json', '.github/hooks/joycraft.json'];
const legacySkillNames = ['add-context', 'add-fact', 'bugfix', 'collaborative-setup', 'decide', 'decompose', 'design', 'gather-context', 'harden', 'implement-feature', 'implement-level5', 'implement', 'interview', 'lockdown', 'new-feature', 'optimize', 'research', 'session-end', 'setup', 'spec-done', 'tune', 'verify'];
const legacyDiscoveryPaths = ['.agents/skills/joycraft', '.claude/skills/joycraft', '.codex/skills/joycraft', '.agents/commands/joycraft', '.claude/commands/joycraft', '.codex/commands/joycraft', ...['.agents/skills', '.claude/skills', '.github/skills', '.pi/skills', '.omp/skills'].flatMap(root => legacySkillNames.map(name => `${root}/joycraft-${name}`)), '.pi/scripts/joycraft'];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

async function statOrNull(path) {
  try { return await lstat(path); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function filesUnder(root, relative) {
  const path = join(root, relative);
  const stat = await lstat(path);
  if (stat.isSymbolicLink()) throw new Error(`Symlink in bundle: ${relative}`);
  if (stat.isFile()) return [relative];
  if (!stat.isDirectory()) throw new Error(`Unsupported bundle entry: ${relative}`);
  const names = (await readdir(path)).sort();
  const files = [];
  for (const name of names) files.push(...await filesUnder(root, join(relative, name)));
  return files;
}

async function checkDestination(target, relative) {
  const rootStat = await statOrNull(target);
  if (rootStat && (!rootStat.isDirectory() || rootStat.isSymbolicLink())) {
    throw new Error('Target must be a directory, not a symlink');
  }
  const parts = relative.split('/');
  for (let count = 1; count < parts.length; count += 1) {
    const path = join(target, ...parts.slice(0, count));
    const stat = await statOrNull(path);
    if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) {
      throw new Error(`Destination parent is not a plain directory: ${path}`);
    }
  }
  const path = join(target, relative);
  const stat = await statOrNull(path);
  if (stat && (!stat.isFile() || stat.isSymbolicLink())) {
    throw new Error(`Destination is not a plain file: ${path}`);
  }
  return stat;
}

// Exact generated files from a pinned upstream revision. Other releases and
// local modifications remain conflicts rather than assumed ownership.
const legacyInventory = JSON.parse(await readFile(new URL('./legacy-inventory.json', import.meta.url), 'utf8'));
const isKnownLegacySkill = (path, bytes) => legacyInventory.files[path] === sha256(bytes);

async function readInstallationManifest(target) {
  await checkDestination(target, installationManifestPath);
  let text;
  try { text = await readFile(join(target, installationManifestPath), 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  let manifest;
  try { manifest = JSON.parse(text); } catch { throw new Error('Invalid Joycraft installation manifest; review it before using --upgrade'); }
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.files)
    || manifest.files.some(entry => !entry || typeof entry.path !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256))) {
    throw new Error('Unsupported Joycraft installation manifest; review it before using --upgrade');
  }
  const entries = new Map();
  for (const entry of manifest.files) {
    if (relativePath(entry.path) !== entry.path || entries.has(entry.path)) throw new Error('Unsafe or duplicate installation manifest path');
    entries.set(entry.path, entry.sha256);
  }
  return entries;
}

async function prepareBackup(target, backupRoot) {
  const ignored = join(backupRoot, '.gitignore');
  await checkDestination(target, relative(target, ignored));
  await mkdir(backupRoot, { recursive: true, mode: 0o700 });
  await writeFile(ignored, '*\n', { flag: 'wx', mode: 0o600 });
}

async function backupFile(target, path, bytes, backupRoot) {
  const backup = join(backupRoot, path);
  await checkDestination(target, relative(target, backup));
  await mkdir(dirname(backup), { recursive: true, mode: 0o700 });
  await writeFile(backup, bytes, { flag: 'wx', mode: 0o600 });
  return relative(target, backup);
}

async function legacyPlan(target, installed, canonicalDestinations) {
  const archive = []; const conflicts = [];
  for (const path of legacyDiscoveryPaths) {
    const parts = path.split('/'); let unsafe = false;
    for (let count = 1; count < parts.length; count += 1) { const parent = await statOrNull(join(target, ...parts.slice(0, count))); if (parent?.isSymbolicLink() || (parent && !parent.isDirectory())) { unsafe = true; break; } }
    if (unsafe) { conflicts.push({ path, reason: 'legacy discovery parent is not a plain directory' }); continue; }
    const stat = await statOrNull(join(target, path));
    if (!stat) continue;
    if (stat.isSymbolicLink()) { conflicts.push({ path, reason: 'symlinked legacy discovery path' }); continue; }
    if (!stat.isDirectory()) { conflicts.push({ path, reason: 'legacy discovery path is not a directory' }); continue; }
    const entries = await readdir(join(target, path));
    const skillPath = `${path}/SKILL.md`;
    const skillStat = entries.length === 1 && entries[0] === 'SKILL.md' ? await lstat(join(target, skillPath)) : null;
    const skillBytes = skillStat?.isFile() && !skillStat.isSymbolicLink() ? await readFile(join(target, skillPath)) : null;
    // A byte-verified installed skill owned by this export is current bundle
    // content, not an unknown legacy directory merely because names overlap.
    if (skillBytes && canonicalDestinations.has(skillPath) && installed?.get(skillPath) === sha256(skillBytes)) continue;
    const known = skillBytes && isKnownLegacySkill(skillPath, skillBytes);
    if (!known) conflicts.push({ path, reason: 'contains bytes not in the pinned legacy inventory' });
    else archive.push(path);
  }
  return { archive, conflicts };
}

/** Move an install from the pre-1.0 `.joycraft-prototype/` directory to `.joycraft/`, once.
 * Backs up the old directory first, never touches `.joycraft/local/` or other project-owned
 * state, and refuses to replace a different file. A second run finds nothing to move. */
export async function migrateBundleDir(targetRoot, { check = false, stamp = new Date().toISOString().replace(/[:.]/g, '-') } = {}) {
  const target = resolve(targetRoot);
  const old = join(target, previousBundleDir);
  const oldStat = await statOrNull(old);
  if (!oldStat) return { moved: [], hookFiles: [], backup: null };
  if (!oldStat.isDirectory() || oldStat.isSymbolicLink()) throw new Error(`${previousBundleDir} is not a plain directory`);
  const moved = (await filesUnder(target, previousBundleDir)).map(path => ({ from: path, to: `.joycraft/${path.slice(previousBundleDir.length + 1)}` }));
  for (const { from, to } of moved) {
    if (projectOwned(to)) throw new Error(`${from} would replace project state at ${to}; move it by hand`);
    await checkDestination(target, to);
    const existing = await statOrNull(join(target, to));
    if (existing && !(await readFile(join(target, to))).equals(await readFile(join(target, from)))) throw new Error(`Both ${from} and a different ${to} exist; reconcile them before upgrading`);
  }
  const hookFiles = [];
  for (const file of managedHookFiles) {
    const text = (await statOrNull(join(target, file))) ? await readFile(join(target, file), 'utf8') : null;
    if (text?.includes(`${previousBundleDir}/`)) hookFiles.push(file);
  }
  if (check) return { moved, hookFiles, backup: null };
  const backup = join('.joycraft-backups', `bundle-dir-${stamp}`);
  await prepareBackup(target, join(target, backup));
  await cp(old, join(target, backup, previousBundleDir), { recursive: true, errorOnExist: true, force: false });
  for (const file of hookFiles) {
    await mkdir(dirname(join(target, backup, file)), { recursive: true });
    await cp(join(target, file), join(target, backup, file));
    // Only Joycraft's own launcher names the bundle directory; user hooks keep their bytes.
    await writeFile(join(target, file), (await readFile(join(target, file), 'utf8')).replaceAll(`${previousBundleDir}/`, '.joycraft/'));
  }
  for (const { from, to } of moved) {
    await mkdir(dirname(join(target, to)), { recursive: true });
    await rename(join(target, from), join(target, to));
  }
  const manifest = join(target, installationManifestPath);
  if (await statOrNull(manifest)) {
    const text = await readFile(manifest, 'utf8');
    await writeFile(manifest, text.replaceAll(`"${previousBundleDir}/`, '".joycraft/'));
  }
  await rm(old, { recursive: true });
  return { moved, hookFiles, backup };
}

/** Copy the explicit public bundle only. Never replace a different user file. */
export async function exportBundle({ sourceRoot, targetRoot, check = false, hooks = false, harness = 'codex', upgrade = false }) {
  if (!['codex', 'claude', 'pi', 'omp', 'github-copilot', 'opencode'].includes(harness)) throw new Error('Unknown harness');
  const source = resolve(sourceRoot);
  const target = resolve(targetRoot);
  if (source === target) throw new Error('Source and target must differ');
  const bundleMove = upgrade ? await migrateBundleDir(target, { check }) : null;
  const files = (await filesUnder(source, '.joycraft')).filter(path => !mutableBundlePaths.has(path) && !projectOwned(path));
  const skillsPath = join(source, '.agents/skills');
  const skillsStat = await statOrNull(skillsPath);
  if (skillsStat) {
    if (!skillsStat.isDirectory() || skillsStat.isSymbolicLink()) throw new Error('Invalid skills directory');
    for (const name of (await readdir(skillsPath)).sort()) {
      if (/^joycraft-[a-z0-9-]+$/.test(name)) {
        files.push(...await filesUnder(source, join('.agents/skills', name)));
      }
    }
  }
  // Claude Code gets the generic implementer and reviewer agent types.
  if (harness === 'claude' && (await statOrNull(join(source, '.claude/agents')))?.isDirectory()) {
    for (const name of (await readdir(join(source, '.claude/agents'))).sort()) {
      if (/^joycraft-[a-z0-9-]+\.md$/.test(name)) files.push(...await filesUnder(source, join('.claude/agents', name)));
    }
  }
  files.sort();
  const destinationPath = path => harness === 'claude' ? path.replace(/^\.agents\/skills\//, '.claude/skills/') : path;
  const bundleBytes = async path => {
    const bytes = await readFile(join(source, path));
    return harness === 'claude' && path.endsWith('.md') ? Buffer.from(bytes.toString('utf8').replaceAll('.agents/skills/', '.claude/skills/')) : bytes;
  };
  // Native hooks are optional; their installer loads only when hooks are requested.
  const hookInstaller = hooks ? await import('./install-hooks.mjs') : null;
  if (hooks && !files.includes(hookInstaller.hookRuntimePath)) throw new Error('The source bundle has no hook runtime');
  const installed = await readInstallationManifest(target);
  const legacy = upgrade ? await legacyPlan(target, installed, new Set(files.map(destinationPath))) : { archive: [], conflicts: [] };
  const legacyHooks = upgrade ? await planLegacyHooks({ targetRoot: target }) : null;
  if (legacyHooks?.conflicts.length) throw new Error(`Legacy native hooks need reconciliation before upgrade: ${legacyHooks.conflicts.map(item => item.path).join(', ')}`);
  const pending = [];
  const replacements = [];
  for (const relative of files) {
    const path = destinationPath(relative);
    const stat = await checkDestination(target, path);
    const wanted = await bundleBytes(relative);
    if (!stat) pending.push({ relative, path, wanted });
    else {
      const actual = await readFile(join(target, path));
      if (!wanted.equals(actual)) {
        const known = installed?.get(path) === sha256(actual) || (!installed && isKnownLegacySkill(path, actual));
        if (!upgrade || !known) throw new Error(`Refusing to replace existing file: ${relative}${upgrade ? ' (it is not a recognized prior Joycraft file)' : ''}`);
        replacements.push({ relative, path, wanted, actual });
      }
    }
  }
  const adapters = hooks ? hookInstaller.hookAdapters(harness) : [];
  for (const adapter of adapters) {
    const stat = await checkDestination(target, adapter.path); const wanted = await readFile(join(source, adapter.source));
    if (!stat) pending.push({ relative: adapter.source, path: adapter.path, wanted });
    else { const actual = await readFile(join(target, adapter.path)); if (!wanted.equals(actual)) {
      const known = installed?.get(adapter.path) === sha256(actual);
      if (!upgrade || !known) throw new Error(`Refusing to replace existing adapter: ${adapter.path}`);
      replacements.push({ relative: adapter.source, path: adapter.path, wanted, actual });
    } }
  }
  let sourceRevision = 'unavailable';
  try { sourceRevision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch {}
  const manifestFiles = await Promise.all(files.map(async relative => ({ path: destinationPath(relative), sha256: sha256(await bundleBytes(relative)) })));
  const adapterFiles = [];
  for (const adapter of adapters) adapterFiles.push({ path: adapter.path, sha256: sha256(await readFile(join(source, adapter.source))) });
  const manifest = { schemaVersion: 1, sourceRevision, harness, files: [...manifestFiles, ...adapterFiles], legacyConflicts: legacy.conflicts };
  manifest.files.sort((a, b) => a.path.localeCompare(b.path));
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  const manifestStat = await statOrNull(join(target, installationManifestPath));
  const hooksPlan = hooks && !['pi', 'omp', 'opencode'].includes(harness) ? await hookInstaller.planCodexHooks({ targetRoot: target, harness }) : null;
  const backupRoot = join(target, '.joycraft-backups', `upgrade-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`);
  legacy.archive = legacy.archive.filter(path => !manifest.files.some(file => file.path.startsWith(`${path}/`)));
  if (!check) {
    if (replacements.length || legacy.archive.length || legacyHooks?.backups.length) await prepareBackup(target, backupRoot);
    for (const { path, wanted } of pending) {
      const destination = join(target, path);
      await checkDestination(target, path);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, wanted, { flag: 'wx' });
    }
    for (const { path, wanted, actual } of replacements) {
      const destination = join(target, path);
      if (!(await readFile(destination)).equals(actual)) throw new Error(`Destination changed during upgrade: ${path}; rerun the preview`);
      await backupFile(target, path, actual, backupRoot);
      await writeFile(destination, wanted);
    }
    for (const path of legacy.archive) {
      const sourcePath = join(target, path); const destination = join(backupRoot, 'legacy-discovery', path);
      await mkdir(dirname(destination), { recursive: true }); await rename(sourcePath, destination);
    }
    const previousManifest = manifestStat ? await readFile(join(target, installationManifestPath)) : null;
    if (!previousManifest || !previousManifest.equals(manifestBytes)) {
      await checkDestination(target, installationManifestPath);
      await mkdir(dirname(join(target, installationManifestPath)), { recursive: true });
      const temp = join(target, '.joycraft', `installation.${randomUUID()}.tmp`);
      await writeFile(temp, manifestBytes, { flag: 'wx' });
      await rename(temp, join(target, installationManifestPath));
    }
    if (hooksPlan) await hookInstaller.applyCodexHooks(hooksPlan);
    if (legacyHooks) {
      const currentLegacyHooks = await planLegacyHooks({ targetRoot: target });
      if (currentLegacyHooks.conflicts.length) throw new Error('Legacy hooks changed during upgrade; reconcile them before continuing');
      await applyLegacyHooks(currentLegacyHooks, { backupRoot });
    }
  }
  return { check, harness, files: manifest.files.map(entry => entry.path), added: pending.map(item => item.path), replaced: replacements.map(item => item.path), archivedLegacyDiscovery: legacy.archive, legacyConflicts: legacy.conflicts, unchanged: manifest.files.length - pending.length - replacements.length, manifest: installationManifestPath,
    ...(legacyHooks ? { legacyHooks } : {}),
    ...(bundleMove?.moved.length ? { bundleMove } : {}),
    ...(replacements.length ? { backups: check ? replacements.map(item => item.path) : replacements.map(item => relative(target, join(backupRoot, item.path))) } : {}),
    ...(hooksPlan ? { hooks: hookInstaller.hookPlanSummary(hooksPlan) } : {}) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    let harness = 'codex';
    const harnessIndex = args.indexOf('--harness');
    if (harnessIndex >= 0) { harness = args[harnessIndex + 1]; args.splice(harnessIndex, 2); }
    const targetIndex = args.indexOf('--target');
    const target = targetIndex >= 0 ? args[targetIndex + 1] : undefined;
    const remaining = args.filter((_, index) => index !== targetIndex && index !== targetIndex + 1);
    if (!target || target.startsWith('--') || remaining.some(arg => !['--check', '--without-hooks', '--upgrade'].includes(arg)) || new Set(remaining).size !== remaining.length) {
      throw new Error('Usage: node scripts/export.mjs --target <project> [--check] [--upgrade] [--without-hooks] [--harness codex|claude|pi|omp|github-copilot|opencode]');
    }
    const sourceRoot = fileURLToPath(new URL('..', import.meta.url));
    const hooks = !remaining.includes('--without-hooks') && harness !== 'opencode';
    const result = await exportBundle({ sourceRoot, targetRoot: target, check: remaining.includes('--check'), upgrade: remaining.includes('--upgrade'), hooks, harness });
    let revision = 'unavailable';
    try { revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch {}
    console.log(JSON.stringify({ revision, ...result }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
