// Hook commands run from whatever directory the agent is in: a worktree, a
// subdirectory or the project root. A relative script path then exits 127.
// Claude Code exports the project root as CLAUDE_PROJECT_DIR; quote it so a
// path with spaces stays one word.
export const claudeProjectDir = '"$CLAUDE_PROJECT_DIR"';

// The stable 0.7 safeguard registered its scripts by bare relative path.
const relativeJoycraftHook = /^(?:(bash|sh|node)\s+)?(?:\.\/)?(\.claude\/hooks\/joycraft\/[\w.-]+)$/;

/** The command that runs a project script from the Claude project root. */
export function claudeHookCommand(path, interpreter = null) {
  return `${interpreter ? `${interpreter} ` : ''}${claudeProjectDir}/${path}`;
}

/** Rewrite relative Joycraft hook commands in Claude settings. Every other
 * entry, including user hooks, keeps its exact value. */
export function resolveRelativeJoycraftHooks(settings) {
  const rewritten = [];
  const hooks = settings?.hooks;
  if (!hooks || typeof hooks !== 'object' || Array.isArray(hooks)) return { settings, rewritten };
  const next = {};
  for (const [event, groups] of Object.entries(hooks)) {
    next[event] = !Array.isArray(groups) ? groups : groups.map(group => {
      if (!Array.isArray(group?.hooks)) return group;
      return { ...group, hooks: group.hooks.map(hook => {
        const match = hook?.type === 'command' && typeof hook.command === 'string' ? relativeJoycraftHook.exec(hook.command.trim()) : null;
        if (!match) return hook;
        const command = claudeHookCommand(match[2], match[1] ?? null);
        rewritten.push({ event, from: hook.command, to: command });
        return { ...hook, command };
      }) };
    });
  }
  return { settings: rewritten.length ? { ...settings, hooks: next } : settings, rewritten };
}
