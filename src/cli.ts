import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { createInterface } from 'node:readline/promises';
import { applyInstall, doctor, formatPlan, planInstall, readManifest, recordedHosts, recoverInstall } from './install-v1.js';
import { detectLegacy, formatLegacyPlan, migrateLegacy, planLegacy, recoverLegacy } from './legacy-07.js';
import { applyRollback, formatRollback, planRollback } from './rollback.js';
import { detectHost, HOST_LABELS, HOSTS, parseHosts, type Host } from './payload.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

interface InstallOptions {
  harness?: string;
  yes?: boolean;
  plan?: boolean;
  json?: boolean;
  migrate?: boolean;
  keepCustom?: boolean;
  archiveCustom?: boolean;
  recover?: boolean;
}

const interactive = () => Boolean(process.stdin.isTTY && process.stdout.isTTY);

async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try { return (await rl.question(question)).trim(); } finally { rl.close(); }
}

async function confirm(question: string): Promise<boolean> {
  return /^y(es)?$/i.test(await ask(`${question} [y/N] `));
}

function out(json: boolean | undefined, value: unknown, text: string): void {
  console.log(json ? JSON.stringify(value, null, 2) : text);
}

/** Hosts: --harness, else the recorded choice, else ask (defaulting to the host running this CLI). */
async function chooseHosts(root: string, opts: InstallOptions, fallback?: Host[]): Promise<Host[]> {
  if (opts.harness) return parseHosts(opts.harness);
  const recorded = recordedHosts(root) ?? fallback;
  if (recorded?.length) return recorded;
  const detected = detectHost();
  const suggestion = detected ?? 'claude';
  if (!interactive() || opts.yes) return [suggestion];
  console.log(`Hosts: ${HOSTS.map((host) => `${host} (${HOST_LABELS[host]})`).join(', ')}`);
  const answer = await ask(`Install for which hosts? [${suggestion}] `);
  return answer ? parseHosts(answer) : [suggestion];
}

/** Without --yes: a terminal is asked; anything else gets the plan and exit 1, never a waiting prompt. */
async function approved(opts: InstallOptions, text: string, question: string): Promise<boolean> {
  if (opts.yes) return true;
  console.log(text);
  if (!interactive()) {
    console.log('\nNothing changed. Re-run with --yes to apply.');
    process.exitCode = 1;
    return false;
  }
  if (await confirm(question)) return true;
  console.log('Nothing changed.');
  return false;
}

async function install(dir: string, opts: InstallOptions, mode: 'init' | 'update'): Promise<void> {
  const root = resolve(dir);
  if (opts.recover) {
    const migrated = recoverLegacy(root);
    const result = migrated ? null : recoverInstall(root);
    out(opts.json, { recovered: migrated ? 'migration' : result?.restored || result?.deleted ? 'update' : null },
      migrated ? 'Recovered the interrupted migration; the project is as it was before.' : result && (result.restored || result.deleted)
        ? `Recovered the interrupted update (${result.restored} restored, ${result.deleted} removed).` : 'Nothing to recover.');
    return;
  }

  const legacy = detectLegacy(root);
  if (legacy) {
    const hosts = opts.harness ? parseHosts(opts.harness) : legacy.hosts;
    const plan = planLegacy(root, hosts);
    if (opts.plan || !opts.migrate) {
      out(opts.json, { legacy: plan.legacy, archive: plan.archive, customized: plan.customized, kept: plan.kept, settings: plan.settings, install: plan.install.actions },
        formatLegacyPlan(plan, !opts.migrate));
      if (!opts.migrate) process.exitCode = 1;
      return;
    }
    let keep: string[] = [];
    if (plan.customized.length) {
      if (opts.keepCustom) keep = plan.customized;
      else if (!opts.archiveCustom) {
        if (!interactive()) {
          console.log(formatLegacyPlan(plan, false));
          console.log('\nNothing changed. Add --keep-custom or --archive-custom to decide the customized files.');
          process.exitCode = 1;
          return;
        }
        for (const path of plan.customized) if (/^k/i.test(await ask(`Customized ${path}: keep it in place or archive it? [k/A] `))) keep.push(path);
      }
    }
    if (!(await approved(opts, formatLegacyPlan(plan, false), 'Migrate to Joycraft 1.0?'))) return;
    const result = migrateLegacy(plan, { keep });
    out(opts.json, result, [
      `Migrated to Joycraft ${plan.install.to.joycraft}. ${result.archived.length} 0.7 file(s) archived in ${result.backup}/.`,
      ...(result.keptCustom.length ? [`Kept in place: ${result.keptCustom.join(', ')}`] : []),
      `Undo with: npx joycraft@latest rollback`,
    ].join('\n'));
    return;
  }

  const installed = readManifest(root);
  if (mode === 'update' && !installed) {
    console.log('Joycraft is not installed here. Install it with: npx joycraft@latest init');
    process.exitCode = 1;
    return;
  }
  const hosts = await chooseHosts(root, opts);
  const plan = planInstall(root, hosts);
  if (opts.plan) { out(opts.json, plan, formatPlan(plan)); return; }
  if (!plan.actions.some((action) => action.kind !== 'conflict') && !plan.gitignore.length) {
    out(opts.json, { status: 'noop', exitCode: 0, version: plan.to.joycraft, hosts, plan }, `Joycraft ${plan.to.joycraft} is up to date for ${hosts.join(', ')}.`);
    return;
  }
  if (!(await approved(opts, formatPlan(plan), installed ? 'Update Joycraft?' : 'Install Joycraft?'))) return;
  const result = applyInstall(plan);
  out(opts.json, { status: 'applied', exitCode: 0, version: plan.to.joycraft, hosts, ...result }, [
    `${installed ? 'Updated' : 'Installed'} Joycraft ${plan.to.joycraft} for ${hosts.join(', ')}: ${result.written.length} written, ${result.removed.length} removed.`,
    ...(result.backup ? [`Previous files are in ${result.backup}/.`] : []),
    ...result.conflicts.map((path) => `Kept your file (not installed): ${path}`),
    ...(installed ? [] : ['Next: open your coding agent here and say what you want to build. Joycraft sets up the rest.']),
  ].join('\n'));
}

