# Model question skip — two separate causes, not one

**Skill side (the reported bug):** tune's execution-profile offer bundled all four questions into one prose sentence, so the model/effort clauses were reformatted away at render time. Fixed by enumerating Q1–Q4 as separate question steps routed through the question directive.

**CLI side (found while writing the coverage test the spec asked for):** `ask()` in `src/execution-profile.ts` hung forever instead of degrading when stdin ended mid-interview — a spent stream emits no `close` on a *new* readline interface, so the `rl.once('close')` guard never fired. The spec expected init to be correct and test-only; it was not. Fixed by checking `readableEnded`/`destroyed` before opening the interface.
