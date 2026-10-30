# Retrospective evidence

Use `joycraft-retro` on a requested session worth learning from, including a
successful session with unexpected friction. It proposes environment improvements;
it does not run on every session end, change acceptance or add Jev calls.

## Prepare native session evidence

If current host context or an already-cleaned record is sufficient, read it
directly. For a native Claude or Codex JSONL transcript, use the deterministic
local helper with an explicit source and a new private output directory:

```sh
node .joycraft/runtime/retro.mjs prepare --source /absolute/path/session.jsonl --out /absolute/path/new-retro-evidence
```

An optional physical line range selects a known episode; review coverage before
treating it as complete:

```sh
node .joycraft/runtime/retro.mjs prepare --source /absolute/path/session.jsonl --out /absolute/path/new-retro-episode --from-line 120 --to-line 380
```

Line selection reduces the prepared context, not source-read memory: this small
helper reads the supplied file into memory. Use an existing episode export or
the evidence collector for sources too large for that approach, retaining the
original source references and any selection limits.

Read `coverage.json` first, then `conversation.md` and `tools.jsonl`. The source
hash and physical line references let you return to exact raw evidence. The
conversation preserves selected human and assistant text; tool calls/results
stay in the compact ledger. Tool previews are partial; full results remain in
the original record. Reasoning and routine transport metadata are disclosed as
omitted rather than mixed with the human conversation. Unsupported or malformed
content is reported as a gap. Inspect needed raw lines before concluding that a
brief preview, missing result or incomplete transcript proves a failure.

The helper reads only the supplied file and writes the explicitly requested new
output directory. It performs no discovery, provider call, classification or
edits to existing project sources. Choosing an output inside a checkout creates
new untracked files there; keep raw and prepared records in a private directory
outside tracked project documentation. Pattern redaction is a
precaution, not a guarantee of anonymity or comprehensive secret removal;
inspect material before sharing it. It creates no permission or decision state.
Other harness formats can be read directly; do not describe an unsupported
format as normalized or invent native coverage.

Keep any linked session/worker files, hook receipts and final review reports as
separate sources. A single file may not contain all workers or continuations.
Existing hook metrics can summarize explicit receipts without replaying paid
checks:

```sh
node .joycraft/runtime/hooks/metrics.mjs --log /absolute/path/events.jsonl
```

Provider-reported usage is not an invoice; absent calls, timing or usage remain
unknown. Do not equate a missing receipt with a free or absent call.

## Judge a candidate

For each supported finding, retain its event/line reference, actual observation,
current owning source, proposed destination and a concrete validation. Check
whether the source was absent, stale, delivered but ignored, or incorrect. This
distinction matters before changing a skill.

| Observed problem | Smallest useful destination |
|---|---|
| Repeated search for the same responsibility | A pointer in the existing scoped context home |
| Existing lint/test command was broken or unwired | Repair/connect that command |
| Repeated mechanically detectable mistake | A tested repository-native check |
| Reviewer missed a genuine judgment issue | Existing scoped review guidance |
| Tool output or retry behavior wasted work | The tool's output/implementation/configuration |
| Guidance appears ineffective or contradictory | A focused comparison or correction at its source |
| Required logs, fixtures or capability were unavailable | The project's bootstrap or evidence access |
| Intent changed without reaching a worker | Existing brief and source-delivery path |

These are possible remedies, not categories that must all produce findings.
Missing CI alone is a lead; evaluate the task's actual feedback path. Avoid
adding tests that mirror implementation or guards that reject authorized ordinary
work. Test a proposed control on its motivating failure and a legitimate allowed
case. Existing human authorization may supersede an older scoped instruction.

Show the user only the context necessary to assess each candidate. Keep full
evidence behind references. A chosen, verified repair establishes a local fact;
effectiveness on other tasks remains unproven. Session-end archival still moves
only wholly accepted features at the session boundary, retaining historical
evidence and promoting continuing facts through the existing context path.

## Attribution

Inspired by Matt Pocock's [retro](https://github.com/mattpocock/skills/blob/4588b32ecab9ecc9fc8cc6b6c5e7d675b6004b0d/skills/engineering/retro/SKILL.md)
and his [v1.3 walkthrough](https://www.youtube.com/watch?v=BsJGo1wFTvQ&t=579s).
Joycraft retains its own source-delivery, authority and evidence contracts.
