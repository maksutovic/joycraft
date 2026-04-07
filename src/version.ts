import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const VERSION_FILE = '.joycraft-version';

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

/**
 * Detect the current Joycraft harness level for a project directory.
 * Returns 5 if Level 5 artifacts (autofix workflow + External Validation) are present, 4 otherwise.
 */
export function getLevel(dir: string): number {
  const hasAutofix = existsSync(join(dir, '.github', 'workflows', 'autofix.yml'));
  if (!hasAutofix) return 4;
  const claudeMdPath = join(dir, 'CLAUDE.md');
  if (!existsSync(claudeMdPath)) return 4;
  const content = readFileSync(claudeMdPath, 'utf-8');
  return content.includes('## External Validation') ? 5 : 4;
}
