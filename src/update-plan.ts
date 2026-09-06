import {
  normalizedVendorHash,
  manifestDigest,
  rawFileHash,
  type InstallationManifest,
  type VendorCatalogueEntry,
} from './install-manifest.js';
import type { BundleInventoryEntry } from './bundle-inventory.js';
import { applyOwnedContent, readOwnedContent } from './update-patches.js';

export type SnapshotContent = string | Buffer;

export interface SnapshotFile {
  content: SnapshotContent;
  mode?: number;
}

export interface UpdateSnapshot {
  files: Readonly<Record<string, SnapshotFile | SnapshotContent>>;
}

export interface UpdatePlanOptions {
  targetVersion?: string;
  bundleIntegrity?: string;
  /** Safe unattended mode selects only actions that cannot overwrite user edits. */
  safeUnattended?: boolean;
  replaceCustomized?: readonly string[];
  repair?: readonly string[];
  /** Optional trusted historical vendor hashes used for bridge adoption. */
  catalogue?: readonly VendorCatalogueEntry[];
}

export type UpdateActionKind =
  | 'reconcile'
  | 'replace'
  | 'preserve'
  | 'conflict'
  | 'repair'
  | 'create'
  | 'adopt'
  | 'delete'
  | 'orphan';

export interface PlannedUpdateAction {
  path: string;
  kind: UpdateActionKind;
  selected: boolean;
  resolution?: 'replace' | 'repair' | 'preserve';
  reason: string;
  content?: SnapshotContent;
  preservedContent?: SnapshotContent;
  diff?: string;
  rawPrecondition?: string;
  rawTargetHash?: string;
  mode?: number;
  currentPresent: boolean;
  targetPresent: boolean;
  /** For config patches, identifies the fragments calculated in content. */
  patch?: { ownedKey?: string; ownedRegion?: string };
}

export interface UpdatePlan {
  actions: PlannedUpdateAction[];
  /** Convenience view of all preserved current bytes, including conflicts. */
  preserved: Array<{ path: string; content: SnapshotContent; reason: string }>;
  conflicts: PlannedUpdateAction[];
  diagnostics: string[];
  nextManifest: InstallationManifest;
  /** Digest of the authority read during planning; null explicitly requires a missing authority. */
  baseManifestDigest?: string | null;
}

interface TargetGroup {
  path: string;
  entries: BundleInventoryEntry[];
  invalidDefinition: boolean;
}

function bytes(value: SnapshotContent): SnapshotContent {
  return Buffer.isBuffer(value) ? Buffer.from(value) : value;
}

function text(value: SnapshotContent): string {
  return Buffer.isBuffer(value) ? value.toString('utf8') : value;
}

function contentOf(value: SnapshotFile | SnapshotContent): SnapshotContent {
  return typeof value === 'object' && value !== null && 'content' in value
    ? bytes((value as SnapshotFile).content)
    : bytes(value as SnapshotContent);
}

function cloneManifest(manifest: InstallationManifest): InstallationManifest {
  return {
    ...manifest,
    files: Object.fromEntries(Object.entries(manifest.files).map(([path, file]) => [path, { ...file }])),
  };
}

function normalized(value: SnapshotContent): string {
  return normalizedVendorHash(text(value));
}

function newlineStyle(value: string): '\r\n' | '\n' {
  return value.includes('\r\n') ? '\r\n' : '\n';
}

function preserveNewlines(target: SnapshotContent, current: SnapshotContent | undefined, executable: boolean | undefined): SnapshotContent {
  if (!current || executable || Buffer.isBuffer(target) || Buffer.isBuffer(current)) return bytes(target);
  const style = newlineStyle(text(current));
  if (style === '\n') return target;
  return text(target).replace(/\r\n?/g, '\n').replace(/\n/g, '\r\n');
}

function diff(path: string, current: SnapshotContent, target: SnapshotContent): string {
  const oldLines = text(current).replace(/\r\n?/g, '\n').split('\n');
  const newLines = text(target).replace(/\r\n?/g, '\n').split('\n');
  const lines = [`--- ${path}`, `+++ ${path}`];
  const size = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < size; i += 1) {
    if (oldLines[i] === newLines[i]) lines.push(` ${oldLines[i] ?? ''}`);
    else {
      if (oldLines[i] !== undefined) lines.push(`-${oldLines[i]}`);
      if (newLines[i] !== undefined) lines.push(`+${newLines[i]}`);
    }
  }
  return lines.join('\n');
}

