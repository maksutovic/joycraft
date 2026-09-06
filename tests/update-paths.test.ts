import { describe, expect, it } from 'vitest';
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';

import { resolveUpdatePath } from '../src/update-paths';

function temporaryProject(run: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'joycraft-update-paths-'));
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function createSymlinkOrSkip(skip: () => void, target: string, path: string): boolean {
  try {
    if (process.platform === 'win32') {
      symlinkSync(target, path, lstatSync(target).isDirectory() ? 'junction' : 'file');
    } else {
      symlinkSync(target, path);
    }
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (process.platform === 'win32' && (code === 'EACCES' || code === 'EPERM')) {
      skip();
      return false;
    }
    throw error;
  }
}

describe('resolveUpdatePath', () => {
  it('returns a canonical target under an existing root and allows missing tail segments', () => {
    temporaryProject((root) => {
      mkdirSync(join(root, 'docs', 'nested'), { recursive: true });
      const expectedRoot = realpathSync(root);
      expect(resolveUpdatePath(root, 'docs/nested/new file.txt')).toBe(
        join(expectedRoot, 'docs', 'nested', 'new file.txt'),
      );
      expect(resolveUpdatePath(root, 'new/parents/target')).toBe(
        join(expectedRoot, 'new', 'parents', 'target'),
      );
    });
  });

  it('canonicalizes a symlinked root while permitting the root symlink itself', ({ skip }) => {
    temporaryProject((root) => {
      const realRoot = join(root, 'real-project');
      const rootAlias = join(root, 'project-alias');
      mkdirSync(realRoot);
      if (!createSymlinkOrSkip(skip, realRoot, rootAlias)) return;

      expect(resolveUpdatePath(rootAlias, 'docs/new.md')).toBe(join(realpathSync(realRoot), 'docs', 'new.md'));
    });
  });

  it('rejects absolute, traversal, NUL, separator, and Windows drive paths', () => {
    temporaryProject((root) => {
      const invalidPaths = [
        '',
        '/outside.txt',
        '../outside.txt',
        'a/../b.txt',
        'a\\b.txt',
        'C:/outside.txt',
        'C:relative.txt',
        'safe\0name.txt',
        'trailing-dot./file.txt',
        'trailing-space /file.txt',
        'ads:stream.txt',
        'CON',
        'prn.txt',
        'aux.backup',
        'NUL.any.extension',
        'com1.log',
        'LPT9.data',
      ];
      for (const relative of invalidPaths) {
        expect(() => resolveUpdatePath(root, relative), relative).toThrow();
      }
      const sibling = `${basename(root)}-sibling`;
      expect(() => resolveUpdatePath(root, `../${sibling}/escape.txt`)).toThrow();
    });
  });

  it('requires the root to exist and be a directory', () => {
    temporaryProject((root) => {
      const missing = join(root, 'missing');
      const file = join(root, 'root-file');
      writeFileSync(file, 'root');
      expect(() => resolveUpdatePath(missing, 'target')).toThrow();
      expect(() => resolveUpdatePath(file, 'target')).toThrow();
    });
  });

  it('rejects a symlink in an existing descendant, including the target itself', ({ skip }) => {
    temporaryProject((root) => {
      const outside = join(root, 'outside');
      const actual = join(root, 'actual');
      mkdirSync(outside);
      mkdirSync(actual);
      const directoryLink = join(root, 'directory-link');
      if (!createSymlinkOrSkip(skip, outside, directoryLink)) return;
      expect(() => resolveUpdatePath(root, 'directory-link/child.txt')).toThrow(/symlink/i);

      const targetLink = join(root, 'target-link');
      writeFileSync(join(outside, 'target.txt'), 'target');
      if (!createSymlinkOrSkip(skip, join(outside, 'target.txt'), targetLink)) return;
      expect(() => resolveUpdatePath(root, 'target-link')).toThrow(/symlink/i);

      const internalLink = join(root, 'internal-link');
      if (!createSymlinkOrSkip(skip, actual, internalLink)) return;
      expect(() => resolveUpdatePath(root, 'internal-link/new.txt')).toThrow(/symlink/i);
    });
  });

  it('rejects a non-directory existing ancestor but permits an existing file target', () => {
    temporaryProject((root) => {
      const file = join(root, 'file');
      writeFileSync(file, 'content');
      expect(resolveUpdatePath(root, 'file')).toBe(join(realpathSync(root), 'file'));
      expect(() => resolveUpdatePath(root, 'file/child')).toThrow(/directory/i);
    });
  });

  it('inspects every existing component with lstat before returning', () => {
    temporaryProject((root) => {
      mkdirSync(join(root, 'existing'), { recursive: true });
      writeFileSync(join(root, 'existing', 'file'), 'content');
      expect(lstatSync(resolveUpdatePath(root, 'existing/file')).isFile()).toBe(true);
      expect(resolveUpdatePath(root, 'existing/missing/file')).toBe(join(realpathSync(root), 'existing', 'missing', 'file'));
    });
  });
});
