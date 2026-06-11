import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, chmodSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { readVersion, writeVersion, hashContent, truncateHash, LEGACY_VERSION_FILE } from './version.js';
import { applyGitignoreProfile, resolveGitignoreProfile, validateGitignoreFlag, PRIVATE_UNTRACK_COMMAND } from './gitignore.js';
import { SKILLS, TEMPLATES, CODEX_SKILLS, PI_SKILLS, PI_SCRIPTS, PI_EXTENSIONS, PI_AGENTS } from './bundled-files.js';
import { getPackageVersion } from './package-version.js';
import { planMigration, applyMigration, type MigrationPlan } from './migration.js';

function isStaleVersion(current: string, latest: string): boolean {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);
  const len = Math.max(currentParts.length, latestParts.length);
  for (let i = 0; i < len; i++) {
    const c = currentParts[i] ?? 0;
    const l = latestParts[i] ?? 0;
    if (c < l) return true;
    if (c > l) return false;
  }
  return false;
}

async function checkCliVersion(): Promise<{ stale: boolean; latest?: string }> {
  try {
    const pkgVersion = getPackageVersion();
    const res = await fetch('https://registry.npmjs.org/joycraft/latest', {
      signal: AbortSignal.timeout(3000)
    });
    if (!res.ok) return { stale: false };
    const data = (await res.json()) as { version: string };
    if (isStaleVersion(pkgVersion, data.version)) {
      return { stale: true, latest: data.version };
    }
  } catch {
    // Silent fallback on network errors or missing version
  }
  return { stale: false };
}

export interface UpgradeOptions {
  yes: boolean;
  /** Raw --gitignore value from the CLI, if provided. Validated in upgrade(). */
  gitignore?: string;
}

interface FileChange {
  relativePath: string;
  absolutePath: string;
  newContent: string;
  kind: 'new' | 'updated' | 'customized';
}

function getManagedFiles(): Record<string, string> {
  const files: Record<string, string> = {};
  for (const [name, content] of Object.entries(SKILLS)) {
    const skillName = name.replace(/\.md$/, '');
    files[join('.claude', 'skills', skillName, 'SKILL.md')] = content;
  }
  for (const [name, content] of Object.entries(TEMPLATES)) {
    files[join('docs', 'templates', name)] = content;
  }
  for (const [name, content] of Object.entries(CODEX_SKILLS)) {
    const skillName = name.replace(/\.md$/, '');
    files[join('.agents', 'skills', skillName, 'SKILL.md')] = content;
  }
  for (const [name, content] of Object.entries(PI_SKILLS)) {
    const skillName = name.replace(/\.md$/, '');
    files[join('.pi', 'skills', skillName, 'SKILL.md')] = content;
  }
  for (const [name, content] of Object.entries(PI_SCRIPTS)) {
    files[join('.pi', 'scripts', 'joycraft', name)] = content;
  }
  for (const [name, content] of Object.entries(PI_EXTENSIONS)) {
    files[join('.pi', 'extensions', name)] = content;
  }
  for (const [name, content] of Object.entries(PI_AGENTS)) {
    files[join('.pi', 'agents', name)] = content;
  }
  return files;
}

// Deprecated skill names from previous versions of Joycraft.
// These get removed during upgrade to prevent stale slash commands.
const DEPRECATED_SKILL_DIRS = [
  // Pre-rebrand names
  'joysmith',          // pre-rebrand main skill
  'joysmith-assess',   // merged into joycraft-tune
  'joysmith-upgrade',  // merged into joycraft-tune
  // Pre-namespace names (bare names without joycraft- prefix)
  'tune',              // now /joycraft-tune
  'tune-assess',       // merged into joycraft-tune
  'tune-upgrade',      // merged into joycraft-tune
  'joy',               // merged into joycraft-tune
  'interview',         // now /joycraft-interview
  'new-feature',       // now /joycraft-new-feature
  'decompose',         // now /joycraft-decompose
  'session-end',       // now /joycraft-session-end
];

// Flat .md files from the pre-directory skill format
const DEPRECATED_SKILL_FILES = [
  'tune.md',
  'joy.md',
  'joysmith.md',
  'joysmith-assess.md',
  'joysmith-upgrade.md',
  'tune-assess.md',
  'tune-upgrade.md',
  'interview.md',
  'new-feature.md',
  'decompose.md',
  'session-end.md',
];

