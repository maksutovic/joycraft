# Codex panel brief — Dynamic Joycraft

You are the Codex side of a two-model adversarial panel. A Claude panel runs the same propositions independently. Do not read its output; the human compares the two afterwards.

**Models.** Run skeptics and judges on GPT-6 Astra at ultra reasoning. If you delegate evidence gathering (web fetches, citation checks, repo reads) to sub-agents, run those on GPT-6 Luna at medium.

**Inputs.** Read these first, in order:

1. `docs/research/2026-09-24-dynamic-joycraft-evidence.md` — the evidence pack. Section 0 states the thesis and influences. Sections 1–8 are eight cited research reports. Section 9 is the lead's synthesis and the twelve propositions P0–P11. Section 10 is the human's frame from the checkpoint: their answers and the exact words behind them. Argue inside that frame and attack the human's own positions as hard as the lead's.
2. `docs/intent/2026-09-24-dynamic-joycraft.md` — the intent as filed.
3. The repo itself. `AGENTS.md` for boundaries and architecture. `src/skills/*.md` for the 22 canonical skills. `scripts/generate-bundled-files.mjs` and `scripts/sync-skills.mjs` for per-harness generation. `src/update-plan.ts` and `src/install-manifest.ts` for ownership kinds. `src/folder-map.ts` and `src/update-inventory.ts` for the create-once behavior of AGENTS.md. The parked Opus 5.5 feature is on branch `feature/opus-5-5-prompting`; read it with `git show feature/opus-5-5-prompting:docs/features/2026-09-23-opus-5-5-prompting/brief.md`.
4. Primary sources when a claim matters: Shopify Helix (https://shopify.engineering/helix), TypeSafe docs (https://docs.typesafe.ai/llms.txt), Claude Code docs (https://code.claude.com/docs/en/skills, /hooks, /plugins-reference), and any arXiv paper the pack cites.

**Rules.**

- Evidence over opinion. Every claim you rely on carries a URL and a date, or a repo path with line numbers. Mark anything you could not verify as UNVERIFIED.
- Re-check at least two of the pack's citations per proposition against the live source. Report any citation that does not say what the pack says it says.
- Do not edit any file except your two output files. Do not stamp decisions, write specs, or touch the intent.
- Do not stage `docs/.joycraft/manifest.json` if you commit anything. Prefer not to commit; the human will.
- Cite the maintainer's words from section 10 when you engage a position they hold.

**The propositions.** P0–P11 as written in the pack's section 9. For each, the claim is the lead's candidate shape; the skeptics' job is to refute it.

**Lenses (7).** Each proposition gets three or four skeptics, each with one lens: solo developer on Pi with an open-weight model · team lead adopting across five engineers · maintainer counting hours · evidence auditor re-checking citations · novice vibe coder (Levels 1–2) · agent-harness expert who has built or maintained a coding-agent harness · AI researcher in evaluation methodology and the agent literature. Pick the lenses most relevant to each proposition. Every proposition gets the evidence auditor.

**Procedure per proposition.**

1. Skeptics, in parallel and context-isolated from each other, each try to refute the proposition. Each returns: the strongest refutation, the evidence for it, the evidence against it, what they could not verify, and a verdict of refuted / qualified / stands.
2. A judge reads the skeptics' returns and the pack and rules **keep**, **flip**, or **qualify**. A qualify names the exact condition. A flip names the replacement claim. The judge states what new evidence would change the ruling.
3. Record every disagreement between skeptics rather than smoothing it.

**Cross-cutting, after all twelve.** One synthesis agent answers: which shape would you recommend given the twelve rulings; where do you disagree with the lead's synthesis in section 9 and why; what is the first thing to build and the first thing to measure; which of the human's own positions in section 10 did the panel move, and with what.

**Output.** Two files, nothing else.

- `docs/research/2026-09-24-dynamic-joycraft-panel-codex.md` — Markdown. Structure: a ten-line summary; one section per proposition (ruling, strongest refutation, evidence for, evidence against, skeptic disagreements, what would change the ruling); the cross-cutting synthesis; a citations-rechecked table (citation, verdict: holds / misread / dead link); an UNVERIFIED list.
- `docs/research/2026-09-24-dynamic-joycraft-panel-codex.html` — a self-contained HTML rendering of the same content for the human to read. No external scripts, stylesheets, fonts, or images. Light and dark theme through CSS variables on `:root` and a `prefers-color-scheme` media query. A ruling chip per proposition (keep / flip / qualify) visible at the top. Readable at phone width. No content that is not in the Markdown.

**Done when** both files exist, every proposition has a ruling, and the summary names the panel's recommended shape in one paragraph. Tell the human the two paths.
