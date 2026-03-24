import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join, basename, resolve, dirname } from 'node:path';
import { detectStack } from './detect.js';
import { generateCLAUDEMd } from './improve-claude-md.js';
import { generateAgentsMd } from './agents-md.js';
import { SKILLS, TEMPLATES } from './bundled-files.js';
import { writeVersion, hashContent } from './version.js';

export interface InitOptions {
  force: boolean;
}

interface InitResult {
  created: string[];
  skipped: string[];
  modified: string[];
  warnings: string[];
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function writeFile(path: string, content: string, force: boolean, result: InitResult): void {
  if (existsSync(path) && !force) {
    result.skipped.push(path);
    return;
  }
  writeFileSync(path, content, 'utf-8');
  result.created.push(path);
}

export async function init(dir: string, opts: InitOptions): Promise<void> {
  const targetDir = resolve(dir);
  const result: InitResult = { created: [], skipped: [], modified: [], warnings: [] };

  // Detect stack
  const stack = await detectStack(targetDir);

  // 1. Create docs/ subdirectories
  const docsDirs = ['briefs', 'specs', 'discoveries', 'contracts', 'decisions'];
  for (const sub of docsDirs) {
    ensureDir(join(targetDir, 'docs', sub));
  }

  // 2. Copy skill files to .claude/skills/<name>/SKILL.md
  const skillsDir = join(targetDir, '.claude', 'skills');
  for (const [filename, content] of Object.entries(SKILLS)) {
    const skillName = filename.replace(/\.md$/, '');
    const skillDir = join(skillsDir, skillName);
    ensureDir(skillDir);
    writeFile(join(skillDir, 'SKILL.md'), content, opts.force, result);
  }

  // 3. Copy template files to docs/templates/
  const templatesDir = join(targetDir, 'docs', 'templates');
  ensureDir(templatesDir);
  for (const [filename, content] of Object.entries(TEMPLATES)) {
    ensureDir(dirname(join(templatesDir, filename)));
    writeFile(join(templatesDir, filename), content, opts.force, result);
  }

  // 4. Handle CLAUDE.md — only create if missing, never modify existing (unless --force)
  const claudeMdPath = join(targetDir, 'CLAUDE.md');
  if (existsSync(claudeMdPath) && !opts.force) {
    result.skipped.push(claudeMdPath);
  } else {
    const projectName = basename(targetDir);
    const content = generateCLAUDEMd(projectName, stack);
    writeFileSync(claudeMdPath, content, 'utf-8');
    result.created.push(claudeMdPath);
  }

  // 5. Handle AGENTS.md — only create if missing, never modify existing (unless --force)
  const agentsMdPath = join(targetDir, 'AGENTS.md');
  if (existsSync(agentsMdPath) && !opts.force) {
    result.skipped.push(agentsMdPath);
  } else {
    const projectName = basename(targetDir);
    const content = generateAgentsMd(projectName, stack);
    writeFileSync(agentsMdPath, content, 'utf-8');
    result.created.push(agentsMdPath);
  }

  // 6. Write .joysmith-version with hashes of all managed files
  const fileHashes: Record<string, string> = {};
  for (const [filename, content] of Object.entries(SKILLS)) {
    const skillName = filename.replace(/\.md$/, '');
    fileHashes[join('.claude', 'skills', skillName, 'SKILL.md')] = hashContent(content);
  }
  for (const [filename, content] of Object.entries(TEMPLATES)) {
    fileHashes[join('docs', 'templates', filename)] = hashContent(content);
  }
  writeVersion(targetDir, '0.1.0', fileHashes);

  // 7. Install version check hook
  const hooksDir = join(targetDir, '.claude', 'hooks');
  ensureDir(hooksDir);
  const hookScript = `// Joysmith version check — runs on Claude Code session start
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
try {
  const data = JSON.parse(readFileSync(join(process.cwd(), '.joysmith-version'), 'utf-8'));
  const res = await fetch('https://registry.npmjs.org/joysmith/latest', { signal: AbortSignal.timeout(3000) });
  if (res.ok) {
    const latest = (await res.json()).version;
    if (data.version !== latest) console.log('Joysmith ' + latest + ' available (you have ' + data.version + '). Run: npx joysmith upgrade');
  }
} catch {}
`;
  writeFile(join(hooksDir, 'joysmith-version-check.mjs'), hookScript, opts.force, result);

  // Update .claude/settings.json with SessionStart hook
  const settingsPath = join(targetDir, '.claude', 'settings.json');
  let settings: Record<string, unknown> = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    } catch {
      // If settings.json is malformed, start fresh
    }
  }
  if (!settings.hooks) settings.hooks = {};
  const hooksConfig = settings.hooks as Record<string, unknown>;
  if (!hooksConfig.SessionStart) hooksConfig.SessionStart = [];
  const sessionStartHooks = hooksConfig.SessionStart as Array<Record<string, unknown>>;
  const hasJoysmithHook = sessionStartHooks.some(h => {
    const innerHooks = h.hooks as Array<Record<string, unknown>> | undefined;
    return innerHooks?.some(ih => typeof ih.command === 'string' && ih.command.includes('joysmith'));
  });
  if (!hasJoysmithHook) {
    sessionStartHooks.push({
      matcher: '',
      hooks: [{
        type: 'command',
        command: 'node .claude/hooks/joysmith-version-check.mjs',
      }],
    });
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
    result.created.push(settingsPath);
  }

  // 8. Check .gitignore for .claude/ exclusion
  const gitignorePath = join(targetDir, '.gitignore');
  if (existsSync(gitignorePath)) {
    const gitignore = readFileSync(gitignorePath, 'utf-8');
    if (/^\.claude\/?$/m.test(gitignore) || /^\.claude\/\*$/m.test(gitignore)) {
      result.warnings.push(
        '.claude/ is in your .gitignore — teammates won\'t get Joysmith skills.\n' +
        '    Add this line to .gitignore to fix: !.claude/skills/'
      );
    }
  }

  // 9. Print summary
  printSummary(result, stack);
}

