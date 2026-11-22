import { constants as bufferConstants } from 'node:buffer';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { closeSync, cpSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, rmdirSync, statSync, writeFileSync, writeSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { boundQueueForSubject, briefDecisionRecords, canonical, featureFolderMatches, isObject, isSha256, localPath, nonempty, normalizedQueueForSubject, parseJson, readLocal, readQueue, relativePath, requireValue, scopedRequirementForSubject, sha256, specStatus, subjectIdentity, validateIndependentReview } from './identity.mjs';
import { validateEvidence } from './evidence.mjs';
import { validateOwnerAcceptance, validateWaiver } from './completion.mjs';
import { readConfig, workPaths } from './config.mjs';
import { isTestPath } from './test-changes.mjs';
import { templateArgv } from './dispatch-start.mjs';

const featureName = value => {
  requireValue(typeof value === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(value), 'Feature must be a lowercase slug');
  return value;
};
// Folders come from joycraft.yaml (paths.features / paths.archive); defaults are docs/features and docs/archive.
// A feature folder is named for its queue feature, optionally after a YYYY-MM-DD- date.
const archivePath = (root, folder) => `${workPaths(root).archive}/${folder}`;
const featurePath = (root, folder) => `${workPaths(root).features}/${folder}`;
const featureFolder = queuePath => path.posix.dirname(path.posix.dirname(queuePath));

/**
 * The folder a --feature value names: the folder with that exact name, else the one
 * folder named YYYY-MM-DD-<value>. A working folder is preferred to an archived one,
 * so a repeat of a finished archive resolves the same way as its first run.
 */
function resolveFolder(root, name) {
  const { features, archive } = workPaths(root);
  for (const home of [features, archive]) {
    const local = path.join(realpathSync(root), home);
    const names = existsSync(local) ? readdirSync(local).filter(entry => !entry.startsWith('.')) : [];
    if (names.includes(name)) return name;
    const dated = names.filter(entry => entry !== name && featureFolderMatches(entry, name)).sort();
    requireValue(dated.length <= 1, `Feature ${name} matches more than one folder in ${home}: ${dated.join(', ')}. Pass one of these folder names as --feature`);
    if (dated.length === 1) return dated[0];
  }
  throw new Error(`No feature folder for ${name}: looked for ${name} and YYYY-MM-DD-${name} in ${features} and ${archive}`);
}

function localDirectory(root, relative) {
  relative = relativePath(relative);
  let current = realpathSync(root);
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    const stat = lstatSync(current);
    requireValue(!stat.isSymbolicLink() && stat.isDirectory(), `Not a plain directory: ${relative}`);
  }
  return current;
}

function projectTarget(root, relative) {
  relative = relativePath(relative);
  let current = realpathSync(root);
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    if (!existsSync(current)) return path.join(realpathSync(root), relative);
    requireValue(!lstatSync(current).isSymbolicLink(), `Symlink paths are not supported: ${relative}`);
  }
  return current;
}

function plainDirectory(root, relative) {
  const target = localDirectory(root, relative);
  for (const name of readdirSync(target)) {
    const child = `${relative}/${name}`;
    const stat = lstatSync(path.join(target, name));
    requireValue(!stat.isSymbolicLink(), `Symlink paths are not supported: ${child}`);
    if (stat.isDirectory()) plainDirectory(root, child);
    else requireValue(stat.isFile(), `Not a plain file: ${child}`);
  }
  return target;
}

function parseAttestation(root, input) {
  const attestation = typeof input === 'string' ? parseJson(readLocal(root, input), input) : input;
  requireValue(isObject(attestation) && attestation.schemaVersion === 1 && attestation.phase === 'session-end', 'Archive needs a schemaVersion 1 session-end attestation');
  requireValue(isObject(attestation.host) && nonempty(attestation.host.sessionId) && attestation.host.quiescent === true, 'Host must attest the session is quiescent');
  requireValue(Array.isArray(attestation.host.activeWorkers) && attestation.host.activeWorkers.length === 0 && Array.isArray(attestation.host.dependentWork) && attestation.host.dependentWork.length === 0, 'Active workers or dependent unfinished work block archival');
  requireValue(isObject(attestation.durableContext) && attestation.durableContext.carried === true && Array.isArray(attestation.durableContext.references) && attestation.durableContext.references.length > 0, 'Host must attest durable constraints are carried into current context');
  const references = attestation.durableContext.references.map(relativePath);
  for (const reference of references) {
    requireValue(reference.endsWith('.md'), 'Durable context references must be current Markdown documentation');
    const { features, archive } = workPaths(root);
    requireValue(!reference.startsWith(`${features}/`) && !reference.startsWith(`${archive}/`), 'Durable context cannot rely on the feature being archived');
    readLocal(root, reference);
  }
  return { schemaVersion: 1, phase: 'session-end', host: { sessionId: attestation.host.sessionId, quiescent: true, activeWorkers: [], dependentWork: [] }, durableContext: { carried: true, references } };
}

const gitIn = (root, args, binary = false) => execFileSync('git', ['--literal-pathspecs', '-C', root, ...args], { encoding: binary ? 'buffer' : 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024 });

function gitRoot(root) {
  try { return realpathSync(gitIn(root, ['rev-parse', '--show-toplevel']).trim()) === realpathSync(root); } catch { return false; }
}

function committedBytes(root, revision, file) {
  try { return gitIn(root, ['show', `${revision}:${file}`], true); } catch { return null; }
}

const isDecisionAnswered = decision => ['clarified', 'assigned'].includes(decision.status) && (typeof decision.answer === 'string' ? nonempty(decision.answer) : decision.answer !== null && decision.answer !== undefined);

/**
 * Each commit that changed the feature brief after an acceptance must have one amendment
 * record naming the answered owner decisions that authorized it, and the record's before
 * and after hashes must equal that commit's first parent and own brief bytes.
 */
function briefAmendments(root, source, briefPath, later) {
  // A merge that keeps one parent's brief changed nothing, so it needs no record.
  const keepsParentBrief = commit => {
    const parents = gitIn(root, ['rev-list', '--parents', '-n', '1', commit]).trim().split(' ').slice(1);
    const after = committedBytes(root, commit, briefPath);
    return parents.length > 1 && after !== null && parents.some(parent => committedBytes(root, parent, briefPath)?.equals(after));
  };
  later = later.filter(commit => !keepsParentBrief(commit));
  const recordPath = `${source}/brief-amendments.json`;
  const changed = `Original requirement changed after acceptance: ${briefPath}`;
  requireValue(existsSync(localPath(root, recordPath, true)), `${changed} (no ${recordPath} records its amendments)`);
  const record = parseJson(readLocal(root, recordPath), recordPath);
  requireValue(isObject(record) && record.schemaVersion === 1 && record.kind === 'joycraft-brief-amendments' && record.brief === briefPath && Array.isArray(record.amendments), `Brief amendment record is malformed: ${recordPath}`);
  const decisions = briefDecisionRecords(readLocal(root, briefPath), briefPath);
  return later.map(commit => {
    const entries = record.amendments.filter(item => isObject(item) && item.commit === commit);
    requireValue(entries.length === 1, `${changed} (commit ${commit} has no single amendment record)`);
    const entry = entries[0];
    const before = committedBytes(root, `${commit}^`, briefPath), after = committedBytes(root, commit, briefPath);
    requireValue(before !== null && after !== null && entry.fromSha256 === sha256(before) && entry.toSha256 === sha256(after), `Brief amendment ${commit} does not match its commit's brief bytes`);
    requireValue(nonempty(entry.summary) && Array.isArray(entry.decisions) && entry.decisions.length > 0 && entry.decisions.every(nonempty), `Brief amendment ${commit} needs a summary and at least one owner decision`);
    for (const id of entry.decisions) {
      const matches = decisions.filter(decision => isObject(decision) && decision.id === id);
      requireValue(matches.length === 1, `Brief amendment ${commit} names decision ${id}, which the brief does not record exactly once`);
      requireValue(isDecisionAnswered(matches[0]), `Brief amendment ${commit} names decision ${id}, which has no recorded owner answer`);
    }
    return { commit, fromSha256: entry.fromSha256, toSha256: entry.toSha256, decisions: [...entry.decisions], summary: entry.summary };
  });
}

function validateReconciliation(record, feature) {
  requireValue(isObject(record) && record.schemaVersion === 1 && record.kind === 'joycraft-archive-reconciliation' && record.feature === feature && validTimestamp(record.createdAt), 'Archive reconciliation has an invalid identity');
  requireValue(nonempty(record.instruction) && nonempty(record.reason) && nonempty(record.resolution) && Array.isArray(record.limitations) && record.limitations.length > 0 && record.limitations.every(nonempty), 'Archive reconciliation needs the owner instruction, reason, resolution and limitations');
  requireValue(Array.isArray(record.entries) && record.entries.length > 0, 'Archive reconciliation needs exact affected report/input entries');
  const keys = new Set();
  for (const entry of record.entries) {
    requireValue(isObject(entry) && isObject(entry.report) && nonempty(entry.report.path) && isSha256(entry.report.sha256) && nonempty(entry.path) && ['none', 'requirement-scope', 'queue-scope', 'queue-status', 'spec-status'].includes(entry.normalization) && isSha256(entry.acceptedSha256) && isSha256(entry.currentSha256) && nonempty(entry.reason) && nonempty(entry.resolution), 'Archive reconciliation entry is malformed');
    relativePath(entry.path); relativePath(entry.report.path);
    if (entry.acceptedCommit !== undefined) requireValue(typeof entry.acceptedCommit === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(entry.acceptedCommit), 'Archive reconciliation needs a full accepted commit ID');
    const key = canonical([entry.report.path, entry.report.sha256, entry.path, entry.normalization, entry.acceptedSha256]);
    requireValue(!keys.has(key), 'Archive reconciliation has duplicate entries'); keys.add(key);
  }
}

function readReconciliation(root, source, feature, file) {
  if (file === undefined) return undefined;
  requireValue(file === `${source}/archive-reconciliation.json`, 'Use the feature archive-reconciliation.json for the explicit override');
  const bytes = readLocal(root, file), record = parseJson(bytes, file);
  validateReconciliation(record, feature);
  return { path: file, sha256: sha256(bytes), record, used: new Set() };
}

function reconciledRequirement(root, state, review, input, project, reconciliation) {
  requireValue(reconciliation, `Original requirement changed after acceptance: ${input.path} (explicit archive reconciliation required)`);
  const index = reconciliation.record.entries.findIndex(entry => entry.report.path === review.path && entry.report.sha256 === review.sha256 && entry.path === input.path && entry.normalization === input.normalization && entry.acceptedSha256 === input.sha256);
  requireValue(index >= 0, `Archive reconciliation does not cover ${review.path}: ${input.path}`);
  const entry = reconciliation.record.entries[index];
  requireValue(sha256(readLocal(root, input.path)) === entry.currentSha256, `Archive reconciliation is stale: ${input.path}`);
  const record = historicalRequirement(root, featureFolder(state.queuePath), input, project, ['none', 'requirement-scope', 'queue-scope', 'queue-status', 'spec-status'], entry.acceptedCommit);
  reconciliation.used.add(index);
  return { ...record, ...(input.normalization === 'queue-scope' ? { specId: state.spec.id } : {}), reconciliationEntry: index, reconciliationSha256: reconciliation.sha256 };
}

