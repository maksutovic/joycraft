# Test and CI review

## Measured

- Full suite, run once (`CI=1 pnpm exec vitest run --reporter=json`): 233 passed, 6 skipped, 28 files, **11.6 s wall**, 66 s of file time across workers. The suite is fast, so I recommend no test selection and no result cache.
- The slowest files are `release-consumer-process` (9.8 s, 15%, 3 tests), `package-acceptance` (9.4 s, 14%: packs the real repo), `v1-install` (7.2 s), `payload-guard` (6.9 s), `publication-workflow` (6.1 s, 2 tests) and `runtime-delivery-lock` (5.3 s). Each spends its time on real processes (`pnpm pack`, git, child node). That is real coverage, not waste.
- No sleeps, retries or network: every `sleep` is an injected fake clock, and `release-verification` uses `registry.invalid`.
- Skips: `upgrade-from-published` (it needs a tarball; CI runs it separately), the two `ste-lint` paths (python3 or not), and four `payload-guard` `runIf(hasRevision(...))` tests.

**CI, one PR push:** `test.yml` runs `pnpm test` once, the upgrade test, main's holdout gates, and the 7-cell compatibility matrix. That is correct.

**CI, one merge to main:** the full suite runs **3 times** and the 7-cell matrix **twice**:
1. `test.yml` on `push: main`: `pnpm test` plus the matrix.
2. `publish.yml` job `pack`: `pnpm test` (line 93).
3. `publish.yml` job `compatibility`: it calls `test.yml` again (line 153), so `pnpm test` and the matrix run again.

`AGENTS.md` names the three tiers (focused test, project gate, full suite): there is no finding there.

## Findings

| # | Finding | Claim it protects | Evidence | Fix |
|---|---|---|---|---|
| T1 | The suite and matrix run twice more on every merge | Main stays green before publishing | Runs 1 and 3 above are the same workflow on the same commit | Remove `push: main` from `test.yml`. `publish.yml` already calls it on that push, so the suite still runs on main and in publish, as decided on 2026-11-21. Merge CI drops from 3 suite runs to 2 and from 2 matrices to 1 |
| T2 | Four field-history tests run only with full Git history | Old field builds had the recorded word counts | `payload-guard.test.ts:193, 340, 350, 368` use `runIf(hasRevision(...))`. The test job checks out shallow, so they skip in CI. They check finished prototype builds, and the prototype is retired | Delete the four. The live "ships no more words than field-24" test keeps the cap |
| T3 | Five stacked word caps where one is enough | Shipped words do not grow | field-18 30,434 > field-20 30,033 > field-21 29,941 > field-22 29,922 > field-23 ≥ field-24; today 29,919. The field-24 cap implies every older one | Keep the field-24 cap. Delete the caps for field-21, 22 and 23 and "shorter than field-18" |
| T4 | A change detector on a finished release | 1.5.0's changelog text and two decision-log rows | `public-docs.test.ts:99` asserts exact phrases in the 1.5.0 entry, reads `docs/features/2026-11-15-runtime-owned-steps/brief.md`, and matches decision-log row text that no code reads. It breaks when that feature is archived | Delete it. `[AC:release-fields]` for the current version stays in lines 79 and 86 |
| T5 | README prose assertions | The gates section has its prompts and limits | `readme.test.ts:34, 55` match sentences such as `fourth review is refused`. The shared-prompts test at line 86 already guards the prompts users paste | Keep the prompt checks; drop the sentence matches. Optional |
| T6 | A red PR can merge | Nothing blocks a merge | Branch protection requires no status checks, by your 2026-11-21 decision, and a merge publishes | No change: you decided this. Listed because the review must name it |

Before any deletion, the live coverage is already in place: T2 and T3 by the field-24 cap, T4 by the current-version `release-fields` tests. Each deletion would be its own commit with no code change, and I would run the full suite before and after.
