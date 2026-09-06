import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import * as fs from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

import {
  manifestDigest,
  manifestPath,
  parseInstallationManifest,
  rawFileHash,
  readInstallationManifestInfo,
  validateManifest,
  type InstallationManifest,
} from './install-manifest.js';
import { resolveUpdatePath } from './update-paths.js';
import type { PlannedUpdateAction, SnapshotContent, UpdatePlan } from './update-plan.js';
import type { GitignoreProfile } from './version.js';

const LOCAL_DIR = 'docs/.joycraft/local';
const LOCK_RELATIVE = `${LOCAL_DIR}/update.lock`;
const JOURNAL_RELATIVE = `${LOCAL_DIR}/update-journal.json`;
const BACKUPS_RELATIVE = `${LOCAL_DIR}/backups`;
const LAST_SUCCESSFUL_RELATIVE = `${LOCAL_DIR}/last-successful.json`;

export type TransactionPhase =
  | 'lock-acquired'
  | 'journal-written'
  | 'backups-written'
  | 'staged'
  | 'files-applied'
  | 'files-verified'
  | 'manifest-renamed'
  | 'journal-bookkept'
  | 'cleanup'
  | 'complete';

export interface TransactionPhaseInfo {
  operationId: string;
  journalPath: string;
}

export interface TransactionOptions {
  profile?: GitignoreProfile;
  operationId?: string;
  /** Throw after the selected real phase, leaving the journal for recovery. */
  failureAt?: TransactionPhase;
  onPhase?: (phase: TransactionPhase, info: TransactionPhaseInfo) => void;
}

export interface TransactionResult {
  status: 'applied' | 'noop' | 'attention' | 'failed' | 'conflict' | 'rolled-back' | 'committed' | 'none';
  operationId?: string;
  phase?: TransactionPhase;
  journalPath?: string;
  backupPath?: string;
  diagnostics: string[];
  conflicts: string[];
}

interface EncodedBytes {
  encoding: 'base64';
  data: string;
}

interface Image {
  present: boolean;
  bytes?: EncodedBytes;
  hash?: string;
  mode?: number;
}

interface JournalOperation {
  path: string;
  kind: 'write' | 'delete';
  before: Image;
  after: Image;
  stageRelative?: string;
  backupRelative?: string;
}

interface TransactionJournal {
  schemaVersion: 1;
  operationId: string;
  profile: GitignoreProfile;
  phase: TransactionPhase;
  oldManifestDigest: string | null;
  newManifestDigest: string;
  oldManifest?: EncodedBytes;
  newManifest: EncodedBytes;
  plan: unknown;
  operations: JournalOperation[];
  backupRelative: string;
}

interface SuccessfulBackup {
  schemaVersion: 1;
  operationId: string;
  profile: GitignoreProfile;
  oldManifestDigest: string | null;
  newManifestDigest: string;
  oldManifest?: EncodedBytes;
  newManifest: EncodedBytes;
  operations: JournalOperation[];
  backupRelative: string;
}

interface LockHandle {
  path: string;
  ownerPath: string;
  operationId: string;
  acquired: boolean;
}

class TransactionConflictError extends Error {
  readonly conflictPath?: string;

  constructor(message: string, conflictPath?: string) {
    super(message);
    this.name = 'TransactionConflictError';
    this.conflictPath = conflictPath;
  }
}

function encode(value: unknown): unknown {
  if (Buffer.isBuffer(value)) return { __joycraftBuffer: value.toString('base64') };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)]));
  }
  return value;
}

function decode(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    if (typeof object.__joycraftBuffer === 'string' && Object.keys(object).length === 1) {
      return Buffer.from(object.__joycraftBuffer, 'base64');
    }
    return Object.fromEntries(Object.entries(object).map(([key, item]) => [key, decode(item)]));
  }
  return value;
}

function bytes(value: SnapshotContent): Buffer {
  return Buffer.isBuffer(value) ? Buffer.from(value) : Buffer.from(value);
}

function imageBytes(image: Image): Buffer | undefined {
  return image.present && image.bytes ? Buffer.from(image.bytes.data, 'base64') : undefined;
}

function imageOf(content: Buffer | undefined, mode: number | undefined): Image {
  if (!content) return { present: false };
  return { present: true, bytes: { encoding: 'base64', data: content.toString('base64') }, hash: rawFileHash(content), ...(mode === undefined ? {} : { mode }) };
}

function modeOf(path: string): number | undefined {
  try { return statSync(path).mode & 0o7777; } catch { return undefined; }
}