/**
 * A requirement that changed after acceptance stays historical evidence only when git proves
 * what was reviewed: a committed version of the file must project to the accepted hash, the
 * current version must be committed, and the commits since are recorded. The feature brief
 * also needs an owner-decision amendment for each of those commits. The accepted bytes are
 * restored into the archive, so the original requirement is preserved, not reclassified.
 */
export function historicalRequirement(root, source, input, project, normalizations = ['none', 'requirement-scope'], acceptedCommit) {
  const changed = `Original requirement changed after acceptance: ${input.path}`;
  requireValue(gitRoot(root), `${changed} (no git history proves the accepted version)`);
  requireValue(gitIn(root, ['status', '--porcelain', '--', input.path]).trim() === '', `${changed} (commit its current version first)`);
  const current = committedBytes(root, 'HEAD', input.path);
  requireValue(current !== null && sha256(current) === sha256(readLocal(root, input.path)), `${changed} (current bytes differ from HEAD)`);
  requireValue(normalizations.includes(input.normalization ?? 'none'), `${changed} (unsupported historical normalization)`);
  if (acceptedCommit !== undefined) requireValue(gitIn(root, ['rev-parse', `${acceptedCommit}^{commit}`]).trim() === acceptedCommit, 'Reconciliation commit is not a full commit object ID');
  const commits = acceptedCommit === undefined ? gitIn(root, ['log', '--full-history', '--topo-order', '--format=%H', 'HEAD', '--', input.path]).split('\n').filter(Boolean) : [acceptedCommit];
  const accepted = commits.find(commit => {
    const bytes = committedBytes(root, commit, input.path);
    // Older versions can predate the selected heading or decision. They are not matches.
    try { return bytes !== null && sha256(project(bytes)) === input.sha256; } catch { return false; }
  });
  requireValue(accepted !== undefined, `${changed} (no committed version matches the accepted bytes)`);
  const later = gitIn(root, ['log', '--full-history', '--topo-order', '--format=%H', '--reverse', `${accepted}..HEAD`, '--', input.path]).split('\n').filter(Boolean);
  const raw = committedBytes(root, accepted, input.path);
  const record = { path: input.path, normalization: input.normalization ?? 'none', ...(input.scope !== undefined ? { scope: input.scope } : {}), acceptedSha256: input.sha256, acceptedCommit: accepted, restoredSha256: sha256(raw), laterCommits: later };
  if (input.path === `${source}/brief.md`) record.amendments = briefAmendments(root, source, input.path, later);
  return record;
}

function historicalReport(root, queuePath, state, review, { ownerAccepted = false, reconciliation } = {}) {
  requireValue(state.spec.status === 'done' && isObject(review) && isSha256(review.sha256), `Spec ${state.spec.id} is not accepted`);
  const reportPath = relativePath(review.path);
  const reportBytes = readLocal(root, reportPath);
  requireValue(sha256(reportBytes) === review.sha256, `Accepted report is missing or changed: ${reportPath}`);
  const report = parseJson(reportBytes, reportPath);
  requireValue(isObject(report) && report.schemaVersion === 1 && (ownerAccepted ? ['FAIL', 'UNVERIFIED'].includes(report.verdict) : report.verdict === 'PASS'), `Accepted report has an invalid historical verdict: ${reportPath}`);
  requireValue(isObject(report.subject) && report.subject.schemaVersion === 1 && report.subject.queuePath === queuePath && report.subject.specId === state.spec.id && report.subject.specPath === state.specPath, `Accepted report has the wrong subject: ${reportPath}`);
  requireValue(isSha256(report.subject.identity) && subjectIdentity(report.subject) === report.subject.identity, `Accepted report has an invalid subject identity: ${reportPath}`);
  try { validateIndependentReview(report); } catch (error) { throw new Error(`Accepted report lacks independent review: ${reportPath}; ${error.message}`); }
  requireValue(Array.isArray(report.unresolved) && report.unresolved.every(nonempty) && (!ownerAccepted ? report.unresolved.length === 0 : true) && validTimestamp(report.createdAt) && Array.isArray(report.flows) && report.flows.length > 0, `Accepted report is incomplete: ${reportPath}`);
  if (!ownerAccepted) {
    const evidence = validateEvidence(report, report.subject.criteria);
    requireValue(isObject(evidence) && evidence.ok === true && Array.isArray(evidence.errors) && evidence.errors.length === 0, `Accepted report evidence is invalid: ${Array.isArray(evidence?.errors) ? evidence.errors.join('; ') : 'validator response is malformed'}`);
  }
  const inputs = Array.isArray(report.subject.inputs) ? report.subject.inputs : [];
  const bound = report.subject.binding;
  if (bound !== undefined) requireValue(isObject(bound) && bound.version === 1 && isObject(bound.queue) && Array.isArray(bound.queue.specIds) && Array.isArray(bound.governing), `Accepted report has invalid binding metadata: ${reportPath}`);
  const normalization = bound === undefined ? 'queue-status' : 'queue-scope';
  const queueInputs = inputs.filter(input => isObject(input) && input.path === queuePath && input.kind === 'requirement' && input.normalization === normalization && isSha256(input.sha256));
  requireValue(queueInputs.length === 1, `Accepted report omits or changes bound queue requirements: ${reportPath}`);
  const queueInput = queueInputs[0];
  const projectQueue = bytes => bound === undefined ? normalizedQueueForSubject(parseJson(bytes, queuePath)) : boundQueueForSubject(parseJson(bytes, queuePath), state.spec.id).value;
  const history = new Map();
  let reviewedQueue = state.queue;
  if (sha256(projectQueue(readLocal(root, queuePath))) !== queueInput.sha256) {
    requireValue(reconciliation, `Accepted report omits or changes bound queue requirements: ${reportPath}`);
    const restored = reconciledRequirement(root, state, review, queueInput, projectQueue, reconciliation);
    history.set(canonical(queueInput), restored);
    reviewedQueue = parseJson(committedBytes(root, restored.acceptedCommit, queuePath), queuePath);
  }
  if (bound !== undefined) requireValue(canonical(bound.queue.specIds) === canonical(boundQueueForSubject(reviewedQueue, state.spec.id).specIds), `Accepted report queue binding differs from archived dependencies: ${reportPath}`);
  const reviewedSpec = reviewedQueue.specs.find(spec => spec.id === state.spec.id);
  requireValue(reviewedSpec && reviewedSpec.file === state.spec.file && canonical(report.subject.criteria) === canonical(reviewedSpec.verification.criteria), `Accepted report criteria differ from the archived spec: ${reportPath}`);
  const declaredSpecPaths = new Set([...state.queue.specs, ...reviewedQueue.specs].map(spec => path.posix.join(path.posix.dirname(queuePath), spec.file)));
  for (const required of [state.specPath, `${featureFolder(queuePath)}/brief.md`, ...report.subject.criteria.map(item => relativePath(item.requirement.path))]) {
    requireValue(inputs.some(input => isObject(input) && input.path === required && input.kind === 'requirement' && isSha256(input.sha256)), `Accepted report omits original requirement ${required}: ${reportPath}`);
  }
  const requirement = (input, project) => {
    const current = readLocal(root, input.path);
    // A removed selector is a changed requirement, too; recover only a matching committed projection.
    let matches = false;
    try { matches = sha256(project(current)) === input.sha256; } catch { /* Search committed versions below. */ }
    if (matches) return;
    requireValue(input.path !== queuePath && !declaredSpecPaths.has(input.path), `Original requirement changed after acceptance: ${input.path}`);
    const key = canonical(input);
    const explicit = reconciliation?.record.entries.some(entry => entry.report.path === review.path && entry.path === input.path && entry.normalization === input.normalization);
    if (!history.has(key)) history.set(key, explicit ? reconciledRequirement(root, state, review, input, project, reconciliation) : historicalRequirement(root, featureFolder(queuePath), input, project));
  };
  for (const input of inputs.filter(input => isObject(input) && input.kind === 'requirement' && (bound !== undefined || input.path.startsWith(`${featureFolder(queuePath)}/`)))) {
    // The queue was checked above. Only an explicit, hash-bound reconciliation can
    // preserve a changed acceptance record; normal requirement fallback cannot.
    if (input.path === queuePath) {
      requireValue(canonical(input) === canonical(queueInput), `Accepted report has an inconsistent queue input: ${reportPath}`);
      continue;
    }
    if (declaredSpecPaths.has(input.path)) {
      const projectSpec = bytes => specStatus(bytes).replace('__review_status__');
      if (sha256(projectSpec(readLocal(root, input.path))) !== input.sha256) {
        history.set(canonical(input), reconciledRequirement(root, state, review, input, projectSpec, reconciliation));
      }
      continue;
    }
    requirement(input, bytes => input.normalization === 'requirement-scope' ? scopedRequirementForSubject(bytes, input.scope, input.path) : bytes);
  }
  if (bound !== undefined) {
    for (const governing of bound.governing) {
      requireValue(isObject(governing) && nonempty(governing.path), `Accepted report governing binding is malformed: ${reportPath}`);
      const input = inputs.find(item => isObject(item) && item.path === governing.path && item.normalization === 'requirement-scope');
      const { path: governingPath, ...scope } = governing;
      requireValue(input && canonical(input.scope) === canonical(scope), `Accepted report governing input is missing: ${governing.path}`);
      requirement(input, bytes => scopedRequirementForSubject(bytes, input.scope, governing.path));
    }
  }
  const receipts = [];
  for (const flow of report.flows) {
    requireValue(isObject(flow) && flow.subjectIdentity === report.subject.identity && Array.isArray(flow.observations), `Accepted report flow is malformed: ${reportPath}`);
    for (const observation of flow.observations) {
      requireValue(isObject(observation) && Array.isArray(observation.receipts), `Accepted report observation is malformed: ${reportPath}`);
      for (const receipt of observation.receipts) {
        requireValue(isObject(receipt) && isSha256(receipt.sha256), `Accepted report receipt is malformed: ${reportPath}`);
        const receiptPath = relativePath(receipt.path);
        requireValue(sha256(readLocal(root, receiptPath)) === receipt.sha256, `Historical receipt is missing or changed: ${receiptPath}`);
        receipts.push({ path: receiptPath, sha256: receipt.sha256 });
      }
    }
  }
  return { path: reportPath, sha256: review.sha256, bytes: reportBytes, receipts, verdict: report.verdict, report, ...(history.size ? { requirementHistory: [...history.values()] } : {}) };
}

