import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkGlob, globToRegExp } from './config.mjs';
import { parseJson, readLocal, relativePath, requireValue, validateQueue } from './identity.mjs';

// Tests name the acceptance criterion they check with [AC:<criterion-id>]. The
// trace shows which criteria have a test and which do not. It reports; the
// reviewer decides what a gap means (it never blocks completion by itself).
const tag = /\[AC:([A-Za-z0-9_.-]+)\]/g;

function filesMatching(root, glob) {
  const pattern = globToRegExp(checkGlob(glob, '--tests'));
  const out = [];
  const walk = relative => {
    let entries;
    try { entries = readdirSync(path.join(root, relative || '.'), { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.joycraft') continue;
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile() && pattern.test(child)) out.push(child);
    }
  };
  walk('');
  return out;
}

/** Map each criterion of one spec to the test lines tagged with its ID. */
export function traceSpec({ root = process.cwd(), queuePath, specId, tests = [] }) {
  queuePath = relativePath(queuePath);
  const queue = parseJson(readLocal(root, queuePath), queuePath);
  validateQueue(queue, { select: spec => spec.id === specId });
  const spec = queue.specs.find(item => item.id === specId);
  requireValue(spec, `Spec ${specId} does not exist in queue`);
  const criteria = (spec.verification.criteria ?? []).map(item => item.id);
  const declared = spec.verification.inputs.filter(input => input.kind === 'check' && input.state !== 'absent').map(input => relativePath(input.path));
  // A declared check folder stands for every file inside it.
  const expanded = declared.flatMap(file => existsSync(path.join(root, file)) && statSync(path.join(root, file)).isDirectory() ? filesMatching(root, `${file}/**`) : [file]);
  const files = [...new Set([...expanded, ...tests.flatMap(glob => filesMatching(root, glob))])].sort();
  const untraceableIds = criteria.filter(id => !/^[A-Za-z0-9_.-]+$/.test(id));
  const traced = Object.fromEntries(criteria.map(id => [id, []]));
  const unknownTags = [];
  const missingFiles = [];
  for (const file of files) {
    const full = path.join(root, file);
    if (!existsSync(full)) { missingFiles.push(file); continue; }
    const lines = readFileSync(full, 'utf8').split('\n');
    for (const [index, line] of lines.entries()) {
      for (const match of line.matchAll(tag)) {
        if (Object.hasOwn(traced, match[1])) traced[match[1]].push({ file, line: index + 1 });
        else unknownTags.push({ id: match[1], file, line: index + 1 });
      }
    }
  }
  const untraced = criteria.filter(id => traced[id].length === 0);
  return {
    queuePath, specId, files, criteria: criteria.map(id => ({ id, tests: traced[id] })), untraced, unknownTags, missingFiles,
    ...(untraceableIds.length ? { untraceableIds, untraceableNote: 'These criterion IDs contain characters an [AC:<id>] tag cannot hold; use letters, digits, ., _ and -.' } : {}),
    ...(files.length === 0 ? { note: 'No check inputs are declared and no --tests glob was given.' } : {}),
  };
}

export async function main(argv = process.argv.slice(2)) {
  const flags = { '--tests': [] };
  for (let index = 0; index < argv.length; index += 2) {
    requireValue(['--root', '--queue', '--spec', '--tests'].includes(argv[index]) && argv[index + 1], 'Usage: trace.mjs --queue <queue> --spec <id> [--tests <glob>]... [--root <project>]');
    if (argv[index] === '--tests') flags['--tests'].push(argv[index + 1]); else flags[argv[index]] = argv[index + 1];
  }
  requireValue(/^(?:0|[1-9]\d*)$/.test(flags['--spec'] ?? ''), 'Spec ID must be a nonnegative integer');
  const result = traceSpec({ root: path.resolve(flags['--root'] ?? '.'), queuePath: flags['--queue'], specId: Number(flags['--spec']), tests: flags['--tests'] });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.untraced.length) process.exitCode = 2;
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`Trace stopped: ${error.message}\n`); process.exitCode = 1; });
}
