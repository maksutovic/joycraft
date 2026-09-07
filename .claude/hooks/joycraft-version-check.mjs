// Joycraft update discovery adapter — runs on Claude Code session start
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { appendFileSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

async function readHookEvent() {
  if (process.stdin.isTTY) return {};
  return new Promise((resolve) => {
    let raw = '';
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      process.stdin.off('data', onData);
      process.stdin.off('end', finish);
      process.stdin.off('error', finish);
      process.stdin.pause();
      try {
        const parsed = JSON.parse(raw);
        resolve(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {});
      } catch {
        resolve({});
      }
    };
    const onData = (chunk) => {
      raw += chunk;
      // Claude sends one compact JSON event. Parsing immediately avoids
      // waiting on a pipe that a host may keep open for the hook lifetime.
      try { JSON.parse(raw); finish(); } catch { /* wait for more bytes */ }
    };
    const timer = setTimeout(finish, 250);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', onData);
    process.stdin.on('end', finish);
    process.stdin.on('error', finish);
    process.stdin.resume();
  });
}

try {
  const event = await readHookEvent();
  const eventSession = typeof event.session_id === 'string' ? event.session_id : undefined;
  const session = eventSession
    ?? process.env.JOYCRAFT_SESSION_ID
    ?? `parent-${process.ppid}`;
  // Claude documents this append-only environment handoff for SessionStart:
  // https://code.claude.com/docs/en/hooks#persist-environment-variables
  if (process.env.CLAUDE_ENV_FILE) {
    const assignment = "export JOYCRAFT_SESSION_ID='" + session.replaceAll("'", "'\"'\"'") + "'\n";
    try { appendFileSync(process.env.CLAUDE_ENV_FILE, assignment, { mode: 0o600 }); } catch { /* continue without environment persistence */ }
  }
  const checker = await import(pathToFileURL(join(root, 'docs', '.joycraft', 'check.mjs')).href);
  const result = await checker.checkForUpdate(root, { sessionId: session });
  if (result?.display && result.availableVersion) {
    console.log(`Joycraft ${result.availableVersion} available (you have ${result.installedVersion ?? 'unknown'}). Finish the active skill, then run the update and restart or reinvoke the skill.`);
    checker.acknowledgeUpdate(root, { release: result.availableVersion, session });
  }
} catch {
  // Discovery must never block Claude's requested work.
}
