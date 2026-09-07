import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, resolve, dirname } from 'node:path';

import { detectStack } from './detect.js';
import { getBundleInventory, type BundleInventoryEntry } from './bundle-inventory.js';
import {
  adoptLegacyInstallation,
  manifestDigest,
  normalizeManifestPath,
  rawFileHash,
  readInstallationManifestInfo,
  type InstallationManifest,
  type LocalInstallationSettings,
} from './install-manifest.js';
import { createUpdatePlan, type PlannedUpdateAction, type UpdatePlan, type UpdateSnapshot } from './update-plan.js';
import {
  applyUpdatePlan,
  recoverInterruptedUpdate,
  rollbackLastSuccessfulUpdate,
  type TransactionResult,
  type AuthorityTransition,
  type LocalTransactionOperation,
} from './update-transaction.js';
import { getPackageVersion } from './package-version.js';
import { HARNESSES, parseHarnessSelection, sanitizeHarnesses, type Harness } from './harness.js';
import {
  DEFAULT_GITIGNORE_PROFILE,
  LEGACY_CLAUDE_STATE_PATH,
  LEGACY_VERSION_FILE,
  STATE_PATH,
  parseGitignoreProfile,
  readVersion,
  type GitignoreProfile,
} from './version.js';
import { planGitignoreProfile, sharedManifestIgnoreWarning } from './gitignore.js';
import { planGitattributes } from './gitattributes.js';
import { resolveUpdatePath } from './update-paths.js';
import { defaultExecutionProfile, type ExecutionProfile } from './execution-profile.js';
import { materializeFreshInstallInventory, type InventoryPatchOperation } from './update-inventory.js';
import {
  evaluateAutoSafeEligibility,
} from './auto-safe-update.js';
import { readUpdatePolicy } from './update-check.js';
import type { ReleaseDescriptor, VerifiedReleaseArtifact } from './release-artifact.js';

/** A bundle already selected by the launcher or supplied by a local test/artifact. */
export interface ExecutingBundle {
  version: string;
  /** Canonical outer-package SHA-512 integrity. Empty means unknown for a local bundle. */
  integrity?: string;
  /** Parsed descriptor shipped with the bundle that is actually executing. */
  descriptor?: ReleaseDescriptor;
  /** Inventory from the executing package. Supplying it avoids any package lookup. */
  inventory?: readonly BundleInventoryEntry[];
}

export interface UpdateOptions {
  /** Explicit harness selection. Required for a fresh unattended `update`. */
  harnesses?: readonly Harness[] | string;
  /** Apply only safe actions; customized files remain conflicts. */
  yes?: boolean;
  nonInteractive?: boolean;
  /** Explicit paths whose customized bytes may be replaced. */
  replaceCustomized?: readonly string[];
  /** Repair explicitly deleted, verified files. */
  repair?: readonly string[];
  /** Init compatibility behavior: all harnesses in a fresh non-TTY run. */
  legacyInit?: boolean;
  /** `init --force` is scoped to known generator/inventory paths. */
  force?: boolean;
  gitignore?: string;
  json?: boolean;
  /** An exact bundle selected by the launcher. No registry work is performed here. */
  bundle?: ExecutingBundle;
  /** Recovery commands are intentionally explicit and share the same output contract. */
  recovery?: 'recover' | 'rollback';
  /** Optional profile captured by the init boundary's interactive setup. */
  executionProfile?: ExecutionProfile;
  /** Optional project-local auto-memory choice captured by init. */
  disableAutoMemory?: boolean;
  /** Return the complete read-only plan without applying it. */
  preview?: boolean;
  /** Apply only after the complete automatic safety gate passes. */
  automatic?: boolean;
  /** Verifier-issued proof for the exact candidate artifact. */
  verifiedArtifact?: VerifiedReleaseArtifact;
}

export type UpdateStatus =
  | 'applied'
  | 'noop'
  | 'preserved'
  | 'conflict'
  | 'invalid'
  | 'attention'
  | 'failed';

export interface UpdateOutcome {
  status: UpdateStatus;
  exitCode: number;
  targetVersion?: string;
  installedVersion?: string;
  profile?: GitignoreProfile;
  harnesses?: Harness[];
  applied: string[];
  preserved: string[];
  conflicts: string[];
  diagnostics: string[];
  registry: 'unknown' | 'available' | 'unavailable' | 'not-requested';
  transaction?: TransactionResult;
  /** Local settings are kept separate from the tracked manifest during adoption. */
  localSettings?: LocalInstallationSettings;
  /** Existing non-Joycraft skills found while preparing a fresh init. */
  existingSkills?: string[];
  /** The read-only plan is exposed for agent review and test seams. */
  plan?: UpdatePlan;
}