function selected(options: UpdatePlanOptions, path: string, kind: UpdateActionKind): boolean {
  if (kind === 'replace' || kind === 'create' || kind === 'adopt' || kind === 'delete' || kind === 'reconcile') return true;
  if (kind === 'repair') return (options.repair ?? []).includes(path);
  return false;
}

function explicitReplacement(options: UpdatePlanOptions, path: string): boolean {
  return (options.replaceCustomized ?? []).includes(path);
}

function targetPayload(entry: BundleInventoryEntry): SnapshotContent | undefined {
  return entry.content;
}

function patchOutput(
  current: SnapshotContent,
  entries: readonly BundleInventoryEntry[],
): { content?: SnapshotContent; fragment?: string; reason?: string } {
  const entry = entries[0];
  if (entry.content === undefined) return { reason: 'Config patch has no installable payload.' };
  const selector = { ...(entry.ownedKey ? { ownedKey: entry.ownedKey } : {}), ...(entry.ownedRegion ? { ownedRegion: entry.ownedRegion } : {}) };
  const result = applyOwnedContent(text(current), selector, text(entry.content));
  if (!result.ok) return { reason: result.reason };
  const fragment = readOwnedContent(result.content, selector);
  if (fragment.status !== 'present') return { reason: fragment.status === 'invalid' ? fragment.reason : 'Patched owned content is missing.' };
  return { content: result.content, fragment: fragment.content };
}

function trustedHash(path: string, options: UpdatePlanOptions): string | undefined {
  const catalogue = options.catalogue?.find((entry) => entry.path === path);
  return catalogue?.vendorHash;
}

function addFile(next: InstallationManifest, path: string, entry: BundleInventoryEntry, hash: string, version: string): void {
  next.files[path] = {
    ...(next.files[path] ?? {}),
    vendorVersion: version,
    vendorHash: hash,
    kind: entry.kind,
    ownership: 'verified',
    ...(entry.ownedKey ? { ownedKey: entry.ownedKey } : {}),
    ...(entry.ownedRegion ? { ownedRegion: entry.ownedRegion } : {}),
  };
}

function actionBase(path: string, kind: UpdateActionKind, reason: string, current: SnapshotContent | undefined, target: SnapshotContent | undefined, mode: number | undefined): PlannedUpdateAction {
  const currentPresent = current !== undefined;
  const targetPresent = target !== undefined;
  const result: PlannedUpdateAction = {
    path, kind, selected: false, reason, currentPresent, targetPresent,
    ...(current !== undefined ? { preservedContent: bytes(current) } : {}),
    ...(target !== undefined ? { rawTargetHash: rawFileHash(target) } : {}),
    ...(mode === undefined ? {} : { mode }),
  };
  if (current !== undefined) result.rawPrecondition = rawFileHash(current);
  return result;
}

/**
 * Compare an explicit snapshot, manifest, and bundle inventory without any I/O,
 * prompting, mutation, or network access. The returned actions are sufficient
 * for a later transaction to recheck raw preconditions and apply reviewed bytes.
 */
