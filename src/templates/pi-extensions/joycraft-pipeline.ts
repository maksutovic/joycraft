// joycraft-pipeline.ts — Pi extension for Joycraft autonomous pipeline
// Registers the joycraft_next_spec tool that orchestrates spec-to-spec handoff.

import { Type } from '@sinclair/typebox';
import type { PiExtension, ToolContext } from 'pi-extension-sdk';

const JoycraftNextSpecSchema = Type.Object({
  specId: Type.Number({ description: 'The id of the spec that just completed' }),
});

export default {
  name: 'joycraft-pipeline',
  tools: [
    {
      name: 'joycraft_next_spec',
      description:
        'Mark current spec complete, end session, find next spec, and kick off a new session for it.',
      parameters: JoycraftNextSpecSchema,
      async execute(args: { specId: number }, ctx: ToolContext) {
        const { execSync } = await import('node:child_process');
        const { join } = await import('node:path');

        const scriptsDir = join(ctx.projectDir, '.pi', 'scripts', 'joycraft');

        // 1. Mark current spec as done
        try {
          execSync(`${join(scriptsDir, 'joycraft-mark-done')} ${args.specId}`, {
            cwd: ctx.projectDir,
            stdio: 'pipe',
          });
        } catch (e: any) {
          await ctx.sendUserMessage(
            `Failed to mark spec #${args.specId} complete: ${e.message}`,
          );
          return { success: false, error: e.message };
        }

        // 2. End current session (validate + stage)
        try {
          execSync(`${join(scriptsDir, 'joycraft-session-end')} spec-${args.specId}`, {
            cwd: ctx.projectDir,
            stdio: 'pipe',
          });
        } catch (e: any) {
          await ctx.sendUserMessage(
            `Session-end validation failed: ${e.message}. Fix errors before continuing.`,
          );
          return { success: false, error: e.message };
        }

        // 3. Find next spec
        let nextSpec: string;
        try {
          nextSpec = execSync(`${join(scriptsDir, 'joycraft-next-spec')}`, {
            cwd: ctx.projectDir,
            encoding: 'utf-8',
            stdio: 'pipe',
          }).trim();
        } catch (e: any) {
          await ctx.sendUserMessage(
            `Failed to find next spec: ${e.message}`,
          );
          return { success: false, error: e.message };
        }

        // 4. If no next spec, pipeline complete
        if (!nextSpec || nextSpec === 'Pipeline complete') {
          await ctx.sendUserMessage(
            '🎉 Pipeline complete! All specs in this feature are done.',
          );
          return { success: true, complete: true };
        }

        // 5. Kick off new session with next spec
        const kickoffMessage = `/skill:joycraft-implement ${nextSpec}`;
        ctx.newSession(kickoffMessage);

        return { success: true, nextSpec };
      },
    },
  ],
} satisfies PiExtension;
