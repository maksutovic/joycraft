---
status: backlog
owner: Maximilian Maksutovic
created: 2026-11-20
priority: next
---

# Archive: let the owner override a missing receipt

## Decision

Max put this next in the backlog on 2026-11-20. The archive block is too strict. A missing receipt must not trap a finished feature with no way out.

## What happened (live session, 2026-11-20)

A user ran a large swarm of parallel work. When the agent cleaned up, it removed worktrees that git listed as "clean". Git does not list ignored files, so the agent did not see about 50 gitignored review screenshots. Those worktrees held the only copies. The screenshots were cited by the reviews of five done specs (35, 37, 38, 40, 43) of the `review-fixes` feature.

Every spec was done and live on production. The committed archives of the other features were complete. Only the screenshots, which were never in git, were gone.

The archive tool then refused the feature. `payload/.joycraft/runtime/archive.mjs:272` fails with `Historical receipt is missing or changed` and has no override. The agent told the user the only way forward was to re-review five done specs just to retake screenshots. It advised against that and left the feature in `docs/features/`. It never asked the user whether to archive anyway.

## Two problems

1. **The agent made the mistake.** Removing a worktree with ignored receipts loses evidence. This will happen again in chaotic runs. Prevention helps, but it cannot be the whole fix.
2. **The block gives the owner no choice.** The agent should have ended with: "Would you like to override this and archive anyway?" The owner decides. Most owners will say yes.

## Proposed fix

- **Archive asks, then records.** When receipts are missing, the archive tool reports which receipts are missing and which reports cite them. The agent asks the owner once, in plain words, whether to archive anyway. On yes, the archive proceeds. It writes a note into the archive manifest: which receipts were missing, the cause the agent gave, and that the owner archived anyway (the owner's words, with the date). On no, nothing changes.
- **Reuse what exists.** `archive.mjs` already accepts owner records (`ownerAcceptance`, `legacy-acceptance` with a `limitations` line) and feature waivers. Check first whether an owner override can be a `limitations` entry on the existing decision, so that no new record type is added.
- **Keep the integrity check for changed files.** A receipt whose bytes changed is a different case from a receipt that is gone. Decide in the spec whether "changed" also gets the override or stays a hard stop.
- **Prevention, smaller.** Before the agent removes a worktree, it checks for ignored files under Joycraft's receipt paths and copies them out first (or says so and asks). This belongs in the cleanup guidance or `cleanup.mjs`, not in a new guard. Follow the design-for-the-99% rule: the agent judges, tells the user plainly, and the user says yes or no.

## Done when

- A feature with missing receipts can be archived after one plain question to the owner, and the archive manifest says what was missing and that the owner archived anyway.
- Without the owner's yes, archive still refuses, and its message tells the agent to ask the owner instead of suggesting re-reviews.
- The archive verifier accepts an archive that carries the override note.
- Worktree cleanup no longer silently drops ignored receipts.
