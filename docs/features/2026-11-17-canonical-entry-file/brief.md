---
feature: canonical-entry-file
status: specified
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
  },
  {
    "id": "rewrite-review",
    "status": "clarified",
    "answer": "page-once",
    "question": "May Joycraft apply the one-time rules rewrite before the owner sees it?",
    "context": "Each project gets one rewrite of its rules section. After it, rules are pinned. The first design applied the rewrite without a stop when `entry.tidy` is `auto`.",
    "options": [
      {
        "value": "apply",
        "label": "Apply it, then show it",
        "description": "One commit that holds nothing else. The session-end report shows each rule before and after.",
        "tradeoff": "Agents can act on a changed rule before the owner reads the report."
      },
      {
        "value": "page-once",
        "label": "Show one list first, one time for each project",
        "description": "The agent shows what is kept, what moves and what is removed, and waits for one yes. Work continues with the old rules until then.",
        "tradeoff": "One stop in the life of each project."
      }
    ],
    "affected": [
      "pinned-rules"
    ],
    "note": "First answer: \"Apply, then show\". After the `limit-guard` answer removed the script guard, asked again: \"List first, one yes\"."
  },
  {
    "id": "limit-guard",
    "status": "clarified",
    "answer": "custom",
    "question": "How much of a rule does a script lock before the one-time rewrite?",
    "context": "The first design had a list of limit words and a script that failed the rewrite when a clause with a limit word was missing. A probe on the field file found that a narrow list leaves gate lists unlocked, and a wide list leaves the rules almost as long as before.",
    "options": [
      {
        "value": "sentence-wide",
        "label": "Lock the whole sentence, with a longer word list",
        "description": "A sentence with a limit word or a duty word stays word for word.",
        "tradeoff": "The rules section of the field file gets at most 24% shorter."
      },
      {
        "value": "clause-narrow",
        "label": "Lock only the clause with the limit word",
        "description": "The first list, one clause at a time.",
        "tradeoff": "A list of gates in its own clause has no limit word, so the rewrite can remove it and the script passes."
      }
    ],
    "affected": [
      "pinned-rules"
    ],
    "note": "this feels quite inflexible, we are trying to HELP the user, not complicate their lives, most user's AGENTS.md are stale, with bad guidance etc... we are over enginnering for a less than 1% user case who has some special crazy agents.md file -- we need to be addressing this for 99% of the users, myself as the primary -- you should be able to review the agents.md, find the saftey rules, bring those tot he users attention or say what will move or be removed and they can say yes or no"
  },
  {
    "id": "hold-delivery",
    "status": "clarified",
    "answer": "print",
    "question": "How does an agent learn about a hold that is in now.md?",
    "context": "A hold moves from the entry file to `now.md`. The entry file keeps one map row that says to read `now.md` before starting any work. A linked page is opened in about 9 of 10 sessions and is not loaded again after a compaction.",
    "options": [
      {
        "value": "print",
        "label": "The session-start check prints the holds",
        "description": "The check that runs as the first action of each session and at the start of each queue prints one line for each hold. It prints nothing when there is no hold.",
        "tradeoff": "Session end must write each hold under a `Holds` heading so the script can find it."
      },
      {
        "value": "row-only",
        "label": "The map row is enough",
        "description": "Nothing prints.",
        "tradeoff": "A session that does not open the page does not see the hold."
      }
    ],
    "affected": [
      "map-rows",
      "entry-check"
    ],
    "note": "Print at start"
  },
  {
    "id": "now-age",
    "status": "clarified",
    "answer": "custom",
    "question": "When is an entry in now.md too old?",
    "context": "Session end checks `now.md` each time and removes what is over. An age check is a second net for an entry that session end kept by mistake. The first design used 14 days as an advisory finding.",
    "options": [
      {
        "value": "14-days-holds-exempt",
        "label": "14 days, and a hold has no age",
        "description": "The agent checks an older entry again at session end and removes it or gives it a new date. It does not ask.",
        "tradeoff": "The number is a guess."
      },
      {
        "value": "no-age-check",
        "label": "No age check",
        "description": "Only session end keeps `now.md` current.",
        "tradeoff": "An old entry can stay and be read as current."
      }
    ],
    "affected": [
      "map-rows",
      "entry-check"
    ],
    "note": "something of a hybrid, anything older than a week or so, can't the agent just remark it to the user e.g. \"Noticed we have some pending work we havne't fixed, do you want me to check ohn that? should we backlog?\" something like this, make it more collaborative, but also if session-end is doing it's job this SHOULD\"T be an issue, this is just a extreme edge case, again stop designing around the extreme edge cases"
  }
]
---
# Feature intent

