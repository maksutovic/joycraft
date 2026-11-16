---
id: 7
status: done
---
# Outcome

Every gate message says what to do next, and the shipped text about the gate
is true. Brief: [gate-check](../brief.md#gate-check) and
[gate-hooks](../brief.md#gate-hooks). Spec 3's independent review found three
places where the text and the command disagree. This spec changes messages and
text only; what the gate accepts and refuses does not change.

## acceptance

- A drift message names its next step. Check: the `drift` fixture of spec 1;
  `gate.mjs check` exits 2 and the stderr line for the spec names
  `node .joycraft/runtime/status.mjs --fix` for an accepted spec whose
  frontmatter lags, and for any other drift says to set the spec frontmatter to
  the queue's status and to tell the user. A queue or spec that does not parse
  names the file and says to repair it and to tell the user
  (`tests/runtime/gate.test.mjs`, `[AC:gate-messages-name-step]`).
- An off message is true. Check: `hook --off` with no usable record, on a
  settings file where the user already had an empty `hooks.Stop` list; the
  message names each thing it removed and does not say that every other line is
  as it was. With a usable record the message and the bytes are as in spec 3
  (`tests/runtime/gate-hook.test.mjs`, `[AC:hook-off-message-true]`).
- A hook error names the hook. Check: `hook --on` on a settings file that is
  not valid JSON exits 1 and its stderr starts with a prefix that names the
  gate hook, not the gate check (`[AC:hook-error-prefix]`).
- The reference matches the command. Check: `.joycraft/references/gates.md`
  lists a spec file that does not parse among the problems, and says which
  message names which next step. It does not grow by more than three lines
  (`[AC:gates-doc-accurate]`).
- Session end reports what the gate names. Check: the status step of
  `joycraft-session-end/SKILL.md` tells the agent to do the step each gate
  message names and to report each message it could not clear to the user. The
  skill's word count does not grow (`[AC:session-end-reports-gate]`).

## Not covered

A check that an accepted report file exists and that its hash matches. The
exec form of the hook command. They are follow-ups for the owner.

## Implementation and verification scope

`.joycraft/runtime/gate.mjs` (message text and the `--off` message),
`.joycraft/references/gates.md`,
`.agents/skills/joycraft-session-end/SKILL.md`, `tests/runtime/gate.test.mjs`,
`tests/runtime/gate-hook.test.mjs`. The payload link test, the payload terms
test and the shipped word count (below 30,434 without `gates.md`) must still
pass. An unexpected error exits 1, not 2.
