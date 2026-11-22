# Spec 13 owner check after fix 8ea4b71

Independent check, not a formal review (the review limit for spec 13 is used up). Subject: `payload/.joycraft/runtime/archive.mjs` and `tests/runtime-archive-named-files.test.ts` at 8ea4b71, branch `feature/drift-tidy`. Brief decision `archive-rewrite-route` = `fix-and-accept`. Date: 2026-11-21. macOS (Darwin 25.6), Node v24.22.0. All experiments ran in temp Git repos. Nothing in the project was edited except this file.

## Verdict

- **f13r3-1 (a second call undoes a live run): resolved.**
- **f13r3-2 (a save during staging is overwritten): resolved** for the reported window (seconds of previews and staging). A gap of about 47 µs per file remains between the compare and the write. User-space code cannot close it fully. It is listed as a limit.
- **No new blocking-class defect.** No run I made lost data or reported `archived` for a folder that was not archived. I found one new follow-up-class defect (N1 below): a plain `--apply` that runs at the same time as an `--apply --rewrite` of the same feature leaves a stale record, and the recovery steps would then undo a valid archive.

## What I ran

The probes and preloads were copied to the scratchpad (`.../scratchpad/check13/`). `spec-13-r2-probe.mjs` and `spec-13-r3-probe.mjs` were pointed at the absolute payload path. `spec-13-probe.mjs` already pointed there.

| Run | Result |
|---|---|
| `spec-13-probe.mjs` (all cases) | All cases as expected: look-alike paths are not rewritten, latin1 bytes are kept, CRLF is kept, symlink and unlisted refusals exit 2, the migration is report-only, receipts are written |
| `spec-13-probe.mjs interrupt SIGTERM group` / `SIGINT group` | Source back, `git status` clean, test unchanged; rerun preview exits 0; rerun apply is `held` (red test) |
| `spec-13-r2-probe.mjs` stages (7 kill points) | Every kill point before `after-clear` recovers on the next call to a clean tree (`held interrupted`), and a later apply archives. `after-clear` reports archived (correct: the record was already cleared after green) |
| `spec-13-r2-probe.mjs` records | A corrupt record, a bad sha, `destination=src` and `files[].path=src/keep.txt` all hold `interrupted-unverified`; `src/keep.txt` is untouched |
| `spec-13-r2-probe.mjs` two | x,y order holds x (unverified), y restores; y,x order restores both; sequential case holds x after y's green rewrite of the shared test |
| `spec-13-r2-probe.mjs` user-edits | The probe crashes at line 135 because it expects the old restore-anyway behaviour (it reads `docs/features/x/brief.md`, which now correctly stays absent). A guarded copy shows: held `interrupted-unverified`, the archived-copy edit is kept, `NOTES.md` is kept, the test edit is kept, and after `git restore` the archived-copy edit is kept. This is a probe artifact, not a defect |
| `spec-13-r3-probe.mjs concurrent` | Preview during a live run: `held in-progress` exit 2, nothing moved; the live run is `archived` exit 0. Two applies 50 ms apart: B refuses at the exclusive record (exit 2, "Another archive --apply --rewrite ... holds"), A archives. 600 ms apart: B is `held in-progress`, A archives |
| `spec-13-r3-probe.mjs edit-race` (green and red) | `held edited-during-archive` exit 2, the user edit is kept, the folder is back, no record is left |
| `spec-13-r3-probe.mjs reuse` | A between-renames kill followed by a new `docs/features/x` holds unverified (does not touch the new brief). Manual cleanup with the record left recovers, then archives. A dated record with a user edit holds unverified |
| `spec-13-r3-probe.mjs large` | 100 MB: the kill is recovered byte for byte, then green archives. 420 MB: refuses before any change, names the file, says to leave it out of `--rewrite` (about 345 MB budget) |
| `npx vitest run` on the 3 spec test files | 37 passed. `node scripts/pin-payload.mjs --check`: PIN matches |

## Earlier blockers

