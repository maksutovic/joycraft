---
feature: canonical-entry-file
status: draft
decisions: [
  {
  "id": "tidy-consent",
  "status": "clarified",
  "question": "May Joycraft tidy AGENTS.md on its own?",
  "answer": "custom",
  "context": "Today the cleanup skill changes nothing before a yes. So each finding becomes a question: 9 on the field project. In the new design Joycraft fixes everything that is not a rule, does not touch a rule, and tells you in one line. Joycraft's own boundary says it does not change a user file without explicit confirmation. One recorded answer for each project is that confirmation.",
  "why": "Eight of the nine questions had one correct answer, which the knowledge rules or the vendor guidance already give.",
  "options": [
    {
      "value": "ask-once",
      "label": "Yes. Ask one time, then tell me after",
      "recommended": true,
      "description": "Setup or update asks one question. The answer is saved as `entry.tidy: auto` in `joycraft.yaml`. After that, Joycraft tidies in a session where a person is present, makes one local commit, and adds one line to the session-end report.",
      "example": "AGENTS.md tidied. Commit abc1234. No rule changed. 9 pages now have map rows. 2 questions, neither stops work.",
      "tradeoff": "You see the change after it is made. `git revert` is the undo."
    },
    {
      "value": "default-on",
      "label": "Yes, and do not ask at all",
      "description": "Tidy is on for every project from the first install. No setup question.",
      "example": "A new user installs Joycraft. The next session end tidies AGENTS.md.",
      "tradeoff": "This needs a change to Joycraft's never-overwrite boundary. A new user gets a changed AGENTS.md that they did not agree to."
    },
    {
      "value": "batch",
      "label": "One yes for each tidy",
      "description": "Each tidy shows one diff page. One yes applies all of it.",
      "example": "One stop at session end, with the diff.",
      "tradeoff": "One stop for each tidy. An unattended queue cannot tidy."
    }
  ],
  "recommendation": "One question, one time, is the smallest form of the explicit confirmation. It also lets a user-level default answer it for your other projects.",
  "affected": [
    "tidy"
  ],
  "note": "could we have this user tunable? So like for me i want do not ask at all, just make me the best AGENTS.md with the current research -- others could be asked if they have specific things they tune themselves, does that make sense?"
},
  {
  "id": "long-rules",
  "status": "clarified",
  "question": "What does Joycraft do with a long rule?",
  "answer": "custom",
  "context": "The field AGENTS.md has 1,514 words. About 900 are rule text, and 7 of its 12 rule bullets are longer than 40 words. Anthropic and OpenAI say to move a multi-step procedure out of the entry file. All five panel seats found the same risk on your file: in a long permission rule, the short sentence gives the permission and the rest of the rule limits it. A linked page is not loaded again after a compaction, and some subagents do not get it.",
  "why": "This answer sets the size of a rule-heavy file. With rules pinned, the field file becomes about 1,390 words, not 1,000.",
  "options": [
    {
      "value": "pin",
      "label": "Never change a rule, and do not report its length",
      "recommended": true,
      "description": "A block that gives or denies permission stays byte for byte. A script lists these blocks before the tidy and checks them after. The size budget counts only text that is not a rule.",
      "example": "Field file: 1,514 to about 1,390 words. Every rule is word for word. Only the owner changes a rule.",
      "tradeoff": "A file with many rules stays long. That costs tokens. On 2026 models it does not reduce adherence."
    },
    {
      "value": "propose",
      "label": "Pin, and propose a shorter form one time",
      "description": "As above. Also, one time for each long rule, Joycraft writes a proposal to the backlog: the sentences that stay and the page that gets the rest. You approve each one. Nothing stops work.",
      "example": "Field file: up to 7 proposals in `docs/backlog/`.",
      "tradeoff": "You must read each proposal. Each one is a decision about your permissions."
    },
    {
      "value": "split",
      "label": "Joycraft shortens rules on its own",
      "description": "The imperative sentence stays. Joycraft moves the procedure to a linked page.",
      "example": "The queue-to-production rule goes from about 170 words to 38.",
      "tradeoff": "The panel voted 5 to 0 that this is a blocker. An agent at night can have the permission without its gates."
    }
  ],
  "recommendation": "Pin. The evidence says size is a cost on current models, not an adherence problem. A lost limit on a permission is not a cost; it is a failure.",
  "affected": [
    "pinned-rules",
    "entry-check"
  ],
  "note": "these all sound bad there isn't another way?"
},
  {
  "id": "brief-rows",
  "status": "clarified",
  "question": "May a context-map row point at a live brief or handoff?",
  "answer": "custom",
  "context": "Today the cleanup script reports each map row that points at working material, and tells the agent to move the fact into the context home. On the field file, 7 of 21 rows point at live briefs, handoffs and scripts. To move them, the agent must summarize a live brief. That is a judgement, and the knowledge rules say feature intent stays in its brief.",
  "options": [
    {
      "value": "allow-live",
      "label": "Yes, while the feature is open",
      "recommended": true,
      "description": "A row can point at a brief or handoff of an open feature. The check reports it when the feature is archived or the target is missing. Session end then moves the durable facts and points the row at the context page.",
      "example": "Field file: the 7 rows cause no finding today.",
      "tradeoff": "Working material can be stale, and the map still points at it."
    },
    {
      "value": "keep-rule",
      "label": "No. Report them as today",
      "description": "Each such row is a finding. The agent moves the facts into the context home.",
      "example": "Field file: 7 findings that need a judgement.",
      "tradeoff": "These are the questions that this feature removes. It also copies feature intent into a second home."
    }
  ],
  "recommendation": "Allow it. A row to a live brief is how an agent finds current intent, and archive time is the correct moment to move the facts.",
  "affected": [
    "map-rows"
  ],
  "note": "unless specified by anthropic or open ai, my understanding is AGENTS.md should never be a skratchpad, or have temporal understanding -- it should be an eternal entrypoint to help guide the harness, anything temporal should be in context map no?"
}
]
---
# Feature intent

