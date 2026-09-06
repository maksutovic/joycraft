---
status: in-review
owner: Maximilian Maksutovic
created: 2026-09-03
feature: 2026-09-02-omp-support
mode: isolated
---

# Audit Harness Blocks for omp — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-02-omp-support/brief.md`
> **Status:** Ready
> **Date:** 2026-09-03
> **Estimated scope:** 1 session (isolated context) / 22 skill files + 3 test files / ~68 block decisions

---

## What

Walk every `<!-- harness:… -->` block across the 22 canonical skills in `src/skills/` and decide, per block, whether `omp` belongs in its selector. Apply the D9 rule: **omp takes Pi's invocation syntax but Codex/Copilot's runtime semantics** — omp has no headless loop until the runtime port ships as its own feature. Then fix the optimize skill's MCP-path row for omp, add `tests/omp-skill-parity.test.ts` cloned from the Codex parity suite, and extend the two gate-contract tests that currently hardcode the three-non-claude-harness structure.

Harness blocks are **allow-lists**: a block whose selector omits `omp` is stripped from the omp variant. So without this spec, omp skills ship missing their output-style pointers, gate contracts, and subagent guidance — silently, with a green test suite.

## Why

Spec 1 makes omp skills *generate*; this spec makes them *correct*. Skipping it ships 22 subtly broken skills that no existing assertion catches.

## Block census (measured 2026-09-03 on `src/skills/*.md`)

| Selector | Count | Disposition |
|---|---|---|
| `claude` | 38 | Untouched — claude-only, omp never matches |
| `pi` | 10 | **Verdict required per block.** Pi invocation syntax is right for omp, but any block naming `joycraft-implement-loop` or a `.pi/` path is false for omp |
| `codex\|pi\|copilot` | 7 | Add `omp` — the no-runtime semantics are true for omp |
| `codex\|pi` | 4 | Evaluate, then add `omp` |
| `codex\|copilot` | 4 | Evaluate, then add `omp` |
| `copilot` | 1 | Evaluate |
| `codex` | 1 | Evaluate |
| **Total** | **68** | **30 non-claude blocks carry real decisions** |

Per-file block counts: `joycraft-optimize` 7, `joycraft-implement-feature` 7, `joycraft-collaborative-setup` 5, `joycraft-verify` 4, `joycraft-research` 4, `joycraft-decide` 4, `joycraft-tune` 3, `joycraft-spec-done` 3, `joycraft-new-feature` 3, `joycraft-lockdown` 3, `joycraft-interview` 3, `joycraft-implement` 3, `joycraft-design` 3, `joycraft-decompose` 3, `joycraft-bugfix` 3, `joycraft-session-end` 2, `joycraft-harden` 2, and 1 each in `joycraft-setup`, `joycraft-implement-level5`, `joycraft-gather-context`, `joycraft-add-fact`, `joycraft-add-context`.

### Known false-for-omp sites (pre-located — verify, don't trust blindly)

| File:line | Why it is false for omp |
|---|---|
| `joycraft-decompose.md:447,454` | Names the `joycraft-implement-loop` driver and `pi -p` per-spec process |
| `joycraft-implement.md:117` | "launched by `pi -p`" loop-iteration check |
| `joycraft-implement.md:134` | `.pi/scripts/joycraft/` conditional for `joycraft-mark-done` |
| `joycraft-implement.md:151` | "the `joycraft-implement-loop` driver automates it" |
| `joycraft-implement-feature.md:14` | Frontmatter `description` names the loop driver — and the description must stay **non-empty** for omp |
| `joycraft-implement-feature.md:42,89,136,153` | `.pi/scripts/joycraft/` paths and the loop-as-driver instruction |
| `joycraft-spec-done.md:16` | "On the Pi isolated-mode loop (`joycraft-implement-loop`)" |
| `joycraft-optimize.md:117` | MCP config path `~/.pi/config.json` — omp needs its own path row |
| `joycraft-tune.md:195,197` | Private-profile dir lists `.claude/, .agents/, .pi/` — must include `.omp/` |

## Acceptance Criteria