export function updateStatusExitCode(status: UpdateStatus): number {
  switch (status) {
    case 'applied':
    case 'noop':
    case 'preserved':
      return 0;
    case 'conflict':
      return 2;
    case 'attention':
      return 3;
    case 'invalid':
    case 'failed':
      return 1;
    default: {
      const exhaustive: never = status;
      throw new Error(`Unknown update status: ${String(exhaustive)}`);
    }
  }
}

function outcome(status: UpdateStatus, fields: Partial<UpdateOutcome> = {}): UpdateOutcome {
  return {
    status,
    exitCode: updateStatusExitCode(status),
    applied: [],
    preserved: [],
    conflicts: [],
    diagnostics: [],
    registry: 'not-requested',
    ...fields,
  };
}

function parseSelection(value: UpdateOptions['harnesses']): Harness[] | null {
  if (typeof value === 'string') return parseHarnessSelection(value);
  if (value === undefined) return null;
  if (value.some((entry) => typeof entry !== 'string' || !HARNESSES.includes(entry.trim().toLowerCase() as Harness))) return null;
  return sanitizeHarnesses(value);
}

function interactive(options: UpdateOptions): boolean {
  return options.nonInteractive !== true && options.yes !== true && process.stdin.isTTY === true;
}

function profileFromAuthorities(root: string, requested: string | undefined): {
  profile: GitignoreProfile;
  manifestInfo: ReturnType<typeof readInstallationManifestInfo>;
  sourceProfile?: GitignoreProfile;
  sourceManifestInfo?: ReturnType<typeof readInstallationManifestInfo>;
  diagnostic?: string;
} {
  const explicit = requested === undefined ? undefined : parseGitignoreProfile(requested);
  if (requested !== undefined && explicit === null) {
    return {
      profile: DEFAULT_GITIGNORE_PROFILE,
      manifestInfo: readInstallationManifestInfo(root, DEFAULT_GITIGNORE_PROFILE),
      diagnostic: `Invalid gitignore profile '${requested}'. Choose shared or private.`,
    };
  }
  if (explicit) {
    const selected = readInstallationManifestInfo(root, explicit);
    const otherProfile: GitignoreProfile = explicit === 'shared' ? 'private' : 'shared';
    const other = readInstallationManifestInfo(root, otherProfile);
    if ((selected.status !== 'missing' && selected.status !== 'valid') || (other.status !== 'missing' && other.status !== 'valid')) {
      const bad = selected.status !== 'missing' && selected.status !== 'valid' ? selected : other;
      return { profile: explicit, manifestInfo: selected, diagnostic: `The ${bad.status} installation manifest needs attention.` };
    }
    if (selected.status === 'valid' && other.status === 'valid') {
      return { profile: explicit, manifestInfo: selected, diagnostic: 'Both shared and private installation manifests are valid; choose one authority before updating.' };
    }
    if (selected.status === 'missing' && other.status === 'valid') {
      return { profile: explicit, manifestInfo: selected, sourceProfile: otherProfile, sourceManifestInfo: other };
    }
    return { profile: explicit, manifestInfo: selected };
  }

  const shared = readInstallationManifestInfo(root, 'shared');
  const privateManifest = readInstallationManifestInfo(root, 'private');
  if ((shared.status !== 'missing' && shared.status !== 'valid') || (privateManifest.status !== 'missing' && privateManifest.status !== 'valid')) {
    const bad = shared.status !== 'missing' && shared.status !== 'valid' ? shared : privateManifest;
    return { profile: 'shared', manifestInfo: shared, diagnostic: `The ${bad.status} installation manifest needs attention.` };
  }
  if (shared.status === 'valid' && privateManifest.status === 'valid') {
    return { profile: 'shared', manifestInfo: shared, diagnostic: 'Both shared and private installation manifests are valid; choose one authority before updating.' };
  }
  if (shared.status === 'valid') return { profile: 'shared', manifestInfo: shared };
  if (privateManifest.status === 'valid') return { profile: 'private', manifestInfo: privateManifest };
  const legacy = readVersion(root);
  return {
    profile: legacy?.gitignoreProfile ?? DEFAULT_GITIGNORE_PROFILE,
    manifestInfo: readInstallationManifestInfo(root, legacy?.gitignoreProfile ?? DEFAULT_GITIGNORE_PROFILE),
  };
}

