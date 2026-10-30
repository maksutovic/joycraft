import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { filesForHosts, HOSTS, payloadRoot, readPin, sha256, type Host } from './payload.js';

export const MANIFEST_PATH = '.joycraft/installation.json';
export const JOURNAL_PATH = '.joycraft/local/update-journal.json';
export const BACKUP_ROOT = '.joycraft-backups';
const IGNORE_LINES = ['.joycraft/local/', '.joycraft-backups/'];

export interface InstalledManifest {
  schemaVersion: 1;
  joycraft: string;
  tag: string;
  sourceRevision: string;
  harness: Host;
  hosts: Host[];
  files: { path: string; sha256: string }[];
}

export type Action =
  | { kind: 'add'; path: string }
  | { kind: 'replace'; path: string }
  | { kind: 'replace-edited'; path: string }
  | { kind: 'conflict'; path: string }
  | { kind: 'remove'; path: string; edited: boolean };

export interface Plan {
  root: string;
  hosts: Host[];
  from: { tag: string; sourceRevision: string } | null;
  to: { tag: string; sourceRevision: string; joycraft: string };
  actions: Action[];
  unchanged: number;
  gitignore: string[];
}

function inside(root: string, path: string): string {
  const full = resolve(root, path);
  if (full !== root && !full.startsWith(root + sep)) throw new Error(`Path escapes the project: ${path}`);
  return full;
}

function readBytes(root: string, path: string): Buffer | null {
  const full = inside(root, path);
  try {
    const stat = lstatSync(full);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`Not a plain file: ${path}`);
    return readFileSync(full);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export function readManifest(root: string): InstalledManifest | null {
  const bytes = readBytes(root, MANIFEST_PATH);
  if (!bytes) return null;
  const manifest = JSON.parse(bytes.toString('utf8'));
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.files)) throw new Error(`Unsupported ${MANIFEST_PATH}; review it before updating`);
  return manifest as InstalledManifest;
}

function packageVersion(): string {
  const pkg = JSON.parse(readFileSync(join(payloadRoot(), '..', 'package.json'), 'utf8'));
  return String(pkg.version);
}

/**
 * The update rule: add what is missing, replace Joycraft files whose bytes match
 * the last install, back up an edited Joycraft file before replacing it, and
 * never replace a file Joycraft did not install (a conflict).
 */
export function planInstall(dir: string, hosts: readonly Host[]): Plan {
  const root = resolve(dir);
  if (!hosts.length) throw new Error('Choose at least one host');
  const pin = readPin();
  const installed = readManifest(root);
  const previous = new Map((installed?.files ?? []).map((file) => [file.path, file.sha256]));
  const wanted = filesForHosts(hosts);
  const actions: Action[] = [];
  let unchanged = 0;
  for (const file of wanted) {
    const current = readBytes(root, file.path);
    if (!current) actions.push({ kind: 'add', path: file.path });
    else if (current.equals(file.bytes)) unchanged += 1;
    else if (previous.get(file.path) === sha256(current)) actions.push({ kind: 'replace', path: file.path });
    else if (previous.has(file.path)) actions.push({ kind: 'replace-edited', path: file.path });
    else actions.push({ kind: 'conflict', path: file.path });
  }
  const keep = new Set(wanted.map((file) => file.path));
  for (const [path, hash] of previous) {
    if (keep.has(path)) continue;
    const current = readBytes(root, path);
    if (current) actions.push({ kind: 'remove', path, edited: sha256(current) !== hash });
  }
  const ignore = readBytes(root, '.gitignore')?.toString('utf8') ?? '';
  const present = new Set(ignore.split('\n').map((line) => line.trim()));
  return {
    root, hosts: [...hosts],
    from: installed ? { tag: installed.tag, sourceRevision: installed.sourceRevision } : null,
    to: { tag: pin.tag, sourceRevision: pin.commit, joycraft: packageVersion() },
    actions, unchanged,
    gitignore: IGNORE_LINES.filter((line) => !present.has(line) && !present.has(`/${line}`)),
  };
}

export function formatPlan(plan: Plan): string {
  const count = (kind: Action['kind']) => plan.actions.filter((action) => action.kind === kind).length;
  const lines = [
    `Joycraft ${plan.to.joycraft} (${plan.to.tag}) for ${plan.hosts.join(', ')}${plan.from ? `, from ${plan.from.tag}` : ''}`,
    `  add ${count('add')} · replace ${count('replace')} · replace edited ${count('replace-edited')} (backed up) · remove ${count('remove')} · unchanged ${plan.unchanged}`,
  ];
  for (const action of plan.actions.filter((item) => item.kind === 'replace-edited' || item.kind === 'conflict' || (item.kind === 'remove' && item.edited))) {
    lines.push(`  ${action.kind === 'conflict' ? 'CONFLICT (not Joycraft\'s, kept)' : action.kind === 'remove' ? 'remove edited (backed up)' : 'edited, backed up then replaced'}: ${action.path}`);
  }
  if (plan.gitignore.length) lines.push(`  .gitignore gains: ${plan.gitignore.join(' ')}`);
  return lines.join('\n');
}

