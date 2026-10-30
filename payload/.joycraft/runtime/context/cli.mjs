import { constants } from 'node:fs';
import { lstat, open, readFile, realpath } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { rankContext } from './index.mjs';
import { safeRelativePath } from './search.mjs';

async function saveReport(report, path, root) {
  if (!safeRelativePath(path)) throw new Error('invalid-output-path: use a project-relative new file');
  const project = await realpath(root);
  const parts = path.split('/');
  for (let index = 1; index < parts.length; index += 1) {
    const stat = await lstat(join(project, ...parts.slice(0, index)));
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('invalid-output-path: parents must be plain directories');
  }
  let file;
  try { file = await open(join(project, path), constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600); }
  catch { throw new Error('invalid-output-path: choose a new file in an existing directory'); }
  try { await file.writeFile(`${JSON.stringify(report, null, 2)}\n`); }
  finally { await file.close(); }
  return { schemaVersion: report.schemaVersion, report: path, status: report.status,
    provenance: report.provenance, fallbackReason: report.fallbackReason,
    candidateCount: report.candidateCount, scoredCount: report.scoredCount,
    omittedCount: report.omitted.length, unreadableCount: report.unreadable.length,
    unrankedCount: report.unranked.length };
}

export async function runCli(args, options = {}) {
  let query, paths, keychainService, out, includeArchive = false;
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === '--history') {
      if (includeArchive) throw new Error('invalid-arguments: --history may appear once');
      includeArchive = true;
    } else if (flag === '--paths') {
      if (paths) throw new Error('invalid-arguments: --paths may appear once');
      paths = [];
      while (args[index + 1] && !args[index + 1].startsWith('--')) paths.push(args[++index]);
      if (!paths.length) throw new Error('invalid-arguments: --paths needs project-relative paths');
    } else if (flag === '--query' || flag === '--keychain-service' || flag === '--out') {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error('invalid-arguments: missing option value');
      if (flag === '--query') {
        if (query !== undefined) throw new Error('invalid-arguments: duplicate --query');
        query = value;
      } else if (flag === '--keychain-service') {
        if (keychainService !== undefined) throw new Error('invalid-arguments: duplicate --keychain-service');
        keychainService = value;
      } else {
        if (out !== undefined) throw new Error('invalid-arguments: duplicate --out');
        if (!safeRelativePath(value)) throw new Error('invalid-output-path: use a project-relative new file');
        out = value;
      }
    } else throw new Error('invalid-arguments: use --query <request> [--paths <paths...>] [--history] [--out <new-report.json>] [--keychain-service <service>]');
  }
  // An install without the optional ranker has no ranking config; local search needs none.
  const config = options.config ?? await readFile(new URL('../../hooks-config.json', import.meta.url), 'utf8').then(JSON.parse,
    error => { if (error.code === 'ENOENT') return { schemaVersion: 1, enabled: false, keychainService: 'context-ranking', timeoutMs: 4500 }; throw error; });
  if (config.schemaVersion !== 1 || typeof config.keychainService !== 'string'
    || typeof config.enabled !== 'boolean' || !Number.isSafeInteger(config.timeoutMs) || config.timeoutMs <= 0) throw new Error('invalid-context-config');
  keychainService ??= config.keychainService;
  if (!/^[A-Za-z0-9_.-]{1,128}$/.test(keychainService)) throw new Error('invalid-keychain-service');
  const report = await rankContext({ query, ...(paths ? { paths } : {}), includeArchive }, { ...options,
    enabled: config.enabled, timeoutMs: config.timeoutMs, keychainService });
  return out ? saveReport(report, out, options.root ?? process.cwd()) : report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await runCli(process.argv.slice(2)), null, 2)); }
  catch (error) {
    const safe = /^(invalid-query|invalid-paths|invalid-arguments|invalid-context-config|invalid-keychain-service|invalid-output-path|inventory-unavailable)(:|$)/.test(error.message);
    console.error(safe ? error.message : 'context-command-failed: check the project and installed context runtime');
    process.exitCode = 1;
  }
}
