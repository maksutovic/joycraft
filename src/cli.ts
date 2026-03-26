import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

const program = new Command();

program
  .name('joycraft')
  .description('Scaffold and upgrade AI development harnesses')
  .version(pkg.version, '-v, --version');

program
  .command('init')
  .description('Scaffold the Joycraft harness into the current project')
  .argument('[dir]', 'Target directory', '.')
  .option('--force', 'Overwrite existing files')
  .action(async (dir: string, opts: { force?: boolean }) => {
    const { init } = await import('./init.js');
    await init(dir, { force: opts.force ?? false });
  });

program
  .command('upgrade')
  .description('Upgrade installed Joycraft templates and skills to latest')
  .argument('[dir]', 'Target directory', '.')
  .option('--yes', 'Auto-accept all updates')
  .action(async (dir: string, opts: { yes?: boolean }) => {
    const { upgrade } = await import('./upgrade.js');
    await upgrade(dir, { yes: opts.yes ?? false });
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
      const { readFileSync } = await import('node:fs');
      const { join } = await import('node:path');
      const data = JSON.parse(readFileSync(join(process.cwd(), '.joycraft-version'), 'utf-8'));
      const res = await fetch('https://registry.npmjs.org/joycraft/latest', { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const latest = ((await res.json()) as { version: string }).version;
        if (data.version !== latest) {
          console.log(`Joycraft ${latest} available (you have ${data.version}). Run: npx joycraft upgrade`);
        }
      }
    } catch {
      // Silent — don't block session start
    }
  });

// Start update check immediately so it runs in parallel with the command
const updateCheckPromise = (async (): Promise<string | null> => {
  try {
    const res = await fetch('https://registry.npmjs.org/joycraft/latest', {
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const latest = ((await res.json()) as { version: string }).version;
      if (latest !== pkg.version) {
        return `\nJoycraft ${latest} available (you have ${pkg.version}). Run: npm install -g joycraft`;
      }
    }
  } catch {
    // Silent — don't block or error on network issues
  }
  return null;
})();

// Print update nudge after every command
program.hook('postAction', async () => {
  const message = await updateCheckPromise;
  if (message) {
    console.log(message);
  }
});

// Show help when no arguments provided
if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(0);
}

program.parse();