Owner, 2026-11-17, after a cleanup run on a field project asked 9 questions about its AGENTS.md: "this is asking the user too much, our job with joycraft is to ALWAYS provide the SOTA AGENTS.md file per claude/openAIs guidance, we need a feature to make this process much more deterministic and opinionated so the user doesn't have to think about the optimal AGENTS.md and also some mechanism that we can check at startup or whatever if it needs updating".

Research and the five-seat panel verdict: `docs/research/2026-11-17-entry-file-sota-panel-verdict.md`.

## Context and authorization

The owner asked for research, an adversarial panel and a fix proposal. All seven decisions are answered (2026-11-17), and the owner asked for the specs. Payload changes are made in joycraft-prototype and vendored; the payload word guard applies, so this feature must cut at least as many words as it adds.

## Goals

- A cleanup run on an entry file asks only what a human must decide. **Done when:** on the field file, a run asks at most 2 questions (baseline 9), and none of them is about shape, placement, duplicates, map wording or unmapped pages.
- No rule changes without a yes. **Done when:** the one-time rules rewrite writes nothing before the user answers its list; after the rewrite, a tidy that alters one byte between the rules markers fails.
- AGENTS.md holds nothing temporal. **Done when:** after a tidy of the field file, no date, status or dated link remains outside code spans, and its 7 rows to dated briefs and handoffs are entries in `now.md` behind one row.
- `now.md` does not rot. **Done when:** a session end that closes the last open item leaves `now.md` with no entries.
- A project learns that its entry file needs work without anyone asking. **Done when:** a session in a project with a dead path in AGENTS.md reports it once, at the end, and a clean project prints nothing.
- Vendor guidance changes reach projects without rewriting their text. **Done when:** a release that changes Joycraft's own lines updates only the managed block.

## Agent work and pending choices

The first three decisions are answered `custom`, with the owner's notes. The owner and the agent settled them in dialogue on 2026-11-17. The last four confirm choices the first agent made; two of them changed the design. The sections below state the result. No decision blocks decomposition.

The owner's direction for every open detail (`limit-guard`, `now-age`): design for the usual entry file, which is stale and has weak guidance. Do not add machinery for a rare file shape.

## one-pass

Design change, 2026-11-18. Six trials on a field project and a second panel of seven seats (`docs/research/2026-11-18-one-pass-cleanup-panel-verdict.md`) showed that the design in `tidy`, `pinned-rules` and `map-rows` cannot change an entry file that is mostly rules, and that an entry file cannot be cleaned without the pages behind its map. The owner approved this section on 2026-11-18. Where it disagrees with a section below, this section wins.

Owner, 2026-11-18: the entry file "should be quite light weight, provide just enough context for an agent to gather the context it needs specifically on a task, which is the whole intention of the context map"; "only changing the agents.md without the context map makes zero sense it has to be done in tandem"; "we must be insured that sub agents have plenty of context".

**One pass, pages and entry file together.** Cleanup is a dialogue with the owner, run when he asks for it. The steps:

1. Read the entry file and every page behind its map. Find what reads those files: tests, scripts, open specs and queues.
2. Analyze, read only. Two lenses for each statement: is it true now (checked against the code and Git), and is it in the right place. Each page has a kind: a guide (current rules and facts for one topic), or a record (a log or history).
3. One round of questions, by theme: at most eight, each about one policy and not about one line. The agent applies each answer to every line of its theme and decides the rest by an order of authority: the entry file wins over a page that contradicts it, a newer guide wins over an older one, and a rule that only a record states is not in force. Every other choice is a recommendation, which the owner can veto.
4. Fix the pages.
5. Write the entry file last: identity, rules, Joycraft's block, the map.
6. Run the checks and the project's own gates. One commit.

**Few questions, thorough analysis.** Owner, 2026-11-18, after a run of the shipped text asked 39 line-level questions, most of them from old handoff documents: "the analysis is good, the questions are not"; the agent should "take more decisions on behalf of the user" and ask in general terms ("have the rules for my autonomy changed?", "these rules are conflicting, how should we resolve?"), and must not "make the user spend over an hour researching what exact rules they may need". He called that run failed.

