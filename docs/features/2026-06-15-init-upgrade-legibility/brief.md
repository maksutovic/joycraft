---
status: in-review
owner: Maximilian Maksutovic
created: 2026-06-15
source: FoodTrails 0.6.16 field report (private-profile upgrade)
---

# Feature Brief — init/upgrade legibility + private-profile papercuts

> **Origin:** Max's field report dogfooding 0.6.16 on the FoodTrails repo (mature,
> heavily-customized, multi-stack, all 3 harnesses, switched to private profile).
> The upgrade + tune went well. One safety question about init-vs-upgrade for
> private-profile clones drove this brief, plus three small UX papercuts.

## TL;DR for the implementer

The research is **done** — Q1–Q4 below are answered from source, with citations.
**Net finding: `init` is already non-destructive; the gap is legibility, not
behavior.** No init/upgrade logic change is needed. The work is wording/docs +
small scaffolding. Decisions are locked (see "Decisions"). Just implement the
"Remaining work" checklist, validate, and PR.

---

## The question that started this (ANSWERED from source — do not re-research)

A teammate clones the private-profile repo. They get committed `CLAUDE.md`,
`AGENTS.md`, `docs/`, but NOT `.claude/`/`.agents/`/`.pi/` (gitignored) nor
`docs/.joycraft/state.json` (gitignored). They need skills locally. Which command
is safe — `init` or `upgrade`?

**Q1 — Is `init` destructive to an existing CLAUDE.md / docs/?**
**(a) No — it skips existing files; only `--force` overwrites.**
- `src/init.ts:176–186` (CLAUDE.md) and `189–197` (AGENTS.md): `if (existsSync(path) && !opts.force) { result.skipped.push(path) } else { writeFileSync(...) }` — existing file ⇒ skipped, never regenerated.
- `writeFile` helper `src/init.ts:46–51`: same skip-unless-`force` for every template/skill write.
- Effect on a private clone: committed files exist ⇒ skipped; gitignored harness dirs are absent ⇒ created. So `init` fills in exactly the missing harness files and leaves the 188-line hand-tuned CLAUDE.md + full context layer untouched. **Danger only with `--force`.**
- Caveat: it's *per-file skip*, not "detect install and skip wholesale" — but the clone-case effect is identical.

**Q2 — Is there a `--skills-only`/`--harness-only` flag?**
**No.** `src/cli.ts:23–25` — `init` exposes only `--force` and `--gitignore`. Not needed for safety (Q1 already gives "fill missing, touch nothing existing"). Decided NOT to add one this round (plain init already does the job; a flag is surface to maintain).

**Q3 — Can `upgrade` bootstrap a fresh private clone (no state file)?**
**No — it refuses.** `src/upgrade.ts:369–372`:
```ts
if (!readVersion(targetDir) && !hasLegacyState && !hasSkill) {
  console.log('This project has not been initialized with Joycraft.');
  console.log('Run `npx joycraft init` first.');
  return;
}
```
On a fresh private clone: `readVersion` null (state gitignored), `hasLegacyState`
false, `hasSkill` checks `.claude/skills/...` which is absent (gitignored) ⇒ all
false ⇒ bails, defers to init. (Its apply loop at `upgrade.ts:438` would treat
missing files as `kind:'new'` and create them — but the guard never lets it get
there. The guard, not the engine, is the blocker.) **So upgrade cannot serve the
clone case; init is the only working answer.**

**Q4 — Which command should the tune-injected note tell teammates to run?**
**`npx joycraft init` — it is both correct and safe.** Max's hand-written hedge
("keep the committed files, do not let init overwrite them") describes what the
tool already does, so it should NOT have to be hand-written. Fix = make the
guarantee legible, not change behavior.

**Also discovered:** `upgrade` ALREADY prints the `git rm --cached` untrack command
on a profile change to private (`src/upgrade.ts:426–429`, `PRIVATE_UNTRACK_COMMAND`).
Max missed it because it only prints when the profile *changes* in that run — not
on a re-run where private is already persisted. That's the "easy to miss" he hit.

---

## Decisions (locked — from the AskUserQuestion round)

