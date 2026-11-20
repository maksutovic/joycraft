---
id: 1
status: todo
---
# Outcome

`init --migrate` and `update` find the 0.7 shell guard and ask the person to
remove it or keep it. Remove backs it up and takes it out; keep changes
nothing and does not ask again. Ships as 1.6.1. Brief:
[legacy-guard-retire](../brief.md).

## acceptance

- The guard is found. Check: a project has the old guard when it has
  `.claude/hooks/joycraft/block-dangerous.sh`, or a `.claude/settings.json`
  hook command that names `.claude/hooks/joycraft/block-dangerous.sh`
  (relative or under `$CLAUDE_PROJECT_DIR`). A project with neither gets no
  question (`[AC:detect]`).
- The person is asked once. Check: in a terminal, `update` on a project with
  the guard asks one remove-or-keep question that names the guard, says 1.x
  does not maintain it, and says it blocks `curl | sh` installers. A changed
  script or a list with extra lines adds "it has your changes; the backup
  keeps them" (`[AC:ask-once]`).
- Remove is complete and recoverable. Check: after "remove", the script,
  the list and the settings entry are gone; an emptied
  `.claude/hooks/joycraft/` folder is gone; other hooks and settings keys are
  byte-identical in meaning; the three originals are in the update backup;
  `rollback` (migrate) and `update --recover` (interrupted update) restore
  them byte for byte (`[AC:remove]`).
- Keep is silent after. Check: after "keep", no file changes, and the next
  `update` does not ask again. The answer is recorded in
  `.joycraft/installation.json` (`[AC:keep]`).
- No answer without a person. Check: with no terminal and no flag, `update`
  prints the question and `--legacy-guard remove|keep` and changes nothing.
  `--yes` alone keeps the guard and prints one line naming the flag.
  `--legacy-guard remove --yes` removes it (`[AC:no-guess]`).
- Migration asks the same question. Check: `init --migrate` on a 0.7
  project with the guard asks it; the guard is no longer always in `KEPT`
  (`[AC:migrate]`).
- CHANGELOG has a 1.6.1 entry that says how to remove the guard
  (`[AC:changelog]`).

## Not covered

A 1.x shell guard. Guards on other hosts. The field project's local allow
list.

## Implementation and verification scope

This repo: `src/cli.ts` (question, flag), `src/install-v1.ts` (plan, apply,
manifest record), `src/legacy-07.ts` (`KEPT`, settings change), tests under
`tests/`, `CHANGELOG.md`, version 1.6.1. No payload change, so no re-vendor.
