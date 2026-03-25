import { describe, it, expect, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { upgrade } from '../src/upgrade';
import { init } from '../src/init';
import { readVersion, writeVersion, hashContent } from '../src/version';
import { SKILLS, TEMPLATES } from '../src/bundled-files';

function createTmpDir(): string {
  const dir = join(tmpdir(), `joycraft-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

describe('upgrade', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTmpDir();
    return () => cleanup(tmpDir);
  });

  it('shows error when project is not initialized', async () => {
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));
    try {
      await upgrade(tmpDir, { yes: false });
    } finally {
      console.log = origLog;
    }

    expect(logs.some(l => l.includes('not been initialized'))).toBe(true);
    expect(logs.some(l => l.includes('npx joycraft init'))).toBe(true);
  });

  it('reports already up to date when nothing changed', async () => {
    await init(tmpDir, { force: false });

    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));
    try {
      await upgrade(tmpDir, { yes: false });
    } finally {
      console.log = origLog;
    }

    expect(logs.some(l => l.includes('Already up to date'))).toBe(true);
  });

  it('updates files when bundled content differs from installed', async () => {
    await init(tmpDir, { force: false });

    // Simulate that the installed version had different content by changing the recorded hash
    const versionInfo = readVersion(tmpDir)!;
    const skillPath = join('.claude', 'skills', 'joycraft-tune', 'SKILL.md');
    // Write a different version of the file that matches the old hash (unmodified by user)
    const oldContent = 'old bundled content';
    writeFileSync(join(tmpDir, skillPath), oldContent, 'utf-8');
    versionInfo.files[skillPath] = hashContent(oldContent);
    writeVersion(tmpDir, '0.0.1', versionInfo.files);

    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));
    try {
      await upgrade(tmpDir, { yes: true });
    } finally {
      console.log = origLog;
    }

    // The file should now contain the latest bundled content
    const updated = readFileSync(join(tmpDir, skillPath), 'utf-8');
    expect(updated).toBe(SKILLS['joycraft-tune.md']);
    expect(logs.some(l => l.includes('Updated'))).toBe(true);
  });

  it('detects user-customized files and updates with --yes', async () => {
    await init(tmpDir, { force: false });

    // User customizes a skill file
    const skillPath = join(tmpDir, '.claude', 'skills', 'joycraft-tune', 'SKILL.md');
    writeFileSync(skillPath, 'my custom joy skill', 'utf-8');

    // Also change the bundled content by writing old hash (simulating a new version)
    const versionInfo = readVersion(tmpDir)!;
    // The recorded hash is the original bundled hash, but the file now has custom content
    // So the file hash won't match the recorded hash → detected as customized

    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));
    try {
      await upgrade(tmpDir, { yes: true });
    } finally {
      console.log = origLog;
    }

    // With --yes, customized files get overwritten
    const content = readFileSync(skillPath, 'utf-8');
    // The file should remain the same since the bundled content matches the original hash
    // Actually: current file hash != recorded hash (user customized), AND current file hash != new bundled hash
    // So it will be categorized as "customized" — but with --yes it gets overwritten
    // Wait — if the bundled content hasn't changed, current hash == new hash means up-to-date
    // Let me reconsider: the bundled content IS the same as what was installed,
    // but the user changed the file. So currentHash != newHash → it's a change.
    // And currentHash != originalHash → it's user-customized.
    // With --yes, it gets overwritten with the bundled content.
    expect(content).toBe(SKILLS['joycraft-tune.md']);
  });

  it('adds new files that did not exist before with --yes', async () => {
    await init(tmpDir, { force: false });

    // Remove a template file to simulate it being new in a future version
    const templatePath = join(tmpDir, 'docs', 'templates', 'BOUNDARY_FRAMEWORK.md');
    rmSync(templatePath);

    // Also remove it from the version hashes
    const versionInfo = readVersion(tmpDir)!;
    delete versionInfo.files[join('docs', 'templates', 'BOUNDARY_FRAMEWORK.md')];
    writeVersion(tmpDir, versionInfo.version, versionInfo.files);

    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));
    try {
      await upgrade(tmpDir, { yes: true });
    } finally {
      console.log = origLog;
    }

    expect(existsSync(templatePath)).toBe(true);
    expect(logs.some(l => l.includes('added 1 new'))).toBe(true);
  });

  it('writes updated .joycraft-version after upgrade', async () => {
    await init(tmpDir, { force: false });

    // Simulate old version
    const versionInfo = readVersion(tmpDir)!;
    const skillRelPath = join('.claude', 'skills', 'joycraft-tune', 'SKILL.md');
    const oldContent = 'old content';
    writeFileSync(join(tmpDir, skillRelPath), oldContent, 'utf-8');
    versionInfo.files[skillRelPath] = hashContent(oldContent);
    writeVersion(tmpDir, '0.0.1', versionInfo.files);

    await upgrade(tmpDir, { yes: true });

    const newVersion = readVersion(tmpDir)!;
    expect(newVersion.version).toBe('0.1.0');
    // The hash should now match the current file content
    const currentContent = readFileSync(join(tmpDir, skillRelPath), 'utf-8');
    expect(newVersion.files[skillRelPath]).toBe(hashContent(currentContent));
  });
});

describe('version', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTmpDir();
    return () => cleanup(tmpDir);
  });

  it('returns null when no version file exists', () => {
    expect(readVersion(tmpDir)).toBeNull();
  });

  it('writes and reads version info', () => {
    const files = { 'a.md': hashContent('hello') };
    writeVersion(tmpDir, '1.0.0', files);

    const info = readVersion(tmpDir);
    expect(info).not.toBeNull();
    expect(info!.version).toBe('1.0.0');
    expect(info!.files['a.md']).toBe(hashContent('hello'));
  });

  it('hashContent produces consistent SHA-256 hashes', () => {
    const h1 = hashContent('test');
    const h2 = hashContent('test');
    const h3 = hashContent('different');
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).toHaveLength(64); // SHA-256 hex
  });
});
