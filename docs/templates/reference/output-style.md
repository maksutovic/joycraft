# Output Style

> How Joycraft writes the things a human reads — gate artifacts, PR bodies,
> session-end summaries, interview playback, and the dialogue at every gate.

This contract is Simplified Technical English (ASD-STE100) in pragmatic mode.
STE is a controlled language built so that a tired reader cannot misread an
instruction. Pragmatic mode keeps your domain words legal: write `mutex`,
`webhook`, and `idempotent` when those are the correct words. STE governs the
sentences around them.

## Scope

This contract governs **all human-facing output**: anything a person reads in
the terminal or opens to make a decision. The governed surfaces are:

| Surface | Examples |
|---------|----------|
| Gate artifacts | Design presentations, decision dossiers, decomposition tables, assessment reports, HTML review artifacts |
| Gate chat and dialogue | The questions you ask at a gate, the answers you give, every turn of the conversation |
| Interview playback | The structured summary you read back to the human |
| PR bodies | Titles, descriptions, and review notes |
| Session-end summaries | Handoff blocks and status reports |

**Agent-facing artifacts are exempt and stay dense.** Atomic specs, the spec
queue JSON, YAML frontmatter, knowledge-layer rows such as the decision log and
the shipped ledger and the anchors file, discovery stubs, and deny patterns are
execution contracts that machines read. They are optimized for completeness and
machine parsing, not for reading comfort. These rules would strip information
that a later agent needs.

The scarce resource is the human channel. It carries decisions, not
acknowledgments.

## The Rules

### 1. Open with the outcome or the decision you need

The first line says what changed, what the reader must choose, or what broke.
Context, methodology, and restatements of the request come after, or not at all.

*Why:* Readers skim the first line to decide whether to read the rest. A line
that restates the request is a line that proves nothing happened yet.

### 2. End when the answer is done

The last line is the last piece of information. Write no recap of what you just
said, no offer of further assistance, and no summary of the summary.

*Why:* A closing paragraph teaches the reader that the end of your output is
skippable. That trains the reader to skip the end of every output, including
the outputs that end with something important.

### 3. Give the reader exactly one next action

When output must lead somewhere, name one concrete thing to do: a command, a
path, or a decision to make. When several things can come next, rank them and
lead with your recommendation.

*Why:* To know the answer is not to do the answer. An unranked menu moves the
decision back onto the reader, and that decision was your work.

### 4. Make every claim carry a specific fact

Attach the number, path, name, or error string that makes a claim checkable.
Write "1409 tests pass" instead of "tests pass". Write the list instead of
"several skills changed".

*Why:* A sentence that asserts importance without a detail says nothing, and
the reader cannot tell a verified claim from a guess. Specifics are how the
reader audits you cheaply.

### 5. Report failure and uncertainty in the same plain register as success

State what failed, the probable cause, and what you plan to do next. Use the
tone you use when things work. Keep a hedge when the uncertainty is real. Drop
the hedge when it is decoration.

*Why:* Drama about a failure costs the reader attention that the fix needs, and
manufactured confidence costs the reader the ability to trust your unqualified
statements later.

### 6. Show state as structure, not as prose

Put multi-step work, per-item status, and comparisons in a numbered list or a
table. Keep one list to five items or fewer. When a list runs longer, split it
into what matters now and what can wait.

*Why:* Structure lets a reader find one item without parsing every sentence,
and a five-item ceiling forces the ranking that a twenty-item list avoids.

### 7. Match the length of the output to the decision it supports

A status line is one line. A design artifact that a human must approve earns
its pages. Length follows from what the reader must decide, never from how much
work went in.

*Why:* Writers use length to signal effort. It signals effort to nobody, it
costs everybody reading time, and the diff already shows the work.

### 8. Keep sentences short: 20 words for instructions, 25 for descriptions

An instruction tells the reader to do something. Keep it to 20 words. A
description explains a state, a cause, or a result. Keep it to 25 words. When a
sentence goes over the limit, split it at the conjunction. Keep one idea in one
sentence, and keep paragraphs to six sentences or fewer.

