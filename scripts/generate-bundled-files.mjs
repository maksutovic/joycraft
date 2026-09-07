// @ts-check
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
  existsSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { EOL } from 'node:os';
import { fileURLToPath } from 'node:url';
import { applyTemplate } from './lib/skill-template.mjs';
let transpileModule;
let ModuleKind;
let ScriptTarget;
try {
  const typescript = await import('typescript');
  transpileModule = typescript.transpileModule;
  ModuleKind = typescript.ModuleKind;
  ScriptTarget = typescript.ScriptTarget;
} catch {
  // The sync test intentionally copies this generator without node_modules.
  // A checked-in checker artifact remains usable as a fallback there.
}

/**
 * Convert LF line endings to the OS-native format (CRLF on Windows).
 * This keeps git from flagging regenerated files as modified on Windows
 * (where git's core.autocrlf converts LF→CRLF on checkout, so writing
 * LF-only files makes them appear changed).
 */
function toNativeEOL(text) {
  if (EOL === '\r\n') {
    return text.replace(/\n/g, '\r\n');
  }
  return text;
}

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT = join(ROOT, 'src', 'bundled-files.ts');

const CANONICAL_SKILLS_DIR = join(ROOT, 'src', 'skills');
const SKILLS_DIR = join(ROOT, 'src', 'claude-skills');
const CODEX_SKILLS_DIR = join(ROOT, 'src', 'codex-skills');
const PI_SKILLS_DIR = join(ROOT, 'src', 'pi-skills');
const COPILOT_SKILLS_DIR = join(ROOT, 'src', 'copilot-skills');
const OMP_SKILLS_DIR = join(ROOT, 'src', 'omp-skills');
const TEMPLATES_DIR = join(ROOT, 'src', 'templates');

