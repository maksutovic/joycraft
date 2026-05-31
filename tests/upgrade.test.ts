import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { upgrade } from '../src/upgrade';
import { init } from '../src/init';
import { readVersion, writeVersion, hashContent, STATE_PATH } from '../src/version';
import { SKILLS, TEMPLATES, CODEX_SKILLS } from '../src/bundled-files';

const LEGACY_VERSION_FILE = '.joycraft-version';

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

  it('warns and exits early when CLI is stale', async () => {
    await init(tmpDir, { force: false });

    // Mock fetch to return a newer version than the current CLI
    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: '999.0.0' }),
    }) as unknown as typeof fetch;

    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));
    try {
      await upgrade(tmpDir, { yes: false });
    } finally {
      console.log = origLog;
      globalThis.fetch = origFetch;
    }

    expect(logs.some(l => l.includes('Joycraft CLI is out of date'))).toBe(true);
    expect(logs.some(l => l.includes('npm install -g joycraft'))).toBe(true);
    expect(logs.some(l => l.includes('re-run: npx joycraft upgrade'))).toBe(true);
    expect(logs.some(l => l.includes('Already up to date'))).toBe(false);
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
    // Verify the hash matches the current file content (truncated, as stored)
    const currentContent = readFileSync(join(tmpDir, codexSkillRelPath), 'utf-8');
    expect(newVersion.files[codexSkillRelPath]).toBe(hashContent(currentContent).slice(0, 16));
  });

  it('writes updated state after upgrade', async () => {
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
    // The hash should now match the current file content (truncated, as stored)
    const currentContent = readFileSync(join(tmpDir, skillRelPath), 'utf-8');
    expect(newVersion.files[skillRelPath]).toBe(hashContent(currentContent).slice(0, 16));
  });

  describe('version-state relocation + migration', () => {
    it('init produces no root .joycraft-version and writes the hidden state', async () => {
      await init(tmpDir, { force: false });
      expect(existsSync(join(tmpDir, LEGACY_VERSION_FILE))).toBe(false);
      expect(existsSync(join(tmpDir, STATE_PATH))).toBe(true);
    });

    it('migrates a legacy root .joycraft-version to the hidden state and deletes the root file', async () => {
      await init(tmpDir, { force: false });

      // Simulate a project inited by an OLD Joycraft: state at the root, in the
      // legacy full-length-hash shape, and no hidden state present.
      const skillRelPath = join('.claude', 'skills', 'joycraft-tune', 'SKILL.md');
      const installedContent = readFileSync(join(tmpDir, skillRelPath), 'utf-8');
      const legacyState = {
        version: '0.1.0',
        files: { [skillRelPath]: hashContent(installedContent) }, // full 64-char
      };
      rmSync(join(tmpDir, STATE_PATH));
      writeFileSync(join(tmpDir, LEGACY_VERSION_FILE), JSON.stringify(legacyState, null, 2) + '\n', 'utf-8');

      await upgrade(tmpDir, { yes: true });

      // Root file gone, hidden state present.
      expect(existsSync(join(tmpDir, LEGACY_VERSION_FILE))).toBe(false);
      expect(existsSync(join(tmpDir, STATE_PATH))).toBe(true);
      // Gitignore now carries the state path.
      const gitignore = readFileSync(join(tmpDir, '.gitignore'), 'utf-8');
      expect(gitignore).toContain(STATE_PATH);
    });

    it('legacy migration is a silent no-op when no root file exists', async () => {
      await init(tmpDir, { force: false });
      // Fresh install: no legacy root file. Upgrade should not create one.
      await upgrade(tmpDir, { yes: true });
      expect(existsSync(join(tmpDir, LEGACY_VERSION_FILE))).toBe(false);
      expect(existsSync(join(tmpDir, STATE_PATH))).toBe(true);
    });

    it('3-way preserved: untouched file auto-updates silently (no prompt)', async () => {
      await init(tmpDir, { force: false });

      const skillRelPath = join('.claude', 'skills', 'joycraft-tune', 'SKILL.md');
      // The recorded-original reflects "old bundled content" and the on-disk file
      // is byte-identical to it (user has NOT touched it). New bundle differs.
      const oldContent = 'old bundled content — untouched by the user';
      writeFileSync(join(tmpDir, skillRelPath), oldContent, 'utf-8');
      const state = readVersion(tmpDir)!;
      state.files[skillRelPath] = hashContent(oldContent); // writeVersion truncates
      writeVersion(tmpDir, '0.0.1', state.files);

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (...args: unknown[]) => logs.push(args.join(' '));
      try {
        // No --yes: an untouched file must update WITHOUT any prompt.
        await upgrade(tmpDir, { yes: false });
      } finally {
        console.log = origLog;
      }

      // Auto-updated to the latest bundled content.
      expect(readFileSync(join(tmpDir, skillRelPath), 'utf-8')).toBe(SKILLS['joycraft-tune.md']);
      const all = logs.join('\n');
      expect(all).toContain('Updated');
      // It was NOT reported as customized.
      expect(all.toLowerCase()).not.toContain('customized');
    });

    it('3-way preserved: user-modified file is reported customized and prompts (declining keeps it)', async () => {
      await init(tmpDir, { force: false });

      const skillRelPath = join('.claude', 'skills', 'joycraft-tune', 'SKILL.md');
      const custom = 'MY HAND-EDITED SKILL';
      // On-disk content differs from the recorded-original (user customized it).
      writeFileSync(join(tmpDir, skillRelPath), custom, 'utf-8');
      const state = readVersion(tmpDir)!;
      state.files[skillRelPath] = hashContent('the pristine original bundled content');
      writeVersion(tmpDir, '0.0.1', state.files);

      // Drive the readline prompt at the stdin/stdout boundary so yes:false does
      // not hang. We capture the question written to stdout (the "Customized:"
      // label) and answer "n" via a fake stdin, exercising the decline branch.
      const asked: string[] = [];
      const origStdoutWrite = process.stdout.write.bind(process.stdout);
      (process.stdout as { write: unknown }).write = ((chunk: unknown, ...rest: unknown[]) => {
        if (typeof chunk === 'string' && chunk.includes('overwrite with latest?')) {
          asked.push(chunk);
        }
        return (origStdoutWrite as (...a: unknown[]) => boolean)(chunk, ...rest);
      }) as typeof process.stdout.write;

      // Fake stdin that yields a single "n" line, then ends.
      const { Readable } = await import('node:stream');
      const fakeStdin = Readable.from(['n\n']) as unknown as NodeJS.ReadStream & { isTTY?: boolean };
      const stdinDesc = Object.getOwnPropertyDescriptor(process, 'stdin')!;
      Object.defineProperty(process, 'stdin', { value: fakeStdin, configurable: true });

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (...args: unknown[]) => logs.push(args.join(' '));
      try {
        await upgrade(tmpDir, { yes: false });
      } finally {
        console.log = origLog;
        (process.stdout as { write: unknown }).write = origStdoutWrite;
        Object.defineProperty(process, 'stdin', stdinDesc);
      }

      // It prompted, and the prompt named the file as Customized.
      const askedAll = asked.join('\n');
      expect(askedAll).toContain('Customized:');
      expect(askedAll).toContain(skillRelPath);
      // Declined → the user's content is preserved (NOT silently overwritten).
      expect(readFileSync(join(tmpDir, skillRelPath), 'utf-8')).toBe(custom);
      // Summary reflects a skip.
      expect(logs.join('\n')).toContain('skipped');
    });
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

    it('migrates orphan (bugfix-area) spec dirs into docs/bugfixes/', async () => {
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
      expect(all).toMatch(/Migrating bugfix areas/i);
      expect(all.toLowerCase()).not.toContain('left in place');
      // The area was physically moved, not left behind.
      expect(existsSync(join(tmpDir, 'docs', 'bugfixes', 'random-bugfix', 'foo.md'))).toBe(true);
      expect(existsSync(join(tmpDir, 'docs', 'specs', 'random-bugfix'))).toBe(false);
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

  it('writes and reads version info at the hidden state path', () => {
    const files = { 'a.md': hashContent('hello') };
    writeVersion(tmpDir, '1.0.0', files);

    // State lives at the hidden nested path, not the repo root.
    expect(existsSync(join(tmpDir, STATE_PATH))).toBe(true);
    expect(existsSync(join(tmpDir, LEGACY_VERSION_FILE))).toBe(false);

    const info = readVersion(tmpDir);
    expect(info).not.toBeNull();
    expect(info!.version).toBe('1.0.0');
    // Stored truncated to 16 chars.
    expect(info!.files['a.md']).toBe(hashContent('hello').slice(0, 16));
  });

  it('hashContent produces consistent SHA-256 hashes', () => {
    const h1 = hashContent('test');
    const h2 = hashContent('test');
    const h3 = hashContent('different');
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).toHaveLength(64); // SHA-256 hex (full, pre-truncation)
  });
});
