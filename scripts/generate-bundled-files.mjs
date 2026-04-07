// @ts-check
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT = join(ROOT, 'src', 'bundled-files.ts');

const SKILLS_DIR = join(ROOT, 'src', 'claude-skills');
const CODEX_SKILLS_DIR = join(ROOT, 'src', 'codex-skills');
const TEMPLATES_DIR = join(ROOT, 'src', 'templates');

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

const skills = readFlatDir(SKILLS_DIR);
const codexSkills = readFlatDir(CODEX_SKILLS_DIR);
const templates = readTreeDir(TEMPLATES_DIR);

const output = [
  '// @generated — do not edit. Run: node scripts/generate-bundled-files.mjs',
  '',
  formatRecord('SKILLS', skills),
  formatRecord('TEMPLATES', templates),
  formatRecord('CODEX_SKILLS', codexSkills),
].join('\n');

writeFileSync(OUTPUT, output);
console.log(`Generated ${OUTPUT} (${Object.keys(skills).length} skills, ${Object.keys(templates).length} templates, ${Object.keys(codexSkills).length} codex skills)`);
