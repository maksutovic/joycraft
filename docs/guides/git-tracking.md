# Git Tracking and Reviewable PRs

> [Back to README](../../README.md)

## Git tracking: shared vs private

By default Joycraft assumes you want to **commit** the harness so your whole team
gets the same skills and workflow. Some teams prefer to keep the harness local
and track only the docs. Choose a profile at init time:

```bash
npx joycraft@latest update --gitignore=shared    # default — commit .claude/, .agents/, .pi/, .github/
npx joycraft@latest update --gitignore=private   # gitignore them; track only CLAUDE.md, AGENTS.md, docs/
```

Run interactively without the flag and `init` asks (right after the harness
picker). The choice is saved in the installation manifest, so
`npx joycraft@latest update` re-applies it automatically. To switch an existing
project later (or decide from CI), pass the same flag to update:
`npx joycraft@latest update --gitignore=private`. `.gitignore`
edits are append-only — Joycraft never rewrites or removes your existing lines.

The shared installation manifest is `docs/.joycraft/manifest.json`; the private
manifest is `docs/.joycraft/local/manifest.json`. The checker cache, policy,
and other local state live under `docs/.joycraft/local/`.

| Profile | Tracked in git | Gitignored |
|---------|----------------|------------|
| `shared` (default) | `CLAUDE.md`, `AGENTS.md`, `docs/`, `.claude/skills/`, `.agents/`, `.pi/`, `.github/skills/`, `docs/.joycraft/manifest.json` | local checker settings/cache, transaction state, and `docs/.joycraft/state.json` |
| `private` | `CLAUDE.md`, `AGENTS.md`, `docs/` except its local Joycraft state | `.claude/`, `.agents/`, `.pi/`, `.github/skills/joycraft-*/`, `.omp/`, `docs/.joycraft/local/` |

> Switching an existing project to `private` only updates `.gitignore`. If
> harness files were already committed, untrack them with
> `git rm -r --cached .claude .agents .pi .github/skills/joycraft-*` (Joycraft prints this reminder and
> never runs git for you).
>
> Under `private`, the harness dirs aren't committed — so a teammate who clones
> the repo gets `CLAUDE.md`/`AGENTS.md` but no skills until they run
> `npx joycraft@latest update --harnesses <selection>` to regenerate them locally. Joycraft adds a one-line
> reminder to your generated `CLAUDE.md` and `AGENTS.md` for exactly this reason.

## Re-running init on an existing project

`update` is the normal command for an existing project. It updates unmodified
Joycraft files and preserves customized files as reviewable conflicts. The
`init` alias is also safe on an existing project: it fills missing managed files
and uses the same preservation checks. `--force` is accepted only by the init
alias and is scoped to known setup inventory paths; use
`--replace-customized <paths...>` for an explicit reviewed replacement. This
makes `init` useful for a private-profile clone: a teammate gets the committed
`CLAUDE.md`/`AGENTS.md`/`docs/` and can regenerate the missing harness files
locally while the committed files remain protected.

## Reviewable PRs: workflow docs are collapsed

Joycraft's docs are two kinds of content. Durable knowledge — `CLAUDE.md`,
`AGENTS.md`, `docs/context/` — steers every future agent run and deserves review
eyes. Workflow exhaust — feature briefs and specs, discoveries, installed
templates — is historical by the time a PR is opened (the spec was reviewed in
conversation when it was written). To keep PRs reviewable, `init` and `update`
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
