// joycraft-pipeline.ts — Pi extension for Joycraft pipeline advancement.
// Registers a /joycraft-next-spec command that validates the current session,
// finds the next spec, and starts a fresh session seeded with it.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("joycraft-next-spec", {
    description:
      "Advance the Joycraft pipeline: validate current session, find next spec, " +
      "and start a fresh session with it.",
    handler: async (_args, ctx) => {
      const { execSync } = await import("node:child_process");
      const { join } = await import("node:path");
      const scriptsDir = join(ctx.cwd, ".pi", "scripts", "joycraft");

      // 1. Session-end: validate and stage
      try {
        execSync(`"${join(scriptsDir, "joycraft-session-end")}" pipeline`, {
          cwd: ctx.cwd,
          stdio: "pipe",
        });
      } catch (e: any) {
        ctx.ui.notify(
          `Validation failed — fix before advancing.\n${e.stderr?.toString() || e.stdout?.toString() || e.message}`,
          "error"
        );
        return;
      }

      // 2. Find next spec
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

      // 3. If no next spec, pipeline complete
      if (!next || next === "Pipeline complete") {
        ctx.ui.notify(
          next === "Pipeline complete"
            ? "🎉 Pipeline complete! All specs in this feature are done."
            : "Could not determine next spec.",
          "info"
        );
        return;
      }

      // 4. Start fresh session with next spec
      await ctx.newSession({
        withSession: async (session) => {
          session.sendUserMessage(`/joycraft-implement ${next}`);
        },
      });
    },
  });
}