function regularFile(root: string, relative: string): boolean {
  try {
    return lstatSync(join(root, ...relative.split('/'))).isFile();
  } catch {
    return false;
  }
}

function snapshotFor(root: string, paths: Iterable<string>): UpdateSnapshot {
  const files: Record<string, { content: Buffer; mode?: number }> = {};
  for (const relative of paths) {
    if (!regularFile(root, relative)) continue;
    const absolute = join(root, ...relative.split('/'));
    const stat = lstatSync(absolute);
    files[relative] = { content: readFileSync(absolute), mode: stat.mode & 0o7777 };
  }
  return { files };
}

function executingBundle(options: UpdateOptions): ExecutingBundle {
  const supplied = options.bundle;
  if (supplied) return { ...supplied, integrity: supplied.integrity ?? '' };
  let descriptor: ReleaseDescriptor | undefined;
  try {
    descriptor = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'joycraft-release.json'), 'utf8')) as ReleaseDescriptor;
  } catch {
    descriptor = undefined;
  }
  return { version: getPackageVersion(), integrity: '', descriptor };
}

function legacyStateExists(root: string): boolean {
  return existsSync(join(root, STATE_PATH))
    || existsSync(join(root, LEGACY_VERSION_FILE))
    || existsSync(join(root, LEGACY_CLAUDE_STATE_PATH));
}

function legacyHarnesses(root: string): Harness[] | undefined {
  for (const relative of [STATE_PATH, LEGACY_CLAUDE_STATE_PATH, LEGACY_VERSION_FILE]) {
    if (!regularFile(root, relative)) continue;
    try {
      const parsed = JSON.parse(readFileSync(join(root, ...relative.split('/')), 'utf8')) as Record<string, unknown>;
      if (Array.isArray(parsed.harnesses)) return sanitizeHarnesses(parsed.harnesses) ?? undefined;
    } catch {
      // The migration below preserves malformed state bytes; selection falls
      // back to inspecting known Joycraft artifacts.
    }
  }
  return undefined;
}

function recognizedHarnesses(root: string): Harness[] {
  const inventory = getBundleInventory(HARNESSES);
  return HARNESSES.filter((harness) => inventory.some((entry) => entry.harness === harness && entry.content !== undefined && regularFile(root, entry.path)));
}

function legacyMigrationOperations(root: string, localSettings?: LocalInstallationSettings): LocalTransactionOperation[] {
  const sources = [STATE_PATH, LEGACY_CLAUDE_STATE_PATH, LEGACY_VERSION_FILE];
  const found: Array<{ path: string; content: Buffer }> = [];
  for (const relative of sources) {
    if (!regularFile(root, relative)) continue;
    found.push({ path: relative, content: readFileSync(join(root, ...relative.split('/'))) });
  }
  const operations: LocalTransactionOperation[] = [];
  const settingsPath = 'docs/.joycraft/local/settings.json';
  if (localSettings && Object.keys(localSettings).length > 0) {
    let settings: LocalInstallationSettings | undefined = localSettings;
    const existingSettings = regularFile(root, settingsPath)
      ? readFileSync(join(root, ...settingsPath.split('/')))
      : undefined;
    if (existingSettings) {
      try {
        const parsed = JSON.parse(existingSettings.toString('utf8'));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          // A user's existing local preferences are authoritative. Legacy
          // values fill only keys that are not already present locally.
          settings = { ...localSettings, ...(parsed as Record<string, unknown>) };
        } else {
          settings = undefined;
        }
      } catch {
        // Leave an invalid user settings file untouched rather than replacing
        // it while migrating unrelated legacy state.
        settings = undefined;
      }
    }
    if (settings) {
      operations.push({
        path: settingsPath,
        kind: 'write',
        content: Buffer.from(JSON.stringify(settings, null, 2) + '\n'),
        currentPresent: existingSettings !== undefined,
        ...(existingSettings ? { rawPrecondition: rawFileHash(existingSettings) } : {}),
      });
    }
  }
  if (!found.length || regularFile(root, 'docs/.joycraft/local/legacy-state-backup.json')) return operations;
  const backup = Buffer.from(JSON.stringify(Object.fromEntries(found.map((entry) => [entry.path, entry.content.toString('base64')]))));
  operations.push({
    path: 'docs/.joycraft/local/legacy-state-backup.json',
    kind: 'write',
    content: backup,
    currentPresent: false,
  });
  for (const entry of found) {
    operations.push({
      path: entry.path,
      kind: 'delete',
      currentPresent: true,
      rawPrecondition: rawFileHash(entry.content),
    });
  }
  return operations;
}

