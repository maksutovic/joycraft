# One-pass cleanup: trials and panel verdict

Date: 2026-11-18. Feature: `docs/features/2026-11-17-canonical-entry-file/`. This page records why the design of 2026-11-17 changed. It names no field project and quotes no rule of one.

## Six trials

Each trial ran on a scratch clone of one field project. Its entry file had 1,514 words, mostly rules, and 25 pages behind its map.

| Trial | Method | Entry file after | Result |
|---|---|---|---|
| 1, 2 | The 2026-11-17 skill: standing dispositions, rules pinned | about 1,460 words | The pinned rules could not change. One false fact was pinned. A hold ended up in two places. |
| 3 | A fresh agent with vendor research only | 1,614 | Research alone does not make an agent cut. |
| 4 | An explicit opinion, then a dialogue with the owner | 892 | Lighter, but the map sent agents to one page of 22,741 words. |
| 5 | Truth and place lenses, entry file only | 1,443 | Moved text needs a true, short page to land on. |
| 6 | Entry file and pages in one pass, with one round of owner questions | 1,316 | 38 false or stale statements and 12 contradictions fixed. A task that needed about 36,000 words of reading needed about 5,300. |

Vendor facts, read 2026-11-18: Claude Code asks for under 200 lines for each `CLAUDE.md`; Codex stops at 32 KiB. Neither gives a word limit. So size is not the defect: false and misplaced text is.

## The panel

Seven seats reviewed the trials and the plan, read only: owner sovereignty, determinism, harnesses and workers, minimalist, owner's advocate, release engineer, evidence skeptic. Five said adopt with amendments. One said ship only after named tests. One said ship as two minor releases.

**Agreed by all seven**

- No word target. Record the size that results, and warn when the file grows past it.
- One agent by default. Fan out only for read-only analysis of a large set, with the cost stated first.
- An unattended run changes only what a script can check.
- The shipped skill text must pass a run on its own before a release.

**The main hole.** In trial 6 the agents changed permissions that the owner had not ruled on, in nine places: a grant written wider than his words, a general hold rule dropped when he lifted two named holds, stops deleted with a list, a hold ended by recommendation. Three seats found it independently. Nothing in the procedure would have caught it. The fix is the permission ledger in the brief.

**Other holes accepted**

- The trial result failed Joycraft's own `entry-check --ci`, because trial 6 ran on the older bundle.
- The byte pin is local and git-ignored, is recorded and checked by the same agent, and covers one file while rules live on several.
- A worker's packet did not name the entry file, and a map row read as optional.
- Only 1 of 25 pages stated its kind, so the checks treated logs as guides.
- A backticked path in a page resolved from the project root only, which reported two pages as orphans in error.
- The cleanup skill said that it runs at every session end; a full pass is too costly for that.
- The first verdict's two kill criteria were dropped without a reason. The brief now replaces them.

**Split, and the owner's ruling (2026-11-18)**

- Release shape: five seats wanted the built checks first and the procedure later; two wanted one release. Ruling: one release, held until the measures in the brief pass.
- The byte pin: four keep, two cut, one keep only if committed. Ruling: cut; the ledger replaces it.
- `now.md`, the `entry.tidy` setting: ruling: cut.

## What stays from the first design

The entry check and its `--ci` gate (missing path, broken link, script name, Codex bytes, imports), the entry-size advisory, the date advisory, and Joycraft's managed block.

## Release proof

The measures of the brief (`docs/features/2026-11-17-canonical-entry-file/brief.md`, section `one-pass`, "Measures") were run on the built bundle before the release, on scratch clones of a field project. This section was spec 12 of the queue. The owner said on 2026-11-18 to delete that spec; its record is kept here.

The owner saw a page with one row for each measure and one decision: "Do you accept the release proof (spec 12) as it stands?" He saved the answer "Accept: close spec 12 with these results". Before that he said: "if it really breaks or whatever we'll just do a fresh brief for 1.6.1 so no reason we can't just close this out for real before the merge". The page is kept outside both repositories. This record comes from the session that showed him the page.

| Measure | Result |
|---|---|
| At most eight questions, each answerable from the page | 8 questions in one round. He could not answer one of them from the page. Fail on that one question |
| No permission change that no answer decides | 0. Pass. A recommendation that he did not veto decided 8 changes. 2 readings of his answers were not marked as readings |
| At least three quarters of the known false or stale statements fixed | 113 of 134 (84%) after the closing loop, 81% before it. Pass |
| At most two rounds of questions | One. Pass |
| The field project's own gate | Not run: the scratch clones have no dependencies |
| A small second repository | Failed on an earlier skill text: the entry file went from 292 to 473 words, 162 of them Joycraft's block that the repository never had, and the run asked 5 questions. Not run again on the final text |
| A worker with the new files against the old | Not run |
| An update from 1.5.4 leaves no old Joycraft line | Passed in the run before the last one. In the last run the block was left unplaced, because one owner question was open |

The runs used the payload `field-25`. After them, a review of spec 11 found two sentences missing from the cleanup reference, and `field-26` added them: a hold that the owner keeps is one present-tense rule with a home, and a host with no subagents reads the changed guides again itself. In the measured run the owner's answer was to remove all holds, so that run did not use the hold sentence. No run measured the text of `field-26`.