function hitPhase(options: TransactionOptions, phase: TransactionPhase, info: TransactionPhaseInfo): void {
  options.onPhase?.(phase, info);
  if (options.failureAt === phase) {
    throw new Error(`Injected transaction failure after ${phase}.`);
  }
}

function localPath(root: string, relativePath: string): string {
  return resolveUpdatePath(root, relativePath);
}

function ensureDirectory(root: string, relativePath: string): string {
  const path = localPath(root, relativePath);
  mkdirSync(path, { recursive: true });
  // Recheck after mkdir to catch a replacement by a symlink or file.
  return localPath(root, relativePath);
}

function durableWrite(path: string, data: Buffer | string, mode?: number): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
  if (mode !== undefined) chmodSync(path, mode);
  const fd = openSync(path, 'r');
  try { fsyncSync(fd); } finally { closeFd(fd); }
}

function closeFd(fd: number): void {
  closeSync(fd);
}

function readJournal(root: string): TransactionJournal | null {
  const path = localPath(root, JOURNAL_RELATIVE);
  if (!existsSync(path)) return null;
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<TransactionJournal>;
  if (parsed.schemaVersion !== 1 || typeof parsed.operationId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(parsed.operationId) || !Array.isArray(parsed.operations)
    || typeof parsed.newManifestDigest !== 'string' || !parsed.newManifest || typeof parsed.backupRelative !== 'string') {
    throw new Error('Invalid Joycraft update journal; refusing recovery.');
  }
  return parsed as TransactionJournal;
}

function writeJournal(root: string, journal: TransactionJournal): string {
  const path = localPath(root, JOURNAL_RELATIVE);
  const tempRelative = `${JOURNAL_RELATIVE}.tmp-${journal.operationId}`;
  const temp = localPath(root, tempRelative);
  durableWrite(temp, JSON.stringify(encode(journal), null, 2) + '\n');
  fs.renameSync(temp, path);
  return path;
}

function lock(root: string, operationId: string): LockHandle | null {
  ensureDirectory(root, LOCAL_DIR);
  const path = localPath(root, LOCK_RELATIVE);
  try {
    mkdirSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return null;
    throw error;
  }
  const ownerPath = localPath(root, `${LOCK_RELATIVE}/owner.json`);
  try {
    durableWrite(ownerPath, JSON.stringify({ operationId, pid: process.pid, startedAt: new Date().toISOString() }) + '\n');
  } catch (error) {
    try {
      if (lstatSync(path).isDirectory() && readdirSync(path).length === 0) rmdirSync(path);
    } catch { /* preserve a lock that may have been replaced concurrently */ }
    throw error;
  }
  return { path, ownerPath, operationId, acquired: true };
}

function recoveryLock(root: string, operationId: string): LockHandle | null {
  const acquired = lock(root, operationId);
  if (acquired) return acquired;
  const ownerPath = localPath(root, `${LOCK_RELATIVE}/owner.json`);
  try {
    if (!lstatSync(ownerPath).isFile()) return null;
    const owner = JSON.parse(readFileSync(ownerPath, 'utf8')) as { operationId?: unknown; pid?: unknown };
    if (owner.operationId !== operationId || typeof owner.pid !== 'number' || !Number.isInteger(owner.pid) || owner.pid <= 0) return null;
    try { process.kill(owner.pid, 0); return null; } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') return null;
    }
    // Re-check identity immediately before reclaiming the dead owner's lock.
    const check = JSON.parse(readFileSync(ownerPath, 'utf8')) as { operationId?: unknown; pid?: unknown };
    if (check.operationId !== operationId || check.pid !== owner.pid) return null;
    unlinkSync(ownerPath);
    rmdirSync(localPath(root, LOCK_RELATIVE));
    return lock(root, operationId);
  } catch {
    return null;
  }
}

function unlock(handle: LockHandle): void {
  if (!handle.acquired) return;
  try {
    if (!lstatSync(handle.path).isDirectory() || !lstatSync(handle.ownerPath).isFile()) return;
    const owner = JSON.parse(readFileSync(handle.ownerPath, 'utf8')) as { operationId?: unknown };
    if (owner.operationId !== handle.operationId) return;
    unlinkSync(handle.ownerPath);
    rmdirSync(handle.path);
  } catch { /* never remove another process lock */ }
  handle.acquired = false;
}

function profileFor(plan: UpdatePlan, options: TransactionOptions): GitignoreProfile {
  if (options.profile && options.profile !== plan.nextManifest.profile) {
    throw new Error(`Transaction profile '${options.profile}' does not match manifest profile '${plan.nextManifest.profile}'.`);
  }
  return plan.nextManifest.profile;
}