function hasRecognizedHarness(root: string): boolean {
  return recognizedHarnesses(root).length > 0;
}

function chosenHarnesses(root: string, options: UpdateOptions, manifest: InstallationManifest | undefined): Harness[] | null {
  const explicit = parseSelection(options.harnesses);
  if (explicit !== null) return explicit;
  if (manifest?.harnesses?.length) return [...manifest.harnesses];
  const legacy = legacyHarnesses(root);
  if (legacy !== undefined && legacy.length > 0) return legacy;
  const recognized = recognizedHarnesses(root);
  if (recognized.length > 0) return recognized;
  if (legacyStateExists(root)) return [...HARNESSES];
  if (options.legacyInit) return [...HARNESSES];
  if (!interactive(options)) return null;
  return null;
}

function localSettingsFromAdoption(root: string, entries: readonly BundleInventoryEntry[], bundle: ExecutingBundle, profile: GitignoreProfile): {
  manifest: InstallationManifest;
  localSettings?: LocalInstallationSettings;
  conflicts: string[];
} {
  const adopted = adoptLegacyInstallation(root, {
    inventory: entries,
    candidateContent: Object.fromEntries(entries.filter((entry) => entry.content !== undefined).map((entry) => [entry.path, { content: entry.content, vendorVersion: bundle.version }])),
    targetVersion: bundle.version,
    bundleIntegrity: bundle.integrity ?? '',
    profile,
  });
  return { manifest: adopted.manifest, localSettings: adopted.localSettings, conflicts: adopted.conflicts };
}

function pathsForOutcome(plan: UpdatePlan): { applied: string[]; preserved: string[]; conflicts: string[] } {
  const applied = plan.actions
    .filter((action) => action.selected && ['replace', 'create', 'repair', 'delete', 'conflict'].includes(action.kind))
    .map((action) => action.path);
  const resolved = new Set(plan.actions
    .filter((action) => action.kind === 'conflict' && action.selected && action.resolution === 'replace')
    .map((action) => action.path));
  const preserved = plan.preserved
    .filter((entry) => !resolved.has(entry.path))
    .filter((entry) => !plan.actions.some((action) => action.path === entry.path && action.nonActionable === true))
    .map((entry) => entry.path);
  const conflicts = plan.conflicts.filter((action) => !resolved.has(action.path)).map((action) => action.path);
  return { applied: [...new Set(applied)], preserved: [...new Set(preserved)], conflicts: [...new Set(conflicts)] };
}

function setupPatchAction(operation: InventoryPatchOperation): PlannedUpdateAction {
  return {
    path: operation.path,
    kind: 'replace',
    selected: true,
    reason: operation.reason,
    content: operation.content,
    rawPrecondition: operation.rawPrecondition,
    rawTargetHash: rawFileHash(operation.content),
    currentPresent: operation.currentPresent,
    targetPresent: true,
  };
}

function profileBookkeepingActions(root: string, profile: GitignoreProfile): PlannedUpdateAction[] {
  const paths = ['.gitignore', '.gitattributes'];
  const resolved = paths.map((path) => ({ path, absolute: resolveUpdatePath(root, path) }));
  const actions: PlannedUpdateAction[] = [];
  for (const target of resolved) {
    const current = regularFile(root, target.path) ? readFileSync(target.absolute) : undefined;
    const currentText = current?.toString('utf8') ?? '';
    const planned = target.path === '.gitignore' ? planGitignoreProfile(currentText, profile) : planGitattributes(currentText);
    if (planned.added.length === 0) continue;
    const stat = current ? lstatSync(target.absolute) : undefined;
    actions.push({
      path: target.path,
      kind: 'replace',
      selected: true,
      reason: `Append Joycraft ${target.path} entries while preserving existing project lines.`,
      content: planned.content,
      rawTargetHash: rawFileHash(planned.content),
      currentPresent: current !== undefined,
      targetPresent: true,
      ...(current ? { rawPrecondition: rawFileHash(current) } : {}),
      ...(stat ? { mode: stat.mode & 0o7777 } : {}),
    });
  }
  return actions;
}