| ID | Status | Evidence |
|---|---|---|
| f13-1 interrupt moves without green | Resolved | SIGTERM and SIGINT to the group restore the tree; SIGKILL at each stage is recovered on the next call (r2 stages) |
| f13r2-1 recovery overwrites and deletes | Resolved | r2 records and user-edits: hand-edited paths are refused, user edits and notes are kept, held `interrupted-unverified` |
| f13r2-2 staging window not recovered | Resolved | between-renames kill: the next call restores from `.x.staging-*` (r2 stages) |
| f13r3-1 recovery undoes a live run | Resolved | r3 concurrent (3 timings), plus the attacks below. Residual limits: L2, L3, L4 |
| f13r3-2 edit during staging lost | Resolved | r3 edit-race green and red: the edit is kept. Residual gap: L1 |
| f13r3-3 large-file message (follow-up) | Resolved | The 420 MB case names the file before any change |
| f13r3-4 green kill reverted (follow-up) | Unchanged, as designed | `after-green` kill: the next call restores, and a further apply is needed |

## Attacks on the new mechanisms

Scripts: `.../scratchpad/check13/attack-run.mjs <case>`, `a2.mjs`, `a3.mjs`, `a4.mjs`, `write-race.preload.mjs` (the scratchpad is not durable; each repro is described below).

