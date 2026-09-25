# Dynamic Joycraft — What the two panels said

> **Date:** 2026-09-24. **Written for:** the maintainer, before the follow-up discussion. **Style:** Simplified Technical English.
> **Sources:** `docs/research/2026-09-24-dynamic-joycraft-panel-claude.md` (Claude panel, 62 agents on Fable 5.1) and `docs/research/2026-09-24-dynamic-joycraft-panel-codex.md` (Codex panel, 49 agents on GPT-6 Astra). The panels did not read each other.
> **Status:** findings for discussion. No decision is stamped. No spec is written.

## Read this first

Two panels reviewed the plan to rebuild Joycraft as a dynamic harness. Each panel tested twelve claims, P0 to P11. Each claim got three to five skeptics and one judge. The judges ruled keep, flip, or qualify.

No claim survived as written. The Claude panel qualified ten claims and flipped two. The Codex panel qualified all twelve. A qualified claim is true only under the stated conditions. A flipped claim is replaced by a different claim.

## The verdict in one paragraph

Do not rebuild Joycraft. Repair it and consolidate it. The dynamic parts have weak or negative evidence. Those parts are generated skills, Jev routing on every prompt, fetched model guidance, a marketplace plugin, and a per-user profile. Every problem you named maps to an existing code path plus one missing gate. That gate is an independent check before a spec moves from in-review to done.

## What both panels agree on

Both panels reached these conclusions with no contact between them.

1. **Keep the invariant you named.** Gates, the lifecycle, the artifacts, STE, and the TDD loop stay fixed. This half of your Q1 answer stands.
2. **Do not generate process prose.** The newest SkillsBench data puts self-generated skills 8 to 11 points below no skills. Curated skills add 16 points. The generated half of your Q1 answer falls.
3. **Wire the `joycraft-verify` skill.** The skill exists. Session-end says the `verify-in-loop` step never shipped. Connect them. Both panels call this the first build.
4. **Hooks cannot be gates that nobody can override.** A PreToolUse hook that times out lets the action through. A Stop hook can block, but Claude Code ends the turn after eight blocks. Put the guarantee at the graduation step and at the merge. Your Q4 goal stands. Your Q4 mechanism falls.
5. **Measure the slop first.** You reported hours of unshippable output. No record of it exists in the repo. Both panels want a written failure analysis before anyone builds a gate for it.
6. **A router block in AGENTS.md is the only discoverability fix with data.** A hub skill is a trial, not a proven win. Rewrite the skill descriptions in your users' words. Hide the eleven agent-only skills from the model.
7. **Your colleagues will not receive any of this today.** The updater treats AGENTS.md as a create-once file. A new marker-patch ownership kind must exist before a router block or a folder-map fix reaches the fifteen existing installs.
8. **Compute state in a local script, not through npx at runtime.** Both panels want versioned local state for status and next spec. Both say computed status is not proof of acceptance. Codex found a parser defect in the Pi next-spec script. The dependency list "1,2" becomes "12".
9. **Keep curated model profiles.** Fetch vendor guides only as input for a dated, reviewed change. The profile is already a vendor file that every update replaces. Your Q3 wish works today.
10. **The CLI stays the single install and update authority.** A Claude plugin is acceptable only as an in-place skills-directory manifest that the CLI writes. No marketplace now. No MCP server.
11. **No skill dies whole.** Cut repeated ceremony first. Cut protocol only after an eval shows no loss. Codex maps the 22 skills into nine entrances.
12. **You declare clarity. The agent never infers it.** When you say the idea is clear, the artifact arrives. "I do not know yet" must be a real non-terminal state that decompose understands. When diagrams create clarity, they are allowed during exploration.
13. **Architecture defense survives as an opt-in mode of design and decide.** Each correction must land as a machine check or an owner-stamped decision row. It is not a universal setup step.
14. **An expertise label must not change which gates run.** Personalize explanation depth only, in an uncommitted local file. Altitude belongs to the project, not to the person.

## Where the panels disagree

The panels disagree on two claims. They differ in emphasis on three more.

**Jev (P6).** This is the real split. The Claude panel flipped your Q5 answer. It wants Jev off the hot path first, for document ranking and claim checks. Then it wants a shadow-mode router that logs its pick beside the skill actually used. Hot-path routing comes only after a held-out eval on your own skills. The Codex panel qualified the claim. It says advisory and hot-path are not opposites. The TypeSafe cookbook itself tests an ignorable suggestion on the hot path. Codex permits a narrow bring-your-own-key trial of skill suggestions on the hot path now. Both panels agree on the destination. Jev is never core. Acceptance never depends on Jev. Every Jev surface must beat a baseline with equal information. Codex also corrected two Claude-side facts. The model-free forced-eval hook scored 18 of 24 on hard prompts, not 22 of 22. The TypeSafe agreement does not force per-user keys. Bring-your-own-key is our product choice.

**User profile (P11).** Claude flipped it. Codex qualified it. The substance is identical. No expertise label changes gates or authority. Personal explanation preferences stay. The difference is the label.

**Gates (P3).** Claude puts the boundary at required status checks on main, plus the status transition. Main has no required checks today. Codex adds a semantic rule. Missing evidence, a timeout, an interruption, or exhausted retries mean unresolved, never passed. These fit together.

