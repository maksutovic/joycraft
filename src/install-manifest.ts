import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { HARNESSES, sanitizeHarnesses, type Harness } from './harness.js';
import { HISTORICAL_VENDOR_CATALOGUE } from './historical-vendor-catalogue.js';
import {
  PRIVATE_MANIFEST_PATH,
  SHARED_MANIFEST_PATH,
} from './gitignore.js';
import {
  DEFAULT_GITIGNORE_PROFILE,
  LEGACY_CLAUDE_STATE_PATH,
  LEGACY_VERSION_FILE,
  parseGitignoreProfile,
  STATE_PATH,
  type GitignoreProfile,
} from './version.js';

export const INSTALLATION_MANIFEST_SCHEMA = 1 as const;
export { PRIVATE_MANIFEST_PATH, SHARED_MANIFEST_PATH } from './gitignore.js';

export type ManifestFileKind = 'vendor' | 'create-once' | 'config-patch';
export type ManifestOwnership = 'verified' | 'unknown';

export interface InstallationFile {
  vendorVersion: string;
  /** SHA-256 of the canonical LF-normalized vendor text. */
  vendorHash: string;
  kind: ManifestFileKind;
  ownership: ManifestOwnership;
  /** The owned JSON key for a config patch, when applicable. */
  ownedKey?: string;
  /** The owned marker/region for a config patch, when applicable. */
  ownedRegion?: string;
}

export interface InstallationManifest {
  schemaVersion: 1;
  targetVersion: string;
  bundleIntegrity: string;
  harnesses: Harness[];
  profile: GitignoreProfile;
  files: Record<string, InstallationFile>;
  [key: string]: unknown;
}

export interface ManifestReadDiagnostics {
  path: string;
  status: 'missing' | 'valid' | 'corrupt' | 'future-schema' | 'invalid';
  diagnostics: string[];
  raw?: string;
  manifest?: InstallationManifest;
}

export interface VendorCatalogueEntry {
  path: string;
  version: string;
  vendorHash: string;
}

export interface LegacyInventoryEntry {
  path: string;
  kind?: ManifestFileKind;
  ownedKey?: string;
  ownedRegion?: string;
  content?: string | Buffer;
  vendorVersion?: string;
  vendorHash?: string;
}

export interface CandidateContentEntry {
  content?: string | Buffer;
  vendorVersion?: string;
  vendorHash?: string;
}

export type CandidateContent = Record<string, string | Buffer | CandidateContentEntry>;

export interface AdoptionOptions {
  inventory?: readonly LegacyInventoryEntry[] | Record<string, LegacyInventoryEntry>;
  candidateContent?: CandidateContent;
  catalogue?: readonly VendorCatalogueEntry[];
  profile?: GitignoreProfile;
  targetVersion?: string;
  bundleIntegrity?: string;
  legacyState?: unknown;
}

export interface LocalInstallationSettings {
  autoOpen?: boolean;
  updatePolicy?: unknown;
  dismissedRelease?: string;
  lastCheckedAt?: string;
  /** Legacy state stays in the local migration plan until transaction wiring. */
  legacy?: { state: unknown };
  [key: string]: unknown;
}

export interface AdoptionResult {
  manifest: InstallationManifest;
  localSettings: LocalInstallationSettings;
  diagnostics: string[];
  conflicts: string[];
}

/** Return the project-relative authority path for a profile. */
export function manifestPath(profile: GitignoreProfile = DEFAULT_GITIGNORE_PROFILE): string {
  return profile === 'private' ? PRIVATE_MANIFEST_PATH : SHARED_MANIFEST_PATH;
}

/** SHA-256 of the exact bytes that will be used as a transaction precondition. */
export function rawFileHash(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

/** SHA-256 of the canonical JSON representation used as a transaction marker. */
export function manifestDigest(manifest: InstallationManifest): string {
  return rawFileHash(JSON.stringify(manifest));
}

/** SHA-256 of managed text after canonicalizing all common newline forms to LF. */
export function normalizedVendorHash(content: string): string {
  return rawFileHash(content.replace(/\r\n?/g, '\n'));
}

/** Normalize and validate a project-relative persisted path. */
export function normalizeManifestPath(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Manifest paths must be non-empty strings.');
  }
  if (value.includes('\0') || value.includes('\\') || value.startsWith('/') || /^[A-Za-z]:/.test(value)) {
    throw new Error(`Manifest path must be a portable relative path: '${value}'.`);
  }
  const parts = value.split('/');
  if (parts.some((part) => part === '' || part === '.' || part === '..')) {
    throw new Error(`Manifest path must not contain traversal or empty segments: '${value}'.`);
  }
  return parts.join('/');
}