- [ ] Every `<!-- harness:… -->` block in `src/skills/*.md` has been evaluated for omp membership, and each of the 30 non-claude blocks either names `omp` or is deliberately left without it [src: brief "Hazards carried into the specs"]
- [ ] No generated omp skill contains the string `joycraft-implement-loop` [src: D9]
- [ ] No generated omp skill contains a `.pi/` path [src: D9]
- [ ] Every generated omp skill uses `/skill:joycraft-` as its invocation prefix and `/new` as its clear command [src: brief "Success Criteria"]
- [ ] Every generated omp skill names `.omp/skills` as its skills dir where a skills dir is named [src: D8]
- [ ] `joycraft-optimize` has an omp MCP row and the omp variant does not instruct reading `~/.pi/config.json` [src: brief "Hard Constraints"]
- [ ] `joycraft-tune`'s private-profile dir list includes `.omp/` in the omp variant [src: D9]
- [ ] Every generated omp skill has a non-empty `description:` — including `joycraft-implement-feature`, whose description is per-harness [src: brief "Hard Constraints"]
- [ ] `tests/omp-skill-parity.test.ts` exists, cloned from `tests/codex-skill-parity.test.ts`, asserting file-set parity with `src/claude-skills/` and matching `name` fields [src: D6]
- [ ] `tests/gate-contract.test.ts` includes `omp` in its non-claude harness loop and its structural comments are updated [src: brief "Hard Constraints"]
- [ ] `tests/gate-slot-contract-placement.test.ts` includes `omp-skills` in its tree list [src: brief "Hard Constraints"]
- [ ] The omp variant of every gate skill carries the structured-chat question fallback, never a claude-only tool name [src: brief "Out of Scope"]
- [ ] `src/omp-skills/` and `.omp/skills/` are regenerated, synced, and committed in this spec's own commit [src: AGENTS.md]
- [ ] `pnpm test` and `pnpm typecheck` pass [src: brief "Success Criteria"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| No `joycraft-implement-loop` in omp skills | New assertion in `tests/omp-skill-parity.test.ts` — grep every `src/omp-skills/*.md` | parity |
| No `.pi/` path in omp skills | Same file — assert no `.pi/` substring | parity |
| Invocation prefix / clear command | Same file — assert `/skill:joycraft-` present and `/clear` absent where a clear command is named | parity |
| `.omp/skills` as skills dir | Same file — assert no `.pi/skills` or `.github/skills` substring | parity |
| File-set parity + name fields | `tests/omp-skill-parity.test.ts` — clone of the Codex suite's three describe blocks | parity |
| Non-empty description (all 22) | Same file — parse frontmatter, assert `description` non-empty for every skill | parity |
| optimize omp MCP row | `tests/omp-skill-parity.test.ts` — the omp variant of `joycraft-optimize` names an omp MCP path, not `~/.pi/config.json` | parity |
| tune private-dir list | Same file — omp variant of `joycraft-tune` contains `.omp/` | parity |
| gate-contract covers omp | `tests/gate-contract.test.ts` — extend the `['codex','pi','copilot']` loop to include `'omp'`; assert the fallback marker and absence of the claude-only tool name | unit |
| slot placement covers omp | `tests/gate-slot-contract-placement.test.ts` — add `'omp-skills'` to the tree list; existing per-tree assertions then apply | unit |
| generated tree fresh | `tests/generated-skills-fresh.test.ts` (extended in spec 1) still passes after the edits | integration |
| installed tree synced | `tests/installed-skills-sync.test.ts` still passes after `pnpm sync-skills` | integration |

**Execution order:**
1. Write all tests above — they should fail against current code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** `pnpm test tests/omp-skill-parity.test.ts` — the fastest signal that a block decision was wrong.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes

## Constraints

- MUST: apply D9 — omp gets Pi's invocation syntax and Codex/Copilot's runtime semantics; no block claiming a headless loop or a `.pi/` path may reach the omp variant [src: D9]
- MUST: evaluate every one of the 68 blocks; harness blocks are allow-lists, so omission is a silent failure [src: brief "Hazards carried into the specs"]
- MUST: keep every generated omp skill's `description` non-empty — omp's provider rejects skills without one [src: brief "Hard Constraints"]
- MUST: add `tests/omp-skill-parity.test.ts` cloned from `tests/codex-skill-parity.test.ts` [src: D6]
- MUST: update `tests/gate-contract.test.ts` and `tests/gate-slot-contract-placement.test.ts`, which assert the current three-block harness structure [src: brief "Hard Constraints"]
- MUST: keep the omp variant on the structured-chat question fallback — omp's `ask` tool is out of scope [src: brief "Out of Scope"]
- MUST: run `pnpm sync-skills` and commit `src/omp-skills/` and `.omp/skills/` in this spec's own commit [src: AGENTS.md]
- MUST NOT: edit `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`, `src/copilot-skills/`, or `src/omp-skills/` by hand — edit `src/skills/` and regenerate [src: brief "Hard Constraints"]
- MUST NOT: change the meaning of any existing claude/codex/pi/copilot variant — this is an additive audit [src: brief "Hazards carried into the specs"]
- MUST NOT: port the Pi headless runtime or reference `.omp/scripts/`, `.omp/extensions/`, or `.omp/agents/` [src: D1]
- MUST NOT: reference absolute paths [src: brief "Hard Constraints"]

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `src/skills/*.md` (22 files) | Harness-block selectors gain `omp` where D9 says the text is true; new omp-specific blocks where Pi's text is false (notably optimize's MCP row and tune's dir lists) |
| Create | `tests/omp-skill-parity.test.ts` | Cloned from the Codex parity suite + omp-specific negative assertions |
| Modify | `tests/gate-contract.test.ts` | `omp` in the non-claude harness loop; structural comments updated from "three" |
| Modify | `tests/gate-slot-contract-placement.test.ts` | `omp-skills` in the tree list; comments updated |
| Generate | `src/omp-skills/*.md`, `.omp/skills/**` | Regenerated + synced |

## Approach

Work file by file, not selector by selector — context per skill is what makes a verdict correct, and the 22 files vary enormously in block density (optimize and implement-feature carry 7 each; five files carry one).

For each non-claude block, ask one question: **is this text true when omp reads it?**

- Text about invocation syntax, session boundaries, or skills-dir paths → true for omp (the transform's `{{vars}}` handle it). Add `omp`.
- Text about the absence of a headless runtime, or about doing something manually because the harness has no driver → true for omp. Add `omp`.
- Text naming `joycraft-implement-loop`, `pi -p`, or a `.pi/` path → **false for omp.** Either exclude omp from that block, or split it: keep the Pi-specific block as-is and add a sibling block whose selector includes `omp` carrying the Codex/Copilot no-runtime text.

The split pattern is the workhorse. `joycraft-implement-feature` is the clearest case: its Pi block says the loop driver already exists and the agent's job is to point it at the queue, while its codex/copilot block describes running specs inline. omp needs the second text, not the first. Prefer widening an existing `codex|copilot` selector to `codex|copilot|omp` over authoring new prose — reusing text that already passes review is both less work and less risk than writing omp-specific paragraphs.

Two files need genuinely new content rather than selector edits:

- **`joycraft-optimize.md:117`** — the MCP row is a per-harness path. Pi's is `~/.pi/config.json`; omp needs its own row. The brief scopes this narrowly: the path fix only, not an audit of omp MCP servers.
- **`joycraft-tune.md:195,197`** — the private-profile prose enumerates `.claude/, .agents/, .pi/` in three places (the note, the clone instruction, the `git rm -r --cached` command). Spec 2 adds `.omp/` to `PRIVATE_PROFILE_IGNORES`; this text must agree or tune tells users to untrack the wrong set of directories.

Position sensitivity: `tests/gate-slot-contract-placement.test.ts` and `tests/confidence-scoring-skill.test.ts` slice fixed regions out of the installed copies. Adding a block shifts line offsets. Run the full suite, not just the parity test, before declaring green — a passing parity test with a failing slice test means the edit was correct but a windowed assertion needs its region updated.

**Rejected alternative:** a mechanical pass that adds `omp` to every selector already containing `pi`, then removes it from the blocks that mention the loop. Fast, and it gets ~80% right — but it inverts the burden of proof on exactly the blocks where being wrong is silent, and the `codex|copilot` blocks (which omp usually *should* join) would be missed entirely since they never mention Pi. The per-block verdict is the deliverable; the mechanical pass is at best a first draft to review against.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| A block whose text is true for omp but whose selector is `claude` only | Leave alone — claude-only blocks are out of scope; widening them risks the four existing variants |
| Frontmatter `description` block in `joycraft-implement-feature` | The omp branch must produce a non-empty description that does not name the loop driver |
| A `pi` block that is entirely invocation-syntax with no runtime claim | Widen to `pi\|omp` — the `{{vars}}` render correctly for both |
| A `codex\|pi` block whose Codex half is shell-string-specific | Verify the text is harness-neutral before adding omp; if it is Codex-specific, split rather than widen |
| Adding a block shifts a windowed test's slice | Update the window; do not weaken the assertion into a substring search |
| Regeneration produces an omp skill byte-identical to the Pi one | Fine and expected for skills with no runtime-specific text |
| A skill with zero harness blocks | No work; parity test still asserts it exists in `src/omp-skills/` |
| Two sibling blocks both matching omp | Both render — the transform does not dedupe. Ensure selectors are mutually exclusive for omp or the variant says the same thing twice |
