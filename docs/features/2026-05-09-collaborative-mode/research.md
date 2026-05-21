# Codebase Research

**Date:** 2026-05-09
**Questions answered:** 15/15 (Zones A–C) + 9/9 (Zone D, deferral audit, appended below)

---

## Q1: What does the current root `CLAUDE.md` look like in terms of how it references other files?

**Pointer phrasings found in `/Users/compiler/Developer/joycraft/CLAUDE.md`:**

The CLAUDE.md uses the following file reference patterns:

1. **Directory structure references:**
   - `docs/briefs/` (line 14: "Reference atomic specs when implementing features — each spec is in `docs/specs/`")
   - `docs/specs/` (line 14, 79)
   - `.claude/skills/` (line 62)
   - `templates/` (line 70: "Source-of-truth templates (development reference)")

2. **Specific file references:**
   - `docs/briefs/2026-03-23-joysmith-cli-plugin.md` (line 116: "Feature Brief — the full vision")
   - `.joycraft-version` (mentioned in context of version tracking)

3. **Instruction format:**
   - Line 149: "Read the relevant atomic spec in `docs/specs/`"
   - Line 159: "All templates and skills must use project-relative paths"

4. **Surrounding context:**
   - Section: "Key Files" (line 106-117) uses table format with file paths and purposes
   - Section: "Development Workflow" (line 120-151) mentions "Read the relevant atomic spec in docs/specs/"
   - The architecture diagram shows directory structure with inline path references

---

## Q2: How does `src/improve-claude-md.ts` and `src/init.ts` currently generate or modify CLAUDE.md content?

**File `/Users/compiler/Developer/joycraft/src/improve-claude-md.ts` (224 lines):**

String literals and pointer phrasings emitted:

1. **Boundaries section** (line 49-75): Includes phrase "Read `docs/context/` before making infrastructure or config changes" (line 58)

2. **Getting Started section** (lines 104-118):
   - Generates table with skill references: `/joycraft-tune`, `/joycraft-new-feature`, `/joycraft-interview`, `/joycraft-decompose`, `/joycraft-session-end`, `/joycraft-implement-level5`
   - No file references to docs/

3. **External Validation section** (lines 121-131): References "separate private repo" but no specific file paths

4. **Project Tools section** (lines 134-145): References `.claude/skills/` (line 145)

**File `/Users/compiler/Developer/joycraft/src/init.ts` (323 lines):**

Pointer phrasings and file writes:

1. **Line 45:** Creates directories: `docs/briefs`, `docs/specs`, `docs/discoveries`, `docs/contracts`, `docs/decisions`, `docs/context`, `docs/pipit-examples`

2. **Line 51-70:** Writes pipit-examples README with reference to `docs/pipit-examples/` and `docs/templates/scenarios/`

3. **Line 122-127:** Copies templates to `docs/templates/` with reference "docs/templates/" embedded in init logic

4. **Line 135:** Generates CLAUDE.md with call to `generateCLAUDEMd(projectName, stack, existingSkills)`

5. **Line 177:** Embeds version-check hook script that outputs: `'Joycraft ' + latest + ' available (you have ' + data.version + '). Run: npx joycraft upgrade'`

**No explicit template strings for "on-demand read" pointers like "see X for details" or "consult X when..." are present in init.ts or improve-claude-md.ts.**

---

## Q3: Does the codebase already contain any examples of "on-demand read" patterns?

**Search results across skills and templates:**

1. **Phrasings in `src/claude-skills/joycraft-new-feature.md`:**
   - Line 108: "If `docs/templates/FEATURE_BRIEF_TEMPLATE.md` exists, reference it for the full template with additional guidance."
   - Line 180: "If `docs/templates/ATOMIC_SPEC_TEMPLATE.md` exists, reference it for the full template with additional guidance."

2. **Phrasings in `src/claude-skills/joycraft-decompose.md`:**
   - Line 61: "Each spec must be self-contained — a fresh Claude session should be able to execute it without reading the Feature Brief."
   - Line 120: "If `docs/templates/ATOMIC_SPEC_TEMPLATE.md` exists, reference it for the full template with additional guidance."
   - Line 122: "Fill in all sections — each spec must be self-contained (no \"see the brief for context\")"

3. **Phrasings in `src/claude-skills/joycraft-implement.md`:**
   - Line 32-36: "Parent brief: Linked in the spec's frontmatter (`> **Parent Brief:**` line). Read it for broader feature context." and "Related specs: Live in the same directory."

4. **Phrasings in `src/claude-skills/joycraft-bugfix.md`:**
   - No on-demand read patterns for docs

5. **Phrasings in `src/claude-skills/joycraft-research.md`:**
   - Line 85: "Take the subagent's response and write it to `docs/research/YYYY-MM-DD-feature-name.md`"
   - No on-demand read patterns

6. **Phrasings in `src/claude-skills/joycraft-design.md`:**
   - No explicit on-demand read patterns

The existing phrasings are primarily conditional ("If file exists") and referential ("reference it", "read it for"), not instructional ("consult when...", "see X for...").

---

## Q4: What templates exist under `src/templates/` and `templates/` that get installed into user projects, and which of them produce content that ends up referenced from CLAUDE.md?

**Templates in `/Users/compiler/Developer/joycraft/src/templates/`:**

These are bundled into user projects via `init.ts` and the TEMPLATES object in `bundled-files.ts`:

| Template Path | Destination in User Project | Cross-referenced | Purpose |
|---|---|---|---|
| `context/production-map.md` | `docs/templates/context/production-map.md` | Yes (in docs/context/) | Infrastructure/env reference |
| `context/dangerous-assumptions.md` | `docs/templates/context/dangerous-assumptions.md` | Yes (in docs/context/) | Agent safety knowledge |
| `context/decision-log.md` | `docs/templates/context/decision-log.md` | Yes (in docs/context/) | Architectural decisions |
| `context/institutional-knowledge.md` | `docs/templates/context/institutional-knowledge.md` | Yes (in docs/context/) | Team conventions |
| `context/troubleshooting.md` | `docs/templates/context/troubleshooting.md` | Yes (in docs/context/) | Diagnostic knowledge |
| `examples/example-brief.md` | `docs/templates/examples/example-brief.md` | No | Reference example |
| `examples/example-spec.md` | `docs/templates/examples/example-spec.md` | No | Reference example |
| `scenarios/README.md` | `docs/templates/scenarios/README.md` | No | Scenario framework docs |
| `scenarios/example-scenario.test.ts` | `docs/templates/scenarios/example-scenario.test.ts` | No | Test template |
| `scenarios/package.json` | `docs/templates/scenarios/package.json` | No | Dependencies |
| `scenarios/prompts/scenario-agent.md` | `docs/templates/scenarios/prompts/scenario-agent.md` | No | Agent instructions |
| `scenarios/workflows/generate.yml` | `docs/templates/scenarios/workflows/generate.yml` | No | GitHub Actions |
| `scenarios/workflows/run.yml` | `docs/templates/scenarios/workflows/run.yml` | No | GitHub Actions |
| `workflows/autofix.yml` | `docs/templates/workflows/autofix.yml` | No | GitHub Actions |
| `workflows/scenarios-dispatch.yml` | `docs/templates/workflows/scenarios-dispatch.yml` | No | GitHub Actions |
| `workflows/scenarios-rerun.yml` | `docs/templates/workflows/scenarios-rerun.yml` | No | GitHub Actions |
| `workflows/spec-dispatch.yml` | `docs/templates/workflows/spec-dispatch.yml` | No | GitHub Actions |

**Templates in `/Users/compiler/Developer/joycraft/templates/`:**

These are source-of-truth but NOT automatically bundled into user projects. They serve as reference material:

