# Migrating from Joycraft 0.7

Joycraft 1.0 replaces the 0.7 skill set with one entry skill, a spec queue with
independent review, and a small runtime in `.joycraft/`. Nothing in a 0.7 project
changes until you run the migration, and you can undo it.

## The easy way: paste this into your coding agent

Open your coding agent in your project and paste this prompt. The agent shows you the
plan first and changes nothing until you say go. The steps below explain what it does.

```text
Upgrade this project from Joycraft 0.7 to 1.0. Go one step at a time.
1. Run `git status`. If there are uncommitted changes, tell me and stop, so I can
   commit them first.
2. Run `npx joycraft@latest update .`. On a 0.7 project this changes nothing. It shows
   the migration plan. Show me the plan in short lists: what it will archive, which
   Joycraft files I changed, and what stays.
3. If I changed any Joycraft files, ask me one question: keep them in place, or
   archive them? Archived files are moved to a backup folder, not deleted.
4. Wait until I say go. Then run
   `npx joycraft@latest update . --migrate --keep-custom --yes` if I chose keep, or
   `npx joycraft@latest update . --migrate --archive-custom --yes` if I chose archive
   or changed no files.
5. Run `npx joycraft@latest doctor .` and tell me the result.
6. Run `node .joycraft/runtime/review-tools.mjs plan --root .`. Tell me which tools
   you need to check your own work, which ones I have, and which ones are missing.
   Ask me before you install anything.
7. Tell me that `npx joycraft@latest rollback --yes` undoes the upgrade.
Do not commit, publish, or ask me for API keys.
```

## 1. See the plan (changes nothing)

```bash
npx joycraft@latest update .
```

On a 0.7 project this prints the plan and exits 1:

- **Archive**: the 0.7 files Joycraft wrote and you did not change: the 0.7 skills in
  `.claude/skills/`, `.agents/skills/`, `.pi/skills/`, `.github/skills/` and
  `.omp/skills/`, the Pi and Oh My Pi extensions and scripts, `docs/templates/`, the
  version-check hook and the 0.7 bookkeeping in `docs/.joycraft/`.
- **Customized**: 0.7 files you changed, listed by path. You choose for each one.
- **Kept**: your project knowledge and settings (the list below).
- **Install**: the 1.0 files.

## 2. Migrate

```bash
npx joycraft@latest update . --migrate --archive-custom --yes
```

or keep your customized files in place:

```bash
npx joycraft@latest update . --migrate --keep-custom --yes
```

Without `--keep-custom` or `--archive-custom`, a terminal asks about each customized
file; anything else gets the plan and exit 1. A customized file at a path where 1.0
installs a skill of the same name (for example `joycraft-implement`) is always archived,
so the 1.0 skill can be installed. Nothing is lost.

The migration is one recoverable step:

- 0.7 files are **moved** to `.joycraft-backups/migrate-<time>/archive/`, never deleted.
- `.claude/settings.json`: the 0.7 version-check hook is removed, and your safeguard
  hook (`.claude/hooks/joycraft/block-dangerous.sh`) runs from the project root, so
  it also works in subfolders and worktrees. The old file is backed up first.
- `.joycraft-backups/` is added to `.gitignore`.
- The 1.0 manifest is written last. If the migration is interrupted, run
  `npx joycraft@latest update . --recover` to put the project back as it was.

## What stays

These stay exactly as they are:

- `AGENTS.md` and `CLAUDE.md` (all your content)
- `docs/context/` (your project knowledge and decision log)
- `docs/features/` (briefs, specs and queues)
- `docs/.joycraft/local/` (including `replaced/`, the copies of files 0.7 replaced)
- `.claude/hooks/joycraft/block-dangerous.sh` and `.claude/hooks/joycraft/deny-patterns.txt` (your safeguard)
- `.claude/settings.json` (only the two hook changes above)

**0.7 spec queues are read-only history.** 1.0 does not convert them. Finish or close
0.7 work on 0.7, or start the next piece of work as a new 1.0 brief.

After migrating, your `AGENTS.md` may still mention 0.7 skills (for example
`joycraft-tune`). Ask your agent to update it; the 1.0 entry skill keeps existing
guidance and adds only what is missing.

## 3. Roll back

```bash
npx joycraft@latest rollback
```

shows what it would do. To apply it:

```bash
npx joycraft@latest rollback --yes
```

It restores the 0.7 files and your settings byte for byte and removes the 1.0 files.
The backup stays in `.joycraft-backups/`. A 1.0 file you edited after the migration is
kept and reported; add `--force` to remove it too.

## Stay on 0.7

```bash
npx joycraft@0.7.17 update
```
