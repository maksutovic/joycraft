import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

import type { ExactRelease } from './release-resolver.js';

/** The descriptor shipped inside a Joycraft package. */
export interface ReleaseDescriptor {
  readonly schemaVersion: 1;
  readonly releaseVersion: string;
  readonly manifestSchemas: readonly number[];
  readonly autoSafeEligible: boolean;
}

/** Opaque proof that a release's exact tarball and descriptor were verified. */
export interface VerifiedReleaseArtifact {
  readonly release: ExactRelease;
  readonly descriptor: ReleaseDescriptor;
  /** A fresh byte snapshot is returned on each access. */
  readonly tarball: Readonly<Uint8Array>;
}

export type ReleaseTarballFetcher = (url: string, init?: RequestInit) => Promise<unknown>;

export interface FetchVerifiedReleaseArtifactOptions {
  fetchTarball?: ReleaseTarballFetcher;
  timeoutMs?: number;
  maxBytes?: number;
}

const MAX_COMPRESSED_BYTES = 32 * 1024 * 1024;
const MAX_ARCHIVE_BYTES = 64 * 1024 * 1024;
const MAX_ENTRY_BYTES = 8 * 1024 * 1024;
const MAX_ENTRIES = 10_000;
const EXACT_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const PACKAGE_NAME = /^(?:@[a-z0-9._~-]+\/)?[a-z0-9._~-]+$/i;
const SHA512_INTEGRITY = /^sha512-([A-Za-z0-9+/]+={0,2})$/;

const verifiedArtifacts = new WeakSet<object>();

function objectRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

function parseJson(data: unknown, label: string): unknown {
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { throw new Error(`${label} is not valid JSON.`); }
  }
  if (data instanceof Uint8Array) {
    try { return JSON.parse(Buffer.from(data).toString('utf8')); } catch { throw new Error(`${label} is not valid JSON.`); }
  }
  return data;
}

function assertExactVersion(version: unknown, label = 'Release version'): asserts version is string {
  if (typeof version !== 'string' || !EXACT_VERSION.test(version)) throw new Error(`${label} must be an exact semver.`);
}

function assertIntegrity(integrity: unknown): asserts integrity is string {
  if (typeof integrity !== 'string') throw new Error('Release integrity must be a canonical sha512 SRI value.');
  const match = SHA512_INTEGRITY.exec(integrity);
  if (!match || Buffer.from(match[1], 'base64').length !== 64 || Buffer.from(match[1], 'base64').toString('base64') !== match[1]) {
    throw new Error('Release integrity must be a canonical sha512 SRI value.');
  }
}

function cloneRelease(release: ExactRelease): ExactRelease {
  objectRecord(release, 'Release');
  if (typeof release.packageName !== 'string' || !PACKAGE_NAME.test(release.packageName)) throw new Error('Release package name is invalid.');
  assertExactVersion(release.version);
  assertIntegrity(release.integrity);
  if (typeof release.tarballUrl !== 'string') throw new Error('Release tarball URL is invalid.');
  let parsed: URL;
  try { parsed = new URL(release.tarballUrl); } catch { throw new Error('Release tarball URL is invalid.'); }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:' || parsed.username || parsed.password) throw new Error('Release tarball URL is invalid.');
  return Object.freeze({
    packageName: release.packageName,
    version: release.version,
    integrity: release.integrity,
    tarballUrl: release.tarballUrl,
  });
}

/** Parse and validate the reviewed descriptor for one exact package version. */
export function parseReleaseDescriptor(data: unknown, exactVersion: string): ReleaseDescriptor {
  assertExactVersion(exactVersion, 'Exact version');
  const value = objectRecord(parseJson(data, 'Release descriptor'), 'Release descriptor');
  if (value.schemaVersion !== 1) throw new Error('Release descriptor schema is unsupported.');
  if (value.releaseVersion !== exactVersion) throw new Error('Release descriptor version does not match the exact release.');
  const manifestSchemas = value.manifestSchemas;
  if (!Array.isArray(manifestSchemas) || manifestSchemas.length < 1 || !manifestSchemas.every((schema) => Number.isSafeInteger(schema) && schema >= 1) || new Set(manifestSchemas).size !== manifestSchemas.length || !manifestSchemas.includes(1)) {
    throw new Error('Release descriptor manifestSchemas must include supported schema 1.');
  }
  if (typeof value.autoSafeEligible !== 'boolean') throw new Error('Release descriptor autoSafeEligible must be boolean.');
  const schemas = Object.freeze([...manifestSchemas] as number[]);
  return Object.freeze({ schemaVersion: 1 as const, releaseVersion: exactVersion, manifestSchemas: schemas, autoSafeEligible: value.autoSafeEligible });
}