export function createUpdatePlan(input: {
  snapshot: UpdateSnapshot;
  manifest: InstallationManifest;
  inventory: readonly BundleInventoryEntry[];
  options?: UpdatePlanOptions;
}): UpdatePlan {
  const options = input.options ?? {};
  const snapshotFiles = input.snapshot.files;
  const current = new Map<string, SnapshotContent>();
  for (const [path, value] of Object.entries(snapshotFiles)) current.set(path, contentOf(value));
  const nextManifest = cloneManifest(input.manifest);
  if (options.targetVersion !== undefined) nextManifest.targetVersion = options.targetVersion;
  if (options.bundleIntegrity !== undefined) nextManifest.bundleIntegrity = options.bundleIntegrity;
  const diagnostics: string[] = [];
  const actions: PlannedUpdateAction[] = [];
  const groups = new Map<string, TargetGroup>();
  const knownPaths = new Set<string>();

  for (const entry of input.inventory) {
    knownPaths.add(entry.path);
    // Create-once documents and inactive/non-installable declarations carry
    // ownership metadata only. They must never become a write target here.
    if (entry.kind === 'create-once' || !entry.active || !entry.installable || (entry.kind === 'vendor' && entry.content === undefined)) continue;
    let group = groups.get(entry.path);
    if (!group) {
      group = { path: entry.path, entries: [], invalidDefinition: false };
      groups.set(entry.path, group);
    }
    if (group.entries.some((prior) => prior.kind !== entry.kind || prior.harness !== entry.harness)) group.invalidDefinition = true;
    group.entries.push(entry);
  }

  const add = (action: PlannedUpdateAction): void => {
    actions.push(action);
    if (action.kind === 'conflict' || action.kind === 'orphan') {
      if (action.preservedContent !== undefined) diagnostics.push(`${action.path}: ${action.reason}`);
    }
  };

  for (const group of groups.values()) {
    const manifestEntry = input.manifest.files[group.path];
    const currentContent = current.get(group.path);
    if (group.invalidDefinition) {
      const action = actionBase(group.path, 'conflict', 'Conflicting inventory definitions for one path.', currentContent, undefined, undefined);
      action.selected = false;
      add(action);
      continue;
    }
    const first = group.entries[0];
    let target: SnapshotContent | undefined;
    let targetFragment: SnapshotContent | undefined;
    let fragmentHash = false;
    if (first.kind === 'config-patch') {
      const patchDefinitions = group.entries.map((entry) => `${entry.ownedKey ?? ''}\0${entry.ownedRegion ?? ''}`);
      for (let i = 0; i < group.entries.length; i += 1) {
        for (let j = i + 1; j < group.entries.length; j += 1) {
          if (patchDefinitions[i] === patchDefinitions[j]) {
            const left = targetPayload(group.entries[i]);
            const right = targetPayload(group.entries[j]);
            if ((left === undefined) !== (right === undefined) || (left !== undefined && right !== undefined && normalized(left) !== normalized(right))) {
              group.invalidDefinition = true;
            }
          }
        }
      }
      if (new Set(patchDefinitions).size > 1) {
        const action = actionBase(group.path, 'conflict', 'Multiple owned patch selectors share one path; refusing ambiguous composition.', currentContent, undefined, first.mode);
        add(action);
        continue;
      }
      if (group.invalidDefinition) {
        const action = actionBase(group.path, 'conflict', 'Conflicting inventory definitions for one path.', currentContent, undefined, undefined);
        add(action);
        continue;
      }
      if (currentContent === undefined) continue;
      const result = patchOutput(currentContent, group.entries);
      if (!result.content) {
        const action = actionBase(group.path, 'conflict', result.reason ?? 'Unable to calculate config patch.', currentContent, undefined, first.mode);
        action.selected = false;
        add(action);
        continue;
      }
      target = result.content;
      targetFragment = result.fragment;
      fragmentHash = true;
    } else {
      const payloads = group.entries.map((entry) => targetPayload(entry)).filter((value): value is SnapshotContent => value !== undefined);
      if (!payloads.length) continue;
      if (payloads.some((value) => normalized(value) !== normalized(payloads[0]))) {
        const action = actionBase(group.path, 'conflict', 'Duplicate inventory entries have conflicting payloads.', currentContent, undefined, first.mode);
        add(action);
        continue;
      }
      target = preserveNewlines(payloads[0], currentContent, first.executable);
    }
    const old = manifestEntry;
    const verified = old?.ownership === 'verified' && !!old.vendorHash;
    const currentHash = currentContent === undefined
      ? undefined
      : fragmentHash && targetFragment !== undefined
        ? (() => {
          const selector = { ...(first.ownedKey ? { ownedKey: first.ownedKey } : {}), ...(first.ownedRegion ? { ownedRegion: first.ownedRegion } : {}) };
          const fragment = readOwnedContent(text(currentContent), selector);
          return fragment.status === 'present' ? normalized(fragment.content) : undefined;
        })()
        : normalized(currentContent);
    const targetHash = fragmentHash && targetFragment !== undefined ? normalized(targetFragment) : normalized(target);
    const baselineHash = verified ? old!.vendorHash : trustedHash(group.path, options);
    const currentEqualsTarget = currentHash !== undefined && currentHash === targetHash;
    const currentEqualsBase = currentHash !== undefined && baselineHash !== undefined && currentHash === baselineHash;
    const targetEqualsBase = baselineHash !== undefined && targetHash === baselineHash;
    let kind: UpdateActionKind;
    let reason: string;
    if (currentContent === undefined) {
      if (verified) { kind = 'preserve'; reason = 'Local deletion is preserved; repair requires explicit selection.'; }
      else if (old) { kind = 'preserve'; reason = 'Prior ownership is unverified; preserve the local deletion.'; }
      else { kind = first.kind === 'vendor' ? 'create' : 'preserve'; reason = first.kind === 'vendor' ? 'New selected vendor file.' : 'Config patch has no current file.'; }
    } else if (currentEqualsTarget) {
      kind = old && verified ? 'reconcile' : 'adopt';
      reason = kind === 'reconcile' ? 'Current bytes already equal target; reconcile manifest metadata.' : 'Exact trusted target match establishes vendor ownership.';
    } else if (currentEqualsBase) {
      kind = 'replace'; reason = 'Current bytes equal the verified vendor base; safe replacement.';
    } else if (targetEqualsBase) {
      kind = 'preserve'; reason = 'Vendor target is unchanged; preserve the local-only edit.';
    } else if (verified) {
      kind = 'conflict'; reason = 'Current customization and target vendor content both differ from the verified base.';
    } else {
      kind = 'conflict'; reason = 'Ownership is unverified; preserve current content until trusted evidence or explicit review.';
    }
    const action = actionBase(group.path, kind, reason, currentContent, target, first.mode);
    if (target !== undefined && ['replace', 'create', 'adopt', 'conflict'].includes(kind)) action.content = bytes(target);
    action.selected = selected(options, group.path, kind);
    if (kind === 'preserve' && currentContent === undefined && verified && options.repair?.includes(group.path)) {
      action.kind = 'repair'; action.resolution = 'repair'; action.selected = true;
      if (target !== undefined) action.content = bytes(target);
    } else if (kind === 'conflict' && explicitReplacement(options, group.path)) {
      action.resolution = 'replace'; action.selected = true;
    }
    if (kind === 'conflict' && currentContent !== undefined && target !== undefined) action.diff = diff(group.path, currentContent, target);
    if (first.kind === 'config-patch') action.patch = { ...(first.ownedKey ? { ownedKey: first.ownedKey } : {}), ...(first.ownedRegion ? { ownedRegion: first.ownedRegion } : {}) };
    add(action);
    if (action.selected && ['replace', 'create', 'adopt', 'repair', 'reconcile'].includes(action.kind)) addFile(nextManifest, group.path, first, targetHash, options.targetVersion ?? input.manifest.targetVersion);
    if (action.selected && action.kind === 'conflict' && action.resolution === 'replace') addFile(nextManifest, group.path, first, targetHash, options.targetVersion ?? input.manifest.targetVersion);
  }

  for (const [path, old] of Object.entries(input.manifest.files)) {
    if (knownPaths.has(path)) continue;
    const currentContent = current.get(path);
    if (currentContent === undefined) {
      const action = actionBase(path, 'preserve', 'Previously managed file is absent; preserve local deletion.', undefined, undefined, undefined);
      add(action);
      continue;
    }
    if (old.kind !== 'vendor') {
      const action = actionBase(path, 'preserve', 'Target no longer declares a patch/document; preserve the whole user file.', currentContent, undefined, undefined);
      action.selected = false;
      add(action);
      continue;
    }
    if (old.ownership !== 'verified' || !old.vendorHash) {
      const action = actionBase(path, 'orphan', 'Target no longer declares this file and ownership is unverified; preserve it.', currentContent, undefined, undefined);
      action.selected = false;
      add(action);
      delete nextManifest.files[path];
      continue;
    }
    const currentHash = normalized(currentContent);
    if (currentHash === old.vendorHash) {
      const action = actionBase(path, 'delete', 'Target no longer includes an owned file; delete only the verified file.', currentContent, undefined, undefined);
      action.selected = true;
      add(action);
      delete nextManifest.files[path];
    } else {
      const action = actionBase(path, 'orphan', 'Target no longer includes customized content; preserve it as an orphaned customization.', currentContent, undefined, undefined);
      action.selected = false;
      add(action);
      delete nextManifest.files[path];
    }
  }

  const preserved = actions
    .filter((action) => action.preservedContent !== undefined && ['preserve', 'conflict', 'orphan'].includes(action.kind))
    .map((action) => ({ path: action.path, content: bytes(action.preservedContent!), reason: action.reason }));
  const conflicts = actions.filter((action) => action.kind === 'conflict');
  return { actions, preserved, conflicts, diagnostics, nextManifest, baseManifestDigest: manifestDigest(input.manifest) };
}
