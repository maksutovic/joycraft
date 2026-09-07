import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { build } from 'tsup';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

import {
  CHECK_CACHE_TTL_MS,
  CHECK_DEFAULT_DEADLINE_MS,
  CHECK_SETTINGS_PATH,
  acknowledgeUpdate,
  postponeUpdate,
  readUpdatePolicy,
} from '../src/update-check';
import { validatePromotionCredential } from '../scripts/release-promotion.mjs';
import { DEFAULT_CACHE_MODES, MIN_FRESHNESS_MS } from '../scripts/release-verification.mjs';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path: string) => readFileSync(join(repo, path), 'utf8');
const userDocs = () => `${read('README.md')}\n${read('docs/guides/upgrading.md')}`;
let cli: string;
let fixture: string;

beforeAll(async () => {
  fixture = mkdtempSync(join(tmpdir(), 'joycraft-update-docs-'));
  copyFileSync(join(repo, 'package.json'), join(fixture, 'package.json'));
  symlinkSync(join(repo, 'node_modules'), join(fixture, 'node_modules'), 'junction');
  mkdirSync(join(fixture, 'dist'), { recursive: true });
  await build({
    entry: { cli: join(repo, 'src/cli.ts') },
    outDir: join(fixture, 'dist'),
    format: ['esm'],
    outExtension: () => ({ js: '.mjs' }),
    config: false,
    silent: true,
    dts: false,
  });
  cli = join(fixture, 'dist/cli.mjs');
}, 30_000);

afterAll(() => {
  if (fixture) rmSync(fixture, { recursive: true, force: true });
});

function cliHelp(command: string): string {
  return execFileSync(process.execPath, [cli, command, '--help'], {
    cwd: fixture,
    encoding: 'utf8',
  });
}