| Template | Purpose | User-facing |
|---|---|---|
| AGENTS_MD_TEMPLATE.md | Template for AGENTS.md generation | No (generated programmatically) |
| ASSESSMENT_TEMPLATE.md | Assessment framework for harness scoring | No |
| ATOMIC_SPEC_TEMPLATE.md | Spec structure reference | Yes (referenced from skills) |
| BOUNDARY_FRAMEWORK.md | Behavioral boundaries reference | No |
| CLAUDE_MD_TEMPLATE.md | Generated by init | No (programmatic) |
| DESIGN_SPEC_TEMPLATE.md | Design document structure | No |
| FEATURE_BRIEF_TEMPLATE.md | Brief structure reference | Yes (referenced from skills) |
| GOLDEN_EXAMPLE_TEMPLATE.md | Pipit example structure | No |
| IMPLEMENTATION_PLAN_TEMPLATE.md | Plan structure | No |
| INTERFACE_CONTRACTS_TEMPLATE.md | Contract structure | No |
| claude-kit/skills/* | Example skills from Joycraft | No |

**Cross-references in CLAUDE.md:**

Current CLAUDE.md does NOT reference any template files explicitly. The templates are referenced conditionally from within skills (e.g., "If `docs/templates/FEATURE_BRIEF_TEMPLATE.md` exists, reference it").

---

## Q5: For each skill in `src/claude-skills/` that produces a doc artifact, identify the exact instruction(s) inside the skill markdown that tell Claude to write a file.

**joycraft-new-feature.md:**
- Line 57-58: "Write a Feature Brief to `docs/briefs/YYYY-MM-DD-feature-name.md`. Create the `docs/briefs/` directory if it doesn't exist."
- Line 119: "For each row in the decomposition table, create a self-contained spec file at `docs/specs/<feature-name>/spec-name.md`."

**joycraft-research.md:**
- Line 37: "Write the questions to a temporary file at `docs/research/.questions-tmp.md`. Create the `docs/research/` directory if it doesn't exist."
- Line 85: "Take the subagent's response and write it to `docs/research/YYYY-MM-DD-feature-name.md`."
- Line 87: "Delete the temporary questions file (`docs/research/.questions-tmp.md`)."

**joycraft-design.md:**
- Line 32-33: "Create `docs/designs/` directory if it doesn't exist. Write the design document to `docs/designs/YYYY-MM-DD-feature-name.md`."
- Line 90: "Update the design document with their corrections and chosen options"

**joycraft-decompose.md:**
- Line 59: "For each approved row, create `docs/specs/<feature-name>/spec-name.md`."

**joycraft-implement.md:**
- No file-writing instructions (reads specs, implements code, hands off)

**joycraft-session-end.md:**
- Line 15: "If yes, create or update a discovery file at `docs/discoveries/YYYY-MM-DD-topic.md`. Create the `docs/discoveries/` directory if it doesn't exist."
- Line 45-51: References updating `docs/context/production-map.md`, `docs/context/dangerous-assumptions.md`, `docs/context/decision-log.md`, `docs/context/institutional-knowledge.md`
- Line 69-70: Update atomic spec status in `docs/specs/` files

**joycraft-bugfix.md:**
- Line 46-47: "Write a bug fix spec to `docs/specs/<feature-or-area>/bugfix-name.md`. Use the relevant feature name or area as the subdirectory."

**joycraft-interview.md:**
- Line 40: "Create a draft file at `docs/briefs/YYYY-MM-DD-topic-draft.md`. Create the `docs/briefs/` directory if it doesn't exist."

**joycraft-add-fact.md:**
- Line 53-114: Multiple instructions to write/append to `docs/context/production-map.md`, `docs/context/dangerous-assumptions.md`, `docs/context/decision-log.md`, `docs/context/institutional-knowledge.md`, `docs/context/troubleshooting.md`
- Line 148: "read CLAUDE.md, find the appropriate section (ALWAYS, ASK FIRST, or NEVER under Behavioral Boundaries), and append the rule"

---

## Q6: Do any of these skills currently emit YAML frontmatter when they write files?

**Finding frontmatter patterns:**

All skills that generate document content refer to frontmatter in the generated markdown. However, they do NOT instruct to emit YAML frontmatter. Instead, they use markdown blockquote syntax (> **Field:** value):

**joycraft-new-feature.md (lines 64-70):**
```markdown
> **Date:** YYYY-MM-DD
> **Project:** [project name]
> **Status:** Interview | Decomposing | Specs Ready | In Progress | Complete
```
This is markdown blockquote format, NOT YAML frontmatter.

**joycraft-decompose.md (lines 66-71):**
```markdown
> **Parent Brief:** `docs/briefs/YYYY-MM-DD-feature-name.md` (or "standalone")
> **Status:** Ready
> **Date:** YYYY-MM-DD
> **Estimated scope:** [1 session / N files / ~N lines]
```
Again, blockquote metadata, not YAML frontmatter.

**joycraft-session-end.md (lines 29-41):**
```markdown
# Discoveries — [topic]

**Date:** YYYY-MM-DD
**Spec:** [link to spec if applicable]
```
Plain markdown bold fields, not YAML frontmatter.

**joycraft-bugfix.md (lines 51-60):**
```markdown
> **Parent Brief:** none (bug fix)
> **Issue/Error:** [error message, issue link, or symptom description]
> **Status:** Ready
> **Date:** YYYY-MM-DD
> **Estimated scope:** [1 session / N files / ~N lines]
```
Blockquote metadata format.

**joycraft-interview.md (lines 44-50):**
```markdown
> **Date:** YYYY-MM-DD
> **Status:** DRAFT
> **Origin:** /joycraft-interview session
```
Blockquote format.

**Conclusion:** No skills emit YAML frontmatter (`---`). All use markdown blockquote (`>`) or bold markdown (`**`) for metadata. The skill files themselves have YAML frontmatter in their headers (e.g., `name:`, `description:`, `instructions:`), but generated artifacts do not.

---

## Q7: Are there shared instruction blocks, includes, or repeated phrasings across the doc-producing skills?

**Shared/repeated patterns found:**

1. **"Create directory if it doesn't exist" pattern:**
   - joycraft-new-feature.md line 57: "Create the `docs/briefs/` directory if it doesn't exist."
   - joycraft-research.md line 37: "Create the `docs/research/` directory if it doesn't exist."
   - joycraft-design.md line 32: "Create `docs/designs/` directory if it doesn't exist."
   - joycraft-decompose.md line 59: "Create the `docs/specs/<feature-name>/` directory if it doesn't exist."
   - joycraft-session-end.md line 15: "Create the `docs/discoveries/` directory if it doesn't exist."
   - joycraft-bugfix.md line 47: "Create the `docs/specs/<feature-or-area>/` directory if it doesn't exist."
   - joycraft-interview.md line 40: "Create the `docs/briefs/` directory if it doesn't exist."
   - joycraft-add-fact.md line 54: "If `docs/context/` does not exist, create the directory."

   **Pattern appears 8 times across skills**

2. **"Self-contained spec" philosophy:**
   - joycraft-new-feature.md line 121: "Each spec must be understandable WITHOUT reading the Feature Brief."
   - joycraft-decompose.md line 61: "Each spec must be self-contained — a fresh Claude session should be able to execute it without reading the Feature Brief."
   - joycraft-decompose.md line 122: "Fill in all sections — each spec must be self-contained (no \"see the brief for context\")."
   - joycraft-implement.md line 32: "Specs are designed to be self-contained"

   **Phrase appears 4 times across skills**

3. **Template reference pattern (conditional):**
   - joycraft-new-feature.md line 108: "If `docs/templates/FEATURE_BRIEF_TEMPLATE.md` exists, reference it for the full template with additional guidance."
   - joycraft-new-feature.md line 180: "If `docs/templates/ATOMIC_SPEC_TEMPLATE.md` exists, reference it for the full template with additional guidance."
   - joycraft-decompose.md line 120: "If `docs/templates/ATOMIC_SPEC_TEMPLATE.md` exists, reference it for the full template with additional guidance."

   **Template reference pattern appears 3 times**

4. **"Run /clear before next step" hand-off pattern:**
   - joycraft-new-feature.md line 220: "Run /clear before your next step — your artifacts are saved to files."
   - joycraft-decompose.md line 149: "Run /clear before your next step — your artifacts are saved to files."
   - joycraft-implement.md line 104: "Run `/clear` before starting the next step. Your artifacts are saved to files — this conversation context is disposable."
   - joycraft-session-end.md line 99: "Run /clear before your next step — your artifacts are saved to files."
   - joycraft-bugfix.md line 149: "Run /clear before your next step — your artifacts are saved to files."
   - joycraft-interview.md line 97: "Run /clear before your next step — your artifacts are saved to files."

   **Hand-off pattern appears 6 times**

5. **Discovery document format (joycraft-session-end.md only):**
   - Not repeated in other skills

6. **Context document routing (joycraft-add-fact.md):**
   - Unique to this skill

**No shared includes or templating system exists. Patterns are copy-pasted across skills.**

---

## Q8: What does `src/init.ts` scaffold in terms of the `docs/` subdirectory tree on a fresh `npx joycraft init`?

**Directory structure created by init.ts (lines 44-48):**

```
docs/
├── briefs/              (line 45: 'briefs')
├── specs/               (line 45: 'specs')
├── discoveries/         (line 45: 'discoveries')
├── contracts/           (line 45: 'contracts')
├── decisions/           (line 45: 'decisions')
├── context/             (line 45: 'context')
├── pipit-examples/      (line 45: 'pipit-examples')
└── templates/           (line 122-127: copied from bundled TEMPLATES)
    ├── context/
    │   ├── production-map.md
    │   ├── dangerous-assumptions.md
    │   ├── decision-log.md
    │   ├── institutional-knowledge.md
    │   └── troubleshooting.md
    ├── examples/
    │   ├── example-brief.md
    │   └── example-spec.md
    ├── scenarios/
    │   ├── README.md
    │   ├── example-scenario.test.ts
    │   ├── package.json
    │   ├── prompts/
    │   │   └── scenario-agent.md
    │   └── workflows/
    │       ├── generate.yml
    │       └── run.yml
    └── workflows/
        ├── autofix.yml
        ├── scenarios-dispatch.yml
        ├── scenarios-rerun.yml
        └── spec-dispatch.yml
```

**Starter content written:**

1. **pipit-examples/README.md** (lines 51-70): Describes golden examples for Pipit classification, explains optional nature of directory, format with YAML frontmatter (capture, classification, decomposition_summary, rationale)

2. **Templates copied verbatim** from bundled-files.ts TEMPLATES object

3. **No starter content in other directories** — they are created empty

**No .gitkeep files or placeholder content in empty directories.**

---

## Q9: What does `src/version.ts` do? Quote the entire file. What is the public API?

**Complete file `/Users/compiler/Developer/joycraft/src/version.ts`:**

```typescript
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const VERSION_FILE = '.joycraft-version';

export interface VersionInfo {
  version: string;
  files: Record<string, string>;
}

export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export function readVersion(dir: string): VersionInfo | null {
  const filePath = join(dir, VERSION_FILE);
  if (!existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (typeof parsed.version === 'string' && typeof parsed.files === 'object') {
      return parsed as VersionInfo;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeVersion(dir: string, version: string, files: Record<string, string>): void {
  const filePath = join(dir, VERSION_FILE);
  const data: VersionInfo = { version, files };
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/**
 * Detect the current Joycraft harness level for a project directory.
 * Returns 5 if Level 5 artifacts (autofix workflow + External Validation) are present, 4 otherwise.
 */
