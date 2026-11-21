# Spec Status Lifecycle

> How a spec moves from `todo` to `done` in Joycraft 1.x. This page is for
> contributors to this repo. The shipped rules are in
> [`workflow.md`](../../payload/.joycraft/references/workflow.md#commitment-and-queue),
> [`completion.md`](../../payload/.joycraft/references/completion.md) and
> [`gates.md`](../../payload/.joycraft/references/gates.md); when this page and
> those disagree, they win. The record shapes are in
> [`types.d.ts`](../../payload/.joycraft/contracts/types.d.ts).

A spec has exactly **three** states: `todo → in-review → done`. The queue
(`docs/features/<slug>/specs/.joycraft-spec-queue.json`) is the status of record.
Each spec's frontmatter `status:` mirrors it.

## States

| State | Meaning | Moved into by |
|-------|---------|---------------|
| `todo` | Not started. | `joycraft-decompose`, when it writes the queue |
| `in-review` | The implementer finished and committed; no reviewer has accepted it. | `completion.mjs submit`, run by `joycraft-implement` |
| `done` | An independent review was accepted, or the owner accepted the work. | `completion.mjs finalize-review` (a PASS report from `joycraft-verify`), `accept-owner` or `accept-waiver` |

```
todo ──[submit]──> in-review ──[finalize-review / accept-owner / accept-waiver]──> done
```

## Invariants

1. **One vocabulary.** The queue and the frontmatter use the same three words.
   `node .joycraft/runtime/gate.mjs check` reports a spec whose two statuses differ.
2. **The implementer never self-certifies.** A commit, a passing command or the
   implementer's own claim does not reach `done`. `finalize-review` accepts only a
   PASS report from a separate reviewer context, bound to the current revision
   and inputs, with valid receipts for every criterion.
3. **A held spec stays `in-review`.** A `blocking` or `decision-needed` finding
   refuses completion. Only that spec's dependents wait.
4. **A `done` spec with no accepted record is a gate failure.** The gate check
   sends it back to `in-review` for review.

## "Merged" is not a status

A merged PR is a git fact, not a spec status. `done` means accepted, not merged. A
spec can be `done` while its PR is still open.

## Why three states

`todo → in-review → done` is the usual engineering shape: GitHub Projects, Jira,
Linear and Kanban boards all use it. A fourth state (`implemented`, `verified`)
was rejected: no major tool tracks those as separate columns, and a fourth word is
one more thing for the queue and the frontmatter to drift on.
