// Sync generated skills into this repo's own installed harness trees.
//
// Two jobs, both about *this* repo rather than the npm package:
//
//   1. Product skills. `generate-bundled-files.mjs` writes the per-harness
//      variants under `src/*-skills/`, but nothing copied them into the
//      installed trees Joycraft dogfoods (`.claude/`, `.agents/`, `.pi/`,
//      `.github/`, `.omp/`). That copy was manual, which is how twelve stale copilot
//      skills shipped in 0.7.3 and why `installed-skills-sync.test.ts` exists
//      at all. This makes the fix `pnpm sync-skills` instead of four `cp`s.
//
//   2. Repo-local skills. `src/local-skills/` holds skills for Joycraft's own
//      maintainers (release-docs-sync, etc.). They are NOT part of the product:
//      the generator never reads that directory, so nothing there reaches
//      `bundled-files.ts` or npm. They still need per-harness transformation —
//      a maintainer on Codex or Pi should get `.agents/skills` and `AGENTS.md`
//      in the prose, not Claude's paths — so they run through the same
//      `applyTemplate` engine and land in every installed tree.
//
// Run after `generate-bundled-files.mjs`; `pnpm build` chains both.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { EOL } from 'node:os';
import { fileURLToPath } from 'node:url';
import { applyTemplate } from './lib/skill-template.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

const LOCAL_SKILLS_DIR = join(ROOT, 'src', 'local-skills');

/**
 * Generated tree -> installed tree, per harness. The installed paths mirror
 * what `init` writes into a user project, because this repo dogfoods its own
 * output.
 */
const TARGETS = /** @type {const} */ ([
  { harness: 'claude', generated: 'claude-skills', installed: join('.claude', 'skills') },
  { harness: 'codex', generated: 'codex-skills', installed: join('.agents', 'skills') },
  { harness: 'pi', generated: 'pi-skills', installed: join('.pi', 'skills') },
  { harness: 'copilot', generated: 'copilot-skills', installed: join('.github', 'skills') },
  { harness: 'omp', generated: 'omp-skills', installed: join('.omp', 'skills') },
]);

/** Match the generator: write native line endings so Windows checkouts stay clean. */
function toNativeEOL(text) {
  return EOL === '\r\n' ? text.replace(/\n/g, '\r\n') : text;
}

/** Write only when content actually changes, so reruns are quiet and idempotent. */
function writeIfChanged(path, content) {
  if (existsSync(path) && readFileSync(path, 'utf-8') === content) return false;
  writeFileSync(path, content);
  return true;
}

function markdownFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort();
}

let written = 0;
let localCount = 0;

for (const { harness, generated, installed } of TARGETS) {
  const generatedDir = join(ROOT, 'src', generated);
  const installedDir = join(ROOT, installed);

  // 1. Product skills: copy the already-transformed variant verbatim. Byte
  //    equality here is exactly what installed-skills-sync.test.ts asserts.
  for (const file of markdownFiles(generatedDir)) {
    const name = file.replace(/\.md$/, '');
    const dest = join(installedDir, name, 'SKILL.md');
    mkdirSync(join(installedDir, name), { recursive: true });
    if (writeIfChanged(dest, readFileSync(join(generatedDir, file), 'utf-8'))) written++;
  }

  // 2. Repo-local skills: transform from canonical source per harness. These
  //    never enter bundled-files.ts — see the header note.
  for (const file of markdownFiles(LOCAL_SKILLS_DIR)) {
    const name = file.replace(/\.md$/, '');
    const source = readFileSync(join(LOCAL_SKILLS_DIR, file), 'utf-8');
    const dest = join(installedDir, name, 'SKILL.md');
    mkdirSync(join(installedDir, name), { recursive: true });
    if (writeIfChanged(dest, toNativeEOL(applyTemplate(source, harness, file)))) written++;
  }
}

localCount = markdownFiles(LOCAL_SKILLS_DIR).length;
console.log(
  `Synced installed skills across ${TARGETS.length} harnesses ` +
    `(${localCount} repo-local, not bundled) — ${written} file(s) changed`,
);