export function getLevel(dir: string): number {
  const hasAutofix = existsSync(join(dir, '.github', 'workflows', 'autofix.yml'));
  if (!hasAutofix) return 4;
  const claudeMdPath = join(dir, 'CLAUDE.md');
  if (!existsSync(claudeMdPath)) return 4;
  const content = readFileSync(claudeMdPath, 'utf-8');
  return content.includes('## External Validation') ? 5 : 4;
}
```

**Public API:**

1. **Interface `VersionInfo`:**
   - `version: string` — installed version string
   - `files: Record<string, string>` — mapping of file paths to SHA256 hashes

2. **Function `hashContent(content: string): string`** — Computes SHA256 hash of content. Used to track file changes.

3. **Function `readVersion(dir: string): VersionInfo | null`** — Reads `.joycraft-version`. Returns parsed VersionInfo or null if missing/invalid. Validates `version` and `files` fields.

4. **Function `writeVersion(dir: string, version: string, files: Record<string, string>): void`** — Writes `.joycraft-version` JSON file with 2-space indent + trailing newline.

5. **Function `getLevel(dir: string): number`** — Returns 5 if `.github/workflows/autofix.yml` exists AND `CLAUDE.md` contains `## External Validation`. Returns 4 otherwise.

---

## Q10: Where is `version.ts`'s output consumed?

**Grep results for imports of version functions:**

| File | Import | Line | Usage |
|---|---|---|---|
| `src/init.ts` | `import { writeVersion, hashContent } from './version.js';` | 9 | Writes version file after init |
| `src/upgrade.ts` | `import { readVersion, writeVersion, hashContent } from './version.js';` | 4 | Reads installed version, writes updated version |
| `src/cli.ts` | (indirect: version functions are called but not imported) | - | Uses version via hook script |

**src/init.ts (lines 152-164):**
```typescript
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

writeVersion(targetDir, '0.1.0', fileHashes);
```

**src/upgrade.ts (lines 4, 112, 135, 223):**
```typescript
import { readVersion, writeVersion, hashContent } from './version.js';
// ...
const versionInfo = readVersion(targetDir);
// ...
const installedHashes = versionInfo?.files ?? {};
// ...
writeVersion(targetDir, pkgVersion, newHashes);
```

**src/cli.ts (lines 54-61):** No direct import of version.ts; the version-check hook script (written by init.ts) reads `.joycraft-version` directly.

---

## Q11: Where does the "Joycraft 0.5.21 available (you have 0.1.0)" style nudge text get produced?

**Three locations produce this nudge:**

1. **src/init.ts (lines 169-180) — Hook script generated:**
   ```typescript
   const hookScript = `// Joycraft version check — runs on Claude Code session start
   import { readFileSync } from 'node:fs';
   import { join } from 'node:path';
   try {
     const data = JSON.parse(readFileSync(join(process.cwd(), '.joycraft-version'), 'utf-8'));
     const res = await fetch('https://registry.npmjs.org/joycraft/latest', { signal: AbortSignal.timeout(3000) });
     if (res.ok) {
       const latest = (await res.json()).version;
       if (data.version !== latest) console.log('Joycraft ' + latest + ' available (you have ' + data.version + '). Run: npx joycraft upgrade');
     }
   } catch {}
   `;
   ```
   - **Data sources:** `.joycraft-version` file (data.version) and npm registry fetch (latest.version)
   - **Written to:** `.claude/hooks/joycraft-version-check.mjs`
   - **Triggered on:** Claude Code SessionStart hook

