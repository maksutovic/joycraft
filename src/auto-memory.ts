import { createInterface } from 'node:readline';

/**
 * Claude Code's auto-memory offer (curated-harness WS6).
 *
 * A Joycraft project and Claude Code auto-memory are two homes for the same
 * class of fact — the ONE_HOME condition `/joycraft-optimize` exists to flag.
 * The in-repo curated layer (AGENTS.md, decision log, discoveries + Reaper) is
 * reviewable, versioned and shared; per-machine auto-memory is none of those.
 * So init offers to turn auto-memory off — but only ever:
 *
 *   - for THIS project (`./.claude/settings.json`), never `~/.claude/`, so the
 *     user's other projects are untouched;
 *   - interactively, defaulting to no change — never a silent write;
 *   - when the key is absent, so an explicit user value is never clobbered.
 *
 * This module owns the question and the pure answer parser. The guarded write
 * itself lives with init's other `settings.json` merges so the file is read and
 * written once.
 */

/** The Claude Code project-settings key this offer sets. */
export const AUTO_MEMORY_KEY = 'autoMemoryEnabled';

/**
 * Parse a yes/no answer. Empty takes the no-change default (`false`); an
 * unrecognized answer returns `null` so the caller re-asks rather than
 * coercing a typo into a config write.
 */
export function parseAutoMemoryAnswer(answer: string): boolean | null {
  const normalized = answer.trim().toLowerCase();
  if (normalized === '') return false;
  if (normalized === 'y' || normalized === 'yes') return true;
  if (normalized === 'n' || normalized === 'no') return false;
  return null;
}

/**
 * Ask the question, following the one-readline-per-prompt idiom used by
 * `harness.ts` and `gitignore.ts`. A stream that has already ended degrades to
 * the default rather than hanging — a configuration question must never abort
 * an init.
 */
function promptAutoMemory(): Promise<boolean> {
  console.log('\nJoycraft keeps project facts in one home: your repo.');
  console.log(
    '  Claude Code auto-memory is a second, per-machine home for the same facts.'
  );
  console.log(
    `  Disabling it for this project writes "${AUTO_MEMORY_KEY}": false to .claude/settings.json.`
  );
  console.log('  Your other projects are unaffected.');

  const input = process.stdin;
  if (input.readableEnded === true || input.destroyed === true) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const rl = createInterface({ input, output: process.stdout });
    let settled = false;
    const done = (value: boolean): void => {
      if (settled) return;
      settled = true;
      rl.close();
      resolve(value);
    };
    rl.once('close', () => done(false));
    const ask = (attempt: number): void => {
      rl.question('Disable auto-memory for this project? [y/N]: ', (answer) => {
        const parsed = parseAutoMemoryAnswer(answer);
        if (parsed !== null) {
          done(parsed);
          return;
        }
        // Repeated unparseable input takes the default rather than looping.
        if (attempt >= 4) {
          done(false);
          return;
        }
        console.log(`Unrecognized answer '${answer.trim()}' — type 'y' or 'n', or press Enter for no change.`);
        ask(attempt + 1);
      });
    };
    ask(0);
  });
}

/**
 * Resolve whether to disable auto-memory for this project.
 *   - interactive (TTY): ask, defaulting to no change
 *   - non-interactive: skip entirely — no prompt, no write
 */
export async function resolveAutoMemoryOffer(interactive: boolean): Promise<boolean> {
  if (!interactive) return false;
  return promptAutoMemory();
}