function cleanupDeprecatedSkills(targetDir: string): number {
  const skillsDir = join(targetDir, '.claude', 'skills');
  if (!existsSync(skillsDir)) return 0;

  let removed = 0;

  // Remove deprecated directories
  for (const name of DEPRECATED_SKILL_DIRS) {
    const dir = join(skillsDir, name);
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
      removed++;
    }
  }

  // Remove flat .md files from pre-directory format
  for (const name of DEPRECATED_SKILL_FILES) {
    const file = join(skillsDir, name);
    if (existsSync(file)) {
      rmSync(file);
      removed++;
    }
  }

  return removed;
}

/**
 * Self-heal projects inited by an older Joycraft that wrote state to the repo
 * root (`.joycraft-version`). Reads the legacy file, re-writes it to the hidden
 * `.claude/.joycraft/state.json` location, and deletes the root file. No-op
 * when no legacy root file exists.
 *
 * Gitignore handling is deliberately NOT done here: the profile isn't resolved
 * yet at this point in upgrade(), and applyGitignoreProfile later in the same
 * run covers the state entry (shared) or the whole .claude/ tree (private) —
 * writing the state entry here would leave a dead line under `private`.
 *
 * Runs BEFORE the managed-file diff so the recorded-original hashes are
 * available at the new location for the same run's 3-way comparison. The hidden
 * state's own write truncates the (possibly full-length legacy) hashes, so the
 * comparison stays consistent — see the truncateHash() call in the diff loop.
 */
function migrateLegacyVersionFile(targetDir: string): boolean {
  const legacyPath = join(targetDir, LEGACY_VERSION_FILE);
  if (!existsSync(legacyPath)) return false;

  let parsed: { version?: unknown; files?: unknown };
  try {
    parsed = JSON.parse(readFileSync(legacyPath, 'utf-8'));
  } catch {
    // Corrupt legacy file: treat as no usable baseline. Remove it so the root
    // stops being polluted; upgrade then proceeds with no recorded-original
    // (every changed file becomes "customized" — safe, never silently wrong).
    rmSync(legacyPath, { force: true });
    return true;
  }

  const version = typeof parsed.version === 'string' ? parsed.version : getPackageVersion();
  const files =
    parsed.files && typeof parsed.files === 'object'
      ? (parsed.files as Record<string, string>)
      : {};

  // writeVersion targets the new hidden path and truncates the hashes. A
  // gitignoreProfile already persisted in the hidden state is preserved
  // (writeVersion keeps it when the argument is omitted).
  writeVersion(targetDir, version, files);
  rmSync(legacyPath, { force: true });
  return true;
}

function countLines(content: string): number {
  return content.split('\n').length;
}

function ensureScriptExecutable(absolutePath: string): void {
  // Joycraft shell scripts in .pi/scripts/joycraft/ must be executable.
  // README.md is the only file in that directory that should stay 644.
  if (absolutePath.includes('.pi/scripts/joycraft/') && !absolutePath.endsWith('README.md')) {
    try {
      chmodSync(absolutePath, 0o755);
    } catch {
      // non-fatal — permissions may be restricted
    }
  }
}

async function askUser(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

function printMigrationSummary(plan: MigrationPlan, projectDir: string): void {
  console.log('');
  console.log('Joycraft is migrating your docs/ to the new per-feature layout:');
  console.log('');

  const relTo = (p: string) => (p.startsWith(projectDir) ? p.slice(projectDir.length + 1) : p);

  // Group per-feature moves by feature folder for readability.
  // Bugfix-area moves are listed separately below.
  const featureMoves = plan.moves.filter(m => m.kind !== 'bugfix-dir');
  const bugfixMoves = plan.moves.filter(m => m.kind === 'bugfix-dir');

  const bySlug = new Map<string, typeof plan.moves>();
  for (const move of featureMoves) {
    const parts = relTo(move.to).split(/[\\/]/);
    // docs/features/<slug>/...
    const slug = parts.length >= 3 ? parts[2] : '(root)';
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug)!.push(move);
  }
  for (const [slug, moves] of bySlug) {
    console.log(`  ${slug}/`);
    for (const move of moves) {
      console.log(`    ${relTo(move.from)} → ${relTo(move.to)}`);
    }
  }

  if (bugfixMoves.length > 0) {
    console.log('');
    console.log('  Migrating bugfix areas:');
    for (const move of bugfixMoves) {
      console.log(`    ${relTo(move.from)} → ${relTo(move.to)}`);
    }
  }
  console.log('');
}

function printMigrationBanner(): void {
  console.log('');
  console.log('Migration complete. See the README section "Migration: Flat → Per-Feature Layout"');
  console.log('for context on what changed and why. If your project is a git repo, run');
  console.log('`git status` to inspect the moves before committing.');
  console.log('');
}