function textField(header: Buffer, start: number, length: number): string {
  const raw = header.subarray(start, start + length);
  const nul = raw.indexOf(0);
  const end = nul < 0 ? raw.length : nul;
  return raw.subarray(0, end).toString('utf8');
}

function octalField(header: Buffer, start: number, length: number, label: string): number {
  const value = textField(header, start, length).trim();
  if (value === '' || !/^[0-7]+$/.test(value)) throw new Error(`Archive ${label} is invalid.`);
  const parsed = Number.parseInt(value, 8);
  if (!Number.isSafeInteger(parsed)) throw new Error(`Archive ${label} is too large.`);
  return parsed;
}

function validateArchivePath(name: string, directory: boolean): string {
  if (!name || name.includes('\\') || name.startsWith('/') || name.includes('\0')) throw new Error(`Archive path '${name}' is unsafe.`);
  const normalized = directory && name.endsWith('/') ? name.slice(0, -1) : name;
  const parts = normalized.split('/');
  if (parts.some((part) => part === '' || part === '.' || part === '..')) throw new Error(`Archive path '${name}' is unsafe.`);
  return normalized;
}

function parseTarEntries(gzipBytes: Uint8Array): Map<string, Buffer> {
  if (gzipBytes.byteLength > MAX_COMPRESSED_BYTES) throw new Error('Release artifact is too large.');
  let archive: Buffer;
  try { archive = gunzipSync(Buffer.from(gzipBytes), { maxOutputLength: MAX_ARCHIVE_BYTES }); } catch (error) {
    throw new Error(`Release artifact gzip is invalid or too large: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (archive.length > MAX_ARCHIVE_BYTES) throw new Error('Release artifact archive is too large.');
  const entries = new Map<string, Buffer>();
  let offset = 0;
  let sawEnd = false;
  let count = 0;
  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) {
      if (offset + 1024 > archive.length || !archive.subarray(offset).every((byte) => byte === 0)) throw new Error('Archive has an incomplete end marker or trailing data.');
      sawEnd = true;
      break;
    }
    count += 1;
    if (count > MAX_ENTRIES) throw new Error('Release artifact has too many archive entries.');
    const providedChecksum = octalField(header, 148, 8, 'checksum');
    let calculatedChecksum = 0;
    for (let index = 0; index < 512; index += 1) calculatedChecksum += index >= 148 && index < 156 ? 0x20 : header[index];
    if (providedChecksum !== calculatedChecksum) throw new Error('Archive header checksum is invalid.');
    const name = textField(header, 0, 100);
    const prefix = textField(header, 345, 155);
    const fullName = prefix ? `${prefix}/${name}` : name;
    const type = header[156] === 0 ? '0' : String.fromCharCode(header[156]);
    const mode = octalField(header, 100, 8, 'mode');
    if ((mode & 0o170000) === 0o120000) throw new Error(`Archive contains symlink metadata for '${fullName}'.`);
    if (type !== '0' && type !== '5') throw new Error(`Archive contains unsupported or unsafe entry '${fullName}'.`);
    const normalizedName = validateArchivePath(fullName, type === '5');
    if (entries.has(normalizedName)) throw new Error(`Archive contains duplicate entry '${normalizedName}'.`);
    const size = octalField(header, 124, 12, 'entry size');
    if (type === '5' && size !== 0) throw new Error(`Archive directory '${fullName}' has invalid content.`);
    if (size > MAX_ENTRY_BYTES) throw new Error(`Archive entry '${fullName}' is too large.`);
    const dataStart = offset + 512;
    const dataEnd = dataStart + size;
    const next = dataStart + Math.ceil(size / 512) * 512;
    if (dataEnd > archive.length || next > archive.length) throw new Error(`Archive entry '${fullName}' is truncated.`);
    entries.set(normalizedName, Buffer.from(archive.subarray(dataStart, dataEnd)));
    offset = next;
  }
  if (!sawEnd) throw new Error('Archive is missing its end marker.');
  return entries;
}

function extractPackageMetadata(bytes: Uint8Array, release: ExactRelease): { packageJson: Record<string, unknown>; descriptor: ReleaseDescriptor } {
  const entries = parseTarEntries(bytes);
  const packageBytes = entries.get('package/package.json');
  if (!packageBytes) throw new Error('Release artifact is missing package/package.json.');
  const descriptorBytes = entries.get('package/dist/joycraft-release.json');
  if (!descriptorBytes) throw new Error('Release artifact is missing package/dist/joycraft-release.json.');
  const packageJson = objectRecord(parseJson(packageBytes, 'Package metadata'), 'Package metadata');
  if (packageJson.name !== release.packageName || packageJson.version !== release.version) throw new Error('Package metadata name/version does not match the exact release.');
  const descriptor = parseReleaseDescriptor(descriptorBytes, release.version);
  if (descriptor.releaseVersion !== packageJson.version) throw new Error('Release descriptor version does not match package metadata.');
  return { packageJson: Object.freeze({ ...packageJson }), descriptor };
}

class VerifiedReleaseArtifactImpl implements VerifiedReleaseArtifact {
  readonly release: ExactRelease;
  readonly descriptor: ReleaseDescriptor;
  #bytes: Buffer;

  constructor(release: ExactRelease, descriptor: ReleaseDescriptor, bytes: Uint8Array) {
    this.release = release;
    this.descriptor = descriptor;
    this.#bytes = Buffer.from(bytes);
    verifiedArtifacts.add(this);
    Object.freeze(this);
  }

  get tarball(): Readonly<Uint8Array> {
    return new Uint8Array(this.#bytes);
  }
}

/** Verify an exact artifact's outer digest, package identity, and descriptor. */
export function verifyReleaseArtifact(release: ExactRelease, tarball: Uint8Array): VerifiedReleaseArtifact {
  const exactRelease = cloneRelease(release);
  if (!(tarball instanceof Uint8Array) || tarball.byteLength === 0) throw new Error('Release artifact bytes are required.');
  const actual = createHash('sha512').update(Buffer.from(tarball)).digest('base64');
  if (`sha512-${actual}` !== exactRelease.integrity) throw new Error('Release artifact integrity does not match exact registry metadata.');
  const { descriptor } = extractPackageMetadata(tarball, exactRelease);
  return new VerifiedReleaseArtifactImpl(exactRelease, descriptor, tarball);
}

/** Check the verifier-issued proof without trusting a caller-supplied boolean. */
export function isVerifiedReleaseArtifact(value: unknown): value is VerifiedReleaseArtifact {
  return typeof value === 'object' && value !== null && verifiedArtifacts.has(value);
}

async function responseBytes(value: unknown, maxBytes: number): Promise<Uint8Array> {
  if (value instanceof Uint8Array) {
    if (value.byteLength > maxBytes) throw new Error('Release tarball exceeds the download limit.');
    return Buffer.from(value);
  }
  if (value instanceof ArrayBuffer) {
    if (value.byteLength > maxBytes) throw new Error('Release tarball exceeds the download limit.');
    return new Uint8Array(value);
  }
  const response = value as { ok?: boolean; status?: number; arrayBuffer?: () => Promise<ArrayBuffer>; body?: ReadableStream<Uint8Array> };
  if (response?.ok === false) throw new Error(`Release tarball request failed with HTTP ${String(response.status ?? 'unknown')}.`);
  if (response?.body?.getReader) {
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        const chunk = result.value;
        total += chunk.byteLength;
        if (total > maxBytes) throw new Error('Release tarball exceeds the download limit.');
        chunks.push(chunk);
      }
    } finally { reader.releaseLock(); }
    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  }
  if (typeof response?.arrayBuffer === 'function') {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) throw new Error('Release tarball exceeds the download limit.');
    return bytes;
  }
  throw new Error('Release tarball response did not contain bytes.');
}

/** Download one exact tarball and return it only after local artifact verification. */
export async function fetchVerifiedReleaseArtifact(
  release: ExactRelease,
  options: FetchVerifiedReleaseArtifactOptions = {},
): Promise<VerifiedReleaseArtifact> {
  const maxBytes = options.maxBytes ?? MAX_COMPRESSED_BYTES;
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || maxBytes > MAX_COMPRESSED_BYTES) throw new Error('Artifact download limit is invalid.');
  const timeoutMs = options.timeoutMs ?? 3_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new Error('Artifact download timeout is invalid.');
  const exactRelease = cloneRelease(release);
  const fetchTarball = options.fetchTarball ?? (async (url: string, init?: RequestInit) => fetch(url, init));
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Release tarball download timed out.'));
    }, timeoutMs);
  });
  const operation = (async () => {
    const response = await fetchTarball(exactRelease.tarballUrl, { signal: controller.signal });
    return responseBytes(response, maxBytes);
  })();
  // A custom fetch seam may ignore AbortSignal, so the deadline also covers
  // response body consumption instead of relying on fetch cancellation alone.
  void operation.catch(() => undefined);
  try {
    const bytes = await Promise.race([operation, deadline]);
    return verifyReleaseArtifact(exactRelease, bytes);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    controller.abort();
  }
}
