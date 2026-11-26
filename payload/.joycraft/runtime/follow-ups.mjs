import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { briefDecisionRecords, isObject, localPath, nonempty, parseJson, readLocal, sha256 } from './identity.mjs';

// A feature's follow-ups.json records how each follow-up of an accepted report
// was handled: fixed by a spec of the same queue, decided by a brief decision,
// or dismissed with a reason. Reports never change; status reads this file and
// stops asking about a handled follow-up.
export const ledgerName = 'follow-ups.json';
const outcomes = ['fixed', 'decided', 'dismissed'];
const refusal = message => Object.assign(new Error(message), { refusal: true });

/** The feature folder of a queue at <folder>/specs/.joycraft-spec-queue.json. */
export const featureFolderOf = queuePath => path.posix.dirname(path.posix.dirname(queuePath));
export const ledgerPathOf = queuePath => `${featureFolderOf(queuePath)}/${ledgerName}`;

function validEntry(entry) {
  if (!isObject(entry) || !['string', 'number'].includes(typeof entry.spec) || !nonempty(entry.finding) || !outcomes.includes(entry.outcome)) return false;
  if (entry.outcome === 'dismissed') return typeof entry.reason === 'string';
  return ['string', 'number'].includes(typeof entry.by) && String(entry.by).trim() !== '';
}

/** The ledger of a queue's feature: { path, entries } (entries empty when the file is absent), or { path, entries: [], problem } when malformed. */
export function readLedger(root, queuePath) {
  const file = ledgerPathOf(queuePath);
  if (!existsSync(localPath(root, file, true))) return { path: file, entries: [] };
  try {
    const ledger = parseJson(readLocal(root, file), file);
    if (!isObject(ledger) || ledger.schemaVersion !== 1 || !Array.isArray(ledger.entries)) throw new Error(`${file} needs { "schemaVersion": 1, "entries": [...] }`);
    const bad = ledger.entries.findIndex(entry => !validEntry(entry));
    if (bad !== -1) throw new Error(`${file} entries[${bad}] needs spec, finding, an outcome of ${outcomes.join(', ')}, and by (or reason when dismissed)`);
    return { path: file, entries: ledger.entries };
  } catch (error) {
    return { path: file, entries: [], problem: `${error.message}. Every follow-up stays a question until it is fixed.` };
  }
}

function briefDecisions(root, queuePath) {
  const brief = `${featureFolderOf(queuePath)}/brief.md`;
  try { return existsSync(localPath(root, brief, true)) ? briefDecisionRecords(readLocal(root, brief), brief).filter(isObject) : []; }
  catch { return []; }
}

/** A predicate: is this spec's finding handled? Fixed needs a done spec, decided an answered
 * (not open or assigned) brief decision, dismissed a nonempty reason. */
export function handledBy(root, queuePath, queue, entries) {
  if (!entries.length) return () => false;
  const decisions = briefDecisions(root, queuePath);
  const ok = entry => {
    if (entry.outcome === 'dismissed') return nonempty(entry.reason);
    if (entry.outcome === 'fixed') return queue.specs.some(spec => String(spec.id) === String(entry.by) && spec.status === 'done');
    const decision = decisions.find(record => record.id === entry.by);
    return Boolean(decision) && nonempty(decision.status) && !['open', 'assigned'].includes(decision.status);
  };
  const latest = new Map(entries.map(entry => [`${entry.spec}\u0000${entry.finding}`, entry]));
  return (specId, findingId) => {
    const entry = latest.get(`${specId}\u0000${findingId}`);
    return Boolean(entry) && ok(entry);
  };
}

/** The follow-up findings of a done spec's accepted report. */
function acceptedFollowUps(root, spec) {
  if (spec.status !== 'done' || !isObject(spec.acceptedReport)) throw refusal(`Spec ${spec.id} has no accepted report; only follow-ups of an accepted report are recorded here.`);
  const receipt = spec.acceptedReport;
  const bytes = readLocal(root, receipt.path);
  if (sha256(bytes) !== receipt.sha256) throw refusal(`The accepted report of spec ${spec.id} (${receipt.path}) changed; nothing was recorded.`);
  const report = parseJson(bytes, receipt.path);
  return (Array.isArray(report?.findings) ? report.findings : []).filter(finding => isObject(finding) && finding.class === 'follow-up');
}

/** Add (or replace) one entry. Returns the entry written. */
export function recordFollowUp({ root = process.cwd(), queuePath, spec: specId, finding, fixed, decided, dismissed }) {
  const given = [['fixed', fixed], ['decided', decided], ['dismissed', dismissed]].filter(([, value]) => value !== undefined);
  if (given.length !== 1) throw refusal('Give exactly one of --fixed <spec>, --decided <decision> or --dismissed <reason>.');
  if (!nonempty(queuePath) || !nonempty(String(specId ?? '')) || !nonempty(finding)) throw refusal('Give --queue, --spec and --finding.');
  const queue = parseJson(readLocal(root, queuePath), queuePath);
  if (!isObject(queue) || !Array.isArray(queue.specs)) throw refusal(`${queuePath} has no specs list.`);
  const spec = queue.specs.find(item => String(item.id) === String(specId));
  if (!spec) throw refusal(`Spec ${specId} is not in ${queuePath}.`);
  const findings = acceptedFollowUps(root, spec);
  if (!findings.some(item => item.id === finding)) throw refusal(`The accepted report of spec ${spec.id} has no follow-up ${finding}.`);
  const [outcome, value] = given[0];
  const entry = { spec: spec.id, finding, outcome };
  if (outcome === 'fixed') {
    const by = queue.specs.find(item => String(item.id) === String(value));
    if (!by) throw refusal(`--fixed ${value}: no spec ${value} in ${queuePath}.`);
    entry.by = by.id;
  } else if (outcome === 'decided') {
    if (!briefDecisions(root, queuePath).some(record => record.id === value)) throw refusal(`--decided ${value}: the brief has no decision ${value}.`);
    entry.by = value;
  } else {
    if (!nonempty(value)) throw refusal('--dismissed needs a nonempty reason.');
    entry.reason = value.trim();
  }
  const current = readLedger(root, queuePath);
  if (current.problem) throw refusal(current.problem);
  const entries = [...current.entries.filter(item => !(String(item.spec) === String(entry.spec) && item.finding === entry.finding)), entry];
  const target = localPath(root, current.path, true);
  mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify({ schemaVersion: 1, entries }, null, 2)}\n`);
  renameSync(temporary, target);
  return { path: current.path, entry };
}

const usage = 'Usage: follow-ups.mjs --queue <queue> --spec <id> --finding <id> (--fixed <spec> | --decided <decision> | --dismissed <reason>) [--root <project>]';

export function main(argv = process.argv.slice(2)) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    if (!['--queue', '--spec', '--finding', '--fixed', '--decided', '--dismissed', '--root'].includes(name) || argv[index + 1] === undefined) {
      process.stderr.write(`${usage}\n`); process.exitCode = 2; return null;
    }
    if (flags[name] !== undefined) { process.stderr.write(`${name} is given twice. ${usage}\n`); process.exitCode = 2; return null; }
    flags[name] = argv[index + 1];
  }
  try {
    const result = recordFollowUp({ root: path.resolve(flags['--root'] ?? '.'), queuePath: flags['--queue'], spec: flags['--spec'], finding: flags['--finding'],
      fixed: flags['--fixed'], decided: flags['--decided'], dismissed: flags['--dismissed'] });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return result;
  } catch (error) {
    process.stderr.write(`Follow-up not recorded: ${error.message}\n`);
    process.exitCode = error.refusal ? 2 : 1;
    return null;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
