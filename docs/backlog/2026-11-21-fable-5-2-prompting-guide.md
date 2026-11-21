---
status: backlog
owner: Maximilian Maksutovic
created: 2026-11-21
priority: later
source: https://www.youtube.com/watch?v=C45VVcCV9OY
---

# Prompting guide for Claude Fable 5.2

## Why

Fable 5.2 (`claude-fable-5-2`) follows instructions more literally than 5.1 and needs different prompting. Joycraft has only `docs/context/reference/model-profile-claude-fable-5-1.md`, which is marked history. The payload says nothing about Fable. A user who runs a Joycraft queue on Fable 5.2 gets no model-specific steering.

## What the video says

Source: Ben AI, "Anthropic Just Revealed How to Prompt Fable 5.2" (13:33). It is a third-party summary of Anthropic's Fable 5.2 prompting guide plus the presenter's own tests. Check each claim against Anthropic's guide before it ships.

- **When to use it (3:28–4:34).** Fable is for long, open-ended work you hand over and leave, where accuracy matters. Opus 5.5 stays the daily driver at half the price. On a bad output, raise effort first, then switch to Fable.
- **Do not switch models mid-chat (4:42–5:51).** A switch drops Fable's reasoning and the prompt cache. To change model, start a new chat with a summary or hand the part to a subagent.
- **Effort (5:52–6:53).** Most of the gain is already there at high. Low for quick back-and-forth, medium for everyday chat, high for hard or long unattended runs, xhigh/max only when time and cost do not matter. Change effort mid-chat instead of switching model, for example plan on low, then run on high.
- **Whole task up front (7:10–8:39).** Step-by-step prompting wastes the model. Give four parts: the whole job, the why and who it is for, the rules (write out every exception, since rules are followed almost word for word), and what done looks like. The model tends to do too much, not too little.
- **Progress updates (8:39–9:18).** On long runs it goes quiet. One line asking for a short update every few tool calls roughly halved the longest silent stretch.
- **Shorter output (9:19–10:01).** Output runs verbose. Anthropic's fix line opens with "write for an intelligent but low context reader".
- **Finish the work (10:01–10:50).** It can stop early with a to-do list, more often at low effort. Anthropic's "finishing work" block (shown on screen at 10:19): keep going while work is owed, work through ordinary errors and timeouts, leave deliberate blockers alone, still confirm risky actions. About half as many unfinished sessions, about 30% more tokens.
- **Audit old cautious rules (11:18–12:19).** Literal following makes old "never/always" rules costly. Run a prompt audit of memory, skills and project files against the Fable 5.2 guide.
- **Ask for proof, not reasoning (12:19–13:05).** Requests to explain its thinking can be refused, and it sometimes states guesses as facts. Ask for the source of each claim instead.

## How it would change Joycraft

- **Home: docs, not payload.** The payload sits at the 29,919-word cap (`tests/payload-guard.test.ts`), and `AGENTS.md` keeps methodology out of the shipped tool. Write `docs/context/reference/model-profile-claude-fable-5-2.md` in the 5.1 file's block format (stable headings, Behavior/Fix/prompt block). Carry over 5.1 blocks that still apply, re-test, and mark the 5.1 file superseded. Optionally add a user-facing `docs/guides/fable-5-2.md` with the four-part prompt and effort table.
- **Payload: zero or near-zero words.** Candidates if one line earns its place: the progress-update line and the finishing-work block in `joycraft-implement` for unattended queues. Each would need an equal cut elsewhere. Default: no payload change.
- **Audit pass.** Fable 5.2 reads Joycraft's rules literally. `archive.md`, `setup.md`, `completion.md` and `dispatch.md` carry the most never/always/must lines (16, 14, 14, 13). Check each for a missing exception. This overlaps the drift-debt research on this branch.
- **Execution profile.** `AGENTS.md` pins claude swarms to Opus 5.5 at high, which matches the "Opus daily driver" advice. The guide could say when a queue should run on Fable 5.2 at high instead.

## Open questions

1. Read Anthropic's Fable 5.2 prompting guide itself, or rely on this video? The guide should cite Anthropic, not the video.
2. Does any payload text earn a slot under the cap, or does Fable steering stay entirely in docs?
3. Should Joycraft ever pick the model per step (Fable for implement, Opus for interview), given the warning against mid-chat switches? Subagent dispatch already gives a clean boundary.
4. Keep the 5.1 profile as history, or delete it once 5.2 replaces it?