const validTimestamp = value => typeof value === 'string' && nonempty(value) && Number.isFinite(Date.parse(value));

function historicalDecision(root, queuePath, state, reconciliation) {
  const accepted = state.spec.acceptedReport;
  const owner = state.spec.ownerAcceptance;
  const waiver = state.spec.waiver;
  requireValue([accepted, owner, waiver].filter(item => item !== undefined).length <= 1, `Spec ${state.spec.id} has more than one of acceptedReport, ownerAcceptance and waiver`);
  if (waiver !== undefined) {
    // The brief may evolve after completion; the waiver bytes and record stay bound.
    requireValue(isObject(waiver) && isSha256(waiver.sha256), `Spec ${state.spec.id} has a malformed waiver`);
    const waiverPath = relativePath(waiver.path);
    const waiverBytes = readLocal(root, waiverPath);
    requireValue(sha256(waiverBytes) === waiver.sha256, `Feature waiver is missing or changed: ${waiverPath}`);
    const record = parseJson(waiverBytes, waiverPath);
    validateWaiver({ root, waiver: record, waiverPath, state, checkSource: false });
    const limitations = [`waived by the user: "${record.instruction}"`];
    if (waiver.review === undefined) return { kind: 'feature-waiver', path: waiverPath, sha256: waiver.sha256, report: null, covers: record.covers, receipts: [], limitations };
    const report = historicalReport(root, queuePath, state, waiver.review, { ownerAccepted: true, reconciliation });
    requireValue(report.verdict === 'UNVERIFIED', `Waived report must stay UNVERIFIED: ${report.path}`);
    return { kind: 'feature-waiver', path: waiverPath, sha256: waiver.sha256, report: { path: report.path, sha256: report.sha256, verdict: report.verdict }, covers: record.covers, receipts: report.receipts, limitations, ...(report.requirementHistory ? { requirementHistory: report.requirementHistory } : {}) };
  }
  if (accepted !== undefined) {
    const report = historicalReport(root, queuePath, state, accepted, { reconciliation });
    return { kind: 'accepted-report', path: report.path, sha256: report.sha256, report: { path: report.path, sha256: report.sha256, verdict: report.verdict }, receipts: report.receipts, limitations: [], ...(report.requirementHistory ? { requirementHistory: report.requirementHistory } : {}) };
  }
  requireValue(isObject(owner) && isSha256(owner.sha256), `Spec ${state.spec.id} is not accepted`);
  const ownerPath = relativePath(owner.path);
  if (owner.legacy === true) {
    // Done before the gates and accepted as it is: the owner's words are the only record.
    let ownerBytes;
    try { ownerBytes = readLocal(root, ownerPath); } catch { ownerBytes = null; }
    requireValue(ownerBytes !== null && sha256(ownerBytes) === owner.sha256, `Legacy acceptance decision is missing or changed: ${ownerPath}. Restore it from git; if you cannot, stop and tell the user`);
    const decision = parseJson(ownerBytes, ownerPath);
    validateOwnerAcceptance({ decision, decisionPath: ownerPath, state, legacy: true });
    return { kind: 'legacy-acceptance', path: ownerPath, sha256: owner.sha256, report: null, receipts: [], limitations: [`accepted as it is by the owner, with no review: "${decision.statement}"`] };
  }
  const ownerBytes = readLocal(root, ownerPath);
  requireValue(sha256(ownerBytes) === owner.sha256, `Owner acceptance is missing or changed: ${ownerPath}`);
  const decision = parseJson(ownerBytes, ownerPath);
  requireValue(isObject(decision) && isObject(decision.review) && nonempty(decision.review.path) && isSha256(decision.review.sha256), `Owner acceptance needs a review receipt: ${ownerPath}`);
  const report = historicalReport(root, queuePath, state, decision.review, { ownerAccepted: true, reconciliation });
  validateOwnerAcceptance({ root, decision, decisionPath: ownerPath, state, report: report.report, reportPath: report.path, reportBytes: report.bytes });
  return { kind: 'owner-acceptance', path: ownerPath, sha256: owner.sha256, report: { path: report.path, sha256: report.sha256, verdict: report.verdict }, receipts: report.receipts, limitations: decision.limitations, ...(report.requirementHistory ? { requirementHistory: report.requirementHistory } : {}) };
}

function fileDigest(root, relative) { return { path: relative, sha256: sha256(readLocal(root, relative)) }; }

function existingArchive(root, folder) {
  const destination = archivePath(root, folder), source = featurePath(root, folder);
  const manifestPath = `${destination}/archive-replay.json`;
  const manifest = parseJson(readLocal(root, manifestPath), manifestPath);
  requireValue(isObject(manifest) && manifest.schemaVersion === 1 && manifest.kind === 'joycraft-archive-replay' && typeof manifest.feature === 'string' && featureFolderMatches(folder, manifest.feature) && manifest.source === source && Array.isArray(manifest.files), `Archive destination is not a valid archive for ${folder}: ${destination}`);
  if (manifest.reconciliation !== undefined) {
    const proof = manifest.reconciliation;
    requireValue(isObject(proof) && proof.path === `${source}/archive-reconciliation.json` && isSha256(proof.sha256), 'Archived reconciliation metadata is malformed');
    validateReconciliation(proof.record, manifest.feature);
    const ledger = manifest.files.find(file => file.operation === 'moved' && file.originalPath === proof.path && file.sha256 === proof.sha256);
    requireValue(ledger && sha256(readLocal(root, ledger.archivedPath)) === proof.sha256 && canonical(parseJson(readLocal(root, ledger.archivedPath), proof.path)) === canonical(proof.record), 'Archived reconciliation paper trail is missing or changed');
    requireValue(manifest.historical?.acceptanceRecordsReconciled === true, 'Archived reconciliation must remain visibly labeled');
  }
  for (const file of manifest.files) {
    requireValue(isObject(file) && nonempty(file.originalPath) && isSha256(file.sha256) && ['moved', 'copied', 'restored-from-git'].includes(file.operation), `Archive replay entry is malformed: ${manifestPath}`);
    const archivedPath = relativePath(file.archivedPath);
    requireValue(archivedPath.startsWith(`${destination}/`), `Archive replay path escapes its destination: ${archivedPath}`);
    const bytes = readLocal(root, archivedPath);
    requireValue(sha256(bytes) === file.sha256, `Archived bytes are missing or changed: ${archivedPath}`);
    if (file.operation === 'restored-from-git') {
      const record = file.requirement;
      requireValue(isObject(record) && record.path === file.originalPath && record.restoredSha256 === file.sha256 && isSha256(record.acceptedSha256) && /^[a-f0-9]{40,64}$/.test(record.acceptedCommit) && Array.isArray(record.laterCommits) && record.laterCommits.every(commit => /^[a-f0-9]{40,64}$/.test(commit)) && ['none', 'requirement-scope', 'queue-scope', 'queue-status', 'spec-status'].includes(record.normalization), `Historical requirement replay is malformed: ${archivedPath}`);
      if (['queue-scope', 'queue-status', 'spec-status'].includes(record.normalization) || record.reconciliationEntry !== undefined) {
        requireValue(manifest.reconciliation && record.reconciliationSha256 === manifest.reconciliation.sha256 && Number.isInteger(record.reconciliationEntry), `Reconciled replay has no matching paper trail: ${archivedPath}`);
        const entry = manifest.reconciliation.record.entries[record.reconciliationEntry];
        requireValue(entry && entry.path === record.path && entry.normalization === record.normalization && entry.acceptedSha256 === record.acceptedSha256 && (entry.acceptedCommit === undefined || entry.acceptedCommit === record.acceptedCommit) && manifest.evidence.some(decision => decision.report?.path === entry.report.path && decision.report?.sha256 === entry.report.sha256 && decision.requirementHistory?.some(item => canonical(item) === canonical(record))) && manifest.files.some(item => ['moved', 'copied'].includes(item.operation) && item.originalPath === entry.path && item.sha256 === entry.currentSha256), `Reconciled replay differs from its paper trail: ${archivedPath}`);
      }
      requireValue(archivedPath === restoredPath(destination, record) && sha256(requirementProjection(bytes, record)) === record.acceptedSha256, `Restored requirement does not match acceptance: ${archivedPath}`);
    }
  }
  if (manifest.asIs !== undefined) requireValue(isObject(manifest.asIs) && manifest.asIs.path === `${destination}/unverified.md` && sha256(readLocal(root, manifest.asIs.path)) === manifest.asIs.sha256 && manifest.historical?.archivedAsIs === true, `Archived as-is note is missing or changed: ${destination}/unverified.md`);
  for (const decision of manifest.evidence ?? []) {
    for (const record of decision.requirementHistory ?? []) {
      requireValue(manifest.files.some(file => file.operation === 'restored-from-git' && canonical(file.requirement) === canonical(record)), `Historical requirement replay is missing: ${record.path}`);
    }
  }
  return { destination, manifestPath, manifest };
}

