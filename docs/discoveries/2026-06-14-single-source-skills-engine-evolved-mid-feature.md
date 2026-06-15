---
status: todo
owner: Maximilian Maksutovic
created: 2026-06-14
feature: 2026-06-11-single-source-skills
---

# Discoveries — Single-Source Skills

**Date:** 2026-06-14
**Specs:** all 8 in `docs/features/2026-06-11-single-source-skills/specs/`

## The engine grew two capabilities the spec didn't anticipate

**Expected:** Spec 1 defined the engine as body-only `{{var}}` substitution plus body-level `<!-- harness:NAME -->` blocks. Specs 5 and 6 would consume the engine as-is.

**Actual:** Real skills needed substitution **and** conditional blocks **in frontmatter**, not just the body:
- Spec 5: skill `description:` lines contain `{{boundary_file}}` and `{{skill_prefix}}` — required frontmatter-level substitution (1 line of engine code + 3 tests).
- Spec 6: `joycraft-implement-feature`'s `description:` differs three ways across harnesses ("fresh-context subagent per spec" vs "sequential chain" vs "delegates to the `joycraft-implement-loop` driver") — required `processHarnessBlocks` to run on frontmatter (1 line of engine code).
- Spec 5 also needed block-line whitespace handling so a stripped block doesn't leave a blank-line residue.

**Impact:** Engine is now larger than spec 1 described, but cohesively — both extensions follow the same "block-then-substitute" pipeline applied to two surfaces (body and frontmatter) instead of one. Spec 1's substitution-engine.md still reads as a faithful core; the frontmatter passes are clearly named additions. **For future single-source work:** assume the same pattern for any new authoring surface — apply blocks first, then variables, on each surface, in that order.

## The "clean vs dirty" partition was a planning fiction

**Expected:** Brief said ~11 clean / ~9 dirty. Research re-audit said 2 strictly-clean / 18 dirty. Spec 4 was the 2-skill clean POC.

**Actual:** Even the 2 "strictly clean" skills weren't. `joycraft-collaborative-setup` had a mid-sentence wording rewrite (`"tells Claude"` / `"tells the agent"`) and a Cat B codex authoring gap (`/clear` literal vs the `{{clear}}` multi-surface expansion) — neither expressible by the 4-var allowlist without conditional blocks. Spec 4 retired mid-run; specs 5 + 6 absorbed its two skills.

**Impact:** The "POC on clean before going wide" guardrail was already paid for by spec 3's 60-file sweep — spec 4 added no validation value. **For future migrations of this shape:** if a "POC bucket" exists primarily to de-risk a downstream bucket, audit each item against the actual engine constraints (not the original audit's allowlist) before locking in the bucket. The strict allowlist is the source of truth, not the human classification.

## Spec-vs-spec contradictions are recoverable mid-feature

**Expected:** Specs once `in-review` are stable artifacts; resolving disagreements between them requires re-decomposition.

**Actual:** Twice this feature, two `in-review` specs contradicted each other (spec 1 vs spec 3 on Pi's `{{boundary_file}}` expansion; spec 6's "fold into universal" vs its own byte-identical AC for `joycraft-research`). Both resolved with surgical edits — a small fixup commit aligning the engine with spec 3's chosen canonical, and an in-spec deviation choosing byte-identity over the universal fold. Neither required restarting the queue.

**Impact:** The driver loop's fail-fast behavior is the right discipline — it surfaces these conflicts at the moment a subagent hits them, not later in PR review. **For future runs:** when a subagent stops mid-spec citing a contradiction with an earlier spec, take it seriously; small fixup commits to earlier specs are legitimate. Don't paper over by editing only the spec the subagent is currently on.

## Smaller items kept

- `src/bundled-files.ts` is gitignored (line 11); any spec criterion saying "include `src/bundled-files.ts` in the same commit" is unreachable. Use the markdown files + a regen step in the README as the contract instead. Already in memory as [[project_upgrade_machinery_broken]] and [[project_frictionless_implement]].
- 3 unify-on-claude skills (`joycraft-implement`, `joycraft-spec-done`, `joycraft-decompose`) needed pi-only conditional blocks despite spec 5 forbidding them — pi has machinery the other harnesses don't (loop-iteration check, isolated-mode paragraph, `joycraft-implement-loop` Hand Off). The blocks landed in spec 5 rather than escalating to spec 6 because the driver task was "complete the whole spec." Worth a follow-up: should those three skills' pi-only sections be re-classified as spec-6 conditional-block work in the brief? Probably yes — but it's a doc-only fix.