const HARNESS_TARGETS = /** @type {const} */ ([
  ['claude', SKILLS_DIR],
  ['codex', CODEX_SKILLS_DIR],
  ['pi', PI_SKILLS_DIR],
  ['copilot', COPILOT_SKILLS_DIR],
  ['omp', OMP_SKILLS_DIR],
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

/**
 * Read all files from a directory tree into a Record<relativePath, content>.
 *
 * `excludeTopDirs` skips entire top-level subdirectories by name. This keeps the
 * `pi-*` runtime trees out of the TEMPLATES record: they already ship to `.pi/`
 * via the dedicated PI_SCRIPTS/PI_EXTENSIONS/PI_AGENTS records, so copying them
 * into `docs/templates/` too is redundant — and one of them
 * (`pi-extensions/joycraft-pipeline.ts`) is a `.ts` file that a user's default
 * `**​/*.ts` toolchain glob would compile, breaking their build on a fresh
 * install. The real copy under `.pi/` is the one that runs.
 */
function readTreeDir(dir, excludeTopDirs = []) {
  const allFiles = walkDir(dir);
  const record = {};
  for (const file of allFiles.sort()) {
    const key = relative(dir, file);
    const topDir = key.split(/[\\/]/)[0];
    if (excludeTopDirs.includes(topDir)) continue;
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

/**
 * Compile the shared checker into the self-contained script installed in each
 * target project. Only Node builtins remain as imports in this output; the
 * package's TypeScript compiler is a build-time dependency and is not needed
 * by consumers running docs/.joycraft/check.mjs.
 */
function generateChecker() {
  const sourcePath = join(ROOT, 'src', 'update-check.ts');
  if (!existsSync(sourcePath)) return '';
  const source = readFileSync(sourcePath, 'utf-8');
  if (!transpileModule) {
    const fallbackPath = join(ROOT, 'src', 'check.mjs');
    return existsSync(fallbackPath) ? readFileSync(fallbackPath, 'utf-8') : '';
  }
  const compiled = transpileModule(source, {
    compilerOptions: { module: ModuleKind.ES2022, target: ScriptTarget.ES2022, removeComments: false },
    fileName: 'update-check.ts',
  }).outputText;
  const wrapper = `
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirname, join as __join } from 'node:path';
const __checkerFile = __fileURLToPath(import.meta.url);
const __checkerRoot = __join(__dirname(__dirname(__checkerFile)), '..');
const __checkerArgs = process.argv.slice(2);
const __sessionIndex = __checkerArgs.indexOf('--session');
const __checkerSession = resolveCheckSessionId(__sessionIndex < 0 ? undefined : __checkerArgs[__sessionIndex + 1]);
if (__checkerArgs[0] === 'check') {
  const result = await checkForUpdate(__checkerRoot, {
    explicit: __checkerArgs.includes('--explicit'), sessionId: __checkerSession,
    ...(process.env.JOYCRAFT_CHECK_FETCH === '0' ? { fetchLatest: async () => { throw new Error('Registry access disabled for this check.'); } } : {}),
  });
  if (__checkerArgs.includes('--json')) console.log(JSON.stringify(result));
  else if (result.display && result.availableVersion) {
    console.log('Joycraft ' + result.availableVersion + ' available (you have ' + (result.installedVersion ?? 'unknown') + '). Finish the active skill, then run the update and restart or reinvoke the skill.');
    acknowledgeUpdate(__checkerRoot, { release: result.availableVersion, session: __checkerSession });
  }
} else if (__checkerArgs[0] === 'acknowledge') {
  console.log(JSON.stringify({ acknowledged: acknowledgeUpdate(__checkerRoot, { release: __checkerArgs[1], session: __checkerSession }) }));
} else if (__checkerArgs[0] === 'postpone') {
  console.log(JSON.stringify({ postponed: postponeUpdate(__checkerRoot, __checkerArgs[1]) }));
} else if (__checkerArgs[0] === 'policy') {
  const updated = setUpdatePolicy(__checkerRoot, __checkerArgs[1]);
  console.log(JSON.stringify({ updated, policy: readUpdatePolicy(__checkerRoot) }));
  if (!updated) process.exitCode = 1;
}
`;
  return `${compiled}${wrapper}`;
}

const checkerSource = generateChecker();
writeFileSync(join(ROOT, 'src', 'check.mjs'), checkerSource);

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
    const transformed = applyTemplate(source, harness, file, { includeUpdateCheck: true });
    writeFileSync(join(dir, file), toNativeEOL(transformed));
  }
}

const skills = readFlatDir(SKILLS_DIR);
const codexSkills = readFlatDir(CODEX_SKILLS_DIR);
const piSkills = readFlatDir(PI_SKILLS_DIR);
const copilotSkills = readFlatDir(COPILOT_SKILLS_DIR);
const ompSkills = readFlatDir(OMP_SKILLS_DIR);
// Exclude the pi-* runtime trees — they ship to .pi/ via the PI_* records, not
// to docs/templates/ (see readTreeDir doc). This is what keeps a stray
// docs/templates/pi-extensions/joycraft-pipeline.ts out of users' TS programs.
const templates = readTreeDir(TEMPLATES_DIR, ['pi-extensions', 'pi-scripts', 'pi-agents']);
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
  formatRecord('COPILOT_SKILLS', copilotSkills),
  formatRecord('OMP_SKILLS', ompSkills),
  formatRecord('PI_SCRIPTS', piScripts),
  formatRecord('PI_EXTENSIONS', piExtensions),
  formatRecord('PI_AGENTS', piAgents),
  `export const CHECKER_SOURCE: string = ${JSON.stringify(checkerSource)};\n`,
].join('\n');

writeFileSync(OUTPUT, output);
console.log(`Generated ${OUTPUT} (${Object.keys(skills).length} skills, ${Object.keys(templates).length} templates, ${Object.keys(codexSkills).length} codex skills, ${Object.keys(piSkills).length} pi skills, ${Object.keys(copilotSkills).length} copilot skills, ${Object.keys(ompSkills).length} omp skills)`);