export function previewArchiveFeature({ root = process.cwd(), feature, phase, attestation, reconciliation: reconciliationPath, asIs = false, ownerInstruction }) {
  const name = featureName(feature);
  requireValue(!asIs || nonempty(ownerInstruction), 'Archive --as-is needs --owner-instruction with the owner\'s own words');
  requireValue(asIs || ownerInstruction === undefined, '--owner-instruction is only for --as-is');
  requireValue(phase === 'session-end', 'Archive is allowed only during phase=session-end');
  const folder = resolveFolder(root, name);
  const source = featurePath(root, folder), destination = archivePath(root, folder);
  const parsedAttestation = parseAttestation(root, attestation);
  if (existsSync(projectTarget(root, destination))) {
    requireValue(!existsSync(projectTarget(root, source)), `Archive destination already exists while live source remains: ${destination}`);
    const existing = existingArchive(root, folder);
    return { schemaVersion: 1, feature: existing.manifest.feature, phase, source, destination, attestation: parsedAttestation, existing: true, manifest: existing.manifestPath, historical: existing.manifest.historical, ...(existing.manifest.asIs ? { unverified: existing.manifest.asIs.path } : {}) };
  }
  plainDirectory(root, source);
  const queuePath = `${source}/specs/.joycraft-spec-queue.json`;
  const queues = [];
  const findQueues = relative => {
    for (const name of readdirSync(localDirectory(root, relative))) {
      const child = `${relative}/${name}`;
      const stat = lstatSync(path.join(localDirectory(root, relative), name));
      if (stat.isDirectory()) findQueues(child);
      else if (name === '.joycraft-spec-queue.json') queues.push(child);
    }
  };
  findQueues(source);
  requireValue(queues.length === 1 && queues[0] === queuePath, `Unexpected alternate queue in feature archive: ${queues.filter(item => item !== queuePath).join(', ') || 'missing canonical queue'}`);
  requireValue(!existsSync(localPath(root, `${source}/specs/.joycraft-completion.pending.json`, true)), 'A pending completion journal blocks archival; recover it first');
  const queue = parseJson(readLocal(root, queuePath), queuePath);
  // The queue's feature stays the identity of the record; the folder only locates it.
  requireValue(typeof queue.feature === 'string' && featureFolderMatches(folder, queue.feature), `Queue feature does not match its folder ${source}: name the folder for the feature (${queue.feature}), optionally after a YYYY-MM-DD- date`);
  feature = queue.feature;
  const reconciliation = readReconciliation(root, source, feature, reconciliationPath);
  const evidence = [], unverified = [];
  for (const item of queue.specs ?? []) {
    const decide = () => historicalDecision(root, queuePath, readQueue({ root, queuePath, specId: item.id, criteria: item?.ownerAcceptance?.legacy !== true }), reconciliation);
    if (!asIs) { evidence.push(decide()); continue; }
    // As is: a spec that is not done, or whose acceptance does not hold, is listed, never accepted.
    let reason = item?.status === 'done' ? null : `status ${item?.status}`;
    if (!reason) { try { evidence.push(decide()); } catch (error) { reason = error.message; } }
    if (reason) unverified.push({ id: item?.id, file: item?.file, status: item?.status, reason, missingReceipts: missingReceipts(root, item) });
  }
  if (asIs) requireValue(Array.isArray(queue.specs) && queue.specs.length > 0, 'The queue has no specs');
  else requireValue(Array.isArray(queue.specs) && queue.specs.length > 0 && queue.specs.every(spec => spec.status === 'done'), 'Every spec must be done before archiving the whole feature');
  if (reconciliation) requireValue(reconciliation.used.size === reconciliation.record.entries.length, 'Archive reconciliation contains unused or stale entries');
  // Every spec holds its acceptance: as is changes nothing, so this is the normal archive.
  if (asIs && unverified.length === 0) asIs = false;
  const copies = new Map();
  for (const decision of evidence) {
    for (const evidencePath of [decision.path, decision.report?.path, ...decision.receipts.map(receipt => receipt.path)].filter(Boolean)) {
      if (!evidencePath.startsWith(`${source}/`)) copies.set(evidencePath, fileDigest(root, evidencePath));
    }
  }
  for (const decision of evidence) {
    for (const record of decision.requirementHistory ?? []) {
      if (record.reconciliationEntry !== undefined && !record.path.startsWith(`${source}/`)) copies.set(record.path, fileDigest(root, record.path));
    }
  }
  const files = [];
  const collect = relative => {
    for (const name of readdirSync(localDirectory(root, relative))) {
      const child = `${relative}/${name}`, stat = lstatSync(path.join(localDirectory(root, relative), name));
      if (stat.isDirectory()) collect(child); else files.push(fileDigest(root, child));
    }
  };
  collect(source);
  const requirementHistory = [...new Map(evidence.flatMap(decision => decision.requirementHistory ?? []).map(record => [canonical(record), record])).values()];
  return { schemaVersion: 1, feature, phase, source, destination, queuePath, namedFiles: namedFiles(root, source), attestation: parsedAttestation, evidence, requirementHistory, ...(asIs ? { asIs: { path: `${destination}/unverified.md`, ownerInstruction, unverified } } : {}), ...(reconciliation ? { reconciliation: { path: reconciliation.path, sha256: reconciliation.sha256, record: reconciliation.record } } : {}), featureFiles: files.sort((a, b) => a.path.localeCompare(b.path)), copiedEvidence: [...copies.values()].sort((a, b) => a.path.localeCompare(b.path)), historical: { codeInputHashesAreHistorical: true, currentAcceptanceRenewed: false, ...(reconciliation ? { acceptanceRecordsReconciled: true } : {}), ...(asIs ? { archivedAsIs: true } : {}) } };
}

/** Receipts and reports that a spec's acceptance records name but that are missing or changed. Reads only. */
function missingReceipts(root, spec) {
  const missing = [];
  const check = (file, digest) => {
    let bytes = null;
    try { bytes = readLocal(root, relativePath(file)); } catch { /* missing */ }
    if (bytes === null || (digest && sha256(bytes) !== digest)) { missing.push(file); return null; }
    return bytes;
  };
  const reports = [spec?.acceptedReport, spec?.waiver?.review];
  for (const record of [spec?.ownerAcceptance, spec?.waiver]) {
    if (!isObject(record) || !nonempty(record.path)) continue;
    const bytes = check(record.path, record.sha256);
    if (bytes !== null && record === spec?.ownerAcceptance && record.legacy !== true) { try { reports.push(JSON.parse(bytes.toString('utf8')).review); } catch { /* not JSON */ } }
  }
  for (const review of reports.filter(item => isObject(item) && nonempty(item.path))) {
    const bytes = check(review.path, review.sha256);
    let report;
    try { report = bytes && JSON.parse(bytes.toString('utf8')); } catch { continue; }
    for (const flow of Array.isArray(report?.flows) ? report.flows : []) for (const observation of Array.isArray(flow?.observations) ? flow.observations : []) {
      for (const receipt of Array.isArray(observation?.receipts) ? observation.receipts : []) if (isObject(receipt) && nonempty(receipt.path)) check(receipt.path, receipt.sha256);
    }
  }
  return [...new Set(missing)];
}

/** The note an as-is archive carries: what was not accepted, and the owner's words. It claims no acceptance. */
function unverifiedNote(plan) {
  const lines = [`# Archived as is: ${plan.feature}`, '', 'The owner had this feature archived without complete acceptance. Nothing here says that it was accepted or verified.', '', 'Owner instruction:', '', ...plan.asIs.ownerInstruction.split('\n').map(line => `> ${line}`), '', '## Specs not accepted', ''];
  if (plan.asIs.unverified.length === 0) lines.push('None: every spec held its acceptance.');
  for (const item of plan.asIs.unverified) {
    lines.push(`- Spec ${item.id} (\`${item.file}\`): ${item.reason}`);
    for (const file of item.missingReceipts) lines.push(`  - Missing or changed: \`${file}\``);
  }
  return `${lines.join('\n')}\n`;
}

function requirementProjection(bytes, record) {
  if (record.normalization === 'requirement-scope') return scopedRequirementForSubject(bytes, record.scope, record.path);
  if (record.normalization === 'spec-status') return specStatus(bytes).replace('__review_status__');
  if (record.normalization === 'queue-status') return normalizedQueueForSubject(parseJson(bytes, record.path));
  if (record.normalization === 'queue-scope') {
    requireValue(Number.isInteger(record.specId) && record.specId > 0, 'Restored queue scope needs its spec ID');
    return boundQueueForSubject(parseJson(bytes, record.path), record.specId).value;
  }
  return bytes;
}
const restoredPath = (destination, record) => `${destination}/evidence/requirements/${sha256(canonical(record))}/${relativePath(record.path)}`;

function replayManifest(plan) {
  const map = [
    ...plan.featureFiles.map(file => ({ originalPath: file.path, archivedPath: `${plan.destination}/feature/${file.path.slice(plan.source.length + 1)}`, sha256: file.sha256, operation: 'moved' })),
    ...plan.requirementHistory.map(record => ({ originalPath: record.path, archivedPath: restoredPath(plan.destination, record), sha256: record.restoredSha256, operation: 'restored-from-git', requirement: record })),
    ...plan.copiedEvidence.map(file => ({ originalPath: file.path, archivedPath: `${plan.destination}/evidence/${file.path}`, sha256: file.sha256, operation: 'copied' })),
  ];
  return { schemaVersion: 1, kind: 'joycraft-archive-replay', feature: plan.feature, archivedAt: new Date().toISOString(), phase: plan.phase, source: plan.source, evidence: plan.evidence, ...(plan.reconciliation ? { reconciliation: plan.reconciliation } : {}), ...(plan.asIs ? { asIs: { ...plan.asIs, sha256: sha256(Buffer.from(unverifiedNote(plan))) } } : {}), durableContext: plan.attestation.durableContext, hostSession: plan.attestation.host.sessionId, historical: plan.historical, files: map };
}

// The feature folder as the project names it: its own features home, bare or after ./, never
// inside a longer path (packages/app/docs/features/x), and ending at a path boundary, so
// docs/features/x.old and docs/features/x-two are other folders.
const namesFolder = source => new RegExp(`(?:(?<![\\w./-])|(?<=(?<![\\w./-])\\./))${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|/|[^\\w.-]|\\.(?!\\w))`);
// A migration may already be applied somewhere: archive lists it, never rewrites it.
const isMigrationPath = file => /(^|\/)migrations\//.test(file);

/**
 * Tracked non-Markdown files outside the features and archive folders that name
 * the feature folder, each with its first naming line and whether it is a test,
 * tests first. Archive lists them before the move; `--rewrite` fixes the listed
 * tests the agent judges editable (never an applied migration).
 */
function namedFiles(root, source) {
  if (!gitRoot(root)) return [];
  const { features, archive } = workPaths(root);
  const names = namesFolder(source);
  const found = [];
  for (const file of gitIn(root, ['ls-files', '-z']).split('\0').filter(Boolean)) {
    if (file.endsWith('.md') || under(file, features) || under(file, archive)) continue;
    let text;
    try { if (!lstatSync(path.join(root, file)).isFile()) continue; text = readFileSync(path.join(root, file), 'utf8'); } catch { continue; }
    const line = text.split('\n').findIndex(each => names.test(each));
    if (line >= 0) found.push({ path: file, line: line + 1, test: isTestPath(file), ...(isMigrationPath(file) ? { reportOnly: true } : {}) });
  }
  return found.sort((a, b) => Number(b.test) - Number(a.test) || a.path.localeCompare(b.path));
}

const refusal = message => Object.assign(new Error(message), { exitCode: 2 });

// Latin-1 maps each byte to one character and back, so a regular expression over it is a
// search over the raw bytes, and a UTF-8 path is matched by its UTF-8 bytes.
const asBytes = text => Buffer.from(text, 'utf8').toString('latin1');

/** The bytes of a listed file with each naming of `source` changed to `target`. Every other byte is kept, valid UTF-8 or not. */
function rewriteBytes(bytes, source, target) {
  const names = new RegExp(namesFolder(asBytes(source)).source, 'g'), replacement = asBytes(target);
  return Buffer.from(bytes.toString('latin1').replace(names, () => replacement), 'latin1');
}

