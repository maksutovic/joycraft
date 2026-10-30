import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepareDispatch } from './dispatch-preflight.mjs';
import { localPath, readQueue, relativePath, requireValue, validateNativeActor } from './identity.mjs';

// The native hook runtime is optional; without it, startup takes the manual path.
async function hookRuntime() {
  try { return { ...await import('./hooks/context.mjs'), ...await import('./hooks/cli.mjs') }; }
  catch (error) { if (error?.code === 'ERR_MODULE_NOT_FOUND') return null; throw error; }
}

/** Start in the actual worker after the host has supplied its identity.
 * Adapters supply native event fields; CLI users relay observed host identity.
 * Neither interface authenticates a human or invents missing prompt history. */
export async function startDispatch(options, nativeEvent) {
  const root = realpathSync(options.workerRoot);
  requireValue(nativeEvent && typeof nativeEvent.cwd === 'string' && path.isAbsolute(nativeEvent.cwd)
    && realpathSync(nativeEvent.cwd) === root, 'Task startup needs the actual native worker cwd');
  validateNativeActor({ host: options.nativeHost ?? 'claude', sessionId: nativeEvent.session_id,
    ...(nativeEvent.agent_id === undefined ? {} : { agentId: nativeEvent.agent_id }) }, 'Current native worker');
  const outPath = relativePath(options.outPath);
  const output = localPath(root, outPath, true);
  requireValue(!existsSync(output), `Packet output already exists: ${outPath}; use a fresh packet path`);
  // Startup owns the packet directory: it creates a missing one under .joycraft/local/ and checks it is
  // git-ignored, so the worker never chains its own mkdir or git check with startup (a worktree-isolated
  // host refuses git inside a compound command).
  const parentPath = path.posix.dirname(outPath);
  if (!existsSync(path.dirname(output))) {
    requireValue(parentPath === '.joycraft/local' || parentPath.startsWith('.joycraft/local/'),
      `Packet output parent does not exist: ${parentPath}; use a .joycraft/local/ path, which startup creates`);
    mkdirSync(path.dirname(output), { recursive: true, mode: 0o700 });
    // Self-ignoring, like the hook state directory, so a project without a root ignore rule still passes.
    writeFileSync(path.join(path.dirname(output), '.gitignore'), '*\n', { flag: 'wx', mode: 0o600 });
  }
  const parent = realpathSync(path.dirname(output));
  const rel = path.relative(root, parent);
  requireValue(rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel), 'Packet output parent must stay inside the worker root');
  requireValue(gitIgnored(root, outPath), `Packet output must be git-ignored so it never becomes a scope path: ${outPath}; use .joycraft/local/packets/`);
  readQueue({ root, queuePath: options.queuePath, specId: options.specId });
  requireValue(options.role === 'implementer' || options.role === 'reviewer', 'Task startup role must be implementer or reviewer');
  // Change scope is opt-in per spec: startup never writes it, and a reviewer
  // without one reviews against the verification inputs alone.
  const packet = prepareDispatch({ ...options, outPath: output });
  const runtime = await hookRuntime();
  const config = runtime ? await runtime.readConfig(root) : { enabled: false };
  const hooks = config.enabled
    ? { enabled: true, ...await runtime.bindPreparedSource({ event: nativeEvent, packetPath: outPath }) }
    : { enabled: false, eligible: false, reason: runtime ? 'hooks-disabled' : 'hooks-not-installed' };
  return { schemaVersion: 1, packetPath: outPath, packet, hooks,
    ready: !config.enabled || hooks.eligible === true };
}

function gitIgnored(root, relative) {
  try {
    execFileSync('git', ['check-ignore', '-q', '--', relative], { cwd: root, stdio: 'ignore' });
    return true;
  } catch (error) {
    if (error.status === 1) return false;
    throw new Error(`Could not check whether ${relative} is git-ignored`);
  }
}

export async function main(argv = process.argv.slice(2)) {
  const flags = {};
  const allowed = new Set(['--worker-root', '--expected-manifest', '--queue', '--spec', '--role', '--implementer-session',
    '--implementer-host', '--implementer-agent', '--out', '--brief', '--capabilities', '--coordinator', '--parallel',
    '--access', '--base-revision', '--native-session', '--native-agent', '--native-host']);
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]; const value = argv[index + 1];
    requireValue(allowed.has(key) && typeof value === 'string' && value && !value.startsWith('--') && flags[key] === undefined,
      `Invalid startup argument: ${key}; use named flags with literal values`);
    flags[key] = value;
  }
  for (const key of ['--worker-root', '--expected-manifest', '--queue', '--spec', '--role', '--implementer-session', '--out', '--capabilities', '--native-session']) {
    requireValue(flags[key], `Task startup requires ${key}; native identities must come from the active host`);
  }
  requireValue(/^(?:0|[1-9]\d*)$/.test(flags['--spec']), 'Spec ID must be a nonnegative integer');
  requireValue(flags['--parallel'] === undefined || ['true', 'false'].includes(flags['--parallel']), '--parallel must be true or false');
  requireValue(!flags['--implementer-agent'] || flags['--implementer-host'], 'A native implementer agent ID needs its host');
  const result = await startDispatch({ workerRoot: flags['--worker-root'], expectedManifestPath: flags['--expected-manifest'],
    queuePath: flags['--queue'], specId: Number(flags['--spec']), role: flags['--role'], implementerSessionId: flags['--implementer-session'],
    implementerActor: flags['--implementer-host'] ? { host: flags['--implementer-host'], sessionId: flags['--implementer-session'],
      ...(flags['--implementer-agent'] ? { agentId: flags['--implementer-agent'] } : {}) } : undefined,
    outPath: flags['--out'], briefPath: flags['--brief'], availableCapabilities: flags['--capabilities'].split(',').filter(Boolean),
    coordinatorRoot: flags['--coordinator'], parallel: flags['--parallel'] === undefined ? undefined : flags['--parallel'] === 'true',
    access: flags['--access'], baseRevision: flags['--base-revision'], nativeHost: flags['--native-host'],
  }, { cwd: flags['--worker-root'], session_id: flags['--native-session'], ...(flags['--native-agent'] ? { agent_id: flags['--native-agent'] } : {}) });
  const { packet, ...status } = result;
  process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
  if (!result.ready) process.exitCode = 2;
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`Task startup stopped: ${error.message}\n`); process.exitCode = 1; });
}
