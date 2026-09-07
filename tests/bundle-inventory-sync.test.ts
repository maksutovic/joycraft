import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const harnesses = [
  { generated: 'claude-skills', installed: ['.claude', 'skills'] },
  { generated: 'codex-skills', installed: ['.agents', 'skills'] },
  { generated: 'pi-skills', installed: ['.pi', 'skills'] },
  { generated: 'copilot-skills', installed: ['.github', 'skills'] },
  { generated: 'omp-skills', installed: ['.omp', 'skills'] },
] as const;

function makeFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'joycraft-bundle-sync-'));
  mkdirSync(join(root, 'scripts', 'lib'), { recursive: true });
  mkdirSync(join(root, 'src', 'skills'), { recursive: true });
  mkdirSync(join(root, 'src', 'templates', 'pi-scripts'), { recursive: true });
  mkdirSync(join(root, 'src', 'templates', 'pi-extensions'), { recursive: true });
  mkdirSync(join(root, 'src', 'templates', 'pi-agents'), { recursive: true });
  mkdirSync(join(root, 'src', 'local-skills'), { recursive: true });

  for (const file of [
    'scripts/generate-bundled-files.mjs',
    'scripts/sync-skills.mjs',
    'scripts/lib/skill-template.mjs',
  ]) {
    const destination = join(root, file);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(repoRoot, file), destination);
  }

  writeFileSync(
    join(root, 'src', 'skills', 'joycraft-sync-probe.md'),
    [
      '---',
      'name: joycraft-sync-probe',
      'description: sync regression fixture',
      'instructions: 1',
      '---',
      '',
      'revision: ONE',
      'skills: {{skills_dir}}',
      'invoke: {{skill_prefix}}sync-probe',
      '',
    ].join('\n'),
  );
  return root;
}

function runPipeline(root: string): void {
  execFileSync(process.execPath, ['scripts/generate-bundled-files.mjs'], { cwd: root });
  execFileSync(process.execPath, ['scripts/sync-skills.mjs'], { cwd: root });
}

function readOutputs(root: string): Record<string, string> {
  const outputs: Record<string, string> = {
    bundle: readFileSync(join(root, 'src', 'bundled-files.ts'), 'utf8'),
  };
  for (const { generated, installed } of harnesses) {
    outputs[generated] = readFileSync(
      join(root, 'src', generated, 'joycraft-sync-probe.md'),
      'utf8',
    );
    const installedPath = join(root, ...installed, 'joycraft-sync-probe', 'SKILL.md');
    expect(existsSync(installedPath), installedPath).toBe(true);
    outputs[`${generated}:installed`] = readFileSync(installedPath, 'utf8');
  }
  return outputs;
}

describe('canonical skill generation and installation synchronization', () => {
  it('refreshes every harness variant, bundled copy, and installed copy from a source edit', () => {
    const root = makeFixture();
    try {
      runPipeline(root);
      const first = readOutputs(root);

      for (const { generated } of harnesses) {
        expect(first[generated]).toContain('revision: ONE');
        expect(first[`${generated}:installed`]).toBe(first[generated]);
      }
      expect(first.bundle).toContain('revision: ONE');

      const canonicalPath = join(root, 'src', 'skills', 'joycraft-sync-probe.md');
      writeFileSync(canonicalPath, readFileSync(canonicalPath, 'utf8').replace('revision: ONE', 'revision: TWO'));
      runPipeline(root);
      const second = readOutputs(root);

      for (const { generated } of harnesses) {
        expect(second[generated]).toContain('revision: TWO');
        expect(second[generated]).not.toContain('revision: ONE');
        expect(second[`${generated}:installed`]).toBe(second[generated]);
      }
      expect(second.bundle).toContain('revision: TWO');
      expect(second.bundle).not.toContain('revision: ONE');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
