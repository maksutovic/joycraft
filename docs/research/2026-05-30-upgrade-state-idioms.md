# Research: how idiomatic tools upgrade files they scaffolded into a user's repo

**Date:** 2026-05-30
**Question:** Is joycraft's `.joycraft-version` (a ~11KB JSON manifest of per-file SHA-256 hashes, committed into the user's repo) the idiomatic way to do safe upgrades — or is there a lighter, more conventional pattern?
**Method:** deep-research workflow (24 sources, 106 claims, 25 adversarially verified 3-vote; 23 confirmed) + direct fetch of the two closest precedents (Copier, cruft).

---

## TL;DR

**The maintainer's instinct is correct: a committed per-file content-hash manifest is non-idiomatic.** No surveyed tool does it. The tools that solve joycraft's *exact* problem — scaffold files into a user's repo, then upgrade them later without clobbering edits — are **Copier** and **cruft**, and **neither stores per-file hashes**. They store only **(a) the template version/ref and (b) the answers**, then reconstruct the old baseline on demand by *regenerating the old version* and doing a **3-way merge**.

**Recommendation:** Replace the 99-hash manifest with a tiny `.joycraft/state.json` (or a `joycraft` key in an existing config) holding **just the installed version + any answers/config** — then derive the "original" baseline at upgrade time by reading the bundled files *of that version* (joycraft already ships every version's content in `bundled-files.ts`). This preserves the exact 3-way capability (auto-update untouched files, prompt on customized ones) while shrinking the state from ~11KB of hashes to a few lines, matching the Copier/cruft idiom.

---

## What each tool actually does (verified)

| Tool | Files live in user repo? | State it persists | Upgrade mechanism | Anti-clobber safety |
|------|--------------------------|-------------------|-------------------|---------------------|
| **Copier** | ✅ yes | `.copier-answers.yml` = **answers + template version** (no hashes) | Regenerate old version → diff fresh-vs-current → 3-way merge | Conflict markers (`inline`) or `.rej` files; user resolves |
| **cruft** | ✅ yes | `.cruft.json` = **template git ref/commit + answers + skip list** (no hashes) | Diff old vs new template output, review before apply | `cruft diff` (git-diff-like); review-before-apply |
| **shadcn/ui** | ✅ yes (closest UI analog) | `components.json` = **config only** (style/aliases/registries; closed schema, structurally cannot hold hashes/versions) | Copy-once, "you own it"; `add --diff` / `--dry-run` (CLI v4, Mar 2026) inspect-before-write; reconciliation delegated to human/agent | `--overwrite` defaults false → prompts |
| **Yeoman** | ✅ yes | `.yo-rc.json` (config), `.yo-resolve` (per-glob force/skip **policies**, not hashes) | Fresh disk-read compare at write time via in-memory mem-fs → conflicter | Interactive prompt y/n/a/x/d; never auto-merge, never silent overwrite |
| **Angular `ng update`** | ✅ yes | none (reads installed→target version delta from package.json) | Version-keyed **AST codemods** (schematics) transform files in place | **Hard-refuses on dirty git** (`--allow-dirty` default false) |
| **Vue CLI** | ✅ yes | none | Plugin **migrators** (jscodeshift AST transforms) | **Confirmation prompt on dirty git** |
| **Create React App** | ⛔ node_modules until `eject` | none | Un-ejected: version bumps "for free". **Ejected: updates stop entirely** | none for ejected (manual reconciliation or fork) |

### The patterns cluster into four families
1. **Regenerate-old-version + 3-way merge** — Copier, cruft. *State = version + answers, not hashes.* ← **joycraft's exact problem class.**
2. **Copy-once, you-own-it + inspect-before-write diff** — shadcn. *State = config only.*
3. **Version-keyed AST codemods** — Angular, Vue, @next/codemod (jscodeshift). Right when you must transform *user-authored* code; **wrong for refreshing tool-owned files** (joycraft's case: markdown/templates/scripts).
4. **Lean on git as the safety net** — Angular (refuse-on-dirty), Vue (prompt-on-dirty). Coarse repo-level gate, *not* per-file.

---

## Why joycraft ended up with hashes, and what it actually buys

joycraft commits a 99-entry SHA-256 map so `upgrade` can do a 3-way comparison: `current` vs `latest` vs **`recorded-original`**. The recorded-original is the only thing that lets it distinguish:
- "file differs because the user customized it" → **prompt**, vs
- "file differs because it's just an old version" → **auto-update silently**.

That capability is real and worth keeping (it's strictly nicer than shadcn/Yeoman, which collapse both into "it differs → prompt"). **The problem is the *shape* of the state, not the capability.**

## The insight that makes the manifest unnecessary

Copier/cruft reconstruct the baseline by **regenerating the old version's output** instead of storing a snapshot of it. joycraft can do the same *for free*, because **it already bundles the full content of its files** in `src/bundled-files.ts`, keyed by version on npm. So the "recorded-original" doesn't need to be 99 hashes in the repo — it's recoverable from "which version was installed" + the bundled content of that version.

The only missing ingredient is **knowing which version was last installed** — which is a *single field*, not 99 hashes. (Today's manifest stores `version` AND the hashes; only `version` is essential if we can fetch the old bundle. The wrinkle: the *currently installed* CLI only bundles the *current* version's files, not historical ones — so a pure "regenerate old version" needs either access to the old bundle (npm) or a fallback. See options below.)

---

## Options for joycraft (with the git-less tradeoff made explicit)

| Option | State footprint | Auto-update untouched? | Protects customized? | Git-less users | Idiomatic? |
|--------|-----------------|------------------------|----------------------|----------------|------------|
| **A. Keep hash manifest, just gitignore it** | ~11KB, hidden | ✅ | ✅ | ✅ works | ⚠️ still the outlier shape, but invisible |
| **B. Shrink to version+answers; derive baseline from bundled content** | a few lines | ✅ (when old bundle reachable) | ✅ | ✅ works | ✅ matches Copier/cruft |
| **C. shadcn model: copy-once + `--diff`, no auto-update** | config only | ❌ (always prompt/diff) | ✅ | ✅ works | ✅ very idiomatic |
| **D. Lean on git: refuse/warn on dirty tree, write + let `git diff` show changes** | none | n/a (git is the diff) | ✅ via git | ⛔ **no safety net** | ✅ (Angular/Vue) |
| **E. Stateless always-prompt (Yeoman)** | none | ❌ | ✅ | ✅ works | ✅ |

**The unavoidable tradeoff (the one the research could not dissolve):** the *only* way to keep "silently auto-update untouched files while prompting only on customized ones" **for users who don't use git** is to persist *some* per-file baseline (option A or B). Pure git-based (D) gives that capability away for git-less users; shadcn/Yeoman (C/E) give up silent-auto-update for everyone. So:

- If silent-auto-update-of-untouched-files is a feature joycraft wants to keep for everyone → **option B** (idiomatic shape, same capability, tiny state).
- If "you own these files, here's a diff" is acceptable → **option C** (simplest, most idiomatic, but every changed file prompts).

---

## Recommendation

**Primary: Option B.** Reduce `.joycraft-version` to a minimal state file (`version` + `answers`/config; drop the 99 hashes) and reconstruct the baseline from versioned bundled content. Same 3-way safety, idiomatic shape, ~11KB → a few lines. Also **gitignore it** regardless (it's a generated artifact). Caveat to resolve in design: how to obtain the *old* version's bundled files at upgrade time (fetch the old npm tarball, or keep a small N-version content cache, or fall back to option C behavior when the old bundle is unavailable).

**Acceptable simpler fallback: Option C** (shadcn copy-once + `--diff`), if we decide silent-auto-update isn't worth any persisted state. This is the least code and the most conventional, at the cost of more prompts on upgrade.

**Avoid: Option D as the sole mechanism** — it abandons joycraft's git-less users, who are plausibly a real segment (the tool targets any project).

---

## Caveats / open questions
- CRA and Vue CLI are deprecated/maintenance-mode — accurate historical data points, not evolving.
- shadcn's `--diff`/`--dry-run`/`--view` landed in CLI v4 (Mar 2026); older blogs describing a standalone `npx shadcn diff` are stale.
- Not independently verified (appeared only by inference): `@next/codemod` internals, Expo, Astro/Remix, Prisma migrate (note: Prisma's `_prisma_migrations` *table* IS a per-migration state ledger — a counterexample worth noting that state ledgers ARE idiomatic when artifacts aren't plain copy-once files).
- **Genuine product question that decides B vs C:** do joycraft users actually value silent-auto-update of untouched files, or is diff-and-prompt fine? That, not the research, determines whether dropping per-file baselines is a regression.

## Sources (primary)
- Copier — Updating: https://copier.readthedocs.io/en/stable/updating/
- cruft: https://cruft.github.io/cruft/
- shadcn CLI v4 changelog: https://ui.shadcn.com/docs/changelog/2026-03-cli-v4 · components.json schema: https://ui.shadcn.com/schema.json
- Yeoman conflicter: https://yeoman.github.io/environment/util_conflicter.js.html · file-system: https://yeoman.io/authoring/file-system
- Angular `ng update`: https://angular.dev/cli/update · schematics: https://angular.dev/tools/cli/schematics
- Vue CLI migrate: https://cli.vuejs.org/migrations/migrate-from-v3 · MigratorAPI PR: https://github.com/vuejs/vue-cli/pull/4090
- CRA eject (Abramov): https://github.com/facebook/create-react-app/issues/975
- jscodeshift: https://github.com/facebook/jscodeshift
