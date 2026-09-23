---
status: done
owner: Maximilian Maksutovic
created: 2026-09-22
feature: 2026-09-22-fable-native-sdlc-harness
mode: checkpoint
---

# Add Triage Mode to Interview — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-22-fable-native-sdlc-harness/brief.md`
> **Status:** Ready
> **Date:** 2026-09-22
> **Estimated scope:** 1 session / 8 files / ~90 lines of skill prose plus regenerated variants

---

## What

A triage mode inside `joycraft-interview`, not a standalone skill. When `docs/intent/` holds untriaged files, the skill offers triage before opening the floor for a fresh brainstorm.

The mode is defined by four behaviors, added as a new step at the very top of the skill body, ahead of the existing `### 1. Open the Floor` at `src/skills/joycraft-interview.md:16`:

1. **List.** Read `docs/intent/*.md`, skipping `README.md`. An intent is **untriaged** when its `Status:` header value is `untriaged` or the `Status:` header is absent entirely. Any other value (`triaged`, `routed: interview`, `discarded`, or anything a human typed) means triaged, and the file is not listed. Spec 6 writes `Status: untriaged` on every interview-emitted intent, so a fresh inbox is entirely untriaged.
2. **Offer.** With one or more untriaged intents, present the count and the list, then ask whether to triage now or start a fresh brainstorm. With zero untriaged intents, say nothing and fall straight through to Step 1 — silence, not an empty-list report.
3. **Propose and route.** For each intent the human chooses to triage, the agent proposes tags and a priority, and the human routes it to exactly one of `interview`, `bugfix`, `backlog`, or `discard`. The agent proposes; the human decides. Routing never happens on the agent's own judgment, and a route is never inferred from silence.
4. **Stamp.** The chosen route is written back into the intent file's `Status:` header. The intent file stays in `docs/intent/` in every case, including `discard` — a discarded intent is stamped, never deleted, so the inbox keeps its own record.

Routing is a stamp plus a handoff line, not an execution. `interview` means continue into this skill's Step 1 with that intent as context. `bugfix` and `backlog` mean the skill names the next command for the human to run; triage does not invoke `joycraft-bugfix` and does not write to `docs/backlog/` itself, which would violate the skill's standing never-auto-write-backlog rule.

Triage renders no HTML artifact and stays in chat. This is a judgment call worth stating plainly: the brief does not say either way. The eight review gates each render an artifact because each produces a document the human reviews and approves; triage produces a routing decision per file and a `Status:` stamp, and `tests/gate-contract.test.ts` pins `joycraft-interview` at exactly one slot-template reference and one render step. A second render would move both counts and reframe triage as a ninth gate, which nothing in the brief asks for.

## Why

An inbox with no triage becomes a graveyard. The brief's user story is explicit: a developer wants interview to show untriaged intents and let them route each one. D10 settled the form — a mode of interview rather than a new skill, so there is one fewer skill to install and discover. D3 settled the authority — the agent proposes tags and priority, the human routes, because commit is acceptance and a human owns the accept or reject.

## Acceptance Criteria

