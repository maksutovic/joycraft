import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, resolve, basename, dirname } from 'node:path';
import { TEMPLATES } from './bundled-files.js';

export interface InitAutofixOptions {
  scenariosRepo?: string;
  appId?: string;
  force?: boolean;
  dryRun?: boolean;
}

interface AutofixResult {
  created: string[];
  skipped: string[];
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Replace literal placeholders in content.
 * Replaces $KEY but intentionally leaves ${{ ... }} GitHub Actions expressions untouched —
 * the simple string replace of "$KEY" won't match "${{" since "${{" != "$" + "KEY".
 */
function replacePlaceholders(content: string, vars: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    // Only replace literal $KEY, not ${{ expressions }}
    // Use a regex that matches $KEY but not ${{
    result = result.replaceAll('$' + key, value);
  }
  return result;
}

export async function initAutofix(dir: string, opts: InitAutofixOptions): Promise<void> {
  const targetDir = resolve(dir);

  // Check project is initialized
  if (!existsSync(join(targetDir, '.joycraft-version'))) {
    throw new Error('Project is not initialized. Run `npx joycraft init` first.');
  }

  const force = opts.force ?? false;
  const dryRun = opts.dryRun ?? false;

  // Determine placeholder values
  const scenariosRepo = opts.scenariosRepo ?? `${basename(targetDir)}-scenarios`;
  const appId = opts.appId; // may be undefined — leave $JOYCRAFT_APP_ID as-is if so

  const vars: Record<string, string> = {
    SCENARIOS_REPO: scenariosRepo,
  };
  if (appId !== undefined) {
    vars['JOYCRAFT_APP_ID'] = appId;
  }

  const result: AutofixResult = { created: [], skipped: [] };

  // Install workflow templates to .github/workflows/
  const workflowsDir = join(targetDir, '.github', 'workflows');
  for (const [key, rawContent] of Object.entries(TEMPLATES)) {
    if (!key.startsWith('workflows/')) continue;
    const filename = key.slice('workflows/'.length); // e.g. "autofix.yml"
    const destPath = join(workflowsDir, filename);
    const content = replacePlaceholders(rawContent, vars);

    if (dryRun) {
      result.created.push(destPath);
      continue;
    }

    if (existsSync(destPath) && !force) {
      result.skipped.push(destPath);
      continue;
    }

    ensureDir(dirname(destPath));
    writeFileSync(destPath, content, 'utf-8');
    result.created.push(destPath);
  }

  // Install scenario templates to docs/templates/scenarios/
  const scenariosTemplateDir = join(targetDir, 'docs', 'templates', 'scenarios');
  for (const [key, rawContent] of Object.entries(TEMPLATES)) {
    if (!key.startsWith('scenarios/')) continue;
    const relativePath = key.slice('scenarios/'.length); // e.g. "README.md" or "workflows/run.yml"
    const destPath = join(scenariosTemplateDir, relativePath);
    const content = replacePlaceholders(rawContent, vars);

    if (dryRun) {
      result.created.push(destPath);
      continue;
    }

    if (existsSync(destPath) && !force) {
      result.skipped.push(destPath);
      continue;
    }

    ensureDir(dirname(destPath));
    writeFileSync(destPath, content, 'utf-8');
    result.created.push(destPath);
  }

  printSummary(result, dryRun, scenariosRepo);
}

function printSummary(result: AutofixResult, dryRun: boolean, scenariosRepo: string): void {
  if (dryRun) {
    console.log('\nDry run — these files would be created:\n');
    for (const f of result.created) {
      console.log(`  + ${f}`);
    }
    return;
  }

  console.log('\nJoycraft Autofix initialized!\n');

  if (result.created.length > 0) {
    console.log(`  Created ${result.created.length} file(s):`);
    for (const f of result.created) {
      console.log(`    + ${f}`);
    }
  }

  if (result.skipped.length > 0) {
    console.log(`\n  Skipped ${result.skipped.length} file(s) (already exist, use --force to overwrite):`);
    for (const f of result.skipped) {
      console.log(`    - ${f}`);
    }
  }

  console.log('\n  Setup checklist:\n');
  console.log('  1. Create a GitHub App with these permissions:');
  console.log('       - Contents: Read & Write');
  console.log('       - Actions: Read & Write');
  console.log('       - Pull requests: Read & Write');
  console.log('');
  console.log('  2. Add these secrets to your main repo (GitHub Settings > Secrets):');
  console.log('       JOYCRAFT_APP_PRIVATE_KEY   — private key PEM from your GitHub App');
  console.log('       ANTHROPIC_API_KEY           — your Anthropic API key');
  console.log('');
  console.log('  3. Create the scenarios repo (private):');
  console.log(`       ${scenariosRepo}`);
  console.log('     Copy docs/templates/scenarios/ into it as the repo root.');
  console.log('');
  console.log('  4. Update autofix.yml with your GitHub App ID if not already set.');
  console.log('');
  console.log('  Run `npx joycraft init-autofix --help` for options.\n');
}
