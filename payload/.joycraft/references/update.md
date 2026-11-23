# Updates

`node .joycraft/runtime/update-check.mjs check` tells you if a newer Joycraft
exists. It reads npm once a day at most, sends no project data, and stops after
two seconds. If it prints nothing, say nothing and continue.

If it prints one line, end your next reply with that line, however short or
off-topic. Do not ask anything. It stays quiet about that version for seven days.
When the user answers the line, read "Other answers" below.

If it prints JSON, read `action`:

- `apply`: the user chose automatic updates. Follow "Update" below without asking.
  If the plan would back up an edited file, stop and ask instead.
- `ask` or `note` with `kind: migration` (a newer major): put `message` in your next
  reply. With `ask`, ask once: update now, not now, or turn off. `message` names each
  release since the installed one (newest five, then how many more) and ends with
  the changelog link.

Update only between specs, while no implementer or reviewer runs; finish or park
the work in progress first.

## Other answers

- Update Joycraft: follow "Update" below.
- Not now: `node .joycraft/runtime/update-check.mjs snooze <latest>` stays quiet about
  that version for seven days.
- No Joycraft updates, or turn off: `node .joycraft/runtime/update-check.mjs policy off`.
- Automatic updates: `node .joycraft/runtime/update-check.mjs policy auto-safe`. Only
  a `patch` release marked safe applies by itself. A `minor` or `migration` never does.
- Stay on this version: `node .joycraft/runtime/update-check.mjs pin`, and `unpin` to
  undo it.

These choices stay in `.joycraft/local/preferences.json`, on this machine.

## Update

Use the version that the line or `latest` names:

1. Run `npx joycraft@<latest> update . --plan --json`. Show the user the plan in
   short lists: files changed and files backed up. With `apply`, skip this display.
2. Run `npx joycraft@<latest> update . --yes`. If `kind` is `migration`, this prints a
   migration plan and stops: show the plan and follow its steps with the user. Never
   apply a migration without the user's yes.
3. Run `npx joycraft@<latest> doctor .`, then `node .joycraft/runtime/entry-check.mjs`.
   The update rewrote the text between Joycraft's markers in `AGENTS.md` and
   printed its backup. When `entry-check.mjs` still reports `managed-block`, the
   lines are loose: replace them with the output of `entry-check.mjs block`. This is the one entry-file edit that an unattended run
   makes, besides a path with one unique Git rename.
   When `node .joycraft/runtime/archive.mjs ignore --check` prints `missing`,
   ask once whether search should skip the archive; rerun it with `--apply` on
   a yes, `--decline` on a no.
   When `entry-check.mjs` reports `gate-rule` and
   `cleanup.mjs gate-rule --check` prints `unset`, show the findings once with
   the before-and-after rewrite ([cleanup](cleanup.md)) as one question.
   Rewrite on a yes. Record the answer with
   `node .joycraft/runtime/cleanup.mjs gate-rule --record rewritten` or
   `--record kept`, so no later update asks again.
4. Tell the user in plain words what is different now. For a `minor` or
   `migration`, name what the user can now do or say, one line per release since
   the old version, from the listed release summaries and the changelog when you can read it. When
   `node .joycraft/runtime/artifacts/cli.mjs questions` prints `unset: true`,
   ask for the question style now, as [setup](setup.md) step 2 says.
5. Run the review-loop plan
   ([review loop tools](setup.md#review-loop-tools)). When it prints
   `Review loop unchanged.`, say nothing about it. When it reports a newly
   detected tool, offer to switch that package to it and re-record only that
   package with `--choose`.
   When it reports `recorded with v1; re-record to keep it`, confirm the table with the
   user and run record again, repeating any `--choose` or `--skip` the table shows.

If the update fails, run `npx joycraft@<latest> update . --recover`, tell the user
that the files are back as they were, and continue your work.
