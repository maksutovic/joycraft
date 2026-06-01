// joycraft-pipeline.ts — Pi extension for Joycraft pipeline advancement.
//
// Provides a single registration point:
//   - A /joycraft-next-spec COMMAND (human-typable) that finds the next spec
//     and starts a fresh session seeded with it.
//
// The former joycraft_next_spec TOOL (LLM-callable, in-process advance) was
// retired: the autonomous loop is the `joycraft-implement-loop` script, which
// gets context isolation from the OS process boundary (one fresh `pi -p` per
// spec) — the in-process path could not isolate context. Interactive Pi still
// uses the COMMAND below.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { execSync } from "node:child_process";
import { join } from "node:path";

function getScriptsDir(cwd: string) {
  return join(cwd, ".pi", "scripts", "joycraft");
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
}