function isControlPath(relativePath: string, profile: GitignoreProfile): boolean {
  const controls = [
    manifestPath(profile),
    LOCAL_DIR,
    LOCK_RELATIVE,
    JOURNAL_RELATIVE,
    `${LOCAL_DIR}/staging`,
    BACKUPS_RELATIVE,
    LAST_SUCCESSFUL_RELATIVE,
  ];
  return controls.some((control) => relativePath === control || relativePath.startsWith(`${control}/`));
}

function validateManagedPath(root: string, relativePath: string, profile: GitignoreProfile): void {
  localPath(root, relativePath);
  if (isControlPath(relativePath, profile)) {
    throw new Error(`Update action cannot target Joycraft transaction state: '${relativePath}'.`);
  }
}

function siblingStagePath(relativePath: string, operationId: string, index: number): string {
  const slash = relativePath.lastIndexOf('/');
  const parent = slash < 0 ? '' : relativePath.slice(0, slash);
  const name = `.joycraft-${operationId}-${index}.stage`;
  return parent ? `${parent}/${name}` : name;
}

function operationFor(action: PlannedUpdateAction, root: string): JournalOperation | null {
  if (!action.selected || action.kind === 'reconcile' || action.kind === 'adopt' || action.kind === 'preserve' || action.kind === 'orphan') return null;
  const path = localPath(root, action.path);
  let current: Buffer | undefined;
  let mode: number | undefined;
  try {
    const stat = lstatSync(path);
    if (!stat.isFile()) throw new Error(`Planned update path is not a regular file: '${action.path}'.`);
    current = readFileSync(path);
    mode = stat.mode & 0o7777;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  if (action.currentPresent !== (current !== undefined)) {
    throw new TransactionConflictError(`Raw precondition failed for '${action.path}'.`, action.path);
  }
  if (action.rawPrecondition !== undefined && rawFileHash(current ?? Buffer.alloc(0)) !== action.rawPrecondition) {
    if (!(current === undefined && action.rawPrecondition === '')) {
      throw new TransactionConflictError(`Raw precondition failed for '${action.path}'.`, action.path);
    }
  }
  if (action.kind === 'delete') {
    return { path: action.path, kind: 'delete', before: imageOf(current, mode), after: { present: false } };
  }
  if (action.content === undefined) throw new Error(`Selected update action has no content: '${action.path}'.`);
  const target = bytes(action.content);
  const targetMode = action.mode ?? mode ?? 0o644;
  return {
    path: action.path,
    kind: 'write',
    before: imageOf(current, mode),
    after: imageOf(target, targetMode),
  };
}

function validateMetadataPrecondition(action: PlannedUpdateAction, root: string): void {
  if (!action.selected || (action.kind !== 'reconcile' && action.kind !== 'adopt')) return;
  const current = currentImage(root, action.path);
  if (action.currentPresent !== current.present) throw new TransactionConflictError(`Raw precondition failed for '${action.path}'.`, action.path);
  if (action.rawPrecondition !== undefined) {
    const content = imageBytes(current);
    if (!content || rawFileHash(content) !== action.rawPrecondition) {
      throw new TransactionConflictError(`Raw precondition failed for '${action.path}'.`, action.path);
    }
  }
}

function currentImage(root: string, relativePath: string): Image {
  const path = localPath(root, relativePath);
  try {
    const stat = lstatSync(path);
    if (!stat.isFile()) throw new Error(`Transaction path is not a regular file: '${relativePath}'.`);
    const content = readFileSync(path);
    return imageOf(content, stat.mode & 0o7777);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { present: false };
    throw error;
  }
}

function sameImage(left: Image, right: Image): boolean {
  if (left.present !== right.present) return false;
  if (!left.present) return true;
  const leftBytes = imageBytes(left);
  const rightBytes = imageBytes(right);
  return !!leftBytes && !!rightBytes && rawFileHash(leftBytes) === rawFileHash(rightBytes)
    && (right.mode === undefined || left.mode === right.mode);
}

function writeImage(root: string, relativePath: string, image: Image): void {
  const path = localPath(root, relativePath);
  if (!image.present) {
    try { unlinkSync(path); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    return;
  }
  const content = imageBytes(image);
  if (!content) throw new Error(`Missing preimage bytes for '${relativePath}'.`);
  mkdirSync(dirname(path), { recursive: true });
  localPath(root, relativePath);
  const slash = relativePath.lastIndexOf('/');
  const parent = slash < 0 ? '' : relativePath.slice(0, slash);
  const tempRelative = `${parent ? `${parent}/` : ''}.joycraft-rollback-${randomUUID()}.stage`;
  const temp = localPath(root, tempRelative);
  durableWrite(temp, content, image.mode);
  fs.renameSync(temp, path);
}

function manifestBytes(manifest: InstallationManifest): Buffer {
  return Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
}

function withTransactionMarker(manifest: InstallationManifest, operationId: string): InstallationManifest {
  return { ...manifest, __joycraftTransactionId: operationId };
}

function withoutTransactionMarker(manifest: InstallationManifest): InstallationManifest {
  const copy = { ...manifest } as Record<string, unknown>;
  delete copy.__joycraftTransactionId;
  return copy as InstallationManifest;
}

function cleanupKnown(root: string, journal: TransactionJournal): void {
  for (const operation of journal.operations) {
    if (!operation.stageRelative) continue;
    const staged = localPath(root, operation.stageRelative);
    if (existsSync(staged)) unlinkSync(staged);
  }
  const journalPath = localPath(root, JOURNAL_RELATIVE);
  if (existsSync(journalPath)) unlinkSync(journalPath);
  const tempPath = localPath(root, `${JOURNAL_RELATIVE}.tmp-${journal.operationId}`);
  if (existsSync(tempPath)) unlinkSync(tempPath);
  const manifestTemp = localPath(root, `${manifestPath(journal.profile)}.tmp-${journal.operationId}`);
  if (existsSync(manifestTemp)) unlinkSync(manifestTemp);
}

function successfulFromJournal(journal: TransactionJournal): SuccessfulBackup {
  return {
    schemaVersion: 1,
    operationId: journal.operationId,
    profile: journal.profile,
    oldManifestDigest: journal.oldManifestDigest,
    newManifestDigest: journal.newManifestDigest,
    ...(journal.oldManifest ? { oldManifest: journal.oldManifest } : {}),
    newManifest: journal.newManifest,
    operations: journal.operations,
    backupRelative: journal.backupRelative,
  };
}

function retainSuccessfulBackup(root: string, journal: TransactionJournal): void {
  const target = localPath(root, LAST_SUCCESSFUL_RELATIVE);
  const temp = localPath(root, `${LAST_SUCCESSFUL_RELATIVE}.tmp-${journal.operationId}`);
  durableWrite(temp, JSON.stringify(encode(successfulFromJournal(journal)), null, 2) + '\n');
  fs.renameSync(temp, target);
}

function attention(message: string, operationId?: string, journalPath?: string): TransactionResult {
  return { status: 'attention', ...(operationId ? { operationId } : {}), ...(journalPath ? { journalPath } : {}), diagnostics: [message], conflicts: [] };
}

/** Apply the selected, already-reviewed actions through a recoverable transaction. */
export function applyUpdatePlan(root: string, plan: UpdatePlan, options: TransactionOptions = {}): TransactionResult {
  const operationId = options.operationId ?? randomUUID();
  const profile = profileFor(plan, options);
  // Validate every authority and transaction-state path before any selected
  // project file can be changed. The manifest reader itself intentionally
  // remains diagnostic, so this boundary must reject a symlinked authority.
  localPath(root, manifestPath(profile));
  localPath(root, LOCAL_DIR);
  localPath(root, LOCK_RELATIVE);
  localPath(root, JOURNAL_RELATIVE);
  const journalPath = localPath(root, JOURNAL_RELATIVE);
  const info = { operationId, journalPath };
  if (existsSync(journalPath)) {
    return attention('An interrupted update is awaiting recovery; recover it before applying a new plan.', operationId, journalPath);
  }
  // Validate all managed paths before taking the lock or creating local state.
  for (const action of plan.actions) if (action.selected) validateManagedPath(root, action.path, profile);
  const manifestInfo = readInstallationManifestInfo(root, profile);
  if (manifestInfo.status !== 'valid' && manifestInfo.status !== 'missing') {
    return attention(`Cannot apply update while the ${manifestInfo.status} installation manifest needs attention.`);
  }
  const currentManifest = manifestInfo.manifest;
  const currentDigest = currentManifest ? manifestDigest(currentManifest) : null;
  if (plan.baseManifestDigest !== undefined && plan.baseManifestDigest !== currentDigest) {
    return { status: 'conflict', operationId, journalPath, diagnostics: ['The installation manifest changed after this plan was created; re-plan before applying.'], conflicts: [manifestPath(profile)] };
  }
  const markedNext = withTransactionMarker(plan.nextManifest, operationId);
  if (!validateManifest(markedNext)) throw new Error('Refusing to publish an invalid transaction manifest.');
  if (currentManifest && manifestDigest(withoutTransactionMarker(markedNext)) === manifestDigest(withoutTransactionMarker(currentManifest))
    && plan.actions.every((action) => !action.selected || action.kind === 'reconcile' || action.kind === 'adopt')) {
    try {
      for (const action of plan.actions) validateMetadataPrecondition(action, root);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const match = message.match(/'([^']+)'/);
      return { status: 'conflict', operationId, journalPath, diagnostics: [message], conflicts: match ? [match[1]] : [] };
    }
    return { status: 'noop', diagnostics: [], conflicts: [] };
  }
  const handle = lock(root, operationId);
  if (!handle) return attention('Another Joycraft updater holds the project lock.', operationId, journalPath);
  try {
    hitPhase(options, 'lock-acquired', info);
    if (existsSync(journalPath)) return attention('An interrupted update appeared while acquiring the project lock; recover it before applying a new plan.', operationId, journalPath);
    // Re-read after lock acquisition to close the plan-to-lock race.
    const lockedInfo = readInstallationManifestInfo(root, profile);
    if (lockedInfo.status !== 'valid' && lockedInfo.status !== 'missing') return attention(`Cannot apply update while the ${lockedInfo.status} installation manifest needs attention.`, operationId, journalPath);
    const lockedDigest = lockedInfo.manifest ? manifestDigest(lockedInfo.manifest) : null;
    if (plan.baseManifestDigest !== undefined && plan.baseManifestDigest !== lockedDigest) return { status: 'conflict', operationId, journalPath, diagnostics: ['The installation manifest changed while the update lock was acquired; re-plan before applying.'], conflicts: [manifestPath(profile)] };
    try {
      for (const action of plan.actions) validateMetadataPrecondition(action, root);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const match = message.match(/'([^']+)'/);
      return { status: 'conflict', operationId, journalPath, diagnostics: [message], conflicts: match ? [match[1]] : [] };
    }
    let operations: JournalOperation[];
    try {
      operations = plan.actions.map((action) => operationFor(action, root)).filter((item): item is JournalOperation => item !== null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const match = message.match(/'([^']+)'/);
      return { status: 'conflict', operationId, journalPath, diagnostics: [message], conflicts: match ? [match[1]] : [] };
    }
    const backupRelative = `${BACKUPS_RELATIVE}/${operationId}`;
    for (let index = 0; index < operations.length; index += 1) {
      const operation = operations[index];
      operation.backupRelative = `${backupRelative}/${index}.bin`;
      if (operation.kind === 'write') {
        operation.stageRelative = siblingStagePath(operation.path, operationId, index);
        if (existsSync(localPath(root, operation.stageRelative))) {
          throw new Error(`Transaction staging path already exists: '${operation.stageRelative}'.`);
        }
      }
    }
    const journal: TransactionJournal = {
      schemaVersion: 1,
      operationId,
      profile,
      phase: 'lock-acquired',
      oldManifestDigest: lockedInfo.manifest ? manifestDigest(lockedInfo.manifest) : null,
      newManifestDigest: manifestDigest(markedNext),
      ...(lockedInfo.raw ? { oldManifest: { encoding: 'base64', data: Buffer.from(lockedInfo.raw).toString('base64') } } : {}),
      newManifest: { encoding: 'base64', data: manifestBytes(markedNext).toString('base64') },
      plan: encode(plan),
      operations,
      backupRelative,
    };
    journal.phase = 'journal-written';
    writeJournal(root, journal);
    hitPhase(options, 'journal-written', info);

    ensureDirectory(root, `${backupRelative}`);
    for (let index = 0; index < operations.length; index += 1) {
      const operation = operations[index];
      const before = imageBytes(operation.before);
      if (before) durableWrite(localPath(root, operation.backupRelative!), before, operation.before.mode);
    }
    journal.phase = 'backups-written';
    writeJournal(root, journal);
    hitPhase(options, 'backups-written', info);

    for (let index = 0; index < operations.length; index += 1) {
      const operation = operations[index];
      if (operation.kind !== 'write') continue;
      const targetPath = localPath(root, operation.path);
      mkdirSync(dirname(targetPath), { recursive: true });
      localPath(root, operation.path);
      const stagePath = localPath(root, operation.stageRelative!);
      if (existsSync(stagePath)) throw new Error(`Transaction staging path already exists: '${operation.stageRelative}'.`);
      const content = imageBytes(operation.after)!;
      durableWrite(stagePath, content, operation.after.mode);
      const staged = currentImage(root, operation.stageRelative!);
      if (!sameImage(staged, operation.after)) throw new Error(`Staged bytes or mode failed validation for '${operation.path}'.`);
    }
    journal.phase = 'staged';
    writeJournal(root, journal);
    hitPhase(options, 'staged', info);

    for (const operation of operations) {
      // Revalidate containment and the raw current image directly before each
      // rename/unlink. This also catches a symlink inserted after staging.
      const target = localPath(root, operation.path);
      mkdirSync(dirname(target), { recursive: true });
      localPath(root, operation.path);
      const current = currentImage(root, operation.path);
      if (!sameImage(current, operation.before)) throw new Error(`Raw precondition failed immediately before writing '${operation.path}'.`);
      if (operation.kind === 'delete') unlinkSync(target);
      else fs.renameSync(localPath(root, operation.stageRelative!), target);
    }
    journal.phase = 'files-applied';
    writeJournal(root, journal);
    hitPhase(options, 'files-applied', info);
    for (const operation of operations) {
      if (!sameImage(currentImage(root, operation.path), operation.after)) throw new Error(`Published bytes or mode failed validation for '${operation.path}'.`);
    }
    journal.phase = 'files-verified';
    writeJournal(root, journal);
    hitPhase(options, 'files-verified', info);

    // The plan's manifest and metadata preconditions remain authoritative until
    // the last publication step. A late edit leaves the journal recoverable.
    const beforeManifest = readInstallationManifestInfo(root, profile);
    if (beforeManifest.status !== 'valid' && beforeManifest.status !== 'missing') throw new TransactionConflictError('Installation manifest changed before publication.', manifestPath(profile));
    const beforeDigest = beforeManifest.manifest ? manifestDigest(beforeManifest.manifest) : null;
    if (beforeDigest !== journal.oldManifestDigest) throw new TransactionConflictError('Installation manifest changed before publication.', manifestPath(profile));
    for (const action of plan.actions) validateMetadataPrecondition(action, root);
    for (const operation of operations) if (!sameImage(currentImage(root, operation.path), operation.after)) throw new TransactionConflictError(`Published bytes changed before manifest publication for '${operation.path}'.`, operation.path);

    const manifestRel = manifestPath(profile);
    const manifestAbs = localPath(root, manifestRel);
    const manifestTemp = localPath(root, `${manifestRel}.tmp-${operationId}`);
    durableWrite(manifestTemp, manifestBytes(markedNext));
    parseInstallationManifest(readFileSync(manifestTemp, 'utf8'));
    fs.renameSync(manifestTemp, manifestAbs);
    // Record rollback material before exposing the manifest-renamed phase. If
    // the process stops immediately after the rename, recovery can still
    // retain the same backup for an explicit guarded rollback.
    retainSuccessfulBackup(root, journal);
    journal.phase = 'manifest-renamed';
    writeJournal(root, journal);
    hitPhase(options, 'manifest-renamed', info);
    journal.phase = 'journal-bookkept';
    writeJournal(root, journal);
    hitPhase(options, 'journal-bookkept', info);
    journal.phase = 'cleanup';
    hitPhase(options, 'cleanup', info);
    cleanupKnown(root, journal);
    hitPhase(options, 'complete', info);
    return { status: 'applied', operationId, backupPath: localPath(root, backupRelative), diagnostics: [], conflicts: [] };
  } catch (error) {
    if (error instanceof TransactionConflictError) {
      return { status: 'conflict', operationId, journalPath, diagnostics: [error.message], conflicts: error.conflictPath ? [error.conflictPath] : [] };
    }
    throw error;
  } finally {
    unlock(handle);
  }
}