1. **Scope = legibility-only.** Do NOT change init/upgrade logic (init is already
   safe per Q1). Fix wording + docs + small scaffolding.
2. **Do all three papercuts** (untrack-on-private, dead anchor, docs/backlog).
3. **No `--skills-only` flag** this round.

---

## Remaining work (checklist for the fresh session)

### 1. Drop the hedge in the private-setup note  (Task #12)
`src/improve-claude-md.ts` → `generatePrivateSetupNote()` (the single source used
by both CLAUDE.md and AGENTS.md; `PRIVATE_SETUP_NOTE_MARKER = 'After cloning, run'`
must stay in the string for idempotent detection). Extend the note to state init is
non-destructive — fold Max's hedge into the tool. Suggested wording:
> **Private setup:** The harness dirs (`.claude/`, `.agents/`, `.pi/`) are gitignored
> in this repo, so they aren't committed. After cloning, run `npx joycraft init` to
> regenerate the skill files locally — it only creates missing files and leaves your
> committed `CLAUDE.md`, `AGENTS.md`, and `docs/` untouched (use `--force` only if you
> deliberately want to regenerate them).
Also update the tune-skill instruction that injects/maintains this note
(canonical `src/skills/joycraft-tune.md`, the "Private-profile note" line) to match.
Then **regenerate the bundle** (`node scripts/generate-bundled-files.mjs`) so the
per-harness skill copies + bundled-files.ts update. Existing tests assert on the
'After cloning, run' marker — keep it.

### 2. Document init's skip-existing contract  (Task #13)
README: add to the init/upgrade sections that `init` only creates *missing* files
(skips an existing CLAUDE.md/AGENTS.md/docs unless `--force`), giving init the same
explicit safety story upgrade already has. Verify `init`'s `printSummary` reports
skipped files prominently (it does — `result.skipped`); strengthen wording if the
"skipped N existing files (use --force to overwrite)" line isn't obvious at runtime.

### 3. Papercut — dead `#reference-docs` anchor  (Task #14 — ALREADY RESOLVED, no code)
**No tool fix needed.** Verified: current generators emit ZERO `](#...)` in-page
anchors (`grep` of `improve-claude-md.ts`/`agents-md.ts`/templates is empty). The
dead `#reference-docs` anchor shipped from a pre-0.6 template since rewritten; it
only persists in Max's repo's old generated CLAUDE.md. Optional future nicety: teach
tune to flag dead in-page anchors. Do not fabricate a template change.

### 4. Papercut — scaffold `docs/backlog/`  (Task #15)
`CLAUDE.md`/`AGENTS.md` reference `docs/backlog/` but init never creates it (only
`docs/context/` is created up front — `src/init.ts:~93` `ensureDir(join(targetDir,
'docs','context'))`). Add `docs/backlog/` creation (a README stub or just ensureDir)
so the generated pointer isn't dangling. Add/adjust an init test.

### 5. Papercut — make `git rm --cached` harder to miss on private switch  (Task #16)
`upgrade` already prints `PRIVATE_UNTRACK_COMMAND` on profile change
(`src/upgrade.ts:426–429`). Make it louder, and surface it on the **tune** path too
when already-tracked harness files are detected (tune is where Max did the switch).
Optionally only show when `git ls-files` shows tracked `.claude/`/`.agents/`/`.pi/`
files (so it's not noise when nothing's committed). Keep it advisory — never run git.

## Hard constraints
- MUST NOT change init/upgrade overwrite behavior — Q1 proves it's already safe.
- MUST keep `PRIVATE_SETUP_NOTE_MARKER` substring intact (idempotency + tests).
- MUST regen the bundle after any skill/template edit (gitignored bundled-files.ts;
  sync test enforces it) and keep the per-harness copies in step.
- Run `pnpm test --run && pnpm typecheck` before commit; feature branch + PR.

## Success criteria
- The tune-injected private note carries the non-destructive guarantee inline; no
  user ever needs to hand-write the hedge.
- README documents init = create-missing-only (skip existing without `--force`).
- `docs/backlog/` exists after `init`.
- Switching to private surfaces the untrack command somewhere the user will see it
  (tune path included), ideally only when there are actually tracked harness files.
- Full suite green; bundle in sync.
```
