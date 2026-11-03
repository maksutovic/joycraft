---
id: 8
status: done
---
# The decision page always offers "Something else" and keeps notes editable

Goals: [custom-answer](../brief.md#custom-answer),
[artifact-note-edit](../brief.md#artifact-note-edit). Already built on
joycraft-prototype `field/1.2-custom-answer` (39e5bcd, 2297b75); needs
independent review.

## acceptance

- A two-option decision shows three choices; the third is "Something else"
  (`custom`, note required); a declared `custom` keeps its label. Check:
  `tests/artifacts/decisions.test.mjs` "offers a custom answer on every question".
- "Something else" without a note is refused; with a note the brief records
  `answer: "custom"` and the note. Check: same test.
- A clarified decision keeps an enabled note box and a "Save note" button; a
  changed note saves without a reopen; a changed answer still needs a reopen.
  Check: `decisions.test.mjs` "a saved answer keeps taking note changes",
  `transports.test.mjs` "keeps a clarified answer while its note changes", and a
  browser run on a scratch brief (save answer, edit note, save; brief holds the
  note).

## Implementation and verification scope

`.joycraft/runtime/artifacts/decisions.mjs`, `.joycraft/assets/artifacts/kit.js`,
`.joycraft/assets/artifacts/transports.js`, `.joycraft/references/artifacts.md`,
the two test files.