1. **pid reuse.** First I left an interrupted record (SIGKILL mid-test). Then I set `owner.pid` to a live unrelated `sleep 60`:
   - `started` is the real recorded value (3 s earlier than the sleep's start): `held interrupted`, recovered to a clean tree. Correct.
   - `started: null`: `held in-progress` for as long as the unrelated process lives. When it exits, the next call recovers. Safe, but blocked (L3).
   - `started` equals the sleep's start: `held in-progress`, the same as above. This cannot be told apart by design. `lstart` has 1 s resolution and the tolerance is 1000 ms.
2. **Stuck live run.**
   - Owner stopped with SIGSTOP (Ctrl-Z): preview and a second apply both hold `in-progress`. SIGTERM does nothing while the process is stopped. SIGKILL to the pid works: the next call gives `held interrupted` and a clean tree.
   - Hung test (600 s timer): SIGTERM to the pid that the hold names gives exit 143 and "the listed files were restored and the feature folder moved back". The tree is clean and no orphan test process is left. Without any action, `evidence.mjs` ends the test at its 300 s default timeout, which is red, so the run is undone.
   - So there is a way out. But the `in-progress` message only says "Wait for it to finish". It does not say that the user can stop process N, or that SIGKILL is needed for a stopped process (follow-up F1).
3. **ps unavailable** (`PATH` holds only git, sh and env): the record gets `started: null`. A preview during the live run gives `held in-progress`, and the run archives. A SIGKILLed run is recovered (`kill(pid,0)` gives ESRCH). The fallback is correct. Without ps there is no zombie or pid-reuse check, so the hold is longer, which is the safe side.
4. **Clock skew in `started`.** While the run was live, I moved the record's `started` by +900 ms and by +1500 ms:
   - +900 ms: `held in-progress`, the run archives.
   - +1500 ms: the second call treats the owner as dead, recovers (moves the folder back and restores the tests while the live test runs), and clears the record. The live run then finishes with `held not-archived`, exit 2. No data is lost and nothing false is reported, but a live run is undone.
   - On macOS `lstart` comes from the stored start time and is stable. On Linux, procps computes `lstart` from the boot time, and the boot time moves when the wall clock is stepped (an NTP step, or a clock fix after a VM or WSL resume). So a step of more than 1 s during a run should produce the +1500 ms case. I did not verify this on Linux (no Node image was available locally, and changing a clock needs system privileges). See L2.
5. **Two archives of different features at once** (x and y, 30 ms apart):
   - Both green with no shared test: both are archived.
   - Shared test: one is archived and the other is `held edited-during-archive`. The shared file holds only the winner's rewrite.
   - x red and y green, with or without a shared test: x is restored, y is archived (or held when shared).
   - Staggered by 900 ms, so that y reads the shared test after x rewrote it: with x green, both are archived and the shared test names both archive paths. With x red, x is `held interrupted-unverified` ("tests/shared.test.mjs changed after archive rewrote it") and y is archived. Nothing is lost. But the manual steps then say to `git restore` each rewritten file "if you did not edit it since". For the shared test, that would also revert y's green rewrite, and y's test would then name a folder that is gone (follow-up F2).
6. **A save that lands between the compare and the write.** A preload appends to the file immediately before archive's `writeFileSync` of the after bytes:
   - Green: `archived`, and the save is lost (overwritten).
   - Red: the restore sees archive's after bytes and writes the before bytes, so the save is lost.
   - The gap is measured at about 47 µs per 4 KB file (read, compare, write). A save during the test run (seconds long) is safe: on green it is kept, and on red the run is held `interrupted-unverified` with the save kept. See L1.

## New defect

**N1 (follow-up class, not blocking): a plain `--apply` together with an `--apply --rewrite` of the same feature.**
- Repro: start `archive --apply` (no rewrite), then 0–80 ms later start `archive --apply --rewrite tests/x-a.test.mjs --rewrite tests/x-b.test.mjs`.
- Result in 5 of 5 tries at 0, 40 and 80 ms:
  - The plain run is `archived` (correct).
  - The rewrite run exits 1 with "Archive inputs changed during staging ... The staged feature remains at docs/archive/.x.staging-*; restore it manually". That is wrong: no feature is in that stage, only `archive-recovery.json` and `archive-replay.json`.
  - The rewrite run leaves its pending record and the stray stage.
  - Every later call on x holds `interrupted-unverified` ("... staging exists next to the moved feature folder", "archive-recovery.json changed after archive placed it").
  - The listed steps would move the valid archive back to `docs/features/x` and delete its `archive-recovery.json` and `archive-replay.json`.
- At 120 ms and later, the rewrite run fails with a raw `ENOENT ... lstat docs/features/x` and leaves nothing behind.
- No user data is lost and nothing false is reported, but a valid archive can be undone by following the steps.
- Cause: the plain `--apply` takes no record. Its check (archive.mjs, the `else if (pendingFor(...))` line) only refuses when a record already exists. The staging `catch` also treats "source gone, not moved by this run" as "staged feature remains".
- Fix idea: let a plain `--apply` take the same exclusive record (or an exclusive lock file). In the staging catch, when this run never moved the source, remove only this run's stage and record, and report that another archive finished.

## Follow-ups (not blocking)

- F1: The `in-progress` message should name the way out. Example: "If process N is not running an archive or is stuck, stop it (`kill N`; `kill -9 N` if it is stopped), then archive again."
- F2: For a held state where a shared listed file was rewritten again by another feature's archive, the steps should say to change only this feature's archive path back by hand, not `git restore` the file.
- The receipt `spec-13-r2-probe.mjs` user-edits section crashes against the round-2 safety rule (it expects a restore). It is not a product defect. A later probe run needs an `existsSync` guard.

## Limits the owner acceptance should name

1. **L1, compare-write gap.** A save to a listed file in the about 50 µs between archive's last compare and its write is overwritten, on green and on red. Saves at any other time during the run are kept.
2. **L2, start-time trust.** The live-run check trusts that `ps lstart` for the owner stays within 1 s of the recorded value. If the wall clock is stepped by more than 1 s during a run (on Linux, an NTP step or a VM or WSL resume), a second call can undo the live run. It stays safe: nothing is lost, the live run reports `held not-archived`, and the user archives again. Not verified on Linux.
3. **L3, pid-only identity.** A record with `started: null` (ps missing when the record was written), or an unrelated process that reuses the pid within the same second, holds `in-progress` until that process exits. The record has no host field: a second machine, a container or another pid namespace that shares the worktree treats a live run elsewhere as dead and undoes it (with the same safe outcome as L2).
4. **L4, a stuck owner blocks the feature.** An owner that is alive but stopped or hung holds every archive of that feature until it exits. The way out is to kill the named pid (SIGTERM undoes and exits; a stopped process needs SIGKILL, and then the next call recovers). A hung test ends by itself at the evidence timeout (300 s).
5. **L5, concurrency covers `--rewrite` runs only.** A plain `--apply` together with an `--apply --rewrite` of the same feature can leave a stale record whose steps undo a valid archive (N1). Deleting a live run's record by hand also removes the protection.
6. **L6, a held state needs a human.** Any difference from "exactly as archive left it" holds `interrupted-unverified`, and the user follows the listed steps. This includes another feature's later rewrite of a shared test and a kill after green (f13r3-4). The steps assume a single feature (F2).
7. **L7, size budget.** The listed files must fit in a JSON record of about 345 MB in total. Larger files refuse before any change, and the user edits them by hand after the archive.
