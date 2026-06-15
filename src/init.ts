import { mkdirSync, existsSync, writeFileSync, readFileSync, readdirSync, statSync, chmodSync } from 'node:fs';
import { join, basename, resolve, dirname } from 'node:path';
import { detectStack } from './detect.js';
import { generateCLAUDEMd } from './improve-claude-md.js';
import { generateAgentsMd } from './agents-md.js';
import { generatePermissions } from './permissions.js';
import { installSafeguardHooks } from './safeguard.js';
import { SKILLS, TEMPLATES, CODEX_SKILLS, PI_SKILLS, PI_SCRIPTS, PI_EXTENSIONS, PI_AGENTS } from './bundled-files.js';
import {
  writeVersion,
  readVersion,
  hashContent,
  STATE_PATH,
  DEFAULT_GITIGNORE_PROFILE,
  type GitignoreProfile,
} from './version.js';
import {
  applyGitignoreProfile,
  resolveGitignoreProfile,
  PRIVATE_DIRS_DISPLAY,
  PRIVATE_UNTRACK_COMMAND,
} from './gitignore.js';
import { getPackageVersion } from './package-version.js';

export interface InitOptions {
  force: boolean;
  /** Raw --gitignore value from the CLI, if provided. Validated in init(). */
  gitignore?: string;
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

  // Pi detection — check if project uses Pi coding agent
  const isPi = existsSync(join(targetDir, '.pi'));

  // Resolve the gitignore profile up front (flag → persisted → prompt → default)
  // so it governs both the .gitignore writes and the "teammates won't get skills"
  // warning below. Unlike upgrade, init persists even the non-interactive
  // default: init creates the state fresh, and `shared` is the documented
  // default for a first run.
  const { profile: gitignoreProfile } = await resolveGitignoreProfile({
    flag: opts.gitignore,
    persisted: readVersion(targetDir)?.gitignoreProfile,
    interactive: process.stdin.isTTY === true,
    promptIntro: '\nHow should Joycraft files be tracked in git?',
  });

  // 1. Create the only Joycraft-managed docs/ subdirectory: context/.
  // All other folders (briefs/specs/discoveries/decisions/contracts/features/backlog/...) are
  // lazy-created by the skills that write to them. Solo-first: no preemptive ceremony.
  ensureDir(join(targetDir, 'docs', 'context'));

  // 1b. Scan for existing non-Joycraft skills before copying ours
  const skillsDir = join(targetDir, '.claude', 'skills');
  let existingSkills: string[] = [];
  if (existsSync(skillsDir)) {
    existingSkills = readdirSync(skillsDir)
      .filter(name => {
        if (name.startsWith('joycraft-')) return false;
        if (name.startsWith('.')) return false;
        const fullPath = join(skillsDir, name);
        try {
          return statSync(fullPath).isDirectory();
        } catch {
          return false;
        }
      });
  }

  // 2. Copy skill files to .claude/skills/<name>/SKILL.md
  for (const [filename, content] of Object.entries(SKILLS)) {
    const skillName = filename.replace(/\.md$/, '');
    const skillDir = join(skillsDir, skillName);
    ensureDir(skillDir);
    writeFile(join(skillDir, 'SKILL.md'), content, opts.force, result);
  }

  // 2b. Copy Codex skill files to .agents/skills/<name>/SKILL.md
  const codexSkillsDir = join(targetDir, '.agents', 'skills');
  let existingCodexSkills: string[] = [];
  if (existsSync(codexSkillsDir)) {
    existingCodexSkills = readdirSync(codexSkillsDir)
      .filter(name => {
        if (name.startsWith('joycraft-')) return false;
        if (name.startsWith('.')) return false;
        const fullPath = join(codexSkillsDir, name);
        try {
          return statSync(fullPath).isDirectory();
        } catch {
          return false;
        }
      });
  }
  for (const [filename, content] of Object.entries(CODEX_SKILLS)) {
    const skillName = filename.replace(/\.md$/, '');
    const skillDir = join(codexSkillsDir, skillName);
    ensureDir(skillDir);
    writeFile(join(skillDir, 'SKILL.md'), content, opts.force, result);
  }

  // 2c. Copy Pi skill files to .pi/skills/<name>/SKILL.md
  const piSkillsDir = join(targetDir, '.pi', 'skills');
  for (const [filename, content] of Object.entries(PI_SKILLS)) {
    const skillName = filename.replace(/\.md$/, '');
    const skillDir = join(piSkillsDir, skillName);
    ensureDir(skillDir);
    writeFile(join(skillDir, 'SKILL.md'), content, opts.force, result);
  }

