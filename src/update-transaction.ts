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
import { LEGACY_CLAUDE_STATE_PATH, LEGACY_VERSION_FILE, STATE_PATH } from './version.js';

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
  /**
   * Move manifest authority as part of this transaction. The source and
   * destination are explicit so a profile change cannot accidentally publish
   * to the destination while leaving the source authoritative.
   */
  authorityTransition?: AuthorityTransition;
  /** Narrow, planner-owned writes for legacy migration and local preferences. */
  localOperations?: readonly LocalTransactionOperation[];
  /** Throw after the selected real phase, leaving the journal for recovery. */
  failureAt?: TransactionPhase;
  onPhase?: (phase: TransactionPhase, info: TransactionPhaseInfo) => void;
}

export interface AuthorityReference {
  profile: GitignoreProfile;
  /** Optional while callers use the canonical profile path. */
  path?: string;
  /** Digest expected at this authority before the transaction starts. */
  digest?: string | null;
  /** Optional raw preimage supplied by the planner. */
  raw?: SnapshotContent;
}

/** The old and new manifest authorities for a shared/private profile switch. */
export interface AuthorityTransition {
  oldAuthority: AuthorityReference;
  newAuthority: AuthorityReference;
}

export type LocalTransactionOperationKind = 'write' | 'delete';

export interface LocalTransactionOperation {
  path: string;
  kind: LocalTransactionOperationKind;
  content?: SnapshotContent;
  currentPresent: boolean;
  rawPrecondition?: string;
  mode?: number;
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
  /** Manifest authority operations are validated against journal authorities. */
  authority?: boolean;
  /** Planner-approved state/preferences migration operation. */
  localMigration?: boolean;
}

interface JournalAuthority {
  profile: GitignoreProfile;
  path: string;
  /** Digest of the authority bytes in this journal (old preimage or new commit). */
  digest: string | null;
  bytes?: EncodedBytes;
  /** Digest required at the destination before publishing (normally null). */
  preconditionDigest?: string | null;
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
  oldAuthority?: JournalAuthority;
  newAuthority?: JournalAuthority;
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
  oldAuthority?: JournalAuthority;
  newAuthority?: JournalAuthority;
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
  if (options.authorityTransition) {
    if (options.authorityTransition.newAuthority.profile !== plan.nextManifest.profile) {
      throw new Error(`Transaction profile '${options.authorityTransition.newAuthority.profile}' does not match manifest profile '${plan.nextManifest.profile}'.`);
    }
    return options.authorityTransition.newAuthority.profile;
  }
  if (options.profile && options.profile !== plan.nextManifest.profile) {
    throw new Error(`Transaction profile '${options.profile}' does not match manifest profile '${plan.nextManifest.profile}'.`);
  }
  return plan.nextManifest.profile;
}

function isControlPath(relativePath: string, profile: GitignoreProfile): boolean {
  const controls = [
    // Both authority locations are transaction control paths regardless of
    // the destination profile. A private transaction must not be able to
    // smuggle a write to the tracked shared authority through its plan.
    manifestPath('shared'),
    manifestPath('private'),
    LOCAL_DIR,
    LOCK_RELATIVE,
    JOURNAL_RELATIVE,
    `${LOCAL_DIR}/staging`,
    BACKUPS_RELATIVE,
    LAST_SUCCESSFUL_RELATIVE,
  ];
  return controls.some((control) => relativePath === control || relativePath.startsWith(`${control}/`));
}

// These are the only project-local state files that the update planner may
// migrate. In particular, callers cannot turn localOperations into a control
// path escape by supplying an arbitrary path beneath docs/.joycraft/local.
const APPROVED_LOCAL_MIGRATION_PATHS = new Set([
  STATE_PATH,
  LEGACY_VERSION_FILE,
  LEGACY_CLAUDE_STATE_PATH,
  `${LOCAL_DIR}/settings.json`,
  `${LOCAL_DIR}/preferences.json`,
  `${LOCAL_DIR}/legacy-state-backup.json`,
]);

