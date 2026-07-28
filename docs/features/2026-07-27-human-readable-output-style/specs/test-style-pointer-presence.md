---
status: done
owner: Maximilian Maksutovic
created: 2026-07-27
feature: 2026-07-27-human-readable-output-style
mode: batch
---

# Test Style Pointer Presence — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-27-human-readable-output-style/brief.md`
> **Status:** Ready
> **Date:** 2026-07-27
> **Estimated scope:** 1 session / 1 new test file / ~60 lines

---

## What

Add `tests/output-style-pointer.test.ts` asserting that each of the eleven
pointer-carrying skills cites `docs/templates/reference/output-style.md`, and
that `joycraft-setup` does not. The test is presence-only: it proves the wiring
exists, not that the prose complies.

The test reads the canonical sources under `src/skills/`, so it is decoupled from
the bundle-regeneration step and passes as soon as spec 3 lands.

## Why

Without it, a skill can lose its pointer in a future edit and nothing notices.
The pointer is the only mechanism carrying the style contract to the output
moment, so an unenforced pointer set decays silently back to the uncited-doc
failure mode.

## Acceptance Criteria

- [ ] `tests/output-style-pointer.test.ts` exists and runs under `pnpm test --run`. [src: design §2 item 5]
- [ ] A test asserts each of the eleven named skills cites `docs/templates/reference/output-style.md`. [src: D7]
- [ ] A test asserts `src/skills/joycraft-setup.md` does NOT cite the style doc. [src: D7]
- [ ] The eleven skill names are declared as an explicit list in the test file, not derived by scanning for `entry:` frontmatter. [src: D7]
- [ ] A test asserts no pointer-carrying skill cites the authoring-time path `src/templates/reference/output-style.md`. [src: D1]
- [ ] The test asserts presence only — no ordering assertion, no position assertion, no prose assertion. [src: design §4 "Enforce with a content test on the pointer; do not test prose quality"]
- [ ] The test file reads `src/skills/` and does not read `src/bundled-files.ts` or any `src/*-skills/` tree. [src: design §2 item 7]
- [ ] `pnpm test --run` passes. [src: brief "Success Criteria"]
- [ ] `pnpm typecheck` passes. [src: brief "Success Criteria"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Eleven skills cite the doc | Loop the explicit list, `expect(content).toContain('docs/templates/reference/output-style.md')` | unit |
| setup excluded | `expect(setupContent).not.toContain('output-style.md')` | unit |
| No authoring-path citation | `expect(content).not.toMatch(/src\/templates\/reference\/output-style/)` per skill | unit |
| Explicit list, not derived | Structural — the list is a literal array in the file | unit |
| Suite green | `pnpm test --run` | integration |
| Types green | `pnpm typecheck` | unit |

**Execution order:**

1. Write all tests above. If spec 3 has not landed, all eleven presence
   assertions fail — the correct red state.
2. Run tests to confirm they fail (red) before the pointers exist.
3. With spec 3's pointers in place, all assertions pass (green).

**Smoke test:** `pnpm test --run output-style-pointer` — one file, under a second.

**Before implementing, verify your test harness:**

1. Run the new test with the pointers absent — every presence assertion must
   FAIL. If they pass, the assertion is matching something other than the pointer
   (a comment, the spec text, a stray path mention).
2. Each test reads the real `src/skills/<name>.md` files — not fixtures, not
   generated copies.
3. Identify your smoke test — the single new file, seconds not minutes.

## Constraints

- MUST read the canonical sources under `src/skills/`. [src: design §2 item 7]
- MUST declare the eleven skills as an explicit literal list. [src: D7]
- MUST assert presence only. [src: design §4 "Enforce with a content test on the pointer; do not test prose quality"]
- MUST assert the negative case for `joycraft-setup`. [src: D7]
- MUST NOT add an ordering or position assertion — that idiom is already the most fragile in the suite and compounds the 1500-char window hazard. [src: brief "Hard Constraints"]
- MUST NOT assert on prose quality, output length, tone, or banned words. [src: brief "Out of Scope"]
- MUST NOT read `src/bundled-files.ts`, `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`, or `.claude/skills/`. [src: design §2 item 7]
- MUST NOT derive the skill list by scanning `entry:` frontmatter — the set deliberately crosses the taxonomy. [src: D7]
- MUST NOT edit any file under `src/skills/`. [src: brief "Hard Constraints"]
- MUST NOT add any runtime dependency. [src: brief "Hard Constraints"]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `tests/output-style-pointer.test.ts` | New vitest file: eleven presence assertions, one negative assertion for setup, and a negative assertion against the authoring-time path. |

## Approach

Mirror the substring idiom in `tests/skill-handoff.test.ts` — it loops a set of
skills and asserts `toContain` on each. That is the cheapest assertion that
proves the wiring, and it has no false-positive surface.

Declare the eleven skills as a literal array. Deriving the list from `entry:`
frontmatter would be tempting and would be wrong: the set deliberately includes
three `entry: agent` skills (`optimize`, `verify`, `decide`) because they emit
human-read reports, and deliberately excludes one `entry: human` skill
(`setup`) because it is a router. A derived list would silently drift back to the
taxonomy and undo D7.

Assert the *user-project* path `docs/templates/reference/output-style.md`, and
add the matching negative against `src/templates/reference/output-style.md`. A
shipped skill citing the authoring-time path would be a dead pointer in every
user project — the failure D1 exists to prevent — and it is the single most
likely mistake in spec 3.

Presence-only is a deliberate ceiling, not an oversight. D3's presence-vs-ordering
half remains open in
`docs/backlog/2026-07-27-output-style-deferred-decisions.md`; presence-only is the
standing recommendation, and adding ordering here would both preempt an open
decision and multiply the window-fragility this feature is trying to avoid.

**Rejected alternative:** presence + ordering, asserting the pointer precedes each
skill's report block. It would catch a pointer buried where nobody reads it, but
the ordering idiom in `retrieval-pass-skill.test.ts` is already the most fragile
assertion in the suite, and D3 has not decided in its favor.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Spec 3 has not landed | All eleven presence assertions fail. Correct red state — do not stub or skip. |
| A skill mentions the doc in a comment rather than as a live pointer | Presence-only cannot distinguish these. Accepted limitation, explicitly noted — the ceiling is wiring, not compliance. |
| A skill cites `src/templates/reference/output-style.md` | Fails the negative path assertion. That path is dead in a user project. |
| The pointer set changes later | Update the literal list, which forces a deliberate edit rather than silent drift. |
| `joycraft-setup` gains a pointer later | The negative assertion fails, correctly — D7 excluded it, and reversing that needs a new decision. |
| A skill is renamed | The test throws on a missing file rather than silently skipping — read the file directly rather than guarding with `existsSync`. |