  // 2d. Install Pi pipeline runtime scripts to .pi/scripts/joycraft/
  const piScriptsDir = join(targetDir, '.pi', 'scripts', 'joycraft');
  ensureDir(piScriptsDir);
  for (const [name, content] of Object.entries(PI_SCRIPTS)) {
    const scriptPath = join(piScriptsDir, name);
    writeFile(scriptPath, content, opts.force, result);
    if (name !== 'README.md') {
      try { chmodSync(scriptPath, 0o755); } catch { /* non-fatal */ }
    }
  }

  // 2e. Install Pi extension to .pi/extensions/
  const piExtDir = join(targetDir, '.pi', 'extensions');
  ensureDir(piExtDir);
  for (const [name, content] of Object.entries(PI_EXTENSIONS)) {
    writeFile(join(piExtDir, name), content, opts.force, result);
  }

  // 2f. Install Pi subagent definitions to .pi/agents/
  const piAgentsDir = join(targetDir, '.pi', 'agents');
  ensureDir(piAgentsDir);
  for (const [name, content] of Object.entries(PI_AGENTS)) {
    writeFile(join(piAgentsDir, name), content, opts.force, result);
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
    const content = generateCLAUDEMd(projectName, stack, existingSkills);
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

  // 6. Write the hidden state (.claude/.joycraft/state.json) with hashes of all managed files
  const fileHashes: Record<string, string> = {};
  for (const [filename, content] of Object.entries(SKILLS)) {
    const skillName = filename.replace(/\.md$/, '');
    fileHashes[join('.claude', 'skills', skillName, 'SKILL.md')] = hashContent(content);
  }
  for (const [filename, content] of Object.entries(CODEX_SKILLS)) {
    const skillName = filename.replace(/\.md$/, '');
    fileHashes[join('.agents', 'skills', skillName, 'SKILL.md')] = hashContent(content);
  }
  for (const [filename, content] of Object.entries(TEMPLATES)) {
    fileHashes[join('docs', 'templates', filename)] = hashContent(content);
  }
  for (const [filename, content] of Object.entries(PI_SKILLS)) {
    const skillName = filename.replace(/\.md$/, '');
    fileHashes[join('.pi', 'skills', skillName, 'SKILL.md')] = hashContent(content);
  }
  for (const [name, content] of Object.entries(PI_SCRIPTS)) {
    fileHashes[join('.pi', 'scripts', 'joycraft', name)] = hashContent(content);
  }
  for (const [name, content] of Object.entries(PI_EXTENSIONS)) {
    fileHashes[join('.pi', 'extensions', name)] = hashContent(content);
  }
  for (const [name, content] of Object.entries(PI_AGENTS)) {
    fileHashes[join('.pi', 'agents', name)] = hashContent(content);
  }
  writeVersion(targetDir, getPackageVersion(), fileHashes, gitignoreProfile);

  // 6b. Apply the chosen gitignore profile.
  //   - shared:  ignore only the hidden upgrade-state file (npm-lockfile-style;
  //              tool-managed state that should never land in commits).
  //   - private: ignore .claude/, .agents/, .pi/ — track only CLAUDE.md,
  //              AGENTS.md, docs/.
  // Append-only + create-if-absent + idempotent (never clobbers existing entries).
  applyGitignoreProfile(targetDir, gitignoreProfile);

  // 7. Install version check hook
  const hooksDir = join(targetDir, '.claude', 'hooks');
  ensureDir(hooksDir);
  const hookScript = `// Joycraft version check — runs on Claude Code session start
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
try {
  const data = JSON.parse(readFileSync(join(process.cwd(), '${STATE_PATH.split(/[\\/]/).join("', '")}'), 'utf-8'));
  const res = await fetch('https://registry.npmjs.org/joycraft/latest', { signal: AbortSignal.timeout(3000) });
  if (res.ok) {
    const latest = (await res.json()).version;
    if (data.version !== latest) console.log('Joycraft ' + latest + ' available (you have ' + data.version + '). Run: npm install -g joycraft');
  }
} catch {}
`;
  writeFile(join(hooksDir, 'joycraft-version-check.mjs'), hookScript, opts.force, result);

  // Update .claude/settings.json with SessionStart hook
  const settingsPath = join(targetDir, '.claude', 'settings.json');
  let settings: Record<string, unknown> = {};
  let settingsMalformed = false;
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    } catch {
      settingsMalformed = true;
      result.warnings.push(
        'settings.json exists but is malformed — skipping settings merge to protect your config.\n' +
        '    Fix the JSON in .claude/settings.json and re-run init.'
      );
    }
  }
  if (!settingsMalformed) {
    if (!settings.hooks) settings.hooks = {};
    const hooksConfig = settings.hooks as Record<string, unknown>;
    if (!hooksConfig.SessionStart) hooksConfig.SessionStart = [];
    const sessionStartHooks = hooksConfig.SessionStart as Array<Record<string, unknown>>;
    const hasJoycraftHook = sessionStartHooks.some(h => {
      const innerHooks = h.hooks as Array<Record<string, unknown>> | undefined;
      return innerHooks?.some(ih => typeof ih.command === 'string' && ih.command.includes('joycraft'));
    });
    if (!hasJoycraftHook) {
      sessionStartHooks.push({
        matcher: '',
        hooks: [{
          type: 'command',
          command: 'node .claude/hooks/joycraft-version-check.mjs',
        }],
      });
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
      result.created.push(settingsPath);
    }

    // 8. Generate and merge permission rules into settings.json
    const permissions = generatePermissions(stack);
    // Re-read settings in case it was just created by hook step
    if (existsSync(settingsPath)) {
      try {
        settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      } catch {
        result.warnings.push(
          'settings.json became unreadable after hook merge — skipping permissions merge.\n' +
          '    Fix the JSON in .claude/settings.json and re-run init.'
        );
        settingsMalformed = true;
      }
    }
    if (!settingsMalformed) {
      if (!settings.permissions) settings.permissions = {};
      const perms = settings.permissions as Record<string, string[]>;
      if (!perms.allow) perms.allow = [];
      if (!perms.deny) perms.deny = [];
      for (const rule of permissions.allow) {
        if (!perms.allow.includes(rule)) perms.allow.push(rule);
      }
      for (const rule of permissions.deny) {
        if (!perms.deny.includes(rule)) perms.deny.push(rule);
      }
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
    }
  }

  // 9. Install safeguard hooks (PreToolUse deny-pattern blocking)
  const hookResult = installSafeguardHooks(targetDir, [], opts.force, settingsMalformed);
  result.created.push(...hookResult.created);
  result.skipped.push(...hookResult.skipped);

  // 10. Check .gitignore for .claude/ exclusion.
  // Only a concern under the `shared` profile, where the intent is to commit
  // skills so teammates get them. Under `private`, ignoring .claude/ is the
  // user's deliberate choice — surfacing a warning there would be wrong.
  if (gitignoreProfile === 'shared') {
    const gitignorePath = join(targetDir, '.gitignore');
    if (existsSync(gitignorePath)) {
      const gitignore = readFileSync(gitignorePath, 'utf-8');
      if (/^\.claude\/?$/m.test(gitignore) || /^\.claude\/\*$/m.test(gitignore)) {
        result.warnings.push(
          '.claude/ is in your .gitignore — teammates won\'t get Joycraft skills.\n' +
          '    Add this line to .gitignore to fix: !.claude/skills/'
        );
      }
    }
  }

  // 11. Print summary
  printSummary(result, stack, existingSkills, isPi, gitignoreProfile);
}

