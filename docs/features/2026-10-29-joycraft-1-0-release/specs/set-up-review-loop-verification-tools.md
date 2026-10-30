---
status: todo
owner: Maximilian Maksutovic
created: 2026-10-29
feature: 2026-10-29-joycraft-1-0-release
mode: checkpoint
local_id: 21
phase: 2
execution_model: claude-opus-5-5
reasoning_effort: high
---

# Set Up the Review Loop Verification Tools — Atomic Spec

> **Parent Brief:** `docs/features/2026-10-29-joycraft-1-0-release/brief.md`
> **Status:** Ready
> **Date:** 2026-10-29
> **Estimated scope:** Medium; setup reference, entry skill, detection helper, tests
> **Phase:** 2 — Host support
> **Where:** `joycraft-prototype` `field/1.0`

## What

During install, upgrade and first entry, detect what kind of project this is and tell the user which tools the review loop needs to verify work. Today setup only inspects the host for UI and testing capabilities. It never tells the user what to install, so UI acceptance quietly stays unverified. Add a detection helper and a setup step that produce a short **Review loop plan** and ask the user before installing anything:

| Project signal | Review-loop tools |
|---|---|
| Web app (`next`, `vite`, `react`, `vue`, `svelte`, `astro` and so on in `package.json`, or a dev-server script) | Playwright (project dev dependency + `npx playwright install chromium`), or the host's built-in browser where it exists (for example the Claude desktop browser pane) |
| iOS / macOS app (`*.xcodeproj`, `*.xcworkspace`, `Package.swift` with iOS platforms) | Xcode with `xcodebuild`, an iOS Simulator runtime (`xcrun simctl`), the host's simulator tool where it exists |
| Android (`build.gradle*` with `com.android.*`) | Android SDK, an emulator image, `adb` |
| Flutter / React Native / Expo | The matching mobile tools above, plus the framework CLI |
| Electron / desktop | Playwright for Electron, or screenshots through the host's computer-use tool |
| API / backend | The project's test runner, plus an HTTP check (`curl` or the runner's client) |
| CLI / library | The project's test runner only; no UI tools |

The plan lists, for each tool, whether it is present (with version), missing, or not needed. For each missing tool it gives the install command, its approximate size, and whether it needs `sudo`, a password or a GUI step that the user must do.

## Why

Max, 2026-10-29: setting up the review loop is Joycraft's responsibility. A user must be told, at install time, what the review loop will use and what will be installed for it. The existing rule (relevant acceptance needs an inspected rendered UI and an independent review) cannot be met if nobody sets up the tools.

## Acceptance Criteria

- [ ] **AC1:** A detection helper (`runtime/review-tools.mjs`) classifies the fixture projects (Next.js, Vite, iOS, Android, Flutter, Expo, Electron, Express API, Python CLI, Rust library, a monorepo with a web app and an API) into the categories above. A monorepo reports each package.
- [ ] **AC2:** For each needed tool it reports `present` (with version), `missing` or `not-needed`, using read-only probes (`--version`, `xcrun simctl list runtimes`, `adb version`, Playwright cache check). The probes never install or download.
- [ ] **AC3:** The entry and setup flow shows the Review loop plan before any install and asks one combined question: install the missing project-local tools, skip, or choose per tool. Nothing is installed without a yes.
- [ ] **AC4:** Project-local installs (for example `pnpm add -D @playwright/test` and its browser download) run only after a yes and use the project's own package manager and lockfile. System-level installs (Xcode, Android SDK, simulator runtimes) are never run by the agent; it prints the steps for the user.
- [ ] **AC5:** The chosen setup is recorded in `AGENTS.md` under a `Review loop` section (the tool, the command that starts the app, the command that takes the evidence), and the reviewer and the UI-check steps read it from there.
- [ ] **AC6:** If the user skips a tool, the affected specs keep the existing rule: UI claims stay `unverified` in the review report, and the setup says so in one line.
- [ ] **AC7:** An upgrade (1.0 → 1.0.x or a 0.7 migration) re-runs detection, shows only changes from the recorded `Review loop` section, and does not ask again when nothing changed.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1 | Table test over the fixture projects → expected categories. | Unit |
| AC2 | Stub the probe commands (present, missing, wrong version); assert the statuses and that no install command runs. | Unit |
| AC3 | Simulated entry with a missing Playwright: assert the plan text and a single question before any write. | Integration |
| AC4 | With a yes, the Playwright install uses the detected package manager; with a no, nothing changes (tree hash). An iOS fixture with no simulator runtime prints the user steps and runs nothing. | Integration |
| AC5 | Assert the `Review loop` section content, and that the reviewer packet includes it. | Integration |
| AC6 | Skip Playwright on a web fixture; a UI spec's review report marks the UI claim `unverified`. | Integration |
| AC7 | Re-run on an unchanged fixture → no question; add an Android module → a plan for that change only. | Integration |

**Execution order:** Write the tests first, confirm that they fail for the missing behavior, then implement until green. Live tests run last and record their evidence.

## Constraints

- MUST NOT install anything, globally or locally, without the user's yes in this conversation.
- MUST NOT run `sudo`, accept licenses (for example Xcode or the Android SDK) or sign in on the user's behalf.
- MUST NOT add a dependency to Joycraft itself; the tools are added to the user's project only.
- MUST work on all six hosts; host-only tools (a built-in browser, a simulator tool) are offered only when that host reports them.
- Keep the plan short and decision-first: one table and one question.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Add | `.joycraft-prototype/runtime/review-tools.mjs` | Detection + probes |
| Modify | `.joycraft-prototype/references/setup.md` | Review-loop setup step |
| Modify | `.agents/skills/joycraft-entry/SKILL.md` | Run the step on first entry and on upgrade |
| Modify | `.agents/skills/joycraft-testing/SKILL.md, joycraft-verify/SKILL.md` | Read the `Review loop` section |
| Add | `fixtures/review-tools/` | Project fixtures |
| Add | `tests/review-tools.test.mjs` | AC1–AC7 |

## Approach

Detect from manifests and project files only; never run the project. Keep the category table in one data file so the docs (spec 19) and the README (spec 18) can render the same list.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Project already has Playwright or Cypress | Report it as present and use it; do not add a second tool. |
| No network | Probes still work; the install is offered later and the plan says so. |
| CI-only project (no local UI) | Record the CI job as the evidence source when the user picks it. |
