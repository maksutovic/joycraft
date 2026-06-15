import { createInterface } from 'node:readline';

/**
 * The AI coding harnesses Joycraft can install into a project. Each maps to a
 * hidden config dir and a skills install path:
 *   - claude → .claude/ (Claude Code)
 *   - codex  → .agents/ (OpenAI Codex)
 *   - pi     → .pi/     (Pi)
 *
 * Single source of truth: the menu, the parser, and the install gates in
 * init.ts all derive from this list so a new harness can't leave a path stale.
 */
export const HARNESSES = ['claude', 'codex', 'pi'] as const;
export type Harness = (typeof HARNESSES)[number];

/** Human-readable one-liner per harness, shown in the interactive menu. */
const HARNESS_LABELS: Record<Harness, string> = {
  claude: 'Claude Code (.claude/)',
  codex: 'OpenAI Codex (.agents/)',
  pi: 'Pi (.pi/)',
};

function isHarness(value: string): value is Harness {
  return (HARNESSES as readonly string[]).includes(value);
}

/**
 * Sanitize an arbitrary value (e.g. parsed from state.json) into a harness list,
 * dropping anything unrecognized rather than rejecting the whole list — old or
 * hand-edited state must degrade gracefully. Returns null when the input isn't
 * an array at all (caller treats null as "no recorded selection"). Order follows
 * the canonical HARNESSES order and is deduped.
 */
export function sanitizeHarnesses(value: unknown): Harness[] | null {
  if (!Array.isArray(value)) return null;
  const present = new Set(
    value.filter((v): v is string => typeof v === 'string').map((v) => v.trim().toLowerCase())
  );
  return HARNESSES.filter((h) => present.has(h));
}

/**
 * Parse a comma/space-separated answer into a deduped, validated harness list.
 * Returns null when any token is unrecognized so the caller can re-ask rather
 * than silently dropping a typo. An empty answer yields an empty array (the
 * "install nothing" case the caller handles explicitly).
 */
export function parseHarnessSelection(answer: string): Harness[] | null {
  const tokens = answer
    .split(/[,\s]+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);

  // "all" is a convenience alias for every harness.
  if (tokens.length === 1 && tokens[0] === 'all') {
    return [...HARNESSES];
  }

  const selected: Harness[] = [];
  for (const token of tokens) {
    if (!isHarness(token)) return null;
    if (!selected.includes(token)) selected.push(token);
  }
  return selected;
}

/**
 * Interactive multi-select for which harnesses to install. An empty answer is a
 * deliberate "none" — the caller prints the run-again message and bails. An
 * unrecognized token re-asks instead of being coerced.
 */
async function promptHarnesses(): Promise<Harness[]> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log('\nWhich AI harnesses should Joycraft install?');
  for (const h of HARNESSES) {
    console.log(`  ${h.padEnd(7)} — ${HARNESS_LABELS[h]}`);
  }
  return new Promise((resolve) => {
    const ask = (): void => {
      rl.question('Harnesses [comma-separated, or "all"] (none): ', (answer) => {
        const parsed = parseHarnessSelection(answer);
        if (parsed !== null) {
          rl.close();
          resolve(parsed);
          return;
        }
        console.log(
          `Unrecognized harness in '${answer.trim()}' — choose from ${HARNESSES.join(', ')} (comma-separated), or leave empty for none.`
        );
        ask();
      });
    };
    ask();
  });
}

/**
 * Resolve which harnesses to install:
 *   - interactive (TTY): show the multi-select menu; honor an empty "none"
 *   - non-interactive: install all three, preserving long-standing init behavior
 *     for scripted/CI runs that can't answer a prompt.
 */
export async function resolveHarnesses(interactive: boolean): Promise<Harness[]> {
  if (interactive) {
    return promptHarnesses();
  }
  return [...HARNESSES];
}
