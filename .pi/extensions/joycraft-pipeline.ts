// joycraft-pipeline.ts — Pi extension for Joycraft pipeline advancement.
//
// Provides TWO registration points:
//   1. A /joycraft-next-spec COMMAND (human-typable) that finds the next spec
//      and starts a fresh session seeded with it.
//   2. A joycraft_next_spec TOOL (LLM-callable) that validates, marks the
//      current spec complete, and triggers the command automatically.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

function getScriptsDir(cwd: string) {
  return join(cwd, ".pi", "scripts", "joycraft");
}

function findManifest(cwd: string): string | undefined {
  try {
    const out = execSync(
      "ls docs/features/*/specs/.joycraft-spec-queue.json 2>/dev/null | head -1",
      { cwd, encoding: "utf-8", stdio: "pipe" }
    ).trim();
    return out || undefined;
  } catch {
    return undefined;
  }
}

export default function (pi: ExtensionAPI) {
  // ── COMMAND: full pipeline, human-typable ──────────────────────────────
  pi.registerCommand("joycraft-next-spec", {
    description:
      "Advance the Joycraft pipeline: find next spec and start a fresh session with it.",
    handler: async (_args, ctx) => {
      const scriptsDir = getScriptsDir(ctx.cwd);

      // Find next spec
      let next: string;
      try {
        next = execSync(`"${join(scriptsDir, "joycraft-next-spec")}"`, {
          cwd: ctx.cwd,
          encoding: "utf-8",
          stdio: "pipe",
        }).trim();
      } catch (e: any) {
        ctx.ui.notify(
          `Could not determine next spec: ${e.stderr?.toString() || e.message}`,
          "error"
        );
        return;
      }

      if (!next || next === "Pipeline complete") {
        ctx.ui.notify(
          next === "Pipeline complete"
            ? "🎉 Pipeline complete! All specs in this feature are done."
            : "Could not determine next spec.",
          "info"
        );
        return;
      }

      // Start fresh session with next spec
      await ctx.newSession({
        withSession: async (session) => {
          session.sendUserMessage(`/skill:joycraft-implement ${next}`);
        },
      });
    },
  });

  // ── TOOL: LLM-callable, validates + marks done + triggers command ──────
  pi.registerTool({
    name: "joycraft_next_spec",
    label: "Joycraft Next Spec",
    description:
      "Validate the current implementation, mark the spec complete in the queue, " +
      "and advance to the next spec. Use this at the end of /skill:joycraft-implement. " +
      "You MUST pass the spec_path parameter.",
    promptSnippet: "Advance the Joycraft pipeline after completing a spec. Pass the spec file path.",
    parameters: Type.Object({
      spec_path: Type.String({
        description:
          "Required. Path to the spec file that was just completed (e.g. " +
          "docs/features/2026-05-27-foo/specs/bar.md). Used to mark it complete.",
      }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const scriptsDir = getScriptsDir(ctx.cwd);

      // 1. Validate and stage
      try {
        execSync(`"${join(scriptsDir, "joycraft-session-end")}" pipeline`, {
          cwd: ctx.cwd,
          stdio: "pipe",
        });
      } catch (e: any) {
        return {
          content: [
            {
              type: "text",
              text:
                "Validation failed — fix before advancing.\n" +
                (e.stderr?.toString() || e.stdout?.toString() || e.message),
            },
          ],
          details: { error: e.message },
          isError: true,
        };
      }

      // 2. Mark spec complete
      const manifestPath = findManifest(ctx.cwd);
      if (!manifestPath) {
        return {
          content: [{ type: "text", text: "No .joycraft-spec-queue.json found — cannot mark spec complete." }],
          details: {},
          isError: true,
        };
      }

      try {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
        const fileName = params.spec_path.split("/").pop();
        const entry = manifest.specs?.find(
          (s: any) => s.file === fileName || params.spec_path.endsWith(s.file)
        );
        if (entry?.id) {
          execSync(`"${join(scriptsDir, "joycraft-mark-done")}" ${entry.id}`, {
            cwd: ctx.cwd,
            stdio: "pipe",
          });
        }
      } catch (e: any) {
        return {
          content: [{ type: "text", text: `Mark-done failed: ${e.stderr?.toString() || e.message}` }],
          details: { error: e.message },
          isError: true,
        };
      }

      // 3. Trigger the command to finish the pipeline (newSession + kickoff)
      pi.sendUserMessage("/joycraft-next-spec", { deliverAs: "followUp" });

      return {
        content: [{ type: "text", text: "Validation passed. Advancing to next spec..." }],
        details: {},
      };
    },
  });
}
