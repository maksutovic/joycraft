import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Ensure the project's tsconfig.json excludes `.pi/` from the TypeScript program.
 *
 * Why: when Pi is a selected harness, `init` installs `.pi/extensions/joycraft-pipeline.ts`
 * — real Pi runtime code that imports `@earendil-works/pi-coding-agent`, a package
 * the user's project does NOT (and shouldn't) depend on. A default TS toolchain
 * whose `include` globs `**​/*.ts` (e.g. create-next-app) would pull that file into
 * the program and fail `tsc`/`next build` on the missing import. The extension must
 * keep its `.ts` extension (Pi loads it as code), so the fix is to keep it out of
 * the user's program: add `.pi` to `exclude`.
 *
 * Transparency + safety contract (mirrors the "append over rewrite, surface the
 * change" principle):
 *   - Edits surgically by text insertion, preserving the user's comments and
 *     formatting — never round-trips through JSON.stringify (which would strip
 *     comments from a JSONC tsconfig).
 *   - Idempotent: a tsconfig already excluding `.pi` is left untouched.
 *   - Bails (returns a 'skipped' outcome with a reason) rather than risk writing
 *     malformed JSON when the file shape is too unusual to edit confidently. The
 *     caller surfaces the reason so the user can add the line by hand.
 */

export type TsconfigExcludeOutcome =
  | { status: 'added'; path: string }
  | { status: 'already-present'; path: string }
  | { status: 'no-tsconfig' }
  | { status: 'skipped'; reason: string };

const PI_EXCLUDE = '.pi';

/** Strip // and /* *​/ comments for analysis only (never for the written output). */
function stripJsonComments(text: string): string {
  // Remove block comments, then line comments. Good enough to test for an
  // existing `.pi` exclude entry; we never write this stripped form back.
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** True when the parsed (comment-stripped) config already excludes `.pi`. */
function alreadyExcludesPi(rawText: string): boolean {
  try {
    const parsed = JSON.parse(stripJsonComments(rawText)) as { exclude?: unknown };
    if (!Array.isArray(parsed.exclude)) return false;
    return parsed.exclude.some(
      (e) => typeof e === 'string' && (e === PI_EXCLUDE || e === './.pi' || e === '.pi/**'),
    );
  } catch {
    // Unparseable even after comment-stripping → treat as "not present" and let
    // the editor below decide whether it can safely insert.
    return false;
  }
}

/**
 * Insert `.pi` into an existing top-level `"exclude": [ ... ]` array, or add a
 * fresh `exclude` key, by surgical text edit. Returns the new text, or null if
 * the file shape is too ambiguous to edit safely (caller then skips + warns).
 */
function insertPiExclude(rawText: string): string | null {
  // Case A: an existing top-level `exclude` array. Match `"exclude"` followed by
  // `:` and the opening `[`, then inject `.pi` as the first element. Anchored to
  // the start of a line (after optional whitespace) so we don't match a nested
  // key named "exclude" inside compilerOptions.
  const excludeArrayRe = /("exclude"\s*:\s*\[)(\s*)/;
  if (excludeArrayRe.test(rawText)) {
    return rawText.replace(excludeArrayRe, (_m, open: string, ws: string) => {
      // Preserve whatever whitespace followed the bracket so formatting survives.
      const sep = ws.includes('\n') ? ws : ' ';
      return `${open}${sep}"${PI_EXCLUDE}",${ws.includes('\n') ? '' : ' '}`;
    });
  }

  // Case B: no `exclude` key. Add one right after the top-level `include` array
  // if present (keeps the two siblings together), else before the final closing
  // brace. Only attempt when there's exactly one top-level object.
  const includeArrayRe = /("include"\s*:\s*\[[^\]]*\])/;
  if (includeArrayRe.test(rawText)) {
    return rawText.replace(includeArrayRe, (m) => `${m},\n  "exclude": ["${PI_EXCLUDE}"]`);
  }

  // Case C: fall back to inserting before the last `}` in the file. Guard: there
  // must be a closing brace, and the content before it must end in something we
  // can comma-append to. To stay safe, only do this when the object is non-empty
  // (contains at least one `:`), otherwise bail.
  const lastBrace = rawText.lastIndexOf('}');
  if (lastBrace > 0 && rawText.slice(0, lastBrace).includes(':')) {
    const before = rawText.slice(0, lastBrace).replace(/\s*$/, '');
    const after = rawText.slice(lastBrace);
    const needsComma = !before.endsWith(',') && !before.endsWith('{');
    return `${before}${needsComma ? ',' : ''}\n  "exclude": ["${PI_EXCLUDE}"]\n${after}`;
  }

  return null;
}

/**
 * Add `.pi` to tsconfig.json's `exclude` so a Pi-selected install doesn't break
 * the user's `tsc`/build. No-op when there's no tsconfig, or it already excludes
 * `.pi`. See the module doc for the safety contract.
 */
export function ensurePiExcludedFromTsconfig(targetDir: string): TsconfigExcludeOutcome {
  const path = join(targetDir, 'tsconfig.json');
  if (!existsSync(path)) return { status: 'no-tsconfig' };

  let rawText: string;
  try {
    rawText = readFileSync(path, 'utf-8');
  } catch {
    return { status: 'skipped', reason: 'tsconfig.json could not be read' };
  }

  if (alreadyExcludesPi(rawText)) {
    return { status: 'already-present', path };
  }

  const updated = insertPiExclude(rawText);
  if (updated === null || updated === rawText) {
    return {
      status: 'skipped',
      reason:
        'could not safely edit tsconfig.json — add ".pi" to its "exclude" array manually so the Pi extension stays out of your TypeScript build',
    };
  }

  // Sanity gate: the edited text must still parse (after comment-stripping) and
  // must now actually exclude .pi. If either fails, do NOT write — bail and warn.
  if (!alreadyExcludesPi(updated)) {
    return {
      status: 'skipped',
      reason:
        'tsconfig.json edit could not be verified — add ".pi" to its "exclude" array manually',
    };
  }

  try {
    writeFileSync(path, updated, 'utf-8');
  } catch {
    return { status: 'skipped', reason: 'tsconfig.json could not be written' };
  }
  return { status: 'added', path };
}
