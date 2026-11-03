import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { briefDecisionRecords, canonical, isObject, isSha256, localPath, nonempty, parseJson, readLocal, readQueue, relativePath, requireValue, sha256, snapshot, subjectIdentity, validateIndependentReview } from './identity.mjs';

export { snapshot } from './identity.mjs';

export function journalPath(queuePath) {
  return path.posix.join(path.posix.dirname(relativePath(queuePath)), '.joycraft-completion.pending.json');
}

function recoveryHint(queuePath) {
  return `Recovery required: inspect ${journalPath(queuePath)}, then run node .joycraft/runtime/completion.mjs recover --queue ${JSON.stringify(queuePath)} to restore the two saved pre-completion files. Recovery refuses edits made after the interruption.`;
}

function assertNoJournal(root, queuePath) {
  requireValue(!existsSync(localPath(root, journalPath(queuePath), true)), recoveryHint(queuePath));
}

function saveExclusive(file, bytes) {
  const fd = openSync(file, 'wx', 0o600);
  try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
}

function replaceFile(root, relative, bytes) {
  const file = localPath(root, relative);
  const temporary = `${file}.joycraft-${randomUUID()}.tmp`;
  try {
    saveExclusive(temporary, bytes);
    renameSync(temporary, file);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

/**
 * Validate the parts of an independent review that remain meaningful even when
 * its verdict is not acceptable for ordinary completion. This is a current
 * subject check; archival separately validates historical requirement bindings
 * without renewing the review's implementation evidence.
 */
export function validateReview({ root = process.cwd(), report, state, reportPath, artifactPaths = [] }) {
  reportPath = relativePath(reportPath);
  requireValue(isObject(report) && report.schemaVersion === 1, 'Unsupported or missing report schemaVersion');
  requireValue(isObject(report.subject) && report.subject.schemaVersion === 1, 'Unsupported or missing subject schemaVersion');
  validateIndependentReview(report);
  requireValue(['PASS', 'FAIL', 'UNVERIFIED'].includes(report.verdict), 'Report verdict must be PASS, FAIL or UNVERIFIED');
  requireValue(Array.isArray(report.unresolved) && report.unresolved.every(nonempty), 'Report unresolved findings must be an array of nonempty strings');
  requireValue(nonempty(report.createdAt) && Number.isFinite(Date.parse(report.createdAt)), 'Report needs a valid createdAt timestamp');
  requireValue(Array.isArray(report.flows) && report.flows.length > 0, 'Report needs flow evidence');
  const subject = report.subject;
  requireValue(subject.queuePath === state.queuePath && subject.specId === state.spec.id && subject.specPath === state.specPath, 'Report subject does not match this queue/spec');
  requireValue(isSha256(subject.identity) && subjectIdentity(subject) === subject.identity, 'Invalid subject identity');
  const receiptPaths = report.flows.flatMap(flow => Array.isArray(flow?.observations) ? flow.observations.flatMap(observation => Array.isArray(observation?.receipts) ? observation.receipts.map(receipt => receipt?.path).filter(nonempty) : []) : []);
  const current = snapshot({ root, queuePath: state.queuePath, specId: state.spec.id, implementationRevision: subject.implementationRevision, bindingVersion: subject.binding === undefined ? 0 : 1, artifactPaths: [reportPath, journalPath(state.queuePath), ...artifactPaths, ...receiptPaths] });
  requireValue(canonical(subject) === canonical(current), 'Stale report: current code, requirements, checks, fixtures or verification scope differ from the reviewed subject');
  requireValue(!subject.inputs.some(input => input.path === reportPath), 'Report cannot be a bound verification input');
  for (const flow of report.flows) {
    requireValue(isObject(flow) && flow.subjectIdentity === subject.identity && Array.isArray(flow.observations), 'Flow evidence must match the reviewed subject');
    for (const observation of flow.observations) {
      requireValue(isObject(observation) && Array.isArray(observation.receipts), 'Observation needs receipt references');
      for (const receipt of observation.receipts) {
        requireValue(isObject(receipt) && isSha256(receipt.sha256), 'Invalid receipt digest');
        const receiptPath = relativePath(receipt.path);
        requireValue(receiptPath !== state.queuePath && receiptPath !== state.specPath && receiptPath !== reportPath, 'Receipt must be separate from report and completion metadata');
        if (subject.binding !== undefined) requireValue(!subject.inputs.some(input => input.path === receiptPath), `Receipt must be an independent captured output, not a mutable verification input: ${receiptPath}`);
        requireValue(sha256(readLocal(root, receiptPath)) === receipt.sha256, `Receipt is missing or changed: ${receiptPath}`);
      }
    }
  }
}

function validatePassingReport(root, report, state, reportPath) {
  validateReview({ root, report, state, reportPath });
  requireValue(report.verdict === 'PASS', 'Report verdict must be PASS; FAIL or UNVERIFIED cannot complete a spec');
  requireValue(report.unresolved.length === 0, 'Report has unresolved review findings');
}

/**
 * Validate a completed reviewer report without changing either completion status
 * surface. Dispatch adapters use this before returning a report to the same
 * reviewer for correction; only complete() is allowed to accept it.
 */
export async function checkReport({ root = process.cwd(), queuePath, specId, reportPath }) {
  queuePath = relativePath(queuePath);
  reportPath = relativePath(reportPath);
  const state = readQueue({ root, queuePath, specId });
  const reportBytes = readLocal(root, reportPath);
  const report = parseJson(reportBytes, reportPath);
  validatePassingReport(root, report, state, reportPath);
  // Missing or broken peer validation is an error, never a passing fallback.
  const { validateEvidence } = await import('./evidence.mjs');
  requireValue(typeof validateEvidence === 'function', 'Evidence validator is unavailable');
  const evidence = validateEvidence(report, state.spec.verification.criteria);
  requireValue(isObject(evidence) && evidence.ok === true && Array.isArray(evidence.errors) && evidence.errors.length === 0, `Evidence rejected: ${Array.isArray(evidence?.errors) ? evidence.errors.join('; ') : 'invalid validator response'}`);
  return { report, reportBytes, state, acceptedReport: { path: reportPath, sha256: sha256(reportBytes) } };
}

function restore(root, journal) {
  // Preflight both surfaces before restoring either one; never erase a later edit.
  for (const file of journal.files) {
    const digest = sha256(readLocal(root, file.path));
    requireValue(digest === file.before.sha256 || digest === file.after.sha256, `Recovery conflict: ${file.path} has subsequent edits; preserve them and reconcile with the journal before retrying`);
  }
  for (const file of journal.files) {
    if (sha256(readLocal(root, file.path)) !== file.before.sha256) replaceFile(root, file.path, Buffer.from(file.before.base64, 'base64'));
  }
}

export function recover({ root = process.cwd(), queuePath }) {
  queuePath = relativePath(queuePath);
  const pendingPath = journalPath(queuePath);
  const pendingFile = localPath(root, pendingPath);
  const journal = parseJson(readFileSync(pendingFile), pendingPath);
  requireValue(isObject(journal) && journal.schemaVersion === 1 && journal.queuePath === queuePath && Number.isSafeInteger(journal.specId) && Array.isArray(journal.files) && journal.files.length === 2, 'Invalid completion journal; preserve it for manual recovery');
  for (const file of journal.files) {
    requireValue(isObject(file) && nonempty(file.path), 'Invalid journal file');
    relativePath(file.path);
    for (const version of [file.before, file.after]) {
      requireValue(isObject(version) && typeof version.base64 === 'string' && isSha256(version.sha256) && sha256(Buffer.from(version.base64, 'base64')) === version.sha256, 'Invalid journal backup digest; preserve it for manual recovery');
    }
  }
  requireValue(journal.files[1].path === queuePath, 'Journal queue path mismatch');
  const beforeQueue = parseJson(Buffer.from(journal.files[1].before.base64, 'base64'), 'journal queue backup');
  const beforeSpec = beforeQueue.specs?.find(spec => spec.id === journal.specId);
  requireValue(beforeSpec && journal.files[0].path === path.posix.join(path.posix.dirname(queuePath), relativePath(beforeSpec.file)), 'Journal spec path mismatch');
  restore(root, journal);
  unlinkSync(pendingFile);
  return { status: 'restored', queuePath, specId: journal.specId };
}

async function writeCompletion({ root, queuePath, specId, state, metadataKey, metadata, validate, stableFiles }) {
  const updatedQueue = structuredClone(state.queue);
  Object.assign(updatedQueue.specs.find(spec => spec.id === specId), { status: 'done', [metadataKey]: metadata });
  const journal = {
    schemaVersion: 1, queuePath, specId,
    files: [
      { path: state.specPath, before: state.specBytes, after: Buffer.from(state.status.replace('done')) },
      { path: queuePath, before: state.queueBytes, after: Buffer.from(`${JSON.stringify(updatedQueue, null, 2)}\n`) },
    ].map(file => ({ path: file.path, before: { sha256: sha256(file.before), base64: file.before.toString('base64') }, after: { sha256: sha256(file.after), base64: file.after.toString('base64') } })),
  };
  const pendingFile = localPath(root, journalPath(queuePath), true);
  try { saveExclusive(pendingFile, `${JSON.stringify(journal, null, 2)}\n`); } catch (error) {
    throw new Error(`${error.message}. ${recoveryHint(queuePath)}`);
  }
  try {
    for (const stable of stableFiles) requireValue(sha256(readLocal(root, stable.path)) === stable.sha256, `${stable.label} changed during completion`);
    for (const file of journal.files) requireValue(sha256(readLocal(root, file.path)) === file.before.sha256, `Completion conflict: ${file.path} changed during validation`);
    validate(state);
    for (const file of journal.files) {
      requireValue(sha256(readLocal(root, file.path)) === file.before.sha256, `Completion conflict: ${file.path} changed before write`);
      replaceFile(root, file.path, Buffer.from(file.after.base64, 'base64'));
    }
    // Catch overlapping worker edits during the two writes before accepting them.
    for (const file of journal.files) requireValue(sha256(readLocal(root, file.path)) === file.after.sha256, `Completion conflict: ${file.path} changed after write`);
    for (const stable of stableFiles) requireValue(sha256(readLocal(root, stable.path)) === stable.sha256, `${stable.label} changed during completion`);
    validate(readQueue({ root, queuePath, specId }));
    unlinkSync(pendingFile);
  } catch (error) {
    let restoration = 'The original statuses were restored.';
    try { restore(root, journal); } catch (restoreError) { restoration = restoreError.message; }
    throw new Error(`${error.message}. ${restoration} ${recoveryHint(queuePath)}`);
  }
}

export async function complete({ root = process.cwd(), queuePath, specId, reportPath }) {
  queuePath = relativePath(queuePath);
  reportPath = relativePath(reportPath);
  assertNoJournal(root, queuePath);
  const state = readQueue({ root, queuePath, specId });
  requireValue(state.spec.status === 'in-review' || state.spec.status === 'done', 'Only an in-review spec can move to done');
  const checked = await checkReport({ root, queuePath, specId, reportPath });
  const { report, acceptedReport } = checked;
  if (state.spec.status === 'done') {
    requireValue(state.spec.ownerAcceptance === undefined && state.spec.waiver === undefined, 'Done spec has an owner acceptance or waiver; ordinary completion cannot relabel it as PASS');
    requireValue(canonical(state.spec.acceptedReport) === canonical(acceptedReport), 'Done spec already has a different accepted report; it cannot be silently replaced');
    return { status: 'done', unchanged: true, acceptedReport, implementationRevision: report.subject.implementationRevision };
  }
  requireValue(state.spec.acceptedReport === undefined && state.spec.ownerAcceptance === undefined && state.spec.waiver === undefined, 'In-review spec already has completion metadata; reconcile its status before retrying');
  await writeCompletion({
    root, queuePath, specId, state, metadataKey: 'acceptedReport', metadata: acceptedReport,
    stableFiles: [{ path: reportPath, sha256: acceptedReport.sha256, label: 'Report' }],
    validate: currentState => validatePassingReport(root, report, currentState, reportPath),
  });
  return { status: 'done', unchanged: false, acceptedReport, implementationRevision: report.subject.implementationRevision };
}

/**
 * The native host attests the instruction text before this helper runs.  Local
 * JSON cannot authenticate that a human said it, so this validates only the
 * scoped binding and deliberately never treats the text as cryptographic proof.
 */
export function validateOwnerAcceptance({ decision, decisionPath, state, report, reportPath, reportBytes }) {
  decisionPath = relativePath(decisionPath);
  reportPath = relativePath(reportPath);
  requireValue(isObject(decision) && decision.schemaVersion === 1 && decision.kind === 'owner-acceptance', 'Owner acceptance needs schemaVersion 1 and kind owner-acceptance');
  requireValue(Object.keys(decision).every(key => ['schemaVersion', 'kind', 'queuePath', 'specId', 'subjectIdentity', 'review', 'instruction', 'limitations', 'createdAt'].includes(key)), 'Owner acceptance has unknown fields');
  requireValue(decision.queuePath === state.queuePath && decision.specId === state.spec.id, 'Owner acceptance does not match this queue/spec');
  requireValue(isObject(decision.review) && relativePath(decision.review.path) === reportPath && isSha256(decision.review.sha256), 'Owner acceptance review receipt must name this report and have a SHA-256 digest');
  requireValue(decisionPath !== state.queuePath && decisionPath !== state.specPath && decisionPath !== reportPath, 'Owner acceptance decision must be separate from queue, spec and review report');
  requireValue(!report.subject.inputs.some(input => input.path === decisionPath), 'Owner acceptance decision cannot be a verification input');
  requireValue(nonempty(decision.instruction), 'Owner acceptance needs the exact nonempty human instruction');
  requireValue(Array.isArray(decision.limitations) && decision.limitations.length > 0 && decision.limitations.every(nonempty), 'Owner acceptance needs one or more nonempty limitations');
  requireValue(nonempty(decision.createdAt) && Number.isFinite(Date.parse(decision.createdAt)), 'Owner acceptance needs a valid createdAt timestamp');
  requireValue(decision.subjectIdentity === report.subject.identity, 'Owner acceptance subject identity does not match the review');
  requireValue(sha256(reportBytes) === decision.review.sha256, 'Owner acceptance references a missing or changed review report');
  requireValue(report.verdict === 'FAIL' || report.verdict === 'UNVERIFIED', 'Owner acceptance is only for a FAIL or UNVERIFIED review; PASS must use ordinary completion');
}

async function ownerEvidenceErrors(report, criteria) {
  // Evidence remains diagnostic here. An owner exception must make the failed
  // checks visible, but cannot convert their result into a passing condition.
  try {
    const { validateEvidence } = await import('./evidence.mjs');
    if (typeof validateEvidence !== 'function') return ['Evidence validator is unavailable'];
    const result = validateEvidence(report, criteria);
    return Array.isArray(result?.errors) ? result.errors : ['Evidence validator returned an invalid result'];
  } catch (error) {
    return [`Evidence validator is unavailable: ${error.message}`];
  }
}

export async function acceptOwner({ root = process.cwd(), queuePath, specId, decisionPath }) {
  queuePath = relativePath(queuePath);
  decisionPath = relativePath(decisionPath);
  assertNoJournal(root, queuePath);
  const state = readQueue({ root, queuePath, specId });
  requireValue(state.spec.status === 'in-review' || state.spec.status === 'done', 'Only an in-review spec can move to done');
  const decisionBytes = readLocal(root, decisionPath);
  const decision = parseJson(decisionBytes, decisionPath);
  requireValue(isObject(decision.review) && nonempty(decision.review.path), 'Owner acceptance needs a review receipt');
  const reportPath = relativePath(decision.review.path);
  const reportBytes = readLocal(root, reportPath);
  const report = parseJson(reportBytes, reportPath);
  validateReview({ root, report, state, reportPath, artifactPaths: [decisionPath] });
  validateOwnerAcceptance({ root, decision, decisionPath, state, report, reportPath, reportBytes });
  const evidenceErrors = await ownerEvidenceErrors(report, state.spec.verification.criteria);
  const ownerAcceptance = { path: decisionPath, sha256: sha256(decisionBytes) };
  if (state.spec.status === 'done') {
    requireValue(state.spec.acceptedReport === undefined && state.spec.waiver === undefined, 'Done spec has an accepted PASS report or waiver; owner acceptance cannot replace it');
    requireValue(canonical(state.spec.ownerAcceptance) === canonical(ownerAcceptance), 'Done spec already has a different owner acceptance; it cannot be silently replaced');
    return { status: 'done', unchanged: true, ownerAcceptance, verdict: report.verdict, unresolved: report.unresolved, evidenceErrors, limitations: decision.limitations, implementationRevision: report.subject.implementationRevision };
  }
  requireValue(state.spec.acceptedReport === undefined && state.spec.ownerAcceptance === undefined && state.spec.waiver === undefined, 'In-review spec already has completion metadata; reconcile its status before retrying');
  await writeCompletion({
    root, queuePath, specId, state, metadataKey: 'ownerAcceptance', metadata: ownerAcceptance,
    stableFiles: [
      { path: reportPath, sha256: decision.review.sha256, label: 'Review report' },
      { path: decisionPath, sha256: ownerAcceptance.sha256, label: 'Owner acceptance decision' },
    ],
    validate: currentState => {
      validateReview({ root, report, state: currentState, reportPath, artifactPaths: [decisionPath] });
      validateOwnerAcceptance({ root, decision, decisionPath, state: currentState, report, reportPath, reportBytes });
    },
  });
  return { status: 'done', unchanged: false, ownerAcceptance, verdict: report.verdict, unresolved: report.unresolved, evidenceErrors, limitations: decision.limitations, implementationRevision: report.subject.implementationRevision };
}

const waiverCovers = ['no-review', 'tool-break'];

/** The feature folder holds the brief that quotes a waiver and the one waiver file itself. */
function featureBriefPath(queuePath) {
  return path.posix.join(path.posix.dirname(path.posix.dirname(queuePath)), 'brief.md');
}

/** A feature has at most one waiver, at a fixed path beside its brief, so dispatch can find it. */
export function featureWaiverPath(queuePath) {
  return path.posix.join(path.posix.dirname(path.posix.dirname(relativePath(queuePath))), 'waiver.json');
}

/**
 * The feature's waiver file, or null when the feature has none. Dispatch and
 * accept-waiver share this lookup. An unreadable waiver throws, so a broken
 * file never silently allows review or completion.
 */
export function readFeatureWaiver({ root = process.cwd(), queuePath }) {
  const waiverPath = featureWaiverPath(queuePath);
  if (!existsSync(path.join(root, waiverPath))) return null;
  const bytes = readLocal(root, waiverPath);
  return { path: waiverPath, bytes, waiver: parseJson(bytes, waiverPath) };
}

/**
 * Decision block-review-dispatch: "skip review" means review never runs. A
 * reviewer cannot be dispatched for a spec whose feature waiver covers
 * no-review, so no FAIL review can exist for a spec that no-review completes.
 */
export function assertReviewAllowed({ root = process.cwd(), queuePath }) {
  let found;
  try { found = readFeatureWaiver({ root, queuePath }); }
  catch (error) { throw new Error(`Reviewer dispatch refused: the feature waiver ${featureWaiverPath(queuePath)} is unreadable (${error.message}); fix or remove it first`); }
  if (found === null) return;
  const covers = found.waiver?.covers;
  requireValue(Array.isArray(covers), `Reviewer dispatch refused: the feature waiver ${found.path} has no covers list; fix or remove it first`);
  requireValue(!covers.includes('no-review'), `Reviewer dispatch refused: the feature waiver ${found.path} covers no-review, so review never runs for this queue. Complete with accept-waiver, or remove no-review from the waiver before any review`);
}

/**
 * A FeatureWaiver is the user's own words, given in one feature's interview and
 * recorded in a clarified brief decision. Like owner acceptance, local JSON
 * cannot prove a human said them; this validates only the record and its
 * bindings. `checkSource: false` skips the brief checks for historical
 * (archive) reads.
 */
export function validateWaiver({ root = process.cwd(), waiver, waiverPath, state, checkSource = true }) {
  waiverPath = relativePath(waiverPath);
  requireValue(isObject(waiver) && waiver.schemaVersion === 1 && waiver.kind === 'feature-waiver', 'Feature waiver needs schemaVersion 1 and kind feature-waiver');
  requireValue(Object.keys(waiver).every(key => ['schemaVersion', 'kind', 'queuePath', 'covers', 'instruction', 'decision', 'source', 'createdAt'].includes(key)), 'Feature waiver has unknown fields');
  requireValue(nonempty(waiver.queuePath) && relativePath(waiver.queuePath) === state.queuePath, `Feature waiver is for another queue (${waiver.queuePath}); a waiver covers only its own feature's queue`);
  requireValue(waiverPath === featureWaiverPath(state.queuePath), `Feature waiver must be the feature's one waiver file: ${featureWaiverPath(state.queuePath)}`);
  requireValue(Array.isArray(waiver.covers) && waiver.covers.length > 0 && waiver.covers.every(item => waiverCovers.includes(item)) && new Set(waiver.covers).size === waiver.covers.length, `Feature waiver covers must be a nonempty subset of ${waiverCovers.join(', ')}`);
  requireValue(nonempty(waiver.instruction), "Feature waiver needs the user's exact nonempty instruction");
  requireValue(nonempty(waiver.decision) && /^[A-Za-z0-9_-]{1,100}$/.test(waiver.decision), 'Feature waiver needs the id of the brief decision that holds the user\'s words');
  requireValue(nonempty(waiver.createdAt) && Number.isFinite(Date.parse(waiver.createdAt)), 'Feature waiver needs a valid createdAt timestamp');
  requireValue(isObject(waiver.source) && nonempty(waiver.source.path) && isSha256(waiver.source.sha256), 'Feature waiver source must be a receipt of the brief with a SHA-256 digest');
  const sourcePath = relativePath(waiver.source.path);
  requireValue(sourcePath === featureBriefPath(state.queuePath), `Feature waiver source must be this feature's brief: ${featureBriefPath(state.queuePath)}`);
  requireValue(waiverPath !== state.queuePath && waiverPath !== state.specPath && waiverPath !== sourcePath, 'Feature waiver must be separate from queue, spec and brief');
  requireValue(!state.spec.verification.inputs.some(input => relativePath(input.path) === waiverPath), 'Feature waiver cannot be a verification input');
  if (checkSource) {
    const briefBytes = readLocal(root, sourcePath);
    requireValue(sha256(briefBytes) === waiver.source.sha256, `Feature waiver source hash does not match ${sourcePath}`);
    assertDecisionQuotes(briefBytes, sourcePath, waiver);
  }
}

const words = text => text.trim().split(/\s+/).filter(Boolean);

/**
 * The named decision must exist once in the brief, be settled (clarified or
 * assigned, with an answer), and hold the instruction as a run of whole words
 * of its note or answer. Whitespace, including line wraps, is normalized.
 */
function assertDecisionQuotes(briefBytes, sourcePath, waiver) {
  const records = briefDecisionRecords(briefBytes, sourcePath).filter(record => isObject(record) && record.id === waiver.decision);
  requireValue(records.length === 1, `Feature waiver decision ${waiver.decision} is missing or ambiguous in ${sourcePath}`);
  const [decision] = records;
  const answered = typeof decision.answer === 'string' ? nonempty(decision.answer) : decision.answer !== null && decision.answer !== undefined;
  requireValue(['clarified', 'assigned'].includes(decision.status) && answered, `Feature waiver decision ${waiver.decision} is not answered in ${sourcePath}`);
  const quote = words(waiver.instruction);
  requireValue(quote.length >= 3, 'Feature waiver instruction must be at least three of the user\'s words');
  const holds = text => {
    if (typeof text !== 'string') return false;
    const spoken = words(text);
    for (let start = 0; start + quote.length <= spoken.length; start++) if (quote.every((word, index) => spoken[start + index] === word)) return true;
    return false;
  };
  requireValue(holds(decision.note) || holds(decision.answer), `Feature waiver instruction must appear as whole words in the note or answer of decision ${waiver.decision} in ${sourcePath}`);
}

const isFailing = report => report.verdict === 'FAIL' || (Array.isArray(report.flows) && report.flows.some(flow => Array.isArray(flow?.observations) && flow.observations.some(observation => observation?.result === 'FAIL')));

/**
 * Every review report the runtime can see for this queue/spec: the dispatch
 * report destination beside the queue, the rest of the feature folder, and
 * local packets. Matching is by subject.queuePath and subject.specId.
 */
export function visibleReports({ root = process.cwd(), queuePath, specId }) {
  queuePath = relativePath(queuePath);
  const found = [];
  const scan = relative => {
    const directory = path.join(root, relativePath(relative));
    if (!existsSync(directory) || !lstatSync(directory).isDirectory()) return;
    for (const name of readdirSync(directory).sort()) {
      const child = path.posix.join(relative, name);
      const stat = lstatSync(path.join(directory, name));
      if (stat.isDirectory()) scan(child);
      else if (stat.isFile() && name.endsWith('.json') && child !== queuePath) {
        let value;
        try { value = JSON.parse(readFileSync(path.join(directory, name), 'utf8')); } catch { continue; }
        if (isObject(value) && 'verdict' in value && isObject(value.subject) && value.subject.queuePath === queuePath && value.subject.specId === specId) found.push({ path: child, report: value });
      }
    }
  };
  scan(path.posix.dirname(path.posix.dirname(queuePath)));
  scan('.joycraft/local/packets');
  return found;
}

/**
 * Extra guard only. The enforcement is reviewer dispatch refusing a no-review
 * queue (assertReviewAllowed), so no review should exist. A report found in the
 * usual folders still refuses: no-review needs none, and a FAIL never passes.
 */
function assertNoReviewBypass({ root, queuePath, specId, report }) {
  const seen = visibleReports({ root, queuePath, specId });
  const failing = seen.filter(item => isFailing(item.report) && (report === undefined || item.report.subject.identity === report.subject.identity));
  requireValue(failing.length === 0, `A waiver never covers a FAIL: a FAIL review exists for this spec (${failing.map(item => item.path).join(', ')})`);
  if (report === undefined) requireValue(seen.length === 0, `A review report exists for this spec (${seen.map(item => item.path).join(', ')}); no-review cannot skip it. Pass --report so the tool-break and FAIL rules apply`);
}

/** Fail closed on any FAIL, then allow only an UNVERIFIED report whose gaps are all tool breaks. */
export function validateWaivedReport({ waiver, report }) {
  const observations = report.flows.flatMap(flow => flow.observations);
  const failed = observations.filter(observation => observation.result === 'FAIL').length;
  requireValue(report.verdict !== 'FAIL' && failed === 0, `A waiver never covers a FAIL: the report ${report.verdict === 'FAIL' ? 'verdict is FAIL' : `has ${failed} FAIL observation(s)`}`);
  requireValue(report.verdict === 'UNVERIFIED', 'A waived report must be UNVERIFIED; a PASS report uses ordinary completion');
  requireValue(waiver.covers.includes('tool-break'), 'Feature waiver does not cover tool-break, so it cannot complete a reviewed UNVERIFIED spec');
  const uncaused = observations.filter(observation => observation.result !== 'PASS' && observation.cause !== 'tool-break').length;
  requireValue(uncaused === 0, `Feature waiver covers only tool breaks: ${uncaused} non-PASS observation(s) lack cause: 'tool-break'`);
}

/**
 * Complete an in-review spec under its feature's waiver. Without a report the
 * waiver must cover no-review. With a report it must be current, independent,
 * UNVERIFIED and gap-free except for tool breaks; it keeps its real verdict.
 */
export async function acceptWaiver({ root = process.cwd(), queuePath, specId, waiverPath, reportPath }) {
  queuePath = relativePath(queuePath);
  waiverPath = relativePath(waiverPath);
  assertNoJournal(root, queuePath);
  const state = readQueue({ root, queuePath, specId });
  requireValue(state.spec.status === 'in-review' || state.spec.status === 'done', 'Only an in-review spec can move to done');
  requireValue(waiverPath === featureWaiverPath(queuePath), `Feature waiver must be the feature's one waiver file: ${featureWaiverPath(queuePath)}`);
  const found = readFeatureWaiver({ root, queuePath });
  requireValue(found !== null, `Feature waiver not found: ${waiverPath}`);
  const { bytes: waiverBytes, waiver } = found;
  validateWaiver({ root, waiver, waiverPath, state });
  let report, reportBytes, evidenceErrors = [];
  if (reportPath !== undefined) {
    reportPath = relativePath(reportPath);
    requireValue(reportPath !== waiverPath, 'Review report must be separate from the waiver');
    reportBytes = readLocal(root, reportPath);
    report = parseJson(reportBytes, reportPath);
    validateReview({ root, report, state, reportPath, artifactPaths: [waiverPath] });
    validateWaivedReport({ waiver, report });
    evidenceErrors = await ownerEvidenceErrors(report, state.spec.verification.criteria);
  } else requireValue(waiver.covers.includes('no-review'), 'Feature waiver does not cover no-review; supply the current UNVERIFIED report for a tool-break waiver');
  assertNoReviewBypass({ root, queuePath, specId, report });
  const receipt = { path: waiverPath, sha256: sha256(waiverBytes), ...(report ? { review: { path: reportPath, sha256: sha256(reportBytes) } } : {}) };
  const result = { status: 'done', waiver: receipt, covers: waiver.covers, instruction: waiver.instruction, ...(report ? { verdict: report.verdict, unresolved: report.unresolved, evidenceErrors, implementationRevision: report.subject.implementationRevision } : { verdict: null }) };
  if (state.spec.status === 'done') {
    requireValue(state.spec.acceptedReport === undefined && state.spec.ownerAcceptance === undefined, 'Done spec has an accepted report or owner acceptance; a waiver cannot replace it');
    requireValue(canonical(state.spec.waiver) === canonical(receipt), 'Done spec already has a different waiver; it cannot be silently replaced');
    return { ...result, unchanged: true };
  }
  requireValue(state.spec.acceptedReport === undefined && state.spec.ownerAcceptance === undefined && state.spec.waiver === undefined, 'In-review spec already has completion metadata; reconcile its status before retrying');
  await writeCompletion({
    root, queuePath, specId, state, metadataKey: 'waiver', metadata: receipt,
    stableFiles: [
      { path: waiverPath, sha256: receipt.sha256, label: 'Feature waiver' },
      { path: relativePath(waiver.source.path), sha256: waiver.source.sha256, label: 'Waiver source brief' },
      ...(report ? [{ path: reportPath, sha256: sha256(reportBytes), label: 'Review report' }] : []),
    ],
    validate: currentState => {
      validateWaiver({ root, waiver, waiverPath, state: currentState });
      assertNoReviewBypass({ root, queuePath, specId, report });
      if (report) {
        validateReview({ root, report, state: currentState, reportPath, artifactPaths: [waiverPath] });
        validateWaivedReport({ waiver, report });
      }
    },
  });
  return { ...result, unchanged: false };
}

function argumentsFor(argv) {
  const [command, ...args] = argv;
  requireValue(['snapshot', 'scope', 'complete', 'finalize-review', 'accept-owner', 'accept-waiver', 'recover'].includes(command), 'Usage: completion.mjs scope --queue <path> --spec <id> | snapshot --queue <path> --spec <id> --out <subject.json> | complete|finalize-review --queue <path> --spec <id> --report <report.json> | accept-owner --queue <path> --spec <id> --decision <decision.json> | accept-waiver --queue <path> --spec <id> --waiver <waiver.json> [--report <report.json>] | recover --queue <path>');
  const flags = {};
  for (let i = 0; i < args.length; i += 2) {
    requireValue(['--queue', '--spec', '--out', '--report', '--decision', '--waiver'].includes(args[i]) && nonempty(args[i + 1]) && flags[args[i]] === undefined, `Invalid or duplicate argument: ${args[i]}`);
    flags[args[i]] = args[i + 1];
  }
  const expected = command === 'recover' ? ['--queue'] : command === 'scope' ? ['--queue', '--spec'] : ['--queue', '--spec', command === 'snapshot' ? '--out' : command === 'accept-owner' ? '--decision' : command === 'accept-waiver' ? '--waiver' : '--report'];
  const optional = command === 'accept-waiver' ? ['--report'] : [];
  requireValue(expected.every(flag => flags[flag] !== undefined) && Object.keys(flags).every(flag => expected.includes(flag) || optional.includes(flag)), `Missing or unexpected arguments for ${command}`);
  if (command !== 'recover') requireValue(/^(?:0|[1-9]\d*)$/.test(flags['--spec']) && Number.isSafeInteger(Number(flags['--spec'])), 'Spec ID must be a nonnegative integer');
  return { command, flags };
}

export async function main(argv = process.argv.slice(2)) {
  const { command, flags } = argumentsFor(argv);
  const root = process.cwd();
  const queuePath = flags['--queue'];
  let result;
  if (command === 'snapshot') {
    assertNoJournal(root, queuePath);
    result = snapshot({ root, queuePath, specId: Number(flags['--spec']) });
    const outPath = relativePath(flags['--out']);
    requireValue(!result.inputs.some(input => input.path === outPath), 'Snapshot output cannot replace a verification input');
    const out = localPath(root, outPath, true);
    mkdirSync(path.dirname(out), { recursive: true });
    saveExclusive(out, `${JSON.stringify(result, null, 2)}\n`);
  } else if (command === 'scope') {
    assertNoJournal(root, queuePath);
    const current = snapshot({ root, queuePath, specId: Number(flags['--spec']) });
    result = { queuePath: current.queuePath, specId: current.specId, changeScope: current.binding?.changeScope ?? null };
  } else if (command === 'recover') result = recover({ root, queuePath });
  else if (command === 'accept-waiver') result = await acceptWaiver({ root, queuePath, specId: Number(flags['--spec']), waiverPath: flags['--waiver'], reportPath: flags['--report'] });
  else if (command === 'accept-owner') result = await acceptOwner({ root, queuePath, specId: Number(flags['--spec']), decisionPath: flags['--decision'] });
  else result = await complete({ root, queuePath, specId: Number(flags['--spec']), reportPath: flags['--report'] });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`Completion stopped: ${error.message}\n`); process.exitCode = 1; });
}
