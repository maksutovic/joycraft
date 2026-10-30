import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { resolveRelativeJoycraftHooks } from './hook-paths.mjs';

const claudeHandler = '.claude/hooks/joycraft-version-check.mjs';
const claudeSettings = '.claude/settings.json';
const claudeCommand = 'node .claude/hooks/joycraft-version-check.mjs';
const piPipeline = '.pi/extensions/joycraft-pipeline.ts';
const knownBytes = new Map([
  [claudeHandler, '6bb3f624676067f66bd2b31dba5551f4af65164267abc449cb2fe7cc8771fb31'],
  [piPipeline, 'ef5468ee36fd6c5c7358153b498c5b6b383e9f5be4138751e0e695c8468b02a8'],
]);
const privatePlans = new WeakMap();

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

async function statOrNull(path) {
  try { return await lstat(path); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function plainFile(root, path) {
  await plainParents(root, path);
  const full = join(root, path);
  const stat = await statOrNull(full);
  if (!stat) return null;
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Legacy hook path is not a plain file: ${path}`);
  return readFile(full);
}

async function plainParents(root, path) {
  const parts = path.split('/');
  for (let index = 1; index < parts.length; index += 1) {
    const current = join(root, ...parts.slice(0, index));
    const stat = await statOrNull(current);
    if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) throw new Error(`Legacy hook parent is not a plain directory: ${parts.slice(0, index).join('/')}`);
  }
}

function removeClaudeCommand(settings) {
  if (!object(settings) || (settings.hooks !== undefined && !object(settings.hooks))) throw new Error('Legacy Claude settings are not a supported JSON object');
  const hooks = settings.hooks ?? {};
  const changed = [];
  for (const [event, groups] of Object.entries(hooks)) {
    if (!Array.isArray(groups)) throw new Error(`Legacy Claude hook groups are unsupported for ${event}`);
    const retained = [];
    for (const group of groups) {
      if (!object(group) || !Array.isArray(group.hooks)) throw new Error(`Legacy Claude hook group is unsupported for ${event}`);
      const nextHooks = group.hooks.filter(hook => !(object(hook) && hook.type === 'command' && hook.command === claudeCommand));
      if (nextHooks.length !== group.hooks.length) changed.push({ event, removed: group.hooks.length - nextHooks.length });
      if (nextHooks.length) retained.push({ ...group, hooks: nextHooks });
    }
    if (retained.length) hooks[event] = retained;
    else delete hooks[event];
  }
  return { settings: { ...settings, ...(Object.keys(hooks).length ? { hooks } : {}) }, changed };
}

/**
 * Inspect only exact legacy native-hook surfaces. Unknown bytes are conflicts,
 * never evidence that a hook is ours to replace or archive.
 */
export async function planLegacyHooks({ targetRoot }) {
  const root = resolve(targetRoot);
  const archive = []; const conflicts = []; let settingsBefore = null; let settingsAfter = null; let removedHandlers = []; let resolvedCommands = [];
  const [claudeBytes, piBytes, settingsBytes] = await Promise.all([
    plainFile(root, claudeHandler), plainFile(root, piPipeline), plainFile(root, claudeSettings),
  ]);
  const exactClaude = claudeBytes && sha256(claudeBytes) === knownBytes.get(claudeHandler);
  const exactPi = piBytes && sha256(piBytes) === knownBytes.get(piPipeline);
  if (claudeBytes && !exactClaude) conflicts.push({ path: claudeHandler, reason: 'custom legacy hook bytes preserved' });
  else if (exactClaude) archive.push(claudeHandler);
  if (piBytes && !exactPi) conflicts.push({ path: piPipeline, reason: 'custom legacy Pi extension preserved' });
  else if (exactPi) archive.push(piPipeline);
  if (settingsBytes) {
    let parsed;
    try { parsed = JSON.parse(settingsBytes.toString('utf8')); } catch { throw new Error('Legacy Claude settings are not valid JSON'); }
    const migration = removeClaudeCommand(parsed);
    const resolved = resolveRelativeJoycraftHooks(migration.settings);
    if (migration.changed.length || resolved.rewritten.length) {
      settingsBefore = settingsBytes;
      settingsAfter = Buffer.from(`${JSON.stringify(resolved.settings, null, 2)}\n`);
      removedHandlers = migration.changed;
      resolvedCommands = resolved.rewritten;
    }
  }
  const plan = { targetRoot: root, archive, conflicts, removedHandlers, resolvedCommands, settings: settingsAfter ? { path: claudeSettings, changed: true } : { path: claudeSettings, changed: false }, backups: [...archive, ...(settingsAfter ? [claudeSettings] : [])] };
  // Settings can include private project configuration. Keep exact comparison
  // bytes only in memory so a dry-run result is safe to print as JSON.
  privatePlans.set(plan, { settingsBefore, settingsAfter });
  return plan;
}

/** Apply a reviewed plan. All modified old bytes are copied to a local backup. */
export async function applyLegacyHooks(plan, { backupRoot } = {}) {
  const root = resolve(plan.targetRoot);
  const privatePlan = privatePlans.get(plan);
  if (!privatePlan) throw new Error('Legacy hook plan is not available for application; rerun the preview in this process');
  const destinationRoot = backupRoot ? resolve(backupRoot) : join(root, '.joycraft-backups', `legacy-hooks-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`);
  if (!relative(root, destinationRoot) || relative(root, destinationRoot).startsWith('..')) throw new Error('Legacy hook backup must remain inside the target project');
  if (plan.archive.length || privatePlan.settingsAfter) {
    await plainParents(root, `${relative(root, destinationRoot)}/.gitignore`);
    await mkdir(destinationRoot, { recursive: true, mode: 0o700 });
    const ignored = join(destinationRoot, '.gitignore');
    const existingIgnore = await statOrNull(ignored);
    if (existingIgnore && (existingIgnore.isSymbolicLink() || !existingIgnore.isFile())) throw new Error('Unsafe legacy backup ignore file');
    if (!existingIgnore) await writeFile(ignored, '*\n', { flag: 'wx', mode: 0o600 });
  }
  if (privatePlan.settingsAfter) {
    const current = await plainFile(root, claudeSettings);
    if (!current || !current.equals(privatePlan.settingsBefore)) throw new Error('Legacy Claude settings changed after preview; rerun migration');
    await plainParents(root, claudeSettings);
    const backup = join(destinationRoot, claudeSettings);
    await mkdir(dirname(backup), { recursive: true }); await writeFile(backup, current, { flag: 'wx', mode: 0o600 });
    const temporary = `${join(root, claudeSettings)}.${randomUUID()}.tmp`;
    await writeFile(temporary, privatePlan.settingsAfter, { flag: 'wx', mode: 0o600 }); await rename(temporary, join(root, claudeSettings));
  }
  for (const path of plan.archive) {
    const bytes = await plainFile(root, path);
    if (!bytes || sha256(bytes) !== knownBytes.get(path)) throw new Error(`Legacy hook changed after preview: ${path}`);
    await plainParents(root, path);
    const backup = join(destinationRoot, path);
    await mkdir(dirname(backup), { recursive: true }); await rename(join(root, path), backup);
  }
  return { ...plan, backups: plan.archive.length || privatePlan.settingsAfter ? relative(root, destinationRoot) : null };
}
