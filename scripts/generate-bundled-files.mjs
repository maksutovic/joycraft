// @ts-check
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyTemplate } from './lib/skill-template.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT = join(ROOT, 'src', 'bundled-files.ts');

const CANONICAL_SKILLS_DIR = join(ROOT, 'src', 'skills');
const SKILLS_DIR = join(ROOT, 'src', 'claude-skills');
const CODEX_SKILLS_DIR = join(ROOT, 'src', 'codex-skills');
const PI_SKILLS_DIR = join(ROOT, 'src', 'pi-skills');
const TEMPLATES_DIR = join(ROOT, 'src', 'templates');

const HARNESS_TARGETS = /** @type {const} */ ([
  ['claude', SKILLS_DIR],
  ['codex', CODEX_SKILLS_DIR],
  ['pi', PI_SKILLS_DIR],
]);

/** Recursively walk a directory and return all file paths */
function walkDir(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

/** Read .md files from a flat directory into a Record<filename, content> */
function readFlatDir(dir) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  const record = {};
  for (const file of files.sort()) {
    record[file] = readFileSync(join(dir, file), 'utf-8');
  }
  return record;
}

/** Read all files from a directory tree into a Record<relativePath, content> */
function readTreeDir(dir) {
  const allFiles = walkDir(dir);
  const record = {};
  for (const file of allFiles.sort()) {
    const key = relative(dir, file);
    record[key] = readFileSync(file, 'utf-8');
  }
  return record;
}

/** Format a record as TypeScript source */
function formatRecord(name, record) {
  const entries = Object.entries(record)
    .map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`)
    .join(',\n');
  return `export const ${name}: Record<string, string> = {\n${entries}\n};\n`;
}

const PI_SCRIPTS_DIR = join(ROOT, 'src', 'templates', 'pi-scripts');
const PI_EXTENSIONS_DIR = join(ROOT, 'src', 'templates', 'pi-extensions');
const PI_AGENTS_DIR = join(ROOT, 'src', 'templates', 'pi-agents');

// 1. Canonical-skills pipeline: read src/skills/, render each canonical file
//    into the three per-harness dirs. Tolerate an empty (or absent) src/skills/
//    — the rest of the pipeline then re-reads the per-harness dirs from disk,
//    which keeps the existing "disk is source of truth for bundled-files"
//    invariant intact (design.md Section 4).
mkdirSync(CANONICAL_SKILLS_DIR, { recursive: true });
const canonicalSkills = readFlatDir(CANONICAL_SKILLS_DIR);
for (const [harness, dir] of HARNESS_TARGETS) {
  mkdirSync(dir, { recursive: true });
  for (const [file, source] of Object.entries(canonicalSkills)) {
    const transformed = applyTemplate(source, harness, file);
    writeFileSync(join(dir, file), transformed);
  }
}

const skills = readFlatDir(SKILLS_DIR);
const codexSkills = readFlatDir(CODEX_SKILLS_DIR);
const piSkills = readFlatDir(PI_SKILLS_DIR);
const templates = readTreeDir(TEMPLATES_DIR);
const piScripts = readTreeDir(PI_SCRIPTS_DIR);
const piExtensions = readTreeDir(PI_EXTENSIONS_DIR);
const piAgents = readTreeDir(PI_AGENTS_DIR);

const output = [
  '// @generated — do not edit. Run: node scripts/generate-bundled-files.mjs',
  '',
  formatRecord('SKILLS', skills),
  formatRecord('TEMPLATES', templates),
  formatRecord('CODEX_SKILLS', codexSkills),
  formatRecord('PI_SKILLS', piSkills),
  formatRecord('PI_SCRIPTS', piScripts),
  formatRecord('PI_EXTENSIONS', piExtensions),
  formatRecord('PI_AGENTS', piAgents),
].join('\n');

writeFileSync(OUTPUT, output);
console.log(`Generated ${OUTPUT} (${Object.keys(skills).length} skills, ${Object.keys(templates).length} templates, ${Object.keys(codexSkills).length} codex skills, ${Object.keys(piSkills).length} pi skills)`);