function isHarness(value: unknown): value is Harness {
  return typeof value === 'string' && (HARNESSES as readonly string[]).includes(value);
}

function isHash(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value);
}

function isBundleIntegrity(value: unknown): value is string {
  if (value === '') return true;
  if (typeof value !== 'string' || !value.startsWith('sha512-')) return false;
  const encoded = value.slice('sha512-'.length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return false;
  try {
    const decoded = Buffer.from(encoded, 'base64');
    return decoded.length === 64 && decoded.toString('base64') === encoded;
  } catch {
    return false;
  }
}

function validFileEntry(value: unknown): value is InstallationFile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const file = value as Record<string, unknown>;
  if (typeof file.vendorVersion !== 'string' || typeof file.vendorHash !== 'string') return false;
  if (!['vendor', 'create-once', 'config-patch'].includes(String(file.kind))) return false;
  if (file.ownership !== 'verified' && file.ownership !== 'unknown') return false;
  if (file.ownedKey !== undefined && typeof file.ownedKey !== 'string') return false;
  if (file.ownedRegion !== undefined && typeof file.ownedRegion !== 'string') return false;
  if (file.kind === 'config-patch' && !file.ownedKey && !file.ownedRegion) return false;
  return (file.ownership === 'unknown' && file.vendorHash === '') || isHash(file.vendorHash);
}

/** Type guard for the complete, known schema-1 manifest shape. */
export function validateManifest(value: unknown): value is InstallationManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const manifest = value as Record<string, unknown>;
  if (manifest.schemaVersion !== INSTALLATION_MANIFEST_SCHEMA) return false;
  if (typeof manifest.targetVersion !== 'string' || manifest.targetVersion.length === 0) return false;
  if (!isBundleIntegrity(manifest.bundleIntegrity)) return false;
  if (manifest.profile !== 'shared' && manifest.profile !== 'private') return false;
  if (!Array.isArray(manifest.harnesses) || manifest.harnesses.some((h) => !isHarness(h))) return false;
  if (new Set(manifest.harnesses).size !== manifest.harnesses.length) return false;
  if (!manifest.files || typeof manifest.files !== 'object' || Array.isArray(manifest.files)) return false;
  for (const [path, entry] of Object.entries(manifest.files)) {
    try {
      if (normalizeManifestPath(path) !== path || !validFileEntry(entry)) return false;
    } catch {
      return false;
    }
  }
  return true;
}