function decodeJournal(value: TransactionJournal): TransactionJournal {
  return decode(value) as TransactionJournal;
}

function verifiedJournalBytes(value: EncodedBytes): Buffer {
  if (!value || value.encoding !== 'base64' || typeof value.data !== 'string') {
    throw new Error('Invalid journal byte encoding.');
  }
  const decoded = Buffer.from(value.data, 'base64');
  if (decoded.toString('base64') !== value.data) throw new Error('Invalid journal base64 payload.');
  return decoded;
}

function validateJournalImage(image: Image): void {
  if (!image || typeof image.present !== 'boolean') throw new Error('Invalid journal file image.');
  if (!image.present) {
    if (image.bytes !== undefined || image.hash !== undefined) throw new Error('Absent journal file has content.');
    return;
  }
  if (!image.bytes || rawFileHash(verifiedJournalBytes(image.bytes)) !== image.hash) {
    throw new Error('Journal preimage or target bytes do not match their recorded digest.');
  }
  if (image.mode !== undefined && (!Number.isInteger(image.mode) || image.mode < 0 || image.mode > 0o7777)) {
    throw new Error('Invalid journal file mode.');
  }
}

function validateJournal(root: string, journal: TransactionJournal): void {
  if (journal.schemaVersion !== 1 || !/^[A-Za-z0-9_-]+$/.test(journal.operationId) || !Array.isArray(journal.operations)) {
    throw new Error('Invalid update journal identity.');
  }
  if (journal.profile !== 'shared' && journal.profile !== 'private') throw new Error('Invalid update journal profile.');
  const next = parseInstallationManifest(verifiedJournalBytes(journal.newManifest).toString('utf8'));
  if (manifestDigest(next) !== journal.newManifestDigest || next.profile !== journal.profile || next.__joycraftTransactionId !== journal.operationId) {
    throw new Error('Journal commit marker does not match its recorded manifest.');
  }
  if (journal.oldManifest) {
    const previous = parseInstallationManifest(verifiedJournalBytes(journal.oldManifest).toString('utf8'));
    if (manifestDigest(previous) !== journal.oldManifestDigest || previous.profile !== journal.profile) throw new Error('Journal manifest preimage digest is invalid.');
  } else if (journal.oldManifestDigest !== null) throw new Error('Journal is missing its manifest preimage.');
  if (journal.backupRelative !== `${BACKUPS_RELATIVE}/${journal.operationId}`) throw new Error('Update journal backup path is not transaction-owned.');
  localPath(root, journal.backupRelative);
  for (let index = 0; index < journal.operations.length; index += 1) {
    const operation = journal.operations[index];
    if (operation.kind !== 'write' && operation.kind !== 'delete') throw new Error('Invalid journal operation kind.');
    validateJournalImage(operation.before);
    validateJournalImage(operation.after);
    validateManagedPath(root, operation.path, journal.profile);
    const expectedStage = operation.kind === 'write' ? siblingStagePath(operation.path, journal.operationId, index) : undefined;
    const stageRequired = ['staged', 'files-applied', 'files-verified', 'manifest-renamed', 'journal-bookkept', 'cleanup', 'complete'].includes(journal.phase);
    if ((stageRequired && operation.stageRelative !== expectedStage) || (operation.stageRelative !== undefined && operation.stageRelative !== expectedStage)) throw new Error('Update journal staging path is not transaction-owned.');
    if (operation.backupRelative && !operation.backupRelative.startsWith(`${journal.backupRelative}/`)) throw new Error('Update journal backup file is not transaction-owned.');
  }
}

