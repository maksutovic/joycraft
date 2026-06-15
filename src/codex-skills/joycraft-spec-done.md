---
name: joycraft-spec-done
description: Lightweight per-spec wrap-up — bump status to in-review, terse discovery if surprised, commit. Run after each spec in checkpoint/isolated mode; no validation, no push, no PR.
---

# Spec Done (Lightweight Per-Spec Wrap-Up)

You just finished implementing **one** atomic spec. This is the fast handshake that runs **once per spec**, before context clears — the `todo → in-review` transition in the lifecycle (`docs/reference/spec-status-lifecycle.md`). It is deliberately tiny: it does exactly four things and nothing more.

> **This is NOT session-end.** It does **not** run validation, push, or open a PR. It trusts the TDD you just did in `$joycraft-implement`. The heavy once-per-feature wrap-up (full validation + consolidate discoveries + push + PR) is `$joycraft-session-end`, which runs once at the end of the feature.
>
> **Usually you don't run this by hand:** `$joycraft-implement` performs these four steps itself at the end of every checkpoint/isolated spec (and `$joycraft-implement-feature` drives whole queues). This skill remains the canonical definition of the wrap-up — run it manually after ad-hoc work done outside the implement skill, or when an implement run was interrupted before wrapping up.

## Step 1: Bump status to `in-review` — in BOTH systems

A spec's status lives in two places that must never disagree (the desync this feature exists to kill): the **queue JSON** and the spec's **frontmatter**. Update both to `in-review`.

1. **Queue JSON** — use the script, not a bespoke `sed`:
   ```bash
   joycraft-mark-done <spec-id> --to in-review <specs-dir>
   ```
   Find `<spec-id>` by reading `<specs-dir>/.joycraft-spec-queue.json` and matching the entry whose `file` is the spec you just implemented. `<specs-dir>` is the folder containing the spec (e.g. `docs/features/<slug>/specs`). If the spec isn't in the manifest, `joycraft-mark-done` exits non-zero with a clear error — **surface that error, don't silently skip the bump**.
2. **Frontmatter** — edit the spec file's YAML `status:` field to `in-review`.

Do **not** graduate to `done`. The agent never self-certifies — `done` is reached only by `$joycraft-session-end` (or, later, an independent verify). `spec-done` only ever reaches `in-review`.

## Step 2: Terse discovery stub — ONLY if something surprised you

Did anything during implementation **contradict the spec** or surprise you (an assumption that was wrong, an external API that behaved differently, an edge case the spec missed)?

- **No** → skip this step entirely. A spec that went as written needs no discovery. This is the common case.
- **Yes** → write a **2-line stub** (not a full discovery doc) at `docs/discoveries/YYYY-MM-DD-topic.md`: one line on what contradicted the spec, one line pointing at the spec/file. `$joycraft-session-end`'s consolidation pass later expands these stubs into proper discovery docs — keep it terse here.

## Step 3: Commit

Commit the spec's implementation changes plus the status edits (and the stub, if any) with the convention:

```
spec: <spec-name>
```

Keep scope disciplined — commit the spec's changes and its status edits, not unrelated working-tree noise.

## Step 4: Stop

That's it. **No** validation re-run, **no** push, **no** PR — those belong to `$joycraft-session-end` at feature end. Hand off and keep the loop moving.

## Recommended Next Steps

If more specs remain in this feature (checkpoint/isolated mode), continue to the next one:

```
$joycraft-implement docs/features/<slug>/specs/<next-spec>.md
```

When the feature's last spec is done, run the feature finisher once:

```
$joycraft-session-end
```

Run /clear before your next step — your artifacts are saved to files.
