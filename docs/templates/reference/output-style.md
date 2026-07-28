# Output Style

> How Joycraft writes the things a human actually reads — assessment reports, handoffs, design presentations, decomposition tables, dossiers.

## Scope

This contract governs **human-facing output moments**: anything a person reads in
the terminal or opens to make a decision. Reports, summaries, presentations,
questions posed to the user, handoff blocks, and display-only artifacts like a
decision dossier all count.

**Agent-facing artifacts are exempt and stay dense.** Atomic specs, the spec
queue JSON, YAML frontmatter, knowledge-layer rows (decision log, shipped
ledger, anchors), discovery stubs, and deny patterns are execution contracts
read by machines. They are optimized for completeness and machine parsing, not
for reading comfort. Applying these rules to them would strip information a
later agent needs.

The scarce resource is the human channel. It should carry decisions, not
acknowledgments.

## The Rules

### 1. Open with the outcome or the decision you need

The first line says what changed, what the reader must choose, or what broke.
Context, methodology, and restatements of the request come after — or not at
all.

*Why:* Readers skim the first line to decide whether to read the rest. A line
spent restating the request is a line spent proving nothing happened yet.

### 2. End when the answer is done

The last line is the last piece of information. No recap of what was just said,
no offer of further assistance, no summary of the summary.

*Why:* A closing paragraph teaches the reader that the end of your output is
skippable, which trains them to skip the end of every output — including the
ones that end with something important.

### 3. Give the reader exactly one next action

When output should lead somewhere, name a single concrete thing to do — a
command, a path, a decision to make. If several things could come next, rank
them and lead with the recommendation.

*Why:* Knowing the answer is not doing the answer. An unranked menu moves the
decision back onto the reader, which is the work you were supposed to do.

### 4. Make every claim carry a specific fact

Attach the number, path, name, or error string that makes a claim checkable.
"Tests pass" becomes "1409 tests pass"; "several skills changed" becomes the
list.

*Why:* A sentence asserting importance without a detail says nothing, and the
reader cannot tell a verified claim from a guess. Specifics are how they audit
you cheaply.

### 5. Report failure and uncertainty in the same plain register as success

State what failed, the likely cause, and what you would do next, using the same
tone you use when things work. Keep a hedge when the uncertainty is real; drop
it when it is decoration.

*Why:* Dramatizing failure costs the reader attention they need for the fix, and
manufactured confidence costs them the ability to trust your unqualified
statements later.

### 6. Show state as structure, not as prose

Multi-step work, per-item status, and comparisons belong in a numbered list or a
table. Keep any single list to about five items; if it runs longer, split it
into what matters now and what can wait.

*Why:* Structure lets a reader find their item without parsing every sentence,
and a five-item ceiling forces the ranking that a twenty-item list avoids.

### 7. Match the output's length to the decision it supports

A status line is one line. A design artifact a human must approve earns its
pages. Length follows from what the reader has to decide, never from how much
work went in.

*Why:* Output length is routinely used to signal effort. It signals effort to
nobody and costs everybody reading time; the work is visible in the diff.

### 8. Write plainly, in your own words

Prefer the concrete verb, the active sentence, the ordinary word. Quote error
text and command output exactly, and never soften a technical term into a vaguer
one for the sake of flow.

*Why:* Plain sentences are faster to read and much harder to write vaguely — the
vagueness has nowhere to hide. Exact quoting is what makes output greppable.

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

> 6 specs written to `docs/features/<slug>/specs/`. Wave 2 (specs 2, 3, 5) is
> parallel-safe — disjoint affected files; everything else is sequential.
>
> Spec 3 edits eleven skill bodies near the 1500-char windows that
> `tests/retrieval-pass-skill.test.ts` slices. A placement mistake there stays
> invisible until spec 6 regenerates the bundles.
>
> Next:
> ```bash
> /joycraft-implement-feature docs/features/<slug>/
> ```

The rewrite drops the preamble, the effort narrative, and the closing offer. It
keeps the one thing the reader could not have known — the hazard in spec 3 — and
ends on the command they run next.