function recoveryResult(status: TransactionResult['status'], journal: TransactionJournal, conflicts: string[] = [], diagnostics: string[] = []): TransactionResult {
  return { status, operationId: journal.operationId, journalPath: JOURNAL_RELATIVE, diagnostics, conflicts };
}

/** Recover the one known interrupted transaction, preserving any user edits. */
export function recoverInterruptedUpdate(root: string, options: TransactionOptions = {}): TransactionResult {
  let journal: TransactionJournal | null;
  try { journal = decodeJournal(readJournal(root)!); } catch (error) {
    return attention(`Unable to read the interrupted update journal: ${String(error)}`);
  }
  if (!journal) return { status: 'none', diagnostics: [], conflicts: [] };
  try {
    validateJournal(root, journal);
  } catch (error) {
    return attention(`Unable to recover the interrupted update safely: ${String(error)}`, journal.operationId, localPath(root, JOURNAL_RELATIVE));
  }
  const handle = recoveryLock(root, journal.operationId);
  if (!handle) return recoveryResult('attention', journal, [], ['Another Joycraft updater holds the project lock.']);
  try {
    const lockedJournalRaw = readJournal(root);
    if (!lockedJournalRaw || lockedJournalRaw.operationId !== journal.operationId || lockedJournalRaw.newManifestDigest !== journal.newManifestDigest) {
      return recoveryResult('attention', journal, [], ['The interrupted journal changed while recovery was acquiring the lock.']);
    }
    journal = decodeJournal(lockedJournalRaw);
    validateJournal(root, journal);
    const info = readInstallationManifestInfo(root, journal.profile);
    if (info.status !== 'valid' && info.status !== 'missing') return recoveryResult('attention', journal, [], [`Cannot recover while the ${info.status} installation manifest needs attention.`]);
    const digest = info.manifest ? manifestDigest(info.manifest) : null;
    const oldState = digest === journal.oldManifestDigest;
    const newState = digest === journal.newManifestDigest;
    if (!oldState && !newState) return recoveryResult('attention', journal, [], ['Current manifest matches neither the interrupted update preimage nor its commit marker.']);
    const conflicts: string[] = [];
    for (const operation of journal.operations) {
      const current = currentImage(root, operation.path);
      if (newState ? !sameImage(current, operation.after) : (!sameImage(current, operation.before) && !sameImage(current, operation.after))) conflicts.push(operation.path);
    }
    if (conflicts.length) return recoveryResult('conflict', journal, conflicts, ['Recovery found intervening user edits; backup material was retained.']);
    if (newState) {
      retainSuccessfulBackup(root, journal);
      cleanupKnown(root, journal);
      hitPhase(options, 'complete', { operationId: journal.operationId, journalPath: localPath(root, JOURNAL_RELATIVE) });
      return recoveryResult('committed', journal);
    }
    for (const operation of [...journal.operations].reverse()) {
      const current = currentImage(root, operation.path);
      if (sameImage(current, operation.before)) continue;
      writeImage(root, operation.path, operation.before);
    }
    if (journal.oldManifest) {
      const oldManifest = Buffer.from(journal.oldManifest.data, 'base64');
      const manifestRel = manifestPath(journal.profile);
      const temp = localPath(root, `${manifestRel}.recovery-${journal.operationId}`);
      durableWrite(temp, oldManifest);
      parseInstallationManifest(readFileSync(temp, 'utf8'));
      fs.renameSync(temp, localPath(root, manifestRel));
    } else {
      const manifest = localPath(root, manifestPath(journal.profile));
      if (existsSync(manifest)) unlinkSync(manifest);
    }
    cleanupKnown(root, journal);
    hitPhase(options, 'complete', { operationId: journal.operationId, journalPath: localPath(root, JOURNAL_RELATIVE) });
    return recoveryResult('rolled-back', journal);
  } finally {
    unlock(handle);
  }
}