- [ ] `joycraft-interview` lists untriaged intents from `docs/intent/` before the Open the Floor step [src: brief "Success Criteria"]
- [ ] Untriaged is defined by the `Status:` header value: `untriaged` or an absent `Status:` header; every other value counts as triaged and is not listed [src: D10]
- [ ] `docs/intent/README.md` is excluded from the listing [src: brief "Success Criteria"]
- [ ] With zero untriaged intents the skill says nothing about triage and proceeds directly to Open the Floor [src: brief "Success Criteria"]
- [ ] With two untriaged intents the skill offers triage before a fresh brainstorm [src: brief "Success Criteria"]
- [ ] For each triaged intent the agent proposes tags and a priority [src: D3]
- [ ] The human routes each intent to exactly one of `interview`, `bugfix`, `backlog`, or `discard`; the agent never routes on its own judgment and never infers a route from silence [src: D3]
- [ ] The chosen route is stamped into the intent file's `Status:` header [src: brief "Decomposition"]
- [ ] The intent file remains in `docs/intent/` after every route, including `discard` [src: D10]
- [ ] Bundled variants are regenerated (`scripts/generate-bundled-files.mjs`) and installed copies synced (`pnpm sync-skills`) in the same commit as the `src/skills/` edit [src: brief "Hard Constraints"]
- [ ] Build passes [src: brief "Test Strategy"]
- [ ] Tests pass [src: brief "Test Strategy"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Triage precedes the floor | `tests/interview-triage.test.ts` asserts the triage heading's character offset in `src/skills/joycraft-interview.md` is lower than that of `Open the Floor` | unit |
| Untriaged defined | Same file asserts the skill text defines untriaged in terms of a `Status:` value of `untriaged` or an absent header | unit |
| README excluded | Same file asserts the skill text names `README.md` as excluded from the listing | unit |
| Four routes present | Same file asserts all four route words appear inside the triage region: `interview`, `bugfix`, `backlog`, `discard` | unit |
| Human routes | Same file asserts the triage region states the agent proposes and the human decides | unit |
| File retained on discard | Same file asserts the triage region says the intent file stays in place, never deleted | unit |
| Silent on empty inbox | Same file asserts the triage region carries the zero-intent silent fall-through instruction | unit |
| No second gate | `tests/gate-contract.test.ts` unchanged and green — `joycraft-interview` keeps exactly one slot-template reference and one render step | regression |
| Generated parity | `tests/interview-triage.test.ts` repeats the four-route and ordering assertions against `src/claude-skills/joycraft-interview.md` and `src/omp-skills/joycraft-interview.md` | unit |
| Backlog rule intact | `tests/skill-backlog.test.ts` unchanged and green — interview still asks before writing to `docs/backlog/` | regression |
| Installed copies fresh | `tests/installed-skills-sync*.test.ts` and `tests/bundled-files-sync.test.ts` green after `pnpm sync-skills` | regression |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** the triage-precedes-the-floor test (`pnpm test tests/interview-triage.test.ts`).

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: pause for human approval before the first write to `src/skills/joycraft-interview.md`, because skill content is an ask-first boundary [src: brief "Execution Strategy"]
- MUST: regenerate bundled variants with `scripts/generate-bundled-files.mjs` and run `pnpm sync-skills` in the same commit as the skill edit; `tests/regenerate-bundled-files.test.ts` runs the generator in a `beforeAll`, so deferring the sync commits a red suite [src: brief "Hard Constraints"]
- MUST: edit only `src/skills/joycraft-interview.md` — the per-harness trees are generated and never hand-edited [src: brief "Hard Constraints"]
- MUST: leave the `Status:` value the human's route word, so a later reader can tell routed-to-bugfix from routed-to-backlog [src: brief "Decomposition"]
- MUST: keep every path inside the skill project-relative [src: brief "Hard Constraints"]
- MUST NOT: ship a standalone triage skill [src: brief "Out of Scope"]
- MUST NOT: add a `joycraft intent` or triage CLI command [src: brief "Out of Scope"]
- MUST NOT: delete, move, or archive an intent file on any route, `discard` included [src: D10]
- MUST NOT: render an HTML artifact for triage — no second render-and-open block, no second `REVIEW_GATE_TEMPLATE.html` reference, and no second slot-template reference; `joycraft-interview` stays at one of each in `tests/gate-contract.test.ts` [src: D17]
- MUST NOT: invoke a downstream skill or write to `docs/backlog/` from triage — routing to `bugfix` or `backlog` names the next command for the human, and every backlog entry stays user-confirmed [src: D18]
- MUST NOT: change what the intent file's body sections are — that shape belongs to `docs/templates/INTENT_TEMPLATE.md` [src: brief "Hard Constraints"]
- MUST NOT: add runtime dependencies [src: brief "Hard Constraints"]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/skills/joycraft-interview.md` | New triage step ahead of `### 1. Open the Floor`: list, offer, propose-and-route, stamp; route-to-next-command handoff lines |
| Modify | `src/claude-skills/joycraft-interview.md` | Regenerated |
| Modify | `src/codex-skills/joycraft-interview.md` | Regenerated |
| Modify | `src/pi-skills/joycraft-interview.md` | Regenerated |
| Modify | `src/copilot-skills/joycraft-interview.md` | Regenerated |
| Modify | `src/omp-skills/joycraft-interview.md` | Regenerated |
| Modify | `src/bundled-files.ts` | Regenerated `SKILLS` and per-harness records |
| Modify | `.claude/skills/joycraft-interview/SKILL.md` | Synced installed copy |
| Modify | `.agents/skills/joycraft-interview/SKILL.md` | Synced installed copy |
| Modify | `.pi/skills/joycraft-interview/SKILL.md` | Synced installed copy |
| Modify | `.github/skills/joycraft-interview/SKILL.md` | Synced installed copy |
| Modify | `.omp/skills/joycraft-interview/SKILL.md` | Synced installed copy |
| Create | `tests/interview-triage.test.ts` | Ordering, untriaged definition, four routes, retention, silence, and generated-parity assertions |

## Approach

Insert the triage step as a new `### 0` heading (or an unnumbered `## Triage the Inbox First` section) directly above `### 1. Open the Floor`, so the offset ordering is structural and the existing step numbering is untouched. It goes after the entry-checker paragraph, which the generator injects at build time from `COMMON_UPDATE_ENTRY` in `scripts/lib/skill-template.mjs` and which is absent from the authored source — never author a second checker call. Keep the step short: a listing rule, a per-file proposal shape, the four route words, and the stamp instruction. Reuse the skill's existing question directive by citing it rather than restating the three question rules, so the triage question inherits the harness-appropriate question surface, the two-real-options rule, and `defer to <name>`; this keeps one home per fact and avoids moving the question-contract assertion counts in `tests/gate-contract.test.ts`.

The route is a stamp plus a handoff, which keeps this spec's blast radius inside one skill. Routing to `bugfix` prints the `joycraft-bugfix` command with the intent path as its argument — spec 8 makes that argument meaningful — and routing to `interview` simply continues into Step 1 with the intent loaded as context.

Rejected alternative: a dedicated `joycraft-triage` skill. It reads cleaner as a unit and would carry its own tests without touching the interview's fragile character-offset guards, but D10 settled the opposite on the grounds that every additional skill is one more thing to install and discover, and the discoverability work already on record says external developers struggle to get skills auto-invoked at all.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| `docs/intent/` absent entirely | Silent fall-through to Open the Floor; never an error, never a directory creation from triage |
| `docs/intent/` holds only `README.md` | Treated as zero untriaged intents; silent fall-through |
| Intent file has no `Status:` header | Counted as untriaged and listed |
| Intent file has `Status:` with an unrecognized value | Counted as triaged and not listed; the inbox never re-surfaces something a human already stamped |
| Ten or more untriaged intents | List them all with the count stated; the human may triage a subset and leave the rest untriaged |
| Human routes to `discard` | `Status:` stamped `discard`; file stays in `docs/intent/` |
| Human declines triage and starts a fresh brainstorm | No stamps written; the inbox is unchanged; the new interview emits its own intent per spec 6 |
| Human defers a routing question to a named person | The skill's existing `defer to <name>` rule applies: recorded as assigned, confirmed in one line, and the intent stays untriaged |
| Intent file is malformed or unreadable | Skipped with a one-line note, never a crash and never a silent drop |
