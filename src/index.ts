export { detectStack } from './detect.js';
export type { StackInfo } from './detect.js';
export {
  acknowledgeUpdate,
  CHECK_CACHE_PATH,
  CHECK_CACHE_TTL_MS,
  CHECK_DEFAULT_DEADLINE_MS,
  CHECK_LOCK_PATH,
  CHECK_LOCK_TTL_MS,
  CHECK_SETTINGS_PATH,
  checkForUpdate,
  compareStableVersions,
  postponeUpdate,
  resolveCheckSessionId,
  resolveUpdateStatus,
} from './update-check.js';
export type {
  CheckMetadata,
  CheckPolicy,
  CheckResult,
  CheckStatus,
  InstallationCheckState,
  ResolveStatusInput,
  ResolvedStatus,
  UpdateCheckOptions,
} from './update-check.js';
