import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, statSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { init } from '../src/init';
import { generateCLAUDEMd } from '../src/improve-claude-md';
import { STATE_PATH } from '../src/version';
import type { StackInfo } from '../src/detect';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const read = (p: string) => readFileSync(p, 'utf-8');

describe('wire-and-bundle (spec 9)', () => {
  describe('bundle contains the new skill + loop script', () => {
    it('SKILLS / CODEX_SKILLS / PI_SKILLS all carry joycraft-spec-done.md', async () => {
      const { SKILLS, CODEX_SKILLS, PI_SKILLS } = await import('../src/bundled-files');
      expect(SKILLS['joycraft-spec-done.md']).toBeDefined();
      expect(CODEX_SKILLS['joycraft-spec-done.md']).toBeDefined();
      expect(PI_SKILLS['joycraft-spec-done.md']).toBeDefined();
    });

    it('PI_SCRIPTS carries joycraft-implement-loop', async () => {
      const { PI_SCRIPTS } = await import('../src/bundled-files');
      expect(PI_SCRIPTS['joycraft-implement-loop']).toBeDefined();
      // And it's the loop driver (sanity on content).
      expect(PI_SCRIPTS['joycraft-implement-loop']).toMatch(/PI_BIN/);
    });

    it('the updated decompose/session-end/implement skills are bundled (new vocabulary)', async () => {
      const { SKILLS, PI_SCRIPTS } = await import('../src/bundled-files');
      expect(SKILLS['joycraft-decompose.md']).toMatch(/Execution Mode/i);
      expect(SKILLS['joycraft-session-end.md']).toMatch(/in-review/);
      expect(SKILLS['joycraft-implement.md']).toMatch(/checkpoint/);
      // Updated status scripts present.
      expect(PI_SCRIPTS['joycraft-mark-done']).toMatch(/--to/);
    });
  });

  describe('init installs the new files', () => {
    let tmp: string;
    afterEach(() => {
      if (tmp) rmSync(tmp, { recursive: true, force: true });
    });

    it('installs joycraft-spec-done SKILL.md across harness dirs and the loop script (executable)', async () => {
      tmp = mkdtempSync(join(tmpdir(), 'joycraft-wire-'));
      await init(tmp, { force: false });

      // Skill installed to all three harness layouts.
      expect(existsSync(join(tmp, '.claude', 'skills', 'joycraft-spec-done', 'SKILL.md'))).toBe(true);
      expect(existsSync(join(tmp, '.agents', 'skills', 'joycraft-spec-done', 'SKILL.md'))).toBe(true);
      expect(existsSync(join(tmp, '.pi', 'skills', 'joycraft-spec-done', 'SKILL.md'))).toBe(true);

      // Loop script installed + executable.
      const loop = join(tmp, '.pi', 'scripts', 'joycraft', 'joycraft-implement-loop');
      expect(existsSync(loop)).toBe(true);
      expect((statSync(loop).mode & 0o111) !== 0).toBe(true);
    });

    it('records the new files in the hidden state so upgrade can detect them', async () => {
      tmp = mkdtempSync(join(tmpdir(), 'joycraft-wire-'));
      await init(tmp, { force: false });
      const version = JSON.parse(read(join(tmp, STATE_PATH)));
      const keys = Object.keys(version.files);
      expect(keys).toContain(join('.pi', 'skills', 'joycraft-spec-done', 'SKILL.md'));
      expect(keys).toContain(join('.claude', 'skills', 'joycraft-spec-done', 'SKILL.md'));
      expect(keys).toContain(join('.pi', 'scripts', 'joycraft', 'joycraft-implement-loop'));
    });
  });

  describe('docs', () => {
    it('pi-scripts README documents --to, the loop, and the 3 status glyphs', () => {
      const readme = read(join(repoRoot, 'src', 'templates', 'pi-scripts', 'README.md'));
      expect(readme).toMatch(/--to/);
      expect(readme).toContain('joycraft-implement-loop');
      // The three glyphs from spec-status-lifecycle.
      expect(readme).toContain('[ ]');
      expect(readme).toContain('[~]');
      expect(readme).toContain('[✓]');
      // No stale vocabulary describing mark-done as active→complete.
      expect(readme).not.toMatch(/`active`\s*to\s*`complete`/);
    });

    it('generated CLAUDE.md documents the default-execution-mode field (spec 4 name)', () => {
      const stack: StackInfo = { language: 'unknown', packageManager: 'unknown', commands: {} };
      const md = generateCLAUDEMd('demo', stack);
      // The exact field name decompose greps for.
      expect(md).toContain('Default execution mode');
      // And it explains the three modes / default.
      expect(md.toLowerCase()).toMatch(/batch|checkpoint|isolated/);
    });
  });
});
