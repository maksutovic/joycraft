# Git Tracking and Reviewable PRs

> [Back to README](../../README.md)

## Git tracking: shared vs private

By default Joycraft assumes you want to **commit** the harness so your whole team
gets the same skills and workflow. Some teams prefer to keep the harness local
and track only the docs. Choose a profile at init time:

```bash
npx joycraft init --gitignore=shared    # default — commit .claude/, .agents/, .pi/, .github/
npx joycraft init --gitignore=private   # gitignore them; track only CLAUDE.md, AGENTS.md, docs/
```

Run interactively without the flag and `init` asks (right after the harness
picker). The choice is saved, so `npx joycraft upgrade` re-applies it
automatically. To switch an existing project later (or decide from CI), pass the
same flag to upgrade: `npx joycraft upgrade --gitignore=private`. `.gitignore`
edits are append-only — Joycraft never rewrites or removes your existing lines.

| Profile | Tracked in git | Gitignored |
|---------|----------------|------------|
| `shared` (default) | `CLAUDE.md`, `AGENTS.md`, `docs/`, `.claude/skills/`, `.agents/`, `.pi/`, `.github/skills/` | hidden upgrade state only (`docs/.joycraft/state.json`) |
| `private` | `CLAUDE.md`, `AGENTS.md`, `docs/` | `.claude/`, `.agents/`, `.pi/`, `.github/skills/joycraft-*/` |

> Switching an existing project to `private` only updates `.gitignore`. If
> harness files were already committed, untrack them with
> `git rm -r --cached .claude .agents .pi .github/skills/joycraft-*` (Joycraft prints this reminder and
> never runs git for you).
>
> Under `private`, the harness dirs aren't committed — so a teammate who clones
> the repo gets `CLAUDE.md`/`AGENTS.md` but no skills until they run
> `npx joycraft init` to regenerate them locally. Joycraft adds a one-line
> reminder to your generated `CLAUDE.md` and `AGENTS.md` for exactly this reason.

## Re-running init on an existing project

**`init` only creates *missing* files.** It is safe to run on a project that already has Joycraft (or a hand-tuned `CLAUDE.md`): an existing `CLAUDE.md`, `AGENTS.md`, template, or skill file is **skipped, never regenerated** — your customizations are left untouched. Only `--force` overwrites existing files. The run summary lists what it skipped (`Skipped N file(s) (already exist, use --force to overwrite)`) so you can see exactly what was preserved. This makes `init` the right command to **fill in a private-profile clone**: a teammate who clones a `private` repo gets the committed `CLAUDE.md`/`AGENTS.md`/`docs/` but not the gitignored harness dirs — running `npx joycraft init` regenerates the missing skill files locally and leaves the committed files alone.

## Reviewable PRs: workflow docs are collapsed

Joycraft's docs are two kinds of content. Durable knowledge — `CLAUDE.md`,
`AGENTS.md`, `docs/context/` — steers every future agent run and deserves review
eyes. Workflow exhaust — feature briefs and specs, discoveries, installed
templates — is historical by the time a PR is opened (the spec was reviewed in
conversation when it was written). To keep PRs reviewable, `init` and `upgrade`
write a `.gitattributes` marking the exhaust paths `linguist-generated=true`:

```gitattributes
docs/features/** linguist-generated=true
docs/bugfixes/** linguist-generated=true
docs/discoveries/** linguist-generated=true
docs/templates/** linguist-generated=true
```

GitHub collapses these files in the Files Changed view and excludes them from
diff stats — reviewers see your code and your durable knowledge, and any
collapsed doc is one click from expanding. The write is append-only and
idempotent (your existing `.gitattributes` lines are never touched); delete any
line to opt that path back into full review.
