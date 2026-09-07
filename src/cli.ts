import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PRIVATE_DIRS_DISPLAY } from './gitignore.js';
import { applyMigration, formatMigrationPlan, formatMigrationOutcome, runMigration } from './migration.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

const GITIGNORE_OPTION_DESC = `Gitignore profile: 'shared' (commit skills) or 'private' (gitignore ${PRIVATE_DIRS_DISPLAY})`;

const program = new Command();

program
  .name('joycraft')
  .description('Scaffold and upgrade AI development harnesses')
  .version(pkg.version, '-v, --version');

program
  .command('update')
  .description('Safely install or update Joycraft in a project')
  .argument('[dir]', 'Target directory', '.')
  .option('--harnesses <list>', 'Harnesses to install (comma or space separated)')
  .option('--yes', 'Apply safe updates without prompting')
  .option('--non-interactive', 'Never prompt; apply safe actions only')
  .option('--replace-customized <paths...>', 'Explicitly replace these customized paths')
  .option('--gitignore <profile>', GITIGNORE_OPTION_DESC)
  .option('--json', 'Print a structured JSON outcome')
  .option('--recover', 'Recover the interrupted update transaction')
  .option('--rollback', 'Rollback the last successful update')
  .action(async (dir: string, opts: {
    harnesses?: string;
    yes?: boolean;
    nonInteractive?: boolean;
    replaceCustomized?: string[];
    gitignore?: string;
    json?: boolean;
    recover?: boolean;
    rollback?: boolean;
  }) => {
    const { update, formatUpdateOutcome } = await import('./update.js');
    try {
      const result = await update(dir, {
        harnesses: opts.harnesses,
        yes: opts.yes ?? false,
        nonInteractive: opts.nonInteractive ?? false,
        replaceCustomized: opts.replaceCustomized,
        gitignore: opts.gitignore,
        recovery: opts.recover ? 'recover' : opts.rollback ? 'rollback' : undefined,
      });
      console.log(formatUpdateOutcome(result, opts.json === true));
      process.exitCode = result.exitCode;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (opts.json) console.log(JSON.stringify({ status: 'failed', exitCode: 1, applied: [], preserved: [], conflicts: [], diagnostics: [message] }));
      else console.error(message);
      process.exitCode = 1;
    }
  });

program
  .command('init')
  .description('Scaffold the Joycraft harness into the current project')
  .argument('[dir]', 'Target directory', '.')
  .option('--force', 'Overwrite existing files')
  .option('--harnesses <list>', 'Harnesses to install (comma or space separated)')
  .option('--yes', 'Apply safe updates without prompting')
  .option('--non-interactive', 'Never prompt; apply safe actions only')
  .option('--replace-customized <paths...>', 'Explicitly replace these customized paths')
  .option('--gitignore <profile>', GITIGNORE_OPTION_DESC)
  .option('--json', 'Print a structured JSON outcome')
  .action(async (dir: string, opts: { force?: boolean; harnesses?: string; yes?: boolean; nonInteractive?: boolean; replaceCustomized?: string[]; gitignore?: string; json?: boolean }) => {
    const { init, formatInitOutcome } = await import('./init.js');
    try {
      const result = await init(dir, {
        force: opts.force ?? false,
        harnesses: opts.harnesses,
        yes: opts.yes ?? false,
        nonInteractive: opts.nonInteractive ?? false,
        replaceCustomized: opts.replaceCustomized,
        gitignore: opts.gitignore,
        json: opts.json,
      });
      if (result) {
        console.log(formatInitOutcome(result, opts.json === true));
        if (!opts.json && opts.harnesses === undefined && process.stdin.isTTY !== true) console.log('  Compatibility: init selected all harnesses for this non-interactive run.');
      }
      if (result) process.exitCode = result.exitCode;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (opts.json) console.log(JSON.stringify({ status: 'failed', exitCode: 1, applied: [], preserved: [], conflicts: [], diagnostics: [message] }));
      else console.error(message);
      process.exitCode = 1;
    }
  });

