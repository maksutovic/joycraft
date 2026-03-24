import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const VERSION_FILE = '.joysmith-version';

export interface VersionInfo {
  version: string;
  files: Record<string, string>;
}

export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export function readVersion(dir: string): VersionInfo | null {
  const filePath = join(dir, VERSION_FILE);
  if (!existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (typeof parsed.version === 'string' && typeof parsed.files === 'object') {
      return parsed as VersionInfo;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeVersion(dir: string, version: string, files: Record<string, string>): void {
  const filePath = join(dir, VERSION_FILE);
  const data: VersionInfo = { version, files };
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}