2. **src/cli.ts (lines 70-93) — Post-action hook in CLI:**
   ```typescript
   const updateCheckPromise = (async (): Promise<string | null> => {
     try {
       const res = await fetch('https://registry.npmjs.org/joycraft/latest', {
         signal: AbortSignal.timeout(3000)
       });
       if (res.ok) {
         const latest = ((await res.json()) as { version: string }).version;
         if (latest !== pkg.version) {
           return `\nJoycraft ${latest} available (you have ${pkg.version}). Run: npm install -g joycraft`;
         }
       }
     } catch {
       // Silent — don't block or error on network issues
     }
     return null;
   })();

   program.hook('postAction', async () => {
     const message = await updateCheckPromise;
     if (message) {
       console.log(message);
     }
   });
   ```
   - **Data sources:** `package.json` (pkg.version) and npm registry fetch (latest.version)
   - **Triggered on:** Every CLI command completion (postAction hook)

3. **src/cli.ts (lines 50-67) — check-version command:**
   ```typescript
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
   ```

**Three nudge variants exist:**
- Hook (init.ts): "Joycraft [latest] available (you have [data.version]). Run: npx joycraft upgrade"
- CLI postAction (cli.ts): "Joycraft [latest] available (you have [pkg.version]). Run: npm install -g joycraft"
- check-version command (cli.ts): "Joycraft [latest] available (you have [data.version]). Run: npx joycraft upgrade"

---

## Q12: How does the project record its installed version on a user's machine after `npx joycraft init`?

**Where it is written:**

**File: `.joycraft-version` (at project root)**

Written by: `src/init.ts` line 164
```typescript
writeVersion(targetDir, '0.1.0', fileHashes);
```

Function: `src/version.ts` lines 31-35
```typescript
export function writeVersion(dir: string, version: string, files: Record<string, string>): void {
  const filePath = join(dir, VERSION_FILE);  // VERSION_FILE = '.joycraft-version'
  const data: VersionInfo = { version, files };
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}
```

**File format (JSON):**
```json
{
  "version": "0.1.0",
  "files": {
    ".claude/skills/joycraft-new-feature/SKILL.md": "sha256hash...",
    ".claude/skills/joycraft-research/SKILL.md": "sha256hash...",
    ...
  }
}
```

**Where it is read:**

1. **src/upgrade.ts line 112** — checks if project has been initialized:
   ```typescript
   const versionInfo = readVersion(targetDir);
   ```

2. **src/init.ts line 173 (in hook script)** — reads during Claude Code SessionStart:
   ```typescript
   const data = JSON.parse(readFileSync(join(process.cwd(), '.joycraft-version'), 'utf-8'));
   ```

3. **src/cli.ts line 56 (in check-version command)** — reads to compare versions:
   ```typescript
   const data = JSON.parse(readFileSync(join(process.cwd(), '.joycraft-version'), 'utf-8'));
   ```

**File content contains:**
- `version`: The installed Joycraft version (e.g., "0.1.0")
- `files`: Object mapping file paths to SHA256 hashes of managed files (skills and templates). Used during upgrade to detect whether user has customized files.

---

## Q13: How does the project determine the *current/latest* Joycraft version?

**Two sources exist:**

1. **For CLI tool (npx joycraft):**
   - **Source:** `package.json` file in the Joycraft CLI package
   - **Read in:** `src/cli.ts` line 7
   ```typescript
   const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
   ```
   - **Used in:** Line 78
   ```typescript
   if (latest !== pkg.version) {
     return `\nJoycraft ${latest} available (you have ${pkg.version}). Run: npm install -g joycraft`;
   }
   ```
   - **Fallback in upgrade.ts line 238:** Returns hardcoded `'0.1.0'` if reading fails:
   ```typescript
   function getPackageVersion(): string {
     try {
       // In bundled CLI, __dirname won't help — use a hardcoded fallback
       // The version is set in package.json and read at build time
       return '0.1.0';
     } catch {
       return '0.0.0';
     }
   }
   ```

2. **For installed projects (from npm registry):**
   - **Source:** npm registry API (`https://registry.npmjs.org/joycraft/latest`)
   - **Fetched in three places:**
     - **src/init.ts line 174:** Hook script generation
     - **src/cli.ts line 72:** Post-action hook
     - **src/cli.ts line 57:** check-version command
   - **Parsing:** `(await res.json()).version`

**Data flow for "latest version" detection:**

```
npm registry API
  → fetch('https://registry.npmjs.org/joycraft/latest')
  → JSON response: { version: "0.5.21", ... }
  → Extract: latest.version
  → Compare against installed version from .joycraft-version or package.json
```

---

## Q14: Is there any code path or default value where `0.1.0` appears as a literal string?

**Literal string "0.1.0" occurrences:**

1. **src/init.ts line 164:**
   ```typescript
   writeVersion(targetDir, '0.1.0', fileHashes);
   ```
   **Context:** Writing the initial version file when a project is first initialized. This is the hardcoded default installed version.

2. **src/upgrade.ts line 238:**
   ```typescript
   return '0.1.0';
   ```
   **Context:** In function `getPackageVersion()` (lines 234-242). Hardcoded fallback default:
   ```typescript
   function getPackageVersion(): string {
     try {
       // In bundled CLI, __dirname won't help — use a hardcoded fallback
       // The version is set in package.json and read at build time
       return '0.1.0';
     } catch {
       return '0.0.0';
     }
   }
   ```

**Only two literal occurrences of "0.1.0":**
- Both in TypeScript source files (init.ts and upgrade.ts)
- Not in markdown files or configuration
- The first is the initial version written to projects; the second is a fallback default in upgrade logic

---

## Q15: How is the version comparison wired into the CLI entry point and SessionStart hook flow?

**Version comparison in `src/upgrade.ts`:**

**Function `getPackageVersion()` (lines 234-242):**
```typescript
function getPackageVersion(): string {
  try {
    // In bundled CLI, __dirname won't help — use a hardcoded fallback
    // The version is set in package.json and read at build time
    return '0.1.0';
  } catch {
    return '0.0.0';
  }
}
```

**Used in:** Line 223 during upgrade process:
```typescript
writeVersion(targetDir, pkgVersion, newHashes);
```

