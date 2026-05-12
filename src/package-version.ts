import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getPackageVersion(): string {
  const pkgPath = join(__dirname, '..', 'package.json');
  const raw = readFileSync(pkgPath, 'utf-8');
  const pkg = JSON.parse(raw) as { version?: unknown };
  if (typeof pkg.version !== 'string' || pkg.version.length === 0) {
    throw new Error(`Joycraft package.json at ${pkgPath} is missing a version field`);
  }
  return pkg.version;
}
