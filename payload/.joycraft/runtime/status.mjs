import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { journalPath, validateOwnerAcceptance, visibleReports } from './completion.mjs';
import { workPaths } from './config.mjs';
import { readFooter } from './evidence.mjs';
import { reviewRoundKey } from './dispatch-start.mjs';
import { briefDecisionRecords, isObject, localPath, nonempty, parseJson, readLocal, sha256, snapshot, specStatus, validateQueue } from './identity.mjs';
import { decide, listWorktrees } from './worktrees.mjs';

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

/** Briefs under the features folder with no queue: small jobs not yet closed. Report only; they never change the exit code. */
function openBriefs(root) {
  const featuresHome = workPaths(root).features;
  const home = path.join(root, featuresHome);
  if (!existsSync(home)) return [];
  return readdirSync(home, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && existsSync(path.join(home, entry.name, 'brief.md')) && !existsSync(path.join(home, entry.name, queueName)))
    .map(entry => ({ folder: `${featuresHome}/${entry.name}`, brief: `${featuresHome}/${entry.name}/brief.md` }))
    .sort((left, right) => left.folder.localeCompare(right.folder));
}

// A legacy acceptance has no review behind it, so its decision file must still hold the owner's words.
function legacyIntact(root, queuePath, spec) {
  try {
    const bytes = readLocal(root, spec.ownerAcceptance.path);
    if (sha256(bytes) !== spec.ownerAcceptance.sha256) return false;
    validateOwnerAcceptance({ decision: parseJson(bytes, spec.ownerAcceptance.path), decisionPath: spec.ownerAcceptance.path, state: { spec, queuePath }, legacy: true });
    return true;
  } catch { return false; }
}

export const accepted = spec => spec.status === 'done' && (isObject(spec.acceptedReport) || isObject(spec.ownerAcceptance) || isObject(spec.waiver));

function openDecisions(root, folder) {
  const brief = `${folder}/brief.md`;
  if (!existsSync(localPath(root, brief, true))) return [];
  try { return briefDecisionRecords(readLocal(root, brief), brief).filter(record => isObject(record) && record.status === 'open').map(record => record.id); }
  catch { return []; }
}

const findingsOf = (report, cls) => (Array.isArray(report?.findings) ? report.findings : []).filter(finding => isObject(finding) && finding.class === cls);

function question(feature, spec, finding, report) {
  const optional = ['criterion', 'at', ...(finding.class === 'follow-up' ? ['assumption'] : [])].filter(key => nonempty(finding[key]));
  return { feature, specId: spec.id, class: finding.class, id: finding.id, summary: finding.summary, ...Object.fromEntries(optional.map(key => [key, finding[key]])), report };
}

/** The follow-ups of a done spec's accepted report, from the queue's acceptedReport receipt. */
function followUps(root, feature, spec, unread) {
  const receipt = spec.acceptedReport;
  try {
    const bytes = readLocal(root, receipt.path);
    if (sha256(bytes) !== receipt.sha256) throw new Error('changed');
    return findingsOf(parseJson(bytes, receipt.path), 'follow-up').map(finding => question(feature, spec, finding, receipt.path));
  } catch {
    unread.push({ feature, specId: spec.id, path: receipt.path, reason: 'The accepted report is missing or changed here, so its follow-ups cannot be listed.' });
    return [];
  }
}

/** The decision-needed findings of an in-review spec's current report: the latest
 * visible report whose reviewed inputs (reviewRoundKey) match the current ones. */
function heldDecisions(root, feature, queuePath, spec) {
  const reports = visibleReports({ root, queuePath, specId: spec.id });
  if (!reports.some(item => findingsOf(item.report, 'decision-needed').length)) return [];
  let current;
  try {
    const receipts = reports.flatMap(item => (item.report.flows ?? []).flatMap(flow => (flow?.observations ?? []).flatMap(observation => (observation?.receipts ?? []).map(receipt => receipt?.path))));
    current = reviewRoundKey(snapshot({ root, queuePath, specId: spec.id, artifactPaths: [journalPath(queuePath), ...reports.map(item => item.path), ...receipts.filter(nonempty)] }));
  } catch { return []; }
  const time = item => Date.parse(item.report.createdAt) || 0;
  const latest = reports.filter(item => reviewRoundKey(item.report.subject) === current).sort((left, right) => time(left) - time(right)).at(-1);
  return latest ? findingsOf(latest.report, 'decision-needed').map(finding => question(feature, spec, finding, latest.path)) : [];
}

function worktreeCounts(root) {
  try {
    const { trees } = listWorktrees({ root, sizes: false });
    return {
      owned: trees.filter(tree => tree.owner === 'joycraft' && !tree.missing).length,
      prunable: trees.filter(tree => decide(tree).action === 'remove').length,
      unknown: trees.filter(tree => tree.owner !== 'joycraft').length,
    };
  } catch { return null; }
}