Owner, 2026-11-17, after a cleanup run on a field project asked 9 questions about its AGENTS.md: "this is asking the user too much, our job with joycraft is to ALWAYS provide the SOTA AGENTS.md file per claude/openAIs guidance, we need a feature to make this process much more deterministic and opinionated so the user doesn't have to think about the optimal AGENTS.md and also some mechanism that we can check at startup or whatever if it needs updating".

Research and the five-seat panel verdict: `docs/research/2026-11-17-entry-file-sota-panel-verdict.md`.

## Context and authorization

The owner asked for research, an adversarial panel and a fix proposal. Nothing here is authorized for implementation until the decisions above are answered. Payload changes are made in joycraft-prototype and vendored; the payload word guard applies, so this feature must cut at least as many words as it adds.

## Goals

- A cleanup run on an entry file asks only what a human must decide. **Done when:** on the field file, a run asks at most 2 questions (baseline 9), and none of them is about shape, placement, duplicates, map wording or unmapped pages.
- No limit is lost. **Done when:** a rules rewrite that drops a limit clause with no named check fails and writes nothing; after the rewrite, a tidy that alters one byte of a rule block fails.
- AGENTS.md holds nothing temporal. **Done when:** after a tidy of the field file, no date, status or dated link remains outside code spans, and its 7 rows to dated briefs and handoffs are entries in `now.md` behind one row.
- `now.md` does not rot. **Done when:** a session end that closes the last open item leaves `now.md` with no entries.
- A project learns that its entry file needs work without anyone asking. **Done when:** a session in a project with a dead path in AGENTS.md reports it once, at the end, and a clean project prints nothing.
- Vendor guidance changes reach projects without rewriting their text. **Done when:** a release that changes Joycraft's own lines updates only the managed block.

## Agent work and pending choices

All three decisions are answered `custom`, with the owner's notes. The owner and the agent settled them in dialogue on 2026-11-17; the sections below state the result. No decision blocks decomposition.

## tidy

`tidy-consent`, settled: tidy is a setting, `entry.tidy`, with three values. `auto`: never ask; tidy and report in one line. `ask-once`: setup or update asks one question and records the answer. `review`: show one diff page for each tidy. A user-level default applies to every project of that user, so an owner who sets `auto` once is never asked. A new user with no default is asked once at setup. The recorded setting is the explicit confirmation that Joycraft's never-overwrite boundary requires.

The cleanup skill loses its two freeze policies and gains one table of standing dispositions:

| Finding in the entry file | Disposition, no question |
|---|---|
| Anything temporal: a date, a status, a hold, a pause, a link to a dated brief or handoff | Move it to `now.md` (see `map-rows`), word for word. |
| History (a finished restoration, "previously", dated addenda) outside a pinned block | Move it to the decision log. |
| Prose that repeats Joycraft's generated block | Delete only sentences that are byte-identical after whitespace is normalized; keep the rest. |
| Text the agent itself added in this session | Fix it. |
| A map row that lists a page's contents | Rewrite it as a "read when" phrase. |
| A live context page with no row | Add a row. A page typed `log` or `history` is archived, never deleted. |
| A dead path with one unique Git rename | Re-point it. Otherwise report it. |
| Where instructions live | Rules in AGENTS.md, reference behind the map. Never `.claude/rules`, `@` imports or `AGENTS.override.md`: not portable. |

