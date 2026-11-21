# Model Profile: Claude Fable 5.1

> Model-specific steering for Claude Fable 5.1 — the tested prompt blocks from
> Anthropic's "Prompting Claude Fable 5.1" guide plus two operator rules, each
> under a stable heading that skills and the memory file cite by block name.

## Scope

This guidance is **model-specific, not universal**. It corrects behaviors that
Claude Fable 5.1 shows by default. A different model, or a later Fable release,
can need none of it or different fixes. When the active model changes, re-check
each block against observed behavior before you keep it.

This file is the single home for Fable 5.1 steering. Other files cite a block
as `docs/templates/reference/model-profile-claude-fable-5-1.md` plus the block
heading, for example "see *Finish the Whole Task* in the model profile". They
do not copy its prose. Block headings are stable: renaming one breaks every
citation.

Apply a block only when it fixes a problem you can observe. Delete a
behavioral instruction that no longer fixes anything, and add it back only when
the problem comes back.

## Finish the Whole Task

**Behavior:** In long autonomous runs the model stops short. It ends a turn by
describing the next step, offering a follow-up, or asking permission for work
that the request already covers.

**Fix — autonomous operation:** When the user is not watching, treat every
reversible action that follows from the request as approved. Stop only for a
destructive action or a real scope change the user must decide.

**Fix — delivering work:** Deliver the requested scope in full. If one part is
blocked, finish every other part and state what you left out and why. Before
you end a turn, read your last paragraph. If it is a plan, a list of next
steps, or a promise ("I will…"), do that work now.

```
You are operating autonomously. Do not end a turn by describing the next step;
do it. End your turn only when the task is complete or you are blocked on input
only the user can provide.
```

## Keep Changes and Tests to What the Task Asks

**Behavior:** On open-ended asks the model widens scope. It adds tests nobody
requested, refactors neighboring code, and "improves" files outside the task.

**Fix:** The requested scope is the deliverable. Write the tests the task or
spec names, not a larger suite. Leave unrelated code as it is, even when you
would write it differently. If you see a real problem outside the scope, note
it in one sentence in your final message instead of fixing it.

```
Keep changes and tests to what the task asks. No unrequested refactors, no
extra tests, no scope widening. Mention out-of-scope problems; do not fix them.
```

## Give User-Facing Progress Updates

**Behavior:** Through a long tool chain the model goes quiet. The user sees
nothing for minutes and cannot tell progress from a stall.

**Fix:** Before you start, say in one line what you are about to do. Between
major steps, give a one-line update the user can follow. Close with a short
recap that stands alone: what you found, what you did, what comes next.

```
Before you start, say in a line what you are about to do. Give brief updates
while you work. Close with a short recap that stands on its own.
```

## Mannered Prose

**Behavior:** Fable 5.1 prose runs dense. It packs clauses with semicolons,
dashes, and parentheticals, coins labels, and hedges. Two forms of the fix
exist. Pick one by how much room the surface has.

**Long form** — for final messages, summaries, and any human-facing output:

- Lead with the answer or outcome. Say first what could not be verified.
- One idea per sentence, about 20 words, with a verb.
- No em-dashes, no parentheticals, no arrows. Start a new sentence instead of
  joining clauses with a semicolon.
- Do not refer to anything by a name you made up during the session.
- Use a list for parallel items. Stop when the content stops.

**Short form** — for a tight instruction budget:

```
Write plainly: short sentences, one idea each, answer first, no invented labels.
```

## Compaction Retention

**Behavior:** When context is compacted, the summary drops the facts a
long task depends on, and the model re-derives or contradicts them.

**Fix:** When context is summarized, keep these items verbatim or near it:

- The user's original request and every explicit constraint or correction.
- Decisions already made, with the reason, so they are not re-opened.
- Files changed so far and the state of each (done, partial, untouched).
- Exact commands, error text, and test results that still matter.
- The remaining steps and the stop condition.

Do not re-derive a fact already established, and do not re-litigate a decision
the user already made.

## Targeted Edits Over Whole-File Rewrites

**Behavior:** The model rewrites a whole file to change a few lines. Rewrites
lose content, churn diffs, and overwrite concurrent edits.

**Fix:** Change only the lines the task needs, with an exact-match edit. Keep
surrounding formatting and comments. Rewrite a whole file only when you create
it, or when most of its content changes. Read a file before you edit it.

```
Prefer targeted edits over whole-file rewrites. Change only what the task needs.
```

## Batch Independent Tool Calls

**Behavior:** The model runs independent reads, searches, and commands one per
turn, which multiplies latency.

**Fix:** When several tool calls have no dependency on each other, issue them
together in one turn. Run a call on its own only when it needs an earlier
call's result.

```
If you intend to call multiple tools and there are no dependencies between the
calls, make all of the independent calls in the same turn.
```

## Formatting When Appropriate

**Behavior:** Blanket anti-formatting rules make the model cram tables, steps,
and comparisons into prose paragraphs that are hard to scan.

**Fix:** Use formatting when it is appropriate: when structure helps the
reader. Use a numbered list for steps, a bulleted list for parallel items, a
table for values compared across rows, and a fenced block for commands, code,
and error text. Use prose for a single point or a line of argument. Keep
headers out of short messages. When the user asks for no formatting, use none.

A blanket rule such as "never use markdown" is the anti-pattern this block
replaces. Remove it when you find it.

## End State of Every Prompt

**Behavior:** Without a stated finish line, the model picks one. It stops
early, or it keeps going past where the user wanted control back.

**Fix:** Every prompt names where the work stops. When a request gives no end
state, infer the most likely one from context and state it in your first line.

```
Babysit the CI run until it is green, then merge.
File the PR and tell me the link. Do not merge.
```

*Operator rule from Theo Browne.*

## Paths to Choose Between

**Behavior:** When a prompt dictates one approach, the model follows it even
where it is the wrong fit, and the user loses the model's judgment.

**Fix:** When more than one approach is viable, give the model the paths and
the criteria, and let it choose. When you are the model and you are given
paths, pick one, say which and why in one sentence, and proceed. Give a
recommendation, not a survey of every option.

```
Either patch the parser or add a pre-pass normalizer. Pick the one with the
smaller blast radius, tell me which, and build it.
```

*Operator rule from Theo Browne.*