function printSummary(result: InitResult, stack: import('./detect.js').StackInfo, existingSkills: string[] = [], isPi: boolean = false, gitignoreProfile: GitignoreProfile = DEFAULT_GITIGNORE_PROFILE): void {
  console.log('\nJoycraft initialized!\n');

  if (stack.language !== 'unknown') {
    const fw = stack.framework ? ` + ${stack.framework}` : '';
    console.log(`  Detected stack: ${stack.language}${fw} (${stack.packageManager})`);
  } else {
    console.log('  Detected stack: unknown (no recognized manifest found)');
  }

  if (isPi) {
    console.log('  Detected agent: Pi');
  }

  if (gitignoreProfile === 'private') {
    console.log(`  Gitignore profile: private (${PRIVATE_DIRS_DISPLAY} are gitignored — only CLAUDE.md, AGENTS.md, docs/ are tracked)`);
  } else {
    console.log('  Gitignore profile: shared (skills and docs are tracked for your team)');
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

  if (existingSkills.length > 0) {
    console.log(`\n  Found existing skills: ${existingSkills.join(', ')}. These are preserved — Joycraft is additive.`);
  }

  const hasExistingClaude = result.skipped.some(f => f.endsWith('CLAUDE.md'));

  console.log('\n  Next steps:');
  console.log('    1. Run Claude Code and try /joycraft-setup — the first-run door that sets up and assesses your project');
  if (hasExistingClaude) {
    console.log('       (it routes to /joycraft-tune to assess and improve your existing CLAUDE.md)');
  } else {
    console.log('       (then review and customize the generated CLAUDE.md for your project)');
  }
  console.log('    2. Try /joycraft-new-feature to start building with the spec-driven workflow');
  console.log('       (feature artifacts are written to docs/features/<slug>/ as you go)');
  if (gitignoreProfile === 'private') {
    console.log(`    3. Commit CLAUDE.md, AGENTS.md, and docs/ — ${PRIVATE_DIRS_DISPLAY} stay local (gitignored)`);
    console.log(`       (if any harness files were already committed, run: ${PRIVATE_UNTRACK_COMMAND})`);
  } else {
    console.log('    3. Commit .claude/skills/ and docs/ so your team gets the same workflow');
  }
  if (!isPi) {
    console.log('    Pi: Skills installed to .pi/skills/. Use /skill:joycraft-* to invoke.');
  }
  console.log('');
}