const program = new Command();

program
  .name('joycraft')
  .description('Install and update Joycraft in a project')
  .version(pkg.version, '-v, --version');

const installCommand = (name: 'init' | 'update', description: string) => program
  .command(name)
  .description(description)
  .argument('[dir]', 'Project directory', '.')
  .option('--harness <list>', `Hosts to install for (${HOSTS.join(', ')}), comma or space separated`)
  .option('--yes', 'Apply without asking')
  .option('--plan', 'Show what would change and exit; writes nothing')
  .option('--json', 'Print machine-readable output')
  .option('--migrate', 'Migrate a Joycraft 0.7 install to 1.0')
  .option('--keep-custom', 'Migration: keep customized 0.7 files in place')
  .option('--archive-custom', 'Migration: archive customized 0.7 files with the rest')
  .option('--recover', 'Undo an interrupted update or migration')
  .action(async (dir: string, opts: InstallOptions) => {
    try { await install(dir, opts, name); }
    catch (error) { console.error(`Error: ${(error as Error).message}`); process.exitCode = 1; }
  });

installCommand('init', 'Install Joycraft into a project');
installCommand('update', 'Update Joycraft, or migrate a 0.7 install with --migrate');

program
  .command('rollback')
  .description('Undo a 0.7 → 1.0 migration from its backup')
  .argument('[backup]', 'Backup folder name or timestamp (default: the latest migration)')
  .option('--dir <dir>', 'Project directory', '.')
  .option('--yes', 'Apply the rollback')
  .option('--force', 'Also remove 1.0 files edited after the migration')
  .action((backup: string | undefined, opts: { dir: string; yes?: boolean; force?: boolean }) => {
    try {
      const plan = planRollback(opts.dir, backup, { force: opts.force });
      console.log(formatRollback(plan));
      if (!opts.yes) { console.log('\nNothing changed. Re-run with --yes to roll back.'); return; }
      applyRollback(plan);
      console.log('Rolled back.');
    } catch (error) { console.error(`Error: ${(error as Error).message}`); process.exitCode = 1; }
  });

program
  .command('doctor')
  .description('Check the Joycraft install against its manifest')
  .argument('[dir]', 'Project directory', '.')
  .option('--json', 'Print machine-readable output')
  .action((dir: string, opts: { json?: boolean }) => {
    const result = doctor(dir);
    out(opts.json, result, !result.installed ? 'Joycraft is not installed here.'
      : [`Joycraft ${result.tag}: ${result.ok ? 'ok' : 'needs attention'}`, ...result.missing.map((path) => `  missing: ${path}`),
        ...result.edited.map((path) => `  edited: ${path}`)].join('\n'));
    if (!result.ok) process.exitCode = 1;
  });

if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(0);
}

program.parse();