/**
 * Explain when a selected shared harness is hidden by the project's effective
 * Git ignore rules. This is advisory and read-only; the profile planner still
 * owns all .gitignore writes.
 */
function selectedHarnessIgnoreWarning(root: string, harnesses: readonly Harness[]): string[] {
  const warnings: string[] = [];
  for (const harness of harnesses) {
    const candidate = getBundleInventory([harness]).find((entry) => entry.harness === harness && entry.content !== undefined)?.path;
    if (!candidate) continue;
    const top = candidate.split('/')[0];
    let localBroadIgnore = false;
    let localUnignore = false;
    try {
      const localRules = readFileSync(join(root, '.gitignore'), 'utf8')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'));
      localBroadIgnore = localRules.some((line) => line === top || line === `${top}/` || line === `${top}/*` || line === `${top}/**`);
      localUnignore = localRules.some((line) => line === `!${top}/skills/` || line === `!${top}/skills/**` || line === `!${candidate}`);
    } catch {
      // A missing .gitignore is normal on a fresh project.
    }
    if (localBroadIgnore && !localUnignore) {
      const hint = harness === 'claude' ? ' Add !.claude/skills/ (and its parent directory exceptions) if teammates should receive those skills.' : '';
      warnings.push(`Selected ${harness} harness path ${candidate} is hidden by .gitignore.${hint}`);
      continue;
    }
    try {
      execFileSync('git', ['check-ignore', '--no-index', '-q', '--', candidate], {
        cwd: root,
        stdio: ['ignore', 'ignore', 'ignore'],
      });
      const hint = harness === 'claude' ? ' Add !.claude/skills/ (and its parent directory exceptions) if teammates should receive those skills.' : '';
      warnings.push(`Selected ${harness} harness path ${candidate} is hidden by the effective Git ignore rules.${hint}`);
    } catch {
      // Exit status 1 means the path is visible; other failures mean this is
      // not a Git worktree or Git is unavailable. Both are silent here.
    }
  }
  return warnings;
}

function transactionStatus(plan: UpdatePlan, result: TransactionResult, authorityTransition = false, localOperations = false): UpdateStatus {
  if (result.status === 'attention') return 'attention';
  if (result.status === 'failed') return 'failed';
  const unresolvedConflicts = pathsForOutcome(plan).conflicts;
  if (result.status === 'conflict' || unresolvedConflicts.length > 0) return 'conflict';
  if (pathsForOutcome(plan).preserved.length > 0 && pathsForOutcome(plan).applied.length === 0 && !authorityTransition && !localOperations) return 'preserved';
  if (result.status === 'noop' || (result.status === 'applied' && pathsForOutcome(plan).applied.length === 0 && !authorityTransition && !localOperations)) return 'noop';
  return 'applied';
}

function recoveryOutcomeStatus(status: TransactionResult['status']): UpdateStatus {
  if (status === 'conflict') return 'conflict';
  if (status === 'attention') return 'attention';
  if (status === 'none') return 'invalid';
  if (status === 'failed') return 'failed';
  return 'applied';
}

/**
 * Plan and apply one already-selected Joycraft bundle. This function never
 * resolves `latest` and never performs a registry request: the launcher owns
 * exact release selection, while this engine consumes the executing bundle.
 */