**Model guidance (P5).** Claude says the vendor message is subtractive. Codex says vendors also add instructions. Codex refutes the pack's claim that open-weight vendors publish nothing. DeepSeek and Qwen publish guidance.

**Skills (P8).** Claude keeps the research and `joycraft-verify` skills whole. Codex maps all 22 skills into nine entrances. Both keep every capability.

## What to build first

Both panels agree on the first build. Make graduation trustworthy.

1. Turn on required status checks on main: tests, typecheck, and STE lint. This is zero code. Main has no required checks today.
2. Add a test step to the Pi implement loop between implement and spec-done. Lines 79 to 88 run no tests today.
3. Make `joycraft-mark-done` refuse the done state without check evidence.
4. Wire `joycraft-verify` into the in-review to done transition. Record four states: worker stopped, checks passed, review unresolved, and accepted.

## What to measure first

Write the failure analysis of the recent bad sessions. Record the harness, the model, the spec, whether tests ran, whether `joycraft-verify` ran, and whether the defect was mechanical or semantic. Then measure escaped acceptance failures. Divide the outputs that independent review rejects by all outputs declared acceptable. Count repair minutes per attempted task. Take a baseline before any change.

## What moved in your own answers

| Your answer | Status after both panels |
|---|---|
| Q1 invariant: gates, lifecycle, artifacts, STE, TDD | Stands. |
| Q1 process prose generated | Falls. Curate prose. Generate only machine-checkable artifacts, and only behind an exit-code check. |
| Q2 you first, colleagues second | Stands. Easy transfer to colleagues is untested. |
| Q3 park Opus 5.5 | Stands. The delivery wish works today. Two parked specs, the subtract audit and the delivery fix, are candidates to unpark. |
| Q4 gates that nobody can override | Goal stands. The mechanism moves from hooks to graduation and merge. |
| Q5 Jev core on the hot path | Falls in both panels. Claude: shadow mode first. Codex: narrow hot-path trial now. |
| Artifacts after clarity, chat while exploring | Stands and is stronger. You declare clarity. |
| Architecture defense | Stands as opt-in. Corrections become checks or decision rows. |
| Background profile forks gates | Falls. Personalize explanations only. |

## What the evidence pack got wrong

The skeptics found about forty citation problems in the evidence pack I wrote. These are the largest.

- I cited SkillsBench version 1. Version 4 is current. It makes the case against self-generated skills stronger, not weaker.
- I attributed a 1 percent skill-listing budget to the Claude Code docs page. The page does not say that.
- I wrote that Stop hooks cannot block. They can. Claude Code caps them at eight consecutive blocks.
- I wrote that the folder-map function is called only by tests. It is called on the create paths. The map still never refreshes after install.
- I quoted canonical skill line counts that include two or three harness bodies. The installed files are much shorter.
- I wrote that open-weight vendors publish no prompting guidance. DeepSeek and Qwen do.
- I described a playbook collapse as an ACE result. It is a Dynamic Cheatsheet case that the ACE paper discusses.
- I wrote that edited Joycraft skills are replaced on every release. Local-only edits are preserved. Only simultaneous edits conflict.

## Open for our discussion

- Jev sequencing: shadow mode first, or a narrow hot-path trial now?
- Which parked Opus 5.5 specs to unpark. The answer can be none.
- Whether to run the slop failure analysis before the first build or beside it.
- The Codex nine-entrance skill map: adopt it as the consolidation target?
- The marker-patch ownership kind: build it first, so the colleagues receive anything at all?
- Whether "reimagining" is still the right word for a repair-and-consolidate program.

## Rulings side by side

| P | Claim | Claude | Codex | Agreement |
|---|---|---|---|---|
| P0 | A reimagining is warranted | qualify | qualify | Both: repair and consolidate, plus one checked-graduation gate. Both: measure the slop first. |
| P1 | Hub plus few doors | qualify | qualify | Both: only the router block has data. The hub is a trial. |
| P2 | CLI as state oracle | qualify | qualify | Both: local versioned script, never npx at runtime. Computed status is not acceptance. |
| P3 | Gates over advice | qualify | qualify | Both: no host sells a non-overridable hook. Move the guarantee to graduation and merge. |
| P4 | Gated generation | qualify | qualify | Both: curated default. Claude: generate only machine-checkable artifacts. Codex: one evaluated prose trial allowed. |
| P5 | Fetch-and-subtract profiles | qualify | qualify | Both: keep curated dated profiles, fetch as input. Codex: vendors also add. Open-weight guidance exists. |
| P6 | Jev on the hot path as core | **flip** | qualify | Both: never core, acceptance independent. Split on sequencing: shadow first versus narrow trial now. |
| P7 | Hybrid distribution | qualify | qualify | Both: CLI is the one update authority. Plugin only as in-place skills-directory manifest. No MCP. |
| P8 | Which skills die | qualify | qualify | Both: none dies whole. Cut ceremony, then protocol behind evals. Codex: nine entrances. |
| P9 | Front-loaded quality | qualify | qualify | Both: human-declared clarity, real "explore" state, bounded panels, visuals allowed in exploration. |
| P10 | Architecture defense | qualify | qualify | Both: opt-in mode of design and decide. Corrections become checks or owner-stamped rows. |
| P11 | Background profile forks gates | **flip** | qualify | Same substance: no label changes gates. Personalize explanations only. |
