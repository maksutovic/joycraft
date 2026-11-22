---
feature: fixes-1-9-1
decisions: [
  {
    "id": "se-followups",
    "status": "clarified",
    "answer": "release-1-9-1",
    "question": "What happens to the 38 open review follow-ups (23 lines in the backlog page)?",
    "context": "Reviewers left 187 follow-ups. 74 are fixed by later specs, 72 are accepted as they are, 38 are still open and 3 need you. None blocks the release.",
    "options": [
      {
        "value": "release-1-9-1",
        "label": "Fix them as 1.9.1",
        "description": "Next session: one small feature with specs for the open code and text items (archive, cleanup, matcher, text, tests). The deferred field proofs run after 1.9.0 publishes.",
        "example": "1.9.1 fixes chained gate matching and the .MD link case.",
        "tradeoff": "Another release cycle of about a day.",
        "recommended": true
      },
      {
        "value": "backlog-only",
        "label": "Keep them in the backlog",
        "description": "Leave the backlog page as the record; pick items up when a field report needs them.",
        "example": "Items wait in docs/backlog.",
        "tradeoff": "Small known gaps stay in shipped code."
      }
    ],
    "recommendation": "Fix as 1.9.1. Most items are a line or two, and two are matcher gaps a user can hit.",
    "affected": [
      "scope-and-limits"
    ]
  },
  {
    "id": "se-docs-root-manifests",
    "status": "clarified",
    "answer": "gate-them",
    "question": "Should package.json and tsconfig files under the docs root need a fresh gate run?",
    "context": "A push may reuse an older gate receipt when only record files changed since. Today any .json under the docs root counts as a record, so a package.json or tsconfig.json there would not need a new gate run.",
    "options": [
      {
        "value": "gate-them",
        "label": "Yes, treat them as code",
        "description": "In 1.9.1, package.json, tsconfig*.json and lockfiles never count as records.",
        "example": "Editing docs/site/package.json needs a new gate run before push.",
        "tradeoff": "None in practice.",
        "recommended": true
      },
      {
        "value": "leave",
        "label": "No, leave the rule",
        "description": "Every .json under the docs root stays a record.",
        "example": "A docs site manifest change reuses the old receipt.",
        "tradeoff": "A docs site with its own build could push untested manifest changes."
      }
    ],
    "recommendation": "Treat them as code. It is a one-line rule.",
    "affected": [
      "delivery"
    ]
  },
  {
    "id": "archive-list-kill",
    "status": "clarified",
    "answer": "keep-quiet",
    "question": "Both 1.9.0 archives met the kill rule. Drop the test list from the session-end text?",
    "context": "The kill criterion (test-release/24/f6) says: drop the list from the session-end text if two archives in a row list only files nobody should edit. Both 1.9.0 archives listed only `// Spec:` comment lines, yet the next message told the agent to change the folder path in each listed test.",
    "options": [
      {
        "value": "keep-quiet",
        "label": "Keep the list, quiet the message",
        "description": "The preview still lists the files; the next message names only tests whose line is not a comment. Session-end text unchanged.",
        "example": "2 tests name the folder only in comments; they need no change.",
        "tradeoff": "One small archive.mjs change. The list stays for the case where a test reads the path.",
        "recommended": true
      },
      {
        "value": "drop-text",
        "label": "Drop it from the session-end text",
        "description": "Drop the list from the session-end text; the preview still carries namedFiles as data.",
        "example": "Session end no longer reads namedFiles; archive --apply prints it unread.",
        "tradeoff": "Fewer words to read. A test that reads the old path breaks only at the gate."
      }
    ],
    "recommendation": "Keep the list and quiet the message: the noise came from comment lines, not from the list.",
    "affected": [
      "archive"
    ]
  }
]
---
# 1.9.1: the open 1.9.0 review follow-ups

Fix the open review follow-ups of the 1.9.0 release (drift-tidy and test-release) as one small patch release, 1.9.1. Each item is a line or two of runtime or text. Two are matcher gaps a user can hit: chained gate commands and runner aliases.