program
  .command('upgrade')
  .description('Upgrade installed Joycraft templates and skills to latest')
  .argument('[dir]', 'Target directory', '.')
  .option('--yes', 'Apply safe updates and preserve customizations without prompting')
  .option('--non-interactive', 'Never prompt; apply safe actions only')
  .option('--harnesses <list>', 'Harnesses to update (comma or space separated)')
  .option('--replace-customized <paths...>', 'Explicitly replace these customized paths')
  .option('--gitignore <profile>', GITIGNORE_OPTION_DESC)
  .option('--json', 'Print a structured JSON outcome')
  .action(async (dir: string, opts: { yes?: boolean; nonInteractive?: boolean; harnesses?: string; replaceCustomized?: string[]; gitignore?: string; json?: boolean }) => {
    const { upgrade } = await import('./upgrade.js');
    try {
      const result = await upgrade(dir, { yes: opts.yes ?? false, nonInteractive: opts.nonInteractive ?? false, harnesses: opts.harnesses, replaceCustomized: opts.replaceCustomized, gitignore: opts.gitignore, json: opts.json });
      if (!opts.json) {
        const { formatUpdateOutcome } = await import('./update.js');
        console.log(formatUpdateOutcome(result, false));
      } else {
        const { formatUpdateOutcome } = await import('./update.js');
        console.log(formatUpdateOutcome(result, true));
      }
      process.exitCode = result.exitCode;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (opts.json) console.log(JSON.stringify({ status: 'failed', exitCode: 1, applied: [], preserved: [], conflicts: [], diagnostics: [message] }));
      else console.error(message);
      process.exitCode = 1;
    }
  });

program
  .command('migrate')
  .description('Preview or explicitly apply the flat-docs to per-feature migration')
  .argument('[dir]', 'Target directory', '.')
  .option('--apply', 'Apply the displayed migration plan')
  .option('--replace-collision <paths...>', 'Replace these existing destination paths explicitly')
  .option('--include-unknown <paths...>', 'Explicitly establish ownership for orphan spec directories')
  .option('--json', 'Print a structured JSON outcome')
  .action((dir: string, opts: { apply?: boolean; replaceCollision?: string[]; includeUnknown?: string[]; json?: boolean }) => {
    try {
      const preview = runMigration(dir, { dryRun: true, includeUnknown: opts.includeUnknown });
      if (!opts.apply) {
        if (opts.json) console.log(JSON.stringify({ status: 'preview', exitCode: 0, plan: preview.plan }));
        else console.log(formatMigrationPlan(preview.plan));
        return;
      }
      // Render the same plan that will be applied.
      if (!opts.json) console.log(formatMigrationPlan(preview.plan));
      const applied = applyMigration(preview.plan, { replaceCollisions: opts.replaceCollision });
      const result = { ...applied, plan: preview.plan };
      console.log(formatMigrationOutcome(result, opts.json === true, false));
      process.exitCode = result.status === 'complete' ? 0 : 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (opts.json) console.log(JSON.stringify({ status: 'incomplete', exitCode: 1, applied: 0, skipped: 0, replaced: [], preserved: [], errors: [message] }));
      else console.error(message);
      process.exitCode = 1;
    }
  });

program
  .command('telemetry')
  .description('Scan AI-harness transcripts into knowledge-layer read telemetry')
  .argument('[dir]', 'Target directory', '.')
  .action(async (dir: string) => {
    const { runTelemetryScan, formatTelemetrySummary } = await import('./telemetry-store.js');
    const { resolve } = await import('node:path');
    try {
      const result = await runTelemetryScan(resolve(dir));
      console.log(formatTelemetrySummary(result));
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command('init-autofix')
  .description('Set up the Level 5 auto-fix loop with holdout scenarios')
  .argument('[dir]', 'Target directory', '.')
  .option('--scenarios-repo <name>', 'Name for scenarios repo')
  .option('--app-id <id>', 'GitHub App ID for Joycraft Autofix')
  .option('--force', 'Overwrite existing workflow files')
  .option('--dry-run', 'Show what would be created without creating it')
  .action(async (dir: string, opts: { scenariosRepo?: string; appId?: string; force?: boolean; dryRun?: boolean }) => {
    const { initAutofix } = await import('./init-autofix.js');
    await initAutofix(dir, opts);
  });

program
  .command('check-version')
  .description('Check if a newer version of Joycraft is available')
  .action(async () => {
    try {
      const { readFileSync, existsSync } = await import('node:fs');
      const { join } = await import('node:path');
      const { STATE_PATH, LEGACY_VERSION_FILE, LEGACY_CLAUDE_STATE_PATH } = await import('./version.js');
      // Prefer the current state; fall back through the legacy locations for
      // projects not yet upgraded (upgrade relocates them): the interim
      // .claude/.joycraft/state.json, then the original repo-root file.
      const candidates = [STATE_PATH, LEGACY_CLAUDE_STATE_PATH, LEGACY_VERSION_FILE];
      const statePath =
        candidates.map((p) => join(process.cwd(), p)).find((p) => existsSync(p)) ??
        join(process.cwd(), STATE_PATH);
      const data = JSON.parse(readFileSync(statePath, 'utf-8'));
      const res = await fetch('https://registry.npmjs.org/joycraft/latest', { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const latest = ((await res.json()) as { version: string }).version;
        if (data.version !== latest) {
          console.log(`Joycraft ${latest} available (you have ${data.version}). Run: npx joycraft@latest upgrade`);
        }
      }
    } catch {
      // Silent — don't block session start
    }
  });

// Show help when no arguments provided
if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(0);
}

program.parse();
