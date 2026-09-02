# Knowledge Lifecycle

> How a fact, discovery, or ledger row moves through its life once it's written — refresh it in place rather than minting a near-duplicate, and never delete unrecoverable content.

## The Five Verbs

Every touch to an existing doc in the knowledge layer (`docs/context/`, `docs/reference/`, `docs/discoveries/`) is one of five operations. Pick one deliberately — don't default to "just append another row."

- **Keep** — the doc is still accurate and complete. No action.
- **Update** — the doc's content changed (a URL moved, a decision was revised, a convention was tightened). Edit the existing row/section in place; do not create a second entry for the same fact.
- **Consolidate** — two or more docs (or rows) cover overlapping ground and should merge into one home. Pick the doc with the better fit (see `joycraft-add-fact`'s classification rules), fold the other's content in, and note the merge.
- **Replace** — the doc's premise is now wrong (not just stale) and a new doc supersedes it wholesale. The old content is removed and the new content takes its place; this is stronger than Update because nothing of the original survives.
- **Delete** — the doc no longer serves any purpose and nothing references it. **Gated**: before deleting, run an inbound-link grep for the filename or slug —

  ```bash
  grep -r '<filename-or-slug>' docs/ .claude/
  ```

  If that comes back non-empty, the doc is still referenced — do not delete; consolidate or update instead. Delete only proceeds when the grep is empty.

## Contradictions Are Surfaced, Never Silently Resolved

If applying one of the five verbs reveals that two docs disagree about the same fact (e.g., the overlap check in `joycraft-add-fact` or `joycraft-session-end` finds two candidate homes with conflicting content), do not pick a winner silently. Surface the contradiction to the human as a **Consolidate candidate** — name both docs, quote the conflicting lines, and let the human decide which one is current. Guessing wrong here is worse than asking, because a silently "resolved" contradiction looks authoritative to the next agent that reads it.

## Overlap Check (write-time, PROTOCOL)

Before creating any new discovery file, context doc, or table row, grep the knowledge layer for an existing home:

```bash
grep -ril '<topic keywords>' docs/context/ docs/discoveries/ docs/reference/
```

- **No match** — proceed to create the new file/row.
- **Match found** — that's an overlap. Apply the appropriate verb above (usually Update) to the existing doc instead of minting a near-duplicate. Say so in your confirmation message.
- **Multiple conflicting matches** — see Contradictions, above.

`joycraft-add-fact` and `joycraft-session-end` both run this check at write time; it's what keeps the knowledge layer one-home instead of accreting parallel versions of the same fact.

## Rotation Procedure (200-line budget)

Live-head docs that grow as prepend-only ledgers (`docs/context/shipped.md`, `docs/context/decision-log.md`) are read far more often than they're written, so they're budgeted to stay short: **200 lines**. This procedure is defined once here and invoked from both `joycraft-add-fact` and `joycraft-session-end` — never re-implemented per-writer.

1. After prepending a new row, check the live-head doc's line count.
2. **At or under 200 lines** — no action; the budget is not exceeded until the doc goes *over* 200.
3. **Over 200 lines** — move the oldest rows (from the bottom, since the doc is newest-first) to the next numbered shard:
   - First rotation creates `shipped-001.md` (or `decision-log-001.md`, matching the live-head's basename) in the same directory, containing the rotated-out rows plus the shared frontmatter schema.
   - Subsequent rotations increment the shard number (`-002.md`, …) or append to the current shard if it's also under budget — never silent truncation of the live head.
4. Create or update the **pointer-only JSON manifest** — `docs/context/shipped-manifest.json` (same pattern for decision-log: `docs/context/decision-log-manifest.json`). The manifest is pointer-only: it records which shard holds which date range or row-count window, not a copy of the rows themselves (one home per row).
5. The manifest is **created mechanically at first rotation only** — never scaffolded preemptively for a doc that hasn't yet crossed the budget. An empty manifest for a doc with zero shards is dead machinery.

This procedure applies identically to any future live-head ledger that adopts the same newest-first, prepend-only, 200-line-budget shape.

## Staleness Rule (advisory flag)

Point-in-time knowledge must graduate or die. This rule is defined once here and invoked from both `joycraft-session-end` (discovery consolidation) and `joycraft-optimize` (the Reaper pass) — never restated per-consumer.

A discovery file or fact row is **stale-flagged** when all of these hold:

1. Its `created:` date is **more than 7 days** old (a row exactly 7 days old is not flagged).
2. Its `status:` is not terminal. A discovery already graduated into the boundary file or the shipped ledger but left in place is terminal-equivalent — note the graduation, don't flag it forever.
3. **Additive telemetry condition** — when the telemetry store exists (`docs/.joycraft/telemetry.json`): the doc has **zero voluntary reads**. With no store, the rule still fires on age + status alone.

A row with a missing `created:` is skipped and noted — never guess an age. The output is an **advisory stale list only — never auto-delete.**

**Graduation targets.** Each flagged item moves to the home its shape earns: the **shipped ledger** for "this happened", the boundary file via `joycraft-harden` (as a deny pattern where checkable) for "this is always true", deletion for "this was a moment" (through the gated Delete verb above).

**Validation rule.** The threshold is provisional: when more than half of 7-day flags fire on discoveries that are subsequently read, the threshold moves — retune it rather than defend it.

**Honest residue.** Situational must-read content has no good home in the tier model — the dangerous-assumptions doc cannot promise it will be read at the right moment. The checkable subset converts via `joycraft-harden`; the worst of the rest promotes to L1; the remainder is documented accepted risk.
