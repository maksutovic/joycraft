import { compareStableVersions, type CheckPolicy } from './update-check.js';
import type { InstallationManifest } from './install-manifest.js';
import type { UpdatePlan } from './update-plan.js';
import {
  isVerifiedReleaseArtifact,
  type VerifiedReleaseArtifact,
} from './release-artifact.js';

export interface AutoSafeEligibilityInput {
  /** The policy read from project-local checker state. */
  policy: CheckPolicy;
  /** A verifier-issued proof for the exact candidate package artifact. */
  candidate?: VerifiedReleaseArtifact;
  /** Facts from the bundle that is actually about to execute. */
  executingVersion: string;
  executingIntegrity?: string;
  executingDescriptor?: unknown;
  manifestSchema?: number;
  plan: UpdatePlan;
  existingManifest?: InstallationManifest;
  replaceCustomized?: readonly string[];
  repair?: readonly string[];
  migration?: boolean;
  legacyBridge?: boolean;
  setupChanges?: boolean;
  profileChanges?: boolean;
  localOperations?: boolean;
  authorityTransition?: boolean;
}

export interface AutoSafeEligibility {
  eligible: boolean;
  diagnostics: string[];
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function descriptorEqual(left: unknown, right: unknown): boolean {
  const a = object(left);
  const b = object(right);
  if (!a || !b) return false;
  return a.schemaVersion === b.schemaVersion
    && a.releaseVersion === b.releaseVersion
    && a.autoSafeEligible === b.autoSafeEligible
    && Array.isArray(a.manifestSchemas)
    && Array.isArray(b.manifestSchemas)
    && JSON.stringify(a.manifestSchemas) === JSON.stringify(b.manifestSchemas);
}

/**
 * Evaluate the complete automatic-update contract without I/O, prompts, or
 * mutation. A true result requires every independent proof to be present.
 */
export function evaluateAutoSafeEligibility(input: AutoSafeEligibilityInput): AutoSafeEligibility {
  const diagnostics: string[] = [];
  const reject = (message: string): void => { diagnostics.push(message); };
  if (input.policy !== 'auto-safe') reject('Automatic updates require the local auto-safe policy.');
  const candidate = input.candidate;
  if (!candidate || !isVerifiedReleaseArtifact(candidate)) {
    reject('Automatic updates require a verifier-issued exact release artifact.');
  }

  const release = candidate?.release;
  const descriptor = candidate?.descriptor;
  const descriptorObject = object(descriptor);
  if (candidate && release && release.packageName !== 'joycraft') reject('The verified artifact package is not Joycraft.');
  if (candidate && release && release.version !== input.executingVersion) {
    reject('The verified artifact version does not match the executing bundle.');
  }
  if (candidate && input.executingIntegrity !== undefined && release && release.integrity !== input.executingIntegrity) {
    reject('The verified artifact integrity does not match the executing bundle.');
  }
  if (input.executingDescriptor === undefined) reject('The executing bundle has no verified compatibility descriptor.');
  else if (candidate && !descriptorEqual(descriptor, input.executingDescriptor)) {
    reject('The verified compatibility descriptor does not match the executing bundle.');
  }
  if (!descriptorObject || descriptorObject.schemaVersion !== 1 || descriptorObject.releaseVersion !== release?.version) {
    reject('The verified artifact has no supported compatibility descriptor.');
  }
  if (descriptorObject?.autoSafeEligible !== true) reject('The release is not declared eligible for auto-safe updates.');
  const supportedSchemas = descriptorObject?.manifestSchemas;
  const schema = input.manifestSchema ?? input.plan.nextManifest.schemaVersion;
  if (!Array.isArray(supportedSchemas) || !supportedSchemas.includes(schema)) reject('The release does not support this manifest protocol.');

  if (!/^(\d+)\.(\d+)\.(\d+)$/.test(input.executingVersion) || !release?.version || !/^(\d+)\.(\d+)\.(\d+)$/.test(release.version)) {
    reject('Prerelease and malformed releases require an explicit update.');
  } else if (compareStableVersions(release.version, input.executingVersion) !== 0) {
    reject('Downgrades and version changes require an explicit update.');
  }
  if (!input.existingManifest) reject('Automatic updates require an existing installation manifest.');
  else if (compareStableVersions(release?.version ?? '', input.existingManifest.targetVersion) !== 1) {
    reject('The candidate is not newer than the installed release; use an explicit update.');
  }
  if (input.plan.conflicts.length > 0) reject('The update plan contains unresolved conflicts.');
  if (input.plan.actions.some((action) => action.kind === 'conflict' || action.kind === 'repair')) {
    reject('The update plan contains a conflict or repair action.');
  }
  if (input.plan.actions.some((action) => action.selected
    && (action.patch !== undefined || action.path === '.claude/settings.json')
    && !(action.currentPresent && action.targetPresent && typeof action.rawPrecondition === 'string' && action.rawPrecondition === action.rawTargetHash))) {
    reject('The update plan changes user configuration.');
  }
  if ((input.replaceCustomized?.length ?? 0) > 0) reject('Customized replacements require an explicit update.');
  if ((input.repair?.length ?? 0) > 0) reject('Repairs require an explicit update.');
  if (input.migration) reject('Migrations require an explicit update.');
  if (input.legacyBridge) reject('Legacy bridge adoption requires an explicit update.');
  if (input.setupChanges) reject('Setup and user-configuration changes require an explicit update.');
  if (input.profileChanges) reject('Profile changes require an explicit update.');
  if (input.localOperations) reject('Local state migrations require an explicit update.');
  if (input.authorityTransition) reject('Manifest authority transitions require an explicit update.');
  return { eligible: diagnostics.length === 0, diagnostics };
}
