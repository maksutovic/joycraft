// Check-shaped folder map (D6).
//
// The generated architecture section is derived from the real filesystem
// instead of a hand-maintained tree: a pure walk emits top-level folders (plus
// key subfolders) with one-line descriptions inside sentinel markers, so init
// and upgrade can regenerate structure while preserving human wording, and
// tune can diff the doc against the tree and report drift instead of letting a
// stale map mislead an agent.

import { readdirSync } from 'node:fs';
import { join } from 'node:path';

export const FOLDER_MAP_OPEN = '<!-- joycraft:folder-map -->';
export const FOLDER_MAP_CLOSE = '<!-- /joycraft:folder-map -->';
export const FOLDER_MAP_PLACEHOLDER = '_TODO: one line on what lives here_';

/** Row cap — past this scale the answer is nested instruction files, not a bigger map. */
const MAX_ROWS = 30;

/** Dirs that are dependency, build-output, VCS, or cache noise — never mapped. */
const SKIPPED_DIRS = new Set([
  'node_modules', 'dist', 'build', 'out', 'coverage', 'target', 'vendor',
  '__pycache__', 'venv', '.venv', 'tmp', 'temp',
]);

/** Top-level dirs whose immediate subfolders are worth a row of their own. */
const KEY_PARENTS = new Set(['src', 'docs']);

/** Descriptions the generator can actually know — everything else gets the placeholder. */
const KNOWN_DESCRIPTIONS: Record<string, string> = {
  'src/': 'Source code',
  'docs/': 'Documentation',
  'tests/': 'Test suite',
  'test/': 'Test suite',
  'scripts/': 'Maintenance and build scripts',
  'templates/': 'Templates',
  'public/': 'Static assets served as-is',
  'assets/': 'Static assets',
  'examples/': 'Usage examples',
  'packages/': 'Monorepo packages',
  'apps/': 'Monorepo applications',
  'config/': 'Configuration',
  'docs/context/': 'Knowledge layer — operational fact-docs and reference',
  'docs/features/': 'Per-feature briefs, designs, and atomic specs',
  'docs/discoveries/': 'Session surprises worth remembering',
  'docs/templates/': 'Bundled output and reference templates',
  'docs/backlog/': 'Deferred work, one file per item',
  'docs/research/': 'Research notes and findings',
};

function listDirs(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !SKIPPED_DIRS.has(e.name))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

/** Folder paths (POSIX, trailing slash) the map covers, deterministic for a given tree. */
export function walkFolders(dir: string): { folders: string[]; capped: boolean } {
  // Top-level folders first, then key subfolders — so a cap cuts depth, never breadth.
  const tops = listDirs(dir);
  const folders = tops.map((top) => `${top}/`);
  for (const top of tops) {
    if (KEY_PARENTS.has(top)) {
      for (const sub of listDirs(join(dir, top))) {
        folders.push(`${top}/${sub}/`);
      }
    }
  }
  const capped = folders.length > MAX_ROWS;
  return { folders: capped ? folders.slice(0, MAX_ROWS) : folders, capped };
}

function parseRows(block: string): Map<string, string> {
  const rows = new Map<string, string>();
  for (const line of block.split('\n')) {
    const match = line.match(/^\| `([^`]+)` \| (.*) \|$/);
    if (match) rows.set(match[1], match[2]);
  }
  return rows;
}

/**
 * The sentinel-delimited map block. When `existingBlock` is given, human
 * descriptions for surviving folders are preserved — the machine owns
 * structure, the human owns wording.
 */
export function renderFolderMap(dir: string, existingBlock?: string): string {
  const { folders, capped } = walkFolders(dir);
  const previous = existingBlock ? parseRows(existingBlock) : new Map<string, string>();

  const lines = [FOLDER_MAP_OPEN, '| Folder | What lives here |', '|--------|-----------------|'];
  for (const folder of folders) {
    const description = previous.get(folder) ?? KNOWN_DESCRIPTIONS[folder] ?? FOLDER_MAP_PLACEHOLDER;
    lines.push(`| \`${folder}\` | ${description} |`);
  }
  if (capped) {
    lines.push('', `_Capped at ${MAX_ROWS} rows — this tree is past root-map scale; use the growth path below._`);
  }
  lines.push(
    '',
    'Past multi-team scale, replace this root map with nested per-directory instruction files (`joycraft-collaborative-setup`) — never a bigger tree.',
    FOLDER_MAP_CLOSE,
  );
  return lines.join('\n');
}

const BLOCK_RE = new RegExp(`${FOLDER_MAP_OPEN}[\\s\\S]*?${FOLDER_MAP_CLOSE}`);

/**
 * Regenerate the map block in place (preserving human wording), or append an
 * `## Architecture` section carrying it when the document has none. A
 * hand-written architecture section without markers is user prose — untouched.
 */
export function ensureFolderMapSection(markdown: string, dir: string): string {
  const existingBlock = markdown.match(BLOCK_RE)?.[0];
  if (existingBlock) {
    return markdown.replace(BLOCK_RE, renderFolderMap(dir, existingBlock));
  }
  if (/^## .*architecture/im.test(markdown)) return markdown;
  return `${markdown.trimEnd()}\n\n## Architecture\n\n${renderFolderMap(dir)}\n`;
}

/**
 * Structure-only drift between the document's map block and the real tree —
 * description wording (including unfilled placeholders) never counts as drift.
 * Null when the document carries no map block.
 */
export function diffFolderMap(markdown: string, dir: string): { added: string[]; removed: string[] } | null {
  const block = markdown.match(BLOCK_RE)?.[0];
  if (!block) return null;
  const documented = new Set(parseRows(block).keys());
  const actual = new Set(walkFolders(dir).folders);
  return {
    added: [...actual].filter((f) => !documented.has(f)),
    removed: [...documented].filter((f) => !actual.has(f)),
  };
}
