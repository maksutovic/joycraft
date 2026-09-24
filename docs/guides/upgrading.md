# Installing and updating Joycraft

> [Back to README](../../README.md)

Joycraft has one planning and application engine. Use the public command from
the project root for both a new project and an existing installation:

```bash
npx joycraft@latest update
```

For a fresh interactive install, the command asks which harnesses to install
and which gitignore profile to use. A fresh unattended run must name its
harnesses explicitly:

```bash
npx joycraft@latest update --harnesses codex --non-interactive
```

For an existing project, the shared installation manifest is at
`docs/.joycraft/manifest.json`. A private installation uses
`docs/.joycraft/local/manifest.json`. The manifest records the selected
harnesses, release, and vendor baselines; local settings and check caches stay
under `docs/.joycraft/local/`. Shared and private paths are project-relative
so a shared checkout can retain installation identity without sharing a
developer's notification preferences.

`init` remains the friendly fresh-install alias and `upgrade` remains the
legacy alias. Both enter the same planner and transaction as `update`.

## Recovery from an npm metadata failure

If npm reports `ETARGET` before Joycraft starts, the failure occurred in npm's
metadata lookup. Retry with an online metadata refresh and the same unified
command:

```bash
npm --prefer-online exec --yes -- joycraft@latest update
```

The launcher selects one exact release. The executing bundle applies that
release without a hidden second `latest` lookup or a recursive re-exec. If
the update completes, reinvoke the active skill or restart the agent session
so it loads the new instructions.

An installation from before the bridge update cannot discover this mechanism
through its old skills. Run the bridge update manually first; do not promise
that an old installation can discover a release before that step. Manual
documentation migrations, such as flat docs to per-feature folders, remain a
separate command and review:

```bash
npx joycraft@latest migrate --help
```

## Your files and Joycraft's files

The updater compares the vendor baseline, the bytes on disk, and the target
bundle before it writes. It treats two kinds of file differently.

**Your files are never changed.** Joycraft creates `CLAUDE.md`, `AGENTS.md`,
`.claude/hooks/joycraft/deny-patterns.txt`, and
`docs/templates/evals/example-task.json` once, then leaves them to you. It adds
only its own entries to `.claude/settings.json` and never replaces your
settings. The update lists these files under "Kept your versions".

**Joycraft's files get the latest version.** Skills, templates, hooks, and
scripts are Joycraft's. An unmodified copy updates silently. If you edited one
and the new release changes it, the update installs the new version and saves
your edited copy first, under `docs/.joycraft/local/replaced/<timestamp>/`
with a `.bak` suffix. That folder is gitignored. The update lists these files
under "Replaced your edited copies". If you edited a file and the new release
does not change it, your edit stays.

`--yes` and `--non-interactive` follow the same rules: they never replace your
files, and an edited Joycraft file is always saved before it is replaced.
Automatic (`auto-safe`) updates never replace an edited file; they stop and
leave that to an explicit `update`.

To get an edited copy back, copy the `.bak` file over the installed one, or
undo the whole update with `--rollback`. Preview the real plan without
changing files:

```bash
npx joycraft@latest update --preview
```

To replace one of your own files with Joycraft's default, name it explicitly:

```bash
npx joycraft@latest update --replace-customized .claude/hooks/joycraft/deny-patterns.txt
```

Restore explicitly named missing managed files with `--repair`. Recovery of an
interrupted transaction and rollback of the last successful transaction are
separate explicit public operations:

```bash
npx joycraft@latest update --repair .agents/skills/joycraft-tune/SKILL.md
npx joycraft@latest update --recover
npx joycraft@latest update --rollback
```

The updater writes a recovery journal and keeps the manifest publication last.
If a process stops during a write, run `--recover`, inspect its result, then
rerun the reviewed update. Unknown files, unknown manifest fields, selected
harnesses, and user documents remain protected.

Exit codes are stable for scripts and agents:

| Code | Meaning |
|---:|---|
| `0` | Applied (including edited files replaced after a backup), no-op, or kept safely |
| `1` | Invalid request or failed update |
| `2` | Something needs your review, such as a settings entry Joycraft cannot merge |
| `3` | Attention is required, such as incomplete recovery |

Use `--json` when a caller needs `status`, `targetVersion`, `installedVersion`,
`applied`, `preserved`, `conflicts`, `replaced` (each replaced path with its
backup), `diagnostics`, and `exitCode` as result fields.

## Update checks and policies

The installed checker is `docs/.joycraft/check.mjs`. It keeps registry metadata
in a local cache with a 24-hour freshness window, a short bounded request, and
bounded retry backoff. A current, postponed, offline, or unavailable result
stays quiet and never blocks the requested work. An offline check is
`unknown`, not proof that the project is current.

The default policy is `notify`. The checker can be configured per project;
these commands write only local settings:

```bash
node docs/.joycraft/check.mjs policy notify
node docs/.joycraft/check.mjs policy auto-safe
node docs/.joycraft/check.mjs policy off
```

Read the current policy with `node docs/.joycraft/check.mjs check --json`.

`notify` offers an available release once per conversation identity. An
acknowledgement records that this conversation saw the release; postponement
records a release-wide choice. They are separate actions:

```bash
node docs/.joycraft/check.mjs acknowledge 1.2.3 --session <session-id>
node docs/.joycraft/check.mjs postpone 1.2.3
```

`auto-safe` is a local opt-in. It runs only for one valid installation
manifest, an exact reviewed release descriptor, a conflict-free compatible
plan, and every automatic safety gate. The command still verifies the exact
candidate artifact before applying it. The checker never installs npm merely
to look for a version.

After an offer or automatic attempt, the active workflow records the result at
its boundary. A skill must finish before its instructions are replaced; then
reinvoke it or restart the session. A missing checker or a quiet offline
failure does not stop the skill that the user requested.

## Supported options

Run the production CLI help to check the installed version's exact options:

```bash
npx joycraft@latest update --help
npx joycraft@latest init --help
npx joycraft@latest upgrade --help
```

The documented update options include `--harnesses`, `--yes`,
`--non-interactive`, `--replace-customized`, `--repair`, `--gitignore`, `--json`,
`--recover`, `--rollback`, `--preview`, and `--auto-safe`. Keep explicit
replacement and repair decisions separate from routine refreshes.