function validateLocalMigrationPath(root: string, relativePath: string): void {
  localPath(root, relativePath);
  if (!APPROVED_LOCAL_MIGRATION_PATHS.has(relativePath)) {
    throw new Error(`Local migration action is not allowlisted: '${relativePath}'.`);
  }
}

function validateManagedPath(root: string, relativePath: string, profile: GitignoreProfile): void {
  localPath(root, relativePath);
  if (isControlPath(relativePath, profile)) {
    throw new Error(`Update action cannot target Joycraft transaction state: '${relativePath}'.`);
  }
}

function operationFromInput(
  input: {
    path: string;
    kind: 'write' | 'delete';
    content?: SnapshotContent;
    currentPresent: boolean;
    rawPrecondition?: string;
    mode?: number;
  },
  root: string,
): JournalOperation {
  const path = localPath(root, input.path);
  let current: Buffer | undefined;
  let mode: number | undefined;
  try {
    const stat = lstatSync(path);
    if (!stat.isFile()) throw new Error(`Planned update path is not a regular file: '${input.path}'.`);
    current = readFileSync(path);
    mode = stat.mode & 0o7777;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  if (input.currentPresent !== (current !== undefined)) {
    throw new TransactionConflictError(`Raw precondition failed for '${input.path}'.`, input.path);
  }
  if (input.rawPrecondition !== undefined && rawFileHash(current ?? Buffer.alloc(0)) !== input.rawPrecondition) {
    if (!(current === undefined && input.rawPrecondition === '')) {
      throw new TransactionConflictError(`Raw precondition failed for '${input.path}'.`, input.path);
    }
  }
  if (input.kind === 'delete') {
    return { path: input.path, kind: 'delete', before: imageOf(current, mode), after: { present: false }, localMigration: true };
  }
  if (input.content === undefined) throw new Error(`Selected local migration has no content: '${input.path}'.`);
  const target = bytes(input.content);
  return {
    path: input.path,
    kind: 'write',
    before: imageOf(current, mode),
    after: imageOf(target, input.mode ?? mode ?? 0o644),
    localMigration: true,
  };
}

function authorityPath(root: string, reference: AuthorityReference): string {
  const expected = manifestPath(reference.profile);
  if (reference.path !== undefined && reference.path !== expected) {
    throw new Error(`Authority path '${reference.path}' does not match profile '${reference.profile}'.`);
  }
  return localPath(root, expected);
}

function digestOfAuthorityInfo(info: ReturnType<typeof readInstallationManifestInfo>): string | null {
  return info.manifest ? manifestDigest(info.manifest) : null;
}

function validateAuthorityReference(
  root: string,
  reference: AuthorityReference,
  info: ReturnType<typeof readInstallationManifestInfo>,
  label: string,
): void {
  authorityPath(root, reference);
  if (info.status !== 'valid' && info.status !== 'missing') {
    throw new TransactionConflictError(`Cannot transition while the ${label} authority is ${info.status}.`, manifestPath(reference.profile));
  }
  const actual = digestOfAuthorityInfo(info);
  if (reference.digest !== undefined && reference.digest !== actual) {
    throw new TransactionConflictError(`${label} manifest authority changed after planning.`, manifestPath(reference.profile));
  }
  if (reference.raw !== undefined) {
    const raw = info.raw;
    if (raw === undefined || raw !== (Buffer.isBuffer(reference.raw) ? reference.raw.toString('utf8') : reference.raw)) {
      throw new TransactionConflictError(`${label} manifest authority bytes changed after planning.`, manifestPath(reference.profile));
    }
  }
}

function authorityReferenceForTransition(
  root: string,
  transition: AuthorityTransition,
): { old: AuthorityReference; next: AuthorityReference; oldInfo: ReturnType<typeof readInstallationManifestInfo>; nextInfo: ReturnType<typeof readInstallationManifestInfo> } {
  if (transition.oldAuthority.profile === transition.newAuthority.profile) {
    throw new Error('Authority transition requires distinct shared and private profiles.');
  }
  authorityPath(root, transition.oldAuthority);
  authorityPath(root, transition.newAuthority);
  const oldInfo = readInstallationManifestInfo(root, transition.oldAuthority.profile);
  const nextInfo = readInstallationManifestInfo(root, transition.newAuthority.profile);
  validateAuthorityReference(root, transition.oldAuthority, oldInfo, 'old');
  // A destination authority is never silently replaced. The destination
  // precondition may explicitly describe absence, but any existing authority
  // is still a conflict that preserves its bytes.
  if (nextInfo.status !== 'missing') {
    throw new TransactionConflictError('The target manifest authority already exists; preserving it.', manifestPath(transition.newAuthority.profile));
  }
  if (transition.newAuthority.digest !== undefined && transition.newAuthority.digest !== null) {
    throw new TransactionConflictError('The target manifest authority precondition must be missing.', manifestPath(transition.newAuthority.profile));
  }
  return { old: transition.oldAuthority, next: transition.newAuthority, oldInfo, nextInfo };
}

function authorityOperation(
  root: string,
  path: string,
  kind: 'write' | 'delete',
  content?: Buffer,
  before?: Image,
): JournalOperation {
  const current = currentImage(root, path);
  const expected = before ?? current;
  if (!sameImage(current, expected)) throw new TransactionConflictError(`Raw precondition failed for '${path}'.`, path);
  if (kind === 'delete') return { path, kind, before: expected, after: { present: false }, authority: true };
  if (!content) throw new Error(`Authority write has no manifest bytes: '${path}'.`);
  return { path, kind, before: expected, after: imageOf(content, 0o644), authority: true };
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
    ...(journal.oldAuthority ? { oldAuthority: journal.oldAuthority } : {}),
    ...(journal.newAuthority ? { newAuthority: journal.newAuthority } : {}),
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
  let transitionAuthorities: ReturnType<typeof authorityReferenceForTransition> | null = null;
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
  if (options.authorityTransition) {
    try {
      transitionAuthorities = authorityReferenceForTransition(root, options.authorityTransition);
    } catch (error) {
      if (error instanceof TransactionConflictError) {
        return { status: 'conflict', operationId, journalPath, diagnostics: [error.message], conflicts: error.conflictPath ? [error.conflictPath] : [] };
      }
      throw error;
    }
    localPath(root, manifestPath(transitionAuthorities.old.profile));
  }
  // Validate all managed paths before taking the lock or creating local state.
  for (const action of plan.actions) if (action.selected) validateManagedPath(root, action.path, profile);
  for (const operation of options.localOperations ?? []) validateLocalMigrationPath(root, operation.path);
  const manifestProfile = transitionAuthorities?.old.profile ?? profile;
  const manifestInfo = readInstallationManifestInfo(root, manifestProfile);
  if (manifestInfo.status !== 'valid' && manifestInfo.status !== 'missing') {
    return attention(`Cannot apply update while the ${manifestInfo.status} installation manifest needs attention.`);
  }
  const currentManifest = manifestInfo.manifest;
  const currentDigest = currentManifest ? manifestDigest(currentManifest) : null;
  const expectedBaseDigest = transitionAuthorities?.old.digest ?? plan.baseManifestDigest;
  if (expectedBaseDigest !== undefined && expectedBaseDigest !== currentDigest) {
    return { status: 'conflict', operationId, journalPath, diagnostics: ['The installation manifest changed after this plan was created; re-plan before applying.'], conflicts: [manifestPath(manifestProfile)] };
  }
  const markedNext = withTransactionMarker(plan.nextManifest, operationId);
  if (!validateManifest(markedNext)) throw new Error('Refusing to publish an invalid transaction manifest.');
  if (!transitionAuthorities && !(options.localOperations?.length) && currentManifest && manifestDigest(withoutTransactionMarker(markedNext)) === manifestDigest(withoutTransactionMarker(currentManifest))
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
    const lockedInfo = readInstallationManifestInfo(root, manifestProfile);
    if (lockedInfo.status !== 'valid' && lockedInfo.status !== 'missing') return attention(`Cannot apply update while the ${lockedInfo.status} installation manifest needs attention.`, operationId, journalPath);
    const lockedDigest = lockedInfo.manifest ? manifestDigest(lockedInfo.manifest) : null;
    if (expectedBaseDigest !== undefined && expectedBaseDigest !== lockedDigest) return { status: 'conflict', operationId, journalPath, diagnostics: ['The installation manifest changed while the update lock was acquired; re-plan before applying.'], conflicts: [manifestPath(manifestProfile)] };
    if (transitionAuthorities) {
      try {
        const lockedAuthorities = authorityReferenceForTransition(root, options.authorityTransition!);
        transitionAuthorities = lockedAuthorities;
      } catch (error) {
        if (error instanceof TransactionConflictError) return { status: 'conflict', operationId, journalPath, diagnostics: [error.message], conflicts: error.conflictPath ? [error.conflictPath] : [] };
        return attention(String(error), operationId, journalPath);
      }
    }
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
      for (const migration of options.localOperations ?? []) operations.push(operationFromInput(migration, root));
      if (transitionAuthorities) {
        const oldPath = manifestPath(transitionAuthorities.old.profile);
        const nextPath = manifestPath(transitionAuthorities.next.profile);
        const oldImage = currentImage(root, oldPath);
        const nextImage = currentImage(root, nextPath);
        operations.push(authorityOperation(root, oldPath, 'delete', undefined, oldImage));
        operations.push(authorityOperation(root, nextPath, 'write', manifestBytes(markedNext), nextImage));
      }
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
      ...(!transitionAuthorities && lockedInfo.raw ? { oldManifest: { encoding: 'base64', data: Buffer.from(lockedInfo.raw).toString('base64') } } : {}),
      newManifest: { encoding: 'base64', data: manifestBytes(markedNext).toString('base64') },
      plan: encode(plan),
      operations,
      backupRelative,
      ...(transitionAuthorities ? {
        oldAuthority: {
          profile: transitionAuthorities.old.profile,
          path: manifestPath(transitionAuthorities.old.profile),
          digest: lockedInfo.manifest ? manifestDigest(lockedInfo.manifest) : null,
          ...(lockedInfo.raw ? { bytes: { encoding: 'base64' as const, data: Buffer.from(lockedInfo.raw).toString('base64') } } : {}),
        },
        newAuthority: {
          profile: transitionAuthorities.next.profile,
          path: manifestPath(transitionAuthorities.next.profile),
          digest: manifestDigest(markedNext),
          preconditionDigest: transitionAuthorities.nextInfo.manifest ? manifestDigest(transitionAuthorities.nextInfo.manifest) : null,
          bytes: { encoding: 'base64' as const, data: manifestBytes(markedNext).toString('base64') },
        },
      } : {}),
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
      if (operation.kind === 'delete') {
        if (current.present) unlinkSync(target);
      }
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
    const beforeManifest = readInstallationManifestInfo(root, manifestProfile);
    if (!transitionAuthorities && beforeManifest.status !== 'valid' && beforeManifest.status !== 'missing') throw new TransactionConflictError('Installation manifest changed before publication.', manifestPath(manifestProfile));
    const beforeDigest = beforeManifest.manifest ? manifestDigest(beforeManifest.manifest) : null;
    if (!transitionAuthorities && beforeDigest !== journal.oldManifestDigest) throw new TransactionConflictError('Installation manifest changed before publication.', manifestPath(manifestProfile));
    if (transitionAuthorities) {
      const oldAfter = readInstallationManifestInfo(root, transitionAuthorities.old.profile);
      const nextAfter = readInstallationManifestInfo(root, transitionAuthorities.next.profile);
      if (oldAfter.status !== 'missing' || nextAfter.status !== 'valid' || !nextAfter.manifest
        || manifestDigest(nextAfter.manifest) !== journal.newManifestDigest) {
        throw new TransactionConflictError('Manifest authority changed before transition commit.', manifestPath(transitionAuthorities.next.profile));
      }
    }
    for (const action of plan.actions) validateMetadataPrecondition(action, root);
    for (const operation of operations) if (!sameImage(currentImage(root, operation.path), operation.after)) throw new TransactionConflictError(`Published bytes changed before manifest publication for '${operation.path}'.`, operation.path);

    if (!transitionAuthorities) {
      const manifestRel = manifestPath(profile);
      const manifestAbs = localPath(root, manifestRel);
      const manifestTemp = localPath(root, `${manifestRel}.tmp-${operationId}`);
      durableWrite(manifestTemp, manifestBytes(markedNext));
      parseInstallationManifest(readFileSync(manifestTemp, 'utf8'));
      fs.renameSync(manifestTemp, manifestAbs);
    }
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

function validateJournalAuthority(root: string, authority: JournalAuthority, label: string): void {
  if (!authority || (authority.profile !== 'shared' && authority.profile !== 'private')
    || authority.path !== manifestPath(authority.profile)
    || (authority.digest !== null && !/^[0-9a-f]{64}$/i.test(authority.digest))) {
    throw new Error(`Invalid ${label} manifest authority descriptor.`);
  }
  authorityPath(root, authority);
  if (authority.bytes) {
    const parsed = parseInstallationManifest(verifiedJournalBytes(authority.bytes).toString('utf8'));
    if (manifestDigest(parsed) !== authority.digest || parsed.profile !== authority.profile) {
      throw new Error(`Invalid ${label} manifest authority digest.`);
    }
  } else if (authority.digest !== null) {
    throw new Error(`Missing ${label} manifest authority preimage.`);
  }
  if (authority.preconditionDigest !== undefined
    && authority.preconditionDigest !== null
    && !/^[0-9a-f]{64}$/i.test(authority.preconditionDigest)) {
    throw new Error(`Invalid ${label} authority precondition digest.`);
  }
}

function authorityImageMatches(image: Image, authority: JournalAuthority): boolean {
  if (authority.digest === null) return !image.present;
  if (!image.present || !image.bytes || !authority.bytes) return false;
  return rawFileHash(imageBytes(image)!) === rawFileHash(verifiedJournalBytes(authority.bytes));
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
  } else if (journal.oldManifestDigest !== null && !journal.oldAuthority) throw new Error('Journal is missing its manifest preimage.');
  if (journal.backupRelative !== `${BACKUPS_RELATIVE}/${journal.operationId}`) throw new Error('Update journal backup path is not transaction-owned.');
  localPath(root, journal.backupRelative);
  if ((journal.oldAuthority === undefined) !== (journal.newAuthority === undefined)) {
    throw new Error('Update journal must contain both authority descriptors.');
  }
  if (journal.oldAuthority && journal.newAuthority) {
    validateJournalAuthority(root, journal.oldAuthority, 'old');
    validateJournalAuthority(root, journal.newAuthority, 'new');
    if (journal.oldAuthority.profile === journal.newAuthority.profile || journal.oldAuthority.path === journal.newAuthority.path) {
      throw new Error('Update journal authority descriptors must be distinct.');
    }
    if (journal.newAuthority.digest !== journal.newManifestDigest) throw new Error('New authority digest does not match the transaction manifest.');
    const authorityOperations = journal.operations.filter((operation) => operation.authority);
    const oldDeletes = authorityOperations.filter((operation) => operation.path === journal.oldAuthority!.path && operation.kind === 'delete');
    const newWrites = authorityOperations.filter((operation) => operation.path === journal.newAuthority!.path && operation.kind === 'write');
    if (authorityOperations.length !== 2 || oldDeletes.length !== 1 || newWrites.length !== 1
      || !authorityImageMatches(oldDeletes[0].before, journal.oldAuthority)
      || oldDeletes[0].after.present
      || newWrites[0].before.present
      || !authorityImageMatches(newWrites[0].after, journal.newAuthority)) {
      throw new Error('Update journal authority operations do not match their recorded transition.');
    }
  } else if (journal.operations.some((operation) => operation.authority)) {
    throw new Error('Update journal contains authority operations without an authority transition.');
  }
  for (let index = 0; index < journal.operations.length; index += 1) {
    const operation = journal.operations[index];
    if (operation.kind !== 'write' && operation.kind !== 'delete') throw new Error('Invalid journal operation kind.');
    validateJournalImage(operation.before);
    validateJournalImage(operation.after);
    if (operation.authority) {
      if (!journal.oldAuthority || !journal.newAuthority || (operation.path !== journal.oldAuthority.path && operation.path !== journal.newAuthority.path)) {
        throw new Error('Update journal authority operation is not transaction-owned.');
      }
    } else if (operation.localMigration) {
      validateLocalMigrationPath(root, operation.path);
    } else {
      validateManagedPath(root, operation.path, journal.profile);
    }
    const expectedStage = operation.kind === 'write' ? siblingStagePath(operation.path, journal.operationId, index) : undefined;
    const stageRequired = ['staged', 'files-applied', 'files-verified', 'manifest-renamed', 'journal-bookkept', 'cleanup', 'complete'].includes(journal.phase);
    if ((stageRequired && operation.stageRelative !== expectedStage) || (operation.stageRelative !== undefined && operation.stageRelative !== expectedStage)) throw new Error('Update journal staging path is not transaction-owned.');
    if (operation.backupRelative && !operation.backupRelative.startsWith(`${journal.backupRelative}/`)) throw new Error('Update journal backup file is not transaction-owned.');
  }
}

function recoveryResult(status: TransactionResult['status'], journal: TransactionJournal, conflicts: string[] = [], diagnostics: string[] = []): TransactionResult {
  return { status, operationId: journal.operationId, journalPath: JOURNAL_RELATIVE, diagnostics, conflicts };
}

function transitionAuthorityState(root: string, journal: TransactionJournal): { oldState: boolean; newState: boolean } | TransactionResult {
  if (!journal.oldAuthority || !journal.newAuthority) return { oldState: false, newState: false };
  const oldInfo = readInstallationManifestInfo(root, journal.oldAuthority.profile);
  const newInfo = readInstallationManifestInfo(root, journal.newAuthority.profile);
  if (oldInfo.status !== 'valid' && oldInfo.status !== 'missing') {
    return recoveryResult('attention', journal, [], [`Cannot recover while the old manifest authority is ${oldInfo.status}.`]);
  }
  if (newInfo.status !== 'valid' && newInfo.status !== 'missing') {
    return recoveryResult('attention', journal, [], [`Cannot recover while the new manifest authority is ${newInfo.status}.`]);
  }
  const oldDigest = digestOfAuthorityInfo(oldInfo);
  const newDigest = digestOfAuthorityInfo(newInfo);
  const oldMatches = oldDigest === journal.oldAuthority.digest;
  const newMatches = newDigest === journal.newAuthority.digest;
  // The old authority is deleted before the new one is renamed. Missing both
  // therefore means an interrupted pre-commit interval and must roll back.
  if (oldMatches && newMatches) return recoveryResult('attention', journal, [journal.oldAuthority.path, journal.newAuthority.path], ['Both manifest authorities are present; transition state is ambiguous.']);
  if (newMatches && !oldInfo.manifest) return { oldState: false, newState: true };
  if (oldMatches && !newInfo.manifest) return { oldState: true, newState: false };
  if (!oldInfo.manifest && !newInfo.manifest) return { oldState: true, newState: false };
  return recoveryResult('attention', journal, [journal.oldAuthority.path, journal.newAuthority.path], ['Manifest authority matches neither the interrupted preimage nor its commit marker.']);
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
    const authorityState = transitionAuthorityState(root, journal);
    if ('status' in authorityState) return authorityState;
    let oldState: boolean;
    let newState: boolean;
    if (journal.oldAuthority && journal.newAuthority) {
      oldState = authorityState.oldState;
      newState = authorityState.newState;
    } else {
      const info = readInstallationManifestInfo(root, journal.profile);
      if (info.status !== 'valid' && info.status !== 'missing') return recoveryResult('attention', journal, [], [`Cannot recover while the ${info.status} installation manifest needs attention.`]);
      const digest = info.manifest ? manifestDigest(info.manifest) : null;
      oldState = digest === journal.oldManifestDigest;
      newState = digest === journal.newManifestDigest;
      if (!oldState && !newState) return recoveryResult('attention', journal, [], ['Current manifest matches neither the interrupted update preimage nor its commit marker.']);
    }
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
    if (journal.oldAuthority && journal.newAuthority) {
      // Authority preimages are ordinary journal operations. Reversing them
      // above deletes the new authority and restores the old one in a
      // recoverable order; no second manifest write is needed here.
    } else if (journal.oldManifest) {
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
    if (backup.oldAuthority && backup.newAuthority) {
      const oldInfo = readInstallationManifestInfo(root, backup.oldAuthority.profile);
      const newInfo = readInstallationManifestInfo(root, backup.newAuthority.profile);
      if (oldInfo.status !== 'missing' || newInfo.status !== 'valid' || !newInfo.manifest || manifestDigest(newInfo.manifest) !== backup.newManifestDigest) {
        return { status: 'conflict', operationId: backup.operationId, diagnostics: ['Current manifest authority no longer matches the successful update; rollback is guarded.'], conflicts: [manifestPath(backup.newAuthority.profile)] };
      }
    } else {
      const info = readInstallationManifestInfo(root, backup.profile);
      if (info.status !== 'valid' || !info.manifest || manifestDigest(info.manifest) !== backup.newManifestDigest) {
        return { status: 'conflict', operationId: backup.operationId, diagnostics: ['Current manifest no longer matches the successful update; rollback is guarded.'], conflicts: [manifestPath(backup.profile)] };
      }
    }
    const conflicts: string[] = [];
    for (const operation of backup.operations) if (!sameImage(currentImage(root, operation.path), operation.after)) conflicts.push(operation.path);
    if (conflicts.length) return { status: 'conflict', operationId: backup.operationId, diagnostics: ['Current files changed after the successful update; rollback left them untouched.'], conflicts };
    for (const operation of [...backup.operations].reverse()) writeImage(root, operation.path, operation.before);
    if (backup.oldAuthority && backup.newAuthority) {
      // Manifest authority is restored by the journaled authority operations
      // above. Their reverse order also prevents a window with two owners.
    } else if (backup.oldManifest) {
      const manifestRel = manifestPath(backup.profile);
      const temp = localPath(root, `${manifestRel}.rollback-${backup.operationId}`);
      durableWrite(temp, Buffer.from(backup.oldManifest.data, 'base64'));
      parseInstallationManifest(readFileSync(temp, 'utf8'));
      fs.renameSync(temp, localPath(root, manifestRel));
    } else {
      const manifestRel = manifestPath(backup.profile);
      if (existsSync(localPath(root, manifestRel))) unlinkSync(localPath(root, manifestRel));
    }
    hitPhase(options, 'complete', { operationId: backup.operationId, journalPath: descriptorPath });
    return { status: 'rolled-back', operationId: backup.operationId, backupPath: localPath(root, backup.backupRelative), diagnostics: [], conflicts: [] };
  } finally {
    unlock(handle);
  }
}
