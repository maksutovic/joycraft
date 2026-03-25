/**
 * Example Scenario Test
 *
 * This file is a template for scenario tests in your holdout repository.
 * Scenarios are behavioral, end-to-end tests that run against the BUILT
 * artifact of your main project — not its source code.
 *
 * The Holdout Pattern
 * -------------------
 * These tests live in a SEPARATE repository that your coding agent cannot
 * see. This is intentional: if the agent could read these tests, it could
 * write code that passes them without actually solving the problem correctly
 * (the same way a student who sees the exam beforehand can score well without
 * understanding the material).
 *
 * In CI, the main repo is cloned to ../main-repo (relative to this repo's
 * checkout). The run.yml workflow builds the artifact there before running
 * these tests, so `../main-repo` is always available and already built.
 *
 * How to Write Scenarios
 * ----------------------
 * DO:
 *   - Invoke the built binary / entry point via child_process (execSync, spawnSync)
 *   - Test observable behavior: exit codes, stdout/stderr content, file system state
 *   - Write scenarios around things a real user would actually do
 *   - Keep each test fully independent — no shared state between tests
 *
 * DON'T:
 *   - Import from ../main-repo/src — that defeats the holdout
 *   - Test internal implementation details (function names, module structure)
 *   - Rely on network access unless your tool genuinely requires it
 *   - Share mutable fixtures across tests
 */

import { execSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Path to the built CLI entry point in the main repo.
// The run.yml workflow clones the main repo to ../main-repo and builds it
// before this test file runs, so this path is always valid in CI.
const CLI = join(__dirname, "..", "main-repo", "dist", "cli.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Run the CLI and return { stdout, stderr, status }. Never throws. */
function runCLI(args: string[], cwd?: string) {
  const result = spawnSync("node", [CLI, ...args], {
    encoding: "utf8",
    cwd: cwd ?? process.cwd(),
    env: { ...process.env, NO_COLOR: "1" },
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status ?? 1,
  };
}

// ---------------------------------------------------------------------------
// Basic invocation scenarios
// ---------------------------------------------------------------------------

describe("CLI: basic invocation", () => {
  it("--help prints usage information", () => {
    const { stdout, status } = runCLI(["--help"]);
    expect(status).toBe(0);
    expect(stdout).toContain("Usage:");
  });

  it("--version returns a semver string", () => {
    const { stdout, status } = runCLI(["--version"]);
    expect(status).toBe(0);
    // Matches x.y.z, x.y.z-alpha.1, etc.
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("unknown command exits non-zero", () => {
    const { status } = runCLI(["not-a-real-command"]);
    expect(status).not.toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Example: filesystem interaction scenario
//
// This pattern is useful when your CLI creates or modifies files.
// Each test gets a fresh temp directory so they can't interfere.
// ---------------------------------------------------------------------------

describe("CLI: init command (example — replace with your real scenarios)", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "scenarios-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("init creates expected output in an empty directory", () => {
    // This is a placeholder. Replace with whatever your CLI actually does.
    // The point is: invoke the binary, observe side effects, assert on them.
    const { status } = runCLI(["init", tmpDir]);

    // Example assertions — adjust to your tool's actual behavior:
    // expect(status).toBe(0);
    // expect(existsSync(join(tmpDir, "CLAUDE.md"))).toBe(true);

    // Remove this line once you've written a real assertion above:
    expect(typeof status).toBe("number"); // placeholder
  });
});
