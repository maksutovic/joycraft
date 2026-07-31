import { createInterface } from 'node:readline';
import type { Harness } from './harness.js';

/**
 * The per-project **Execution Profile** (decision D6 of the succinct-gates
 * feature): which harness agents may fan out into swarms, and which model +
 * effort those agents should run at.
 *
 * It lives in exactly one home — a sentinel-delimited `## Execution Profile`
 * section in AGENTS.md. No state.json mirror: the profile is team-shared data
 * the human owns and hand-edits, and two homes for one fact violate ONE_HOME.
 *
 * It is **data only**. Nothing here recommends a model, ranks tiers, or routes
 * a stage to an agent — opinionated defaults stay in the backlogged
 * model-tiering feature (`docs/backlog/2026-07-20-model-tiering.md`, D7).
 * That is also why model and effort are free text: model names age faster than
 * Joycraft releases, so an enum here would be wrong within a minor version.
 */

/** Opening sentinel — the only machine contract; everything inside is user-owned. */
export const EXECUTION_PROFILE_OPEN = '<!-- joycraft:execution-profile -->';
/** Closing sentinel. */
export const EXECUTION_PROFILE_CLOSE = '<!-- /joycraft:execution-profile -->';

/** The markdown heading the section is written under. */
export const EXECUTION_PROFILE_HEADING = '## Execution Profile';

/**
 * The value written for model/effort when nobody was asked (non-interactive
 * init). Deliberately not a model name — it tells downstream skills "use
 * whatever the session is already running", which is the only answer that
 * can't go stale.
 */
export const SESSION_DEFAULT = 'session default';

export interface ExecutionProfileEntry {
  harness: Harness;
  /** Fan out to a swarm of subagents during `/joycraft-decompose`? */
  swarmDecompose: boolean;
  /** Fan out to a swarm of subagents during `/joycraft-implement`? */
  swarmImplement: boolean;
  /** Free-text model name, or SESSION_DEFAULT. Never validated against a list. */
  model: string;
  /** Free-text reasoning effort, or SESSION_DEFAULT. */
  effort: string;
}

export interface ExecutionProfile {
  entries: ExecutionProfileEntry[];
}

/**
 * The profile written when nobody could be asked: skipping is first-class, so
 * the section is still written — with explicit "no" answers — rather than being
 * omitted. Downstream skills then read an explicit answer, never an absence.
 */
export function defaultExecutionProfile(harnesses: readonly Harness[]): ExecutionProfile {
  return {
    entries: harnesses.map((harness) => ({
      harness,
      swarmDecompose: false,
      swarmImplement: false,
      model: SESSION_DEFAULT,
      effort: SESSION_DEFAULT,
    })),
  };
}

function yn(value: boolean): string {
  return value ? 'yes' : 'no';
}

/** True when the document already carries a profile region (matched on the sentinel, not the heading). */
export function hasExecutionProfile(content: string): boolean {
  return content.includes(EXECUTION_PROFILE_OPEN);
}

/**
 * Render the section. One line per selected harness, so a single-harness
 * project never sees rows it didn't ask for.
 */
export function renderExecutionProfileSection(profile: ExecutionProfile): string {
  const lines: string[] = [EXECUTION_PROFILE_HEADING, '', EXECUTION_PROFILE_OPEN];
  for (const e of profile.entries) {
    lines.push(
      `- ${e.harness}: Swarms: decompose ${yn(e.swarmDecompose)} · implement ${yn(e.swarmImplement)} · model ${e.model} · effort ${e.effort}`
    );
  }
  lines.push(EXECUTION_PROFILE_CLOSE);
  return lines.join('\n');
}

/**
 * Insert the section into an existing document when absent; return the document
 * untouched when a profile is already there. The sentinels make the region
 * opaque — a hand-edit inside them (even a malformed one) is preserved verbatim,
 * because the content is the user's data, not our schema (D7).
 */
export function ensureExecutionProfileSection(
  existing: string,
  profile: ExecutionProfile | undefined
): string {
  if (!profile || hasExecutionProfile(existing)) return existing;
  return existing.trimEnd() + '\n\n' + renderExecutionProfileSection(profile) + '\n';
}

/**
 * Ask one question, following the one-interface-per-prompt idiom the rest of
 * the CLI uses (`harness.ts`, `gitignore.ts`): open readline, ask, close.
 *
 * EOF matters more here than for those one-shot prompts, because this
 * interview asks several questions in a row: a stdin that runs out mid-way
 * (piped input, a redirect, Ctrl-D) must degrade every remaining question to
 * its stated default rather than hang or throw. Configuration questions never
 * abort an init.
 */
function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    const input = process.stdin;
    // A stream that already ended emits no further 'close' on a *new* readline
    // interface, so the close-guard below never fires and the question hangs
    // forever. Detect the spent stream up front instead: this is the path a
    // short piped answer list takes once it runs out, and every remaining
    // question must degrade to its default rather than block the init.
    if (input.readableEnded === true || input.destroyed === true) {
      resolve('');
      return;
    }
    const rl = createInterface({ input, output: process.stdout });
    let settled = false;
    const done = (value: string): void => {
      if (settled) return;
      settled = true;
      rl.close();
      resolve(value);
    };
    rl.once('close', () => done(''));
    try {
      rl.question(question, (answer) => done(answer.trim()));
    } catch {
      done('');
    }
  });
}

async function askYesNo(question: string): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const answer = (await ask(`${question} [y/N]: `)).toLowerCase();
    if (answer === '' || answer === 'n' || answer === 'no') return false;
    if (answer === 'y' || answer === 'yes') return true;
    console.log("Please answer 'y' or 'n'.");
  }
  // Repeated unparseable input (or a closed stream): take the default rather
  // than looping forever.
  return false;
}

/**
 * Interactive capture, one small block per selected harness. Follows the
 * harness-selection idiom in `harness.ts`: same readline interface, empty
 * answer means the stated default, unrecognized input re-asks.
 */
async function promptExecutionProfileInteractive(
  harnesses: readonly Harness[]
): Promise<ExecutionProfile> {
  console.log('\nExecution profile — how should agents run on this project?');
  console.log('  (Recorded in AGENTS.md as data. Press Enter to accept the default.)');
  const entries: ExecutionProfileEntry[] = [];
  for (const harness of harnesses) {
    console.log(`\n  ${harness}:`);
    const swarmDecompose = await askYesNo('    Use swarms for decompose?');
    const swarmImplement = await askYesNo('    Use swarms for implement?');
    const model = (await ask(`    Model (${SESSION_DEFAULT}): `)) || SESSION_DEFAULT;
    const effort = (await ask(`    Effort (${SESSION_DEFAULT}): `)) || SESSION_DEFAULT;
    entries.push({ harness, swarmDecompose, swarmImplement, model, effort });
  }
  return { entries };
}

/**
 * Resolve the profile for an init run:
 *   - interactive (TTY): ask per selected harness
 *   - non-interactive: the explicit-no default — never blocks a scripted run
 */
export async function resolveExecutionProfile(
  harnesses: readonly Harness[],
  interactive: boolean
): Promise<ExecutionProfile> {
  if (harnesses.length === 0) return { entries: [] };
  if (interactive) return promptExecutionProfileInteractive(harnesses);
  return defaultExecutionProfile(harnesses);
}
