import { lstatSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, sep } from 'node:path';

import { normalizeManifestPath } from './install-manifest.js';

export type UpdatePathErrorCode =
  | 'invalid-path'
  | 'outside-root'
  | 'missing-root'
  | 'symlink'
  | 'nondirectory-ancestor';

/** A path rejected before an updater can stage, inspect, or mutate it. */
export class UpdatePathError extends Error {
  readonly code: UpdatePathErrorCode;
  readonly path: string;

  constructor(code: UpdatePathErrorCode, path: string, message: string) {
    super(message);
    this.name = 'UpdatePathError';
    this.code = code;
    this.path = path;
  }
}

function validatePortableComponents(path: string): void {
  for (const component of path.split('/')) {
    if (component.endsWith('.') || component.endsWith(' ')) {
      throw new Error(`Update path component must not end with a dot or space: '${component}'.`);
    }
    if (component.includes(':')) {
      throw new Error(`Update path component must not contain a colon: '${component}'.`);
    }
    // Windows reserves these device basenames even when an extension is
    // present. Reject them on every host so an update plan remains portable.
    if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(component)) {
      throw new Error(`Update path component uses a reserved Windows device name: '${component}'.`);
    }
  }
}

/**
 * Resolve a persisted project-relative path beneath a canonical project root.
 *
 * Every existing descendant is inspected with lstat, so symlinks are rejected
 * even when they point back inside the project. Missing trailing components are
 * allowed for staging and first-time writes; an existing ancestor must remain
 * a directory. Callers should repeat this check immediately before a mutation.
 */
export function resolveUpdatePath(root: string, relativePath: string): string {
  let portable: string;
  try {
    portable = normalizeManifestPath(relativePath);
  } catch (error) {
    throw new UpdatePathError(
      'invalid-path',
      relativePath,
      error instanceof Error ? error.message : `Invalid update path '${relativePath}'.`,
    );
  }
  try {
    validatePortableComponents(portable);
  } catch (error) {
    throw new UpdatePathError(
      'invalid-path',
      relativePath,
      error instanceof Error ? error.message : `Invalid update path '${relativePath}'.`,
    );
  }

  // normalizeManifestPath already rejects absolute paths, but retain an
  // explicit check at this boundary so this function remains safe if the
  // persistence validator changes later.
  if (isAbsolute(portable)) {
    throw new UpdatePathError('outside-root', portable, `Update path must stay inside the project root: '${portable}'.`);
  }

  let canonicalRoot: string;
  try {
    canonicalRoot = realpathSync(root);
    if (!lstatSync(canonicalRoot).isDirectory()) {
      throw new Error('root is not a directory');
    }
  } catch (error) {
    throw new UpdatePathError(
      'missing-root',
      root,
      `Unable to resolve project root '${root}': ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const candidate = join(canonicalRoot, ...portable.split('/'));
  const escaped = relative(canonicalRoot, candidate);
  if (escaped === '..' || escaped.startsWith(`..${sep}`) || isAbsolute(escaped)) {
    throw new UpdatePathError('outside-root', portable, `Update path escapes the project root: '${portable}'.`);
  }

  let current = canonicalRoot;
  const parts = portable.split('/');
  for (let index = 0; index < parts.length; index += 1) {
    current = join(current, parts[index]);
    let stat;
    try {
      stat = lstatSync(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') break;
      throw new UpdatePathError('invalid-path', portable, `Unable to inspect update path '${portable}': ${String(error)}`);
    }
    if (stat.isSymbolicLink()) {
      throw new UpdatePathError('symlink', portable, `Update path traverses a symlink: '${portable}'.`);
    }
    if (index < parts.length - 1 && !stat.isDirectory()) {
      throw new UpdatePathError('nondirectory-ancestor', portable, `Update path has a non-directory ancestor: '${portable}'.`);
    }
  }

  return candidate;
}
