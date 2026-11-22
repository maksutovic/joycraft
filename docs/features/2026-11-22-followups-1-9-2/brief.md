---
feature: followups-1-9-2
decisions: [
  {
    "id": "word-cap-split",
    "status": "clarified",
    "answer": "on-demand",
    "question": "Should testing-review.md count as every-spec text or on-demand text?",
    "context": "The reviewer, verify, implementer and decompose link two anchored sections of testing-review.md (#test-changes, 338 words; #test-only-specs, 425 words) and read them only when a spec changes tests or is test-only. The other 784 words are the cleanup skill's test review. The every-spec cap has 79 words spare; the file is 1,618 words.",
    "options": [
      {
        "value": "on-demand",
        "label": "Keep it on-demand",
        "description": "testing-review.md stays in the on-demand group; the guard records why.",
        "example": "payload-guard.test.ts says the per-spec readers load two sections, only when tests change.",
        "tradeoff": "The every-spec count does not hold the two sections a reviewer reads when tests change.",
        "recommended": true
      },
      {
        "value": "every-spec",
        "label": "Move it to every-spec",
        "description": "Count the whole file under the every-spec cap.",
        "example": "Every-spec rises by 1,618 words, over its cap.",
        "tradeoff": "Breaks the every-spec cap; needs a cut of about 1,540 every-spec words or a higher cap."
      }
    ],
    "recommendation": "Keep it on-demand: per-spec agents read two anchored sections, only when a spec touches tests.",
    "affected": [
      "text"
    ]
  }
]
---

# 1.9.2: the 1.9.1 review follow-ups

Fix the actionable 1.9.1 review follow-ups as one small patch release, 1.9.2.

Source: [the 1.9.1 review follow-ups](../../archive/2026-11-22-fixes-1-9-1/feature/review-followups.md). Each item was checked against the code on `main` at `4b23561` (after PR #118) before it got a spec.

## Context and authorization

Max, 2026-11-22: "start the 1.9.2 follow-ups". On the word-cap owner item he wrote "my gut says on demand?"; the recommendation agreed, so `word-cap-split` = `on-demand`.

Rules for every spec:
- edit `payload/` and run `node scripts/pin-payload.mjs` (the queue is serial, so specs never edit `payload/PIN` at once);
- each spec runs only its own test files; the recorded gate runs once per spec, before review;
- every-spec words do not change, and on-demand words do not grow: `[AC:spec-1-3]` in `tests/payload-guard.test.ts` needs 600 words spare and the base has 602, so a text edit cuts as many words as it adds;
- no two specs edit the same source file.

## Goals

### completion

`completion.mjs`: a report that ran one part of a chained recorded gate is refused like one that ran the whole gate. With gate `pnpm test && pnpm typecheck`, an observation `pnpm test` (no file arguments) or `pnpm typecheck` is refused; `pnpm test tests/x.test.ts` is not (1.9.1 spec 2 f1).

### cleanup

`cleanup.mjs`:
- A `checks:` command that exits 0 is skipped as "Command not found" only when the not-found name in its stderr is a word of its `run`; `rule no-foo: not found` from a working checker is not a missing command (1.9.1 spec 3 f1).
- A backlog folder on the path counts in any case (`Backlog/`), as the file-name half already does (1.9.1 spec 3 f2).

### delivery

`delivery.mjs` and `delivery.md`, under decision `se-docs-root-manifests` = `gate-them` (1.9.1 brief): `jsconfig*.json`, `deno.json`, `deno.jsonc` and `pnpm-workspace.yaml` are manifests too, so a change to one under the docs root needs the gate again (1.9.1 spec 5). `delivery.md` says plainly that the manifest rule holds anywhere under the docs root, not only in feature and archive folders.

### archive

`archive.mjs`:
- A blank or whitespace-only `--owner-instruction` value gets "needs the owner's words", without the "cannot start with --" clause; a value that starts with `--` keeps that clause (1.9.1 spec 1 f3).
- Comment detection and `namedFiles` read lines split on `\r\n`, `\n`, `\r`, U+2028 and U+2029, so a CR-only file gets real line numbers (1.9.1 spec 9 f3).

### text

- `setup.md`: restore "and its conventions" (keep an existing worktrees home's style) and "materially" in the ask-a-question rule, cutting as many words elsewhere in `setup.md` (1.9.1 spec 6).
- `tests/payload-guard.test.ts`: a comment by `EVERY_SPEC_FILES` records `word-cap-split` = `on-demand` and why; no assertion changes.

### release

1.9.2 release fields and a `## 1.9.2 — <title>` CHANGELOG entry; the entry also corrects two 1.9.1 lines (1.9.1 spec 8): its "Before, they counted as records" names only the manifests 1.9.0's `delivery.mjs` really counted as records (the `.json` and `.yaml` ones; `yarn.lock`, `bun.lock`, `deno.lock` already needed the gate), and 1.9.1 also told users to save a kept probe script as `.mjs.txt`. See [releasing](../../guides/releasing.md). It goes last.

## Scope and limits

Accepted as they are, not fixed here:
- Runner aliases `bunx`, `yarn dlx`, `pnpm dlx` and `npx` with flags stay unmatched (by design in 1.9.1).
- Gate-matcher prose matches (a negated sentence or a table row naming the gate) and a fenced scope block outside a bullet: same class as before.
- Comment detection inside a template literal or a Python triple-quoted string: the `next` message still says to run the gate, which catches a real read.
- Trace-id clashes with older features, undeclared test retags in 1.9.1 spec 4, and `gates.md`'s runtime-only every-spec reason.
- The 600-word on-demand probe itself: an owner budget call, raised at session end.

## Agent work and pending choices

The one decision is answered. Every item can be specified; nothing waits on the owner.
