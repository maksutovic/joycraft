import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { journalPath } from './completion.mjs';
import { workPaths } from './config.mjs';
import { briefDecisionRecords, isObject, localPath, parseJson, readLocal, specStatus, validateQueue } from './identity.mjs';
import { listWorktrees } from './worktrees.mjs';

// The queue is the status authority; spec frontmatter mirrors it. This report
// shows where the mirror or the working folders have drifted, so a session can
// close them before they read as current knowledge.
const queueName = 'specs/.joycraft-spec-queue.json';

function queuePaths(root) {
  const featuresHome = workPaths(root).features;
  const home = path.join(root, featuresHome);
  if (!existsSync(home)) return [];
  return readdirSync(home, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && existsSync(path.join(home, entry.name, queueName)))
    .map(entry => `${featuresHome}/${entry.name}/${queueName}`).sort();
}

const accepted = spec => spec.status === 'done' && (isObject(spec.acceptedReport) || isObject(spec.ownerAcceptance));

function openDecisions(root, folder) {
  const brief = `${folder}/brief.md`;
  if (!existsSync(localPath(root, brief, true))) return [];
  try { return briefDecisionRecords(readLocal(root, brief), brief).filter(record => isObject(record) && record.status === 'open').map(record => record.id); }
  catch { return []; }
}

function worktreeCounts(root) {
  try {
    const { trees } = listWorktrees({ root, sizes: false });
    return {
      owned: trees.filter(tree => tree.owner === 'joycraft' && !tree.missing).length,
      prunable: trees.filter(tree => tree.owner === 'joycraft' && !tree.missing && tree.specStatus === 'done' && tree.clean && tree.merged).length,
      unknown: trees.filter(tree => tree.owner !== 'joycraft').length,
    };
  } catch { return null; }
}

/** Report every queue's specs (in paths.features), drift between queue and frontmatter, and features ready to archive. */
export function projectStatus({ root = process.cwd(), fix = false } = {}) {
  const features = [];
  const drift = [];
  const fixed = [];
  const readyToArchive = [];
  const problems = [];
  for (const queuePath of queuePaths(root)) {
    const folder = path.posix.dirname(path.posix.dirname(queuePath));
    let queue;
    try { queue = parseJson(readLocal(root, queuePath), queuePath); validateQueue(queue, { select: () => false }); }
    catch (error) { problems.push({ queuePath, problem: error.message }); continue; }
    const pendingJournal = existsSync(localPath(root, journalPath(queuePath), true));
    const specs = queue.specs.map(spec => {
      const specPath = path.posix.join(path.posix.dirname(queuePath), spec.file);
      let frontmatter = null;
      let mirror = null;
      try { mirror = specStatus(readLocal(root, specPath)); frontmatter = mirror.status; }
      catch (error) { problems.push({ specPath, problem: error.message }); }
      const row = { id: spec.id, file: specPath, queue: spec.status, frontmatter };
      if (frontmatter !== null && frontmatter !== spec.status) {
        const fixable = accepted(spec) && !pendingJournal;
        const reason = pendingJournal ? `A completion journal is pending; run node .joycraft/runtime/completion.mjs recover --queue ${queuePath}`
          : fixable ? 'The queue records an accepted completion; the frontmatter lags.'
            : 'Only an accepted done spec is repaired automatically; reconcile this one by hand.';
        if (fix && fixable) {
          writeFileSync(localPath(root, specPath), mirror.replace(spec.status));
          fixed.push({ feature: queue.feature, specId: spec.id, file: specPath, from: frontmatter, to: spec.status });
          row.frontmatter = spec.status;
        } else drift.push({ feature: queue.feature, specId: spec.id, file: specPath, queue: spec.status, frontmatter, fixable, reason });
      }
      return row;
    });
    features.push({ feature: queue.feature, queuePath, pendingJournal, specs });
    if (queue.specs.every(spec => spec.status === 'done')) readyToArchive.push({ feature: queue.feature, folder, openDecisions: openDecisions(root, folder) });
  }
  return { features, drift, fixed, readyToArchive, worktrees: worktreeCounts(root), problems };
}

export async function main(argv = process.argv.slice(2)) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--fix') { flags['--fix'] = true; continue; }
    if (argv[index] === '--root') { flags['--root'] = argv[index + 1]; index += 1; continue; }
    throw new Error('Usage: status.mjs [--root <project>] [--fix]');
  }
  const result = projectStatus({ root: path.resolve(flags['--root'] ?? '.'), fix: flags['--fix'] === true });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.drift.length || result.problems.length) process.exitCode = 2;
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`Status stopped: ${error.message}\n`); process.exitCode = 1; });
}