**The shipped method is the one of the best trial.** The trial before the panel fixed 132 of 134 known false or stale statements and gave the lightest entry file; three runs of a shorter skill text fixed 48% to 78%, and the entry file did not shrink. The owner chose on 2026-11-18 to rebuild the reference from that trial's method: the aim, the two lenses, the seven things to find on each page, half the words as the aim for the entry file, and the agent that reads a part also edits it. The panel's ruling "no word target" is withdrawn. Added to that method: the questions by theme through the decision artifact, and the ledger. Stops and holds are always two of the theme questions and are never dropped by recommendation; the trial before the panel dropped 15 permission lines that way.

**Permission ledger.** Before the commit the agent lists every line that permits, forbids, stops or holds and that the pass changed, old against new. Each names what decided it: an owner's answer, or the order of authority. The agent marks each line where it read an answer onto a line that the owner did not name, and the owner reviews those first. A line that nothing decides stays. A grant keeps the owner's words and scope. A rule, a stop or a hold is never retired by recommendation, and a question about one hold does not retire the general rule behind it. A permission and its limits stay together. This replaces the rules markers and the byte pin.

**Nothing temporal in the entry file or in a guide.** Owner, 2026-11-18: "cleanup does a good job of removing any/all temporal stuff from the important places like AGENTS.md and essential context map pointers". A date, a status, progress, a finished plan or "who said it and when" moves to the record that owns it: a decision to the decision log, an operation to its log, open work to the backlog or a handoff. A hold that is in force is a rule: it stays in the entry file as one present-tense line, and its date and reason go to the decision log. There is no `now.md`.

**The map has two parts.** Guides: one row for each page, written as "read when <situation>". Records: the decision log and other logs and history. A record is an audit trail. An agent searches it to learn why or when, or to check for a regression; it does not read a record at the start of a session, and no row tells it to. A current rule that lives only in a record moves to a guide.

**Workers get the entry file.** The worker packet names it. A map row that matches the next step binds, and a rule that a worker must obey has a line in the rules: "Read `<page>` before <action>."

**Facts yield to the code; rules do not.** Joycraft's block says so.

**Session end stays cheap.** Session end runs the report and the mechanical fixes only: Joycraft's block, a dead path with one rename target. It never changes rule text or a page. There is no `entry.tidy` setting.

**Cut from the first design:** `now.md` with its hold lines and age check; the rules markers and the byte pin; the `entry.tidy` setting and the user default. The date check stays as an advisory, because it finds the temporal text that the owner wants gone; it no longer names `now.md`. The managed-block check becomes an advisory.

**Measures, set before the release run.** The release stops when a run of the shipped skill text alone, on a clean clone of the field project: asks more than eight questions, or one that the owner cannot answer from the page alone; shows a permission change in its ledger that neither an owner answer nor the order of authority decides; misses more than a quarter of the 38 known findings; or needs more than two rounds of questions. It also stops when the field project's own gate fails where the commit before passed; when a second, small repository gets a longer entry file or more than 3 questions; when a worker does worse with the new files than with the old on a task that needs a moved rule; or when an update from 1.5.4 leaves an old Joycraft line beside the block. These replace the two kill criteria of the first verdict: a dialogue cannot have a median of one question, and the ledger makes every permission change approve-first.

## tidy

Replaced by `one-pass` (2026-11-18), except the row wording and the one-writer rule.

`tidy-consent`, settled: tidy is a setting, `entry.tidy`, with three values. `auto`: never ask; tidy and report in one line (the one-time rules list in `pinned-rules` is the only exception). `ask-once`, the built-in default: the first attended tidy asks one question and records `auto` or `review` for the project. `review`: show one diff page for each tidy. A user-level default applies to every project of that user, so an owner who sets `auto` once is never asked. A new user with no default is asked once at setup. The recorded setting is the explicit confirmation that Joycraft's never-overwrite boundary requires.

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

One writer: an attended coordinator session. Workers and subagents never edit an entry file; they return proposed map rows in their report. An unattended run changes only the managed block and uniquely renamed paths. The checkout does not matter: the check, the holds and the tidy work the same in a linked worktree (owner, 2026-11-17: "this only for fixing AGENTS.md with cleanup why would worktrees matter?"). An earlier draft of this brief said that a linked worktree checks nothing; that treated the place where a person works as a worker.

## pinned-rules

Replaced by `one-pass` (2026-11-18): no markers, no pin. Kept for the record.

`long-rules`, settled: the owner rejected all three options ("these all sound bad"). The agreed way shortens a rule without moving any limit out of the entry file.

