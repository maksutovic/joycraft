import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const payload = join(__dirname, '..', 'payload', '.joycraft');
const runtime = join(payload, 'runtime', 'config.mjs');
const template = join(payload, 'templates', 'joycraft.yaml');
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

function fixture(yaml?: string) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-config-tests-')));
  dirs.push(root);
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root });
  if (yaml !== undefined) put(join(root, 'joycraft.yaml'), yaml);
  return root;
}
const run = (root: string) => spawnSync(process.execPath, [runtime, '--root', root], { encoding: 'utf8' });

describe('joycraft.yaml tests section', () => {
  it('[AC:spec-2-1] reads focused, gate and gateRuns from the tests section', () => {
    // The YAML subset has no flow maps, so the spec's `tests: { ... }` is written as a block.
    const root = fixture('tests:\n  focused: "pnpm test {files}"\n  gate: "pnpm verify"\n  gateRuns: wave\n');
    const result = run(root);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).tests).toEqual({ focused: 'pnpm test {files}', gate: 'pnpm verify', gateRuns: 'wave' });
  });

  it('[AC:spec-2-2] a project with no joycraft.yaml reads the default tests settings', () => {
    const result = run(fixture());
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).tests).toEqual({ gateRuns: 'spec' });
  });

  it('[AC:spec-2-3] an unknown key, an empty command or a bad gateRuns names its tests setting and stops', () => {
    for (const [yaml, key] of [['tests:\n  slow: pnpm slow\n', 'tests.slow'], ['tests:\n  gate: ""\n', 'tests.gate'], ['tests:\n  gateRuns: daily\n', 'tests.gateRuns']]) {
      const result = run(fixture(yaml));
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(key);
    }
  });

  it('[AC:spec-2-4] the template parses to the defaults and documents the four keys, commented out', async () => {
    const { parseYaml, readConfig, defaults } = await import(runtime);
    const body = readFileSync(template, 'utf8');
    expect(parseYaml(body).tests).toBeUndefined();
    const root = fixture(body);
    const { source, ...config } = readConfig(root);
    expect(source).toBe('joycraft.yaml');
    expect(config).toEqual(JSON.parse(JSON.stringify(defaults)));
    expect(body).toContain('# tests:');
    for (const key of ['focused', 'gate', 'full', 'gateRuns']) expect(body).toMatch(new RegExp(`^#\\s+${key}:`, 'm'));
    expect(body.slice(body.indexOf('# tests:'))).not.toMatch(/\d+\s*(s|seconds|cores)\b/);
  });
});