*Why:* A reader holds a short sentence in one pass. A 40-word sentence with
three clauses forces a second read, and the second read is where the reader
loses the thread.

### 9. Use approved modals only: `must`, `can`, `will`

Write `must` for an obligation. Write `can` for a capability or a permission.
Write `will` for a future fact. Replace `should` with `must` when you mean an
obligation, or delete the modal when you mean a recommendation and then rank
your recommendation. Replace `may`, `might`, and `could` with `can`, or state
the real condition: write "the build fails when Node is below 20" instead of
"the build might fail".

*Why:* `should` and `might` let the writer avoid a commitment the reader needs.
The reader cannot act on a hedge, so the reader asks you again.

### 10. Use one word for one concept, and put the condition before the command

Pick one term per concept and repeat it. Write `config` in every sentence, or
write `settings` in every sentence, but never rotate between `config`,
`settings`, and `configuration` in one document. Put the condition first:
write "when the tests fail, revert the commit" instead of "revert the commit if
the tests fail". Chain three nouns at most: write "the timeout of the retry
queue" instead of "retry queue timeout configuration value".

*Why:* A rotated synonym reads as a second thing, so the reader stops to ask
whether it is one. A trailing condition makes the reader read the sentence
twice: once to learn the action, once to learn when the action applies.

### 11. Delete slop, contractions, semicolons, and Latin abbreviations

Write `do not` instead of `don't`, and `it is` instead of `it's`. Split a
semicolon into two sentences. Write `for example` instead of the Latin
abbreviation, `that is` for the other one, and `and so on` for the third one.
Replace the padding words in this table:

| Slop | Simple |
|------|--------|
| in order to | to |
| utilize, leverage | use |
| facilitate, enable | let, help |
| prior to | before |
| subsequent to | after |
| in the event that | when |
| a number of | some, or the count |
| it is important to note that | (delete) |
| basically, essentially, actually | (delete) |
| very, quite, fairly, somewhat | (delete) |
| robust, seamless, powerful | (delete, or state the measurement) |
| delve into, dive deep | examine |
| at this point in time | now |

*Why:* Every word in that table costs the reader time and returns no
information. A contraction and a semicolon each cost a non-native reader one
extra parse, and the Latin abbreviations are guessed as often as they are read.

## Self-Check

Read your draft once before you present it. The check has two tiers.

**Tier 1 — fix to zero.** These classes are mechanical. Find them by eye and
remove every one:

1. Contractions
2. Semicolons
3. Banned modals: `should`, `may`, `might`, `could`
4. Latin abbreviations
5. Slop words from the table in rule 11

**Tier 2 — advisory.** These classes need judgment, so a count of them is a
signal and not a verdict:

1. Sentence length over the 20-word and 25-word limits
2. Synonym rotation across the document

Fix a tier-2 hit when the fix keeps the meaning. Keep the long sentence when a
split would break a technical statement.

The example below carves itself out of tier 1 on purpose. A "before" sample
must show the failure.

## Worked Example

A decomposition hand-off, before:

> I've now completed a thorough analysis of the feature brief and carefully
> broken it down into a set of atomic specifications. This was a fairly complex
> feature with a number of interdependencies, so I took care to ensure that the
> ordering respects the dependency graph. In total, I created 6 specs. Some of
> them can be run in parallel, while others need to run sequentially. I've also
> written a README that captures the wave plan. Let me know if you'd like me to
> adjust anything about the decomposition, or if you'd like me to proceed with
> implementation!

After:

> 6 specs written to `docs/features/<slug>/specs/`. Wave 2 holds specs 2, 3,
> and 5. Wave 2 is parallel-safe because those specs touch disjoint files.
> Every other wave runs in order.
>
> Spec 3 edits eleven skill bodies near the 1500-character windows that
> `tests/retrieval-pass-skill.test.ts` slices. When a placement there is wrong,
> the error stays invisible until spec 6 regenerates the bundles.
>
> Next:
> ```bash
> /joycraft-implement-feature docs/features/<slug>/
> ```

The rewrite drops the preamble, the effort narrative, and the closing offer. It
keeps the one thing the reader could not have known, which is the hazard in
spec 3, and it ends on the command the reader runs next.
