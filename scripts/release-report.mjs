import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { validateRequiredValidationReport } from './release-verification.mjs';

/**
 * Resolve the newest required-validation artifact downloaded by GitHub Actions.
 *
 * A failed-only rerun of the publish job does not create another validation
 * report, so reports are selected by their producer attempt rather than the
 * current publish-job attempt. The newest available producer report is always
 * validated; an older successful report can never mask a later failure.
 */
export function resolveRequiredValidationReport({ root, expected, requiredChecks } = {}) {
  const releaseSha = String(expected?.releaseSha ?? '');
  const prefix = `joycraft-required-validation-${releaseSha}-`;
  const attemptPattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([1-9]\\d*)$`);
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    throw new Error('Required validation report artifact directory is missing');
  }

  const candidates = [];
  for (const entry of entries) {
    if (!entry.name.startsWith(prefix)) continue;
    const match = entry.name.match(attemptPattern);
    if (!match || !entry.isDirectory()) {
      throw new Error(`Required validation report artifacts are ambiguous: ${entry.name}`);
    }
    const attempt = Number(match[1]);
    if (!Number.isSafeInteger(attempt)) {
      throw new Error(`Required validation report artifact attempt is unsafe: ${entry.name}`);
    }
    candidates.push({ attempt, directory: entry.name });
  }
  if (!candidates.length) throw new Error('Required validation report artifact is missing');

  candidates.sort((left, right) => right.attempt - left.attempt || right.directory.localeCompare(left.directory));
  const newest = candidates[0];
  const reportPath = join(root, newest.directory, 'report.json');
  let report;
  try {
    report = JSON.parse(readFileSync(reportPath, 'utf8'));
  } catch {
    throw new Error(`Required validation report is missing or malformed for attempt ${newest.attempt}`);
  }
  return validateRequiredValidationReport(report, { ...expected, requiredChecks });
}