A **ruling** is the only thing asked: a fact inside a rule that the repository disproves, when the correction changes what is permitted, and a conflict between a rule and the code. Rulings do not stop work. Each is written once to the backlog with its evidence. A hold is not a ruling: it moves to `now.md` and stays in force until someone removes it.

One writer: an attended coordinator session. Workers, subagents and linked worktrees never check or edit an entry file; they return proposed map rows in their report. An unattended run changes only the managed block and uniquely renamed paths.

## pinned-rules

`long-rules`, settled: the owner rejected all three options ("these all sound bad"). The agreed way shortens a rule without moving any limit out of the entry file.

**Rewrite once.** For each project, Joycraft drafts the whole rules section one time:

1. Remove what is not a rule: an explanation the code already shows, a date, history, who said it and when. The reason goes to the decision log; anything temporal goes to `now.md`.
2. Where a test or a script already enforces a limit, name that check; do not restate what it enforces.
3. Everything that grants or denies permission stays in the entry file, at whatever length.

A limit leaves the entry file only when a check enforces it. A limit is never moved to a linked page.

**Script check.** A limit clause is a clause that contains a restriction token: never, not, no, only, must, unless, except, until, without, still, ask, approve, authorize, permission, stop, hold, gate, and their inflections. The lexicon over-includes on purpose. The script lists the limit clauses before the rewrite and fails it when one is missing afterwards and no named check covers it. The model does not write that list.

**Review follows the setting.** With `entry.tidy: auto` the rewrite is applied in one commit and the report shows the before and after of each rule. With `ask-once` or `review` the same page is shown first.

**Then pinned.** After the rewrite, a rule block stays byte for byte. Later tidies do not touch it; only the owner changes a rule.

## entry-check

One deterministic check, in or beside `cleanup.mjs`, independent of the update policy:

- **Gate (also `--ci`):** a missing path or broken link in an entry file; a package-script name that no manifest defines; the Codex chain (root to each directory with an entry file) over 32,768 bytes; a `@` import or `AGENTS.override.md`; the managed block differs from the generated one; a pinned block changed without a recorded ruling.
- **Advisory:** a date, or a link to a dated file, in an entry file outside a code span; an entry in `now.md` older than 14 days; a context page with no row; non-rule words above the committed per-project baseline; a nested `CLAUDE.md` with no sibling `AGENTS.md`.
- **Dropped from the draft:** a line budget, per-rule and per-row word caps, trigram duplicate detection, a relocation ledger, a local stamp, a migrating spec version.

It runs once per coordinator session (the existing first-action line; an opt-in SessionStart hook where the host has one), once per queue from the runner, and in CI. It is silent when clean. Findings are mentioned once, at the end of the session, never in the middle of a task.

The managed block is Joycraft's text between markers, regenerated at update. It gains one sentence: "When a path, command or description here disagrees with the code, trust the code and report it. Rules hold even when the code breaks them."

Setup writes a new AGENTS.md in the same shape: identity, commands, rules, the managed block, the map as `| Read when | Document |`. An existing file keeps its headings.

## map-rows

`brief-rows`, settled by the owner's principle: AGENTS.md is a lasting entry point, not a scratchpad. It holds nothing temporal.

- A map row names a lasting topic. It has no date, no status and no link to a dated brief, handoff or meeting note.
- One row is for temporal things: `| Before starting any work: current holds, pauses and open work | docs/context/now.md |`. The row does not change; the page does.
- `now.md` is the only context page where dated entries are allowed: holds, pauses, open handoffs, links to live briefs. Each entry has a date.
- Session end checks `now.md` every time: it adds what the session opened, removes what is over, and leaves the page empty when nothing is current. An archived feature removes its entries.
- A hold in `now.md` binds like a rule until it is removed.

See `tidy` for row wording and `entry-check` for reach and the age check.

## Scope and limits

- Joycraft does not generate rule text and does not migrate user text when vendor guidance changes. Re-reading vendor guidance is a release checklist line in this repository, not payload text.
- No stack-specific checks: a manifest check reads script names only.
- The 106 dead paths in the field project's other pages belong to a whole-project cleanup, not to this feature.
- Measurements and kill criteria are in the research verdict.