Source: [the 1.9.0 review follow-ups backlog](../../backlog/2026-11-21-1-9-0-review-followups.md) (23 open lines and the owner note), plus one item found in the first real archive. Each item was checked against the code on `main` at `86d36fc` (after PR #116) before it got a spec.

## Context and authorization

Max answered the first two decisions above at the 1.9.0 session end (decision log, 2026-11-21 row "1.9.0 session end"):
- `se-followups` = `release-1-9-1`: fix the open items as 1.9.1.
- `se-docs-root-manifests` = `gate-them`: `package.json`, `tsconfig*.json` and lockfiles under the docs root never count as records, so a change to one needs the gate again.

Both 1.9.0 archives met the archive-list kill rule. Max answered `archive-list-kill` = `keep-quiet`: keep the list, quiet the message. The `namedFiles` list and the session-end text stay as they are; only the `next` message changes (goal `archive`). This repo's gate rule is already recorded (`se-gate-rule` = `record`).

Rules for every spec:
- edit `payload/` and run `node scripts/pin-payload.mjs` (it rewrites `payload/PIN`; the queue is serial, so the specs never edit it at once);
- each spec runs only its own test files; the recorded gate runs once per spec, before review;
- every-spec words do not change; on-demand text stays inside its cap (605 words spare at the base);
- no two specs edit the same source file.

## Goals

### archive

`archive.mjs` and `archive.md`:
- For link rewrites, Markdown is a `.md` or `.markdown` file in any letter case (backlog: drift-tidy/7/f2).
- `archive.md` says link rewrites happen only under the docs root (drift-tidy/7/f4).
- An unaccepted spec in an as-is archive also lists the missing receipts of its latest report file in the specs folder (drift-tidy/8/f2).
- A whitespace-only `--owner-instruction` gets the "needs the owner's words" message (drift-tidy/8/f3).
- New, from the first real archive: the `next` message after `--apply` told the agent to change the folder path in every listed test, but both 1.9.0 archives listed only `// Spec:` comment lines. Under decision `archive-list-kill` = `keep-quiet`, `next` names only tests that name the folder outside a comment; when every listed test names it only in comments, it says they need no change. The `namedFiles` list and the session-end text do not change.
- `archive.mjs` uses the `projectRoot` that `cleanup.mjs` exports (spec 3), so the two runtimes find the root the same way.

### completion

`completion.mjs`:
- The report gate check reads runner aliases: `npx`, `pnpm exec` and the `run` of `pnpm run`/`npm run` are stripped before the compare (test-release/6/f2).
- A re-check of a done spec with the same accepted report does not run the gate-run check again (test-release/6/f4).

### cleanup

`cleanup.mjs`:
- `new-doc` skips a backlog file (`backlog*` name) as age-out does (drift-tidy/2/f4).
- Age-out reads the Git log with `-z`, so a name with a tab or a double quote gets its real age (drift-tidy/9/r3-f1).
- A docs root configured in a case Git does not track says the case differs (drift-tidy/9/r3-f2).
- A `checks:` command whose missing tool sits in a pipeline is skipped as "Command not found" (drift-tidy/10/f5).
- Run from a subfolder with no `--root`, `cleanup.mjs` finds the project root (drift-tidy/10/f6); `projectRoot` is exported for `archive.mjs`.

### queue-check

`queue-check.mjs`:
- `&&`, `||`, `|` and `2>&1` followed by whitespace end a gate command, so chained gates are found (test-release/31/f1).
- The `namesCommand` doc comment matches the code: a word that starts with `-` is an argument, and `re-runs` is prose (test-release/31/f2).
- gate-in-spec also reads the spec's "Implementation and verification scope" section (test-release/14/f3).

### delivery

`delivery.mjs` and `delivery.md`, under decision `se-docs-root-manifests` = `gate-them`:
- `package.json`, `tsconfig*.json` and lockfiles under the docs root, feature and archive folders included, need the gate again (test-release/27/f13).
- `delivery.md` lists the record extensions and says to save a probe script kept as a receipt with a `.txt` suffix (test-release/31/f3).

### text

On-demand reference text, checked by text tests:
- `cleanup.md`: `--checks` prints each check's kind and whether it is a gate (drift-tidy/1/f3).
- `setup.md`: knip needs a wrapper that prints `path:line: message` (drift-tidy/10/f2).
- `testing-review.md`: the reviewer checks each receipt's patch sha256 against the committed list, one fault per removed or changed assertion, and aims its own fault at a removed assertion with no replacement (test-release/18/r2-f1).
- `testing-page.md` decision 8: "Run a new or changed test file `<n>` times" (test-release/28/f5).
- `tests/text-sota-page.test.ts` asserts the worker cap keys on `JOYCRAFT_EVIDENCE`, never `CI`, and "never a fixed delay" (test-release/28/f4). This test file reads `testing-page.md`, so this goal owns it.

### tests

`tests/payload-guard.test.ts` pins the 12 every-spec paths as a literal list in `[AC:spec-1-1]`, so dropping a file from `EVERY_SPEC_FILES` fails the guard (test-release/28/f3).

### release

1.9.1 release fields: `package.json` `version`, `joycraft.release` and `joycraft.summary`, `src/joycraft-release.json` `releaseVersion`, and a `## 1.9.1 — <title>` CHANGELOG entry with an update note for the docs-root manifest rule. See [releasing](../../guides/releasing.md). It goes last, after every other spec.

## Agent work and pending choices

All three decisions are answered. Every item can be specified; nothing waits on the owner.

## Scope and limits

- Dropped: backlog item 12 (this repo's installed `.joycraft/` copies differ from `payload/`). PR #116 ran the update; it is done.
- Out of scope: backlog item 23, the release proofs deferred until deploy in a field project (`evidence.mjs` under `JOYCRAFT_EVIDENCE`, the fault-proof replay, `--patch` under the Codex sandbox, archive preview `namedFiles` at named revisions, gate runs per spec in the next field report). It belongs to another project; Max runs it.
- No change to the `namedFiles` list or the session-end text (`archive-list-kill` = `keep-quiet`).
- No new every-spec words, no new runtime dependency, no new per-runner catalog.
