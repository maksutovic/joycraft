import { accessSync, existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { constants } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { canonical, isObject, isSha256, nonempty, parseJson, readLocal, readQueue, relativePath, requireAbsent, requireValue, sha256, snapshot, validateNativeActor, validateQueue } from './identity.mjs';
import { checkReport } from './completion.mjs';
import { reviewLoopSection } from './review-tools.mjs';

const unknown = 'unknown';
const forbiddenDeliveryFields = new Set(['expected', 'expectedverdict', 'verdict', 'reasoning', 'conclusion', 'answer']);
const decisionStates = new Set(['open', 'clarified', 'backlogged', 'discarded', 'assigned']);

function workerDirectory(workerRoot) {
  requireValue(nonempty(workerRoot) && path.isAbsolute(workerRoot), 'Dispatch needs an explicit absolute worker root');
  const resolved = path.resolve(workerRoot);
  requireValue(existsSync(resolved), `Worker root does not exist: ${resolved}`);
  return realpathSync(resolved);
}

function realDirectory(directory, label) {
  requireValue(nonempty(directory) && path.isAbsolute(directory), `${label} needs an explicit absolute path`);
  const resolved = path.resolve(directory);
  requireValue(existsSync(resolved), `${label} does not exist: ${resolved}`);
  return realpathSync(resolved);
}

function gitDirectory(root, label) {
  let topLevel;
  let commonDir;
  let gitDir;
  try {
    topLevel = realpathSync(execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim());
    commonDir = realpathSync(path.resolve(root, execFileSync('git', ['rev-parse', '--git-common-dir'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()));
    gitDir = realpathSync(path.resolve(root, execFileSync('git', ['rev-parse', '--git-dir'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()));
  } catch {
    throw new Error(`${label} must be a Git worktree`);
  }
  requireValue(topLevel === realpathSync(root), `${label} must name the Git worktree root, not a subdirectory`);
  return { topLevel, commonDir, gitDir };
}

/**
 * The native host owns worktree creation. This only attests an already-created
 * linked worktree before parallel mutation; it is not a sandbox boundary.
 */
function queueSpecForSource(root, sourceView) {
  const queue = parseJson(readLocal(root, sourceView.queue.path), sourceView.queue.path);
  const queueDirectory = path.posix.dirname(sourceView.queue.path);
  validateQueue(queue, { select: spec => isObject(spec) && nonempty(spec.file) && path.posix.join(queueDirectory, spec.file) === sourceView.spec.path });
  const matching = queue.specs.filter(spec => isObject(spec) && nonempty(spec.file) && path.posix.join(queueDirectory, spec.file) === sourceView.spec.path);
  requireValue(matching.length === 1, 'Dispatch source spec must match exactly one queue spec');
  return { queue, spec: matching[0] };
}

function queueRequestsParallel(root, sourceView) {
  return queueSpecForSource(root, sourceView).spec.execution?.parallel === true;
}

function fullCommitSha(value, label) {
  requireValue(typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value), `${label} must be a full Git commit SHA`);
  return value;
}

function worktreeRevision(root, label) {
  gitDirectory(root, label);
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    throw new Error(`${label} must have a current Git revision`);
  }
}

/**
 * Implementation may begin only after every declared dependency has reached
 * its queue's done state. This is a scheduling guard, not completion evidence:
 * validateQueue deliberately permits legacy done records without a receipt.
 */
export function assertImplementerDependenciesReady(root, sourceView, roles) {
  if (!roles.some(role => role.name === 'implementer')) return;
  const { queue, spec } = queueSpecForSource(root, sourceView);
  const byId = new Map(queue.specs.map(item => [item.id, item]));
  const pending = spec.depends_on.filter(id => byId.get(id)?.status !== 'done');
  requireValue(pending.length === 0, `Implementer dispatch is blocked until dependencies are done: ${pending.join(', ')}`);
}

function attestWorkspace(workspace, workerRoot, roles, queueParallel) {
  const defaultAccess = roles.every(role => role.name === 'reviewer') ? 'read-only' : 'mutating';
  if (workspace === undefined) {
    requireValue(!(queueParallel && defaultAccess === 'mutating'), 'Parallel queue execution needs an attested workspace');
    return { workerRoot, coordinatorRoot: workerRoot, kind: 'serial', parallel: false, access: defaultAccess };
  }
  requireValue(isObject(workspace), 'Dispatch workspace must be an object');
  requireValue(Object.keys(workspace).every(key => ['coordinatorRoot', 'parallel', 'access', 'baseRevision'].includes(key)), 'Dispatch workspace has an unknown field');
  requireValue(workspace.access === 'mutating' || workspace.access === 'read-only', 'Dispatch workspace access must be mutating or read-only');
  requireValue(workspace.parallel === undefined || typeof workspace.parallel === 'boolean', 'Dispatch workspace parallel must be a boolean when supplied');
  const baseRevision = workspace.baseRevision === undefined ? undefined : fullCommitSha(workspace.baseRevision, 'Dispatch workspace baseRevision');
  const coordinatorRoot = realDirectory(workspace.coordinatorRoot, 'Dispatch coordinator root');
  const parallel = queueParallel || workspace.parallel === true;
  if (workspace.access === 'read-only') {
    requireValue(roles.every(role => role.name === 'reviewer'), 'Shared worktree dispatch is restricted to reviewers');
    requireValue(workerRoot === coordinatorRoot, 'Shared read-only dispatch must use the coordinator worktree');
    return { workerRoot, coordinatorRoot, kind: 'shared-readonly', parallel, access: workspace.access };
  }
  if (!parallel) {
    if (baseRevision === undefined) return { workerRoot, coordinatorRoot, kind: 'serial', parallel, access: workspace.access };
    const revision = worktreeRevision(workerRoot, 'Actual worker worktree');
    requireValue(revision === baseRevision, `Actual worker worktree revision differs from declared base revision: expected ${baseRevision}, got ${revision}`);
    return { workerRoot, coordinatorRoot, kind: 'serial', parallel, access: workspace.access, baseRevision, revision };
  }
  requireValue(workerRoot !== coordinatorRoot, 'Parallel mutation dispatch needs a distinct linked worker worktree');
  const workerGit = gitDirectory(workerRoot, 'Actual worker worktree');
  const coordinatorGit = gitDirectory(coordinatorRoot, 'Coordinator worktree');
  requireValue(workerGit.commonDir === coordinatorGit.commonDir, 'Parallel mutation worktree must share the coordinator Git common directory');
  requireValue(workerGit.gitDir !== coordinatorGit.gitDir, 'Parallel mutation worker must be a linked Git worktree, not the coordinator');
  const branch = execFileSync('git', ['branch', '--show-current'], { cwd: workerRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: workerRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  if (baseRevision !== undefined) requireValue(revision === baseRevision, `Actual worker worktree revision differs from declared base revision: expected ${baseRevision}, got ${revision}`);
  return { workerRoot, coordinatorRoot, kind: 'git-worktree', parallel, access: workspace.access, gitCommonDir: workerGit.commonDir, branch, revision, ...(baseRevision === undefined ? {} : { baseRevision }) };
}

function rejectReviewerSteering(value) {
  if (Array.isArray(value)) return value.forEach(rejectReviewerSteering);
  if (!isObject(value)) return;
  for (const [key, nested] of Object.entries(value)) {
    requireValue(!forbiddenDeliveryFields.has(key.replace(/[^a-z]/gi, '').toLowerCase()), `Dispatch source view cannot include reviewer steering: ${key}`);
    rejectReviewerSteering(nested);
  }
}

function decisionAnchor(id) { return `frontmatter.decisions.${id}`; }

function readBriefDecisions(root, brief) {
  const text = readLocal(root, brief.path).toString('utf8');
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/m.exec(text)?.[1];
  const marker = /^decisions:\s*/m.exec(frontmatter ?? '');
  if (!marker) return { decisions: [], limitations: [] };
  const raw = frontmatter.slice(marker.index + marker[0].length);
  if (!raw.startsWith('[')) return { decisions: [], limitations: [{ path: brief.path, sha256: brief.sha256, reason: 'decisions-unreadable' }] };
  let quoted = false; let escaped = false; let depth = 0;
  for (let index = 0; index < raw.length; index++) {
    const char = raw[index];
    if (quoted) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === '"') quoted = false; continue; }
    if (char === '"') { quoted = true; continue; }
    if (char === '[') depth++;
    if (char === ']') {
      depth--;
      if (depth === 0) {
        try {
          const decisions = JSON.parse(raw.slice(0, index + 1));
          if (!Array.isArray(decisions)) throw new Error('not-array');
          return { decisions, limitations: [] };
        } catch { return { decisions: [], limitations: [{ path: brief.path, sha256: brief.sha256, reason: 'decisions-unreadable' }] }; }
      }
    }
  }
  return { decisions: [], limitations: [{ path: brief.path, sha256: brief.sha256, reason: 'decisions-unreadable' }] };
}

function classifyDecisions(root, brief, requestedIds = undefined) {
  const parsed = readBriefDecisions(root, brief);
  const selected = [];
  const limitations = [...parsed.limitations];
  const ids = new Set();
  const requested = requestedIds === undefined ? undefined : new Set(requestedIds);
  const counts = new Map();
  for (const decision of parsed.decisions) {
    if (isObject(decision) && nonempty(decision.id) && /^[A-Za-z0-9_-]{1,100}$/.test(decision.id)) counts.set(decision.id, (counts.get(decision.id) ?? 0) + 1);
  }
  for (const decision of parsed.decisions) {
    if (!isObject(decision) || !nonempty(decision.id) || !/^[A-Za-z0-9_-]{1,100}$/.test(decision.id)) {
      limitations.push({ path: brief.path, sha256: brief.sha256, reason: 'decision-id-unreadable' });
      continue;
    }
    if (counts.get(decision.id) > 1) {
      if (!ids.has(decision.id)) limitations.push({ path: brief.path, sha256: brief.sha256, anchor: decisionAnchor(decision.id), reason: 'decision-id-ambiguous' });
      ids.add(decision.id);
      continue;
    }
    ids.add(decision.id);
    if (requested !== undefined && !requested.has(decision.id)) continue;
    const base = { path: brief.path, sha256: brief.sha256, anchor: decisionAnchor(decision.id) };
    const answered = typeof decision.answer === 'string' ? nonempty(decision.answer) : decision.answer !== null && decision.answer !== undefined;
    if (!decisionStates.has(decision.status)) {
      limitations.push({ ...base, status: typeof decision.status === 'string' ? decision.status : null, reason: 'decision-state-unrecognized' });
    } else if ((decision.status === 'clarified' || decision.status === 'assigned') && answered) {
      selected.push({ ...base, decision });
    } else {
      limitations.push({ ...base, status: decision.status, reason: ['clarified', 'assigned'].includes(decision.status) ? `${decision.status}-decision-without-answer` : 'decision-not-settled' });
    }
  }
  if (requested !== undefined) for (const id of requested) {
    if (!ids.has(id)) limitations.push({ path: brief.path, sha256: brief.sha256, anchor: decisionAnchor(id), reason: 'decision-referent-missing' });
  }
  return { decisions: selected, decisionLimitations: limitations };
}

function scopedDecisionIds(spec, briefPath) {
  let selectorsSeen = false;
  const ids = new Set();
  for (const input of spec.verification.inputs) {
    if (input.kind !== 'requirement' || relativePath(input.path) !== briefPath || input.scope?.decisionIds === undefined) continue;
    selectorsSeen = true;
    requireValue(Array.isArray(input.scope.decisionIds) && input.scope.decisionIds.every(id => nonempty(id) && /^[A-Za-z0-9_-]{1,100}$/.test(id)), 'Decision scope selectors must be valid IDs');
    for (const id of input.scope.decisionIds) ids.add(id);
  }
  return selectorsSeen ? [...ids] : undefined;
}

function hashedSource(root, source, label, { anchor = false, allowAbsent = false } = {}) {
  requireValue(isObject(source) && nonempty(source.path) && ((allowAbsent && source.state === 'absent') || isSha256(source.sha256)), `${label} needs a project-relative path and SHA-256`);
  const sourcePath = relativePath(source.path);
  if (source.state === 'absent') {
    requireValue(allowAbsent && !anchor, `${label} cannot be absent`);
    requireAbsent(root, sourcePath);
    return { path: sourcePath, state: 'absent' };
  }
  if (anchor) requireValue(nonempty(source.anchor), `${label} needs an owning decision anchor`);
  requireValue(sha256(readLocal(root, sourcePath)) === source.sha256, `Current ${label} bytes differ: ${sourcePath}`);
  return anchor ? { path: sourcePath, anchor: source.anchor, sha256: source.sha256 } : { path: sourcePath, sha256: source.sha256 };
}

export function readInstallationManifest(root, manifestPath = '.joycraft/installation.json') {
  manifestPath = relativePath(manifestPath);
  const manifest = parseJson(readLocal(root, manifestPath), manifestPath);
  requireValue(isObject(manifest) && manifest.schemaVersion === 1 && Array.isArray(manifest.files) && manifest.files.length > 0, 'Installation manifest must be schemaVersion 1 with exported files');
  const files = new Map();
  for (const entry of manifest.files) {
    requireValue(isObject(entry) && nonempty(entry.path) && isSha256(entry.sha256), 'Installation manifest file needs path and SHA-256');
    const filePath = relativePath(entry.path);
    requireValue(!files.has(filePath), `Installation manifest repeats ${filePath}`);
    requireValue(sha256(readLocal(root, filePath)) === entry.sha256, `Installed file differs from manifest: ${filePath}`);
    files.set(filePath, entry.sha256);
  }
  return { path: manifestPath, files, sourceRevision: manifest.sourceRevision, harness: manifest.harness };
}

function readExpectedManifest(expectedManifestPath) {
  requireValue(nonempty(expectedManifestPath) && path.isAbsolute(expectedManifestPath), 'Dispatch needs an explicit absolute pinned expected manifest path');
  const manifest = parseJson(readFileSync(expectedManifestPath), expectedManifestPath);
  requireValue(isObject(manifest) && manifest.schemaVersion === 1 && Array.isArray(manifest.files) && manifest.files.length > 0, 'Expected installation manifest must be schemaVersion 1 with exported files');
  const files = new Map();
  for (const entry of manifest.files) {
    requireValue(isObject(entry) && nonempty(entry.path) && isSha256(entry.sha256), 'Expected manifest file needs path and SHA-256');
    const filePath = relativePath(entry.path);
    requireValue(!files.has(filePath), `Expected manifest repeats ${filePath}`);
    files.set(filePath, entry.sha256);
  }
  return { path: expectedManifestPath, files, sourceRevision: manifest.sourceRevision, harness: manifest.harness };
}

function validateRoles(manifest, roles) {
  requireValue(Array.isArray(roles) && roles.length > 0, 'Dispatch needs at least one worker role');
  const names = new Set();
  return roles.map(role => {
    requireValue(isObject(role) && nonempty(role.name) && !names.has(role.name), 'Worker roles need unique names');
    requireValue(['implementer', 'reviewer'].includes(role.name), `Unsupported worker role: ${role.name}`);
    names.add(role.name);
    requireValue(nonempty(role.skillPath), `Worker role ${role.name} needs a skill path`);
    const requiredFiles = [role.skillPath, ...(role.referencePaths ?? []), ...(role.runtimePaths ?? [])];
    requireValue(requiredFiles.every(nonempty), `Worker role ${role.name} has an invalid delivery path`);
    const files = requiredFiles.map(relativePath);
    for (const file of files) requireValue(manifest.files.has(file), `Worker role ${role.name} is not attested by the installation manifest: ${file}`);
    const requiredCapabilities = role.requiredCapabilities ?? [];
    requireValue(Array.isArray(requiredCapabilities) && requiredCapabilities.every(nonempty), `Worker role ${role.name} has invalid required capabilities`);
    return { name: role.name, files, requiredCapabilities: [...new Set(requiredCapabilities)] };
  });
}

function validateSourceView(root, sourceView) {
  requireValue(isObject(sourceView), 'Dispatch needs a bounded current source view');
  const { decisions: suppliedDecisions, decisionLimitations: suppliedLimitations, ...untrusted } = sourceView;
  rejectReviewerSteering(untrusted);
  const brief = hashedSource(root, sourceView.brief, 'brief');
  const spec = hashedSource(root, sourceView.spec, 'spec');
  const queue = hashedSource(root, sourceView.queue, 'queue');
  requireValue(Array.isArray(sourceView.inputs), 'Dispatch source view needs current verification inputs');
  const inputs = sourceView.inputs.map((input, index) => hashedSource(root, input, `input ${index + 1}`, { allowAbsent: true }));
  requireValue(sourceView.plannedMissing === undefined || (Array.isArray(sourceView.plannedMissing) && sourceView.plannedMissing.every(item => isObject(item) && nonempty(item.path) && item.reason === 'not-created-yet')), 'Invalid planned missing input disclosure');
  requireValue(Array.isArray(suppliedDecisions), 'Dispatch source view needs scoped owning decision records');
  requireValue(sourceView.decisionScope === undefined || sourceView.decisionScope === null || (Array.isArray(sourceView.decisionScope) && sourceView.decisionScope.every(id => nonempty(id) && /^[A-Za-z0-9_-]{1,100}$/.test(id))), 'Dispatch decision scope must contain valid IDs');
  const decisionScope = sourceView.decisionScope === null ? undefined : sourceView.decisionScope;
  const current = classifyDecisions(root, brief, decisionScope);
  const currentByAnchor = new Map(current.decisions.map(decision => [decision.anchor, decision]));
  const decisions = suppliedDecisions.map((decision, index) => {
    requireValue(isObject(decision) && isObject(decision.decision), `Decision ${index + 1} needs an exact current record`);
    const pointer = hashedSource(root, decision, `decision ${index + 1}`, { anchor: true });
    requireValue(pointer.path === brief.path, `Decision ${index + 1} must be anchored in the owning brief`);
    const actual = currentByAnchor.get(pointer.anchor);
    requireValue(actual !== undefined, `Decision referent is missing, unsettled, or unreadable: ${pointer.anchor}`);
    requireValue(canonical(actual.decision) === canonical(decision.decision), `Decision record differs from current brief: ${pointer.anchor}`);
    return actual;
  });
  requireValue(canonical(decisions) === canonical(current.decisions), 'Dispatch decision records must exactly match current selected decision records');
  requireValue(Array.isArray(suppliedLimitations ?? current.decisionLimitations), 'Dispatch decision limitations must be an array');
  requireValue(canonical(suppliedLimitations ?? current.decisionLimitations) === canonical(current.decisionLimitations), 'Dispatch decision limitations differ from the current brief');
  return { brief, spec, queue, inputs, plannedMissing: sourceView.plannedMissing ?? [], decisions, decisionScope: decisionScope ?? null, decisionLimitations: current.decisionLimitations, sourceAuthority: sourceView.sourceAuthority ?? null };
}

function validateReportDestination(root, destination) {
  requireValue(nonempty(destination), 'Dispatch needs a writable report destination claim');
  const reportPath = relativePath(destination);
  const target = path.join(root, reportPath);
  const parent = path.dirname(target);
  requireValue(existsSync(parent), `Report destination directory does not exist: ${path.posix.dirname(reportPath)}`);
  accessSync(parent, constants.W_OK);
  return reportPath;
}

function rejectSharedSourceOverwrite(workspace, sourceView, reportDestination) {
  if (workspace.kind !== 'shared-readonly') return;
  const frozen = new Set([sourceView.brief.path, sourceView.spec.path, sourceView.queue.path, ...sourceView.inputs.map(input => input.path), ...sourceView.plannedMissing.map(input => input.path)]);
  requireValue(!frozen.has(reportDestination), 'Shared read-only report destination must not overwrite a declared source input');
}

function validateClaims(claims, roles, reportDestination, availableCapabilities = undefined) {
  requireValue(isObject(claims) && Array.isArray(claims.capabilities), 'Dispatch needs explicit capability claims');
  const claimed = new Set(claims.capabilities);
  requireValue([...claimed].every(nonempty), 'Capability claims must be nonempty strings');
  requireValue(claims.reportDestination === reportDestination, 'Report destination must be the claimed writable destination');
  const required = new Set(['filesystem:read', 'filesystem:write-report']);
  for (const role of roles) for (const capability of role.requiredCapabilities) required.add(capability);
  for (const capability of required) requireValue(claimed.has(capability), `Missing required capability claim: ${capability}`);
  if (availableCapabilities !== undefined) {
    requireValue(Array.isArray(availableCapabilities), 'Available capabilities must be an array when provided');
    const available = new Set(availableCapabilities);
    for (const capability of required) requireValue(available.has(capability), `Worker cannot provide claimed capability: ${capability}`);
  }
  return [...required].sort();
}

/**
 * Validate delivery for a native worker adapter. This is intentionally only a
 * preflight: callers dispatch in their host and completion remains the sole
 * acceptance writer.
 */
export function preflightDispatch(request, { availableCapabilities } = {}) {
  requireValue(isObject(request) && request.schemaVersion === 1, 'Dispatch request must use schemaVersion 1');
  const root = workerDirectory(request.workerRoot);
  const manifest = readInstallationManifest(root, request.manifestPath);
  const roles = validateRoles(manifest, request.delivery?.roles);
  if (request.expectedManifestPath !== undefined) {
    const expected = readExpectedManifest(request.expectedManifestPath);
    for (const role of roles) for (const file of role.files) {
      requireValue(expected.files.has(file), `Pinned expected installation does not include ${file}`);
      requireValue(expected.files.get(file) === manifest.files.get(file), `Installed role/shared file differs from pinned expected installation: ${file}`);
    }
    if (expected.sourceRevision !== undefined) requireValue(manifest.sourceRevision === expected.sourceRevision, 'Installed source revision differs from pinned expected installation');
  }
  const sourceView = validateSourceView(root, request.delivery?.sourceView);
  assertImplementerDependenciesReady(root, sourceView, roles);
  const workspace = attestWorkspace(request.workspace, root, roles, queueRequestsParallel(root, sourceView));
  const reportDestination = validateReportDestination(root, request.delivery?.reportDestination);
  rejectSharedSourceOverwrite(workspace, sourceView, reportDestination);
  const requiredCapabilities = validateClaims(request.claims, roles, reportDestination, availableCapabilities);
  return {
    schemaVersion: 1,
    workerRoot: root,
    workspace,
    manifestPath: manifest.path,
    roles,
    sourceView,
    reportDestination,
    requiredCapabilities,
    effectiveModel: nonempty(request.effectiveModel) ? request.effectiveModel : unknown,
    effectiveEffort: nonempty(request.effectiveEffort) ? request.effectiveEffort : unknown,
  };
}

function rolePaths(role, root) {
  requireValue(['implementer', 'reviewer'].includes(role), 'Role must be implementer or reviewer');
  const suffix = `joycraft-${role === 'implementer' ? 'implement' : 'verify'}/SKILL.md`;
  const manifest = readInstallationManifest(root);
  // A multi-host install has one skill tree per discovery path. Workers read the
  // primary host's copy: .claude/skills for Claude Code, else .agents/skills.
  const tree = manifest.harness === 'claude' ? '.claude/skills/' : '.agents/skills/';
  const pick = name => {
    const all = [...manifest.files.keys()].filter(file => file.endsWith(name));
    return all.length > 1 ? all.filter(file => file.startsWith(tree)) : all;
  };
  const matches = pick(suffix);
  requireValue(matches.length === 1, `Installation manifest must contain exactly one ${suffix}`);
  const testing = pick('joycraft-testing/SKILL.md');
  requireValue(testing.length === 1, 'Installation manifest must contain exactly one joycraft-testing skill');
  return {
    name: role,
    skillPath: matches[0],
    referencePaths: [testing[0], '.joycraft/references/testing.md', '.joycraft/references/completion.md', '.joycraft/references/dispatch.md', '.joycraft/references/worktrees.md', '.joycraft/contracts/types.d.ts'],
    runtimePaths: ['.joycraft/runtime/completion.mjs', '.joycraft/runtime/identity.mjs', '.joycraft/runtime/evidence.mjs', '.joycraft/runtime/dispatch-preflight.mjs', '.joycraft/runtime/dispatch-start.mjs', '.joycraft/runtime/scope.mjs'],
    requiredCapabilities: role === 'reviewer' ? ['agent:separate-context'] : [],
  };
}

function source(root, file) { return { path: file, sha256: sha256(readLocal(root, file)) }; }

/** Generate a bounded native-host packet from current queue/spec sources. */
export function prepareDispatch({ workerRoot, coordinatorRoot, parallel, access, baseRevision, expectedManifestPath, queuePath, specId, role, implementerSessionId, implementerActor, briefPath, outPath, effectiveModel, effectiveEffort, availableCapabilities }) {
  const root = workerDirectory(workerRoot);
  queuePath = relativePath(queuePath);
  requireValue(Number.isSafeInteger(specId) && specId >= 0, 'Spec ID must be a nonnegative integer');
  requireValue(nonempty(implementerSessionId), 'Dispatch needs the actual implementer session identity');
  if (implementerActor !== undefined) {
    implementerActor = validateNativeActor(implementerActor, 'Dispatch implementer actor');
    requireValue(implementerActor.sessionId === implementerSessionId, 'Dispatch implementer actor sessionId must match implementer session');
  }
  const state = readQueue({ root, queuePath, specId });
  const inferredBrief = path.posix.join(path.posix.dirname(path.posix.dirname(queuePath)), 'brief.md');
  const actualBrief = relativePath(briefPath ?? inferredBrief);
  const existingInputs = [];
  const plannedMissing = [];
  for (const input of state.spec.verification.inputs) {
    if (input.state === 'absent') {
      // Before implementation, a planned removal can still be present. Review
      // binds the resulting absence; preparation never performs the deletion.
      if (role === 'implementer') {
        try { existingInputs.push(source(root, input.path)); continue; }
        catch (error) { if (error?.code !== 'ENOENT') throw error; }
      }
      requireAbsent(root, input.path);
      existingInputs.push({ path: relativePath(input.path), state: 'absent' });
      continue;
    }
    try { existingInputs.push(source(root, input.path)); } catch (error) {
      if (role === 'implementer' && error?.code === 'ENOENT') plannedMissing.push({ path: relativePath(input.path), reason: 'not-created-yet' });
      else throw error;
    }
  }
  const brief = source(root, actualBrief);
  const decisionScope = scopedDecisionIds(state.spec, actualBrief);
  const decisionState = classifyDecisions(root, brief, decisionScope);
  const sourceView = {
    brief, spec: source(root, state.specPath), queue: source(root, queuePath),
    inputs: existingInputs, plannedMissing, decisionScope: decisionScope ?? null, ...decisionState,
  };
  const reportDestination = path.posix.join(path.posix.dirname(queuePath), `review-${specId}.report.json`);
  const request = {
    schemaVersion: 1, workerRoot: root, expectedManifestPath,
    delivery: { roles: [rolePaths(role, root)], sourceView, reportDestination },
    claims: { capabilities: availableCapabilities, reportDestination },
    effectiveModel, effectiveEffort,
  };
  if (coordinatorRoot !== undefined || parallel !== undefined || access !== undefined || baseRevision !== undefined) {
    request.workspace = {
      coordinatorRoot: coordinatorRoot ?? root,
      ...(parallel === undefined ? {} : { parallel }),
      access: access ?? (role === 'reviewer' ? 'read-only' : 'mutating'),
      ...(baseRevision === undefined ? {} : { baseRevision }),
    };
  }
  requireValue(Array.isArray(availableCapabilities), 'Prepare needs observed host capabilities; unknown capabilities hold dependent acceptance');
  const prepared = preflightDispatch(request, { availableCapabilities });
  const subject = role === 'reviewer' ? snapshot({ root, queuePath, specId }) : null;
  const packet = {
    schemaVersion: 1, ...prepared, role, implementerSessionId, ...(implementerActor === undefined ? {} : { implementerActor }), subject,
    readFirst: prepared.roles[0].files,
    outputContract: { reportPath: reportDestination, schemaVersion: 1, completeWith: 'node .joycraft/runtime/completion.mjs finalize-review --queue <queue-path> --spec <id> --report <report-path>' },
    nativePrompt: role === 'reviewer' ? 'Read the listed files first. Review current raw sources and report observed evidence only. Do not infer an expected verdict or reasoning. Return the schema-v1 report at the declared report path.' : 'Read the listed files first. Implement only the current raw task sources. Do not certify acceptance; preserve planned missing inputs as work to create, then prepare an independent review after committing.',
  };
  // The project's recorded review-loop tools and commands, so workers use the same setup.
  const reviewLoop = reviewLoopSection(root);
  if (reviewLoop) packet.reviewLoop = { path: 'AGENTS.md', section: reviewLoop };
  if (role === 'reviewer' && implementerActor !== undefined) {
    // The native host supplies this only after creating the reviewer. Do not
    // synthesize an actor record in a pre-dispatch packet.
    packet.reviewerIdentityRequest = { distinctFrom: implementerActor };
  }
  // Hooks bind only hash-checked pointers today. The packet retains exact raw
  // decision records for workers; do not widen this hook interface here.
  packet.hookSourceView = { brief: prepared.sourceView.brief, decisions: prepared.sourceView.decisions.map(({ path, anchor, sha256 }) => ({ path, anchor, sha256 })), spec: prepared.sourceView.spec, queue: prepared.sourceView.queue, inputs: prepared.sourceView.inputs };
  packet.hookSourceViewHash = sha256(canonical(packet.hookSourceView));
  if (outPath !== undefined) {
    const output = path.resolve(outPath);
    requireValue(!existsSync(output), `Packet output already exists: ${output}`);
    writeFileSync(output, `${JSON.stringify(packet, null, 2)}\n`, { flag: 'wx' });
  }
  return packet;
}

/** Thin mapping layer for Codex, Claude, Pi, OMP, and Copilot native adapters. */
export function nativeDispatch(request, native = {}) {
  const prepared = preflightDispatch(request, { availableCapabilities: native.availableCapabilities });
  return {
    ...prepared,
    effectiveModel: nonempty(native.effectiveModel) ? native.effectiveModel : prepared.effectiveModel,
    effectiveEffort: nonempty(native.effectiveEffort) ? native.effectiveEffort : prepared.effectiveEffort,
  };
}

/** Validate a returned report without accepting it or changing queue/spec status. */
export async function checkDispatchedReport({ workerRoot, queuePath, specId, reportPath }) {
  return checkReport({ root: workerDirectory(workerRoot), queuePath, specId, reportPath });
}

function argumentsFor(argv) {
  const [command, ...args] = argv;
  requireValue(['preflight', 'prepare', 'check-report'].includes(command), 'Usage: dispatch-preflight.mjs preflight --request <request.json> | prepare --worker-root <root> --expected-manifest <manifest> --queue <path> --spec <id> --role implementer|reviewer --implementer-session <id> --out <packet.json> [--coordinator <root> --parallel true|false --access mutating|read-only --base-revision <full-commit-sha>] [--implementer-host <host> --implementer-agent <host-issued-id>] [--brief <path>] | check-report --worker-root <root> --queue <path> --spec <id> --report <report-path>');
  const flags = {};
  for (let i = 0; i < args.length; i += 2) {
    requireValue(nonempty(args[i]) && nonempty(args[i + 1]) && flags[args[i]] === undefined, `Invalid or duplicate argument: ${args[i]}`);
    flags[args[i]] = args[i + 1];
  }
  return { command, flags };
}

export async function main(argv = process.argv.slice(2)) {
  const { command, flags } = argumentsFor(argv);
  if (command === 'preflight') {
    requireValue(Object.keys(flags).length === 1 && flags['--request'], 'preflight requires --request <request.json>');
    const requestPath = path.resolve(flags['--request']);
    const request = parseJson(readFileSync(requestPath), requestPath);
    const result = preflightDispatch(request);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return result;
  }
  if (command === 'prepare') {
    const allowed = new Set(['--worker-root', '--expected-manifest', '--queue', '--spec', '--role', '--implementer-session', '--implementer-host', '--implementer-agent', '--out', '--brief', '--capabilities', '--coordinator', '--parallel', '--access', '--base-revision']);
    requireValue(Object.keys(flags).every(flag => allowed.has(flag)) && ['--worker-root', '--expected-manifest', '--queue', '--spec', '--role', '--implementer-session', '--out', '--capabilities'].every(flag => flags[flag]), 'prepare requires worker root, expected manifest, queue, spec, role, implementer session, observed capabilities, and output');
    requireValue(flags['--implementer-agent'] === undefined || flags['--implementer-host'] !== undefined, 'prepare needs an implementer host with a host-issued agent ID');
    requireValue(flags['--parallel'] === undefined || ['true', 'false'].includes(flags['--parallel']), 'prepare --parallel must be true or false');
    requireValue(/^(?:0|[1-9]\d*)$/.test(flags['--spec']), 'Spec ID must be a nonnegative integer');
    const implementerActor = flags['--implementer-host'] === undefined ? undefined : { host: flags['--implementer-host'], sessionId: flags['--implementer-session'], ...(flags['--implementer-agent'] === undefined ? {} : { agentId: flags['--implementer-agent'] }) };
    const result = prepareDispatch({ workerRoot: flags['--worker-root'], coordinatorRoot: flags['--coordinator'], parallel: flags['--parallel'] === undefined ? undefined : flags['--parallel'] === 'true', access: flags['--access'], baseRevision: flags['--base-revision'], expectedManifestPath: flags['--expected-manifest'], queuePath: flags['--queue'], specId: Number(flags['--spec']), role: flags['--role'], implementerSessionId: flags['--implementer-session'], implementerActor, briefPath: flags['--brief'], outPath: flags['--out'], availableCapabilities: flags['--capabilities'].split(',').filter(Boolean) });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return result;
  }
  requireValue(Object.keys(flags).length === 4 && flags['--worker-root'] && flags['--queue'] && flags['--spec'] && flags['--report'], 'check-report requires --worker-root, --queue, --spec, and --report');
  requireValue(/^(?:0|[1-9]\d*)$/.test(flags['--spec']), 'Spec ID must be a nonnegative integer');
  const result = await checkDispatchedReport({ workerRoot: flags['--worker-root'], queuePath: flags['--queue'], specId: Number(flags['--spec']), reportPath: flags['--report'] });
  process.stdout.write(`${JSON.stringify({ ok: true, acceptedReport: result.acceptedReport }, null, 2)}\n`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`Dispatch stopped: ${error.message}\n`); process.exitCode = 1; });
}