/** The `.log` receipts in a feature folder and the receipts its reports cite, each counted once. */
function receiptPaths(root, folder, queuePath, specs) {
  const paths = new Set();
  const home = path.join(root, folder);
  if (existsSync(home)) {
    for (const name of readdirSync(home, { recursive: true })) if (String(name).endsWith('.log')) paths.add(path.posix.join(folder, String(name).split(path.sep).join('/')));
  }
  for (const spec of specs) {
    let reports = [];
    try { reports = visibleReports({ root, queuePath, specId: spec.id }); } catch { /* unreadable reports cite nothing */ }
    for (const { report } of reports) {
      for (const flow of Array.isArray(report.flows) ? report.flows : []) for (const observation of Array.isArray(flow?.observations) ? flow.observations : []) {
        for (const receipt of Array.isArray(observation?.receipts) ? observation.receipts : []) if (nonempty(receipt?.path)) paths.add(path.posix.normalize(receipt.path));
      }
    }
  }
  return [...paths];
}

/** One line when any receipt's footer says its run started above the core count; null otherwise. */
function loadLine(root, receipts) {
  const footers = receipts.map(receipt => { try { return readFooter(localPath(root, receipt)); } catch { return null; } }).filter(Boolean);
  const loaded = footers.filter(footer => footer.loaded === true);
  if (!loaded.length) return null;
  const counts = [...new Set(loaded.map(footer => footer.cores).filter(cores => Number.isInteger(cores) && cores > 0))].sort((a, b) => a - b);
  const list = counts.length < 2 ? counts.join('') : `${counts.slice(0, -1).join(', ')} and ${counts.at(-1)}`;
  return `${loaded.length} of ${footers.length} test runs started above the core count${counts.length ? ` (${list} cores)` : ''}. An overloaded machine makes slow, flaky runs that agents rerun. Cap workers per run with the runner's own flag; see setup.`;
}

/** Report every queue's specs (in paths.features, or only `queue` when given), drift between queue and frontmatter, features ready to archive,
 * a feature's `load` line when its test runs started loaded, and the questions for the user: follow-ups of accepted reports and decision-needed findings of current reports. */
export function projectStatus({ root = process.cwd(), fix = false, queue: only = null } = {}) {
  const features = [];
  const drift = [];
  const fixed = [];
  const readyToArchive = [];
  const problems = [];
  const questions = [];
  const unreadReports = [];
  const legacyDecisions = [];
  const named = only === null ? null : path.posix.normalize((path.isAbsolute(only) ? path.relative(root, only) : only).split(path.sep).join('/'));
  for (const queuePath of named === null ? queuePaths(root) : [named]) {
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
      if (spec.status === 'done' && isObject(spec.acceptedReport)) questions.push(...followUps(root, queue.feature, spec, unreadReports));
      if (spec.status === 'done' && spec.ownerAcceptance?.legacy === true && !legacyIntact(root, queuePath, spec)) {
        legacyDecisions.push({ feature: queue.feature, specId: spec.id, file: specPath, path: spec.ownerAcceptance.path, reason: 'The legacy decision file is missing or changed.' });
      }
      if (spec.status === 'in-review') questions.push(...heldDecisions(root, queue.feature, queuePath, spec));
      return row;
    });
    const load = loadLine(root, receiptPaths(root, folder, queuePath, queue.specs));
    features.push({ feature: queue.feature, queuePath, pendingJournal, specs, ...(load ? { load } : {}) });
    if (queue.specs.every(spec => spec.status === 'done')) readyToArchive.push({ feature: queue.feature, folder, openDecisions: openDecisions(root, folder) });
  }
  return { features, drift, fixed, readyToArchive, worktrees: worktreeCounts(root), problems, questions, unreadReports, legacyDecisions, openBriefs: openBriefs(root) };
}

export async function main(argv = process.argv.slice(2)) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--fix') { flags['--fix'] = true; continue; }
    if (['--root', '--queue'].includes(argv[index]) && argv[index + 1] !== undefined && !argv[index + 1].startsWith('--')) { flags[argv[index]] = argv[index + 1]; index += 1; continue; }
    throw new Error('Usage: status.mjs [--root <project>] [--queue <queue-path>] [--fix]');
  }
  const result = projectStatus({ root: path.resolve(flags['--root'] ?? '.'), fix: flags['--fix'] === true, queue: flags['--queue'] ?? null });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.drift.length || result.problems.length || result.legacyDecisions.length) process.exitCode = 2;
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`Status stopped: ${error.message}\n`); process.exitCode = 1; });
}