This writes the current CLI version into the `.joycraft-version` file after upgrade completes — but the function unconditionally returns `'0.1.0'`, so even after upgrade the version file reads as 0.1.0.

---

**Version comparison in `src/cli.ts`:**

**1. Post-action hook (lines 70-93) — runs after every CLI command:**

```typescript
const updateCheckPromise = (async (): Promise<string | null> => {
  try {
    const res = await fetch('https://registry.npmjs.org/joycraft/latest', {
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const latest = ((await res.json()) as { version: string }).version;
      if (latest !== pkg.version) {
        return `\nJoycraft ${latest} available (you have ${pkg.version}). Run: npm install -g joycraft`;
      }
    }
  } catch {
    // Silent
  }
  return null;
})();

program.hook('postAction', async () => {
  const message = await updateCheckPromise;
  if (message) {
    console.log(message);
  }
});
```

**Data flow:**
- Compares `pkg.version` (from package.json, line 7) against `latest` (from npm registry)
- If versions differ, prints nudge message
- Runs in parallel with CLI command for performance

**2. Check-version command (lines 50-67):** See Q11 quote.

---

**SessionStart hook flow (written by init.ts lines 169-180):**

The version check hook is written as a JavaScript file to `.claude/hooks/joycraft-version-check.mjs`. See Q11 for the source.

This hook is registered in `.claude/settings.json` (lines 198-217):

```typescript
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
```

**Wiring summary:**

| Trigger | Source | Compare Against | Nudge Format | Condition |
|---|---|---|---|---|
| SessionStart (hook) | `.joycraft-version` (data.version) | npm registry (latest) | "Joycraft [latest] available (you have [data.version]). Run: npx joycraft upgrade" | data.version !== latest |
| CLI postAction | `package.json` (pkg.version) | npm registry (latest) | "Joycraft [latest] available (you have [pkg.version]). Run: npm install -g joycraft" | pkg.version !== latest |
| check-version command | `.joycraft-version` (data.version) | npm registry (latest) | "Joycraft [latest] available (you have [data.version]). Run: npx joycraft upgrade" | data.version !== latest |

**Key observation:** The version bug stems from two places hardcoding `'0.1.0'`:
- `src/init.ts:164` — writes 0.1.0 into `.joycraft-version` regardless of which CLI version performed the init
- `src/upgrade.ts:238` — `getPackageVersion()` unconditionally returns 0.1.0, so even `joycraft upgrade` does not fix the stale version stamp

The CLI's own `pkg.version` (from package.json, used in cli.ts postAction) is correct, but `.joycraft-version` is never written with that real value. The SessionStart hook reads `.joycraft-version` (always 0.1.0) and compares against npm-registry latest (0.5.21), producing the spurious nudge on every session start.

---

# Zone D Research: Deferral Language Audit

**Date:** 2026-05-09

## D1: Brief deferral sections

### `docs/briefs/2026-03-23-joysmith-cli-plugin.md`
**Section:** `## Out of Scope`
- NOT: Writing project-specific specs, features, or code
- NOT: Running tests or CI/CD
- NOT: MCP server
- NOT: Web UI or dashboard
- NOT: Hosting or cloud features
- NOT: Building external scenarios for the user
- NOT: Integration with specific CI providers
- NOT: Automated Level 5 features (spec queues, autonomous feedback loops)

### `docs/briefs/2026-03-25-incremental-knowledge-capture.md`
**Section:** `## Out of Scope`
- NOT: Automatic fact extraction from conversation
- NOT: Fact confidence decay or staleness tracking
- NOT: Integration with specific hardware toolchains
- NOT: Rewriting the entire settings.json merge logic

### `docs/briefs/2026-03-26-bugfix-workflow-skill.md`
**Section:** `## Out of Scope`
- NOT: A generic `/joycraft-fix` catchall
- NOT: Changes to `/joycraft-new-feature`
- NOT: Automated bug detection or triage
- NOT: Integration with issue trackers

### `docs/briefs/2026-03-26-plugin-migration-draft.md`
**Section:** `## Why Not Now`
- The Claude Code plugin system may still be evolving
- Current approach works and is battle-tested
- Plugin migration is a breaking change for existing users (skill names change)
- Need to understand plugin distribution

**Section:** `## Open Questions`
- How are plugins distributed?
- Can a plugin also install project-level files?
- What's the upgrade story for plugins vs. current npx joycraft upgrade?
- How do we handle the migration for existing users?

### `docs/briefs/2026-03-26-role-separation-subagents-draft.md`
**Section:** `## Open Questions`
- How much can subagent instructions actually constrain behavior?
- Does Claude Code's teammate feature give us enough isolation?
- Can a Joycraft skill effectively "launch" a constrained subagent?
- What's the handoff format between planner and implementer?
- How does the open-source model angle play in?

### `docs/briefs/2026-03-26-shared-github-app.md`
**Section:** `## Open Questions`
- Where to host the backend?
- How to handle rate limits on token generation?
- Do we need a database or can we be stateless?
- Pricing implications?

### `docs/briefs/2026-03-26-stack-aware-scenario-testing-draft.md`
**Section:** `## Open Questions`
- How does the QA agent get a URL to test against?
- Maestro YAML generation quality validation?
- Should Joycraft detect whether Playwright/Maestro is installed?
- How do we handle auth flows in scenario tests?
- Visual regression handling?
- What about Expo?
- CI cost guidance?

**Section:** `## Out of Scope (for now)`
- Building a testing tool
- Desktop app testing
- Physical device testing
- Performance/load testing
- Flaky test detection/healing

### `docs/briefs/2026-03-26-test-first-new-feature.md`
**Section:** `## Open Questions` — None remaining
**Section:** `## Out of Scope (for now)`
- Multi-agent orchestration
- Unsupervised test generation
- CI/CD integration