/** Parse and validate JSON/object input, throwing a useful error on bad data. */
export function parseInstallationManifest(input: string | unknown): InstallationManifest {
  let parsed: unknown = input;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch (error) {
      throw new Error(`Invalid installation manifest JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (!validateManifest(parsed)) {
    const schema = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>).schemaVersion : undefined;
    if (typeof schema === 'number' && schema > INSTALLATION_MANIFEST_SCHEMA) {
      throw new Error(`Unsupported installation manifest schema ${schema}; refusing mutation.`);
    }
    throw new Error('Invalid installation manifest schema.');
  }
  return parsed;
}

export function readInstallationManifestInfo(root: string, profile: GitignoreProfile = DEFAULT_GITIGNORE_PROFILE): ManifestReadDiagnostics {
  const path = join(root, manifestPath(profile));
  if (!existsSync(path)) return { path, status: 'missing', diagnostics: [] };
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (error) {
    return { path, status: 'corrupt', raw: undefined, diagnostics: [`Unable to read installation manifest: ${String(error)}`] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { path, status: 'corrupt', raw, diagnostics: ['Installation manifest contains malformed JSON.'] };
  }
  const schema = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>).schemaVersion : undefined;
  if (typeof schema === 'number' && schema > INSTALLATION_MANIFEST_SCHEMA) {
    return { path, status: 'future-schema', raw, diagnostics: [`Installation manifest schema ${schema} is newer than supported schema ${INSTALLATION_MANIFEST_SCHEMA}.`] };
  }
  if (!validateManifest(parsed)) {
    return { path, status: 'invalid', raw, diagnostics: ['Installation manifest failed schema validation.'] };
  }
  return { path, status: 'valid', raw, diagnostics: [], manifest: parsed };
}

/** Read a valid manifest; corrupt, invalid, future, and missing state returns null without rewriting bytes. */
export function readInstallationManifest(root: string, profile: GitignoreProfile = DEFAULT_GITIGNORE_PROFILE): InstallationManifest | null {
  return readInstallationManifestInfo(root, profile).manifest ?? null;
}

export function writeInstallationManifest(root: string, manifest: InstallationManifest, profile: GitignoreProfile = manifest.profile): void {
  if (!validateManifest(manifest)) throw new Error('Refusing to write an invalid installation manifest.');
  if (profile !== manifest.profile) {
    throw new Error(`Manifest profile '${manifest.profile}' does not match requested write profile '${profile}'.`);
  }
  const path = join(root, manifestPath(profile));
  const existing = readInstallationManifestInfo(root, profile);
  if (existing.status !== 'missing' && existing.status !== 'valid') {
    throw new Error(`Refusing to replace ${existing.status} installation manifest; preserve its bytes for diagnosis.`);
  }
  mkdirSync(dirname(path), { recursive: true });
  const tempPath = `${path}.tmp-${process.pid}`;
  writeFileSync(tempPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  renameSync(tempPath, path);
}

function harnessRoot(harness: Harness): string {
  return ({ claude: '.claude', codex: '.agents', pi: '.pi', copilot: '.github', omp: '.omp' })[harness];
}

function hasJoycraftArtifact(root: string, harness: Harness): boolean {
  const start = join(root, harnessRoot(harness));
  if (!existsSync(start)) return false;
  const visit = (directory: string): boolean => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const full = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (visit(full)) return true;
      } else if (entry.isFile() && isApprovedJoycraftPath(harness, full.slice(start.length + 1))) {
        return true;
      }
    }
    return false;
  };
  return visit(start);
}

function isApprovedJoycraftPath(harness: Harness, relative: string): boolean {
  const normalized = relative.split('\\').join('/');
  const prefixes: Record<Harness, readonly string[]> = {
    claude: ['skills/joycraft-', 'hooks/joycraft-'],
    codex: ['skills/joycraft-'],
    pi: ['skills/joycraft-', 'agents/joycraft-', 'scripts/joycraft/'],
    copilot: ['skills/joycraft-'],
    omp: ['skills/joycraft-'],
  };
  return prefixes[harness].some((prefix) => normalized.startsWith(prefix));
}

function inventoryEntries(value: AdoptionOptions['inventory']): LegacyInventoryEntry[] {
  if (!value) return [];
  if (Array.isArray(value)) return [...value];
  return Object.entries(value).map(([path, entry]) => entry.path === path ? entry : { ...entry, path });
}

function contentEntry(value: string | Buffer | CandidateContentEntry | undefined): CandidateContentEntry {
  if (typeof value === 'string' || Buffer.isBuffer(value)) return { content: value };
  return value ?? {};
}

function readLegacyState(root: string): unknown {
  for (const relative of [STATE_PATH, LEGACY_CLAUDE_STATE_PATH, LEGACY_VERSION_FILE]) {
    const path = join(root, relative);
    if (!existsSync(path)) continue;
    const raw = readFileSync(path, 'utf8');
    try {
      return JSON.parse(raw);
    } catch {
      // Keeping the original bytes makes a malformed state diagnosable and
      // ensures adoption never silently destroys it.
      return raw;
    }
  }
  return undefined;
}

/**
 * Build a schema-1 manifest from a pre-manifest installation. Current bytes
 * are verified only against supplied target bytes or the verified catalogue;
 * legacy state hashes are intentionally never used as ownership evidence.
 */
export function adoptLegacyInstallation(
  root: string,
  options: AdoptionOptions,
): AdoptionResult {
  const entries = inventoryEntries(options.inventory);
  const candidates = options.candidateContent ?? {};
  const trusted = new Map<string, VendorCatalogueEntry[]>();
  for (const item of options.catalogue ?? HISTORICAL_VENDOR_CATALOGUE) {
    try {
      const path = normalizeManifestPath(item.path);
      const records = trusted.get(path) ?? [];
      records.push({ ...item, vendorHash: item.vendorHash.toLowerCase() });
      trusted.set(path, records);
    } catch {
      // A bad catalogue row cannot establish ownership.
    }
  }
  const activeHarnesses = HARNESSES.filter((h) => hasJoycraftArtifact(root, h));
  const diagnostics: string[] = [];
  const conflicts: string[] = [];
  const files: Record<string, InstallationFile> = {};
  let targetVersion = options.targetVersion ?? 'legacy';
  const discoveredLegacyState = readLegacyState(root);
  const suppliedLegacy = options.legacyState ?? discoveredLegacyState;
  const legacyRecord = suppliedLegacy && typeof suppliedLegacy === 'object' && !Array.isArray(suppliedLegacy)
    ? suppliedLegacy as Record<string, unknown>
    : undefined;
  const explicitHarnesses = sanitizeHarnesses(legacyRecord?.harnesses);
  const selectedHarnesses = explicitHarnesses ?? activeHarnesses;

  for (const entry of entries) {
    let path: string;
    try {
      path = normalizeManifestPath(entry.path);
    } catch (error) {
      diagnostics.push(String(error));
      continue;
    }
    const harness = HARNESSES.find((h) => path === harnessRoot(h) || path.startsWith(`${harnessRoot(h)}/`));
    if (harness && !selectedHarnesses.includes(harness)) continue;
    const diskPath = join(root, ...path.split('/'));
    if (!existsSync(diskPath) || !lstatSync(diskPath).isFile()) continue;
    const current = readFileSync(diskPath);
    const candidate = contentEntry(candidates[path] ?? candidates[entry.path] ?? entry);
    const suppliedCandidateHash = candidate.vendorHash;
    const candidateHash = (suppliedCandidateHash && isHash(suppliedCandidateHash)
      ? suppliedCandidateHash
      : candidate.content !== undefined
        ? normalizedVendorHash(Buffer.isBuffer(candidate.content) ? candidate.content.toString('utf8') : candidate.content)
        : '').toLowerCase();
    const currentHash = normalizedVendorHash(current.toString('utf8'));
    const verifiedTarget = Boolean(candidateHash && currentHash === candidateHash);
    const historical = verifiedTarget ? undefined : trusted.get(path)?.find((record) => currentHash === record.vendorHash);
    const verifiedHistorical = Boolean(historical);
    const ownership: ManifestOwnership = verifiedTarget || verifiedHistorical ? 'verified' : 'unknown';
    if (ownership === 'unknown') conflicts.push(path);
    if (!options.targetVersion && targetVersion === 'legacy' && candidate.vendorVersion) targetVersion = candidate.vendorVersion;
    files[path] = {
      vendorVersion: verifiedHistorical ? historical!.version : (candidate.vendorVersion ?? targetVersion),
      vendorHash: verifiedTarget ? candidateHash : historical?.vendorHash || candidateHash,
      kind: entry.kind ?? 'vendor',
      ownership,
      ...(entry.ownedKey ? { ownedKey: entry.ownedKey } : {}),
      ...(entry.ownedRegion ? { ownedRegion: entry.ownedRegion } : {}),
    };
  }

  const manifest: InstallationManifest = {
    schemaVersion: 1,
    targetVersion,
    bundleIntegrity: options.bundleIntegrity ?? '',
    harnesses: [...selectedHarnesses],
    profile: options.profile ?? parseGitignoreProfile(legacyRecord?.gitignoreProfile) ?? DEFAULT_GITIGNORE_PROFILE,
    files,
  };
  const legacy = suppliedLegacy;
  const legacyUnknown = legacyRecord ? { ...legacyRecord } : legacy;
  if (legacyRecord) {
    for (const key of ['version', 'files', 'gitignoreProfile', 'harnesses', 'autoOpen', 'updatePolicy', 'dismissedRelease', 'lastCheckedAt']) {
      delete (legacyUnknown as Record<string, unknown>)[key];
    }
  }
  const localSettings: LocalInstallationSettings = {
    ...(legacyRecord && typeof legacyRecord.autoOpen === 'boolean'
      ? { autoOpen: legacyRecord.autoOpen }
      : {}),
    ...(legacyRecord && legacyRecord.updatePolicy !== undefined ? { updatePolicy: legacyRecord.updatePolicy } : {}),
    ...(legacyRecord && typeof legacyRecord.dismissedRelease === 'string' ? { dismissedRelease: legacyRecord.dismissedRelease } : {}),
    ...(legacyRecord && typeof legacyRecord.lastCheckedAt === 'string' ? { lastCheckedAt: legacyRecord.lastCheckedAt } : {}),
    ...(legacy !== undefined ? { legacy: { state: legacyUnknown } } : {}),
  };
  return { manifest, localSettings, diagnostics, conflicts };
}
