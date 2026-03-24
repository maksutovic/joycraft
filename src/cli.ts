import { Command } from 'commander';

const program = new Command();

program
  .name('joycraft')
  .description('Scaffold and upgrade AI development harnesses')
  .version('0.1.0');

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

program.parse();