### `docs/briefs/2026-03-30-crispy-harness-upgrades.md`
**Section:** `## Non-Goals`
- Changing the atomic spec format
- Changing the implementation workflow
- Adding mandatory steps (research and design should be optional/skippable)
- Building an IDE/orchestrator

### `docs/briefs/2026-04-04-pipit-golden-examples.md`
**Section:** `## Out of Scope`
- NOT: Pipit-side classifier changes
- NOT: Auto-pruning or aging out old golden examples
- NOT: Cross-project golden examples
- NOT: Using golden examples for fine-tuning
- NOT: User confirmation before saving
- NOT: Golden example quality scoring or validation

### `docs/briefs/2026-04-06-codex-skills-support.md`
**Section:** `## Out of Scope`
- NOT: Codex plugin distribution
- NOT: agents/openai.yaml UI metadata per skill
- NOT: Script directories alongside skills
- NOT: Codex-specific templates in docs/templates/
- NOT: Changes to AGENTS.md generation
- NOT: Auto-detection of which tool the user is running

### `docs/briefs/2026-04-06-readme-and-workflow-improvements.md`
**Section:** `## Out of Scope`
- NOT: Skill invocation evals
- NOT: Skill analytics/telemetry
- NOT: Changes to the post-init flow or tune skill
- NOT: Docs site
- NOT: Renaming the joycraft-design skill

### `docs/briefs/2026-04-06-token-discipline.md`
**Section:** `## Out of Scope`
- NOT: /joycraft-implement skill
- NOT: Active waste prevention
- NOT: API-level token optimization
- NOT: Claude Desktop users
- NOT: Building our own "stupid button" diagnostic
- NOT: Conversation length warnings or auto-clear
- NOT: Hook output size measurement

### `docs/briefs/2026-04-06-readme-and-workflow-improvements-draft.md`
**Section:** `## Out of Scope (for now)`
- Skill invocation evals (testing whether Claude auto-invokes skills)
- Skill analytics/telemetry
- Changes to the post-init flow or tune skill
- Docs site

### `docs/briefs/2026-04-06-upgrade-nudge-in-skills-draft.md`
**Section:** `## Open Questions`
- Should `.joycraft-update-available` be gitignored?

**Section:** `## Out of Scope (for now)`
- Auto-upgrading without user consent
- Checking for updates on every skill invocation
- In-place hot-reloading of hooks/CLAUDE.md mid-session
- Version pinning or "skip this version" functionality

### `docs/briefs/2026-04-06-token-discipline-draft.md`
**Section:** `## Open Questions`
- What's the right threshold for "your CLAUDE.md is too big"?
- Can we programmatically count MCP tool definitions?
- Should `/joycraft-optimize` be part of `/tune` or standalone?
- Should we suggest specific token counts in the nudges?

**Section:** `## Out of Scope (for now)`
- Active waste prevention
- API-level token optimization
- Claude Desktop users
- Building our own "stupid button" diagnostic
- Conversation length warnings or auto-clear

### `docs/briefs/2026-04-07-level5-skill-evals-draft.md`
**Section:** `## Open Questions`
- What's the right set of natural language prompts per skill?
- How do we parse Claude Code output to detect which skill was invoked?
- Should scenarios test against a minimal fixture project or a copy of Joycraft itself?
- How long does a single skill invocation eval take?
- Should we test both explicit `/slash` invocation AND organic natural language invocation?
- How do we handle nondeterminism?

**Section:** `## Out of Scope (for now)`
- Skill analytics/telemetry
- Skill invocation evals as a Joycraft feature for users
- Multi-model testing

### `docs/briefs/2026-04-07-scenario-template-substitution.md`
**Section:** `## Out of Scope`
- Automating `gh repo create` for the scenarios repo
- Automating secret configuration
- Fixing the Node.js 20 deprecation warning

### `docs/briefs/2026-04-07-skill-analytics-draft.md`
**Status:** DRAFT (DEFERRED)

**Section:** `## Why This Is Deferred`
- Network calls in an OSS tool are a non-starter
- Would violate user trust
- Could work as strictly opt-in with clear disclosure, local-only analytics, or separate paid feature

**Section:** `## Out of Scope`
Everything. This brief exists to capture the idea and the reasoning for deferral.

### `docs/briefs/2026-05-09-collaborative-mode-draft.md`
**Section:** `## Open Questions (for /joycraft-research to resolve)` — pointer format, skill internals, version bug, deferral audit

**Section:** `## Open Questions (for /joycraft-design to resolve)` — backlog↔brief integration, backlog frontmatter schema, promotion mechanism

**Section:** `## Out of Scope (for now)`
- Coordination tooling (collision detection)
- Nested CLAUDE.md auto-loading
- Multi-repo joycraft
- Renaming `/tune` to `/setup`
- Any kind of search index or doc database

---

## D2: Design deferral sections

### `docs/designs/2026-04-07-auto-generate-bundled-files.md`
**Section:** `## Section 5: Open Questions` — None — all questions resolved.
No "Out of Scope" section.

---

## D3: Spec deferral sections

Audited all 70 specs in `docs/specs/`. **No spec contains an explicit `## Out of Scope` or `## Open Questions` section header.** The atomic spec template does not prescribe these sections. Deferral language appears only as inline mentions in acceptance criteria, edge cases, or notes (e.g., "Out of scope — handled by the existing autofix loop on subsequent PRs").

---

## D4: Phrase frequency in `docs/`

Grouped by phrase (file:line + quoted context):

