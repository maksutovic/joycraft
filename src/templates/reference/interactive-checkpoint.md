# Interactive Checkpoint

> How a Joycraft gate on the Claude harness captures the human's answers on a private web page instead of one chat question at a time. This doc is the one home for the pattern; skills cite it by path and block name and never restate it. The page itself is `docs/templates/CHECKPOINT_TEMPLATE.html`.

Every gate that needs a human judgment uses it: decide, interview, new-feature, design, research, decompose, tune, and optimize. One page, two transports. On the Claude harness the `Artifact` tool with the `db` capability and the `ArtifactData` tool carry the answers. On Codex, Pi, omp, and Copilot, or when those tools are absent, the page runs in local mode (see that block): the agent opens the file, the browser keeps the answers, and the human pastes the output block into chat. A local HTTP transport that gives every harness the saved-on-click experience is backlogged at `docs/backlog/2026-09-23-checkpoint-non-claude-harnesses.md`.

## When to Build a Checkpoint

Build one page when a gate holds two or more questions the human must answer, or one question whose evidence does not fit in a chat message. One question with short evidence stays in the native question tool. Never build a page for a question the skill can answer itself, and never pad a page with questions the human did not need to see: say the expected count before you ask for their time, and review only the ambiguous tail.

## The Loop

1. Stop at the human's step. Commit or save the work so far. Do not guess an answer to move on.
2. Gather every open question from this gate into one list. Each carries its id, the framing as a question, two to four options the consuming skill can stamp, the recommended option, one paragraph of why, and the evidence lines the decision rests on.
3. Render one page from `docs/templates/CHECKPOINT_TEMPLATE.html`. Fill only the slot regions and the JSON data block. The runtime script stays byte-identical.
4. On Claude, publish it privately with the `Artifact` tool and `capabilities: {"db": {}}`. Elsewhere, open the file with `open <path>` on darwin or `xdg-open <path>` otherwise, as the gate's render step already does. Commit the render beside the gate's other renders (`docs/features/<slug>/checkpoint-<gate>.html`) unless the human says otherwise: Joycraft exists to keep context, and the answers never live in the file. The answers live in the artifact store.
5. Give the human the link or path in one line, with the question count and the words "answer at your pace, then tell me it is done" (local mode: "then paste the copied block here").
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

## Local Mode

The page enters local mode when `window.claude` is absent, which is every non-Claude harness and every locally opened file. The banner says so. Answers mirror to `localStorage` under a key built from the feature, the gate, and the question ids, so closing and reopening the same render restores them. Submit becomes "Copy answers": it copies the output block. The block starts with `# joycraft-checkpoint feature=<slug> gate=<gate> answered=N/M at=<iso>` and ends with `# end joycraft-checkpoint`; every row carries `key:` (the raw option key or escape key) beside the human-readable `choice:`, and an assigned row carries `assignee:`.

Read back in local mode: parse the last pasted block between the two markers. A missing end marker means the paste is truncated; ask for one re-paste. Map `key:` to the terminal state with the same rules as the store read-back, then apply the re-prompt and reversal rules unchanged. Echo `answered=N/M` in one line. A phone cannot reach a local file; say so when asked.

## Fallbacks

- No `Artifact` tool, or the publish fails: open the render locally and use local mode. If the page cannot open at all (headless, no browser), ask the questions with the skill's chat question directive and say why.
- The human answers some cards in chat and some on the page: the chat answer wins for that id, and Claude says so.

## Lessons From the First Run

- Review only the ambiguous tail. Tune the auto-decide rule before you ask for the human's time, and state the expected count.
- Every option on the page must be one the consuming skill accepts. The page adds only the escapes the decision states already allow.
- Do not bake a premise into a card. A card that asks the human to fill a quota invites answers that fit the quota; put the premise in a question the human answers first.
- Show evidence side by side when the flaw is relational. A row-by-row view hides shared copy or shared assumptions.
- Read back, then confirm reversals in chat. A free-text note can reverse a stamped pick.