export async function update(dir: string, options: UpdateOptions = {}): Promise<UpdateOutcome> {
  const root = resolve(dir);
  const bundle = executingBundle(options);
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(bundle.version)) {
    return outcome('invalid', { diagnostics: [`Invalid executing bundle version '${bundle.version}'.`] });
  }
  // Automatic mode is a narrow agent boundary. Reject explicit setup,
  // recovery, and repair choices before those branches can perform work.
  if (options.automatic && (
    options.recovery !== undefined
    || options.legacyInit === true
    || options.force === true
    || (options.replaceCustomized?.length ?? 0) > 0
    || (options.repair?.length ?? 0) > 0
    || options.executionProfile !== undefined
    || options.disableAutoMemory !== undefined
    || options.gitignore !== undefined
    || options.harnesses !== undefined
  )) {
    return outcome('invalid', { diagnostics: ['Automatic updates cannot include recovery, setup, repair, replacement, migration, or profile options.'] });
  }
  if (options.preview && options.recovery !== undefined) {
    return outcome('invalid', { diagnostics: ['A preview cannot run a recovery or rollback operation.'] });
  }
  if (options.force && !options.legacyInit) {
    return outcome('invalid', { diagnostics: ['--force is supported only by the init alias.'] });
  }
  for (const requestedPath of [...(options.replaceCustomized ?? []), ...(options.repair ?? [])]) {
    try {
      normalizeManifestPath(requestedPath);
    } catch (error) {
      return outcome('invalid', { diagnostics: [error instanceof Error ? error.message : String(error)] });
    }
  }
  const requestedProfile = options.gitignore;
  const authority = profileFromAuthorities(root, requestedProfile);
  if (authority.diagnostic) {
    const invalidProfile = options.gitignore !== undefined && parseGitignoreProfile(options.gitignore) === null;
    return outcome(invalidProfile ? 'invalid' : 'attention', { diagnostics: [authority.diagnostic], profile: authority.profile });
  }
  if (options.harnesses !== undefined && parseSelection(options.harnesses) === null) {
    return outcome('invalid', { profile: authority.profile, diagnostics: ['Invalid harness selection. Choose from claude, codex, pi, copilot, or omp.'] });
  }

  if (options.recovery === 'recover') {
    const transaction = recoverInterruptedUpdate(root, { profile: authority.profile });
    const status = recoveryOutcomeStatus(transaction.status);
    return outcome(status, { profile: authority.profile, transaction, diagnostics: transaction.diagnostics, conflicts: transaction.conflicts });
  }
  if (options.recovery === 'rollback') {
    const transaction = rollbackLastSuccessfulUpdate(root, { profile: authority.profile });
    const status = recoveryOutcomeStatus(transaction.status);
    return outcome(status, { profile: authority.profile, transaction, diagnostics: transaction.diagnostics, conflicts: transaction.conflicts });
  }

  const existingManifest = authority.manifestInfo.manifest ?? authority.sourceManifestInfo?.manifest;
  const legacyProject = legacyStateExists(root) || hasRecognizedHarness(root);
  let harnesses = chosenHarnesses(root, options, existingManifest);
  if (harnesses === null) {
    if (options.legacyInit && !interactive(options)) {
      harnesses = [...HARNESSES];
    } else {
      return outcome('invalid', {
        profile: authority.profile,
        diagnostics: ['Fresh unattended update requires explicit harness selection via --harnesses.'],
      });
    }
  }
  if (harnesses.length === 0) return outcome('invalid', { profile: authority.profile, diagnostics: ['Select at least one harness.'] });
  if (options.legacyInit && options.nonInteractive === true && options.harnesses === undefined) {
    // Compatibility notice is deliberately emitted by the CLI only when human output is requested.
  }

  const baseEntries = bundle.inventory ? [...bundle.inventory] : getBundleInventory(harnesses);
  let manifest: InstallationManifest;
  let localSettings: LocalInstallationSettings | undefined;
  let adoptionConflicts: string[] = [];
  if (existingManifest) {
    manifest = { ...existingManifest, harnesses: [...harnesses], profile: authority.profile };
  } else if (legacyProject) {
    const adopted = localSettingsFromAdoption(root, baseEntries, bundle, authority.profile);
    manifest = { ...adopted.manifest, harnesses: [...harnesses], profile: authority.profile };
    localSettings = adopted.localSettings;
    adoptionConflicts = adopted.conflicts;
  } else {
    manifest = {
      schemaVersion: 1,
      targetVersion: bundle.version,
      bundleIntegrity: bundle.integrity ?? '',
      harnesses: [...harnesses],
      profile: authority.profile,
      files: {},
    };
  }

  const stack = await detectStack(root);
  const canonicalInventory = !bundle.inventory
    || (baseEntries.some((entry) => entry.path === 'CLAUDE.md' && entry.kind === 'create-once')
      && baseEntries.some((entry) => entry.path.startsWith('docs/templates/')));
  const materialized = materializeFreshInstallInventory({
    root,
    entries: baseEntries,
    manifest,
    harnesses,
    profile: authority.profile,
    stack,
    executionProfile: options.executionProfile ?? defaultExecutionProfile(harnesses),
    disableAutoMemory: options.disableAutoMemory,
    freshInstall: !existingManifest && !legacyProject && canonicalInventory,
    // The init alias is the explicit setup boundary. It may merge the
    // allowlisted Claude settings fragments on an established installation;
    // ordinary update/upgrade must leave that user configuration alone.
    configureClaude: options.legacyInit === true,
    force: options.legacyInit === true && options.force === true,
  });
  const entries = materialized.entries;
  const setupPatches = materialized.setup.patchOperations;
  let profileActions: PlannedUpdateAction[];
  try {
    for (const directory of materialized.setup.directories) resolveUpdatePath(root, directory);
    profileActions = profileBookkeepingActions(root, authority.profile);
  } catch (error) {
    return outcome('attention', {
      targetVersion: bundle.version,
      profile: authority.profile,
      harnesses,
      diagnostics: [`Profile bookkeeping path needs attention: ${error instanceof Error ? error.message : String(error)}`],
      registry: 'unknown',
    });
  }
  const paths = new Set<string>([
    ...entries.map((entry) => entry.path),
    ...Object.keys(manifest.files),
  ]);
  const snapshot = snapshotFor(root, paths);
  const replaceCustomized = [...(options.replaceCustomized ?? [])];
  const forceCustomized: string[] = [];
  if (options.legacyInit && options.force) {
    // Init --force is an explicit replacement request for paths declared by
    // the executing inventory. It never discovers or overwrites arbitrary
    // project files outside that inventory.
    for (const entry of entries) {
      if (entry.content !== undefined && (entry.kind === 'vendor' || entry.kind === 'create-once')) {
        replaceCustomized.push(entry.path);
        forceCustomized.push(entry.path);
      }
    }
  }
  const plan = createUpdatePlan({
    snapshot,
    manifest,
    inventory: entries,
    options: {
      targetVersion: bundle.version,
      bundleIntegrity: bundle.integrity ?? '',
      safeUnattended: options.yes === true || options.nonInteractive === true || process.stdin.isTTY !== true,
      replaceCustomized: [...new Set(replaceCustomized)],
      forceCustomized: [...new Set(forceCustomized)],
      repair: options.repair,
      baseManifestDigest: existingManifest ? undefined : null,
    },
  });
  plan.diagnostics.push(...materialized.diagnostics.map((diagnostic) => (
    /settings\.json is malformed/i.test(diagnostic) && !/fix the json/i.test(diagnostic)
      ? `${diagnostic} Fix the JSON before retrying.`
      : diagnostic
  )));
  for (const operation of setupPatches) plan.actions.push(setupPatchAction(operation));
  plan.actions.push(...profileActions);
  // The authority digest must describe the bytes read from disk. The planner's
  // manifest is intentionally cloned with the requested harness/profile before
  // planning, so its synthetic digest cannot be used for transaction authority.
  plan.baseManifestDigest = existingManifest ? manifestDigest(existingManifest) : null;
  const selected = pathsForOutcome(plan);
  // Baselines can intentionally lag after a preserved local-only edit. Record
  // actual unresolved vendor changes so discovery does not mistake that for a conflict.
  plan.nextManifest.pendingConflicts = selected.conflicts;
  const authorityTransition: AuthorityTransition | undefined = authority.sourceProfile && existingManifest
    ? {
        oldAuthority: {
          profile: authority.sourceProfile,
          digest: manifestDigest(existingManifest),
          ...(authority.sourceManifestInfo?.raw !== undefined ? { raw: authority.sourceManifestInfo.raw } : {}),
        },
        newAuthority: { profile: authority.profile, digest: null },
      }
    : undefined;
  const localOperations = legacyMigrationOperations(root, localSettings);
  if (options.automatic) {
    const eligibility = evaluateAutoSafeEligibility({
      policy: readUpdatePolicy(root),
      candidate: options.verifiedArtifact,
      executingVersion: bundle.version,
      executingIntegrity: bundle.integrity || undefined,
      executingDescriptor: bundle.descriptor,
      manifestSchema: manifest.schemaVersion,
      plan,
      existingManifest,
      replaceCustomized,
      repair: options.repair,
      migration: localOperations.length > 0,
      legacyBridge: !existingManifest && legacyProject,
      setupChanges: setupPatches.length > 0,
      // Profile bookkeeping is project configuration. An idempotent profile
      // has no action; any append belongs to an explicit reviewed update.
      profileChanges: profileActions.some((action) => action.selected),
      localOperations: localOperations.length > 0,
      authorityTransition: authorityTransition !== undefined,
    });
    if (!eligibility.eligible) {
      return outcome(selected.conflicts.length > 0 ? 'conflict' : 'invalid', {
        targetVersion: bundle.version,
        profile: authority.profile,
        harnesses,
        preserved: selected.preserved,
        conflicts: selected.conflicts,
        diagnostics: [...plan.diagnostics, ...eligibility.diagnostics],
        plan,
        localSettings,
        registry: 'unknown',
      });
    }
    // Verification supplies the outer package digest; a package cannot embed
    // its own tarball digest without introducing a circular hash.
    plan.nextManifest.bundleIntegrity = options.verifiedArtifact!.release.integrity;
  }
  if (options.preview) {
    const previewStatus: UpdateStatus = selected.conflicts.length > 0
      ? 'conflict'
      : selected.preserved.length > 0 && selected.applied.length === 0
        ? 'preserved'
        : selected.applied.length > 0 ? 'applied' : 'noop';
    return outcome(previewStatus, {
      targetVersion: bundle.version,
      profile: authority.profile,
      harnesses,
      applied: [],
      preserved: selected.preserved,
      conflicts: selected.conflicts,
      diagnostics: plan.diagnostics,
      plan,
      localSettings,
      registry: 'unknown',
    });
  }
  let transaction: TransactionResult;
  try {
    transaction = applyUpdatePlan(root, plan, {
      profile: authority.profile,
      ...(authorityTransition ? { authorityTransition } : {}),
      ...(localOperations.length ? { localOperations } : {}),
    });
  } catch (error) {
    return outcome('failed', {
      targetVersion: bundle.version,
      profile: authority.profile,
      harnesses,
      applied: [],
      preserved: selected.preserved,
      conflicts: selected.conflicts,
      diagnostics: [error instanceof Error ? error.message : String(error)],
      plan,
      localSettings,
      registry: 'unknown',
    });
  }
  const status = transactionStatus(plan, transaction, authorityTransition !== undefined, localOperations.length > 0);
  const actualApplied = transaction.status === 'applied' ? selected.applied : [];
  if (transaction.status === 'applied' || transaction.status === 'noop') {
    try {
      for (const directory of materialized.setup.directories) {
        resolveUpdatePath(root, directory);
        mkdirSync(join(root, ...directory.split('/')), { recursive: true });
      }
    } catch (error) {
      return outcome('attention', {
        targetVersion: bundle.version,
        profile: authority.profile,
        harnesses,
        applied: actualApplied,
        preserved: selected.preserved,
        conflicts: selected.conflicts,
        diagnostics: [`Update applied but profile bookkeeping needs attention: ${String(error)}`],
        transaction,
        plan,
        localSettings,
        registry: 'unknown',
      });
    }
  }
  const diagnostics = [...plan.diagnostics, ...transaction.diagnostics];
  if (transaction.status === 'applied' && authority.profile === 'shared') {
    const manifestWarning = sharedManifestIgnoreWarning(root);
    if (manifestWarning) diagnostics.push(manifestWarning);
    diagnostics.push(...selectedHarnessIgnoreWarning(root, harnesses));
  }
  return outcome(status, {
    targetVersion: bundle.version,
    installedVersion: existingManifest?.targetVersion,
    profile: authority.profile,
    harnesses,
    applied: actualApplied,
    preserved: selected.preserved,
    conflicts: [...new Set([...selected.conflicts, ...adoptionConflicts, ...transaction.conflicts])],
    diagnostics,
    transaction,
    plan,
    localSettings,
    existingSkills: materialized.setup.existingSkills,
    registry: 'unknown',
  });
}

export function formatUpdateOutcome(result: UpdateOutcome, json = false): string {
  if (json) {
    return JSON.stringify({
      status: result.status,
      exitCode: result.exitCode,
      targetVersion: result.targetVersion,
      installedVersion: result.installedVersion,
      profile: result.profile,
      harnesses: result.harnesses,
      applied: result.applied,
      preserved: result.preserved,
      conflicts: result.conflicts,
      diagnostics: result.diagnostics,
      registry: result.registry,
      existingSkills: result.existingSkills,
      transaction: result.transaction,
    });
  }
  const lines = [`Joycraft update: ${result.status}.`];
  if (result.targetVersion) lines.push(`  Target: ${result.targetVersion}`);
  if (result.applied.length) lines.push(`  Applied: ${result.applied.length}`);
  if (result.preserved.length) lines.push(`  Preserved customizations: ${result.preserved.join(', ')}`);
  if (result.conflicts.length) lines.push(`  Pending conflicts: ${result.conflicts.join(', ')}`);
  for (const diagnostic of result.diagnostics) lines.push(`  ⚠ ${diagnostic}`);
  return lines.join('\n');
}