/** Check a --rewrite list before any edit: each a listed file, and tests.focused recorded. Refuses with exit 2. */
function planRewrite(root, plan, rewrite) {
  const listed = new Map(plan.namedFiles.map(file => [file.path, file]));
  let files;
  try { files = [...new Set(rewrite.map(relativePath))]; } catch (error) { throw refusal(error.message); }
  for (const file of files) if (!listed.has(file)) throw refusal(`--rewrite ${file} is not a file the archive plan lists as naming ${plan.source}; listed: ${[...listed.keys()].join(', ') || 'none'}`);
  for (const file of files) if (listed.get(file).reportOnly) throw refusal(`--rewrite ${file} refused: a migration may already be applied, so archive lists it and never rewrites it; nothing was edited`);
  let focused;
  try { focused = readConfig(root).tests.focused; } catch (error) { throw refusal(error.message); }
  if (!focused) throw refusal('--rewrite needs tests.focused in joycraft.yaml, the command that runs the rewritten tests; nothing was edited');
  // The runner gets the rewritten tests; when none is a test, every rewritten file.
  const targets = files.filter(file => listed.get(file).test);
  const run = targets.length ? targets : files;
  let argv;
  try { argv = templateArgv(focused, run); } catch (error) { throw refusal(error.message); }
  // The pending record keeps each file's bytes as base64 in one JSON string, so the files must fit in it.
  let kept = 0;
  for (const file of files) {
    const size = statSync(path.join(root, file)).size;
    kept += Math.ceil(size / 3) * 4;
    if (kept > recordBudget) throw refusal(`--rewrite ${file} is too large to rewrite (${size} bytes): archive keeps a copy of every rewritten file in its pending record, which holds about ${Math.floor(recordBudget * 3 / 4 / 1048576)} MB in all; nothing was edited. Leave ${file} out of --rewrite and change ${plan.source} to ${plan.destination}/feature in it by hand after the archive`);
  }
  return { files: files.map(file => { const before = readFileSync(path.join(root, file)); return { path: file, before, after: rewriteBytes(before, plan.source, `${plan.destination}/feature`) }; }), argv };
}

const recordBudget = Math.floor(bufferConstants.MAX_STRING_LENGTH * 0.9);

/** The machine-local folder, made git-ignored when archive creates it. */
function ensureLocal(root) {
  const local = path.join(realpathSync(root), '.joycraft/local');
  if (!existsSync(local)) { mkdirSync(local, { recursive: true, mode: 0o700 }); writeFileSync(path.join(local, '.gitignore'), '*\n', { flag: 'wx', mode: 0o600 }); }
  return local;
}

/**
 * The pending record of an `--apply --rewrite`: written before the move and cleared only after
 * a green run or a finished restore, so an interrupted run (even SIGKILL) leaves behind what
 * archive changed: each rewritten file's bytes before and its sha256 after, and the sha256 of
 * every file archive placed in the staging and archive folders. Recovery undoes only that, and
 * only while everything is exactly as archive left it; otherwise it changes nothing and holds.
 */
const pendingHome = '.joycraft/local/archive-pending';
const pendingFile = folder => `${pendingHome}/${folder}.json`;

function writePending(root, record) {
  const text = `${JSON.stringify(record)}\n`;
  ensureLocal(root);
  const target = path.join(realpathSync(root), pendingFile(path.posix.basename(record.source)));
  mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  // Exclusive create: a second --apply of the same folder refuses here, before it stages anything.
  let fd;
  try { fd = openSync(target, 'wx', 0o600); }
  catch (error) {
    if (error.code === 'EEXIST') throw refusal(`Another archive --apply --rewrite of ${record.source} holds ${pendingFile(path.posix.basename(record.source))}; nothing was changed. Archive again when it has finished`);
    throw error;
  }
  try { writeSync(fd, text); } finally { closeSync(fd); }
}

/**
 * The run that owns a pending record: its process id, that process's start time (when `ps` can
 * read it) and a run id. A record whose owner is alive belongs to a live run, which no other call
 * may undo; recovery runs only when the owner is gone.
 */
const liveRuns = new Set();

