import { describe, it, expect, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { upgrade } from '../src/upgrade';
import { init } from '../src/init';
import { readVersion, writeVersion, hashContent } from '../src/version';
import { SKILLS, TEMPLATES, CODEX_SKILLS } from '../src/bundled-files';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_VERSION = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')).version;

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

  it('auto-adds new files without prompting', async () => {
    await init(tmpDir, { force: false });

    // Remove a template file to simulate it being new in a future version
    const templatePath = join(tmpDir, 'docs', 'templates', 'context', 'production-map.md');
    rmSync(templatePath);

    const versionInfo = readVersion(tmpDir)!;
    delete versionInfo.files[join('docs', 'templates', 'context', 'production-map.md')];
    writeVersion(tmpDir, versionInfo.version, versionInfo.files);

    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));
    try {
      // No --yes flag — new files should still be auto-added
      await upgrade(tmpDir, { yes: false });
    } finally {
      console.log = origLog;
    }

    expect(existsSync(templatePath)).toBe(true);
    expect(logs.some(l => l.includes('added 1 new'))).toBe(true);
  });

  it('adds new files that did not exist before with --yes', async () => {
    await init(tmpDir, { force: false });

    // Remove a template file to simulate it being new in a future version
    const templatePath = join(tmpDir, 'docs', 'templates', 'context', 'production-map.md');
    rmSync(templatePath);

    // Also remove it from the version hashes
    const versionInfo = readVersion(tmpDir)!;
    delete versionInfo.files[join('docs', 'templates', 'context', 'production-map.md')];
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

  it('removes deprecated skill directories during upgrade', async () => {
    await init(tmpDir, { force: false });

    // Simulate old skill directories that should be cleaned up
    const deprecatedSkills = ['tune', 'joy', 'joysmith', 'joysmith-assess', 'joysmith-upgrade', 'tune-assess', 'tune-upgrade', 'interview', 'new-feature', 'decompose', 'session-end'];
    for (const name of deprecatedSkills) {
      const dir = join(tmpDir, '.claude', 'skills', name);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'SKILL.md'), `old ${name} skill`, 'utf-8');
    }

    // Also create a flat .md file (pre-directory format)
    writeFileSync(join(tmpDir, '.claude', 'skills', 'joysmith.md'), 'flat file', 'utf-8');

    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));
    try {
      await upgrade(tmpDir, { yes: true });
    } finally {
      console.log = origLog;
    }

    // All deprecated directories should be removed
    for (const name of deprecatedSkills) {
      expect(existsSync(join(tmpDir, '.claude', 'skills', name))).toBe(false);
    }
    // Flat file should be removed
    expect(existsSync(join(tmpDir, '.claude', 'skills', 'joysmith.md'))).toBe(false);

    // Current skills should still exist
    expect(existsSync(join(tmpDir, '.claude', 'skills', 'joycraft-tune', 'SKILL.md'))).toBe(true);

    // Should report what was cleaned up
    expect(logs.some(l => l.includes('Removed') && l.includes('deprecated'))).toBe(true);
  });

  it('does not remove non-joycraft skill directories during upgrade', async () => {
    await init(tmpDir, { force: false });

    // Create a user's custom skill
    const customDir = join(tmpDir, '.claude', 'skills', 'my-custom-skill');
    mkdirSync(customDir, { recursive: true });
    writeFileSync(join(customDir, 'SKILL.md'), 'my custom skill', 'utf-8');

    await upgrade(tmpDir, { yes: true });

    // Custom skill should be untouched
    expect(existsSync(join(customDir, 'SKILL.md'))).toBe(true);
    expect(readFileSync(join(customDir, 'SKILL.md'), 'utf-8')).toBe('my custom skill');
  });

  it('installs Codex skills in .agents/skills/ after upgrade', async () => {
    await init(tmpDir, { force: false });

    // Verify that .agents/skills/ files exist after init + upgrade
    await upgrade(tmpDir, { yes: true });

    for (const name of Object.keys(CODEX_SKILLS)) {
      const skillName = name.replace(/\.md$/, '');
      const skillPath = join(tmpDir, '.agents', 'skills', skillName, 'SKILL.md');
      expect(existsSync(skillPath)).toBe(true);
      expect(readFileSync(skillPath, 'utf-8')).toBe(CODEX_SKILLS[name]);
    }
  });

  it('auto-adds new Codex skills not in old project', async () => {
    await init(tmpDir, { force: false });

    // Remove a Codex skill to simulate it being new in a future version
    const firstSkillName = Object.keys(CODEX_SKILLS)[0].replace(/\.md$/, '');
    const codexSkillPath = join(tmpDir, '.agents', 'skills', firstSkillName, 'SKILL.md');
    const codexSkillRelPath = join('.agents', 'skills', firstSkillName, 'SKILL.md');
    rmSync(join(tmpDir, '.agents', 'skills', firstSkillName), { recursive: true, force: true });

    // Remove from version hashes
    const versionInfo = readVersion(tmpDir)!;
    delete versionInfo.files[codexSkillRelPath];
    writeVersion(tmpDir, versionInfo.version, versionInfo.files);

    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));
    try {
      await upgrade(tmpDir, { yes: false });
    } finally {
      console.log = origLog;
    }

    // New Codex skill should be auto-installed without prompting
    expect(existsSync(codexSkillPath)).toBe(true);
    expect(logs.some(l => l.includes('added') && l.includes('new'))).toBe(true);
  });

  it('includes .agents/skills/ hashes in .joycraft-version after upgrade', async () => {
    await init(tmpDir, { force: false });

    // Simulate old version to trigger an upgrade
    const versionInfo = readVersion(tmpDir)!;
    const firstSkillName = Object.keys(CODEX_SKILLS)[0].replace(/\.md$/, '');
    const codexSkillRelPath = join('.agents', 'skills', firstSkillName, 'SKILL.md');
    const oldContent = 'old codex content';
    writeFileSync(join(tmpDir, codexSkillRelPath), oldContent, 'utf-8');
    versionInfo.files[codexSkillRelPath] = hashContent(oldContent);
    writeVersion(tmpDir, '0.0.1', versionInfo.files);

    await upgrade(tmpDir, { yes: true });

    const newVersion = readVersion(tmpDir)!;
    // Check that .agents/skills/ paths have hashes
    const agentsPaths = Object.keys(newVersion.files).filter(p => p.startsWith(join('.agents', 'skills')));
    expect(agentsPaths.length).toBeGreaterThan(0);
    // Verify the hash matches the current file content
    const currentContent = readFileSync(join(tmpDir, codexSkillRelPath), 'utf-8');
    expect(newVersion.files[codexSkillRelPath]).toBe(hashContent(currentContent));
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
    expect(newVersion.version).toBe(PKG_VERSION);
    // The hash should now match the current file content
    const currentContent = readFileSync(join(tmpDir, skillRelPath), 'utf-8');
    expect(newVersion.files[skillRelPath]).toBe(hashContent(currentContent));
  });

  describe('forced migration (flat → per-feature)', () => {
    it('detects flat layout and migrates briefs/research/designs', async () => {
      await init(tmpDir, { force: false });
      // Pre-create flat layout artifacts
      mkdirSync(join(tmpDir, 'docs', 'briefs'), { recursive: true });
      writeFileSync(join(tmpDir, 'docs', 'briefs', '2026-04-01-foo.md'), '# foo brief', 'utf-8');
      mkdirSync(join(tmpDir, 'docs', 'research'), { recursive: true });
      writeFileSync(join(tmpDir, 'docs', 'research', '2026-04-01-foo.md'), '# foo research', 'utf-8');

      await upgrade(tmpDir, { yes: true });

      expect(existsSync(join(tmpDir, 'docs', 'features', '2026-04-01-foo', 'brief.md'))).toBe(true);
      expect(existsSync(join(tmpDir, 'docs', 'features', '2026-04-01-foo', 'research.md'))).toBe(true);
      expect(existsSync(join(tmpDir, 'docs', 'briefs', '2026-04-01-foo.md'))).toBe(false);
    });

    it('does not prompt and does not hang (forced)', async () => {
      await init(tmpDir, { force: false });
      mkdirSync(join(tmpDir, 'docs', 'briefs'), { recursive: true });
      writeFileSync(join(tmpDir, 'docs', 'briefs', 'foo.md'), '# foo', 'utf-8');

      // Run upgrade with yes:false — migration should still happen without prompting
      await upgrade(tmpDir, { yes: false });

      expect(existsSync(join(tmpDir, 'docs', 'features', 'foo', 'brief.md'))).toBe(true);
    });

    it('prints a summary of moves before applying', async () => {
      await init(tmpDir, { force: false });
      mkdirSync(join(tmpDir, 'docs', 'briefs'), { recursive: true });
      writeFileSync(join(tmpDir, 'docs', 'briefs', 'foo.md'), '# foo', 'utf-8');

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (...args: unknown[]) => logs.push(args.join(' '));
      try {
        await upgrade(tmpDir, { yes: true });
      } finally {
        console.log = origLog;
      }

      const all = logs.join('\n');
      expect(all).toContain('docs/briefs/foo.md');
      expect(all).toContain('docs/features/foo/brief.md');
    });

    it('lists orphan spec dirs in the summary', async () => {
      await init(tmpDir, { force: false });
      mkdirSync(join(tmpDir, 'docs', 'specs', 'random-bugfix'), { recursive: true });
      writeFileSync(join(tmpDir, 'docs', 'specs', 'random-bugfix', 'foo.md'), '# spec', 'utf-8');

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (...args: unknown[]) => logs.push(args.join(' '));
      try {
        await upgrade(tmpDir, { yes: true });
      } finally {
        console.log = origLog;
      }

      const all = logs.join('\n');
      expect(all).toContain('random-bugfix');
      expect(all.toLowerCase()).toContain('left in place');
    });

    it('banner mentions README and git status after applying', async () => {
      await init(tmpDir, { force: false });
      mkdirSync(join(tmpDir, 'docs', 'briefs'), { recursive: true });
      writeFileSync(join(tmpDir, 'docs', 'briefs', 'foo.md'), '# foo', 'utf-8');

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (...args: unknown[]) => logs.push(args.join(' '));
      try {
        await upgrade(tmpDir, { yes: true });
      } finally {
        console.log = origLog;
      }

      const all = logs.join('\n');
      expect(all.toLowerCase()).toContain('readme');
      expect(all).toContain('git status');
    });

    it('is silent when no flat layout is present', async () => {
      await init(tmpDir, { force: false });

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (...args: unknown[]) => logs.push(args.join(' '));
      try {
        await upgrade(tmpDir, { yes: true });
      } finally {
        console.log = origLog;
      }

      const all = logs.join('\n');
      expect(all.toLowerCase()).not.toContain('migration');
      expect(all).not.toContain('docs/features/');
    });
  });

  it('upgrade refreshes the version stamp from a stale 0.1.0', async () => {
    await init(tmpDir, { force: false });

    // Manually overwrite the version stamp to look like an older install
    const versionInfo = readVersion(tmpDir)!;
    writeVersion(tmpDir, '0.1.0', versionInfo.files);

    // Force a content change so upgrade does work
    const skillRelPath = join('.claude', 'skills', 'joycraft-tune', 'SKILL.md');
    const stale = readVersion(tmpDir)!;
    const oldContent = 'old content';
    writeFileSync(join(tmpDir, skillRelPath), oldContent, 'utf-8');
    stale.files[skillRelPath] = hashContent(oldContent);
    writeVersion(tmpDir, '0.1.0', stale.files);

    await upgrade(tmpDir, { yes: true });

    const after = readVersion(tmpDir)!;
    expect(after.version).toBe(PKG_VERSION);
    if (PKG_VERSION !== '0.1.0') {
      expect(after.version).not.toBe('0.1.0');
    }
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
