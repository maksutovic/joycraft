---
id: 5
status: done
---
# Outcome

The shipped text gets shorter with this feature, and a test keeps it from
growing without a reason. Brief: [prose-removed goal](../brief.md#goals).

## acceptance

- The payload text is shorter than 1.4.0. Check: the word count of the shipped
  skills, agent files and references after specs 1 to 4 is below the count of
  the `field-20` bundle, 30,033 words (`tests/payload-budget.test.mjs`,
  `[AC:budget-below-field-20]`).
- Growth needs a recorded reason. Check: the test reads a small budget file
  with one word count per shipped skill, agent file and reference. A file over
  its number fails the test and the message names the file, the two counts and
  the way to pass: cut text, or raise the number in the budget file with a
  one-line reason. A raised number with no reason fails
  (`[AC:budget-growth-needs-reason]`).
- The host tool timeout is stated again. Check: the "Running tests" section of
  `.joycraft/references/testing.md` says to give the command a host tool
  timeout at least as long as the run limit, because a host's default can be
  shorter and would end the wrapper before the child. Spec 3 removed that
  guidance. The budget file records the growth of that file with this reason,
  and the shipped total stays below the `field-20` count
  (`[AC:tool-timeout-restored]`).
- The budget file is not shipped. Check: it is absent from the exported bundle
  and from `payload/PIN` (`[AC:budget-not-shipped]`).

## Not covered

The exit code of `evidence.mjs run` when the child fails (the owner decides).
A budget for runtime code. A limit on the user's own files: `cleanup.mjs`
already checks the user's entry files. Rewriting text that specs 1 to 4 do not
touch.

## Implementation and verification scope

Implemented in joycraft-prototype, after specs 1 to 4:
`tests/payload-budget.test.mjs`, the budget file beside it. Depends on specs
1, 2, 3 and 4, because their text removals set the numbers. Source: Lauren
Tan, "All Code Is Slop (Except Mine)" (8:20, comment count from 65,824 to
1,227); Joycraft's reading-fatigue verdict (delete, tier, verify).