function processStart(pid) {
  if (process.platform === 'win32') return { known: false };
  try {
    const out = execFileSync('ps', ['-o', 'stat=', '-o', 'lstart=', '-p', String(pid)], { encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' }, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const [state, ...start] = out.split(/\s+/);
    if (!state) return { known: false };
    const started = Date.parse(start.join(' '));
    return { known: true, zombie: state.startsWith('Z'), started: Number.isFinite(started) ? started : null };
  } catch { return { known: false }; }
}

const runOwner = run => ({ pid: process.pid, started: processStart(process.pid).started ?? null, run });

function ownerAlive(owner) {
  if (!isObject(owner) || !Number.isInteger(owner.pid) || owner.pid <= 0) return false;
  if (owner.pid === process.pid) return typeof owner.run === 'string' && liveRuns.has(owner.run);
  try { process.kill(owner.pid, 0); } catch (error) { if (error.code !== 'EPERM') return false; }
  const now = processStart(owner.pid);
  if (now.known && now.zombie) return false;
  if (now.known && typeof owner.started === 'number' && typeof now.started === 'number' && Math.abs(now.started - owner.started) > 1000) return false;
  return true;
}

/** The owner a record names, read from its first bytes when the whole record is not readable yet. */
function ownerOf(text) {
  const match = /^\{"owner":\{"pid":(\d+),"started":(null|\d+),"run":"([0-9a-f-]+)"\}/.exec(text);
  return match ? { pid: Number(match[1]), started: match[2] === 'null' ? null : Number(match[2]), run: match[3] } : null;
}

function inProgress(root, folder, owner) {
  const source = featurePath(root, folder);
  return { status: 'held', reason: 'in-progress', pending: pendingFile(folder), source, pid: owner.pid,
    message: `An archive --apply --rewrite of ${source} is running now (process ${owner.pid}), so archive changed nothing. Wait for it to finish, then archive again.` };
}

const clearPending = (root, source) => rmSync(path.join(realpathSync(root), pendingFile(path.posix.basename(source))), { force: true });

/** The feature folder a --feature value names among the pending records, or null. Read before the folder, which may be only in a staging folder. */
function pendingFor(root, name) {
  const home = path.join(realpathSync(root), pendingHome);
  if (!existsSync(home)) return null;
  const folders = readdirSync(home).filter(entry => entry.endsWith('.json')).map(entry => entry.slice(0, -'.json'.length)).filter(folder => featureFolderMatches(folder, name));
  if (folders.includes(name)) return name;
  requireValue(folders.length <= 1, `Feature ${name} matches more than one pending archive record in ${pendingHome}: ${folders.join(', ')}. Pass one of these folder names as --feature`);
  return folders[0] ?? null;
}

/** Git's porcelain status lines, or null without Git. */
function gitStatus(root) {
  if (!gitRoot(root)) return null;
  return gitIn(root, ['status', '--porcelain', '--untracked-files=all']).split('\n').filter(Boolean);
}

/** Paths whose status differs from `before`: what the red test itself changed. */
function changedSince(root, before) {
  const after = gitStatus(root);
  if (!Array.isArray(before) || !after) return [];
  const known = new Set(before);
  return after.filter(line => !known.has(line)).map(line => line.slice(3));
}

/** The folders of the archive home that do not exist yet, outermost first. */
function missingHome(root) {
  const missing = [];
  let current = '';
  for (const part of workPaths(root).archive.split('/')) {
    current = current ? `${current}/${part}` : part;
    if (!existsSync(path.join(realpathSync(root), current))) missing.push(current);
  }
  return missing;
}

function removeCreatedHome(root, created = []) {
  for (const folder of [...created].reverse()) {
    const local = path.join(realpathSync(root), folder);
    try { if (existsSync(local) && readdirSync(local).length === 0) rmdirSync(local); } catch { /* left for the user */ }
  }
}

const parentFolders = files => new Set([...files].flatMap(file => file.split('/').slice(0, -1).map((_, index, parts) => parts.slice(0, index + 1).join('/'))));
const normalizedPath = value => { try { return typeof value === 'string' && relativePath(value) === value; } catch { return false; } };

/**
 * Why a pending record is not one archive wrote for this folder: its paths must be the ones the
 * archive plan computes under paths.features and paths.archive, and each file a tracked file the
 * scan lists, whose saved bytes name the folder and whose after sha256 is archive's rewrite of them.
 */
function recordProblems(root, folder, record) {
  const problems = [];
  const check = (ok, message) => { if (!ok) problems.push(message); return ok; };
  if (!check(isObject(record) && record.schemaVersion === 2 && record.kind === 'joycraft-archive-pending', 'it is not a schemaVersion 2 joycraft-archive-pending record')) return problems;
  const { features, archive } = workPaths(root);
  const source = featurePath(root, folder), destination = archivePath(root, folder), stagePrefix = `${archive}/.${folder}.staging-`;
  check(record.source === source, `its source ${JSON.stringify(record.source)} is not ${source}`);
  check(record.destination === destination, `its destination ${JSON.stringify(record.destination)} is not ${destination}`);
  check(typeof record.stage === 'string' && record.stage.startsWith(stagePrefix) && /^\d+-\d+$/.test(record.stage.slice(stagePrefix.length)), `its stage ${JSON.stringify(record.stage)} is not ${stagePrefix}<pid>-<time>`);
  const homes = archive.split('/').map((_, index, parts) => parts.slice(0, index + 1).join('/'));
  check(Array.isArray(record.createdHome) && record.createdHome.every(item => homes.includes(item)), 'its createdHome names a folder outside the archive home');
  check(Array.isArray(record.placed) && record.placed.every(item => isObject(item) && normalizedPath(item.path) && !under(item.path, 'feature') && isSha256(item.sha256)), 'its placed list is not a list of archive files with sha256');
  check(Array.isArray(record.featureFiles) && record.featureFiles.length > 0 && record.featureFiles.every(item => isObject(item) && normalizedPath(item.path) && item.path.startsWith('feature/') && isSha256(item.sha256)), 'its featureFiles list is not a list of feature files with sha256');
  if (!check(Array.isArray(record.files) && record.files.length > 0, 'its files list is empty or missing')) return problems;
  const tracked = gitRoot(root) ? new Set(gitIn(root, ['ls-files', '-z']).split('\0').filter(Boolean)) : null;
  if (!check(tracked, 'the project is not a Git repository, so its files cannot be checked')) return problems;
  const seen = new Set();
  for (const file of record.files) {
    if (!check(isObject(file) && normalizedPath(file.path) && typeof file.bytes === 'string' && isSha256(file.sha256) && isSha256(file.after), 'a files entry lacks a path, bytes, sha256 or after')) continue;
    check(!seen.has(file.path), `${file.path} is listed twice`);
    seen.add(file.path);
    check(tracked.has(file.path) && !file.path.endsWith('.md') && !under(file.path, features) && !under(file.path, archive) && !isMigrationPath(file.path), `${file.path} is not a tracked file the archive scan lists`);
    // The scan lists a file that names the folder; after the rewrite it names the archive path.
    const local = path.join(realpathSync(root), file.path);
    const current = existsSync(local) && lstatSync(local).isFile() ? readFileSync(local).toString('latin1') : null;
    check(current === null || namesFolder(asBytes(source)).test(current) || namesFolder(asBytes(`${destination}/feature`)).test(current), `${file.path} names neither ${source} nor ${destination}/feature, so the archive scan would not list it`);
    const before = Buffer.from(file.bytes, 'base64');
    check(sha256(before) === file.sha256, `the saved bytes of ${file.path} do not match their sha256`);
    check(namesFolder(asBytes(source)).test(before.toString('latin1')), `the saved bytes of ${file.path} do not name ${source}`);
    check(sha256(rewriteBytes(before, source, `${destination}/feature`)) === file.after, `the after sha256 of ${file.path} is not archive's rewrite of its saved bytes`);
  }
  return problems;
}

/** What differs between a holder folder and the files archive placed in it (holder-relative path to sha256). */
function holderDifferences(root, holder, expected, { partial = false } = {}) {
  const differences = [], found = new Set(), folders = parentFolders(expected.keys());
  const base = projectTarget(root, holder);
  const walk = relative => {
    for (const name of readdirSync(relative ? path.join(base, relative) : base)) {
      const child = relative ? `${relative}/${name}` : name, stat = lstatSync(path.join(base, child));
      if (stat.isDirectory() && (folders.has(child) || under(child, 'feature'))) walk(child);
      else if (stat.isFile() && expected.has(child)) {
        found.add(child);
        if (sha256(readFileSync(path.join(base, child))) !== expected.get(child)) differences.push(`${holder}/${child} changed after archive placed it`);
      } else differences.push(`${holder}/${child} was not placed there by archive`);
    }
  };
  walk('');
  if (!partial) for (const file of expected.keys()) if (!found.has(file)) differences.push(`${holder}/${file} is missing`);
  return differences;
}

/** Remove the files archive placed in a holder while their bytes are still archive's, then its folders only when empty. */
function removePlaced(root, holder, expected) {
  const base = projectTarget(root, holder);
  for (const [file, digest] of expected) {
    const local = path.join(base, file);
    if (existsSync(local) && lstatSync(local).isFile() && sha256(readFileSync(local)) === digest) rmSync(local);
  }
  for (const folder of [...parentFolders(expected.keys())].sort((a, b) => b.split('/').length - a.split('/').length)) {
    try { rmdirSync(path.join(base, folder)); } catch { /* not empty: left as it is */ }
  }
  try { rmdirSync(base); } catch { /* not empty: left as it is */ }
}

/**
 * Undo an interrupted --apply --rewrite from its record, by construction: first check that the
 * record is archive's own for this folder and that every listed file, the feature folder and each
 * holder folder are exactly as archive left them; only then put the files back, move the folder
 * back and remove what archive placed. When anything differs, nothing changes and the differences
 * are returned.
 */
function restoreRecord(root, folder, record, { only } = {}) {
  const problems = recordProblems(root, folder, record);
  if (problems.length) return { restored: false, differences: problems.map(problem => `the pending record is refused: ${problem}`) };
  const { source, destination, stage } = record;
  const exists = relative => existsSync(projectTarget(root, relative));
  const placed = new Map(record.placed.map(item => [item.path, item.sha256]));
  const full = new Map([...placed, ...record.featureFiles.map(item => [item.path, item.sha256])]);
  const differences = [];
  const atSource = exists(source), inStage = exists(`${stage}/feature`), inDestination = exists(`${destination}/feature`);
  let holder = null;
  if (atSource && !inStage && !inDestination) {
    if (exists(destination)) differences.push(`${destination} exists although archive never moved the feature folder there`);
    if (exists(stage)) differences.push(...holderDifferences(root, stage, placed, { partial: true }));
  } else if (!atSource && inStage !== inDestination) {
    holder = inStage ? stage : destination;
    const other = inStage ? destination : stage;
    if (exists(other)) differences.push(`${other} exists next to the moved feature folder`);
    differences.push(...holderDifferences(root, holder, full));
  } else {
    const places = [atSource && source, inStage && `${stage}/feature`, inDestination && `${destination}/feature`].filter(Boolean);
    differences.push(`the feature folder must be at exactly one of ${source}, ${stage}/feature or ${destination}/feature; it is at ${places.join(' and ') || 'none of them'}`);
  }
  const restore = [];
  // `only`: the files this run has written so far; the others were never touched, so they are left as they are.
  for (const file of record.files.filter(each => !only || only.has(each.path))) {
    const local = projectTarget(root, file.path);
    const current = existsSync(local) && lstatSync(local).isFile() ? sha256(readFileSync(local)) : null;
    if (current === file.after) restore.push(file);
    else if (current !== file.sha256) differences.push(current === null ? `${file.path} is missing` : `${file.path} changed after archive rewrote it`);
  }
  if (differences.length) return { restored: false, differences };
  if (holder) renameSync(projectTarget(root, `${holder}/feature`), projectTarget(root, source));
  for (const file of restore) writeFileSync(projectTarget(root, file.path), Buffer.from(file.bytes, 'base64'));
  if (holder) removePlaced(root, holder, placed);
  else if (exists(stage)) removePlaced(root, stage, placed);
  removeCreatedHome(root, record.createdHome);
  clearPending(root, source);
  return { restored: true };
}

/** The held result when a pending record cannot be undone safely: what differs and the manual steps. Nothing was changed. */
function heldUnverified(root, folder, record, differences, extra = {}) {
  const pending = pendingFile(folder), { archive } = workPaths(root);
  const source = featurePath(root, folder), destination = archivePath(root, folder);
  const files = Array.isArray(record?.files) ? record.files.map(file => file?.path).filter(nonempty) : [];
  const which = files.length ? `each file archive rewrote (${files.join(', ')})` : `each file that names ${destination}/feature`;
  return { status: 'held', reason: 'interrupted-unverified', pending, source, destination, ...(files.length ? { rewritten: files } : {}), differences,
    steps: [
      'Run git status to see what the interrupted archive left.',
      `For ${which}: if it still names ${destination}/feature and you did not edit it since, run git restore -- <file>; if you edited it, keep your edits and change ${destination}/feature back to ${source} by hand.${files.length ? ` The original bytes are in ${pending} under files[].bytes (base64).` : ''}`,
      `If ${source} is missing, move the feature folder back to it from ${destination}/feature or ${archive}/.${folder}.staging-*/feature. Keep anything you added there.`,
      `In ${destination} and ${archive}/.${folder}.staging-*, remove only what archive placed (archive-recovery.json, archive-replay.json, unverified.md, evidence/); keep your own files.`,
      `Delete ${pending}, then archive again.`,
    ],
    ...extra,
    message: `An earlier archive --apply --rewrite was interrupted, and the project is no longer exactly as archive left it, so archive changed nothing and nothing is archived. What differs: ${differences.join('; ')}. Follow the steps, then archive again.` };
}

/** A pending record left by an interrupted rewrite: undo it when safe, and hold either way. Null when none. */
function recoverPending(root, name) {
  const folder = pendingFor(root, name);
  if (!folder) return null;
  const file = path.join(realpathSync(root), pendingFile(folder));
  let record, text = '', failure;
  // A live run writes its record in one write; a reader that sees it half written waits briefly.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try { text = readFileSync(file, 'utf8'); record = JSON.parse(text); failure = null; break; }
    catch (error) {
      failure = error;
      if (error.code === 'ENOENT') return null;
      const owner = ownerOf(text);
      if (owner && ownerAlive(owner)) return inProgress(root, folder, owner);
      if (owner === null && text.length > 0) break;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  }
  if (failure) return heldUnverified(root, folder, null, [`${pendingFile(folder)} is not a readable JSON record (${failure.message})`]);
  if (isObject(record) && ownerAlive(record.owner)) return inProgress(root, folder, record.owner);
  let outcome;
  try { outcome = restoreRecord(root, folder, record); } catch (error) { outcome = { restored: false, differences: [error.message] }; }
  if (!outcome.restored) return heldUnverified(root, folder, record, outcome.differences);
  return { status: 'held', reason: 'interrupted', source: record.source, destination: record.destination, rewritten: record.files.map(each => each.path), testChanged: changedSince(root, record.statusBefore),
    message: `An earlier archive --apply --rewrite stopped before its tests finished. Everything was still as archive left it, so the listed files were restored byte for byte, the feature folder is back at ${record.source} and what archive placed was removed; nothing is archived. Archive again.` };
}

/** Undo this run's own rewrite and move; a failure is reported as differences, never thrown. */
function undoRun(root, plan, record) {
  try { return restoreRecord(root, path.posix.basename(plan.source), record); } catch (error) { return { restored: false, differences: [error.message] }; }
}

/**
 * After the move: rewrite the folder path in the listed files and run them through evidence.mjs.
 * A SIGINT, SIGTERM or SIGHUP during the run stops the test, restores and moves back, then exits.
 */
async function rewriteAndTest(root, plan, rewrite, record) {
  // Right before each write the file must still be the bytes archive read; a save in between stops the run.
  const written = new Set();
  for (const file of rewrite.files) {
    const local = path.join(root, file.path);
    const current = existsSync(local) && lstatSync(local).isFile() ? readFileSync(local) : null;
    if (current === null || !current.equals(file.before)) return { changed: file.path, written };
    writeFileSync(local, file.after);
    written.add(file.path);
  }
  ensureLocal(root);
  const receipt = `.joycraft/local/receipts/archive-${plan.feature}-${new Date().toISOString().replace(/[-:.]/g, '')}.log`;
  const evidence = path.join(path.dirname(fileURLToPath(import.meta.url)), 'evidence.mjs');
  const child = spawn(process.execPath, [evidence, 'run', '--receipt', receipt, '--', ...rewrite.argv], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  const closed = new Promise((resolve, reject) => { child.once('error', reject); child.once('close', code => resolve(code)); });
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];
  let stopping = false;
  const stop = signal => {
    if (stopping) return;
    stopping = true;
    child.kill('SIGTERM');
    const force = setTimeout(() => child.kill('SIGKILL'), 5000);
    const finish = () => {
      clearTimeout(force);
      const undone = undoRun(root, plan, record);
      const note = undone.restored ? 'the listed files were restored and the feature folder moved back'
        : `nothing was undone because ${undone.differences.join('; ')}; the pending record ${pendingFile(path.posix.basename(plan.source))} remains, and the next archive call lists the steps`;
      process.stderr.write(`Archive interrupted by ${signal}: ${note}. Nothing is archived.\n`);
      process.exit(128 + (os.constants.signals[signal] ?? 1));
    };
    closed.then(finish, finish);
  };
  for (const signal of signals) process.on(signal, stop);
  let status;
  try { status = await closed; } finally { if (!stopping) for (const signal of signals) process.off(signal, stop); }
  if (stopping) await new Promise(() => {});
  let parsed = null;
  try { parsed = JSON.parse(stdout); } catch { /* A refusal prints no result. */ }
  return { receipt, command: rewrite.argv.join(' '), exitCode: parsed?.command?.exitCode ?? status, ...(parsed ? {} : { error: stderr.trim() }) };
}

export async function archiveFeature(options) {
  const run = randomUUID();
  liveRuns.add(run);
  try { return await archiveRun(options, run); } finally { liveRuns.delete(run); }
}

/** Held unless the destination holds the feature folder and the source is gone. Null when archived. */
function notArchived(root, plan, extra = {}) {
  const there = existsSync(projectTarget(root, `${plan.destination}/feature`)), gone = !existsSync(projectTarget(root, plan.source));
  if (there && gone) return null;
  const what = [there ? null : `${plan.destination}/feature is missing`, gone ? null : `${plan.source} still exists`].filter(Boolean).join(' and ');
  return { status: 'held', reason: 'not-archived', source: plan.source, destination: plan.destination, ...extra,
    message: `Archive finished its steps, but ${what}, so it does not report archived. Run git status, check both places, and archive again.` };
}

async function archiveRun(options, run) {
  const root = options.root ?? process.cwd();
  // Pending records first: an interrupted move can leave the folder only in a staging folder.
  const recovered = recoverPending(root, featureName(options.feature));
  if (recovered) return recovered;
  const plan = previewArchiveFeature(options);
  if (plan.existing) return { status: 'archived', unchanged: true, destination: plan.destination, manifest: plan.manifest, historical: plan.historical, ...(plan.unverified ? { unverified: plan.unverified } : {}) };
  const notNeeded = options.asIs === true && !plan.asIs ? { asIs: 'not-needed' } : {};
  const rewriteList = options.rewrite ?? [];
  if (rewriteList.length && options.apply !== true) throw refusal('--rewrite needs --apply');
  if (options.apply !== true) return { status: 'preview', plan, ...notNeeded };
  const rewrite = rewriteList.length ? planRewrite(root, plan, rewriteList) : null;
  // Revalidate every input immediately before changing paths, so a preview cannot race a writer.
  const fresh = previewArchiveFeature({ ...options, root, apply: false });
  requireValue(canonical({ ...plan, attestation: undefined }) === canonical({ ...fresh, attestation: undefined }), 'Archive inputs changed after preview; rerun the session-end preflight');
  const stage = `${workPaths(root).archive}/.${path.posix.basename(plan.destination)}.staging-${process.pid}-${Date.now()}`;
  const stageLocal = projectTarget(root, stage), destinationLocal = projectTarget(root, plan.destination), sourceLocal = localDirectory(root, plan.source);
  requireValue(!existsSync(stageLocal) && !existsSync(destinationLocal), 'Archive collision detected before move');
  const createdHome = missingHome(root);
  // Every byte archive places is fixed here, so the pending record can name each file's sha256.
  const recoveryText = `${JSON.stringify({ schemaVersion: 1, kind: 'joycraft-archive-recovery', feature: plan.feature, source: plan.source, destination: plan.destination, stage, phase: plan.phase, featureFiles: plan.featureFiles, copiedEvidence: plan.copiedEvidence, requirementHistory: plan.requirementHistory }, null, 2)}\n`;
  const note = plan.asIs ? unverifiedNote(plan) : null;
  const replayText = `${JSON.stringify(replayManifest(plan), null, 2)}\n`;
  const placed = [
    { path: 'archive-recovery.json', sha256: sha256(Buffer.from(recoveryText)) },
    ...plan.copiedEvidence.map(copy => ({ path: `evidence/${copy.path}`, sha256: copy.sha256 })),
    ...plan.requirementHistory.map(record => ({ path: restoredPath(plan.destination, record).slice(plan.destination.length + 1), sha256: record.restoredSha256 })),
    ...(note === null ? [] : [{ path: 'unverified.md', sha256: sha256(Buffer.from(note)) }]),
    { path: 'archive-replay.json', sha256: sha256(Buffer.from(replayText)) },
  ];
  const pending = rewrite && { owner: runOwner(run), schemaVersion: 2, kind: 'joycraft-archive-pending', feature: plan.feature, source: plan.source, destination: plan.destination, stage, createdHome, statusBefore: gitStatus(root),
    files: rewrite.files.map(file => ({ path: file.path, sha256: sha256(file.before), after: sha256(file.after), bytes: file.before.toString('base64') })),
    placed, featureFiles: plan.featureFiles.map(file => ({ path: `feature/${file.path.slice(plan.source.length + 1)}`, sha256: file.sha256 })) };
  if (pending) writePending(root, pending);
  else if (pendingFor(root, path.posix.basename(plan.source)) === path.posix.basename(plan.source)) throw refusal(`Another archive --apply --rewrite of ${plan.source} started meanwhile; nothing was changed. Archive again when it has finished`);
  mkdirSync(stageLocal, { recursive: true, mode: 0o700 });
  try {
    writeFileSync(path.join(stageLocal, 'archive-recovery.json'), recoveryText, { flag: 'wx', mode: 0o600 });
    for (const copy of plan.copiedEvidence) {
      const target = path.join(stageLocal, 'evidence', copy.path);
      mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
      cpSync(localPath(root, copy.path), target, { dereference: false, errorOnExist: true });
      requireValue(sha256(readFileSync(target)) === copy.sha256, `Historical evidence changed while copying: ${copy.path}`);
    }
    for (const record of plan.requirementHistory) {
      const bytes = committedBytes(root, record.acceptedCommit, record.path);
      requireValue(bytes !== null && sha256(bytes) === record.restoredSha256 && sha256(requirementProjection(bytes, record)) === record.acceptedSha256, `Historical requirement changed while restoring: ${record.path}`);
      const target = path.join(stageLocal, restoredPath(plan.destination, record).slice(plan.destination.length + 1));
      mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
      writeFileSync(target, bytes, { flag: 'wx', mode: 0o600 });
    }
    if (note !== null) writeFileSync(path.join(stageLocal, 'unverified.md'), note, { flag: 'wx', mode: 0o600 });
    writeFileSync(path.join(stageLocal, 'archive-replay.json'), replayText, { flag: 'wx', mode: 0o600 });
    // One final source check protects the move after staging completes.
    const latest = previewArchiveFeature({ ...options, root, apply: false });
    requireValue(canonical(plan) === canonical(latest), 'Archive inputs changed during staging; rerun the session-end preflight');
    renameSync(sourceLocal, path.join(stageLocal, 'feature'));
    renameSync(stageLocal, destinationLocal);
  } catch (error) {
    const stagedFeature = path.join(stageLocal, 'feature');
    let restored = true;
    try { if (existsSync(stagedFeature) && !existsSync(sourceLocal)) renameSync(stagedFeature, sourceLocal); } catch { restored = false; }
    restored = restored && existsSync(sourceLocal) && !existsSync(stagedFeature);
    if (restored && existsSync(stageLocal)) rmSync(stageLocal, { recursive: true, force: true });
    if (restored) { removeCreatedHome(root, createdHome); if (pending) clearPending(root, plan.source); }
    const recovery = restored ? 'The live feature path was preserved.' : `The staged feature remains at ${stage}; restore it manually before retrying.`;
    throw new Error(`Archive stopped without accepting new completion: ${error.message}. ${recovery}`);
  }
  // The rewritten tests read the archive path, so they run once the folder is there; on red
  // the move and the edits are undone and nothing is archived.
  let tested;
  if (rewrite) {
    try { tested = await rewriteAndTest(root, plan, rewrite, pending); }
    catch (error) {
      const undone = undoRun(root, plan, pending);
      if (!undone.restored) return heldUnverified(root, path.posix.basename(plan.source), pending, undone.differences, { error: error.message });
      throw new Error(`Archive stopped before accepting the move: ${error.message}. The feature folder and the listed files were restored.`);
    }
    if (tested.changed) {
      // A save to a listed file after archive read it: undo only what this run did, keep the save.
      const folder = path.posix.basename(plan.source);
      const changed = `${tested.changed} changed after archive read it (a save while archive was staging)`;
      let undone;
      try { undone = restoreRecord(root, folder, pending, { only: tested.written }); } catch (error) { undone = { restored: false, differences: [error.message] }; }
      if (!undone.restored) return heldUnverified(root, folder, pending, [changed, ...undone.differences]);
      return { status: 'held', reason: 'edited-during-archive', changed: tested.changed, source: plan.source, destination: plan.destination,
        message: `${changed}, so archive wrote nothing more, undid its own changes and moved the feature folder back to ${plan.source}; your save is kept and nothing is archived. Archive again.` };
    }
    if (tested.exitCode !== 0) {
      const undone = undoRun(root, plan, pending);
      if (!undone.restored) return heldUnverified(root, path.posix.basename(plan.source), pending, undone.differences, { test: tested, testChanged: changedSince(root, pending.statusBefore) });
      return { status: 'held', source: plan.source, destination: plan.destination, rewritten: rewrite.files.map(file => file.path), test: tested, testChanged: changedSince(root, pending.statusBefore),
        reason: `The rewritten tests failed (${tested.command}); the files were restored and nothing moved. Read ${tested.receipt}, fix the tests or leave them out of --rewrite, and archive again.` };
    }
    // The record must still be this run's, and the folder where this run put it.
    let own = null;
    try { own = JSON.parse(readFileSync(path.join(realpathSync(root), pendingFile(path.posix.basename(plan.source))), 'utf8')); } catch { /* checked below */ }
    if (own?.owner?.run !== run) return { status: 'held', reason: 'not-archived', source: plan.source, destination: plan.destination, test: tested,
      message: `The pending record of this run is gone or was replaced while the tests ran, so archive does not report archived. Run git status, check ${plan.source} and ${plan.destination}, and archive again.` };
    const missing = notArchived(root, plan, { test: tested });
    if (missing) return missing;
    clearPending(root, plan.source);
  } else {
    const missing = notArchived(root, plan);
    if (missing) return missing;
  }
  let links;
  try { links = relinkLive(root, plan); } catch (error) { links = { error: error.message }; }
  const afterArchive = runAfterArchive(root, plan);
  return { status: 'archived', destination: plan.destination, manifest: `${plan.destination}/archive-replay.json`, historical: plan.historical, ...(plan.asIs ? { unverified: plan.asIs.path } : {}), ...notNeeded, ...(rewrite ? { rewritten: rewrite.files.map(file => file.path), test: tested } : {}), links, ...(afterArchive ? { afterArchive } : {}) };
}

/** The common parent folder of the context, features and archive homes ('.' when they share none). */
function docsRoot(root) {
  const parts = Object.values(workPaths(root)).map(folder => folder.split('/'));
  const common = [];
  for (let index = 0; parts.every(list => index < list.length - 1 && list[index] === parts[0][index]); index += 1) common.push(parts[0][index]);
  return common.join('/') || '.';
}

const under = (file, folder) => folder === '.' || file === folder || file.startsWith(`${folder}/`);

/** Live project files: Git's tracked and unignored files, or the docs root's files without Git. Symlinks are skipped. */
function liveFiles(root, docs) {
  const plainFile = file => { try { return lstatSync(path.join(root, file)).isFile(); } catch { return false; } };
  if (gitRoot(root)) return gitIn(root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0').filter(file => file && plainFile(file));
  const files = [];
  const walk = relative => {
    const local = path.join(root, relative);
    if (!existsSync(local) || lstatSync(local).isSymbolicLink()) return;
    for (const name of readdirSync(local)) {
      if (name.startsWith('.')) continue;
      const child = relative === '.' ? name : `${relative}/${name}`, stat = lstatSync(path.join(root, child));
      if (stat.isDirectory()) walk(child); else if (stat.isFile()) files.push(child);
    }
  };
  walk(docs);
  return files;
}

/** The [start, end) offsets of the inline code spans on one line. */
function codeSpans(line) {
  const spans = [];
  for (let index = 0; index < line.length;) {
    const open = /`+/g; open.lastIndex = index;
    const start = open.exec(line);
    if (!start) break;
    const close = new RegExp(`(?<!\`)${start[0]}(?!\`)`, 'g'); close.lastIndex = start.index + start[0].length;
    const end = close.exec(line);
    if (!end) { index = start.index + start[0].length; continue; }
    spans.push([start.index, end.index + end[0].length]);
    index = end.index + end[0].length;
  }
  return spans;
}

/**
 * Each line of Markdown, marked `code` inside a fenced or indented code block. A fence
 * closes only on its own marker character, at least as long, as CommonMark says.
 */
function markdownLines(text) {
  let fence = null, previous = 'blank';
  return text.split('\n').map(line => {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    let code = true;
    if (fence) { if (marker && marker[0] === fence[0] && marker.length >= fence.length && /^ {0,3}[`~]+\s*$/.test(line)) fence = null; }
    else if (marker && !(marker[0] === '`' && line.trimStart().slice(marker.length).includes('`'))) fence = marker;
    // An indented code block starts after a blank line; it cannot continue a paragraph.
    else code = /^( {4}|\t)/.test(line) && line.trim() !== '' && previous !== 'text';
    previous = line.trim() === '' ? 'blank' : code ? 'code' : 'text';
    return { line, code };
  });
}

const entryFile = file => ['AGENTS.md', 'CLAUDE.md'].includes(path.posix.basename(file));

/**
 * After a move: rewrite Markdown links into the moved folder in live docs under the docs
 * root. Never rewrite the features or archive folders (working material and history whose
 * receipts are pinned), reports, receipts or entry files; list those, and live files that
 * name the folder in other words, unedited.
 */
function relinkLive(root, plan) {
  const { source, destination } = plan;
  const docs = docsRoot(root), { features, archive } = workPaths(root);
  const evidence = new Set([...plan.copiedEvidence.map(file => file.path), ...plan.evidence.flatMap(decision => [decision.path, decision.report?.path].filter(Boolean))]);
  const names = new RegExp(`(?<![\\w-])${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`);
  const result = { rewritten: [], namedInMarkdown: [], namedInOtherFiles: [] };
  for (const file of liveFiles(root, docs).filter(file => !under(file, archive)).sort()) {
    const local = path.join(root, file);
    let text;
    try { text = readFileSync(local, 'utf8'); } catch { continue; }
    if (!file.endsWith('.md')) {
      if (names.test(text)) result.namedInOtherFiles.push(file);
      continue;
    }
    const editable = under(file, docs) && !under(file, features) && !evidence.has(file) && !entryFile(file);
    let changed = false, links = false;
    const lines = markdownLines(text).map(({ line, code }, index) => {
      if (code) return line;
      const spans = codeSpans(line);
      // Inline links `](target)` and reference definitions `[label]: target`.
      return line.replace(/(\]\(\s*<?|^\s{0,3}\[[^\]]+\]:\s*<?)([^)\s>]+)/g, (match, lead, target, offset) => {
        if (spans.some(([start, end]) => offset >= start && offset < end)) return match;
        if (/^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith('#') || target.startsWith('/')) return match;
        const [, bare, suffix] = /^([^#?]*)(.*)$/.exec(target);
        const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), bare)).replace(/\/$/, '');
        if (!under(resolved, source)) return match;
        if (!editable) { links = true; return match; }
        const moved = `${destination}/feature${resolved.slice(source.length)}`;
        const link = `${path.posix.relative(path.posix.dirname(file), moved) || '.'}${bare.endsWith('/') ? '/' : ''}${suffix}`;
        result.rewritten.push({ path: file, line: index + 1, from: target, to: link });
        changed = true;
        return `${lead}${link}`;
      });
    });
    const next = lines.join('\n');
    if (changed) writeFileSync(local, next);
    if (links || names.test(next)) result.namedInMarkdown.push(file);
  }
  return result;
}

/** Run the project's hooks.afterArchive once. Its failure is reported; the archive stands. */
function runAfterArchive(root, plan) {
  let command;
  try { command = readConfig(root).hooks.afterArchive; } catch (error) { return { ran: false, error: error.message }; }
  if (!command) return null;
  const result = spawnSync(command, {
    cwd: root, shell: true, encoding: 'utf8', timeout: 600_000, maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, JOYCRAFT_FEATURE: plan.feature, JOYCRAFT_ARCHIVE_PATH: plan.destination, JOYCRAFT_SOURCE_PATH: plan.source },
  });
  const tail = text => (text ?? '').split('\n').slice(-20).join('\n').trim();
  return { ran: true, command, exitCode: result.status, ok: result.status === 0 && !result.error,
    ...(result.error ? { error: result.error.message } : {}), stdout: tail(result.stdout), stderr: tail(result.stderr) };
}

const preferencesFile = '.joycraft/preferences.json';

/** The project's preferences (schemaVersion 1 when absent), refusing a symlinked path as preferences.mjs does. */
function readPreferences(root) {
  let current = realpathSync(root);
  for (const part of preferencesFile.split('/')) {
    current = path.join(current, part);
    if (!existsSync(current)) return { schemaVersion: 1 };
    const stat = lstatSync(current);
    requireValue(!stat.isSymbolicLink() && (part === 'preferences.json' ? stat.isFile() : stat.isDirectory()), `Expected a plain project file: ${preferencesFile}`);
  }
  const preferences = parseJson(readFileSync(current), preferencesFile);
  requireValue(isObject(preferences), `${preferencesFile} must contain an object`);
  return preferences;
}

/**
 * Whether the project's `.ignore` lists the archive folder, so rg and similar searches skip
 * history: `present`, `declined` (the user said no), or `missing`. `apply` appends `<archive>/`
 * once, creating the file; `decline` records the no in preferences, keeping other keys.
 */
export function archiveIgnore({ root = process.cwd(), apply = false, decline = false } = {}) {
  const archive = workPaths(root).archive.replace(/\/+$/, '');
  const line = `${archive}/`, file = path.join(root, '.ignore');
  const text = existsSync(file) ? readFileSync(file, 'utf8') : null;
  // Git strips trailing spaces but keeps leading ones, which are part of the pattern.
  const pattern = item => item.replace(/\s+$/, '').replace(/^\.?\//, '').replace(/\/\*\*$/, '').replace(/\/+$/, '');
  if ((text ?? '').split(/\r?\n/).map(pattern).includes(archive)) return { file: '.ignore', line, status: 'present' };
  if (decline) {
    const preferences = readPreferences(root);
    const target = path.join(realpathSync(root), preferencesFile), temporary = `${target}.archive-${process.pid}`;
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(temporary, `${JSON.stringify({ ...preferences, archive: { ...(isObject(preferences.archive) ? preferences.archive : {}), ignore: 'declined' } }, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    renameSync(temporary, target);
    return { file: '.ignore', line, status: 'declined' };
  }
  if (!apply) return { file: '.ignore', line, status: readPreferences(root).archive?.ignore === 'declined' ? 'declined' : 'missing' };
  const eol = text?.includes('\r\n') ? '\r\n' : '\n';
  writeFileSync(file, `${text ?? ''}${text && !text.endsWith('\n') ? eol : ''}${line}${eol}`);
  return { file: '.ignore', line, status: 'added' };
}

function argumentsFor(argv) {
  const [command, ...args] = argv;
  requireValue(command === 'archive', 'Usage: archive.mjs ignore --check | --apply | --decline, or archive.mjs archive --feature <feature or folder name> --phase session-end --attestation <path> [--reconciliation <path>] [--as-is --owner-instruction <text>] [--apply [--rewrite <path>]...]');
  const flags = { '--rewrite': [] };
  for (let index = 0; index < args.length; index += 1) {
    if (['--apply', '--as-is'].includes(args[index])) { requireValue(flags[args[index]] === undefined, `Duplicate ${args[index]}`); flags[args[index]] = true; continue; }
    if (args[index] === '--rewrite') { requireValue(nonempty(args[index + 1]) && !args[index + 1].startsWith('--'), '--rewrite needs a listed file path'); flags['--rewrite'].push(args[index + 1]); index += 1; continue; }
    requireValue(['--feature', '--phase', '--attestation', '--reconciliation', '--owner-instruction'].includes(args[index]) && nonempty(args[index + 1]) && flags[args[index]] === undefined, `Invalid or duplicate argument: ${args[index]}`);
    requireValue(args[index] !== '--owner-instruction' || !args[index + 1].startsWith('--'), '--owner-instruction needs the owner\'s words as its value; the text cannot start with --');
    flags[args[index]] = args[index + 1]; index += 1;
  }
  requireValue(flags['--feature'] && flags['--phase'] && flags['--attestation'], 'Archive needs --feature, --phase and --attestation');
  requireValue(!flags['--as-is'] || flags['--owner-instruction'], 'Archive --as-is needs --owner-instruction "<the owner\'s own words>"');
  return flags;
}

export async function main(argv = process.argv.slice(2)) {
  if (argv[0] === 'ignore') {
    requireValue(argv.length === 2 && ['--check', '--apply', '--decline'].includes(argv[1]), 'Usage: archive.mjs ignore --check | --apply | --decline');
    const result = archiveIgnore({ apply: argv[1] === '--apply', decline: argv[1] === '--decline' });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return result;
  }
  const flags = argumentsFor(argv);
  const result = await archiveFeature({ feature: flags['--feature'], phase: flags['--phase'], attestation: flags['--attestation'], reconciliation: flags['--reconciliation'], asIs: flags['--as-is'] === true, ownerInstruction: flags['--owner-instruction'], apply: flags['--apply'] === true, rewrite: flags['--rewrite'] });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status === 'held') process.exitCode = 2;
  // The archive stands; exit 3 tells a caller that only the after-archive hook failed.
  if (result.afterArchive && !result.afterArchive.ok) process.exitCode = 3;
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`Archive stopped: ${error.message}\n`); process.exitCode = error.exitCode ?? 1; });
}