**Rewrite once.** For each project, one time, the agent reads the rules section and sorts its text:

1. A safety rule stays as written: what an agent must never do, must always do, or must ask about first.
2. What is not a rule is removed: an explanation the code already shows, a date, history, who said it and when. The reason goes to the decision log.
3. Anything temporal moves to `now.md`, word for word.
4. Where a test or a script already enforces a rule, the rule names that check and does not restate it.

A safety rule is never moved to a linked page.

**One list, one yes** (`rewrite-review`, `limit-guard`). The agent shows one page with three parts: the safety rules it keeps, the text that moves and where, and the text it removes. It writes nothing before a yes. This is the same for every `entry.tidy` value, and it is the only stop in the life of a project. On a no, the rules stay as written and are pinned as they are. An unattended run never does the rewrite. There is no list of limit words and no script that judges rule text: the agent finds the safety rules, and the user sees the list.

**Then pinned.** The rewrite puts the rules between `<!-- joycraft:rules -->` and `<!-- /joycraft:rules -->`. Markers present means the rewrite is done. A later tidy leaves the text between them byte for byte: the tidy records a hash of that text before it starts, and stops before its commit when the text differs. An owner's own edit is not a tidy and is not checked. Only the owner changes a rule.

## entry-check

One deterministic check, in or beside `cleanup.mjs`, independent of the update policy:

- **Gate (also `--ci`):** a missing path or broken link in an entry file; a package-script name that no manifest defines; the Codex chain (root to each directory with an entry file) over 32,768 bytes; a `@` import or `AGENTS.override.md`; the managed block differs from the generated one.
- **Advisory:** a date, or a link to a dated file, in an entry file outside a code span; a context page with no row; words outside the rules markers above `cleanup.entryWords`.
- **Holds** (`hold-delivery`): at the start of a session and of a queue, the check prints one line for each entry under the `Holds` heading of `now.md`. No hold, no line.
- **Old entries** (`now-age`): at session end, the check names each `now.md` entry outside `Holds` that is older than 7 days. The agent remarks on them to the user in one plain sentence and offers to check them or move them to the backlog. It is a remark, not a stop.
- **Dropped:** a line budget, per-rule and per-row word caps, trigram duplicate detection, a relocation ledger, a local stamp, a migrating spec version, the limit-word list, a per-project word baseline, a check for a nested `CLAUDE.md`, a CI gate on rule text.

It runs once per coordinator session (the existing first-action line; an opt-in SessionStart hook where the host has one), once per queue from the runner, and in CI. It is silent when clean and prints only holds at the start. Findings are mentioned once, at the end of the session, never in the middle of a task.

The managed block is Joycraft's text between markers. The runtime prints it and checks it; the agent places it, as the earlier ruling `writer` says (`docs/features/2026-11-02-install-entry-files/brief.md`). After an update, the agent replaces a block that differs. It gains one sentence: "When a path, command or description here disagrees with the code, trust the code and report it. Rules hold even when the code breaks them."

Setup writes a new AGENTS.md in the same shape: identity, commands, rules, the managed block, the map as `| Read when | Document |`. An existing file keeps its headings and the column order of its map.

## map-rows

Replaced by `one-pass` (2026-11-18): there is no `now.md`. The first bullet still holds.

`brief-rows`, settled by the owner's principle: AGENTS.md is a lasting entry point, not a scratchpad. It holds nothing temporal.

- A map row names a lasting topic. It has no date, no status and no link to a dated brief, handoff or meeting note.
- One row is for temporal things: `| Before starting any work: current holds, pauses and open work | docs/context/now.md |`. The row does not change; the page does.
- `now.md` is the only context page where dated entries are allowed: holds, pauses, open handoffs, links to live briefs. Each entry starts with the date it was last confirmed. Holds are under a `Holds` heading.
- Session end checks `now.md` every time: it adds what the session opened, removes what is over, and leaves the page empty when nothing is current. An archived feature removes its entries.
- A hold in `now.md` binds like a rule until it is removed.

See `tidy` for row wording and `entry-check` for reach and the age check.

## Scope and limits

- Joycraft does not generate rule text and does not migrate user text when vendor guidance changes. Re-reading vendor guidance is a release checklist line in this repository, not payload text.
- No stack-specific checks: a manifest check reads script names only.
- The 106 dead paths in the field project's other pages belong to a whole-project cleanup, not to this feature.
- Measurements and kill criteria are in the research verdict.
