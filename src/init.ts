import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
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
  const result: InitResult = { created: [], skipped: [], modified: [] };

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

  // 7. Print summary
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

  const hasExistingClaude = result.skipped.some(f => f.endsWith('CLAUDE.md'));

  console.log('\n  Next steps:');
  if (hasExistingClaude) {
    console.log('    1. Run Claude Code and try /joysmith to assess and improve your existing CLAUDE.md');
  } else {
    console.log('    1. Review and customize the generated CLAUDE.md for your project');
  }
  console.log('    2. Try /new-feature to start building with the spec-driven workflow');
  console.log('');
}
