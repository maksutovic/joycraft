// Migration module — moves flat docs/{briefs,research,designs,specs/<feature>} layouts
// into per-feature folders at docs/features/<slug>/{brief,research,design,specs/}.
// Plan-then-apply split so callers can render a summary before mutating the filesystem.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs';
import { join } from 'node:path';

export type MoveKind = 'brief' | 'research' | 'design' | 'specs-dir';

export interface Move {
  from: string;
  to: string;
  kind: MoveKind;
}

export interface MigrationPlan {
  moves: Move[];
  slugs: string[];
  orphans: { specsDirs: string[] };
  skipped?: Move[];
}

export interface MigrationResult {
  applied: number;
  skipped: number;
  errors: Array<{ move: Move; error: string }>;
}

const DATE_PREFIX_RE = /^\d{4}-\d{2}-\d{2}-(.+)$/;

function deriveSlug(filename: string): string {
  return filename.replace(/\.md$/, '');
}

function slugWithoutDate(slug: string): string | null {
  const m = slug.match(DATE_PREFIX_RE);
  return m ? m[1] : null;
}

function listMdFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir).filter(f => f.endsWith('.md'));
  } catch {
    return [];
  }
}

function listSubdirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir).filter(name => {
      try {
        return statSync(join(dir, name)).isDirectory();
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

export function planMigration(projectDir: string): MigrationPlan {
  const briefsDir = join(projectDir, 'docs', 'briefs');
  const researchDir = join(projectDir, 'docs', 'research');
  const designsDir = join(projectDir, 'docs', 'designs');
  const specsDir = join(projectDir, 'docs', 'specs');

  const moves: Move[] = [];
  const skipped: Move[] = [];
  const slugSet = new Set<string>();

  // Briefs
  for (const file of listMdFiles(briefsDir)) {
    const slug = deriveSlug(file);
    slugSet.add(slug);
    const move: Move = {
      from: join(briefsDir, file),
      to: join(projectDir, 'docs', 'features', slug, 'brief.md'),
      kind: 'brief',
    };
    if (existsSync(move.to)) skipped.push(move);
    else moves.push(move);
  }

  // Research
  for (const file of listMdFiles(researchDir)) {
    const slug = deriveSlug(file);
    slugSet.add(slug);
    const move: Move = {
      from: join(researchDir, file),
      to: join(projectDir, 'docs', 'features', slug, 'research.md'),
      kind: 'research',
    };
    if (existsSync(move.to)) skipped.push(move);
    else moves.push(move);
  }

  // Designs
  for (const file of listMdFiles(designsDir)) {
    const slug = deriveSlug(file);
    slugSet.add(slug);
    const move: Move = {
      from: join(designsDir, file),
      to: join(projectDir, 'docs', 'features', slug, 'design.md'),
      kind: 'design',
    };
    if (existsSync(move.to)) skipped.push(move);
    else moves.push(move);
  }

  // Spec dirs — match by exact slug or date-stripped slug
  const briefSlugs = Array.from(slugSet);
  const orphanSpecsDirs: string[] = [];

  for (const subdir of listSubdirs(specsDir)) {
    let matchedSlug: string | null = null;

    if (briefSlugs.includes(subdir)) {
      matchedSlug = subdir;
    } else {
      // Look for a brief slug whose date-stripped form matches this subdir
      for (const slug of briefSlugs) {
        if (slugWithoutDate(slug) === subdir) {
          matchedSlug = slug;
          break;
        }
      }
    }

    if (matchedSlug) {
      const move: Move = {
        from: join(specsDir, subdir),
        to: join(projectDir, 'docs', 'features', matchedSlug, 'specs'),
        kind: 'specs-dir',
      };
      if (existsSync(move.to)) skipped.push(move);
      else moves.push(move);
    } else {
      orphanSpecsDirs.push(subdir);
    }
  }

  const plan: MigrationPlan = {
    moves,
    slugs: Array.from(slugSet),
    orphans: { specsDirs: orphanSpecsDirs },
  };
  if (skipped.length > 0) plan.skipped = skipped;
  return plan;
}

function moveFsItem(from: string, to: string): void {
  mkdirSync(join(to, '..'), { recursive: true });
  try {
    renameSync(from, to);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'EXDEV') {
      cpSync(from, to, { recursive: true });
      rmSync(from, { recursive: true, force: true });
    } else {
      throw err;
    }
  }
}

export function applyMigration(plan: MigrationPlan): MigrationResult {
  let applied = 0;
  let skipped = (plan.skipped?.length) ?? 0;
  const errors: Array<{ move: Move; error: string }> = [];

  for (const move of plan.moves) {
    if (existsSync(move.to)) {
      skipped++;
      continue;
    }
    if (!existsSync(move.from)) {
      errors.push({ move, error: `Source missing: ${move.from}` });
      continue;
    }
    try {
      moveFsItem(move.from, move.to);
      applied++;
    } catch (err) {
      errors.push({ move, error: (err as Error).message });
    }
  }

  return { applied, skipped, errors };
}
