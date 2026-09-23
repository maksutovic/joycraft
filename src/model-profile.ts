import type { Harness } from './harness.js';

/**
 * The Fable 5.1 model profile: one reference doc (D1), installed only for the
 * harnesses that run Claude models (D6), and pointed at by one Context Map row
 * in the project's memory file.
 *
 * This module is the single home of the eligible-harness list. The template
 * gate in `bundle-inventory.ts` and the memory-file row gate both read it, so a
 * project never points at a doc it did not receive.
 */

/** `TEMPLATES` key (path relative to `src/templates/`). */
export const MODEL_PROFILE_TEMPLATE_KEY = 'reference/model-profile-claude-fable-5-1.md';

/** Installed project-relative path. */
export const MODEL_PROFILE_PATH = `docs/templates/${MODEL_PROFILE_TEMPLATE_KEY}`;

/** D6: keyed to the model, not the harness. Pi and omp run Claude models; Codex and Copilot do not. */
export const MODEL_PROFILE_HARNESSES: readonly Harness[] = Object.freeze(['claude', 'pi', 'omp'] as const);

/** The one Context Map row. A pointer only; no profile text is copied. */
export const MODEL_PROFILE_CONTEXT_MAP_ROW =
  `| \`${MODEL_PROFILE_PATH}\` | Working with Claude Fable 5.1 — finishing whole tasks, scope, progress updates, prose |`;

/** True when the selection includes a harness that receives the profile doc. */
export function selectsModelProfile(harnesses: readonly Harness[]): boolean {
  return harnesses.some((harness) => MODEL_PROFILE_HARNESSES.includes(harness));
}
