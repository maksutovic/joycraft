import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const CANONICAL = join(repoRoot, 'src', 'skills', 'joycraft-session-end.md');

const GENERATED = [
  join(repoRoot, 'src', 'claude-skills', 'joycraft-session-end.md'),
  join(repoRoot, 'src', 'codex-skills', 'joycraft-session-end.md'),
  join(repoRoot, 'src', 'pi-skills', 'joycraft-session-end.md'),
  join(repoRoot, 'src', 'copilot-skills', 'joycraft-session-end.md'),
];

const read = (p: string) => readFileSync(p, 'utf-8');
const label = (p: string) => p.split('/').slice(-2).join('/');
const content = () => read(CANONICAL);

describe('wire-session-end-telemetry: invocation step present', () => {
  it('invokes the scan via `npx joycraft telemetry`', () => {
    expect(content()).toMatch(/npx joycraft telemetry/);
  });

  it('names the step as a telemetry scan step', () => {
    expect(content().toLowerCase()).toMatch(/telemetry scan|read telemetry|scan read telemetry/);
  });

  it('sits at wrap-up: after discovery capture, at/before the commit step', () => {
    const c = content();
    const telemetryAt = c.indexOf('npx joycraft telemetry');
    const discoveriesAt = c.indexOf('## 1. Consolidate Discoveries');
    const commitAt = c.search(/^## \d+\w*\. Commit/m);
    expect(telemetryAt).toBeGreaterThan(discoveriesAt);
    expect(commitAt).toBeGreaterThan(-1);
    expect(telemetryAt).toBeLessThan(commitAt);
  });
});

describe('wire-session-end-telemetry: graceful skip', () => {
  it('states the unavailable/failure path notes and continues', () => {
    const c = content().toLowerCase();
    expect(c).toMatch(/unavailable or fails|unavailable, or fails|fails or is unavailable/);
    expect(c).toMatch(/continue/);
  });

  it('says the skip never blocks wrap-up', () => {
    expect(content().toLowerCase()).toMatch(/never block|do not block|don't block|not a failure|never a failure/);
  });

  it('names INACCESSIBLE as how optimize reports the gap', () => {
    const c = content();
    expect(c).toMatch(/INACCESSIBLE/);
    expect(c.toLowerCase()).toMatch(/optimize/);
  });
});

describe('wire-session-end-telemetry: no inline scan logic', () => {
  it('carries no transcript-parsing instructions', () => {
    const c = content();
    expect(c).not.toMatch(/\.jsonl/);
    expect(c).not.toMatch(/~\/\.claude\/projects/);
    expect(c.toLowerCase()).not.toMatch(/parse the transcript|transcript files|exec_command/);
  });

  it('references no literal absolute paths', () => {
    expect(content()).not.toMatch(/\/Users\/|\/home\//);
  });
});

describe('wire-session-end-telemetry: line budget paid for', () => {
  it('does not grow the over-budget skill beyond its prior 211 lines', () => {
    const lines = content().split('\n').length;
    expect(lines).toBeLessThanOrEqual(211);
  });
});

describe('wire-session-end-telemetry: variant parity', () => {
  for (const variant of GENERATED) {
    it(`${label(variant)} carries the telemetry invocation`, () => {
      const c = read(variant);
      expect(c).toMatch(/npx joycraft telemetry/);
      expect(c).toMatch(/INACCESSIBLE/);
    });
  }
});
