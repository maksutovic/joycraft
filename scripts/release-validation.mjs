import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const COMPATIBILITY_STACKS = Object.freeze(['node', 'python', 'rust', 'go']);
export const HARNESS_SELECTIONS = Object.freeze(['claude', 'codex', 'pi', 'copilot', 'omp', 'claude-codex', 'all']);

// The two supported consumer lanes plus the explicit minimum-runtime smoke
// lane. The latter is Linux-only because the approved matrix has one minimum
// API check; every OS still receives both maintained consumer lanes.
export const REQUIRED_RUNTIME_LANES = Object.freeze([
  Object.freeze({ os: 'ubuntu', runner: 'ubuntu-latest', node: '22.23.1' }),
  Object.freeze({ os: 'ubuntu', runner: 'ubuntu-latest', node: '24.20.0' }),
  Object.freeze({ os: 'ubuntu', runner: 'ubuntu-latest', node: '22.0.0' }),
  Object.freeze({ os: 'macos', runner: 'macos-latest', node: '22.23.1' }),
  Object.freeze({ os: 'macos', runner: 'macos-latest', node: '24.20.0' }),
  Object.freeze({ os: 'windows', runner: 'windows-latest', node: '22.23.1' }),
  Object.freeze({ os: 'windows', runner: 'windows-latest', node: '24.20.0' }),
]);

function stableVersion(value) {
  return typeof value === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value);
}

function validSha512Integrity(value) {
  if (typeof value !== 'string' || !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
  const encoded = value.slice('sha512-'.length);
  const decoded = Buffer.from(encoded, 'base64');
  return decoded.length === 64 && decoded.toString('base64') === encoded;
}

function validateIdentity(identity = {}) {
  if (!/^[0-9a-f]{40}$/.test(String(identity.releaseSha ?? ''))) throw new Error('Required validation needs a full release SHA');
  if (!stableVersion(identity.version)) throw new Error('Required validation needs a stable package version');
  if (!validSha512Integrity(identity.integrity)) throw new Error('Required validation needs canonical SHA-512 integrity');
  return { releaseSha: identity.releaseSha, version: identity.version, integrity: identity.integrity };
}

export function validationCellId({ os, node, stack, selection } = {}) {
  if (!os || !node || !stack || !selection) throw new Error('A compatibility cell requires OS, Node, stack, and harness selection');
  return `${os}:node-${node}:${stack}:${selection}`;
}

/** Expand the immutable compatibility matrix into independently reportable cells. */
export function createCompatibilityMatrix(identity = {}) {
  const value = Object.keys(identity).length ? validateIdentity(identity) : {};
  return REQUIRED_RUNTIME_LANES.flatMap(lane => COMPATIBILITY_STACKS.flatMap(stack => HARNESS_SELECTIONS.map(selection => ({
    ...lane,
    stack,
    selection,
    id: validationCellId({ ...lane, stack, selection }),
    ...value,
  }))));
}

/** Return the checked-in, release-independent required-check set. */
export function createRequiredChecksConfig() {
  return {
    schemaVersion: 1,
    requiredChecks: createCompatibilityMatrix().map(cell => cell.id),
  };
}

function requiredIds(requiredChecks) {
  const ids = [...new Set((requiredChecks ?? []).map(String).filter(Boolean))];
  if (!ids.length) throw new Error('Required validation matrix is not configured');
  if (ids.length !== (requiredChecks ?? []).length) throw new Error('Required validation matrix contains duplicate check IDs');
  return ids;
}

function reportChecks(report) {
  if (Array.isArray(report?.checks)) return report.checks;
  if (report?.id && report?.status) return [{ id: report.id, status: report.status }];
  return [];
}

/** Aggregate cell reports only against the independently supplied check set. */
export function aggregateValidationReports({ identity, reports = [], requiredChecks } = {}) {
  const expected = validateIdentity(identity);
  const required = requiredIds(requiredChecks);
  const allowed = new Set(required);
  const byId = new Map();
  for (const report of reports) {
    if (!report || report.schemaVersion !== 1) throw new Error('Required validation cell report has an unsupported schema');
    for (const field of ['releaseSha', 'version', 'integrity']) {
      if (report[field] !== expected[field]) throw new Error(`Required validation cell report ${field} mismatch`);
    }
    const checks = reportChecks(report);
    if (!checks.length) throw new Error('Required validation cell report has no check outcome');
    for (const check of checks) {
      const id = String(check?.id ?? '');
      if (!allowed.has(id)) throw new Error(`Required validation cell report contains unknown check ${id}`);
      byId.set(id, [...(byId.get(id) ?? []), check]);
    }
  }
  const missing = required.filter(id => !byId.has(id));
  if (missing.length) throw new Error(`Required validation report is incomplete; missing: ${missing.join(', ')}`);
  const duplicate = required.filter(id => byId.get(id)?.length !== 1);
  if (duplicate.length) throw new Error(`Required validation report contains duplicate checks: ${duplicate.join(', ')}`);
  const failed = required.filter(id => !['passed', 'success'].includes(byId.get(id)[0]?.status));
  if (failed.length) throw new Error(`Required validation report has failed checks: ${failed.join(', ')}`);
  return {
    schemaVersion: 1,
    ...expected,
    complete: true,
    checks: required.map(id => ({ id, status: byId.get(id)[0].status })),
  };
}

// Named producer seam used by the workflow adapter. The required set remains
// supplied by the checked-in configuration, so callers cannot self-certify a
// partial matrix by passing the checks observed in their own reports.
export function produceRequiredValidationReport(options = {}) {
  return aggregateValidationReports(options);
}

export function readValidationReports(directory) {
  const root = resolve(directory);
  if (!existsSync(root)) throw new Error(`Required validation report directory is missing: ${root}`);
  return readdirSync(root).filter(file => file.endsWith('.json') && file !== 'report.json').sort().map(file => {
    const path = join(root, file);
    return JSON.parse(readFileSync(path, 'utf8'));
  });
}

export function writeValidationReport(path, report) {
  const output = resolve(path);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return output;
}

function option(args, name) {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'plan') {
    console.log(JSON.stringify({ matrix: createCompatibilityMatrix(), config: createRequiredChecksConfig() }, null, 2));
    return;
  }
  if (command === 'aggregate') {
    const checksPath = option(args, '--required-checks-file');
    const outputPath = option(args, '--output');
    const reportsPath = option(args, '--reports-dir');
    if (!checksPath || !outputPath || !reportsPath) throw new Error('Aggregation requires --reports-dir, --output, and --required-checks-file');
    const configured = JSON.parse(readFileSync(resolve(checksPath), 'utf8'));
    const report = aggregateValidationReports({
      identity: { releaseSha: option(args, '--release-sha'), version: option(args, '--version'), integrity: option(args, '--integrity') },
      reports: readValidationReports(reportsPath),
      requiredChecks: Array.isArray(configured) ? configured : configured.requiredChecks,
    });
    writeValidationReport(outputPath, report);
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  throw new Error('Usage: release-validation.mjs <plan|aggregate>');
}

const entrypoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === entrypoint) main().catch(error => { console.error(error.message); process.exitCode = 1; });
