import { update, type ExecutingBundle, type UpdateOutcome } from './update.js';
import type { Harness } from './harness.js';

/** Options retained by the legacy upgrade entry point and forwarded to update. */
export interface UpgradeOptions {
  yes?: boolean;
  gitignore?: string;
  nonInteractive?: boolean;
  harnesses?: readonly Harness[] | string;
  replaceCustomized?: readonly string[];
  json?: boolean;
  bundle?: ExecutingBundle;
  recovery?: 'recover' | 'rollback';
}

/** Legacy alias routed through the same planner and transaction as `update`. */
export async function upgrade(dir: string, opts: UpgradeOptions = {}): Promise<UpdateOutcome> {
  return update(dir, {
    harnesses: opts.harnesses,
    yes: opts.yes,
    nonInteractive: opts.nonInteractive,
    replaceCustomized: opts.replaceCustomized,
    gitignore: opts.gitignore,
    bundle: opts.bundle,
    recovery: opts.recovery,
  });
}
