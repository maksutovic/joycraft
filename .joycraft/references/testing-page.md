# Testing page template

Setup and the test review write the project's own testing page from this
template, at `<context>/test-practices.md` (`paths.context`, `docs/context/test-practices.md`
by default), with one map row: "A test run is slow or flaky". Write each
principle as the project's decision, in its own stack and its own tools: name
the real command, flag, folder or helper. Where the project has not decided
yet, write "not decided" and the question. Leave out a principle that cannot
apply, with one line why. Keep it short; it is read only through its map row.

## The page

```markdown
# Test practices

How this project keeps its tests fast and honest: fewer slow and flaky reruns,
so a queue spends its time on the work and not on waiting for the same tests
again. Read it when a test run is slow or flaky, or before you change the test
setup.

## Decisions

1. **Commands.** Focused: `<one file or one name>`, while working. Gate,
   once per spec: `<command>`. Full suite, only on the integrated revision or
   in CI, never while working a spec: `<command>`. They are also in
   `AGENTS.md`. Each spec names its own focused tests; it never names the gate
   as its check.
2. **Workers per run.** When agents share the machine, each run takes at most
   cores ÷ agents workers, set with the runner's own flag in `<config file>`.
   The cap keys on `JOYCRAFT_EVIDENCE`, never on `CI`, so CI keeps full width.
3. **No real time.** Tests use `<clock or virtual-time helper>` and wait for a
   signal, never a fixed delay.
4. **Each test owns its resources.** Its temporary folder: `<helper>`. Its
   port: `<port 0 or allocator>`. Its database: `<strategy>`.
5. **Time is reported, never a gate.** Slow tests show as a warning:
   `<report flag>`. No test fails for its duration.
6. **Assertions come from the spec.** Write the expected values from the
   spec, before reading the code under test.
7. **Extend before adding.** Add a case to the module's existing test file
   before creating a new file.
8. **Flaky means defective.** A test that passes and fails on the same code
   is a defect to fix; never retry a test into a pass. Run a new test file
   `<n>` times before it counts.
9. **Never special-case a test.** Never special-case a test's input in the
   code, and never edit the check that judges the change.

## When a run is slow or the machine is loaded

Run less first: the focused test, then the gate. Then cap workers per run
(decision 2). Only when both are not enough, `<the project's slot, or "none">`.
```

## Filling it in

- Take each command from the project's manifest or `AGENTS.md`, and run it
  once before writing it; a command that was not run stays `unrun`.
- For decision 2, offer the worker cap as a change to the runner config, keyed
  on `JOYCRAFT_EVIDENCE`. Write the formula, not this machine's number.
- For decision 4, name what the project already does. When it shares one
  folder, port or database between tests, write that as the finding and the
  question.
- The load order stays in this order: run less, cap workers, then a slot.