function printSummary(result: InitResult, stack: import('./detect.js').StackInfo): void {
  console.log('\nJoysmith initialized!\n');

  if (stack.language !== 'unknown') {
    const fw = stack.framework ? ` + ${stack.framework}` : '';
    console.log(`  Detected stack: ${stack.language}${fw} (${stack.packageManager})`);
  } else {
    console.log('  Detected stack: unknown (no recognized manifest found)');
  }

  if (result.created.length > 0) {
    console.log(`\n  Created ${result.created.length} file(s):`);
    for (const f of result.created) {
      console.log(`    + ${f}`);
    }
  }

  if (result.modified.length > 0) {
    console.log(`\n  Modified ${result.modified.length} file(s):`);
    for (const f of result.modified) {
      console.log(`    ~ ${f}`);
    }
  }

  if (result.skipped.length > 0) {
    console.log(`\n  Skipped ${result.skipped.length} file(s) (already exist, use --force to overwrite):`);
    for (const f of result.skipped) {
      console.log(`    - ${f}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log('\n  Warnings:');
    for (const w of result.warnings) {
      console.log(`    ⚠ ${w}`);
    }
  }

  const hasExistingClaude = result.skipped.some(f => f.endsWith('CLAUDE.md'));

  console.log('\n  Next steps:');
  if (hasExistingClaude) {
    console.log('    1. Run Claude Code and try /joy to assess and improve your existing CLAUDE.md');
  } else {
    console.log('    1. Review and customize the generated CLAUDE.md for your project');
  }
  console.log('    2. Try /new-feature to start building with the spec-driven workflow');
  console.log('    3. Commit .claude/skills/ and docs/ so your team gets the same workflow');
  console.log('');
}