/** Restore the retained last-successful backup after checking every precondition. */
export function rollbackLastSuccessfulUpdate(root: string, options: TransactionOptions = {}): TransactionResult {
  const descriptorPath = localPath(root, LAST_SUCCESSFUL_RELATIVE);
  if (!existsSync(descriptorPath)) return { status: 'none', diagnostics: [], conflicts: [] };
  let backup: SuccessfulBackup;
  try { backup = decode(JSON.parse(readFileSync(descriptorPath, 'utf8'))) as SuccessfulBackup; } catch (error) {
    return attention(`Unable to read the retained successful backup: ${String(error)}`);
  }
  try {
    validateJournal(root, backup as unknown as TransactionJournal);
  } catch (error) {
    return attention(`Unable to use the retained successful backup safely: ${String(error)}`);
  }
  const handle = lock(root, backup.operationId);
  if (!handle) return attention('Another Joycraft updater holds the project lock.');
  try {
    let lockedBackup: SuccessfulBackup;
    try { lockedBackup = decode(JSON.parse(readFileSync(descriptorPath, 'utf8'))) as SuccessfulBackup; } catch (error) {
      return attention(`Unable to re-read the retained successful backup safely: ${String(error)}`);
    }
    if (lockedBackup.operationId !== backup.operationId || lockedBackup.newManifestDigest !== backup.newManifestDigest) {
      return attention('The retained successful backup changed while acquiring the project lock.');
    }
    backup = lockedBackup;
    validateJournal(root, backup as unknown as TransactionJournal);
    const info = readInstallationManifestInfo(root, backup.profile);
    if (info.status !== 'valid' || !info.manifest || manifestDigest(info.manifest) !== backup.newManifestDigest) {
      return { status: 'conflict', operationId: backup.operationId, diagnostics: ['Current manifest no longer matches the successful update; rollback is guarded.'], conflicts: [manifestPath(backup.profile)] };
    }
    const conflicts: string[] = [];
    for (const operation of backup.operations) if (!sameImage(currentImage(root, operation.path), operation.after)) conflicts.push(operation.path);
    if (conflicts.length) return { status: 'conflict', operationId: backup.operationId, diagnostics: ['Current files changed after the successful update; rollback left them untouched.'], conflicts };
    for (const operation of [...backup.operations].reverse()) writeImage(root, operation.path, operation.before);
    const manifestRel = manifestPath(backup.profile);
    if (backup.oldManifest) {
      const temp = localPath(root, `${manifestRel}.rollback-${backup.operationId}`);
      durableWrite(temp, Buffer.from(backup.oldManifest.data, 'base64'));
      parseInstallationManifest(readFileSync(temp, 'utf8'));
      fs.renameSync(temp, localPath(root, manifestRel));
    } else if (existsSync(localPath(root, manifestRel))) unlinkSync(localPath(root, manifestRel));
    hitPhase(options, 'complete', { operationId: backup.operationId, journalPath: descriptorPath });
    return { status: 'rolled-back', operationId: backup.operationId, backupPath: localPath(root, backup.backupRelative), diagnostics: [], conflicts: [] };
  } finally {
    unlock(handle);
  }
}
