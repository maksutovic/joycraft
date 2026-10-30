import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const fullCommit = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);

function required(condition, message) {
  if (!condition) throw new Error(message);
}

function git(root, args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'buffer', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    const detail = error.stderr?.toString('utf8').trim();
    throw new Error(`Git scope check failed${detail ? `: ${detail}` : ''}`);
  }
}

function nulFields(bytes) {
  const values = bytes.toString('utf8').split('\0');
  values.pop();
  return values;
}

/** Parse Git's NUL-delimited --name-status format without losing unusual names. */
function nameStatus(bytes, stage) {
  const values = nulFields(bytes);
  const result = [];
  for (let index = 0; index < values.length;) {
    const raw = values[index++];
    required(raw, 'Git emitted an empty name-status record');
    const status = raw[0];
    required('ACDMRTUXB'.includes(status), `Unsupported Git change status: ${raw}`);
    if (status === 'R' || status === 'C') {
      const beforePath = values[index++];
      const path = values[index++];
      required(beforePath !== undefined && path !== undefined, `Incomplete Git ${status} record`);
      result.push({ path, beforePath, status, stage });
    } else {
      const path = values[index++];
      required(path !== undefined, `Incomplete Git ${status} record`);
      result.push({ path, status, stage });
    }
  }
  return result;
}

function trackedChanges(root, baseRevision) {
  // The first view establishes actual base-to-worktree changes. The other two
  // retain index/worktree state for review without parsing line-delimited Git.
  const actual = nameStatus(git(root, ['diff', '--name-status', '-z', '--find-renames', baseRevision, '--']), 'actual');
  // Index/worktree state is relative to HEAD, not the captured base. Comparing
  // --cached to the base would mislabel ordinary committed base-to-HEAD work as
  // staged when the review starts from an older explicit implementation base.
  const staged = nameStatus(git(root, ['diff', '--cached', '--name-status', '-z', '--find-renames', 'HEAD', '--']), 'staged');
  const unstaged = nameStatus(git(root, ['diff', '--name-status', '-z', '--find-renames', '--']), 'unstaged');
  const markers = new Map();
  for (const record of [...staged, ...unstaged]) {
    for (const name of [record.path, record.beforePath].filter(Boolean)) {
      const current = markers.get(name) ?? new Set();
      current.add(record.stage);
      markers.set(name, current);
    }
  }
  return actual.map(record => {
    const stages = [...new Set([...(markers.get(record.path) ?? []), ...(markers.get(record.beforePath) ?? [])])].sort();
    return { ...record, stages: stages.length === 0 ? ['committed'] : stages };
  });
}

function untrackedChanges(root) {
  return nulFields(git(root, ['ls-files', '--others', '--exclude-standard', '-z'])).map(path => ({ path, status: 'U', stages: ['untracked'] }));
}

export function validateChangeScope(value, relativePath) {
  required(value !== null && typeof value === 'object' && !Array.isArray(value), 'verification.changeScope must be an object');
  required(Object.keys(value).every(key => key === 'baseRevision' || key === 'exclusions'), 'verification.changeScope has an unknown field');
  required(fullCommit(value.baseRevision), 'verification.changeScope.baseRevision must be an explicit full 40-character Git commit SHA; origin/main and inferred bases are not accepted');
  const exclusions = value.exclusions ?? [];
  required(Array.isArray(exclusions), 'verification.changeScope.exclusions must be an array when supplied');
  const names = new Set();
  for (const [index, entry] of exclusions.entries()) {
    required(entry !== null && typeof entry === 'object' && !Array.isArray(entry), `verification.changeScope.exclusions[${index}] must be an object`);
    required(Object.keys(entry).every(key => key === 'path' || key === 'reason'), `verification.changeScope.exclusions[${index}] has an unknown field`);
    const file = relativePath(entry.path);
    required(!names.has(file), `verification.changeScope has duplicate exclusion: ${file}`);
    names.add(file);
    required(typeof entry.reason === 'string' && entry.reason.trim().length > 0, `verification.changeScope.exclusions[${index}].reason must be nonempty`);
  }
  return { baseRevision: value.baseRevision, ...(exclusions.length === 0 ? {} : { exclusions: exclusions.map(entry => ({ path: relativePath(entry.path), reason: entry.reason })) }) };
}

export function captureChangeScope({ root = process.cwd(), changeScope, relativePath, inputs, artifactPaths = [], topologyIgnoredPaths = [] }) {
  const declared = validateChangeScope(changeScope, relativePath);
  try { required(git(root, ['cat-file', '-e', `${declared.baseRevision}^{commit}`]).length === 0, ''); } catch { throw new Error(`verification.changeScope.baseRevision is not an available commit: ${declared.baseRevision}`); }
  const actual = [...trackedChanges(root, declared.baseRevision), ...untrackedChanges(root)];
  const inputsByPath = new Map(inputs.map(input => [relativePath(input.path), input.state ?? 'present']));
  const exclusions = new Set([...(declared.exclusions ?? []).map(entry => entry.path), ...artifactPaths.map(relativePath)]);
  const ignored = new Set(topologyIgnoredPaths.map(relativePath));
  const relevant = [];
  for (const item of actual) {
    const targetState = inputsByPath.get(item.path);
    const previousState = item.beforePath === undefined ? undefined : inputsByPath.get(item.beforePath);
    const relevantInput = targetState !== undefined || previousState !== undefined;
    if (relevantInput) {
      // Queue/spec status and completion metadata have their own normalized
      // input binding. Excluding their Git topology avoids staling a report
      // merely because complete() writes those two status surfaces.
      if (ignored.has(item.path) || (item.beforePath !== undefined && ignored.has(item.beforePath))) continue;
      if (item.status === 'D') {
        required(targetState === 'absent', `Relevant verification input was deleted: ${item.path}; declare it with state: absent or take a fresh review`);
        relevant.push({ path: item.path, status: item.status, stages: item.stages, state: 'deleted' });
      } else if (item.beforePath !== undefined) {
        required(targetState === 'present' && previousState === 'absent' && existsSync(path.join(root, item.path)), `Relevant verification input was renamed from ${item.beforePath} to ${item.path}; bind the new path and declare the old non-requirement input state: absent`);
        relevant.push({ path: item.path, beforePath: item.beforePath, status: item.status, stages: item.stages, state: 'present' });
      } else {
        required(targetState === 'present' && existsSync(path.join(root, item.path)), `Relevant verification input is absent: ${item.path}; only an explicitly absent non-requirement input may be deleted`);
        relevant.push({ path: item.path, status: item.status, stages: item.stages, state: 'present' });
      }
    } else {
      required(exclusions.has(item.path), `Changed path is outside verification inputs: ${item.path}; add it to verification.changeScope.exclusions with a reason or include it as a verification input`);
    }
  }
  return { baseRevision: declared.baseRevision, paths: relevant };
}

/** Dispatcher-facing name: validates and captures the current Git topology. */
export const checkScope = captureChangeScope;
