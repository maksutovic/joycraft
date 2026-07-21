# Question capture: the native picker fires from an installed skill; rationale needs a single-question, free-text pattern

**Spec:** `docs/features/2026-07-20-decision-dossier/specs/verify-question-capture.md`
**Scratch project:** `/tmp/joycraft-probe` (outside this repo), installed skill `.claude/skills/probe-decide/`
**Date:** 2026-07-20

## Headline

- **UI fires from an installed skill: YES.** In every fresh-session trial the
  `probe-decide` skill's forced-choice question rendered as the native
  interactive picker (the AskUserQuestion tool), not as plain text. No RED
  EXCEPTION — specs 3–4 can proceed on the hybrid (HTML dossier + native
  question UI) architecture.
- **Chosen rationale-capture pattern: Pattern B** — a *single* forced-choice
  question whose text instructs the user to answer in the free-text field as
  `"<choice> because <one-sentence reason>"`. 3/3 native + typed rationale, no
  fallback. **Fallback: Pattern C** (single question, "pick then add a note").

## UI-fires: YES (per-trial)

The native picker rendered on Q1 in **9/9** fresh-session invocations
(A1–A3, B1–B3, C1–C3), plus the smoke run. Every render showed the two
forced-choice option cards, a `Type something.` free-text row, and a
`Chat about this` row — the latter is the built-in reject-this-framing escape
to free chat (RF-KILL-6 is satisfiable natively). The skill loaded cleanly
(`Successfully loaded skill`) every time; a pre-approved `Skill` /
`AskUserQuestion` allowlist in the scratch project's `.claude/settings.json`
plus `--dangerously-skip-permissions` meant no permission prompt ever blocked
invocation.

## Per-pattern trial results (3 fresh sessions each)

| Pattern | What the skill instructs | Native UI on rationale | Typed rationale captured | Verdict |
|---|---|---|---|---|
| **A** — separate follow-up question | Q1 forced choice, then a *second* AskUserQuestion "Why?" with one option ("Type my reason") | **1/3** | 3/3 | **Flaky — reject** |
| **B** — choice+because in one question | ONE question; text says answer in free-text as `"<choice> because <reason>"` | **3/3** | 3/3 | **Chosen** |
| **C** — note in one question | ONE question; text says "pick, then add a one-sentence note in the free-text field" | **3/3** | 3/3 (one needed a re-prompt) | **Fallback** |

### Pattern A — why it is flaky (the load-bearing failure)

The AskUserQuestion tool **rejects a question with only one option** — it
requires at least two genuine choices. Pattern A's follow-up "Why?" question
has exactly one intended option ("Type my reason"), so:

- **A1, A2:** the tool returned `Invalid tool parameters`; the model then
  *abandoned the native UI and asked the rationale as a plain-text chat
  question*. The rationale was still typed and captured — but in the chat box,
  **not** through the picker. This is exactly the demo's failure: the pattern
  does not reliably keep capture inside the native UI.
- **A3:** the model *improvised a filler second option* ("No reason / Skip") to
  satisfy the two-option minimum, so the picker did render. This is
  model-dependent improvisation, not a property of the pattern — it is why A is
  1/3, not 0/3.

So Pattern A yields a typed rationale 3/3 but a **native-UI** rationale only
1/3. It fails Acceptance Criterion "3/3 trials via the native UI."

### Pattern B — the winner (exact wording that worked)

One question, no second question, so the two-option minimum is never violated.
The question text that worked verbatim:

> "How should the probe app persist user records? Do NOT just pick an option —
> use the free-text field and type your answer as
> '<choice> because <one-sentence reason>'."

Options 1/2 are shown for reference; the intended answer path is the
`Type something.` free-text row. Trials:

- **B1:** typed `Postgres because we need ACID transactions and relational joins.`
  → `DECISION: Postgres · RATIONALE: we need ACID transactions and relational joins.`
- **B2:** typed `SQLite because the app is single-user and needs zero ops.`
  → `DECISION: SQLite · RATIONALE: the app is single-user and needs zero ops.`
- **B3 (reject-framing):** typed
  `Neither because we should use the existing Firestore instance already in prod.`
  → `DECISION: Neither (Firestore) · RATIONALE: we should use the existing Firestore instance already in prod.`

B3 shows the reject-this-framing escape and the rationale ride in the **same**
free-text answer — no offered option had to fit. This is the pattern to build
`joycraft-decide` on.

### Pattern C — viable fallback, with one gotcha

One question: "pick, then add a one-sentence note in the free-text field."
Native UI 3/3, rationale 3/3. But the picker forces a *single* selection — a
user cannot both highlight option 1 AND type a note; everything must go through
the free-text row. In **C2** the (simulated) user picked `Postgres` bare with
Enter and no note arrived; the skill's one-shot re-prompt fired and — because
it kept the two real storage options — **re-rendered as a native picker**, and
the user then supplied the note in free text. So C works, but it has a
bare-pick gap (a compliant-looking pick that carries no rationale) that
Pattern B structurally avoids by never presenting a pickable bare option as the
intended path. C1/C3 (user typed pick+note directly in free-text) succeeded
with no re-prompt.

## Mechanics learned (for the implementer of specs 3–4)

- **Free-text answer = the `Type something.` row.** Navigate to it, then type;
  the row's label is replaced by the typed text and Enter submits it as a real
  answer (`User answered … → <typed text>`).
- **Selecting the `Type something.` row and pressing Enter without typing** (or
  selecting `Chat about this`) registers as `User declined to answer questions`
  — it is the escape-to-chat, not a text field. The rationale must be *typed*
  into the row, not selected.
- **Single-option questions are invalid.** Any capture design that ends in a
  one-option AskUserQuestion will either error or depend on the model inventing
  a filler option. Always give the question ≥2 real options and route the
  rationale through the free-text row (Pattern B).

## Methods note (honesty / limits of this evidence)

**Trials were machine-driven, not human.** Each trial ran a fresh interactive
`claude` session inside a detached tmux session in `/tmp/joycraft-probe`
(`tmux new-session` / `send-keys` / `capture-pane`), invoked the installed
skill by the natural-language trigger "run the decision probe", and answered by
scripted keystrokes the way a user would (arrow to the free-text row, type,
Enter). Each trial was a fresh session (killed between trials) so nothing was
warm in context. **What this does NOT test:** whether a *real human* will
actually comply with the "type your reason" instruction rather than picking a
bare option or bailing to chat. The keystrokes here were compliant by
construction. Human-compliance with the rationale prompt — the real question
behind locked decision #3's concreteness bar — remains **untested** and should
be watched during the dogfood pilot (kill criterion: Max bypasses into free
chat by the second feature). The re-prompt path (Pattern C / the "exactly one
re-prompt" rule) is the safety net for the non-compliant case, and it was shown
to work mechanically in C2.

## Acceptance Criteria

- [x] Scratch project outside this repo with an installed probe skill
      (`.claude/skills/probe-decide/`) instructing a forced choice + reject-framing escape.
- [x] Invoking the probe skill in a fresh session fires the native question UI (9/9).
- [x] Three rationale-capture patterns trialed: (a) follow-up free-text question,
      (b) Other with "choice + because …", (c) rationale requested via note field.
- [x] One pattern selected with 3/3 typed rationale via the native UI (Pattern B); fallback named (Pattern C).
- [x] This doc records: UI-fires (yes), per-pattern results, chosen pattern + fallback, exact working wording.
- [x] No RED EXCEPTION — the UI DID fire from the installed skill, so specs 3–4 need no chat-box re-architecture.
