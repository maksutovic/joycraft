---
id: 9
status: done
---
# A changed brief never silently disables the page

Goal: [artifact-conflict](../brief.md#artifact-conflict). Built in joycraft-prototype, branch `field/1.1.2` (from `field/1.2-custom-answer`).

## acceptance

- After a source change, the page names the questions whose text or options
  changed and keeps that message until handled; choosing an option does not
  replace it. Check: browser run: load page, edit one question in the brief,
  save another; the message names the edited question and survives a click.
- Answers to unchanged questions keep their selection and save without "I
  reviewed the updated source". Check: same run; the unchanged answer reaches the
  brief.
- A disabled save button carries the reason as its accessible description.
  Check: `read_page` shows the reason on the button.
- A 409 shows as an error, not "Unsaved changes.". Check:
  `tests/artifacts/transports.test.mjs` new case plus the browser run.

## Implementation and verification scope

`.joycraft/assets/artifacts/kit.js`, `.joycraft/runtime/artifacts/server.mjs`
(changed-question list in the conflict response), tests. Depends on 08 (same
files).