describe('reliable update documentation contract', () => {
  it('documents the one install/update path and only the public recovery flags', () => {
    const docs = userDocs();
    const help = cliHelp('update');
    const rootHelp = execFileSync(process.execPath, [cli, '--help'], { cwd: fixture, encoding: 'utf8' });

    expect(docs).toContain('npx joycraft@latest update');
    expect(docs).toContain('npm --prefer-online exec --yes -- joycraft@latest update');
    expect(docs).toMatch(/fresh.*interactive.*harness|interactive.*fresh.*harness/is);
    expect(docs).toMatch(/CI[\s\S]{0,180}--harnesses/);
    expect(docs).toContain('--preview');
    expect(docs).toContain('--replace-customized');
    expect(docs).toContain('--repair');
    expect(docs).toContain('--recover');
    expect(docs).toContain('--rollback');
    expect(docs).toMatch(/init.*upgrade.*alias|aliases?.*init.*upgrade/i);
    expect(docs).toMatch(/--yes[\s\S]{0,180}(preserve|custom)/i);
    expect(docs).toMatch(/exit code[\s\S]{0,240}0[\s\S]{0,240}1[\s\S]{0,240}2[\s\S]{0,240}3/i);
    expect(help).toContain('--preview');
    expect(help).toContain('--replace-customized');
    expect(help).toContain('--repair');
    expect(help).toContain('--recover');
    expect(help).toContain('--rollback');
    expect(rootHelp).toMatch(/update[\s\S]*init[\s\S]*upgrade/);
  });

  it('documents local policy, cache, notification, and reload behavior from the helpers', () => {
    const docs = userDocs();
    expect(CHECK_CACHE_TTL_MS).toBe(24 * 60 * 60 * 1000);
    expect(CHECK_DEFAULT_DEADLINE_MS).toBeLessThan(5_000);
    expect(CHECK_SETTINGS_PATH).toBe('docs/.joycraft/local/settings.json');
    expect(typeof readUpdatePolicy).toBe('function');
    expect(typeof acknowledgeUpdate).toBe('function');
    expect(typeof postponeUpdate).toBe('function');
    expect(docs).toMatch(/docs\/\.joycraft\/local/);
    expect(docs).toMatch(/notify[\s\S]{0,140}auto-safe[\s\S]{0,140}off/i);
    expect(docs).toMatch(/24 hours?|24-hour|24h/i);
    expect(docs).toMatch(/offline[\s\S]{0,180}(quiet|continue|unknown)/i);
    expect(docs).toMatch(/acknowledg[\s\S]{0,160}conversation|conversation[\s\S]{0,160}acknowledg/i);
    expect(docs).toMatch(/postpon[\s\S]{0,160}(separate|different|release)/i);
    expect(docs).toMatch(/auto-safe[\s\S]{0,220}(local|opt-in)[\s\S]{0,220}(descriptor|verified|gate)/i);
    expect(docs).toMatch(/reinvoke|restart/i);
    expect(docs).toMatch(/old installations?[\s\S]{0,220}(bridge|manual)/i);
    expect(docs).toMatch(/migration[\s\S]{0,100}separate/i);
  });

  it('documents the maintainer credential boundary and recovery for its real expiry diagnostic', () => {
    const docs = read('docs/guides/releasing.md');
    const requiredChecks = JSON.parse(read('.github/release-required-checks.json')) as { requiredChecks: string[] };
    const diagnostic = (() => {
      try {
        validatePromotionCredential({
          env: {
            JOYCRAFT_NPM_PROMOTION_TOKEN: 'fixture-secret',
            JOYCRAFT_NPM_PROMOTION_TOKEN_EXPIRES_AT: '2020-01-01T00:00:00Z',
          },
          now: () => new Date('2026-01-01T00:00:00Z'),
        });
        return '';
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    })();
    expect(diagnostic).toMatch(/JOYCRAFT_NPM_PROMOTION_TOKEN is expired; candidate promotion is blocked/);
    expect(docs).toContain('JOYCRAFT_NPM_PROMOTION_TOKEN');
    expect(docs).toContain('JOYCRAFT_NPM_PROMOTION_TOKEN_EXPIRES_AT');
    expect(requiredChecks.requiredChecks).toHaveLength(196);
    expect(DEFAULT_CACHE_MODES).toEqual(['cold', 'warmed-full', 'warmed-compact']);
    expect(MIN_FRESHNESS_MS).toBe(300_000);
    expect(docs).toContain('196 checks');
    expect(docs).toContain('warmed-full');
    expect(docs).toContain('warmed-compact');
    expect(docs).toContain('300000');
    expect(docs).toMatch(/maintainer[\s\S]{0,180}(create|own|renew|rotate)/i);
    expect(docs).toMatch(/scoped[\s\S]{0,100}(write|package)/i);
    expect(docs).toMatch(/expired[\s\S]{0,220}(renew|rotate|rerun|retry)/i);
    expect(docs).toMatch(/candidate[\s\S]{0,220}(verify|readiness|promotion)/i);
    expect(docs).toMatch(/same.*tarball|retained.*tarball/i);
    expect(docs).not.toContain('fixture-secret');
  });

  it('keeps linked public guides aligned with the unified updater and explicit migrations', () => {
    const setup = read('docs/guides/setup-walkthrough.md');
    const tracking = read('docs/guides/git-tracking.md');
    const migration = read('docs/guides/migration-per-feature-layout.md');
    const contributing = read('CONTRIBUTING.md');

    expect(setup).toContain('npx joycraft@latest update');
    expect(setup).toContain('docs/.joycraft/manifest.json');
    expect(setup).toContain('docs/.joycraft/local/');
    expect(setup).toMatch(/preserv(?:es|ing) customized files/i);
    expect(tracking).toContain('docs/.joycraft/manifest.json');
    expect(tracking).toContain('docs/.joycraft/local/manifest.json');
    expect(tracking).toContain('npx joycraft@latest update --gitignore=private');
    expect(tracking).toMatch(/--force[\s\S]{0,140}(only by|init alias|scoped)/i);
    expect(migration).toContain('npx joycraft@latest migrate --apply');
    expect(migration).toContain('--replace-collision');
    expect(migration).toMatch(/routine `update`\/?`upgrade` runs do not move/i);
    expect(contributing).toContain('update.ts');
    expect(contributing).toContain('project-relative version and installation-state paths');
    expect(contributing).not.toContain('pnpm test --run');
  });
});