function writeFile(root: string, path: string, bytes: Buffer | string): void {
  const full = inside(root, path);
  mkdirSync(dirname(full), { recursive: true });
  const temp = `${full}.joycraft-${process.pid}.tmp`;
  writeFileSync(temp, bytes);
  renameSync(temp, full);
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export interface ApplyResult { backup: string | null; written: string[]; removed: string[]; conflicts: string[] }

/**
 * Apply a plan in one recoverable step: every file the plan changes is copied to
 * the backup first and listed in a journal; the manifest is written last; the
 * journal is removed when the install is complete. `recoverInstall` undoes an
 * interrupted apply from that journal.
 */
export function applyInstall(plan: Plan, { backupName = `update-${stamp()}` } = {}): ApplyResult {
  const { root } = plan;
  if (existsSync(join(root, JOURNAL_PATH))) throw new Error('An interrupted Joycraft update is pending; run `joycraft update --recover` first');
  const byPath = new Map(filesForHosts(plan.hosts).map((file) => [file.path, file]));
  const backup = join(BACKUP_ROOT, backupName);
  const touched = plan.actions.filter((action) => action.kind !== 'conflict').map((action) => action.path);
  const saved: string[] = [];
  for (const path of [...touched, MANIFEST_PATH, '.gitignore']) {
    const bytes = readBytes(root, path);
    if (bytes) {
      // copyFileSync keeps the file mode, so a restored script stays executable.
      mkdirSync(dirname(inside(root, join(backup, 'files', path))), { recursive: true });
      copyFileSync(inside(root, path), inside(root, join(backup, 'files', path)));
      saved.push(path);
    }
  }
  if (saved.length) writeFile(root, join(backup, '.gitignore'), '*\n');
  writeFile(root, JOURNAL_PATH, `${JSON.stringify({ schemaVersion: 1, backup, saved, created: touched.filter((path) => !saved.includes(path)) }, null, 2)}\n`);
  const written: string[] = []; const removed: string[] = [];
  for (const action of plan.actions) {
    if (action.kind === 'conflict') continue;
    if (action.kind === 'remove') { rmSync(inside(root, action.path)); removed.push(action.path); continue; }
    writeFile(root, action.path, byPath.get(action.path)!.bytes);
    written.push(action.path);
  }
  if (plan.gitignore.length) {
    const ignore = readBytes(root, '.gitignore')?.toString('utf8') ?? '';
    writeFile(root, '.gitignore', `${ignore}${ignore && !ignore.endsWith('\n') ? '\n' : ''}${plan.gitignore.join('\n')}\n`);
  }
  const pin = readPin();
  const files = [...byPath.values()]
    .filter((file) => !plan.actions.some((action) => action.kind === 'conflict' && action.path === file.path))
    .map((file) => ({ path: file.path, sha256: sha256(file.bytes) }));
  const manifest: InstalledManifest = {
    schemaVersion: 1, joycraft: plan.to.joycraft, tag: pin.tag, sourceRevision: pin.commit,
    harness: plan.hosts.includes('claude') ? 'claude' : plan.hosts[0], hosts: plan.hosts, files,
  };
  writeFile(root, MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  rmSync(join(root, JOURNAL_PATH));
  return { backup: saved.length ? backup : null, written, removed, conflicts: plan.actions.filter((action) => action.kind === 'conflict').map((action) => action.path) };
}

/** Undo an interrupted apply: restore every saved file and delete files it created. */
export function recoverInstall(dir: string): { restored: number; deleted: number } {
  const root = resolve(dir);
  const bytes = readBytes(root, JOURNAL_PATH);
  if (!bytes) return { restored: 0, deleted: 0 };
  const journal = JSON.parse(bytes.toString('utf8')) as { backup: string; saved: string[]; created: string[] };
  for (const path of journal.saved) copyFileSync(inside(root, join(journal.backup, 'files', path)), inside(root, path));
  for (const path of journal.created) rmSync(inside(root, path), { force: true });
  if (!journal.saved.includes(MANIFEST_PATH)) rmSync(inside(root, MANIFEST_PATH), { force: true });
  rmSync(join(root, JOURNAL_PATH));
  return { restored: journal.saved.length, deleted: journal.created.length };
}

export interface DoctorResult { ok: boolean; installed: boolean; tag: string | null; missing: string[]; edited: string[] }

/** Check the install against its manifest. Edited Joycraft files are reported, not failures. */
export function doctor(dir: string): DoctorResult {
  const root = resolve(dir);
  const manifest = readManifest(root);
  if (!manifest) return { ok: false, installed: false, tag: null, missing: [], edited: [] };
  const missing: string[] = []; const edited: string[] = [];
  for (const file of manifest.files) {
    const bytes = readBytes(root, file.path);
    if (!bytes) missing.push(file.path);
    else if (sha256(bytes) !== file.sha256) edited.push(file.path);
  }
  const pending = existsSync(join(root, JOURNAL_PATH));
  return { ok: !missing.length && !pending, installed: true, tag: manifest.tag, missing, edited };
}

export function recordedHosts(dir: string): Host[] | null {
  const manifest = readManifest(resolve(dir));
  const hosts = manifest?.hosts?.filter((host): host is Host => (HOSTS as readonly string[]).includes(host));
  return hosts?.length ? hosts : null;
}
