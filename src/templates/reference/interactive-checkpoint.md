# Interactive Checkpoint

> How a Joycraft gate on the Claude harness captures the human's answers on a private web page instead of one chat question at a time. This doc is the one home for the pattern; skills cite it by path and block name and never restate it. The page itself is `docs/templates/CHECKPOINT_TEMPLATE.html`.

This pattern needs the `Artifact` tool with the `db` capability and the `ArtifactData` tool. Both exist only on the Claude harness. Every gate that needs a human judgment uses it: decide, interview, new-feature, design, research, decompose, tune, and optimize. On any other harness, or when the tools are absent in a session, the skill's chat question directive stays in force unchanged.

## When to Build a Checkpoint

Build one page when a gate holds two or more questions the human must answer, or one question whose evidence does not fit in a chat message. One question with short evidence stays in the native question tool. Never build a page for a question the skill can answer itself, and never pad a page with questions the human did not need to see: say the expected count before you ask for their time, and review only the ambiguous tail.

## The Loop

1. Stop at the human's step. Commit or save the work so far. Do not guess an answer to move on.
2. Gather every open question from this gate into one list. Each carries its id, the framing as a question, two to four options the consuming skill can stamp, the recommended option, one paragraph of why, and the evidence lines the decision rests on.
3. Render one page from `docs/templates/CHECKPOINT_TEMPLATE.html`. Fill only the slot regions and the JSON data block. The runtime script stays byte-identical.
4. Publish it privately with the `Artifact` tool and `capabilities: {"db": {}}`. Commit the render beside the gate's other renders (`docs/features/<slug>/checkpoint-<gate>.html`) unless the human says otherwise: Joycraft exists to keep context, and the answers never live in the file. The answers live in the artifact store.
5. Give the human the link in one line, with the question count and the words "answer at your pace, then tell me it is done".
6. When the human says it is done, read the answers back and stamp them with the skill's own stamping rules.

## Anatomy of the Page

- Header: what this checkpoint decides, one dek sentence, the locked facts as chips, and a save-status banner.
- Optional context sections: the same fixed blocks as the review gate (pillars, table, must and must-not, criteria).
- Question cards, rendered by the page from the JSON block: id, question, recommendation marked "· recommended", why, evidence lines, a segmented control of the options plus the fixed escapes, and a free-text reason box.
- Output panel: the exact `decisions:` block the skill will stamp, built live from the answers, with a copy button.
- How-to box: names the reject-this-framing escape.

## Data Contract

- In: the JSON block with id `checkpoint-data`. Fields: `gate`, `feature`, `collection` (default `answers`), `statusDoc` (default `meta/status`), and `questions[]` with `id`, `question`, `recommend`, `why`, `evidence[]`, and `options[]` of `{key, label}`.
- Store: one document per question at `answers/<id>` with `{choice, rationale, assignee, at}`. The fixed escape keys are `__backlog`, `__discard`, and `__defer`. A cleared choice deletes the document. Submit writes `meta/status` with `{submitted, answered, total, at}`.
- Out: the page builds the `decisions:` YAML from the same rules the read-back uses, so the human sees what Claude will write before Claude writes it.

## Publish and Verify

After the first publish, run one `ArtifactData` `list` on the answers collection. An empty result is the expected state; the call proves the store is reachable. Tell the human in one line what you checked. Never seed answers yourself.

## Read Back

1. `ArtifactData` `get` on `meta/status`. When `submitted` is absent, say so and ask whether to read the partial answers or wait. A partial read is allowed when the human asks for it.
2. `ArtifactData` `list` on the answers collection. Map each document to a terminal state: an option key is `clarified` with that option as the choice; `__backlog` is `backlogged`; `__discard` is `discarded`; `__defer` is `assigned` to the assignee. A question with no document stays `open`.
3. A `clarified` answer with an empty rationale gets exactly one re-prompt in chat, for the reason only. If it is still absent, keep the choice and record `rationale: (not given after re-prompt)`.
4. A rationale that names a different choice than the control, or rejects every option, is a reversal. Restate each reversal as a decision row in chat, confirm it once, and stamp the confirmed row. Never ask the same question twice.
5. Stamp through the skill's own rules. The page never writes repo files; Claude does, from the store.

## Fallbacks

- No `Artifact` tool, or the publish fails: ask the questions with the skill's chat question directive and say why.
- The page reports no data store: the human copies the output block into chat, and Claude parses that block as the answers.
- The human answers some cards in chat and some on the page: the chat answer wins for that id, and Claude says so.

## Lessons From the First Run

- Review only the ambiguous tail. Tune the auto-decide rule before you ask for the human's time, and state the expected count.
- Every option on the page must be one the consuming skill accepts. The page adds only the escapes the decision states already allow.
- Do not bake a premise into a card. A card that asks the human to fill a quota invites answers that fit the quota; put the premise in a question the human answers first.
- Show evidence side by side when the flaw is relational. A row-by-row view hides shared copy or shared assumptions.
- Read back, then confirm reversals in chat. A free-text note can reverse a stamped pick.