function runForcedMigration(projectDir: string): void {
  const plan = planMigration(projectDir);
  if (plan.moves.length === 0 && plan.orphans.specsDirs.length === 0) {
    return; // No flat layout — silent no-op.
  }

  printMigrationSummary(plan, projectDir);
  const result = applyMigration(plan);

  // Abort threshold: if more than 50% of attempted moves failed, bail loudly.
  const attempted = result.applied + result.errors.length;
  if (attempted > 0 && result.errors.length / attempted > 0.5) {
    console.error('Migration failed for more than half of attempted moves. Aborting upgrade.');
    for (const e of result.errors) {
      console.error(`  ${e.move.from} → ${e.move.to}: ${e.error}`);
    }
    throw new Error('Migration aborted: too many failures');
  }

  if (result.errors.length > 0) {
    console.log('Some moves had errors but upgrade will continue:');
    for (const e of result.errors) {
      console.log(`  warn: ${e.move.from} → ${e.move.to}: ${e.error}`);
    }
  }

  printMigrationBanner();
}

export async function upgrade(dir: string, opts: UpgradeOptions): Promise<void> {
  const targetDir = resolve(dir);

  // Validate the --gitignore flag before any side effects (network check,
  // legacy migration, docs migration) so a typo'd value changes nothing.
  if (opts.gitignore !== undefined) validateGitignoreFlag(opts.gitignore);

  // Guard: if the CLI itself is out of date, warn and bail before comparing
  // project files against stale bundled content.
  const cliCheck = await checkCliVersion();
  if (cliCheck.stale) {
    const pkgVersion = getPackageVersion();
    console.log(`Joycraft CLI is out of date (you have ${pkgVersion}, latest is ${cliCheck.latest}).`);
    console.log('Update with: npm install -g joycraft');
    console.log('Then re-run: npx joycraft upgrade');
    return;
  }

  // Check if project was initialized. A project is "initialized" if it has the
  // hidden state, OR a known skill, OR a legacy root state file (pre-relocation).
  const hasLegacyState = existsSync(join(targetDir, LEGACY_VERSION_FILE));
  const hasSkill = existsSync(join(targetDir, '.claude', 'skills', 'joycraft-tune', 'SKILL.md'))
    || existsSync(join(targetDir, '.claude', 'skills', 'tune', 'SKILL.md'))
    || existsSync(join(targetDir, '.claude', 'skills', 'joy', 'SKILL.md'))
    || existsSync(join(targetDir, '.claude', 'skills', 'joysmith', 'SKILL.md'));

  if (!readVersion(targetDir) && !hasLegacyState && !hasSkill) {
    console.log('This project has not been initialized with Joycraft.');
    console.log('Run `npx joycraft init` first.');
    return;
  }

  // Relocate any legacy repo-root .joycraft-version → hidden state, BEFORE the
  // diff loop so the migrated recorded-original is used on this same run. No-op
  // when no legacy root file exists.
  migrateLegacyVersionFile(targetDir);

  // Clean up deprecated skill directories/files from older versions
  const deprecatedRemoved = cleanupDeprecatedSkills(targetDir);
  if (deprecatedRemoved > 0) {
    console.log(`Removed ${deprecatedRemoved} deprecated skill(s) from previous Joycraft versions.`);
  }

  // Forced migration: flat docs/{briefs,research,designs,specs/<feature>}/
  // → docs/features/<slug>/{brief,research,design,specs/}/
  // Runs before the managed-file diff loop so any new managed files end up
  // correctly placed in an already-migrated tree.
  runForcedMigration(targetDir);

  // Get current package version
  const pkgVersion = getPackageVersion();

  // If version matches exactly, check if any file content actually changed.
  // Re-read state AFTER migration so a just-migrated project's recorded-original
  // hashes (now at the hidden path) feed the comparison below.
  const managedFiles = getManagedFiles();
  const installed = readVersion(targetDir);
  const installedHashes = installed?.files ?? {};

  // Resolve the project's gitignore profile.
  //   - --gitignore flag: explicit choice — the non-interactive way to set or
  //     switch the profile on an existing project.
  //   - Already chosen (init, or a prior upgrade): honor it silently.
  //   - Never chosen (pre-feature project) + interactive: ask once, then persist
  //     so this prompt never recurs. --yes suppresses the prompt — it promises
  //     a fully unattended run.
  //   - Never chosen + non-interactive: fall back to shared for this run only;
  //     decided=false means it is never persisted, so the project stays
  //     undecided and will be asked next time someone runs upgrade in a TTY.
  const resolvedProfile = await resolveGitignoreProfile({
    flag: opts.gitignore,
    persisted: installed?.gitignoreProfile,
    interactive: process.stdin.isTTY === true && !opts.yes,
    promptIntro: '\nJoycraft can now control how much of the harness is tracked in git.',
  });
  const gitignoreProfile = resolvedProfile.profile;
  applyGitignoreProfile(targetDir, gitignoreProfile);
  if (gitignoreProfile === 'private' && installed?.gitignoreProfile !== 'private') {
    console.log('Gitignore profile: private. If harness files were already committed, untrack them with:');
    console.log(`  ${PRIVATE_UNTRACK_COMMAND}`);
  }

  const changes: FileChange[] = [];
  let upToDate = 0;

  for (const [relPath, newContent] of Object.entries(managedFiles)) {
    const absPath = join(targetDir, relPath);
    const newHash = hashContent(newContent);

    if (!existsSync(absPath)) {
      // File doesn't exist locally — new file
      changes.push({ relativePath: relPath, absolutePath: absPath, newContent, kind: 'new' });
      continue;
    }

    const currentContent = readFileSync(absPath, 'utf-8');
    const currentHash = hashContent(currentContent);

    if (currentHash === newHash) {
      // Already matches the latest version
      upToDate++;
      continue;
    }

    // installedHashes are stored truncated; truncate the fresh hash to match.
    const originalHash = installedHashes[relPath];

    if (originalHash && truncateHash(currentHash) === originalHash) {
      // User hasn't modified the file — safe to auto-update
      changes.push({ relativePath: relPath, absolutePath: absPath, newContent, kind: 'updated' });
    } else {
      // User has customized this file (or no original hash recorded)
      changes.push({ relativePath: relPath, absolutePath: absPath, newContent, kind: 'customized' });
    }
  }

  if (changes.length === 0) {
    // Persist a freshly-decided profile (prompt answer or --gitignore switch)
    // even when no files changed, so the decision sticks. Never persist the
    // non-interactive fallback — an undecided project must stay undecided.
    if (resolvedProfile.decided && installed && installed.gitignoreProfile !== gitignoreProfile) {
      writeVersion(targetDir, installed.version, installedHashes, gitignoreProfile);
    }
    console.log('Already up to date.');
    return;
  }

  // Process changes
  let updated = 0;
  let skipped = 0;
  let added = 0;

  for (const change of changes) {
    if (change.kind === 'new') {
      // New Joycraft files are always auto-added — no prompt needed
      mkdirSync(dirname(change.absolutePath), { recursive: true });
      writeFileSync(change.absolutePath, change.newContent, 'utf-8');
      ensureScriptExecutable(change.absolutePath);
      added++;
      console.log(`  + ${change.relativePath}`);
    } else if (change.kind === 'updated') {
      // Safe to auto-update — user hasn't touched the file
      writeFileSync(change.absolutePath, change.newContent, 'utf-8');
      ensureScriptExecutable(change.absolutePath);
      updated++;
    } else if (change.kind === 'customized') {
      const currentContent = readFileSync(change.absolutePath, 'utf-8');
      const currentLines = countLines(currentContent);
      const newLines = countLines(change.newContent);
      const diff = newLines - currentLines;
      const diffLabel = diff > 0 ? `+${diff} lines` : diff < 0 ? `${diff} lines` : 'same length';
      const label = `Customized: ${change.relativePath} (local: ${currentLines} lines, latest: ${newLines} lines, ${diffLabel})`;

      if (opts.yes) {
        writeFileSync(change.absolutePath, change.newContent, 'utf-8');
        updated++;
      } else {
        const accept = await askUser(`${label} — overwrite with latest?`);
        if (accept) {
          writeFileSync(change.absolutePath, change.newContent, 'utf-8');
          ensureScriptExecutable(change.absolutePath);
          updated++;
        } else {
          skipped++;
        }
      }
    }
  }

  // Write new version file with updated hashes
  const newHashes: Record<string, string> = {};
  for (const [relPath, content] of Object.entries(managedFiles)) {
    const absPath = join(targetDir, relPath);
    if (existsSync(absPath)) {
      const current = readFileSync(absPath, 'utf-8');
      newHashes[relPath] = hashContent(current);
    }
  }
  // Record the profile only when this run actually decided it; writeVersion
  // preserves an already-persisted profile when the argument is omitted, and an
  // undecided project stays undecided (so the one-time prompt can still fire).
  writeVersion(targetDir, pkgVersion, newHashes, resolvedProfile.decided ? gitignoreProfile : undefined);

  // Print summary
  const parts: string[] = [];
  if (updated > 0) parts.push(`Updated ${updated}`);
  if (skipped > 0) parts.push(`skipped ${skipped} (customized)`);
  if (added > 0) parts.push(`added ${added} new`);
  if (upToDate > 0) parts.push(`${upToDate} already up to date`);
  console.log(`\nUpgrade complete: ${parts.join(', ')}.`);
}

