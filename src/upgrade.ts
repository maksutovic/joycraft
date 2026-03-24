import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { readVersion, writeVersion, hashContent } from './version.js';
import { SKILLS, TEMPLATES } from './bundled-files.js';

export interface UpgradeOptions {
  yes: boolean;
}

interface FileChange {
  relativePath: string;
  absolutePath: string;
  newContent: string;
  kind: 'new' | 'updated' | 'customized';
}

function getManagedFiles(): Record<string, string> {
  const files: Record<string, string> = {};
  for (const [name, content] of Object.entries(SKILLS)) {
    files[join('.claude', 'skills', name)] = content;
  }
  for (const [name, content] of Object.entries(TEMPLATES)) {
    files[join('docs', 'templates', name)] = content;
  }
  return files;
}

function countLines(content: string): number {
  return content.split('\n').length;
}

async function askUser(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

export async function upgrade(dir: string, opts: UpgradeOptions): Promise<void> {
  const targetDir = resolve(dir);

  // Check if project was initialized
  const versionInfo = readVersion(targetDir);
  const hasSkill = existsSync(join(targetDir, '.claude', 'skills', 'joysmith.md'));

  if (!versionInfo && !hasSkill) {
    console.log('This project has not been initialized with Joysmith.');
    console.log('Run `npx joysmith init` first.');
    return;
  }

  // Get current package version
  const pkgVersion = getPackageVersion();

  // If version matches exactly, check if any file content actually changed
  const managedFiles = getManagedFiles();
  const installedHashes = versionInfo?.files ?? {};

  const changes: FileChange[] = [];
  let upToDate = 0;

  for (const [relPath, newContent] of Object.entries(managedFiles)) {
    const absPath = join(targetDir, relPath);
    const newHash = hashContent(newContent);

    if (!existsSync(absPath)) {
      // File doesn't exist locally — new file
      changes.push({ relativePath: relPath, absolutePath: absPath, newContent, kind: 'new' });
      continue;
    }

    const currentContent = readFileSync(absPath, 'utf-8');
    const currentHash = hashContent(currentContent);

    if (currentHash === newHash) {
      // Already matches the latest version
      upToDate++;
      continue;
    }

    const originalHash = installedHashes[relPath];

    if (originalHash && currentHash === originalHash) {
      // User hasn't modified the file — safe to auto-update
      changes.push({ relativePath: relPath, absolutePath: absPath, newContent, kind: 'updated' });
    } else {
      // User has customized this file (or no original hash recorded)
      changes.push({ relativePath: relPath, absolutePath: absPath, newContent, kind: 'customized' });
    }
  }

  if (changes.length === 0) {
    console.log('Already up to date.');
    return;
  }

  // Process changes
  let updated = 0;
  let skipped = 0;
  let added = 0;

  for (const change of changes) {
    if (change.kind === 'new') {
      const label = `New file: ${change.relativePath}`;
      const accept = opts.yes || await askUser(`${label} — add it?`);
      if (accept) {
        mkdirSync(dirname(change.absolutePath), { recursive: true });
        writeFileSync(change.absolutePath, change.newContent, 'utf-8');
        added++;
        if (!opts.yes) console.log(`  + ${change.relativePath}`);
      } else {
        skipped++;
      }
    } else if (change.kind === 'updated') {
      // Safe to auto-update — user hasn't touched the file
      writeFileSync(change.absolutePath, change.newContent, 'utf-8');
      updated++;
    } else if (change.kind === 'customized') {
      const currentContent = readFileSync(change.absolutePath, 'utf-8');
      const currentLines = countLines(currentContent);
      const newLines = countLines(change.newContent);
      const diff = newLines - currentLines;
      const diffLabel = diff > 0 ? `+${diff} lines` : diff < 0 ? `${diff} lines` : 'same length';
      const label = `Customized: ${change.relativePath} (local: ${currentLines} lines, latest: ${newLines} lines, ${diffLabel})`;

      if (opts.yes) {
        writeFileSync(change.absolutePath, change.newContent, 'utf-8');
        updated++;
      } else {
        const accept = await askUser(`${label} — overwrite with latest?`);
        if (accept) {
          writeFileSync(change.absolutePath, change.newContent, 'utf-8');
          updated++;
        } else {
          skipped++;
        }
      }
    }
  }

  // Write new version file with updated hashes
  const newHashes: Record<string, string> = {};
  for (const [relPath, content] of Object.entries(managedFiles)) {
    const absPath = join(targetDir, relPath);
    if (existsSync(absPath)) {
      const current = readFileSync(absPath, 'utf-8');
      newHashes[relPath] = hashContent(current);
    }
  }
  writeVersion(targetDir, pkgVersion, newHashes);

  // Print summary
  const parts: string[] = [];
  if (updated > 0) parts.push(`Updated ${updated}`);
  if (skipped > 0) parts.push(`skipped ${skipped} (customized)`);
  if (added > 0) parts.push(`added ${added} new`);
  if (upToDate > 0) parts.push(`${upToDate} already up to date`);
  console.log(`\nUpgrade complete: ${parts.join(', ')}.`);
}

function getPackageVersion(): string {
  try {
    // In bundled CLI, __dirname won't help — use a hardcoded fallback
    // The version is set in package.json and read at build time
    return '0.1.0';
  } catch {
    return '0.0.0';
  }
}