### "defer" / "deferred" / "deferral"
- `docs/research/plugin-architecture.md:4` — "Status: Research complete, implementation deferred (Phase 5)"
- `docs/research/plugin-architecture.md:53` — "## Decision: Defer to Phase 5"
- `docs/briefs/2026-03-25-incremental-knowledge-capture.md:9` — "[tempting but deferred]" (Out of Scope section)
- `docs/briefs/2026-05-09-collaborative-mode-draft.md:15` — "they were just changes I'd been deferring"
- `docs/briefs/2026-05-09-collaborative-mode-draft.md:106` — "Backlog convention: new `docs/backlog/` folder, one file per deferred item"
- `docs/briefs/2026-05-09-collaborative-mode-draft.md:112` — "Renaming `/tune` → `/setup` (defer; current name signals 'ongoing' which is correct)"
- `docs/briefs/2026-05-09-collaborative-mode-draft.md:117` — "Defer to package README for 'what is joycraft'"
- `docs/briefs/2026-04-07-skill-analytics-draft.md:4` — "Status: DRAFT (DEFERRED)"
- `docs/briefs/2026-04-07-skill-analytics-draft.md:19` — "## Why This Is Deferred"

### "Out of Scope" / "out of scope"
- 16 briefs contain this section (listed in D1)
- `docs/templates/examples/example-brief.md:32` — "## Out of Scope"

### "Future work" / "future"
- `docs/briefs/2026-04-04-pipit-golden-examples.md:17` — "Pipit's role (future, out of scope) is read-only"
- `src/claude-skills/joycraft-session-end.md` — "future work" reference in discoveries context

### "TBD"
- `docs/briefs/2026-04-06-token-discipline.md:83` — "Codex equivalent TBD"
- `docs/specs/2026-03-26-add-bugfix-spec-template.md:63` — "Root Cause section should say 'TBD — diagnosed during implementation'"

### "open questions" / "Open Questions"
- 9 briefs contain this section (listed in D1)
- `docs/designs/2026-04-07-auto-generate-bundled-files.md:116` — states "None — all questions resolved"

### "TODO"
- Appears only in skill markdown as instruction boilerplate, not as deferral marker

### "pick up"
- `docs/briefs/2026-04-06-upgrade-nudge-in-skills-draft.md:31` — casual usage, not deferral
- `docs/specs/2026-03-26-register-bugfix-skill-in-init.md:66` — casual usage, not deferral

### "punted" / "later sprint" / "next sprint" / "follow-up" / "not now"
- **No matches found in `docs/`.**

---

## D5: Phrase usage in skills/templates

### Skills (`src/claude-skills/`)

**joycraft-interview.md:**
- "What's NOT in scope? What's tempting but should be deferred?"
- "## Out of Scope (for now)" section header with boilerplate "[things explicitly deferred]"

**joycraft-new-feature.md:**
- "## Out of Scope" section with "- NOT: [tempting but deferred]"

**joycraft-session-end.md:**
- "This edge case needs handling in a future spec — deferred work with context"
- "Impact: [what this means for future work]"

**joycraft-design.md / joycraft-research.md / joycraft-implement.md / joycraft-bugfix.md:** No deferral instructions.

### Templates (`templates/` and `src/templates/`)

**FEATURE_BRIEF_TEMPLATE.md (lines 33-39):**
```
## Out of Scope

What this feature explicitly does NOT include. Be generous — aggressive scoping is what makes atomic specs work.

- NOT: [tempting but deferred]
- NOT: [related but separate]
- NOT: [nice-to-have that would bloat scope]
```

**DESIGN_SPEC_TEMPLATE.md (lines 72-76):**
```
## 7. Out of Scope (REQUIRED)

What this spec explicitly does NOT cover. Prevents scope creep during implementation.

- NOT: [thing that's tempting but deferred]
- NOT: [related feature that's a separate spec]
```

**ATOMIC_SPEC_TEMPLATE.md:** Does NOT prescribe "Out of Scope" or "Open Questions" sections.

**BOUNDARY_FRAMEWORK.md:** No deferral language.

---

## D6: Template prescriptions

See D5 quotes. Summary:
- `FEATURE_BRIEF_TEMPLATE.md` prescribes `## Out of Scope`
- `DESIGN_SPEC_TEMPLATE.md` prescribes `## 7. Out of Scope (REQUIRED)`
- `ATOMIC_SPEC_TEMPLATE.md` prescribes neither
- No template prescribes `## Open Questions` (though briefs commonly grow one organically)

---

## D7: Skill instructions for deferral

**joycraft-interview.md:**
- "What's NOT in scope? What's tempting but should be deferred?"
- "Ask about deferral: 'What's tempting but should be deferred or handled in a separate effort?'"
- Boilerplate: "[things explicitly deferred]"

**joycraft-new-feature.md:**
- "## Out of Scope" section with "- NOT: [tempting but deferred]"

**joycraft-design.md:** No explicit deferral instructions.
**joycraft-research.md:** No explicit deferral instructions.
**joycraft-session-end.md:** Mentions "deferred work" only in context of discoveries, not as a captured artifact.
**joycraft-implement.md:** None.
**joycraft-bugfix.md:** None.

---

## D8: Counts

### Briefs (`docs/briefs/`)
**Total briefs:** 21
- With "Out of Scope" section: **16 of 21**
- With "Open Questions" section: **9 of 21**
- With "Why Not Now" or "Why This Is Deferred" section: **2 of 21** (plugin-migration-draft, skill-analytics-draft)

### Designs (`docs/designs/`)
**Total designs:** 1
- With "Out of Scope" section: **0 of 1**
- With "Open Questions" section: **1 of 1** (states "None — all questions resolved")

### Specs (`docs/specs/`)
**Total specs:** 70
- With explicit "Out of Scope" or "Open Questions" section headers: **0 of 70**

---

## D9: Existing backlog artifacts

Grepped repo (case-insensitive) for `backlog`. **All hits are in the new draft brief itself** (`docs/briefs/2026-05-09-collaborative-mode-draft.md` lines 106, 127, 131, 133, 134).

**Finding:** The `backlog` concept is **proposed but not yet implemented** anywhere in the repo. No `docs/backlog/` directory exists. No backlog-typed artifacts exist. No skill, template, or CLI logic references a backlog.
